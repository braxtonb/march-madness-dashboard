"""HTTP fetching for ESPN JSON API with rate limiting and error handling."""
import json
import os
import time
import logging

import requests

logger = logging.getLogger(__name__)

ESPN_CHALLENGE_ID = '277'
ESPN_CHALLENGE_SLUG = 'tournament-challenge-bracket-2026'
ESPN_API_BASE = f'https://gambit-api.fantasy.espn.com/apis/v1/challenges'
DEFAULT_DELAY = 1.0


def _get_espn_cookies() -> dict:
    """Auth cookies for ESPN API — needed to get all group entries."""
    swid = os.environ.get('ESPN_SWID', '')
    s2 = os.environ.get('ESPN_S2', '')
    if swid and s2:
        return {'SWID': swid, 'espn_s2': s2}
    return {}


def _base_headers() -> dict:
    return {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:148.0) Gecko/20100101 Firefox/148.0',
        'Accept': 'application/json',
        'Origin': 'https://fantasy.espn.com',
        'Referer': 'https://fantasy.espn.com/',
    }


def fetch_challenge_data() -> dict:
    """Fetch challenge structure with ALL propositions across all scoring periods.

    ESPN only returns current-round propositions by default. We fetch each
    scoring period separately and merge them into one response.
    """
    # Fetch default (current round) first
    base_data = _fetch_json(f'{ESPN_API_BASE}/{ESPN_CHALLENGE_SLUG}')
    all_propositions = list(base_data.get('propositions', []))
    seen_ids = {str(p.get('id', '')) for p in all_propositions}

    # Fetch each historical scoring period (1=R64, 2=R32, 3=S16, 4=E8, 5=FF, 6=CHAMP)
    for period_id in range(1, 7):
        try:
            period_data = _fetch_json(
                f'{ESPN_API_BASE}/{ESPN_CHALLENGE_SLUG}',
                params={'scoringPeriodId': period_id},
            )
            for prop in period_data.get('propositions', []):
                pid = str(prop.get('id', ''))
                if pid and pid not in seen_ids:
                    all_propositions.append(prop)
                    seen_ids.add(pid)
        except Exception as e:
            logger.warning(f"Failed to fetch scoring period {period_id}: {e}")

    base_data['propositions'] = all_propositions
    logger.info(f"Fetched {len(all_propositions)} total propositions across all periods")
    return base_data


def fetch_group_entries(group_id: str) -> dict:
    """Fetch all group entries with picks.

    Strategy (ESPN API quirks):
    1. Chui view: returns ALL entries (75) but WITHOUT picks
    2. Slug endpoint: returns entries WITH picks but caps at 50
    3. Individual entry endpoint: returns single entry WITH picks

    We merge: chui for full roster, slug for first 50 picks, individual fetch for the rest.
    """
    # Step 1: Get ALL entries (standings, scores, champion) from chui view
    filter_param = json.dumps({'filterSortId': {'value': 0}, 'limit': 100, 'offset': 0})
    chui_data = _fetch_json(
        f'{ESPN_API_BASE}/{ESPN_CHALLENGE_ID}/groups/{group_id}/',
        params={'platform': 'chui', 'view': 'chui_default_group', 'filter': filter_param},
    )
    all_entries = chui_data.get('entries', [])
    logger.info(f"Chui view: {len(all_entries)} entries (no picks)")

    # Step 2: Get entries WITH picks from slug endpoint (caps at 50)
    slug_data = _fetch_json(f'{ESPN_API_BASE}/{ESPN_CHALLENGE_SLUG}/groups/{group_id}')
    entries_with_picks = {e['id']: e for e in slug_data.get('entries', [])}
    logger.info(f"Slug endpoint: {len(entries_with_picks)} entries with picks")

    # Step 3: For entries missing picks, fetch individually
    missing_ids = [e['id'] for e in all_entries if e['id'] not in entries_with_picks]
    if missing_ids:
        logger.info(f"Fetching {len(missing_ids)} individual entries for picks...")
        for eid in missing_ids:
            try:
                entry = _fetch_json(f'{ESPN_API_BASE}/{ESPN_CHALLENGE_ID}/entries/{eid}')
                entries_with_picks[eid] = entry
            except Exception as e:
                logger.warning(f"  Failed to fetch entry {eid}: {e}")

    # Step 4: Merge — chui entries get picks from the with-picks map
    merged_entries = []
    for entry in all_entries:
        eid = entry['id']
        if eid in entries_with_picks:
            # Use the version with picks, but overlay chui score data (may be more current)
            full = entries_with_picks[eid]
            if 'score' in entry:
                full['score'] = entry['score']
            merged_entries.append(full)
        else:
            # No picks available — include anyway for standings
            merged_entries.append(entry)

    chui_data['entries'] = merged_entries
    # Preserve entryStats from slug endpoint (has pickCountsByProposition)
    if 'entryStats' in slug_data:
        chui_data['entryStats'] = slug_data['entryStats']

    logger.info(f"Merged: {len(merged_entries)} total entries, {sum(1 for e in merged_entries if e.get('picks'))} with picks")
    return chui_data


def _fetch_json(url: str, retries: int = 2, params: dict | None = None) -> dict:
    """Fetch URL and return parsed JSON. Raises on total failure."""
    cookies = _get_espn_cookies()
    last_error: Exception | None = None

    for attempt in range(retries + 1):
        try:
            resp = requests.get(
                url,
                params=params,
                timeout=30,
                headers=_base_headers(),
                cookies=cookies if cookies else None,
            )
            resp.raise_for_status()
            time.sleep(DEFAULT_DELAY)
            return resp.json()
        except requests.RequestException as e:
            last_error = e
            logger.warning(f"Fetch attempt {attempt + 1} failed for {url}: {e}")
            if attempt < retries:
                time.sleep(DEFAULT_DELAY * (attempt + 1))
    logger.error(f"All retries exhausted for {url}")
    raise last_error  # type: ignore[misc]
