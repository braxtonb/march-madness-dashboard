# Plan 4: Mobile Responsiveness, Awards Overhaul, Bracket Compare UX

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all 6 pages mobile-responsive, overhaul the awards page with detail sidebars / multiple winners / global "All Rounds" variant, and add bracket comparison from any table view.

**Architecture:** Mobile-first responsive layouts using Tailwind breakpoints. Awards refactored to array-based winners with clickable detail sidebars reusing the PicksDrawer portal pattern. Bracket comparison via React context (CompareProvider) wrapping root layout with a floating compare bar that deep links to head-to-head.

**Tech Stack:** Next.js 14, React 18, Tailwind CSS 3.4, Chart.js (scatter), no test framework (verify via `npm run build` + visual checks)

**Spec:** `docs/superpowers/specs/2026-03-21-awards-compare-mobile-design.md`

---

## File Structure

### New Files
- `src/components/ui/BottomSheet.tsx` — reusable mobile bottom sheet (extracted from PicksDrawer pattern)
- `src/components/ui/AwardDetailSidebar.tsx` — award detail sidebar with per-award content
- `src/components/ui/CompareProvider.tsx` — React context for bracket comparison state
- `src/components/ui/CompareCheckbox.tsx` — circular checkbox for bracket rows
- `src/components/ui/CompareBar.tsx` — floating bottom compare bar
- `src/components/ui/MobileSortDropdown.tsx` — sort dropdown replacing column headers on mobile
- `src/components/ui/MobileCard.tsx` — stacked card layout for leaderboard rows on mobile

### Modified Files
- `src/lib/types.ts` — add `AwardRound` type, update `Award` interface
- `src/lib/constants.ts` — add `AWARD_ROUND_LABELS` entry for "ALL"
- `src/app/layout.tsx` — wrap with CompareProvider
- `src/app/awards/page.tsx` — refactor computeAwards for winners array, teams param, "ALL" round
- `src/components/ui/AwardsClient.tsx` — AwardRound state, "All Rounds" selector, sidebar open state
- `src/components/ui/AwardCard.tsx` — multiple winners display, clickable for sidebar
- `src/components/ui/RoundSelector.tsx` — extraOptions prop for "All Rounds"
- `src/components/ui/GameCard.tsx` — extract BottomSheet, mobile bottom sheet variant
- `src/app/LeaderboardContent.tsx` — mobile card view, sort dropdown
- `src/components/tables/LeaderboardTable.tsx` — compare checkboxes, responsive hiding
- `src/components/ProbabilityClient.tsx` — compare checkboxes on all tabs, mobile layouts
- `src/app/simulator/page.tsx` — compare checkboxes on impact table, mobile stacking
- `src/app/head-to-head/HeadToHeadContent.tsx` — pre-populate from URL params, mobile vertical stack
- `src/app/picks/PicksContent.tsx` — compare button in drawer
- `src/app/globals.css` — bottom sheet animation, compare bar transitions, mobile utilities

---

## Phase 1: Mobile Responsiveness

### Task 1: Global Mobile Foundations

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/components/ui/BottomSheet.tsx`
- Modify: `src/components/ui/GameCard.tsx`

- [ ] **Step 1: Add bottom sheet animation to globals.css**

In `src/app/globals.css`, add after the existing `@keyframes drawer-slide-in`:

```css
@keyframes bottom-sheet-slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.bottom-sheet-enter {
  animation: bottom-sheet-slide-up 0.3s ease-out forwards;
}

/* Hide scrollbar for filter pill horizontal scroll */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
```

- [ ] **Step 2: Create reusable BottomSheet component**

Create `src/components/ui/BottomSheet.tsx`. This extracts the portal/overlay/close pattern from PicksDrawer but renders as a bottom sheet on mobile, right-slide drawer on desktop:

```tsx
"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onPrev?: () => void;
  onNext?: () => void;
}

export default function BottomSheet({ open, onClose, title, children, onPrev, onNext }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", handleKey); };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {/* Desktop: right-slide drawer */}
      <div
        ref={sheetRef}
        className="
          absolute bg-surface-container border-l border-outline-variant
          sm:right-0 sm:top-0 sm:h-full sm:w-full sm:max-w-md sm:animate-[drawer-slide-in_0.3s_ease-out]
          max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:max-h-[85vh] max-sm:rounded-t-2xl max-sm:bottom-sheet-enter
          flex flex-col overflow-hidden
        "
      >
        {/* Drag handle on mobile */}
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-outline-variant" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant sticky top-0 bg-surface-container z-10">
          <div className="flex items-center gap-2">
            {onPrev && <button onClick={onPrev} className="p-1.5 hover:bg-surface-bright rounded-lg text-on-surface-variant">←</button>}
            <h3 className="text-on-surface font-display font-semibold text-lg truncate">{title}</h3>
            {onNext && <button onClick={onNext} className="p-1.5 hover:bg-surface-bright rounded-lg text-on-surface-variant">→</button>}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-bright rounded-lg text-on-surface-variant min-w-[44px] min-h-[44px] flex items-center justify-center">✕</button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
```

- [ ] **Step 3: Migrate PicksDrawer in GameCard to use BottomSheet**

In `src/components/ui/GameCard.tsx`, replace the inline PicksDrawer portal with:

```tsx
import BottomSheet from "./BottomSheet";
// Inside PicksDrawer component, replace the portal JSX with:
<BottomSheet open={true} onClose={onClose} title={`${game.team1} vs ${game.team2}`} onPrev={onPrev} onNext={onNext}>
  {/* existing picks content */}
</BottomSheet>
```

Keep the existing PicksDrawer wrapper function but gut its rendering to delegate to BottomSheet.

- [ ] **Step 4: Make filter pills horizontally scrollable**

In every component that renders filter pills (RoundSelector, status filters, tab selectors), wrap the pill container with:

```tsx
<div className="overflow-x-auto no-scrollbar">
  <div className="flex gap-2 min-w-max">
    {/* pills */}
  </div>
</div>
```

Apply to: `RoundSelector.tsx`, `AwardsClient.tsx`, `LeaderboardContent.tsx` (tab buttons), `ProbabilityClient.tsx` (tab buttons), `PicksContent.tsx` (status filters).

- [ ] **Step 5: Verify build and commit**

```bash
npm run build
git add -A && git commit -m "feat: add BottomSheet component, mobile animations, scrollable filter pills"
```

---

### Task 2: Leaderboard Mobile Layout

**Files:**
- Create: `src/components/ui/MobileCard.tsx`
- Create: `src/components/ui/MobileSortDropdown.tsx`
- Modify: `src/components/tables/LeaderboardTable.tsx`
- Modify: `src/app/LeaderboardContent.tsx`

- [ ] **Step 1: Create MobileSortDropdown**

Create `src/components/ui/MobileSortDropdown.tsx`:

```tsx
"use client";

interface SortOption {
  key: string;
  label: string;
}

interface MobileSortDropdownProps {
  options: SortOption[];
  value: string;
  onChange: (key: string) => void;
}

export default function MobileSortDropdown({ options, value, onChange }: MobileSortDropdownProps) {
  return (
    <div className="sm:hidden mb-3">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2.5 text-on-surface text-sm min-h-[44px]"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 2: Create MobileCard for leaderboard rows**

Create `src/components/ui/MobileCard.tsx`:

```tsx
"use client";
import TeamPill from "./TeamPill";
import type { Bracket, Team } from "@/lib/types";

interface MobileCardProps {
  bracket: Bracket;
  teams: Team[];
  rank: number;
  expanded: boolean;
  onToggle: () => void;
  roundPoints?: { round: string; pts: number }[];
}

export default function MobileCard({ bracket, teams, rank, expanded, onToggle, roundPoints }: MobileCardProps) {
  const team = teams.find((t) => t.name === bracket.champion_pick);
  const isEliminated = team?.eliminated;

  return (
    <div
      className="bg-surface-container rounded-card border border-outline-variant p-3 cursor-pointer hover:bg-surface-bright transition-colors"
      onClick={onToggle}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-on-surface-variant text-sm font-mono w-6 text-right shrink-0">#{rank}</span>
          <div className="min-w-0">
            <div className="text-on-surface font-semibold truncate">{bracket.name}</div>
            {bracket.owner !== bracket.name && (
              <div className="text-on-surface-variant text-xs truncate">{bracket.owner}</div>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-on-surface font-mono font-semibold">{bracket.points}</div>
          <div className="text-on-surface-variant text-xs">max {bracket.max_remaining + bracket.points}</div>
        </div>
      </div>
      <div className="mt-2">
        {team && <TeamPill name={bracket.champion_pick} seed={bracket.champion_seed} logo={team.logo} eliminated={isEliminated} />}
      </div>
      {expanded && roundPoints && (
        <div className="mt-3 pt-3 border-t border-outline-variant grid grid-cols-3 gap-2 text-xs">
          {roundPoints.map((rp) => (
            <div key={rp.round} className="text-center">
              <div className="text-on-surface-variant">{rp.round}</div>
              <div className="text-on-surface font-mono">{rp.pts}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add mobile view toggle to LeaderboardTable**

In `src/components/tables/LeaderboardTable.tsx`, wrap the existing `<table>` with `hidden sm:block` and add a mobile card list:

```tsx
{/* Mobile card view */}
<div className="sm:hidden space-y-2">
  <MobileSortDropdown
    options={[
      { key: "points", label: "Sort by Points" },
      { key: "max", label: "Sort by Max Possible" },
      { key: "rank", label: "Sort by Rank" },
    ]}
    value={sortKey}
    onChange={setSortKey}
  />
  {sortedBrackets.map((b, i) => (
    <MobileCard
      key={b.id}
      bracket={b}
      teams={teams}
      rank={i + 1}
      expanded={expandedId === b.id}
      onToggle={() => setExpandedId(expandedId === b.id ? null : b.id)}
      roundPoints={[
        { round: "R64", pts: b.r64_pts },
        { round: "R32", pts: b.r32_pts },
        { round: "S16", pts: b.s16_pts },
        { round: "E8", pts: b.e8_pts },
        { round: "FF", pts: b.ff_pts },
        { round: "CHAMP", pts: b.champ_pts },
      ]}
    />
  ))}
</div>
{/* Desktop table */}
<div className="hidden sm:block">
  {/* existing <table> content */}
</div>
```

- [ ] **Step 4: Make Best Calls single-column on mobile**

In `src/app/LeaderboardContent.tsx`, find the Best Calls grid and change from `grid-cols-3` to responsive:

```tsx
// Change from:
grid-cols-3
// To:
grid-cols-1 sm:grid-cols-3
```

- [ ] **Step 5: Ensure scatter chart is full-width on mobile**

In `src/app/LeaderboardContent.tsx`, the Picking Style scatter chart container — ensure it has no horizontal padding constraints on mobile. Add `w-full` to the chart wrapper.

- [ ] **Step 6: Verify build and commit**

```bash
npm run build
git add -A && git commit -m "feat: mobile leaderboard with stacked cards, sort dropdown, responsive grids"
```

---

### Task 3: Probability Pages Mobile

**Files:**
- Modify: `src/components/ProbabilityClient.tsx`

- [ ] **Step 1: Simulated Finishes table — sticky first column with horizontal scroll**

Wrap the Simulated Finishes table in:

```tsx
<div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
  <table className="min-w-[700px] w-full">
    {/* existing content, but add to the first <td> and <th> in each row: */}
    {/* className="sticky left-0 bg-surface-container z-10" */}
  </table>
</div>
```

- [ ] **Step 2: Who's Still Alive drilldown — card stack on mobile**

For the drilldown table, add a mobile card variant similar to Task 2's MobileCard pattern — show bracket name, points, max remaining in a stacked card, hide the full table on mobile.

- [ ] **Step 3: Championship Chances — ensure tier cards have proper mobile padding**

Add `px-4 sm:px-0` to the tier container and ensure bracket names within tiers wrap properly with `break-words`.

- [ ] **Step 4: Verify build and commit**

```bash
npm run build
git add -A && git commit -m "feat: mobile probability pages — scrollable tables, card stacks, tier padding"
```

---

### Task 4: Simulator, Head-to-Head, Group Picks, Awards Mobile

**Files:**
- Modify: `src/app/simulator/page.tsx`
- Modify: `src/app/head-to-head/HeadToHeadContent.tsx`
- Modify: `src/app/picks/PicksContent.tsx`
- Modify: `src/components/ui/AwardsClient.tsx`

- [ ] **Step 1: Simulator — stack bracket picker and impact table vertically on mobile**

The simulator currently has a side-by-side layout (bracket picker + impact table). On mobile, stack them:

```tsx
// Change the main layout container from flex-row to:
<div className="flex flex-col lg:flex-row gap-6">
  {/* bracket picker */}
  {/* impact table */}
</div>
```

Make matchup cards single-column on mobile. The impact table should use horizontal scroll with sticky first column, same pattern as Simulated Finishes.

- [ ] **Step 2: Head-to-Head — vertical stack on mobile**

In `HeadToHeadContent.tsx`, the 3-column comparison grid (Bracket A | Game | Bracket B) becomes a vertical stack on mobile:

```tsx
// For each game comparison row, change from side-by-side to:
<div className="flex flex-col sm:flex-row sm:items-center gap-2">
  <div className="sm:flex-1">{/* Bracket A pick */}</div>
  <div className="sm:w-auto">{/* Game result center */}</div>
  <div className="sm:flex-1">{/* Bracket B pick */}</div>
</div>
```

Also make the bracket selector dropdowns full-width on mobile.

- [ ] **Step 3: Group Picks — drawer becomes bottom sheet (already handled by BottomSheet migration)**

Verify the PicksDrawer migration from Task 1 works correctly on the picks page. The drawer should render as bottom sheet on mobile automatically.

- [ ] **Step 4: Awards — single column on mobile**

In `AwardsClient.tsx`, change the awards card grid from multi-column to:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
```

- [ ] **Step 5: Verify all pages on mobile, build and commit**

```bash
npm run build
git add -A && git commit -m "feat: mobile layouts for simulator, head-to-head, group picks, awards"
```

---

## Phase 2: Awards Overhaul

### Task 5: Award Type System Changes

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/constants.ts`

- [ ] **Step 1: Add AwardRound type and Award interface to types.ts**

In `src/lib/types.ts`, add after the `Round` type:

```typescript
export type AwardRound = Round | "ALL";

export interface AwardWinner {
  name: string;
  bracketName: string;
  bracketId: string;
  stat: string;
  championPick: string;
  championSeed: number;
  championEliminated: boolean;
}

export interface Award {
  title: string;
  description: string;
  icon: string;
  tier: "gold" | "silver" | "bronze";
  winners: AwardWinner[];
}
```

- [ ] **Step 2: Add "All Rounds" to constants**

In `src/lib/constants.ts`, add:

```typescript
export const AWARD_ROUND_LABELS: Record<string, string> = {
  ...ROUND_LABELS,
  ALL: "All Rounds",
};
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts src/lib/constants.ts
git commit -m "feat: add AwardRound type, Award interface with winners array"
```

---

### Task 6: Refactor computeAwards for Multiple Winners + All Rounds

**Files:**
- Modify: `src/app/awards/page.tsx`

- [ ] **Step 1: Update computeAwards signature**

Change the function signature to accept teams and AwardRound:

```typescript
import type { Award, AwardRound, AwardWinner, BracketAnalytics, Pick, Game, Team, Round } from "@/lib/types";

function computeAwards(
  brackets: Bracket[],
  picks: Pick[],
  games: Game[],
  teams: Team[],
  round: AwardRound,
  totalBrackets: number
): Award[]
```

- [ ] **Step 2: Update game/pick filtering for "ALL" round**

At the top of computeAwards, change the round filter:

```typescript
const roundGames = round === "ALL"
  ? games.filter((g) => g.completed)
  : games.filter((g) => g.round === round && g.completed);
const roundGameIds = new Set(roundGames.map((g) => g.game_id));
const roundPicks = picks.filter((p) => roundGameIds.has(p.game_id));
```

- [ ] **Step 3: Refactor each award to return winners array**

For each of the 6 awards, change from pushing a single winner to collecting all tied winners. Example for The Oracle:

```typescript
// The Oracle — most correct picks
const correctCounts = new Map<string, number>();
for (const b of brackets) {
  const bPicks = roundPicks.filter((p) => p.bracket_id === b.id);
  const correct = bPicks.filter((p) => p.correct).length;
  correctCounts.set(b.id, correct);
}
const maxCorrect = Math.max(...correctCounts.values(), 0);
if (maxCorrect > 0) {
  const oracleWinners: AwardWinner[] = brackets
    .filter((b) => correctCounts.get(b.id) === maxCorrect)
    .map((b) => ({
      name: b.name,
      bracketName: b.owner,
      bracketId: b.id,
      stat: `${maxCorrect} of ${roundGames.length} correct`,
      championPick: b.champion_pick,
      championSeed: b.champion_seed,
      championEliminated: teams.find((t) => t.name === b.champion_pick)?.eliminated ?? false,
    }));
  awards.push({ title: "The Oracle", description: "Most correct picks", icon: "oracle", tier: "gold", winners: oracleWinners });
}
```

Apply the same pattern to all 6 awards: collect all brackets that tie for the max value, map to AwardWinner[].

**The Faithful specifically**: filter by `champion_alive`:

```typescript
const eliminatedTeams = new Set(teams.filter((t) => t.eliminated).map((t) => t.name));
const faithfulCandidates = brackets
  .filter((b) => b.champion_pick && !eliminatedTeams.has(b.champion_pick))
  .sort((a, b) => b.points - a.points);
```

If no candidates (all champions eliminated), push an award with empty winners array and description "No winner — all champions eliminated" (distinct from the generic "No winner yet" used for future rounds).

**Hot Streak for "ALL" round**: sort picks by round order then game_id before computing streak:

```typescript
import { ROUND_ORDER } from "@/lib/constants";
if (round === "ALL") {
  bPicks.sort((a, b) => {
    const ri = ROUND_ORDER.indexOf(a.round as Round) - ROUND_ORDER.indexOf(b.round as Round);
    if (ri !== 0) return ri;
    return a.game_id.localeCompare(b.game_id);
  });
}
```

- [ ] **Step 4: Update the page component to pass teams and compute "ALL" awards**

In the server component, compute awards for each round AND for "ALL":

```typescript
const awardsByRound: Record<string, Award[]> = {};
for (const round of ROUND_ORDER) {
  awardsByRound[round] = computeAwards(data.brackets, data.picks, data.games, data.teams, round, data.brackets.length);
}
awardsByRound["ALL"] = computeAwards(data.brackets, data.picks, data.games, data.teams, "ALL", data.brackets.length);
```

Pass `awardsByRound` to AwardsClient (already does this, just ensure the key type is `string`).

- [ ] **Step 5: Verify build and commit**

```bash
npm run build
git add src/app/awards/page.tsx
git commit -m "feat: refactor computeAwards — multiple winners, teams param, All Rounds support"
```

---

### Task 7: Update AwardsClient + RoundSelector for "All Rounds"

**Files:**
- Modify: `src/components/ui/AwardsClient.tsx`
- Modify: `src/components/ui/RoundSelector.tsx`

- [ ] **Step 1: Add extraOptions prop to RoundSelector**

In `src/components/ui/RoundSelector.tsx`, add an optional prop:

```typescript
interface RoundSelectorProps {
  selected: string;
  onSelect: (round: string) => void;
  labels?: Record<string, string>;           // optional override, defaults to ROUND_LABELS
  extraOptions?: { value: string; label: string }[];  // appended after round pills with separator
}
```

Keep `rounds` derived internally from `ROUND_ORDER` (existing behavior). Do not add a `rounds` prop — existing callers only pass `selected` and `onSelect`.

Render `extraOptions` after the round buttons, with a visual separator (thin vertical line or slightly different styling).

- [ ] **Step 2: Update AwardsClient for AwardRound**

In `src/components/ui/AwardsClient.tsx`:

- **Remove** the local `Award` interface definition (lines 10-20 of AwardsClient.tsx) — import `Award` from `@/lib/types` instead
- **Remove** the `emptyAward()` helper function if it exists — awards with no winner now use `winners: []` in the array returned by `computeAwards`
- Change `selectedRound` state to `string` (covers both Round and "ALL")
- Update URL param validation:

```typescript
const validRounds = [...ROUND_ORDER, "ALL"];
const paramRound = searchParams.get("round");
const selectedRound = paramRound && validRounds.includes(paramRound) ? paramRound : currentRound;
```

- Pass `extraOptions={[{ value: "ALL", label: "All Rounds" }]}` to RoundSelector
- Add state for sidebar: `const [selectedAward, setSelectedAward] = useState<Award | null>(null);`

- [ ] **Step 3: Verify build and commit**

```bash
npm run build
git add src/components/ui/AwardsClient.tsx src/components/ui/RoundSelector.tsx
git commit -m "feat: AwardsClient supports AwardRound, RoundSelector gets extraOptions"
```

---

### Task 8: Update AwardCard for Multiple Winners

**Files:**
- Modify: `src/components/ui/AwardCard.tsx`

- [ ] **Step 1: Update AwardCard props and rendering**

Replace the current single-winner rendering with:

```tsx
import type { Award } from "@/lib/types";

interface AwardCardProps {
  award: Award;
  onClick?: () => void;
}

export function AwardCard({ award, onClick }: AwardCardProps) {  // named export, matches existing import style
  const primary = award.winners[0];
  const isTie = award.winners.length > 1;

  return (
    <div
      className="bg-surface-container rounded-card border border-outline-variant p-4 cursor-pointer hover:bg-surface-bright transition-colors group"
      onClick={onClick}
    >
      {/* Icon + tier */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{AWARD_ICONS[award.icon] ?? award.icon}</span>
        <span className={`text-xs uppercase tracking-wider ${tierColor(award.tier)}`}>{award.tier}</span>
      </div>

      {/* Title + description */}
      <h3 className="text-on-surface font-display font-semibold">{award.title}</h3>
      <p className="text-on-surface-variant text-sm mb-3">{AWARD_DESCRIPTIONS[award.title] ?? award.description}</p>

      {/* Winner(s) */}
      {primary ? (
        <>
          {isTie && (
            <div className="text-xs text-tertiary mb-1">{award.winners.length}-way tie</div>
          )}
          <div className="space-y-1.5">
            {award.winners.map((w) => (
              <div key={w.bracketId} className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-on-surface font-semibold truncate">{w.name}</div>
                  {w.bracketName !== w.name && (
                    <div className="text-on-surface-variant text-xs truncate">{w.bracketName}</div>
                  )}
                </div>
                <div className="text-on-surface-variant text-xs shrink-0 ml-2">{w.stat}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-on-surface-variant text-sm italic">No winner yet</div>
      )}

      {/* Click hint */}
      {primary && (
        <div className="mt-3 text-xs text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
          Click for details →
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build and commit**

```bash
npm run build
git add src/components/ui/AwardCard.tsx
git commit -m "feat: AwardCard supports multiple winners with tie display"
```

---

### Task 9: Award Detail Sidebar

**Files:**
- Create: `src/components/ui/AwardDetailSidebar.tsx`
- Modify: `src/components/ui/AwardsClient.tsx`

- [ ] **Step 1: Create AwardDetailSidebar component**

Create `src/components/ui/AwardDetailSidebar.tsx`:

```tsx
"use client";
import { useState } from "react";
import BottomSheet from "./BottomSheet";
import TeamPill from "./TeamPill";
import GameHeader from "./GameHeader";
import type { Award, AwardWinner, Pick, Game, Team, Bracket } from "@/lib/types";

interface AwardDetailSidebarProps {
  award: Award;
  open: boolean;
  onClose: () => void;
  picks: Pick[];
  games: Game[];
  teams: Team[];
  brackets: Bracket[];
  pickRates: Record<string, Record<string, number>>; // serialized from Map for server/client boundary
}

export default function AwardDetailSidebar({ award, open, onClose, picks, games, teams, brackets, pickRates }: AwardDetailSidebarProps) {
  const [winnerIdx, setWinnerIdx] = useState(0);
  const winner = award.winners[winnerIdx];
  if (!winner) return null;

  const hasPrev = winnerIdx > 0;
  const hasNext = winnerIdx < award.winners.length - 1;

  const title = award.winners.length > 1
    ? `${award.title} — ${winner.name} (${winnerIdx + 1}/${award.winners.length})`
    : `${award.title} — ${winner.name}`;

  return (
    <BottomSheet
      open={open}
      onClose={() => { onClose(); setWinnerIdx(0); }}
      title={title}
      onPrev={hasPrev ? () => setWinnerIdx(winnerIdx - 1) : undefined}
      onNext={hasNext ? () => setWinnerIdx(winnerIdx + 1) : undefined}
    >
      <div className="text-sm text-on-surface-variant mb-4">{winner.stat}</div>
      <AwardContent
        awardTitle={award.title}
        winner={winner}
        picks={picks}
        games={games}
        teams={teams}
        brackets={brackets}
        pickRates={pickRates}
      />
    </BottomSheet>
  );
}

function AwardContent({ awardTitle, winner, picks, games, teams, brackets, pickRates }: {
  awardTitle: string;
  winner: AwardWinner;
  picks: Pick[];
  games: Game[];
  teams: Team[];
  brackets: Bracket[];
  pickRates: Record<string, Record<string, number>>;
}) {
  const winnerPicks = picks.filter((p) => p.bracket_id === winner.bracketId);

  switch (awardTitle) {
    case "The Oracle":
      return <OracleContent winnerPicks={winnerPicks} games={games} teams={teams} />;
    case "The Trendsetter":
      return <TrendsetterContent winnerPicks={winnerPicks} games={games} teams={teams} pickRates={pickRates} />;
    case "The Faithful":
      return <FaithfulContent winner={winner} teams={teams} brackets={brackets} />;
    case "Hot Streak":
      return <HotStreakContent winnerPicks={winnerPicks} games={games} teams={teams} />;
    case "Diamond in the Rough":
      return <DiamondContent winnerPicks={winnerPicks} games={games} teams={teams} pickRates={pickRates} />;
    case "The People's Champion":
      return <PeoplesChampionContent winnerPicks={winnerPicks} games={games} teams={teams} brackets={brackets} picks={picks} pickRates={pickRates} />;
    default:
      return null;
  }
}
```

Each sub-component (OracleContent, TrendsetterContent, etc.) renders the award-specific sidebar data per the spec. These are implemented inline in the same file — they are small rendering functions, not standalone components.

**OracleContent**: Maps over games, shows each with the winner's pick and a check/x icon.

**TrendsetterContent**: Filters winner's correct picks to those with pick rate < 0.3, shows team + pick rate bar.

**FaithfulContent**: Shows rank, points, champion TeamPill with alive status, remaining points on champion path.

**HotStreakContent**: Shows ordered list of consecutive correct picks as GameHeader entries.

**DiamondContent**: Shows the single contrarian pick with a visual pick rate bar.

**PeoplesChampionContent**: Shows all games with plurality pick per game, highlights where winner matched plurality.

- [ ] **Step 2: Wire sidebar into AwardsClient**

In `src/components/ui/AwardsClient.tsx`, add state and pass to AwardDetailSidebar:

```tsx
const [selectedAward, setSelectedAward] = useState<Award | null>(null);

// In the render, after the award cards grid:
<AwardDetailSidebar
  award={selectedAward!}
  open={!!selectedAward}
  onClose={() => setSelectedAward(null)}
  picks={picks}
  games={games}
  teams={teams}
  brackets={brackets}
  pickRates={pickRates}
/>

// Each AwardCard gets onClick:
<AwardCard award={award} onClick={() => setSelectedAward(award)} />
```

The `picks`, `games`, `teams`, `brackets`, and `pickRates` must be passed from the server component through AwardsClient as props. Update the props interface accordingly.

**pickRates serialization** — `Map` cannot cross the Next.js server/client boundary. In `awards/page.tsx`, convert after computing:

```typescript
import { computePickRates } from "@/lib/analytics";
const pickRatesMap = computePickRates(data.picks, data.games);
const pickRatesObj: Record<string, Record<string, number>> = {};
for (const [gid, teamMap] of pickRatesMap) {
  pickRatesObj[gid] = Object.fromEntries(teamMap);
}
// Pass pickRatesObj to AwardsClient, which passes to AwardDetailSidebar
```

Inside `AwardDetailSidebar`, access pick rates via `pickRates[gameId]?.[teamName] ?? 0` (object property access, not Map.get).

- [ ] **Step 3: Implement all 6 sidebar content sub-components**

Implement each `*Content` function component inside `AwardDetailSidebar.tsx`. Each should be 20-40 lines rendering a list of game/pick items with the appropriate highlighting. Use `GameHeader` for game displays and `TeamPill` for team references. Use existing color classes: `text-secondary` for correct/highlighted, `text-on-surface-variant` for neutral.

- [ ] **Step 4: Verify build and commit**

```bash
npm run build
git add -A && git commit -m "feat: award detail sidebar with per-award content for all 6 awards"
```

---

## Phase 3: Bracket Compare UX

### Task 10: CompareProvider Context

**Files:**
- Create: `src/components/ui/CompareProvider.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create CompareProvider**

Create `src/components/ui/CompareProvider.tsx`:

```tsx
"use client";
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface CompareContextType {
  selected: string[];                     // bracket IDs, max 2
  toggle: (id: string) => void;           // add/remove, FIFO if > 2
  clear: () => void;
  isSelected: (id: string) => boolean;
}

const CompareContext = createContext<CompareContextType>({
  selected: [],
  toggle: () => {},
  clear: () => {},
  isSelected: () => false,
});

export function useCompare() {
  return useContext(CompareContext);
}

export default function CompareProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id]; // FIFO: drop oldest
      return [...prev, id];
    });
  }, []);

  const clear = useCallback(() => setSelected([]), []);

  const isSelected = useCallback((id: string) => selected.includes(id), [selected]);

  return (
    <CompareContext.Provider value={{ selected, toggle, clear, isSelected }}>
      {children}
    </CompareContext.Provider>
  );
}
```

- [ ] **Step 2: Wrap root layout with CompareProvider**

In `src/app/layout.tsx`, import and wrap:

```tsx
import CompareProvider from "@/components/ui/CompareProvider";

// In the return, wrap the main content area:
<CompareProvider>
  {/* existing sidebar + main content */}
</CompareProvider>
```

- [ ] **Step 3: Verify build and commit**

```bash
npm run build
git add src/components/ui/CompareProvider.tsx src/app/layout.tsx
git commit -m "feat: add CompareProvider context wrapping root layout"
```

---

### Task 11: CompareCheckbox + CompareBar Components

**Files:**
- Create: `src/components/ui/CompareCheckbox.tsx`
- Create: `src/components/ui/CompareBar.tsx`

- [ ] **Step 1: Create CompareCheckbox**

Create `src/components/ui/CompareCheckbox.tsx`:

```tsx
"use client";
import { useCompare } from "./CompareProvider";

interface CompareCheckboxProps {
  bracketId: string;
  className?: string;
}

export default function CompareCheckbox({ bracketId, className = "" }: CompareCheckboxProps) {
  const { toggle, isSelected } = useCompare();
  const checked = isSelected(bracketId);

  return (
    <button
      onClick={(e) => { e.stopPropagation(); toggle(bracketId); }}
      className={`
        w-6 h-6 min-w-[24px] min-h-[24px] rounded-full border-2 flex items-center justify-center
        transition-all duration-150 shrink-0
        ${checked
          ? "bg-secondary border-secondary text-surface"
          : "border-outline-variant hover:border-secondary/50 hover:bg-secondary/10"
        }
        ${className}
      `}
      aria-label={checked ? "Deselect for comparison" : "Select for comparison"}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Create CompareBar**

Create `src/components/ui/CompareBar.tsx`:

```tsx
"use client";
import { useCompare } from "./CompareProvider";
import { useRouter } from "next/navigation";
import type { Bracket } from "@/lib/types";

interface CompareBarProps {
  brackets: Bracket[];
}

export default function CompareBar({ brackets }: CompareBarProps) {
  const { selected, toggle, clear } = useCompare();
  const router = useRouter();

  if (selected.length === 0) return null;

  const selectedBrackets = selected.map((id) => brackets.find((b) => b.id === id)).filter(Boolean);

  const handleCompare = () => {
    if (selected.length === 2) {
      router.push(`/head-to-head?b1=${selected[0]}&b2=${selected[1]}`);
      clear();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-outline-variant animate-[bottom-sheet-slide-up_0.2s_ease-out]">
      <div className="max-w-5xl mx-auto px-4 py-3 sm:py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedBrackets.map((b) => b && (
            <span key={b.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-secondary/30 bg-secondary/10 text-secondary text-sm truncate max-w-[180px]">
              <span className="truncate">{b.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); toggle(b.id); }}
                className="shrink-0 hover:text-on-surface min-w-[20px] min-h-[20px] flex items-center justify-center"
              >
                ✕
              </button>
            </span>
          ))}
          {selected.length === 1 && (
            <span className="text-on-surface-variant text-sm hidden sm:inline">Select one more to compare</span>
          )}
        </div>
        <button
          onClick={handleCompare}
          disabled={selected.length < 2}
          className={`
            px-4 py-2 rounded-lg font-semibold text-sm transition-all min-w-[44px] min-h-[44px]
            ${selected.length === 2
              ? "bg-secondary text-surface hover:bg-secondary/90 cursor-pointer"
              : "bg-surface-bright text-on-surface-variant cursor-not-allowed opacity-50"
            }
          `}
        >
          Compare
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build and commit**

```bash
npm run build
git add src/components/ui/CompareCheckbox.tsx src/components/ui/CompareBar.tsx
git commit -m "feat: CompareCheckbox and floating CompareBar components"
```

---

### Task 12: Add Compare Checkboxes to All Table Views

**Files:**
- Modify: `src/components/tables/LeaderboardTable.tsx`
- Modify: `src/components/ui/MobileCard.tsx`
- Modify: `src/components/ProbabilityClient.tsx`
- Modify: `src/app/simulator/page.tsx`
- Modify: `src/app/picks/PicksContent.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add CompareCheckbox to LeaderboardTable rows**

In `src/components/tables/LeaderboardTable.tsx`, add a checkbox column:
- Add `<th>` at the start of the header row (empty, narrow)
- Add `<td><CompareCheckbox bracketId={b.id} /></td>` at the start of each data row
- Also add to MobileCard: place checkbox in the top-left of each card

- [ ] **Step 2: Add CompareCheckbox to ProbabilityClient tables**

In `src/components/ProbabilityClient.tsx`:
- **Simulated Finishes tab**: add checkbox column to the table
- **Championship Chances tab**: add checkbox inline before each bracket name in the tier lists
- **Who's Still Alive tab**: add checkbox to the drilldown table rows

- [ ] **Step 3: Add CompareCheckbox to Simulator impact table**

In `src/app/simulator/page.tsx`, add checkbox column to the impact table.

- [ ] **Step 4: Add compare button to Group Picks drawer**

In `src/app/picks/PicksContent.tsx`, when the drawer shows a bracket's picks, add a small "Select for compare" button using `useCompare().toggle(bracketId)`.

- [ ] **Step 5: Add CompareBar to root layout**

In `src/app/layout.tsx`, render CompareBar inside the CompareProvider. The CompareBar needs brackets data — pass it from the data fetch that already exists in layout.tsx, or have CompareBar fetch it independently. Simplest: pass brackets as a prop from layout's data fetch.

```tsx
<CompareProvider>
  {/* existing content */}
  <CompareBar brackets={data.brackets} />
</CompareProvider>
```

Note: CompareBar is a client component. If layout.tsx is a server component, you may need to create a small client wrapper or pass brackets via a separate context/prop. Evaluate the simplest approach during implementation.

- [ ] **Step 6: Verify build and commit**

```bash
npm run build
git add -A && git commit -m "feat: compare checkboxes on all table views with floating compare bar"
```

---

### Task 13: Head-to-Head Deep Link Integration

**Files:**
- Modify: `src/app/head-to-head/HeadToHeadContent.tsx`

- [ ] **Step 1: Pre-populate dropdowns from URL params**

In `HeadToHeadContent.tsx`, read `b1` and `b2` from searchParams and pre-select the corresponding brackets:

```tsx
// Update existing id1/id2 state initialization to read from URL params:
const [id1, setId1] = useState(searchParams.get("b1") ?? "");
const [id2, setId2] = useState(searchParams.get("b2") ?? "");
```

Note: The existing component uses `id1`/`id2` as state variable names (not `bracket1`/`bracket2`). Only change the initial value, not the variable names.

This ensures clicking "Compare" in the bar pre-fills both dropdowns automatically.

- [ ] **Step 2: Verify full flow end-to-end**

Test the flow: select 2 brackets on leaderboard → compare bar appears → click Compare → navigates to head-to-head with both dropdowns pre-filled.

- [ ] **Step 3: Verify build and commit**

```bash
npm run build
git add src/app/head-to-head/HeadToHeadContent.tsx
git commit -m "feat: head-to-head pre-populates from compare deep link params"
```

---

### Task 14: Final Polish + FEATURES.md Update

**Files:**
- Modify: `FEATURES.md`
- Modify: `BACKLOG.md`

- [ ] **Step 1: Update FEATURES.md**

Add sections for:
- Mobile responsiveness (bottom sheets, stacked cards, sort dropdowns, scrollable filters)
- Award detail sidebar (clickable awards, per-award content)
- Multiple award winners (tie handling)
- "All Rounds" award variant
- Bracket compare UX (checkboxes, floating bar, deep link)

Fix the existing Awards section: replace "Momentum Builder" reference on line 39 with "Diamond in the Rough".

- [ ] **Step 2: Update BACKLOG.md**

Remove "Mobile responsiveness" from backlog (completed). Add any new items discovered during implementation.

- [ ] **Step 3: Commit**

```bash
git add FEATURES.md BACKLOG.md
git commit -m "docs: update FEATURES.md and BACKLOG.md for Plan 4 deliverables"
```

---

### Task 15: UX Polish — Filters, ESPN Links, Championship Chances, Expandable Rows

**Files:**
- Modify: `src/app/head-to-head/HeadToHeadContent.tsx`
- Modify: `src/components/ProbabilityClient.tsx`
- Modify: `src/app/simulator/page.tsx`
- Modify: `src/components/ui/GameHeader.tsx` (if needed)

- [ ] **Step 1: Head-to-Head filter labels — use "-" instead of "=" for overlap/differences**

In `HeadToHeadContent.tsx`, find the per-round filter labels that show agreement/difference counts. Change the separator from "=" to "-". For example: "Agree - 4" / "Differ - 2" instead of "Agree = 4" / "Differ = 2".

- [ ] **Step 2: Status filters show game counts everywhere**

On every page that shows status filters (Completed / Scheduled / All), append the count to the label. Example: "Completed (12)" / "Scheduled (4)" / "All (16)".

Apply to: `HeadToHeadContent.tsx`, `PicksContent.tsx`, and any other page with status filters. Follow the pattern already used on the Group Picks page if it exists.

- [ ] **Step 3: ESPN links on Simulator and Head-to-Head pages**

For completed games that have an `espn_url` field in the game data:
- **Simulator**: Add a small ESPN link icon on each completed matchup card. Use the existing pattern from `GameHeader.tsx` which already renders ESPN boxscore links.
- **Head-to-Head**: Add ESPN link to each game in the comparison view. Reuse `GameHeader` component where possible, or add a small link icon next to the game matchup.

- [ ] **Step 4: Championship Chances — hide percentages by default**

In `ProbabilityClient.tsx`, on the Championship Chances tab, default the "Show exact percentages" toggle to OFF (hidden). Users can click to reveal. If there's already a toggle, just change its default state. If not, add a toggle button:

```tsx
const [showPct, setShowPct] = useState(false);
// In tier rendering, only show percentage when showPct is true
{showPct && <span className="text-on-surface-variant text-xs">{pct}%</span>}
```

- [ ] **Step 5: Expandable rows on Simulated Finishes table**

In `ProbabilityClient.tsx`, add expand/collapse behavior to the Simulated Finishes table rows, similar to the leaderboard's path-to-victory expansion. On click, expand to show additional detail (e.g., full distribution breakdown, champion pick, alive status, max remaining). Follow the same pattern used in `LeaderboardTable.tsx` with `expandedId` state.

- [ ] **Step 6: Verify build and commit**

```bash
npm run build
git add -A && git commit -m "feat: UX polish — filter counts, ESPN links, hidden percentages, expandable rows"
```
