# Features

## Pages

### Leaderboard (`/`)
- **Standings tab** — sortable table with rank, bracket name, champion pick (with logo + alive status), points, max possible, and per-round point breakdown (R64–Championship)
- **Expandable rows** — click any row to see path to victory: remaining alive picks grouped by round with point values
- **Gold/Silver/Bronze podium** — top 3 brackets highlighted with champion picks
- **Best Calls tab** — top 10 contrarian correct picks (lowest consensus + correct) with round context
- **Picking Style tab** — scatter chart plotting Chalk Score vs Upset Score with team logos, clustering for overlapping brackets, and multi-select filtering by sheet name, champion, and points threshold

### Group Picks (`/picks`)
- **Game Results tab** — game cards for each round showing pick split bars, consensus badges, and individual picker drill-down via slide-in drawer with prev/next navigation
- **Champion Distribution tab** — grid showing how many brackets picked each team as champion with alive/eliminated status
- **Group accuracy report card** — per-round consensus accuracy inline
- **Status filtering** — filter by completed/scheduled games with counts (e.g., "Completed (12)") and deep-linked URL params

### Probability (`/probability`)
- **Championship Chances tab** — encouraging tier groupings (Strong Contender through Need a Miracle) with percentages hidden by default and optional reveal toggle
- **Simulated Finishes tab** — full table with Win%, 2nd%, 3rd%, Top 10, Top 25, and median finish from 1,000 Monte Carlo simulations; expandable rows for additional detail
- **Who's Still Alive tab** — champion alive count, 3+ and 2+ Final Four team counts, games to watch with bracket drill-down, and filterable bracket list

### Simulator (`/simulator`)
- **Cascading bracket simulation** — pick winners round by round; selections cascade into later rounds based on actual bracket structure
- **All favorites / All underdogs** — one-click fill with deterministic seed-based picks through championship
- **Chalk the rest / Upset the rest** — fill only unselected games while preserving manual picks
- **Collapsible rounds** — completed rounds collapse by default
- **Impact table** — all brackets ranked by simulated points with rank change indicators

### Head-to-Head (`/head-to-head`)
- **Custom searchable dropdowns** — search and select any two brackets for comparison
- **Per-round game comparison** — side-by-side pick display with correct/incorrect indicators, grouped by completion status
- **Agreement/Difference filters** — filter to show only matching or differing picks, with per-round counts
- **Status filter** — filter by completed or scheduled games
- **Compact stat cards** — points, max, champion, and win percentage at a glance

### Awards (`/awards`)
- **Round selector** — view awards for any round with deep-linked URL, plus "All Rounds" global variant
- **6 awards per round** — The Oracle, The Trendsetter, The Faithful, Hot Streak, Diamond in the Rough, The People's Champion
- **Award-specific icons** — unique emoji per award type with descriptions always visible
- **Multiple winners** — tie display when multiple brackets earn the same award, with prev/next navigation
- **Award detail sidebar** — clickable award cards open a detail sidebar with per-award breakdowns:
  - Oracle: game-by-game correct picks
  - Trendsetter: unique correct picks no one else made
  - Faithful: champion still alive status
  - Hot Streak: consecutive correct games in the streak
  - Diamond in the Rough: the single contrarian pick and its consensus percentage
  - People's Champion: consensus alignment analysis
- **People's Champion** — based on plurality consensus (most popular pick per game), works for all rounds

## Shared Components

- **TeamPill** — reusable team display with logo (20x20), seed, name, and alive/eliminated status dot; shows alive/eliminated state in picks drawer
- **GameHeader** — shared game matchup display with team pills, winner, status badge, and ESPN deep link
- **Picks Drawer** — full-viewport slide-in panel (via React portal) with prev/next navigation for browsing individual picks
- **SearchDropdown** — searchable dropdown with multi-select support, used in picking style filters and head-to-head bracket selectors
- **BottomSheet** — slide-up bottom sheet on mobile (<640px), right-slide drawer on desktop; used for picks drawer, award detail sidebar, and all full-viewport panels
- **CompareCheckbox** — circular checkbox on table/list rows for selecting brackets to compare
- **CompareBar** — floating glassmorphism bar that slides up when 1–2 brackets are selected, with deep link to head-to-head page
- **MobileCard** — stacked card layout for leaderboard and who's still alive on small screens
- **MobileSortDropdown** — sort dropdown replacing column headers on mobile

## Mobile Responsiveness

- **Bottom sheets** — BottomSheet component renders as slide-up panel on mobile (<640px) and right-slide drawer on desktop
- **Stacked card layouts** — leaderboard and who's still alive tables convert to MobileCard stacks on small screens
- **Mobile sort dropdown** — replaces sortable column headers with a dropdown on mobile
- **Horizontally scrollable filter pills** — filter rows scroll horizontally on narrow viewports
- **Sticky first column** — wide tables (simulated finishes, simulator impact) pin the first column while the rest scroll horizontally
- **Full-width bottom sheets** — all drawers (picks, award detail) use full-width bottom sheets on mobile
- **44px minimum touch targets** — all interactive elements meet minimum tap target size

## Bracket Compare UX

- **Compare checkboxes** — circular checkboxes on leaderboard, probability, simulator impact, and picks drawer rows
- **Floating compare bar** — glassmorphism bar slides up from the bottom when 1–2 brackets are selected
- **FIFO selection** — selecting a 3rd bracket automatically deselects the oldest
- **Deep link to head-to-head** — compare bar links to `/head-to-head?bracket1=X&bracket2=Y` with pre-populated dropdowns
- **Same bracket prevention** — head-to-head page only pre-populates bracket 1 if both URL params point to the same bracket

## Data Pipeline

- **Scraper** — Python scraper fetches from ESPN's gambit JSON API, merging 3 endpoints (chui view + slug + individual entries) for all 75 brackets
- **All scoring periods** — fetches R64 through Championship propositions separately to maintain full historical game data
- **Static data.json** — scraper exports `public/data.json` for the frontend, eliminating Google Sheets API calls at runtime
- **Local mode** — `python -m scraper.scrape --local` generates data.json from cached fixtures without any API calls
- **Hourly cron** — GitHub Actions runs the scraper hourly during game windows, commits data.json, and triggers Vercel redeploy via deploy hook

## Design System

- **Kinetic Terminal** — dark mode with bright cyan (`#00f4fe`), purple (`#c97cff`), and orange (`#ff8c42`) accents
- **Glassmorphism navbar** — blur + transparency with animated live indicator
- **SVG sidebar icons** — collapsible sidebar with proper icons
- **Consistent filter styling** — orange active state (`bg-primary/15 text-primary border-primary/30`) across all filter pills
- **Dotted underline table headers** — all column headers show tooltip on hover explaining the metric
- **Team logos** — ESPN logos with subtle drop shadow for contrast on dark backgrounds
- **Positive framing** — no demoralizing language; eliminated teams shown at reduced opacity, not crossed out

## Deep Linking

Every filter, tab, and round selection is deep-linked via URL search params for shareability.

## ESPN Integration

- **Boxscore links** — completed games link directly to ESPN boxscore pages (`/game/_/gameId/{id}`) opening in new tabs, available on picks, simulator, and head-to-head pages
- **Competition IDs** — extracted from outcome mappings in the ESPN API and stored per game
- **52/63 games** have direct ESPN URLs (future round games get URLs as matchups are determined)

## Sorting

- **Leaderboard table** — sortable by rank, points, max, and per-round columns
- **Simulated Finishes table** — sortable by Win%, 2nd%, 3rd%, Top 10, Top 25, median finish
- **DrilldownTable (Who's Still Alive)** — sortable by rank, points, max remaining

## Awards (6 per round)

| Award | Description | Icon |
|-------|-------------|------|
| The Oracle | Most correct picks this round | 🔮 |
| The Trendsetter | Most unique correct picks | 🌟 |
| The Faithful | Highest scorer with champion alive | 🛡️ |
| Hot Streak | Most consecutive correct picks | 🔥 |
| Diamond in the Rough | Single best pick nobody else made | 💎 |
| The People's Champion | Most aligned with group consensus (plurality) | 👑 |
