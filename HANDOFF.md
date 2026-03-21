# Context Handoff: March Madness Bracket Analytics Dashboard

**Created:** 2026-03-21
**Project:** `/Users/braxtonbrewton/Organized/Projects/distributed-playground/golang/pocs/playground/march-madness-dashboard`

## Goal
Build a web dashboard for a 75-person March Madness bracket pool ("DoorDash AP 2026") that provides analytics, visualizations, and insights beyond what ESPN offers. Free stack: Next.js on Vercel + Google Sheets backend + Python scraper on GitHub Actions cron.

## Current State
**Plan 1 (Scraper + Data Layer) is COMPLETE and live.** The scraper runs against ESPN's JSON API, writes to Google Sheets, and the Sheet has real tournament data. 50/50 tests passing.

**Plan 2 (Frontend Foundation) needs to be WRITTEN and EXECUTED.** The spec and design system are ready.

**Plan 3 (Interactive Pages + Polish) hasn't been started.**

## Completed Work
- **Scraper** (`scraper/`) — Python scraper using ESPN's gambit JSON API (NOT HTML scraping). Fetches challenge structure + group entries, parses into brackets/picks/games/teams, writes to Google Sheets via gspread.
- **Data store** (`scraper/sheets.py`) — `DataStore` ABC with `GoogleSheetsStore` implementation. Swappable for Supabase/Postgres later.
- **GitHub Actions** (`.github/workflows/scrape.yml`) — Cron every 30 min during game windows (UTC adjusted).
- **Google Sheet** — Live at `https://docs.google.com/spreadsheets/d/1BT4Yz1Gs951frXXIAH498UFWvrBjxiCXWe21cUY5FcM` with 6 tabs populated: brackets (50 rows), picks (3150 rows), games (32 rows), teams (64 rows), snapshots, meta.
- **Test suite** — 50 tests across 4 test files, all passing.
- **Design system** — Stitch-generated designs in `stitch/` + design system doc at `stitch/apex_bracket_terminal/DESIGN.md` ("Kinetic Terminal" theme).
- **Women's tournament brackets** — 25 brackets filled/submitted on ESPN (NFL nicknames), separate from this dashboard project.

## Active Tasks
- [ ] **Write Plan 2** — Frontend foundation: Next.js app scaffold, design system in Tailwind, shared components, data fetching layer (published CSV from Sheets), first 3 pages (Leaderboard, Group Picks, Alive Board)
- [ ] **Execute Plan 2**
- [ ] **Write Plan 3** — Interactive pages: Simulator, Awards, Probability, Head-to-Head, Season Finale, OG images, D3 components
- [ ] **Execute Plan 3**
- [ ] **Publish Google Sheet tabs as CSV** — Each tab needs to be published via File → Share → Publish to web → CSV for the frontend to read without auth
- [ ] **Deploy to Vercel** — Connect GitHub repo, deploy
- [ ] **Set up GitHub secrets** for the scraper cron (`GOOGLE_CREDENTIALS`, `SPREADSHEET_ID`)

## Key Decisions Made
| Decision | Rationale |
|----------|-----------|
| ESPN JSON API instead of HTML scraping | ESPN is a React SPA — raw HTML is empty. API at `gambit-api.fantasy.espn.com` returns all data as JSON. Much more reliable. |
| Google Sheets as backend (published CSV for reads) | Free, editable, no auth needed for frontend reads. Scraper writes via gspread (service account), frontend reads published CSV URLs. |
| 8 pages (down from 12) | Merged Madness Meter into Leaderboard ("Tournament Pulse"), merged Tournament Lens as tab in Group Picks. Reduced page count for cohesion. |
| No Pick Regret page | User explicitly removed — negative framing. |
| Positive framing everywhere | No "dead brackets", "graveyard", "worst picks", "overweight/underweight". Celebrate achievements only. |
| Archetypes as inline badges on Leaderboard | Not a standalone page. Each bracket gets a colored pill (Strategist/Visionary/Scout/Original/Analyst). |
| Recharts + D3 (3 components only) | Recharts for all standard charts. D3 isolated to: BracketDNA, SankeyDiagram, SimilarityNetwork. |
| DataStore abstraction | `scraper/sheets.py` has ABC so backend can be swapped later without rewriting scraper logic. |
| ESPN API pagination deduplicates | ESPN returns same entries at every offset for this group. Fetch deduplicates by entry ID. |

## Important Context
- **ESPN API endpoints:**
  - Challenge: `https://gambit-api.fantasy.espn.com/apis/v1/challenges/tournament-challenge-bracket-2026`
  - Group: `https://gambit-api.fantasy.espn.com/apis/v1/challenges/tournament-challenge-bracket-2026/groups/{groupId}`
- **Group has 50 brackets** (not 75 — some members haven't submitted). `size: 75` is member count.
- **Only 32 propositions** in challenge data (R64 games). Later rounds are implicit — picks reference them but the proposition details aren't in the challenge endpoint. Picks still have all 63 rounds.
- **Credentials** at `secrets/march-madness-2026-490823-656c22c3024f.json` (gitignored). Service account: `march-madness-2026@march-madness-2026-490823.iam.gserviceaccount.com`
- **Sheet ID**: `1BT4Yz1Gs951frXXIAH498UFWvrBjxiCXWe21cUY5FcM`
- **ESPN Group ID**: `f2683f8e-fbba-4625-9188-84a820659e90`
- **Tournament is LIVE** — R64 complete (32/63 games done). Time-sensitive to get the frontend up.
- **Cron spec discrepancy**: Spec says `*/30 16-5` (invalid), workflow uses `*/30 16-23,0-5` (correct).
- **User prefers simplicity** — repeatedly asked for simplest approach. Don't over-engineer.
- **User wants all permissions granted upfront** — use `bypassPermissions` on all subagents.

## Files to Review
1. `docs/superpowers/specs/2026-03-20-bracket-dashboard-design.md` — Full spec (8 pages, data model, computed analytics, design system rules)
2. `stitch/apex_bracket_terminal/DESIGN.md` — Design system ("Kinetic Terminal" — colors, typography, spacing, card rules)
3. `scraper/espn.py` — ESPN API parsing (understand data shapes the frontend will consume)
4. `scraper/scrape.py` — Orchestrator (understand what data ends up in Sheets)
5. `DESIGN_PROMPT.md` — Design prompt used for Stitch (page-by-page UI descriptions)

## How to Continue
1. Read the spec at `docs/superpowers/specs/2026-03-20-bracket-dashboard-design.md`
2. Use the `superpowers:writing-plans` skill to write Plan 2 (Frontend Foundation)
3. Plan 2 should cover: Next.js scaffold, Tailwind config with Kinetic Terminal design tokens, shared components (Navbar, Sidebar, StatCard, TeamPill, PersonSpotlight), data fetching layer (`lib/sheets.ts` reading published CSVs), analytics computation (`lib/analytics.ts`), and the first 3 pages (Leaderboard `/`, Group Picks `/picks`, Alive Board `/alive`)
4. Execute Plan 2 using `superpowers:subagent-driven-development` with `bypassPermissions` on all agents
5. Then write and execute Plan 3 for remaining pages
