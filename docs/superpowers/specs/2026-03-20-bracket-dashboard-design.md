# March Madness Bracket Analytics Dashboard — Design Spec

## Overview
Web dashboard for a 75-person March Madness bracket pool ("DoorDash AP 2026"). Scrapes ESPN bracket data, stores in Google Sheets, serves via Next.js on Vercel. All free.

**Design philosophy**: Celebrate achievements, surface non-obvious insights, make everyone feel good. No negative framing. Every screen provides more value than ESPN alone.

**Cohesion principle**: All 8 pages share one visual system ("Kinetic Terminal" from `stitch/apex_bracket_terminal/DESIGN.md`). Same card radius (12px), same tonal layering (no 1px borders), same typography (Plus Jakarta Sans headlines, Inter body, Space Grotesk labels), same color meanings (teal=alive, purple=probability, orange=action, gold=achievement). Page transitions should feel seamless — switching pages feels like panning across one unified workspace, not jumping between different apps.

## Data Source
- ESPN Group: `https://fantasy.espn.com/games/tournament-challenge-bracket-2026/group?id=f2683f8e-fbba-4625-9188-84a820659e90`
- Men's tournament only, 63 bracket games (First Four excluded)
- 75 brackets across multiple users

## Architecture

```
ESPN.com ──(Python scraper)──→ Google Sheets ──(published CSV)──→ Next.js on Vercel
              ↑
        GitHub Actions cron (every 30 min during game windows)
```

### Stack
| Layer | Choice |
|-------|--------|
| Frontend | Next.js 14 (App Router), Tailwind CSS |
| Charts | Recharts (standard), D3 (Sankey, network graph, bracket DNA) |
| Data | Google Sheets (6 tabs, published as CSV) |
| Scraper | Python (requests, beautifulsoup4, gspread) |
| Cron | GitHub Actions scheduled workflow |
| Hosting | Vercel free tier |
| OG Images | @vercel/og (required) |

### Design System Reference
The Stitch-generated design system at `stitch/apex_bracket_terminal/DESIGN.md` ("The Kinetic Terminal") is the cohesive standard. Key rules enforced in code:
- **No 1px borders** — tonal surface shifts only (`#0a0f14` → `#141a20` → `#252d35`)
- **12px corner radius** on all containers (pills only for small status chips)
- **No red** — eliminated/incorrect states use 40% opacity + desaturation
- **Glassmorphism** for floating overlays (60% opacity, 20px backdrop blur)
- **Glow accents** on primary actions (orange gradient `#ff9159` → `#ff7a2f`)
- **Consistent spacing** — `0.5rem` tight clusters, `1.75rem` section breaks
- **Ghost borders** when needed: `#43484e` at 15% opacity

### Google Sheets Tabs

| Tab | Columns | Rows |
|-----|---------|------|
| `brackets` | id, name, owner, champion_pick, champion_seed, ff1, ff2, ff3, ff4, points, prev_rank, max_remaining, pct, r64_pts, r32_pts, s16_pts, e8_pts, ff_pts, champ_pts | 75 |
| `picks` | bracket_id, game_id, round, region, team_picked, seed_picked, correct (bool), vacated (bool) | ~4,725 |
| `games` | game_id, round, region, team1, seed1, team2, seed2, winner, completed (bool), national_pct_team1 | 63 |
| `teams` | name, seed, region, conference, eliminated (bool), eliminated_round | 64 |
| `snapshots` | bracket_id, round, rank, points, max_remaining, win_prob | 75 per round |
| `meta` | last_updated, current_round, games_completed | 1 |

**Key decisions:**
- `ff1-ff4` instead of JSON (CSV-safe)
- `prev_rank` enables rank delta arrows
- `vacated` distinguishes "wrong pick" from "team never reached that game"
- `national_pct_team1` for group-vs-nation comparison
- `conference` on teams for analysis + archetype classification
- `snapshots` stores end-of-round state for trend charts
- Scraper writes ALL 63 picks per bracket upfront (locked at tournament start), then updates `correct`/`vacated` on subsequent runs

### Scoring Constants (`lib/constants.ts`)

```typescript
export const ROUND_POINTS = {
  R64: 10, R32: 20, S16: 40, E8: 80, FF: 160, CHAMP: 320
};

export const SEED_WIN_RATES = {
  1:  { R64: 0.99, R32: 0.88, S16: 0.72, E8: 0.54, FF: 0.38, CHAMP: 0.23 },
  2:  { R64: 0.94, R32: 0.72, S16: 0.52, E8: 0.33, FF: 0.19, CHAMP: 0.11 },
  3:  { R64: 0.85, R32: 0.61, S16: 0.35, E8: 0.19, FF: 0.09, CHAMP: 0.04 },
  4:  { R64: 0.79, R32: 0.52, S16: 0.28, E8: 0.13, FF: 0.06, CHAMP: 0.03 },
  5:  { R64: 0.65, R32: 0.37, S16: 0.17, E8: 0.07, FF: 0.03, CHAMP: 0.01 },
  6:  { R64: 0.63, R32: 0.36, S16: 0.16, E8: 0.06, FF: 0.03, CHAMP: 0.01 },
  7:  { R64: 0.61, R32: 0.30, S16: 0.13, E8: 0.05, FF: 0.02, CHAMP: 0.01 },
  8:  { R64: 0.50, R32: 0.20, S16: 0.08, E8: 0.03, FF: 0.01, CHAMP: 0.005 },
  9:  { R64: 0.50, R32: 0.18, S16: 0.07, E8: 0.02, FF: 0.01, CHAMP: 0.004 },
  10: { R64: 0.39, R32: 0.15, S16: 0.06, E8: 0.02, FF: 0.01, CHAMP: 0.003 },
  11: { R64: 0.37, R32: 0.14, S16: 0.05, E8: 0.02, FF: 0.01, CHAMP: 0.003 },
  12: { R64: 0.35, R32: 0.12, S16: 0.04, E8: 0.01, FF: 0.005, CHAMP: 0.002 },
  13: { R64: 0.21, R32: 0.06, S16: 0.02, E8: 0.005, FF: 0.002, CHAMP: 0.001 },
  14: { R64: 0.15, R32: 0.04, S16: 0.01, E8: 0.003, FF: 0.001, CHAMP: 0.0005 },
  15: { R64: 0.06, R32: 0.01, S16: 0.003, E8: 0.001, FF: 0.0003, CHAMP: 0.0001 },
  16: { R64: 0.01, R32: 0.002, S16: 0.0005, E8: 0.0001, FF: 0.00003, CHAMP: 0.00001 },
};
```

### Data Flow
- Scraper writes to Sheets via gspread (service account auth)
- Each Sheet tab published as CSV (no auth to read)
- Next.js server components fetch CSV, parse with papaparse, cache 5 min
- Analytics computed server-side from raw data
- Exception: Monte Carlo (1,000 iterations) runs client-side; leaderboard uses lightweight estimate

### Scraper (`scraper/scrape.py`)
1. Scrape group standings → update `brackets` (save current rank as `prev_rank` before overwriting)
2. Scrape each bracket page (75 requests, 2s delay) → update `picks` (all 63 on first run, then `correct`/`vacated` only)
3. Scrape results + national pick %s → update `games` + `teams`
4. At end of each round: append to `snapshots`
5. Update `meta` with timestamp

**GitHub Actions cron** (UTC, covers noon–1am ET):
```yaml
schedule:
  - cron: '*/30 16-5 * 3-4 *'
```

## Pages (8 total)

All positive framing. No "worst", "dead", "graveyard", "overweight/underweight" language. All pages share the same shell (navbar + collapsible sidebar), same card styles, same chart tooltip, same color palette. Switching pages should feel like panning across one workspace.

### Global Shell
- **Navbar**: "DoorDash AP 2026 Bracket Lab" logo, current round pill, "Last updated X min ago", person search
- **Sidebar** (left, collapsible): 8 page icons + labels, consistent icon set, active page highlighted with primary glow
- **Person spotlight** (global): clicking any person's name on ANY page opens a consistent detail popover (rank, champion, archetype, points, MAX, win probability, uniqueness). Same component everywhere.

### 1. Leaderboard (`/`) — "Where do I stand?"
The homepage. Standings + tournament pulse.

**Hero stats bar** (4 stat cards, identical sizing):
- Total brackets: 75
- Games completed: X/63
- Current round indicator
- Most popular champion still standing

**Championship Standings table** (sortable by ALL columns):
- Rank (green up arrow or dash — no red down arrows)
- Name + bracket name
- Archetype badge (colored pill: Strategist blue, Visionary purple, Scout green, Original orange, Analyst teal)
- Champion pick (team logo)
- Points
- MAX remaining
- Estimated win probability %
- Champion-alive indicator (small green dot; absent if eliminated, not red)
- Export CSV button

**Rising Stars** section: top 3 biggest rank climbers, shown as highlight cards with "+X ranks" badge

**"Still in contention"** counter: "X brackets can still mathematically win"

**Tournament Pulse** section (merged from Madness Meter):
- Madness gauge (0-100 animated ring, same style as Stitch design)
- Group resilience stat: "X% of picks still possible on average"
- Round-by-round excitement trend (small sparkline)
- Key moments: 2-3 cards for biggest surprises this round, positively framed ("Only X of us saw this coming — respect to those who did")

### 2. Group Picks (`/picks`) — "What did we collectively predict?"
Two tabs: **Consensus** (default) and **Tournament Lens**.

**Tab 1: Consensus**
- Group accuracy hero: "We got X/Y right this round (national avg: Z/Y)"
- Round selector (R64, R32, S16, E8, FF, Championship)
- Game cards grid: team vs team, horizontal pick split bar ("62% of us picked Duke"), team-colored, post-game badge ("We called it!" or "Surprise! Only X of us saw this coming")
- Bracket heatmap (expandable): all 63 games, color intensity = consensus strength, green overlay = correct. Clickable — tap a game to see the pick split detail

**Tab 2: Tournament Lens** (merged from standalone page)
- "How we pick by conference": horizontal bars, conversational labels ("Group is high on SEC", "Group is cautious on Big East"), explainer tooltip on methodology
- "How we pick by seed": line chart, group vs 20-year history, callout insights ("We believe in 5-seeds more than history does")
- Regional breakdown: 4 region cards, each showing upset count, most popular region champion, average winner seed

### 3. Alive Board (`/alive`) — "Who still has a shot?"
Aggregate-first with drill-down.

**Aggregate counter cards** (4 large clickable cards, identical sizing):
- "X brackets still have their champion alive"
- "X brackets have 3+ Final Four teams left"
- "X brackets have all Elite Eight picks still possible"
- "X brackets have all Sweet Sixteen picks still possible"

**Drill-down panel** (appears below clicked counter):
- List of matching brackets sorted by points (desc) then MAX remaining (desc)
- Each row: rank, name, champion pick (team logo), points, MAX remaining
- Searchable and re-sortable

**Champion distribution** donut chart:
- Vibrant segments for alive teams, faded (40% opacity) for eliminated
- Legend with pick counts

**"Games to Watch"** section:
- Upcoming matchups affecting the most brackets
- "If [Team] wins, it keeps X brackets' champion hopes alive"
- Framed as "here's what to tune into together"

### 4. Simulator (`/simulator`) — "What happens if...?"
Two-panel layout.

**Left panel (~40%)** — Upcoming Games:
- Each game: two team pills, click either to select winner
- Visual toggle (selected team glows)
- Quick scenario buttons above: "All favorites", "All underdogs", "Maximum chaos"

**Right panel (~60%)** — Impact:
- Simulated leaderboard (top 15) with rank change arrows
- "Biggest mover" highlight card
- Win probability shift bars (before → after)

**Volatility index** (below both panels):
- Bar per upcoming game showing leaderboard shift magnitude
- "This game matters most to the pool" star highlight

### 5. Awards (`/awards`) — "Celebrate the best moves"
Round selector tabs at top.

**Award cards** (3-column grid desktop, 1-column mobile):
Each card: trophy icon (gold/silver/bronze tiers), award name, winner name + bracket, stat/reason line

Awards (all positive):
- **The Oracle** — most correct picks this round
- **The Trendsetter** — most unique correct picks
- **The Strategist** — best ROI on bold picks
- **The Faithful** — highest scorer whose champion is still alive
- **Hot Streak** — most consecutive correct picks
- **Diamond in the Rough** — single best pick almost nobody else made
- **The People's Champion** — most aligned with group consensus
- **Momentum Builder** — biggest rank climb this round
- **One of a Kind** — most original bracket (highest uniqueness score)

No CTA buttons, no "recalculate bracket" — this is a celebration page, read-only.

### 6. Probability (`/probability`) — "What are my realistic chances?"
**Methodology card** (top, subtle surface):
- "We simulate the rest of the tournament 1,000 times using historical seed win rates. Each bracket's win probability is how often it finishes first across all simulations."
- "Last simulated: X min ago"

**Win probability bar chart**:
- All 75 brackets, horizontal bars, sorted by probability
- Color-coded by champion pick
- Everyone gets a bar — long shots included

**Probability journey** line chart:
- X: round, Y: win probability
- Lines for top 10 contenders (from `snapshots`)
- Shows momentum swings across the tournament

**Expected finish table**:
- Name, current rank, median estimated final rank, best possible finish, win probability %
- Sortable

### 7. Head-to-Head (`/head-to-head`) — "Compare any two brackets"
**Person selectors**: two dropdowns at top

**Agreement stat** (large): "42/63 — You agree on 66.7% of picks"

**Stats comparison** (side by side):
- Points, rank, MAX remaining, uniqueness, archetype badge
- Radar chart: 5 axes — Accuracy, Chalk, Uniqueness, Upside, Consistency

**Bracket diff view**:
- Game list or mini bracket
- Matching picks: muted gray
- Different picks: highlighted in each person's accent color
- Final Four diff section
- "Strategic Upset Divergence": where they differ on upset picks

No "Conflict Resolution Strategy" section. No "Download Analysis Report" button.

### 8. Season Finale (`/finale`) — "The full story" (post-championship)
Unlocks after championship game. Trophy/celebration header.

**Final standings**: top 3 with gold/silver/bronze treatment, full sortable table below

**All-tournament awards ceremony**: expanded awards with tournament-wide categories:
- Tournament MVP, Best Round, Most Consistent, Cinderella Spotter, One of a Kind (top 10 finisher with highest uniqueness)

**Insight vs Fortune scatter**:
- X: "Insight Score" (% correct on split games, tooltip explains)
- Y: "Fortune Score" (% correct on against-consensus picks, tooltip explains)
- Quadrant labels: "Sharp & Lucky", "Sharp & Steady", "Bold & Lucky", "Going with the Flow" — all positive
- Each person = labeled dot

**Greatest Calls**: top 10 individual picks (lowest group consensus + correct)

**Perfect bracket comparison**: perfect score vs everyone's actual — aspirational, fun

**Group Report Card**: group consensus accuracy by round vs national average

## Computed Analytics

**Uniqueness**: `average(1 - pickRate)` across 63 picks.

**Archetypes**: Strategist (<5 upsets, 1-seed champ), Visionary (>15 upsets or champ seed >4), Scout (3+ seeds 10+ past R64), Original (uniqueness >0.6), Analyst (closest to EV-optimal).

**Madness Index**: `sum(seedDiff * roundWeight) / gamesPlayed`, normalized 0-100.

**Win Probability**: 1,000 Monte Carlo sims using SEED_WIN_RATES. Win prob = sims first / 1,000.

**Estimated Win Probability** (leaderboard): `max(0, 1 - (leaderPts - myPts) / myMaxRemaining)`.

**Volatility**: Per game, `sum(abs(rank_if_team1 - rank_if_team2))` across all brackets.

**Insight Score** (finale): % correct on games where group was <60% consensus.

**Fortune Score** (finale): % correct picking against >70% consensus.

## Cross-Page Interactions

**Person spotlight popover** — clicking any person's name on any page opens the same popover:
- Rank, rank delta, points, MAX remaining
- Champion pick (logo), archetype badge
- Win probability, uniqueness score
- "View bracket" link (to ESPN)

**Consistent team display** — `TeamPill` component used everywhere: logo + seed + name, same size, same style. Eliminated teams shown at 40% opacity, never crossed out.

**Consistent empty states** — before tournament data loads, every page shows the same skeleton pattern with the same animation timing.

## OG Images (`app/api/og/[page]/route.tsx`)

Dynamic 1200x630 via @vercel/og:
- `/api/og/leaderboard` → Top 5 standings + current round
- `/api/og/alive` → Champion distribution
- `/api/og/awards` → Current round winners
- `/api/og/probability` → Top 5 win probabilities

## D3 Components (3 isolated)
1. **BracketDNA** — 75 rows x 63 columns colored SVG (on Leaderboard, expandable section)
2. **SankeyDiagram** — Team flow across rounds from picks (on Group Picks consensus tab)
3. **SimilarityNetwork** — Force-directed bracket similarity (on Leaderboard, progressive enhancement)

Each is a self-contained React component mounting D3 into a ref. No D3 in shared code.

## App Structure

```
march-madness-dashboard/
├── scraper/
│   ├── scrape.py
│   ├── sheets.py
│   └── requirements.txt
├── .github/workflows/scrape.yml
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Global shell (navbar + sidebar)
│   │   ├── page.tsx                # Leaderboard + Tournament Pulse
│   │   ├── picks/page.tsx          # Group Picks (Consensus + Lens tabs)
│   │   ├── alive/page.tsx
│   │   ├── simulator/page.tsx
│   │   ├── awards/page.tsx
│   │   ├── probability/page.tsx
│   │   ├── head-to-head/page.tsx
│   │   ├── finale/page.tsx
│   │   └── api/og/[page]/route.tsx
│   ├── lib/
│   │   ├── sheets.ts               # Fetch + parse published CSVs
│   │   ├── analytics.ts            # Consensus, uniqueness, volatility, madness
│   │   ├── montecarlo.ts           # Win probability simulation
│   │   ├── archetypes.ts           # Bracket classification
│   │   ├── constants.ts            # ROUND_POINTS, SEED_WIN_RATES, colors
│   │   └── types.ts                # TypeScript types for all data
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── RoundSelector.tsx
│   │   ├── charts/
│   │   │   ├── PickDistributionBar.tsx
│   │   │   ├── BracketHeatmap.tsx
│   │   │   ├── MadnessGauge.tsx
│   │   │   ├── WinProbBar.tsx
│   │   │   ├── ProbabilityJourney.tsx
│   │   │   ├── ChampionDonut.tsx
│   │   │   ├── RadarComparison.tsx
│   │   │   ├── InsightFortuneScatter.tsx
│   │   │   ├── BracketDNA.tsx        # D3
│   │   │   ├── SankeyDiagram.tsx     # D3
│   │   │   └── SimilarityNetwork.tsx # D3
│   │   ├── cards/
│   │   │   ├── StatCard.tsx
│   │   │   ├── AwardCard.tsx
│   │   │   ├── TeamPill.tsx
│   │   │   ├── PersonSpotlight.tsx   # Global popover
│   │   │   ├── GameCard.tsx
│   │   │   └── KeyMomentCard.tsx
│   │   └── tables/
│   │       ├── LeaderboardTable.tsx
│   │       └── DrilldownTable.tsx
│   └── hooks/
│       └── useSheetData.ts
├── public/team-logos/
├── stitch/                           # Design reference (screenshots + code)
├── tailwind.config.js
└── package.json
```

## Constraints
- All free tier: Vercel, Google Sheets, GitHub Actions
- No database beyond Sheets
- Scraper handles ESPN DOM changes gracefully
- Tournament: 3/19–4/6
- Positive framing on all user-facing content
- High cohesion: every page uses the same design system, same components, same interaction patterns
