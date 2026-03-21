# Context Handoff: March Madness Dashboard — Frontend Build

**Created:** 2026-03-21 02:35 ET
**Project:** `/Users/braxtonbrewton/Organized/Projects/distributed-playground/golang/pocs/playground/march-madness-dashboard`
**Branch:** `feat/scraper-data-layer` (scraper complete, frontend next)

## Goal
Build the Next.js frontend for a 75-person March Madness bracket analytics dashboard ("DoorDash AP 2026"). The scraper/data layer is complete and live. Next: scaffold the app, build shared components, implement 8 pages.

## Current State
**Plan 1 (Scraper) — DONE.** 48/48 tests passing. Live data in Google Sheets.
**Plan 2 (Frontend) — NEEDS TO BE WRITTEN AND EXECUTED.**
**Plan 3 (Interactive pages) — NOT STARTED.**

## Completed Work
- **Scraper** (`scraper/`) — Uses ESPN's gambit JSON API (3-endpoint merge strategy to get all 75 entries). Writes to Google Sheets via gspread.
- **Google Sheet** — `1BT4Yz1Gs951frXXIAH498UFWvrBjxiCXWe21cUY5FcM`, 6 tabs: brackets (75 rows), picks (4410 rows), games (32), teams (64), snapshots, meta
- **GitHub Actions** (`.github/workflows/scrape.yml`) — Cron every 30 min, needs secrets: `GOOGLE_CREDENTIALS`, `SPREADSHEET_ID`, `ESPN_SWID`, `ESPN_S2`
- **Design system** — `stitch/apex_bracket_terminal/DESIGN.md` ("Kinetic Terminal" theme)
- **Stitch designs** — 10 page screenshots in `stitch/*/screen.png` (use as guide, not gospel — need cohesive unification)

## Active Tasks
- [ ] Write Plan 2 (Frontend Foundation) using `superpowers:writing-plans`
- [ ] Execute Plan 2 using `superpowers:subagent-driven-development` (bypassPermissions on all agents)
- [ ] Write + execute Plan 3 (remaining interactive pages)
- [ ] Deploy to Vercel
- [ ] Set up GitHub secrets for scraper cron

## Key Decisions Made
| Decision | Rationale |
|----------|-----------|
| **Google Sheets API from Next.js (Option A)** | Frontend reads Sheets via service account in server components. No public sharing needed. Same creds as scraper. Use `google-spreadsheet` npm package or raw Google API. Credentials go in Vercel env vars. |
| ESPN JSON API (not HTML scraping) | ESPN is React SPA. API at `gambit-api.fantasy.espn.com` returns JSON. |
| 3-endpoint merge for all 75 entries | Chui view (ID 277) → all 75 entries without picks. Slug endpoint → 50 with picks. Individual fetch → remaining 25. Requires ESPN_SWID + ESPN_S2 cookies. |
| 8 pages total | Leaderboard (+ Tournament Pulse), Group Picks (+ Tournament Lens tab), Alive Board, Simulator, Awards, Probability, Head-to-Head, Season Finale |
| Positive framing only | No "dead", "graveyard", "worst", "overweight/underweight" |
| Recharts + D3 (3 isolated) | D3 only for: BracketDNA, SankeyDiagram, SimilarityNetwork |
| Archetypes as inline badges | Not a standalone page — colored pills on Leaderboard |
| No Pick Regret page | Removed per user request |

## Important Context
- **Service account creds**: `secrets/march-madness-2026-490823-656c22c3024f.json` (gitignored)
- **Sheet ID**: `1BT4Yz1Gs951frXXIAH498UFWvrBjxiCXWe21cUY5FcM`
- **ESPN Group ID**: `f2683f8e-fbba-4625-9188-84a820659e90`
- **ESPN Challenge ID**: `277` (numeric, for chui view)
- **Group**: 75 members, 70 submitted brackets, 5 empty
- **Tournament status**: R64 complete (32/63 games), time-sensitive
- **Sheet tabs are NOT publicly published** — frontend must use Google Sheets API with service account (decided Option A)
- **User preferences**: simplicity first, bypassPermissions on all subagents, don't over-engineer
- **Design cohesion is critical**: Stitch designs are inconsistent — unify under Kinetic Terminal system (12px radius, no 1px borders, tonal shifts, no red, glassmorphism for overlays)

## Frontend Plan 2 Should Cover
1. Next.js 14 scaffold (App Router) + Tailwind config with Kinetic Terminal design tokens
2. Data fetching layer (`src/lib/sheets.ts`) — Google Sheets API via service account, cached 5 min
3. TypeScript types (`src/lib/types.ts`) matching Sheet schema
4. Analytics computation (`src/lib/analytics.ts`) — uniqueness, archetypes, madness index, volatility
5. Shared components: Navbar, Sidebar, StatCard, TeamPill, PersonSpotlight, GameCard, AwardCard, RoundSelector
6. Leaderboard page (`/`) with Tournament Pulse section
7. Group Picks page (`/picks`) with Consensus + Tournament Lens tabs
8. Alive Board page (`/alive`) with aggregate counters + drill-down

## Files to Review
1. `docs/superpowers/specs/2026-03-20-bracket-dashboard-design.md` — Full spec (8 pages, data model, analytics formulas)
2. `stitch/apex_bracket_terminal/DESIGN.md` — Design system (colors, typography, spacing rules)
3. `scraper/espn.py` — Data shapes the frontend will consume (understand bracket/pick/game/team structures)
4. `DESIGN_PROMPT.md` — Page-by-page UI descriptions
5. `scraper/scrape.py` — What data ends up in each Sheet tab

## How to Continue
1. Read spec: `docs/superpowers/specs/2026-03-20-bracket-dashboard-design.md`
2. Read design system: `stitch/apex_bracket_terminal/DESIGN.md`
3. Use `superpowers:writing-plans` to write Plan 2 (Frontend Foundation)
4. Execute with `superpowers:subagent-driven-development`, `bypassPermissions` on all agents
5. Key: frontend reads Google Sheets via service account API (NOT published CSV)
