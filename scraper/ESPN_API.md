# ESPN Tournament Challenge API Reference

## Base URLs

| Purpose | URL Pattern |
|---------|------------|
| Challenge data (propositions/games) | `https://gambit-api.fantasy.espn.com/apis/v1/challenges/tournament-challenge-bracket-2026` |
| Group entries (by challenge ID) | `https://gambit-api.fantasy.espn.com/apis/v1/challenges/277/groups/{groupId}/` |
| Group entries (by slug) | `https://gambit-api.fantasy.espn.com/apis/v1/challenges/tournament-challenge-bracket-2026/groups/{groupId}` |
| Individual entry | `https://gambit-api.fantasy.espn.com/apis/v1/challenges/277/entries/{entryId}` |

## Key IDs

- **Challenge slug**: `tournament-challenge-bracket-2026`
- **Challenge ID**: `277`
- **Group ID**: `f2683f8e-fbba-4625-9188-84a820659e90`

## Scoring Periods (Rounds)

| Period ID | Round |
|-----------|-------|
| 1 | Round of 64 (R64) |
| 2 | Round of 32 (R32) |
| 3 | Sweet 16 (S16) |
| 4 | Elite 8 (E8) |
| 5 | Final Four (FF) |
| 6 | Championship (CHAMP) |

## Fetching Challenge Data (Propositions/Games)

**IMPORTANT**: ESPN only returns propositions for the CURRENT scoring period by default. To get all rounds, you MUST iterate through each scoring period:

```
GET /challenges/tournament-challenge-bracket-2026?scoringPeriodId=1
GET /challenges/tournament-challenge-bracket-2026?scoringPeriodId=2
GET /challenges/tournament-challenge-bracket-2026?scoringPeriodId=3
GET /challenges/tournament-challenge-bracket-2026?scoringPeriodId=4
GET /challenges/tournament-challenge-bracket-2026?scoringPeriodId=5
GET /challenges/tournament-challenge-bracket-2026?scoringPeriodId=6
```

Each response contains:
- `propositions[]` — games for that round (each has `scoringPeriodId`, `possibleOutcomes[]`, `correctOutcomes[]`)
- Deduplicate by proposition `id` when merging across periods

This is implemented in:
- **Production**: `scraper/fetch.py` → `fetch_challenge_data()` (lines 35-63)
- **Fixtures**: `scraper/save_fixtures.py` → `save_challenge()`

## Fetching Group Entries

There are TWO different group endpoints with different behaviors:

### 1. Chui endpoint (challenge ID — returns ALL entries, NO picks)

```
GET /challenges/277/groups/{groupId}/?platform=chui&view=chui_default_group&filter={"filterSortId":{"value":0},"limit":100,"offset":0}
```

Returns: all 75 entries with scores, champion picks, rankings — but NO individual game picks.

### 2. Slug endpoint (challenge slug — returns picks, CAPS at 50)

```
GET /challenges/tournament-challenge-bracket-2026/groups/{groupId}
```

Returns: up to 50 entries WITH individual game picks (`entry.picks[]`).

### 3. Individual entry endpoint (for entries missing picks)

```
GET /challenges/277/entries/{entryId}
```

Returns: single entry WITH picks.

### Merge strategy (implemented in `fetch.py` → `fetch_group_entries()`):
1. Chui endpoint → get full roster (75 entries, no picks)
2. Slug endpoint → get first 50 entries with picks
3. Individual fetch → get remaining 25 entries with picks
4. Merge: overlay picks onto chui entries

## Authentication

- **Without auth cookies**: Public data only. `fullName` field is NOT returned for entries.
- **With auth cookies**: Full data including `fullName`.
- **Required cookies**: `SWID` and `espn_s2` (set as env vars `ESPN_SWID` and `ESPN_S2`)
- **Full names workaround**: `scraper/fixtures/users.json` stores full names fetched once with auth. The scraper merges these in, so auth cookies are NOT required for ongoing scrapes.

## Required Headers

```
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:148.0) Gecko/20100101 Firefox/148.0
Accept: application/json
Origin: https://fantasy.espn.com
Referer: https://fantasy.espn.com/
```

## Rate Limiting

- Add 0.5-1s delay between requests
- ESPN may rate-limit or return 429 if too aggressive
- The fetcher in `fetch.py` uses 1s delay with retry logic

## Data Flow

```
ESPN API → fetch.py (prod) or save_fixtures.py (local)
    ↓
scraper/fixtures/ (JSON files for local dev)
    ↓
scrape.py --local → public/data.json
    ↓
Next.js reads data.json (no API calls at runtime)
```

## Fixture Files

| File | Source | Used By |
|------|--------|---------|
| `challenge_period_{1-6}.json` | One per scoring period | `run_local()` merges all |
| `challenge.json` | Combined all periods | Reference only |
| `group_entries.json` | Chui endpoint (75 entries) | Reference only |
| `group_slug.json` | Same as group_entries | `run_local()` reads this |
| `users.json` | One-time auth fetch | Full names (never overwritten) |
