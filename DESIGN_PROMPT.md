# March Madness Bracket Analytics Dashboard — Design Prompt

## Context
Design a web dashboard for a March Madness bracket pool of 75 people (workplace group called "DoorDash AP 2026"). The app analyzes everyone's bracket picks, tracks live standings, and generates insights/visualizations throughout the NCAA Men's Basketball Tournament. Think "ESPN meets a Bloomberg terminal for bracket pools" — data-rich but fun and accessible.

**Design philosophy**: Everything is positive. Celebrate achievements, surface insights, make everyone feel good about participating. No negative framing — no "dead brackets", "graveyard", "worst picks", "underweight/overweight". Every metric is an opportunity, not a judgment.

## Brand & Aesthetic
- **Dark mode primary** with vibrant accent colors (sports analytics energy)
- Clean, modern, data-dense but not cluttered
- Color palette: dark navy/charcoal backgrounds (#0f1419, #1a1d23), bright accent colors for teams/charts (oranges, teals, purples, greens)
- Typography: Bold headlines, clean sans-serif body (Inter or similar)
- Cards with subtle borders/glows, generous spacing
- Responsive — works on desktop and mobile
- Tournament bracket energy: dynamic, competitive, exciting

## Design System (must be cohesive across ALL pages)
- **Consistent card style**: same border radius, shadow, padding across every page
- **Consistent spacing**: same section gaps, card gaps, content padding everywhere
- **Consistent header pattern**: every page has a page title + subtitle explaining what it does
- **Consistent stat cards**: same size, same typography, same icon style
- **Consistent table style**: same row height, hover state, sort indicators
- **Consistent chart style**: same axis labels, same tooltip design, same color palette for all charts
- **Consistent color meanings**: green = positive/alive, gold = achievement, blue = information, purple = probability
- **One font family**: Inter (or similar) at consistent sizes (32px hero, 24px section, 16px body, 14px caption)
- **One icon set**: consistent icon library throughout

## Global Navigation
- **Top navbar**: app name "DoorDash AP 2026 Bracket Lab", round indicator pill, "Last updated" timestamp, search to find a person
- **Left sidebar** (collapsible on mobile): page links with icons
- All pages share the same shell — nav never changes between pages

---

## Page 1: LEADERBOARD (Homepage)

The main standings page. Positive framing throughout — celebrate leaders, highlight momentum.

### Components:
1. **Hero stats bar** across the top (4 stat cards in a row):
   - Total brackets: 75
   - Games completed: X/63
   - Current round indicator
   - "Most popular champion still standing" (team logo + name)

2. **Leaderboard table** — each row shows:
   - Rank (with green up arrow or gray dash — no red down arrows)
   - Person's name + bracket name
   - **Archetype badge** (small colored pill: "Strategist", "Visionary", "Scout", "Original", "Analyst") — hover for explanation
   - Champion pick (team logo)
   - Current points
   - MAX remaining
   - Estimated win probability %
   - Champion status: small green dot if alive (no red indicators for eliminated — just absence of green)
   - Sortable by ALL columns

3. **"Rising Stars" section** below table: top 3 brackets that climbed the most ranks this round, shown as highlight cards

4. **"Still in contention" counter**: "X brackets can still mathematically win" — always positive framing

### Archetype badges shown inline (not a separate page):
- **The Strategist** (blue pill) — playing the odds, chalk-heavy
- **The Visionary** (purple pill) — bold picks, high ceiling
- **The Scout** (green pill) — believes in mid-majors and Cinderellas
- **The Original** (orange pill) — most unique bracket
- **The Analyst** (teal pill) — closest to expected-value optimal

---

## Page 2: GROUP PICKS ("What did we collectively predict?")

Clear purpose: For each game, see what the group picked and whether we were right. Framed as "we" — group identity.

### Components:
1. **Page header**: "Group Picks — See how our 75 brackets collectively predicted each game"

2. **Group accuracy hero stat**: "We got 25/32 first round games right (national avg: 22/32)" — framed as achievement

3. **Round selector tabs** (R64, R32, Sweet 16, Elite 8, Final Four, Championship)

4. **Game cards grid** — for each game in the selected round:
   - Team A logo + name + seed vs Team B logo + name + seed
   - Horizontal bar showing pick split (e.g., "62% of us picked Duke")
   - Bar colored by team colors
   - After game played: green "We called it!" badge if consensus correct, or "Surprise! Only 8 of us saw this coming" if upset (positive framing for the 8 who got it right)

5. **Bracket heatmap** (expandable section at bottom):
   - Full bracket view, all 63 games
   - Color intensity = how confident the group was (deep = unanimous, light = split)
   - Green overlay = consensus was correct
   - No red overlays — just reduced opacity for incorrect consensus

---

## Page 3: ALIVE BOARD ("Who still has a shot?")

Aggregate-focused with drill-down capability. Entirely about opportunity remaining.

### Components:
1. **Page header**: "Alive Board — Track which predictions are still in play"

2. **Aggregate counter cards** (large, clickable, in a row):
   - "X brackets still have their **champion** in the tournament" (click to see which)
   - "X brackets have **3+ Final Four** teams left" (click to see which)
   - "X brackets have **all Elite Eight** picks still possible" (click to see which)
   - "X brackets have **all Sweet Sixteen** picks still possible" (click to see which)

3. **Drill-down panel** (appears below when a counter is clicked):
   - List of brackets matching that criteria
   - Sorted by: total points (descending), then MAX remaining (descending)
   - Each row: rank, name, champion pick, points, MAX remaining
   - Filterable and searchable

4. **Champion distribution chart** (donut or treemap):
   - Each segment = a champion pick
   - Size = number of brackets with that pick
   - Vibrant colors for teams still alive, faded/translucent for eliminated teams (subtle, not harsh)

5. **"Games to Watch" widget**:
   - Upcoming matchups that affect the most brackets
   - "If [Team] wins, it keeps X brackets' champion dreams alive"
   - Helps the group know what to tune into together

---

## Page 4: SCENARIO SIMULATOR ("What happens if...?")

The killer interactive feature. Toggle outcomes, see impact.

### Components:
1. **Page header**: "Scenario Simulator — Toggle game outcomes and see how the standings shift"

2. **Upcoming games panel** (left side, ~40% width):
   - List of next round's matchups
   - Each game: two team pills, click either team to select as winner
   - Visual toggle state (selected team highlighted)
   - "Simulate" button

3. **Impact dashboard** (right side, ~60% width):
   - Simulated leaderboard with rank changes highlighted (green arrows for climbers)
   - "Biggest mover" highlight card
   - Win probability shifts: before → after comparison bars

4. **Quick scenario buttons** (above the games panel):
   - "All favorites win"
   - "All underdogs win"
   - "Maximum chaos"

5. **Volatility index** (below):
   - Horizontal bar for each upcoming game showing how much the leaderboard shifts
   - "This game matters most to the pool" highlight with star icon
   - Helps people know which games to care about

---

## Page 5: AWARDS ("Celebrate the best moves")

Auto-generated positive superlatives updated each round. All awards are achievements.

### Components:
1. **Page header**: "Tournament Awards — Celebrating the best bracket moves each round"

2. **Round selector** at top (toggle between rounds to see past winners)

3. **Award cards grid** (3 columns on desktop, 1 on mobile) — each card has:
   - Trophy/medal icon (gold, silver, bronze style)
   - Award name (bold)
   - Winner's name + bracket name
   - Stat/reason in one line
   - Subtle glow effect on card

4. **Award categories** (one card each):
   - **The Oracle** — most correct picks this round
   - **The Trendsetter** — most unique correct picks (picked winners nobody else had)
   - **The Strategist** — best return on bold picks (points from low-consensus correct picks)
   - **The Faithful** — highest scorer whose champion is still alive
   - **Hot Streak** — most consecutive correct picks across the tournament
   - **Diamond in the Rough** — single best pick that almost nobody else made and was correct
   - **The People's Champion** — most aligned with group consensus, representing collective wisdom
   - **Momentum Builder** — biggest rank climb this round
   - **One of a Kind** — most original bracket in the group (highest uniqueness score)

---

## Page 6: PROBABILITY ("What are my realistic chances?")

Simulation results explained in plain English.

### Components:
1. **Page header**: "Win Probability — We simulated the rest of the tournament 1,000 times to estimate everyone's chances"

2. **Explainer card** (at top, subtle background):
   - "How it works: Based on historical NCAA tournament data, we estimate the probability of each remaining game's outcome. We then run 1,000 simulated tournaments and count how often each bracket finishes first. This gives everyone an estimated chance of winning the pool."

3. **Win probability bar chart**:
   - All 75 brackets, horizontal bars
   - Sorted by probability (highest first)
   - Each bar color-coded by champion pick
   - Everyone gets a bar — even long shots have their small slice of hope

4. **Probability journey** line chart:
   - X-axis: round (R64, R32, S16, E8, FF, Champ)
   - Y-axis: win probability
   - One line per top 10 contenders
   - Shows momentum — who's rising, who's holding steady

5. **Expected finish table**:
   - Sortable table: name, current rank, estimated final rank (median), best possible finish, win probability %

---

## Page 7: HEAD-TO-HEAD ("Compare any two brackets")

### Components:
1. **Page header**: "Head-to-Head — Compare any two brackets side by side"

2. **Two person selector dropdowns** at top

3. **Agreement stat**: "You agree on X/63 picks" — large number, commonality emphasized

4. **Bracket diff view**:
   - Side-by-side mini brackets (or game list)
   - Matching picks = gray/muted
   - Different picks = highlighted in each person's color
   - Correct picks marked with small check

5. **Stats comparison cards** (side by side):
   - Points, rank, MAX remaining, uniqueness score, archetype badge
   - Radar/spider chart comparing both brackets across 5-6 dimensions

---

## Page 8: TOURNAMENT LENS ("How does our group think?")

Conference and seed analysis with clear explanations of how values are determined.

### Components:
1. **Page header**: "Tournament Lens — Discover our group's collective tendencies and beliefs"

2. **"How we pick by conference"** section:
   - Explainer: "This shows how many total advancing picks our 75 brackets gave to each conference's teams, compared to what historical seed performance would predict."
   - Horizontal bar chart: each conference gets a bar
   - Labels: "Group is high on the SEC" / "Group is cautious on the Big East" (no overweight/underweight language)
   - Tooltip on each bar explaining the calculation

3. **"How we pick by seed"** section:
   - Explainer: "This compares how far our group advances each seed line vs the 20-year NCAA tournament average."
   - Line chart: group's seed advancement rates vs historical averages
   - Callout insights: "Our group believes in 5-seeds more than history does" / "We're in line with history on 1-seeds"

4. **"Regional breakdown"** section:
   - 4 region panels
   - Each shows: total upset picks, average seed of region winner pick, most popular region champion
   - Info tooltip: "An upset pick is any game where you picked the higher-seeded team to win"

---

## Page 9: MADNESS METER ("How wild has this tournament been?")

Measures tournament excitement/unpredictability for our group.

### Components:
1. **Page header**: "Madness Meter — Measuring how unpredictable this tournament has been for our group"

2. **Excitement gauge** (large, central):
   - Animated gauge/dial from 0 to 100
   - 0 = "Perfectly Predictable" (chalk)
   - 50 = "Typical March Madness"
   - 100 = "Total Madness"
   - Current value prominently displayed
   - Subtitle: "A score of 73 means this tournament has been significantly more unpredictable than average — great news for bold bracket pickers"

3. **How it's calculated** (small info section):
   - "We measure each upset's magnitude (seed difference × round importance) and compare to historical tournaments"

4. **Round-by-round excitement trend** — line chart:
   - Shows excitement building (or calming) over the tournament
   - Each round labeled on X-axis

5. **Group resilience stat**:
   - "On average, X% of everyone's picks are still possible"
   - Framed positively as group resilience, not damage

6. **Key moments** cards:
   - Highlight the biggest surprises and Cinderella stories so far
   - Each card: team matchup, seed differential, "X of us called it!"

---

## Page 10: SEASON FINALE ("The full story" — unlocks after championship)

### Components:
1. **Page header**: "Season Finale — The complete story of DoorDash AP 2026"

2. **Final standings** with celebratory layout:
   - Top 3 shown with gold/silver/bronze treatment
   - Full sortable table below

3. **Awards ceremony**: all awards from every round, plus tournament-wide awards:
   - "Tournament MVP" — highest total score
   - "Best Round" — highest single-round score by anyone
   - "Most Consistent" — smallest variance between rounds
   - "Cinderella Spotter" — most correct upset picks
   - "One of a Kind" — most unique bracket that finished in top 10

4. **Insight vs Fortune scatter plot**:
   - X-axis: "Insight Score" — how often you were right when the group was split (tooltip: "measures your edge on contested games")
   - Y-axis: "Fortune Score" — how often your low-consensus picks were correct (tooltip: "measures how often unlikely calls went your way")
   - Each person = a labeled dot
   - Quadrants labeled: "Sharp & Lucky" (top right), "Sharp & Steady" (bottom right), "Bold & Lucky" (top left), "Going with the Flow" (bottom left) — all positive labels

5. **Greatest calls**: top 10 individual picks across the entire tournament (lowest consensus + correct)

6. **Perfect bracket comparison**: perfect bracket score vs everyone's actual — fun, aspirational, not shaming

7. **Group report card**: how the group consensus performed round by round vs the national average. "Our group finished in the Xth percentile nationally"

---

## Shared Components (reusable across ALL pages — must be identical)

- **Team pill**: small rounded badge with team logo + seed + name (consistent size everywhere)
- **Person row**: name + archetype badge + champion pick + points (same layout in every table)
- **Stat card**: big number + label + optional trend arrow (same dimensions on every page)
- **Round selector**: identical tab bar component used on every page that needs it
- **Search/filter bar**: same component on leaderboard, alive board, etc.
- **Chart tooltip**: identical tooltip design for ALL charts — same font, same background, same padding
- **Loading states**: consistent skeleton screens
- **Empty states**: consistent messaging when data isn't available yet
- **Info tooltips**: small (i) icon next to any metric that needs explanation — same style everywhere

---

## Interactions
- Hover effects on all data points (tooltips with detail)
- Click to drill into specifics (alive board counters, award cards, etc.)
- Smooth page transitions (consistent animation timing)
- Charts animate on load (same easing curve everywhere)
- All tables sortable by every column (same sort indicator style)
- Mobile: stack cards vertically, horizontal scroll for wide tables
- Sidebar collapses to hamburger on mobile

## Deliverables Needed
Design each page as a separate screen. Ensure:
1. Desktop view (1440px wide)
2. Mobile view (390px wide)
3. Dark mode (primary)
4. Hover/active states for interactive elements
5. **Visual consistency**: same card style, same spacing, same typography, same color usage across every single page
