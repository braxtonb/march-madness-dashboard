# Features

## Pages

### Leaderboard (`/`)
- **Standings tab** — sortable table with window-style ranking (ties share rank, next skips), bracket name + full name, champion pick (TeamPill), points, max possible, and per-round breakdown (R64–Championship)
- **Expandable rows** — click any row to see path to victory: remaining alive picks grouped by round with point values
- **Ribbon podium** — top 3 brackets in a gradient horizontal ribbon (gold→silver→bronze), responsive stacked layout on mobile
- **Quick links** — 4 hero cards below podium linking to Bracket View, Simulator, Compare Top 2, and Win Probability
- **Best Calls tab** — top 15 contrarian correct picks (lowest consensus + correct) with round context and pick rate
- **Picking Style tab** — scatter chart with popover dropdown filters (Brackets, Champions, Points) that don't cause layout shift; compact "+N" display for multi-select
- **Bracket search** — multi-select autocomplete search filters the standings table, deep-linked via `?brackets=` URL param
- **Leaderboard search hint** — "Hover any row to compare brackets" / "Tap ○ to compare brackets" (mobile)

### Group Picks (`/picks`)
- **Game Results tab** — game cards with pick split bars (orange/cyan), consensus badges, and individual picker drill-down via BottomSheet drawer
- **Bracket View tab** — ESPN-style traditional tournament bracket tree with nested/overlapping round columns, mirrored right-side regions (West/Midwest), pick split bars per game, ESPN links, and clickable games opening the picks drawer
- **Heatmap tab** — dense grid of games with cyan/orange accuracy coloring, collapsible rounds, responsive multi-column layout
- **Champion Distribution tab** — grid showing brackets per champion pick with TeamPill (seed, logo, alive status); expandable to show individual brackets with compare support
- **Group accuracy report card** — per-round consensus accuracy with explanation text
- **All Rounds** filter with collapsible rounds (completed rounds collapsed by default)
- **Status filtering** — with counts (e.g., "Completed (12)"), deep-linked URL params
- **Pick split legend** — "Team 1 (orange) / Team 2 (cyan)" shown on Card View and Bracket View

### Probability (`/probability`)
- **Championship Chances tab** — encouraging tier groupings with percentages hidden by default and optional reveal toggle
- **Simulated Finishes tab** — sortable table with Win%, 2nd%, 3rd%, Top 10, Top 25, median finish from 1,000 deterministic Monte Carlo simulations (seeded PRNG); expandable rows showing path to victory; column header tooltips; bracket search
- **Who's Still Alive tab** — champion alive count, Final Four counts, games to watch (multi-column grid with clickable sidebar showing affected brackets), filterable bracket list with "All Brackets" option leftmost
- **Games to Watch** — cards with TeamPill, round badge, people group icon trigger, clickable sidebar with affected brackets and compare support

### Simulator (`/simulator`)
- **Cascading bracket simulation** — pick winners round by round; selections cascade into later rounds
- **All favorites / All underdogs** — one-click fill with seed-based picks
- **Chalk the rest / Upset the rest** — fill only unselected games
- **Collapsible rounds** — completed rounds collapse by default
- **Impact table** — all brackets ranked by simulated points with rank change, champion column, expandable path to victory, bracket search, compare checkboxes
- **Deep-linked picks** — simulator selections encoded in URL hash (`#picks=0:1,3:2`) for sharing
- **Skeleton loader** — layout-matching skeleton during data load

### Head-to-Head (`/head-to-head`)
- **Unified search dropdowns** — MultiSelectSearch in single-select mode for bracket selection
- **All Rounds** filter with collapsible round sections (completed rounds collapsed)
- **Per-round game comparison** — side-by-side picks with correct/incorrect indicators
- **Agreement/Difference filters** — with per-round counts using "-" separator
- **Status filter** — with game counts
- **Same bracket prevention** — can't select the same bracket on both sides
- **Deep-linked selections** — bracket selections and round persist in URL params
- **Compare from compare bar** — works even when already on H2H page (via custom event)

### Awards (`/awards`)
- **Round selector** — "All Rounds" default (leftmost) plus per-round options, deep-linked
- **6 awards** with custom SVG icons:
  - The Oracle (all-seeing eye, cyan) — most correct picks
  - The Trendsetter (star, orange) — most unique correct picks
  - The Faithful (shield, purple) — highest scorer with champion alive
  - The Contrarian (lightning bolt, orange) — most correct picks against national consensus
  - Diamond in the Rough (gem, cyan) — single best contrarian pick with round label
  - The People's Champion (crown, purple) — most aligned with group consensus
- **Award detail sidebar** — clickable cards open sidebar with per-award breakdowns; prev/next to switch between awards; collapsible rounds in "All Rounds" mode
- **Multiple winners** — "X-way tie" display; sidebar shows all tied brackets with prev/next navigation
- **Dynamic descriptions** — change based on selected round context (e.g., "All Rounds" vs "Sweet 16")
- **"Show details" footer** — consistent card footer with sidebar panel icon

## Shared Components

- **TeamPill** — reusable team display with logo, seed, name, and alive/eliminated status dot (`showStatus` prop); used consistently across all pages
- **GameHeader** — shared game matchup with TeamPills, winner, status badge, and ESPN link
- **BottomSheet** — slide-up on mobile, right-slide drawer on desktop; GPU-accelerated animation (`translate3d`, `will-change-transform`); deferred child rendering; bottom padding when CompareBar has selections
- **MultiSelectSearch** — unified autocomplete component for all search/filter inputs across the site; supports single-select and multi-select modes; keyboard navigation (arrow keys + enter); orange checkboxes for filtering; bracket name primary, full name secondary; no scroll jump on selection
- **CompareCheckbox** — hover-reveal circular checkbox (invisible on desktop until hover, subtle on mobile, always visible when checked); `React.memo` wrapped; cyan glow on hover
- **CompareBar** — floating glassmorphism bar at z-[9999]; bracket pills clickable to deselect; works on H2H page via custom event dispatch
- **CompareProvider** — split into state + actions contexts to prevent unnecessary re-renders
- **MyBracketProvider** — localStorage-persisted bracket pin; split contexts; navbar badge with rank + points
- **MobileCard** — stacked card for leaderboard/drilldown on mobile
- **MobileSortDropdown** — custom styled dropdown (not native `<select>`) for mobile sorting
- **FilterDropdown** — popover dropdown for picking style filters (removed, replaced by MultiSelectSearch)
- **Skeleton** — `animate-pulse` skeleton loaders matching page layouts

## My Bracket Mode

- **Pin your bracket** via navbar search dropdown (MultiSelectSearch in single-select mode)
- **Persistent** — stored in localStorage across sessions
- **Highlighted everywhere** — `bg-secondary/5 border-l-2 border-l-secondary` on all table rows including sticky columns
- **Highlighted in search** — pinned bracket highlighted in all MultiSelectSearch dropdowns
- **Navbar badge** — shows bracket name, rank, and points

## Mobile Responsiveness

- **Bottom sheets** — all drawers use BottomSheet (slide-up on mobile, right-slide on desktop)
- **Stacked card layouts** — leaderboard and drilldown tables convert to MobileCard on mobile
- **Mobile sort dropdown** — custom styled dropdown replacing column headers
- **Scrollable filter pills** — horizontal scroll with hidden scrollbar
- **Sticky first column** — wide tables pin bracket name column
- **44px touch targets** — all interactive elements meet minimum size
- **Sidebar** — full-width with backdrop on mobile, hover-expand on desktop

## Bracket Compare UX

- **Hover-reveal checkboxes** — invisible on desktop until row hover, subtle on mobile, always visible when checked
- **Floating compare bar** — glassmorphism, z-[9999], bracket pills clickable to deselect
- **FIFO selection** — 3rd click deselects oldest
- **Deep link to H2H** — pre-populates dropdowns; works when already on H2H page
- **Same bracket prevention** — H2H dropdowns exclude the other side's selection
- **Compare from sidebars** — compare checkboxes in picks drawer, champion distribution, games to watch, award detail sidebars
- **Discoverability** — hint text on leaderboard, simulated finishes, and who's still alive tables

## Deep Linking

- **Tabs** — `?tab=standings`, `?tab=finishes`, etc.
- **Filters** — rounds, status, diff filters, bracket search all persisted in URL
- **Sort order** — `?sort=points&dir=desc` (leaderboard), `?fsort`/`?asort` (probability), `#isort` (simulator)
- **Sidebar state** — `?award=N`, `?game=id`, `?champ=team`, `?watch=gameId` auto-open sidebars
- **Simulator picks** — `#picks=0:1,3:2,5:1` hash encoding for shareable simulations
- **Bracket selections** — H2H `?b1=&b2=`, leaderboard `?brackets=id1,id2`
- **Tab switch cleanup** — switching tabs clears unrelated deep link params

## Data Pipeline

- **Scraper** — Python scraper fetches from ESPN gambit JSON API for all 75 brackets
- **Full names** — `member.fullName` extracted via authenticated API, stored in `scraper/fixtures/users.json`; never overwritten by scraper; synced to Google Sheets
- **Static data.json** — scraper exports `public/data.json`, eliminating runtime API calls
- **Local mode** — `python -m scraper.scrape --local` generates from fixtures
- **GitHub Actions** — runs on cron schedule + push to main; `permissions: contents: write` for GITHUB_TOKEN push access
- **Deterministic simulations** — Monte Carlo uses seeded PRNG (Park-Miller LCG) for consistent results

## Design System

- **Dark theme** — surface containers with cyan (#00f4fe), purple (#c97cff), and orange (#ff8c42) accents
- **SVG sidebar icons** — trophy (leaderboard), bar-chart (probability), sliders (simulator), scale (H2H), users (group picks), award (awards)
- **SVG award icons** — custom per-award with fill opacity for depth
- **SVG trophy** — inline stroke SVG for Champion labels (not emoji)
- **Tab vs filter distinction** — tabs use `font-semibold` + `border-b-2` underline; filters use smaller pill buttons (`text-xs h-7`)
- **"All" filters leftmost** — all pages with "All Rounds" or "All Brackets" show it first
- **Pick split colors** — orange (Team 1) + cyan (Team 2) across card view, bracket view, and heatmap
- **Heatmap spectrum** — cyan (correct) → orange (incorrect) with visible opacity levels
- **Column header tooltips** — native `title` attrs with `!cursor-pointer` for sortable, `!cursor-default` for static
- **Sticky table headers** — `sticky top-0` within scroll containers
- **Dotted underline** on sortable column header text as visual hint
- **Thin Lucide-style arrows** — stroke SVGs for all directional arrows (sort, navigation)
- **+/− icons** — for all inline expand/collapse toggles
- **Sidebar panel icon** — rect + vertical line for sidebar/drawer triggers
- **People group icon** — for bracket list triggers (champion distribution, games to watch)
- **No demoralizing language** — encouraging framing throughout

## ESPN Integration

- **Boxscore links** — on picks cards, bracket view, simulator, and H2H pages
- **Team logos** — ESPN logos with drop shadow
- **Full names** — authenticated API provides `member.fullName`

## Sorting

- **Window-style ranking** — ties share rank, next rank skips (SQL RANK, not DENSE_RANK)
- **Tiebreaking** — points DESC → max_remaining DESC → name ASC
- **Leaderboard** — sortable by rank, points, max, and all per-round columns; deep-linked sort order
- **Simulated Finishes** — sortable by Win%, 2nd%, 3rd%, Top 10, Top 25, median; deep-linked
- **Who's Still Alive** — sortable by rank, points, max remaining; deep-linked
- **Simulator Impact** — sortable by rank, change, points, sim points; deep-linked (hash)

## Awards (6 per round)

| Award | Description | Icon |
|-------|-------------|------|
| The Oracle | Most correct picks | All-seeing eye (cyan) |
| The Trendsetter | Most unique correct picks | Star (orange) |
| The Faithful | Highest scorer with champion alive | Shield (purple) |
| The Contrarian | Most correct picks against national consensus | Lightning bolt (orange) |
| Diamond in the Rough | Single best pick nobody else made | Gem (cyan) |
| The People's Champion | Most aligned with group consensus (plurality) | Crown (purple) |
