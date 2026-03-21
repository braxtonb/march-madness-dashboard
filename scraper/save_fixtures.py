"""One-time script to save ESPN API responses as JSON fixtures."""
import json
import requests
from pathlib import Path

FIXTURES = Path(__file__).parent / 'fixtures'
GROUP_ID = 'f2683f8e-fbba-4625-9188-84a820659e90'
API_BASE = 'https://gambit-api.fantasy.espn.com/apis/v1/challenges/tournament-challenge-bracket-2026'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    'Accept': 'application/json',
}


def save_challenge():
    print("Fetching challenge data...")
    resp = requests.get(API_BASE, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    out = FIXTURES / 'challenge.json'
    out.write_text(json.dumps(data, indent=2))
    print(f"Saved {out} ({len(data.get('propositions', []))} propositions)")
    return data


def save_group_entries():
    print("Fetching group entries (paginated)...")
    all_entries = []
    merged = {}
    offset = 0
    while True:
        url = f'{API_BASE}/groups/{GROUP_ID}?offset={offset}&limit=50'
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        if not merged:
            merged = dict(data)
        entries = data.get('entries', [])
        all_entries.extend(entries)
        print(f"  offset={offset}: got {len(entries)} entries")
        if len(entries) < 50:
            break
        offset += 50
    merged['entries'] = all_entries
    out = FIXTURES / 'group_entries.json'
    out.write_text(json.dumps(merged, indent=2))
    print(f"Saved {out} ({len(all_entries)} total entries)")


if __name__ == '__main__':
    save_challenge()
    save_group_entries()
    print("Done.")
