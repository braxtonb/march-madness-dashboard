# DoorDash AP 2026 Bracket Lab

March Madness bracket analytics dashboard for a 75-person workplace bracket pool. Scrapes ESPN data, stores in Google Sheets, serves via Next.js on Vercel.

## Live

**https://march-madness-dashboard-six.vercel.app**

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Leaderboard | `/` | Standings, hero stats, rising stars, tournament pulse |
| Group Picks | `/picks` | Game-by-game pick splits with who picked what, conference analysis |
| Alive Board | `/alive` | Champion/Final Four survival tracking, games to watch |
| Simulator | `/simulator` | Toggle game outcomes, see projected standings impact |
| Awards | `/awards` | Auto-generated positive superlatives each round |
| Probability | `/probability` | Monte Carlo win probability (1,000 simulations) |
| Head-to-Head | `/head-to-head` | Compare any two brackets side by side |
| Season Finale | `/finale` | Final standings, insight vs fortune, greatest calls |

## Architecture

```
ESPN API ──(Python scraper)──> Google Sheets ──(Sheets API)──> Next.js on Vercel
                ↑
          GitHub Actions cron (every 30 min during games)
```

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Charts**: Recharts
- **Data**: Google Sheets API (service account auth)
- **Scraper**: Python (requests, gspread)
- **Hosting**: Vercel (free tier)
- **CI**: GitHub Actions

## Local Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.local.example .env.local
# Add your Google service account credentials path and spreadsheet ID

# Run dev server
npm run dev
```

Requires a Google service account with Sheets API access. Place the JSON key at `secrets/` (gitignored).

### Environment Variables

| Variable | Description |
|----------|-------------|
| `GOOGLE_CREDENTIALS_PATH` | Local path to service account JSON key |
| `GOOGLE_CREDENTIALS` | JSON string of service account key (Vercel) |
| `SPREADSHEET_ID` | Google Sheets spreadsheet ID |

## Scraper

```bash
cd scraper
pip install -r requirements.txt

# Set ESPN cookies
export ESPN_SWID="your-swid"
export ESPN_S2="your-s2-cookie"

# Run scraper
python -m scraper.scrape
```

The scraper uses ESPN's gambit JSON API with a 3-endpoint merge strategy to fetch all 75 entries. Runs every 30 minutes via GitHub Actions during game windows.

### GitHub Actions Secrets

| Secret | Description |
|--------|-------------|
| `GOOGLE_CREDENTIALS` | Service account JSON |
| `SPREADSHEET_ID` | Google Sheets ID |
| `ESPN_SWID` | ESPN auth cookie |
| `ESPN_S2` | ESPN auth cookie |

## Design System

"Kinetic Terminal" — dark mode dashboard inspired by Bloomberg terminals meets ESPN energy.

- No 1px borders — tonal surface shifts only
- 12px corner radius on all containers
- No red — eliminated states use 40% opacity
- Positive framing only — no "dead", "worst", "graveyard"
- Fonts: Plus Jakarta Sans (display), Inter (body), Space Grotesk (labels)

## Data Model

The Google Sheet has 6 tabs. The scraper writes to them; the frontend reads from them via the Sheets API.

| Tab | Rows | Purpose | How it's used |
|-----|------|---------|---------------|
| `brackets` | 75 | One row per bracket entry. Contains owner name, bracket name, champion pick, Final Four picks, current points, max remaining points, and per-round point breakdowns. | Leaderboard standings, rising stars, contention counts, simulator scoring, head-to-head comparisons, awards computation, win probability. |
| `picks` | ~4,410 | One row per bracket per game (75 brackets x 63 games). Contains the team picked, seed, round, region, and whether the pick was correct or vacated. | Group consensus percentages, individual picker drill-down on game cards, head-to-head pick diffs, uniqueness scores, award calculations. |
| `games` | 63 | One row per tournament game across all 6 rounds. Contains both teams, seeds, region, winner (if completed), and national pick percentage. Future-round games show TBD until matchups are determined. | Round-by-round game cards, alive board (which champions still have a path), simulator (toggle outcomes), group accuracy stats. |
| `teams` | 64 | One row per tournament team. Contains seed, region, conference, and elimination status (derived from game results). | Alive board elimination tracking, conference analysis on Tournament Lens, team pill display with eliminated styling. |
| `snapshots` | 75/round | End-of-round snapshot of every bracket's rank, points, max remaining, and win probability. Written once when a round completes. | Probability journey line chart (tracking how win odds changed over the tournament). |
| `meta` | 1 | Single row with last scrape timestamp, current round, and games completed count. | Navbar "last updated" display, current round indicator, determining which round to show by default. |
