"""Save ESPN API responses as JSON fixtures for local development.

Mirrors the fetching logic in fetch.py — iterates all 6 scoring periods
to get propositions for every round (R64 through CHAMP).
"""
import json
import time
import requests
from pathlib import Path

FIXTURES = Path(__file__).parent / 'fixtures'
GROUP_ID = 'f2683f8e-fbba-4625-9188-84a820659e90'
CHALLENGE_ID = '277'
CHALLENGE_SLUG = 'tournament-challenge-bracket-2026'
API_BASE = 'https://gambit-api.fantasy.espn.com/apis/v1/challenges'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:148.0) Gecko/20100101 Firefox/148.0',
    'Accept': 'application/json',
    'Origin': 'https://fantasy.espn.com',
    'Referer': 'https://fantasy.espn.com/',
}


def save_challenge():
    """Fetch challenge data for ALL scoring periods and save per-period fixtures.

    ESPN API only returns propositions for the current scoring period by default.
    To get all rounds, we pass ?scoringPeriodId=1 through 6.
    See ESPN_API.md for full documentation.
    """
    all_propositions = []
    seen_ids = set()
    base_data = None

    for period in range(1, 7):
        print(f"Fetching period {period}...")
        url = f'{API_BASE}/{CHALLENGE_SLUG}'
        resp = requests.get(url, headers=HEADERS, params={'scoringPeriodId': period}, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        time.sleep(0.5)

        if base_data is None:
            base_data = data

        props = data.get('propositions', [])
        new_props = [p for p in props if str(p.get('id', '')) not in seen_ids]
        for p in new_props:
            seen_ids.add(str(p.get('id', '')))
        all_propositions.extend(new_props)

        # Save per-period file for run_local()
        fp = FIXTURES / f'challenge_period_{period}.json'
        fp.write_text(json.dumps(data, indent=2))
        print(f"  Period {period}: {len(props)} propositions ({len(new_props)} new)")

    # Save combined challenge.json
    base_data['propositions'] = all_propositions
    out = FIXTURES / 'challenge.json'
    out.write_text(json.dumps(base_data, indent=2))
    print(f"Saved {out} ({len(all_propositions)} total propositions)")


def save_group_entries():
    """Fetch group entries WITH picks using the same merge strategy as fetch.py.

    1. Chui endpoint → all 75 entries (no picks)
    2. Slug endpoint → up to 50 entries WITH picks
    3. Individual fetch → remaining entries WITH picks
    4. Merge picks onto chui entries
    """
    # Step 1: Chui — full roster, no picks
    print(f"Fetching group {GROUP_ID} (chui — all entries, no picks)...")
    filter_param = json.dumps({'filterSortId': {'value': 0}, 'limit': 100, 'offset': 0})
    chui_resp = requests.get(
        f'{API_BASE}/{CHALLENGE_ID}/groups/{GROUP_ID}/',
        headers=HEADERS, timeout=30,
        params={'platform': 'chui', 'view': 'chui_default_group', 'filter': filter_param},
    )
    chui_resp.raise_for_status()
    chui_data = chui_resp.json()
    all_entries = chui_data.get('entries', [])
    print(f"  Chui: {len(all_entries)} entries")
    time.sleep(0.5)

    # Step 2: Slug — entries WITH picks (caps at 50)
    print("  Fetching slug endpoint (with picks, max 50)...")
    slug_resp = requests.get(
        f'{API_BASE}/{CHALLENGE_SLUG}/groups/{GROUP_ID}',
        headers=HEADERS, timeout=30,
    )
    slug_resp.raise_for_status()
    slug_data = slug_resp.json()
    entries_with_picks = {e['id']: e for e in slug_data.get('entries', [])}
    print(f"  Slug: {len(entries_with_picks)} entries with picks")
    time.sleep(0.5)

    # Step 3: Individual fetch for missing entries
    missing_ids = [e['id'] for e in all_entries if e['id'] not in entries_with_picks]
    if missing_ids:
        print(f"  Fetching {len(missing_ids)} individual entries for picks...")
        for eid in missing_ids:
            try:
                resp = requests.get(f'{API_BASE}/{CHALLENGE_ID}/entries/{eid}', headers=HEADERS, timeout=30)
                resp.raise_for_status()
                entries_with_picks[eid] = resp.json()
                time.sleep(0.3)
            except Exception as e:
                print(f"    Failed {eid}: {e}")

    # Step 4: Merge
    merged = []
    for entry in all_entries:
        eid = entry['id']
        if eid in entries_with_picks:
            full = entries_with_picks[eid]
            if 'score' in entry:
                full['score'] = entry['score']
            merged.append(full)
        else:
            merged.append(entry)

    chui_data['entries'] = merged
    if 'entryStats' in slug_data:
        chui_data['entryStats'] = slug_data['entryStats']

    with_picks = sum(1 for e in merged if e.get('picks'))
    print(f"  Merged: {len(merged)} entries, {with_picks} with picks")

    for name in ['group_entries.json', 'group_slug.json', 'group_chui.json']:
        out = FIXTURES / name
        out.write_text(json.dumps(chui_data, indent=2))
        print(f"  Saved {out}")


if __name__ == '__main__':
    FIXTURES.mkdir(parents=True, exist_ok=True)
    save_challenge()
    save_group_entries()
    print("Done.")
