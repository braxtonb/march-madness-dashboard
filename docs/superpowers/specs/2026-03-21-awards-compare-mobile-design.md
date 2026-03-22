# Awards Overhaul, Bracket Compare UX, and Mobile Responsiveness

**Date:** 2026-03-21
**Status:** Draft
**Build Order:** Mobile Responsiveness → Awards Overhaul → Bracket Compare UX

---

## 1. Mobile Responsiveness

### Breakpoints
Tailwind defaults: `sm` (640px), `md` (768px), `lg` (1024px). Primary target: phones (<640px).

### Global
- Sidebar: already collapses to hamburger — no changes needed
- All pages: `px-4` padding on mobile where tight
- Filter pills / round selectors: horizontal scroll (`overflow-x-auto`, hidden scrollbar) instead of wrapping
- All drawers/sidebars become full-width bottom sheets (slide up) on screens < 640px
- All clickable elements: minimum 44x44px tap area

### Per-Page Treatments

| Page | Current Issue | Mobile Solution |
|------|--------------|-----------------|
| **Leaderboard — Standings** | Wide table overflows | Stacked card layout: rank + name + points on top, champion pill below, expandable per-round breakdown. Sort via dropdown instead of column headers |
| **Leaderboard — Picking Style** | Scatter chart too small | Full-width chart, reduce padding. Pinch-to-zoom works with Chart.js |
| **Leaderboard — Best Calls** | 3-column grid | Single column stack |
| **Probability — Championship Chances** | Already card-based | Ensure padding, no major changes |
| **Probability — Simulated Finishes** | Wide table | Horizontal scroll with sticky first column (bracket name) |
| **Probability — Who's Still Alive** | Table + drill-down | Card stack, drill-down drawer goes full-width |
| **Simulator** | Bracket grid too wide | Single-column stacked matchups per round, collapsible rounds already exist |
| **Head-to-Head** | 3-column comparison grid | Stack vertically: Bracket A pick → game result → Bracket B pick |
| **Group Picks** | Drawer issue on mobile | Drawer becomes full-screen bottom sheet |
| **Awards** | Card grid | Single column, sidebar becomes bottom sheet |

---

## 2. Awards Overhaul

### 2a. Detail Sidebar

Award cards become clickable. On click, a sidebar opens (reuses PicksDrawer pattern — React portal, fixed overlay, slide from right; bottom sheet on mobile).

| Award | Sidebar Content |
|-------|----------------|
| **The Oracle** | List of all games in the round showing winner's picks (correct = green check, wrong = red x). "X of Y correct" summary at top |
| **The Trendsetter** | Only the unique correct picks (pick rate < 30%), each showing team picked, seed, and pick rate (e.g., "Only 12% picked this") |
| **The Faithful** | Current rank, points, champion pick with alive status, remaining point value of champion path. Note: The Faithful requires `champion_alive === true` — the computation must cross-reference teams data to verify the champion is not eliminated. If no bracket qualifies (all champions eliminated), the award shows "No winner — all champions eliminated" |
| **Hot Streak** | Ordered list of consecutive correct games in the streak — game matchup + round for each |
| **Diamond in the Rough** | The specific pick: game matchup, contrarian team, pick rate, bar showing how few others picked it |
| **The People's Champion** | All games in the round, each showing the plurality pick (team picked by the most brackets) and whether the winner's pick matched it. Games where the winner picked the plurality are highlighted in accent color. In "All Rounds" view, games are grouped by round with round headers |

### 2b. Multiple Winners

When ties occur, all qualifying brackets are listed on the award card. The card shows "X-way tie" and lists each winner's bracket name.

**New Award type shape:**
```typescript
interface Award {
  title: string;
  description: string;
  icon: string;
  tier: "gold" | "silver" | "bronze";
  winners: Array<{
    name: string;        // bracket name
    bracketName: string; // owner username
    bracketId: string;   // for sidebar data lookup
    stat: string;        // contextual stat (e.g., "8 of 8 correct")
    championPick: string;
    championSeed: number;
    championEliminated: boolean;
  }>;
  // sidebarData computed client-side from picks/games data + winners[].bracketId
}
```

`AwardCard` renders the first winner prominently. If `winners.length > 1`, shows "X-way tie" label and lists additional winners below. Sidebar receives the full `winners` array and shows prev/next navigation when multiple winners exist.

Diamond in the Rough follows the same tie handling — if two brackets both made the same lowest-pick-rate correct pick, both are listed.

### 2c. Global "All Rounds" Variant

Add "All Rounds" as the last option in the existing round selector.

**Type change:** Define `type AwardRound = Round | "ALL"`. Thread through `AwardsClient` (selected round state), `computeAwards` (round parameter), `awardsByRound` (key type becomes `AwardRound`), and `RoundSelector` (options list). The URL param `?round=ALL` is valid for deep linking.

| Award | Global Behavior |
|-------|----------------|
| The Oracle | Most correct picks across all completed games |
| The Trendsetter | Most unique correct picks (pick rate < 30%) across all rounds |
| Hot Streak | Longest consecutive correct streak across round boundaries. **Ordering rule:** picks sorted by round (R64→CHAMP), then by `game_id` within round. This requires an explicit sort step not present in per-round logic |
| The People's Champion | Most plurality-aligned picks across all completed games |
| Diamond in the Rough | Single lowest pick-rate correct pick across all completed games |
| The Faithful | Highest scorer with champion still alive (same as per-round — inherently global) |

### 2d. Award Scoping

Awards remain at 6 total (no new awards):
1. The Oracle (per-round + global)
2. The Trendsetter (per-round + global)
3. The Faithful (per-round + global)
4. Hot Streak (per-round + global)
5. Diamond in the Rough (per-round + global)
6. The People's Champion (per-round + global)

All awards available in both per-round and "All Rounds" views.

---

## 3. Bracket Compare UX

### Selection Mechanism

Each table row representing a bracket gets a subtle circular checkbox on the left. States:
- **Default:** empty circle, faint border
- **Hover:** slight fill hint
- **Selected:** filled cyan with checkmark, row gets subtle left-border highlight

### Interaction Flow

1. Click checkbox → bracket selected, compare bar slides up from bottom
2. **1 selected:** bar shows bracket name + "Select one more to compare" + X to deselect
3. **2 selected:** "Compare" button activates, links to `/head-to-head?b1=<id>&b2=<id>`
4. **3rd click:** FIFO — deselects oldest, adds new one
5. X on each name in bar to deselect individually

### State Management

React context (`CompareProvider`) wrapping app layout. Stores up to 2 bracket IDs. Persists across page navigation within the session. No URL params for compare state — only the final head-to-head link uses params.

**Back-navigation note:** After navigating to `/head-to-head`, the compare context clears. If the user presses browser back, the compare bar will be empty. This is intentional — the head-to-head page is the destination, not a round-trip.

### Where Checkboxes Appear

- Leaderboard standings table
- Simulated Finishes table
- Who's Still Alive drilldown table
- Championship Chances tier cards — checkbox appears inline before each bracket name within the tier list
- Simulator impact table
- Group Picks drawer — "Select for compare" button next to bracket name when viewing individual picks

### Floating Compare Bar

- Fixed bottom, full-width, glassmorphism style matching navbar
- Height: ~56px desktop, ~64px mobile
- Bracket names as pills (cyan border, X to remove)
- "Compare" button right-aligned — disabled when 1 selected, cyan accent when 2
- Slides away when no brackets selected
- **z-index:** `z-40`. Bottom sheets/drawers use `z-50`+. The compare bar is hidden behind any open drawer/sheet overlay — no conflict.
- On mobile: same pattern, larger touch targets

### Head-to-Head Integration

When arriving at `/head-to-head` via compare bar, dropdowns pre-populate with selected brackets. Compare context clears after navigation.

---

## Technical Notes

- Mobile bottom sheets and award sidebar both use React portal pattern (existing in PicksDrawer)
- **z-index hierarchy:** compare bar (`z-40`) < bottom sheets/drawers (`z-50`) < drawer backdrop (`z-[9998]`) < drawer panel (`z-[9999]`). Compare bar is fully occluded when any overlay is open.
- CompareProvider context is new — wraps root layout
- Award computation happens in `page.tsx` server component; sidebar data derivation happens client-side from the same picks/games data passed as props
- "All Rounds" computation is a superset of per-round logic — skip the round filter on games/picks.

### Threading: `Award` interface refactor (winners array)

The `Award` interface changes from flat (`winner: string, bracketName: string`) to array-based (`winners: Array<{...}>`). Files that must be updated:

1. **`src/components/ui/AwardsClient.tsx`** — replace `Award` interface definition (lines 10-20) with new shape
2. **`src/components/ui/AwardCard.tsx`** — update props to accept `winners` array, render first winner prominently + "X-way tie" when `winners.length > 1`
3. **`src/app/awards/page.tsx`** — update `computeAwards` return type and all six award push statements to produce `winners: [...]` arrays instead of flat `winner`/`bracketName`
4. **`src/app/awards/page.tsx`** — `computeAwards` signature must also accept `teams: Team[]` (or `eliminatedTeams: Set<string>`) so The Faithful can enforce `champion_alive === true`

### Threading: `AwardRound` type

`type AwardRound = Round | "ALL"` threads through these files:

1. **`src/lib/types.ts`** — define `AwardRound` type
2. **`src/components/ui/AwardsClient.tsx`** — change `selectedRound` state from `Round` to `AwardRound`; update the URL param validation guard from `ROUND_ORDER.includes(paramRound)` to `ROUND_ORDER.includes(paramRound) || paramRound === "ALL"`
3. **`src/app/awards/page.tsx`** — `awardsByRound` key type becomes `Record<string, Award[]>` with `"ALL"` key; `computeAwards` round parameter accepts `AwardRound`
4. **`src/components/ui/RoundSelector.tsx`** — add optional `extraOptions` prop for the "All Rounds" entry

### Hot Streak ordering

For cross-round streak computation ("All Rounds" mode): picks must be sorted by round (R64→CHAMP using `ROUND_ORDER` index), then by `game_id` within round. `game_id` values from the ESPN API are numeric strings (e.g., "401638401") and are lexicographically sortable as-is. Verify this assumption during implementation by inspecting `public/data.json` game IDs.

### Other notes

- Multiple winners: `Award.winners` is always an array (length 1 for solo winners). `AwardCard` and sidebar handle both cases.
- `RoundSelector` accepts an optional `extraOptions` prop for the "All Rounds" entry.
