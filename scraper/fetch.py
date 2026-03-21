"""HTTP fetching for ESPN JSON API with rate limiting and error handling."""
import time
import logging

import requests

logger = logging.getLogger(__name__)

ESPN_API_BASE = 'https://gambit-api.fantasy.espn.com/apis/v1/challenges/tournament-challenge-bracket-2026'
DEFAULT_DELAY = 1.0  # seconds between requests


def fetch_challenge_data() -> dict:
    """Fetch challenge structure (propositions, outcomes, current scoring period)."""
    return _fetch_json(ESPN_API_BASE)


def fetch_group_entries(group_id: str) -> dict:
    """Fetch all group entries (deduplicated — ESPN API may repeat entries across pages)."""
    url = f'{ESPN_API_BASE}/groups/{group_id}?offset=0&limit=50'
    data = _fetch_json(url)
    seen_ids = {e['id'] for e in data.get('entries', [])}
    all_entries = list(data.get('entries', []))

    # Try next page — stop if all entries are duplicates
    offset = 50
    while True:
        next_url = f'{ESPN_API_BASE}/groups/{group_id}?offset={offset}&limit=50'
        page = _fetch_json(next_url)
        entries = page.get('entries', [])
        new_entries = [e for e in entries if e['id'] not in seen_ids]
        if not new_entries:
            break
        for e in new_entries:
            seen_ids.add(e['id'])
        all_entries.extend(new_entries)
        offset += 50

    data['entries'] = all_entries
    logger.info(f"Fetched {len(all_entries)} unique entries for group {group_id}")
    return data


def _fetch_json(url: str, retries: int = 2) -> dict:
    """Fetch URL and return parsed JSON. Raises on total failure."""
    last_error: Exception | None = None
    for attempt in range(retries + 1):
        try:
            resp = requests.get(url, timeout=30, headers={
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                'Accept': 'application/json',
            })
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
