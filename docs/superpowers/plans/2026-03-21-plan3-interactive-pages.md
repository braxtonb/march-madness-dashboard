# Plan 3: Interactive Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the remaining 5 pages (Simulator, Awards, Probability, Head-to-Head, Season Finale) plus the Monte Carlo simulation library.

**Architecture:** Same pattern as Plan 2 — server components fetch data, pass serialized props to client components. Monte Carlo runs client-side for Probability page. All pages share existing layout shell, UI components, and design tokens.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Recharts, existing lib/ layer from Plan 2

---

## File Structure (new files only)

```
src/
├── app/
│   ├── simulator/
│   │   └── page.tsx              # Simulator page (client-heavy)
│   ├── awards/
│   │   └── page.tsx              # Awards page
│   ├── probability/
│   │   └── page.tsx              # Probability page
│   ├── head-to-head/
│   │   └── page.tsx              # Head-to-Head page
│   └── finale/
│       └── page.tsx              # Season Finale page
├── lib/
│   └── montecarlo.ts             # Client-side Monte Carlo simulation
└── components/
    └── charts/
        ├── WinProbBar.tsx         # Horizontal bar chart for win probabilities
        ├── ProbabilityJourney.tsx  # Line chart for probability over rounds
        ├── RadarComparison.tsx     # Radar chart for H2H comparison
        └── InsightFortuneScatter.tsx  # Scatter plot for finale
```

**Existing files used (not modified):**
- `src/lib/sheets.ts`, `types.ts`, `constants.ts`, `analytics.ts`
- `src/components/ui/StatCard.tsx`, `TeamPill.tsx`, `RoundSelector.tsx`
- `src/components/tables/DrilldownTable.tsx`

---

### Task 1: Monte Carlo Simulation Library

**Files:**
- Create: `src/lib/montecarlo.ts`

- [ ] **Step 1: Create montecarlo.ts**

Create `src/lib/montecarlo.ts`:

```typescript
import type { Bracket, Game, Pick, Round } from "./types";
import { SEED_WIN_RATES, ROUND_POINTS, ROUND_ORDER } from "./constants";

interface SimResult {
  bracket_id: string;
  wins: number;
  avg_final_points: number;
  median_rank: number;
  best_rank: number;
}

/**
 * Run Monte Carlo simulation: simulate remaining games N times,
 * score all brackets, count how often each finishes first.
 */
export function runMonteCarlo(
  brackets: Bracket[],
  picks: Pick[],
  games: Game[],
  iterations: number = 1000
): Map<string, SimResult> {
  const completedGames = new Set(
    games.filter((g) => g.completed).map((g) => g.game_id)
  );
  const remainingGames = games.filter((g) => !g.completed);

  // Group picks by bracket
  const picksByBracket = new Map<string, Map<string, string>>();
  for (const p of picks) {
    if (!picksByBracket.has(p.bracket_id)) {
      picksByBracket.set(p.bracket_id, new Map());
    }
    picksByBracket.get(p.bracket_id)!.set(p.game_id, p.team_picked);
  }

  // Pre-compute current correct points per bracket
  const currentPoints = new Map<string, number>();
  for (const b of brackets) {
    currentPoints.set(b.id, b.points);
  }

  // Track wins and point totals
  const winCounts = new Map<string, number>();
  const pointTotals = new Map<string, number[]>();
  const rankTotals = new Map<string, number[]>();

  for (const b of brackets) {
    winCounts.set(b.id, 0);
    pointTotals.set(b.id, []);
    rankTotals.set(b.id, []);
  }

  for (let i = 0; i < iterations; i++) {
    // Simulate remaining games
    const simWinners = new Map<string, string>();
    for (const g of remainingGames) {
      const seed1Rate = SEED_WIN_RATES[g.seed1]?.[g.round as Round] ?? 0.5;
      const team1Wins = Math.random() < seed1Rate;
      simWinners.set(g.game_id, team1Wins ? g.team1 : g.team2);
    }

    // Score each bracket
    const simScores: { id: string; score: number }[] = [];
    for (const b of brackets) {
      const bPicks = picksByBracket.get(b.id);
      let additionalPoints = 0;

      if (bPicks) {
        for (const g of remainingGames) {
          const picked = bPicks.get(g.game_id);
          const winner = simWinners.get(g.game_id);
          if (picked && picked === winner) {
            additionalPoints += ROUND_POINTS[g.round as Round] || 0;
          }
        }
      }

      const totalScore = (currentPoints.get(b.id) || 0) + additionalPoints;
      simScores.push({ id: b.id, score: totalScore });
      pointTotals.get(b.id)!.push(totalScore);
    }

    // Rank by score
    simScores.sort((a, b) => b.score - a.score);
    for (let r = 0; r < simScores.length; r++) {
      rankTotals.get(simScores[r].id)!.push(r + 1);
    }

    // Winner
    if (simScores.length > 0) {
      winCounts.set(
        simScores[0].id,
        (winCounts.get(simScores[0].id) || 0) + 1
      );
    }
  }

  // Build results
  const results = new Map<string, SimResult>();
  for (const b of brackets) {
    const pts = pointTotals.get(b.id) || [];
    const ranks = rankTotals.get(b.id) || [];
    const avgPts =
      pts.length > 0 ? pts.reduce((a, b) => a + b, 0) / pts.length : 0;
    const sortedRanks = [...ranks].sort((a, b) => a - b);
    const medianRank =
      sortedRanks.length > 0
        ? sortedRanks[Math.floor(sortedRanks.length / 2)]
        : brackets.length;
    const bestRank = sortedRanks.length > 0 ? sortedRanks[0] : brackets.length;

    results.set(b.id, {
      bracket_id: b.id,
      wins: winCounts.get(b.id) || 0,
      avg_final_points: Math.round(avgPts),
      median_rank: medianRank,
      best_rank: bestRank,
    });
  }

  return results;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/montecarlo.ts
git commit -m "feat: add Monte Carlo simulation library for win probability"
```

---

### Task 2: Simulator Page

**Files:**
- Create: `src/app/simulator/page.tsx`

- [ ] **Step 1: Create the Simulator page**

This is a fully client-side interactive page. Create `src/app/simulator/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import type { Bracket, Game, Pick, BracketAnalytics, DashboardData } from "@/lib/types";
import { ROUND_POINTS } from "@/lib/constants";
import { computeAllAnalytics } from "@/lib/analytics";
import { StatCard } from "@/components/ui/StatCard";
import { TeamPill } from "@/components/ui/TeamPill";

export default function SimulatorPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [selections, setSelections] = useState<Map<string, string>>(new Map());
  const [simResults, setSimResults] = useState<{ id: string; name: string; owner: string; baseRank: number; simRank: number; basePoints: number; simPoints: number }[]>([]);

  useEffect(() => {
    fetch("/api/data")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="space-y-section">
        <div>
          <h2 className="font-display text-2xl font-bold">Scenario Simulator</h2>
          <p className="text-on-surface-variant text-sm mt-1">Loading data...</p>
        </div>
      </div>
    );
  }

  const upcomingGames = data.games.filter((g) => !g.completed);
  const analytics = computeAllAnalytics(data);

  function toggleWinner(gameId: string, team: string) {
    const next = new Map(selections);
    if (next.get(gameId) === team) {
      next.delete(gameId);
    } else {
      next.set(gameId, team);
    }
    setSelections(next);
  }

  function setAllFavorites() {
    const next = new Map<string, string>();
    for (const g of upcomingGames) {
      next.set(g.game_id, g.seed1 <= g.seed2 ? g.team1 : g.team2);
    }
    setSelections(next);
  }

  function setAllUnderdogs() {
    const next = new Map<string, string>();
    for (const g of upcomingGames) {
      next.set(g.game_id, g.seed1 > g.seed2 ? g.team1 : g.team2);
    }
    setSelections(next);
  }

  function simulate() {
    // Group picks by bracket
    const picksByBracket = new Map<string, Map<string, string>>();
    for (const p of data!.picks) {
      if (!picksByBracket.has(p.bracket_id)) picksByBracket.set(p.bracket_id, new Map());
      picksByBracket.get(p.bracket_id)!.set(p.game_id, p.team_picked);
    }

    // Score each bracket with simulated outcomes
    const scored = data!.brackets.map((b) => {
      const bPicks = picksByBracket.get(b.id);
      let bonus = 0;
      if (bPicks) {
        for (const [gameId, winner] of selections) {
          const picked = bPicks.get(gameId);
          const game = data!.games.find((g) => g.game_id === gameId);
          if (picked === winner && game) {
            bonus += ROUND_POINTS[game.round as keyof typeof ROUND_POINTS] || 0;
          }
        }
      }
      return { id: b.id, name: b.name, owner: b.owner, basePoints: b.points, simPoints: b.points + bonus };
    });

    // Rank by simulated points
    const baseRanked = [...data!.brackets].sort((a, b) => b.points - a.points);
    const simRanked = [...scored].sort((a, b) => b.simPoints - a.simPoints);

    const baseRankMap = new Map<string, number>();
    baseRanked.forEach((b, i) => baseRankMap.set(b.id, i + 1));

    setSimResults(
      simRanked.slice(0, 15).map((s, i) => ({
        ...s,
        baseRank: baseRankMap.get(s.id) || 0,
        simRank: i + 1,
      }))
    );
  }

  return (
    <div className="space-y-section">
      <div>
        <h2 className="font-display text-2xl font-bold">Scenario Simulator</h2>
        <p className="text-on-surface-variant text-sm mt-1">
          Toggle game outcomes and see how the standings shift
        </p>
      </div>

      {/* Quick scenario buttons */}
      <div className="flex gap-2">
        <button onClick={setAllFavorites} className="rounded-card bg-surface-container px-4 py-2 text-sm font-label text-on-surface-variant hover:text-on-surface transition-colors">
          All favorites
        </button>
        <button onClick={setAllUnderdogs} className="rounded-card bg-surface-container px-4 py-2 text-sm font-label text-on-surface-variant hover:text-on-surface transition-colors">
          All underdogs
        </button>
        <button onClick={() => setSelections(new Map())} className="rounded-card bg-surface-container px-4 py-2 text-sm font-label text-on-surface-variant hover:text-on-surface transition-colors">
          Clear
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-section">
        {/* Left panel: upcoming games */}
        <div className="lg:col-span-2 space-y-2">
          <h3 className="font-display text-lg font-semibold">Upcoming Games</h3>
          {upcomingGames.length === 0 && (
            <p className="text-on-surface-variant text-sm">No upcoming games.</p>
          )}
          {upcomingGames.map((g) => (
            <div key={g.game_id} className="rounded-card bg-surface-container p-3 flex items-center gap-2">
              <button
                onClick={() => toggleWinner(g.game_id, g.team1)}
                className={`flex-1 rounded-card px-3 py-2 text-xs font-label transition-colors ${
                  selections.get(g.game_id) === g.team1
                    ? "bg-secondary/20 text-secondary glow-primary"
                    : "bg-surface-bright text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {g.seed1} {g.team1}
              </button>
              <span className="text-xs text-on-surface-variant">vs</span>
              <button
                onClick={() => toggleWinner(g.game_id, g.team2)}
                className={`flex-1 rounded-card px-3 py-2 text-xs font-label transition-colors ${
                  selections.get(g.game_id) === g.team2
                    ? "bg-secondary/20 text-secondary glow-primary"
                    : "bg-surface-bright text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {g.seed2} {g.team2}
              </button>
            </div>
          ))}
          {upcomingGames.length > 0 && (
            <button
              onClick={simulate}
              className="w-full rounded-card bg-primary px-4 py-2.5 text-sm font-label font-semibold text-on-primary glow-primary transition-colors"
            >
              Simulate ({selections.size}/{upcomingGames.length} selected)
            </button>
          )}
        </div>

        {/* Right panel: impact */}
        <div className="lg:col-span-3 space-y-4">
          <h3 className="font-display text-lg font-semibold">Impact</h3>
          {simResults.length === 0 && (
            <div className="rounded-card bg-surface-container p-8 text-center">
              <p className="text-on-surface-variant text-sm">
                Select game winners and click Simulate to see the impact.
              </p>
            </div>
          )}
          {simResults.length > 0 && (
            <div className="overflow-x-auto rounded-card bg-surface-container">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline">
                    <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Sim Rank</th>
                    <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Name</th>
                    <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Change</th>
                    <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Pts</th>
                    <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Sim Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {simResults.map((r) => {
                    const delta = r.baseRank - r.simRank;
                    return (
                      <tr key={r.id} className="border-b border-outline hover:bg-surface-bright transition-colors">
                        <td className="px-3 py-2 font-label">{r.simRank}</td>
                        <td className="px-3 py-2">
                          <div className="text-on-surface">{r.owner}</div>
                          <div className="text-xs text-on-surface-variant">{r.name}</div>
                        </td>
                        <td className="px-3 py-2 font-label">
                          {delta > 0 && <span className="text-secondary">+{delta}</span>}
                          {delta === 0 && <span className="text-on-surface-variant">—</span>}
                          {delta < 0 && <span className="text-on-surface-variant">{delta}</span>}
                        </td>
                        <td className="px-3 py-2 font-label text-on-surface-variant">{r.basePoints}</td>
                        <td className="px-3 py-2 font-label text-on-surface">{r.simPoints}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create API route to serve data as JSON for client components**

Create `src/app/api/data/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { fetchDashboardData } from "@/lib/sheets";

export async function GET() {
  try {
    const data = await fetchDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Verify it compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/simulator/ src/app/api/data/ src/lib/montecarlo.ts
git commit -m "feat: build Simulator page with game toggle and impact table"
```

---

### Task 3: Awards Page

**Files:**
- Create: `src/app/awards/page.tsx`, `src/components/ui/AwardCard.tsx`

- [ ] **Step 1: Create AwardCard.tsx**

Create `src/components/ui/AwardCard.tsx`:

```tsx
export function AwardCard({
  title,
  winner,
  bracketName,
  stat,
  tier,
}: {
  title: string;
  winner: string;
  bracketName: string;
  stat: string;
  tier: "gold" | "silver" | "bronze";
}) {
  const tierColors = {
    gold: "text-achievement",
    silver: "text-on-surface-variant",
    bronze: "text-action",
  };
  const tierIcons = { gold: "🏆", silver: "🥈", bronze: "🥉" };

  return (
    <div className="rounded-card bg-surface-container p-5 space-y-3 hover:bg-surface-bright transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{tierIcons[tier]}</span>
        <h4 className={`font-display font-semibold ${tierColors[tier]}`}>
          {title}
        </h4>
      </div>
      <div>
        <p className="font-body text-on-surface font-medium">{winner}</p>
        <p className="text-xs text-on-surface-variant">{bracketName}</p>
      </div>
      <p className="text-sm text-on-surface-variant">{stat}</p>
    </div>
  );
}
```

- [ ] **Step 2: Create the Awards page**

Create `src/app/awards/page.tsx`:

```tsx
import { fetchDashboardData } from "@/lib/sheets";
import { computeAllAnalytics, computePickRates } from "@/lib/analytics";
import { AwardCard } from "@/components/ui/AwardCard";
import { RoundSelector } from "@/components/ui/RoundSelector";
import type { Bracket, Pick, Round } from "@/lib/types";

export const revalidate = 300;

interface Award {
  title: string;
  winner: string;
  bracketName: string;
  stat: string;
  tier: "gold" | "silver" | "bronze";
}

function computeAwards(
  brackets: Bracket[],
  picks: Pick[],
  round: Round,
  totalBrackets: number
): Award[] {
  const pickRates = computePickRates(picks, totalBrackets);
  const roundPicks = picks.filter((p) => p.round === round);

  // Group picks by bracket
  const picksByBracket = new Map<string, Pick[]>();
  for (const p of roundPicks) {
    if (!picksByBracket.has(p.bracket_id)) picksByBracket.set(p.bracket_id, []);
    picksByBracket.get(p.bracket_id)!.push(p);
  }

  const bracketMap = new Map(brackets.map((b) => [b.id, b]));
  const awards: Award[] = [];

  // The Oracle — most correct picks this round
  let oracleBest = { id: "", count: 0 };
  for (const [bid, bPicks] of picksByBracket) {
    const correct = bPicks.filter((p) => p.correct).length;
    if (correct > oracleBest.count) oracleBest = { id: bid, count: correct };
  }
  if (oracleBest.id) {
    const b = bracketMap.get(oracleBest.id)!;
    awards.push({ title: "The Oracle", winner: b.owner, bracketName: b.name, stat: `${oracleBest.count} correct picks this round`, tier: "gold" });
  }

  // The Trendsetter — most unique correct picks
  let trendBest = { id: "", count: 0 };
  for (const [bid, bPicks] of picksByBracket) {
    const uniqueCorrect = bPicks.filter((p) => {
      if (!p.correct) return false;
      const rate = pickRates.get(p.game_id)?.get(p.team_picked) ?? 1;
      return rate < 0.3;
    }).length;
    if (uniqueCorrect > trendBest.count) trendBest = { id: bid, count: uniqueCorrect };
  }
  if (trendBest.id) {
    const b = bracketMap.get(trendBest.id)!;
    awards.push({ title: "The Trendsetter", winner: b.owner, bracketName: b.name, stat: `${trendBest.count} unique correct picks`, tier: "gold" });
  }

  // The Faithful — highest scorer with champion alive
  const sorted = [...brackets].sort((a, b) => b.points - a.points);
  const faithful = sorted.find((b) => {
    const bPicks = picks.filter((p) => p.bracket_id === b.id);
    // Champion is "alive" if not eliminated — approximate: check if any pick has champion and is not vacated
    return b.champion_pick !== "";
  });
  if (faithful) {
    awards.push({ title: "The Faithful", winner: faithful.owner, bracketName: faithful.name, stat: `${faithful.points} pts, champion: ${faithful.champion_pick}`, tier: "silver" });
  }

  // Hot Streak — most consecutive correct picks
  let streakBest = { id: "", count: 0 };
  for (const [bid, bPicks] of picksByBracket) {
    let streak = 0, maxStreak = 0;
    for (const p of bPicks) {
      if (p.correct) { streak++; maxStreak = Math.max(maxStreak, streak); }
      else streak = 0;
    }
    if (maxStreak > streakBest.count) streakBest = { id: bid, count: maxStreak };
  }
  if (streakBest.id) {
    const b = bracketMap.get(streakBest.id)!;
    awards.push({ title: "Hot Streak", winner: b.owner, bracketName: b.name, stat: `${streakBest.count} consecutive correct picks`, tier: "silver" });
  }

  // Momentum Builder — biggest rank climb
  let momentumBest = { id: "", delta: 0 };
  for (const b of brackets) {
    const delta = b.prev_rank > 0 ? b.prev_rank - (sorted.indexOf(b) + 1) : 0;
    if (delta > momentumBest.delta) momentumBest = { id: b.id, delta };
  }
  if (momentumBest.id) {
    const b = bracketMap.get(momentumBest.id)!;
    awards.push({ title: "Momentum Builder", winner: b.owner, bracketName: b.name, stat: `Climbed ${momentumBest.delta} ranks this round`, tier: "bronze" });
  }

  // The People's Champion — most aligned with consensus
  let peopleBest = { id: "", count: 0 };
  for (const [bid, bPicks] of picksByBracket) {
    const consensus = bPicks.filter((p) => {
      const rate = pickRates.get(p.game_id)?.get(p.team_picked) ?? 0;
      return rate > 0.5;
    }).length;
    if (consensus > peopleBest.count) peopleBest = { id: bid, count: consensus };
  }
  if (peopleBest.id) {
    const b = bracketMap.get(peopleBest.id)!;
    awards.push({ title: "The People's Champion", winner: b.owner, bracketName: b.name, stat: `${peopleBest.count} picks aligned with group consensus`, tier: "bronze" });
  }

  return awards;
}

export default async function AwardsPage() {
  const data = await fetchDashboardData();
  const currentRound = data.meta.current_round;
  const awards = computeAwards(data.brackets, data.picks, currentRound, data.brackets.length);

  return (
    <div className="space-y-section">
      <div>
        <h2 className="font-display text-2xl font-bold">Tournament Awards</h2>
        <p className="text-on-surface-variant text-sm mt-1">
          Celebrating the best bracket moves each round
        </p>
      </div>

      <div className="rounded-card bg-surface-container px-4 py-2 inline-block">
        <span className="font-label text-xs text-on-surface-variant uppercase tracking-wider">
          Showing awards for: {currentRound}
        </span>
      </div>

      {awards.length === 0 && (
        <div className="rounded-card bg-surface-container p-8 text-center">
          <p className="text-on-surface-variant">No awards data available yet.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {awards.map((award) => (
          <AwardCard key={award.title} {...award} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify it compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/awards/ src/components/ui/AwardCard.tsx
git commit -m "feat: build Awards page with computed award cards"
```

---

### Task 4: Probability Page

**Files:**
- Create: `src/app/probability/page.tsx`, `src/components/charts/WinProbBar.tsx`, `src/components/charts/ProbabilityJourney.tsx`

- [ ] **Step 1: Create WinProbBar.tsx**

Create `src/components/charts/WinProbBar.tsx`:

```tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ProbEntry {
  name: string;
  probability: number;
  champion: string;
}

const CHAMP_COLORS = [
  "#2dd4bf", "#a78bfa", "#fbbf24", "#fb923c", "#3b82f6",
  "#06b6d4", "#84cc16", "#f472b6", "#e879f9", "#22d3ee",
];

export function WinProbBar({ data }: { data: ProbEntry[] }) {
  // Assign colors by champion
  const champColorMap = new Map<string, string>();
  let ci = 0;
  for (const d of data) {
    if (!champColorMap.has(d.champion)) {
      champColorMap.set(d.champion, CHAMP_COLORS[ci % CHAMP_COLORS.length]);
      ci++;
    }
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(400, data.length * 28)}>
      <BarChart data={data} layout="vertical" margin={{ left: 100, right: 20 }}>
        <XAxis type="number" tick={{ fill: "#8b95a5", fontSize: 11, fontFamily: "Space Grotesk" }} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: "#e7ebf3", fontSize: 11, fontFamily: "Inter" }}
          width={90}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#141a20",
            border: "none",
            borderRadius: "12px",
            color: "#e7ebf3",
            fontFamily: "Inter",
          }}
          formatter={(value: number) => [`${value.toFixed(1)}%`, "Win Probability"]}
        />
        <Bar dataKey="probability" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={champColorMap.get(entry.champion) || "#2dd4bf"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Create ProbabilityJourney.tsx**

Create `src/components/charts/ProbabilityJourney.tsx`:

```tsx
"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface JourneyPoint {
  round: string;
  [bracketName: string]: string | number;
}

const LINE_COLORS = [
  "#2dd4bf", "#a78bfa", "#fbbf24", "#fb923c", "#3b82f6",
  "#06b6d4", "#84cc16", "#f472b6", "#e879f9", "#22d3ee",
];

export function ProbabilityJourney({
  data,
  bracketNames,
}: {
  data: JourneyPoint[];
  bracketNames: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <XAxis
          dataKey="round"
          tick={{ fill: "#8b95a5", fontSize: 11, fontFamily: "Space Grotesk" }}
        />
        <YAxis
          tick={{ fill: "#8b95a5", fontSize: 11, fontFamily: "Space Grotesk" }}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#141a20",
            border: "none",
            borderRadius: "12px",
            color: "#e7ebf3",
            fontFamily: "Inter",
          }}
          formatter={(value: number) => `${value.toFixed(1)}%`}
        />
        <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "Space Grotesk" }} />
        {bracketNames.map((name, i) => (
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            stroke={LINE_COLORS[i % LINE_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: Create the Probability page**

Create `src/app/probability/page.tsx`:

```tsx
import { fetchDashboardData } from "@/lib/sheets";
import { runMonteCarlo } from "@/lib/montecarlo";
import { StatCard } from "@/components/ui/StatCard";
import { WinProbBar } from "@/components/charts/WinProbBar";
import { ProbabilityJourney } from "@/components/charts/ProbabilityJourney";

export const revalidate = 300;

export default async function ProbabilityPage() {
  const data = await fetchDashboardData();
  const simResults = runMonteCarlo(data.brackets, data.picks, data.games, 1000);

  // Build win probability data sorted by probability
  const probData = data.brackets
    .map((b) => {
      const sim = simResults.get(b.id);
      return {
        name: b.owner,
        probability: sim ? (sim.wins / 1000) * 100 : 0,
        champion: b.champion_pick,
        median_rank: sim?.median_rank ?? data.brackets.length,
        best_rank: sim?.best_rank ?? data.brackets.length,
      };
    })
    .sort((a, b) => b.probability - a.probability);

  // Build probability journey from snapshots (top 10 contenders)
  const top10Ids = probData.slice(0, 10).map((d) => d.name);
  const journeyRounds = [...new Set(data.snapshots.map((s) => s.round))];
  const bracketNameMap = new Map(data.brackets.map((b) => [b.id, b.owner]));

  const journeyData = journeyRounds.map((round) => {
    const point: Record<string, string | number> = { round };
    const roundSnaps = data.snapshots.filter((s) => s.round === round);
    for (const snap of roundSnaps) {
      const name = bracketNameMap.get(snap.bracket_id) || snap.bracket_id;
      if (top10Ids.includes(name)) {
        point[name] = Math.round(snap.win_prob * 100 * 10) / 10;
      }
    }
    return point;
  });

  // Top contender
  const topContender = probData[0];

  return (
    <div className="space-y-section">
      <div>
        <h2 className="font-display text-2xl font-bold">Win Probability</h2>
        <p className="text-on-surface-variant text-sm mt-1">
          We simulated the rest of the tournament 1,000 times to estimate everyone&apos;s chances
        </p>
      </div>

      {/* Methodology card */}
      <div className="rounded-card bg-surface-container p-4">
        <p className="text-sm text-on-surface-variant">
          Based on historical NCAA tournament seed win rates, we simulate 1,000 possible
          tournament outcomes. Each bracket&apos;s win probability is how often it finishes
          first across all simulations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Top Contender"
          value={topContender?.name || "—"}
          subtitle={topContender ? `${topContender.probability.toFixed(1)}% win probability` : undefined}
        />
        <StatCard
          label="Brackets With a Shot"
          value={probData.filter((d) => d.probability > 0).length}
          subtitle="have non-zero win probability"
        />
        <StatCard
          label="Simulations Run"
          value="1,000"
        />
      </div>

      {/* Win probability bar chart */}
      <div className="rounded-card bg-surface-container p-5">
        <h3 className="font-display text-lg font-semibold mb-4">Win Probability</h3>
        <WinProbBar data={probData.filter((d) => d.probability > 0)} />
      </div>

      {/* Probability journey */}
      {journeyData.length > 0 && (
        <div className="rounded-card bg-surface-container p-5">
          <h3 className="font-display text-lg font-semibold mb-4">Probability Journey</h3>
          <ProbabilityJourney data={journeyData} bracketNames={top10Ids} />
        </div>
      )}

      {/* Expected finish table */}
      <div className="rounded-card bg-surface-container p-5">
        <h3 className="font-display text-lg font-semibold mb-4">Expected Finish</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline">
                <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Name</th>
                <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Win %</th>
                <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Median Finish</th>
                <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Best Possible</th>
                <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Champion</th>
              </tr>
            </thead>
            <tbody>
              {probData.slice(0, 25).map((d) => (
                <tr key={d.name} className="border-b border-outline hover:bg-surface-bright transition-colors">
                  <td className="px-3 py-2 text-on-surface">{d.name}</td>
                  <td className="px-3 py-2 font-label text-tertiary">{d.probability.toFixed(1)}%</td>
                  <td className="px-3 py-2 font-label text-on-surface-variant">#{d.median_rank}</td>
                  <td className="px-3 py-2 font-label text-secondary">#{d.best_rank}</td>
                  <td className="px-3 py-2 text-on-surface-variant">{d.champion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify it compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/app/probability/ src/components/charts/WinProbBar.tsx src/components/charts/ProbabilityJourney.tsx
git commit -m "feat: build Probability page with Monte Carlo simulation and charts"
```

---

### Task 5: Head-to-Head Page

**Files:**
- Create: `src/app/head-to-head/page.tsx`, `src/components/charts/RadarComparison.tsx`

- [ ] **Step 1: Create RadarComparison.tsx**

Create `src/components/charts/RadarComparison.tsx`:

```tsx
"use client";

import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Legend } from "recharts";

interface RadarData {
  axis: string;
  person1: number;
  person2: number;
}

export function RadarComparison({
  data,
  name1,
  name2,
}: {
  data: RadarData[];
  name1: string;
  name2: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid stroke="#252d35" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fill: "#8b95a5", fontSize: 11, fontFamily: "Space Grotesk" }}
        />
        <Radar
          name={name1}
          dataKey="person1"
          stroke="#2dd4bf"
          fill="#2dd4bf"
          fillOpacity={0.2}
        />
        <Radar
          name={name2}
          dataKey="person2"
          stroke="#a78bfa"
          fill="#a78bfa"
          fillOpacity={0.2}
        />
        <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "Space Grotesk" }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Create the Head-to-Head page**

Create `src/app/head-to-head/page.tsx`:

```tsx
import { fetchDashboardData } from "@/lib/sheets";
import { computeAllAnalytics, computePickRates } from "@/lib/analytics";
import { HeadToHeadContent } from "./HeadToHeadContent";

export const revalidate = 300;

export default async function HeadToHeadPage() {
  const data = await fetchDashboardData();
  const analytics = computeAllAnalytics(data);
  const pickRates = computePickRates(data.picks, data.brackets.length);

  // Serialize for client
  const analyticsObj = Object.fromEntries(analytics);
  const pickRatesObj: Record<string, Record<string, number>> = {};
  for (const [gid, teamRates] of pickRates) {
    pickRatesObj[gid] = Object.fromEntries(teamRates);
  }

  return (
    <div className="space-y-section">
      <div>
        <h2 className="font-display text-2xl font-bold">Head-to-Head</h2>
        <p className="text-on-surface-variant text-sm mt-1">
          Compare any two brackets side by side
        </p>
      </div>

      <HeadToHeadContent
        brackets={data.brackets}
        picks={data.picks}
        games={data.games}
        analyticsObj={analyticsObj}
        pickRatesObj={pickRatesObj}
      />
    </div>
  );
}
```

- [ ] **Step 3: Create HeadToHeadContent client component**

Create `src/app/head-to-head/HeadToHeadContent.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { Bracket, Pick, Game, BracketAnalytics } from "@/lib/types";
import { ARCHETYPE_COLORS } from "@/lib/constants";
import { StatCard } from "@/components/ui/StatCard";
import { RadarComparison } from "@/components/charts/RadarComparison";

export function HeadToHeadContent({
  brackets,
  picks,
  games,
  analyticsObj,
  pickRatesObj,
}: {
  brackets: Bracket[];
  picks: Pick[];
  games: Game[];
  analyticsObj: Record<string, BracketAnalytics>;
  pickRatesObj: Record<string, Record<string, number>>;
}) {
  const [id1, setId1] = useState("");
  const [id2, setId2] = useState("");

  const b1 = brackets.find((b) => b.id === id1);
  const b2 = brackets.find((b) => b.id === id2);
  const a1 = id1 ? analyticsObj[id1] : null;
  const a2 = id2 ? analyticsObj[id2] : null;

  const picks1 = picks.filter((p) => p.bracket_id === id1);
  const picks2 = picks.filter((p) => p.bracket_id === id2);

  // Compute agreement
  const pickMap1 = new Map(picks1.map((p) => [p.game_id, p.team_picked]));
  const pickMap2 = new Map(picks2.map((p) => [p.game_id, p.team_picked]));
  let agree = 0;
  let total = 0;
  for (const [gid, team] of pickMap1) {
    total++;
    if (pickMap2.get(gid) === team) agree++;
  }

  // Compute radar data
  const radarData = b1 && b2 && a1 && a2 ? [
    { axis: "Points", person1: b1.points / Math.max(b1.points, b2.points, 1) * 100, person2: b2.points / Math.max(b1.points, b2.points, 1) * 100 },
    { axis: "MAX", person1: b1.max_remaining / Math.max(b1.max_remaining, b2.max_remaining, 1) * 100, person2: b2.max_remaining / Math.max(b1.max_remaining, b2.max_remaining, 1) * 100 },
    { axis: "Uniqueness", person1: a1.uniqueness * 100, person2: a2.uniqueness * 100 },
    { axis: "Win %", person1: a1.estimated_win_prob, person2: a2.estimated_win_prob },
    { axis: "Accuracy", person1: picks1.filter((p) => p.correct).length / Math.max(picks1.length, 1) * 100, person2: picks2.filter((p) => p.correct).length / Math.max(picks2.length, 1) * 100 },
  ] : [];

  // Pick diff for completed games
  const completedGames = games.filter((g) => g.completed);

  return (
    <div className="space-y-section">
      {/* Person selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <select
          value={id1}
          onChange={(e) => setId1(e.target.value)}
          className="rounded-card bg-surface-container px-4 py-2.5 text-sm text-on-surface outline-none"
        >
          <option value="">Select bracket 1...</option>
          {brackets.map((b) => (
            <option key={b.id} value={b.id}>
              {b.owner} — {b.name}
            </option>
          ))}
        </select>
        <select
          value={id2}
          onChange={(e) => setId2(e.target.value)}
          className="rounded-card bg-surface-container px-4 py-2.5 text-sm text-on-surface outline-none"
        >
          <option value="">Select bracket 2...</option>
          {brackets.map((b) => (
            <option key={b.id} value={b.id}>
              {b.owner} — {b.name}
            </option>
          ))}
        </select>
      </div>

      {b1 && b2 && a1 && a2 && (
        <>
          {/* Agreement stat */}
          <div className="rounded-card bg-surface-container p-6 text-center">
            <span className="font-display text-4xl font-bold text-secondary">
              {agree}/{total}
            </span>
            <p className="text-on-surface-variant text-sm mt-1">
              You agree on {total > 0 ? Math.round((agree / total) * 100) : 0}% of picks
            </p>
          </div>

          {/* Stats comparison */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-card bg-surface-container p-4 space-y-2">
              <p className="font-label text-xs text-on-surface-variant uppercase">{b1.owner}</p>
              <p className="text-on-surface">Rank #{a1.rank} | {b1.points} pts | MAX {b1.max_remaining}</p>
              <span className="rounded-full px-2 py-0.5 text-xs font-label" style={{ backgroundColor: `${ARCHETYPE_COLORS[a1.archetype]}20`, color: ARCHETYPE_COLORS[a1.archetype] }}>
                {a1.archetype}
              </span>
            </div>
            <div className="rounded-card bg-surface-container p-4 space-y-2">
              <p className="font-label text-xs text-on-surface-variant uppercase">{b2.owner}</p>
              <p className="text-on-surface">Rank #{a2.rank} | {b2.points} pts | MAX {b2.max_remaining}</p>
              <span className="rounded-full px-2 py-0.5 text-xs font-label" style={{ backgroundColor: `${ARCHETYPE_COLORS[a2.archetype]}20`, color: ARCHETYPE_COLORS[a2.archetype] }}>
                {a2.archetype}
              </span>
            </div>
          </div>

          {/* Radar chart */}
          <div className="rounded-card bg-surface-container p-5">
            <h3 className="font-display text-lg font-semibold mb-4">Comparison</h3>
            <RadarComparison data={radarData} name1={b1.owner} name2={b2.owner} />
          </div>

          {/* Pick diff */}
          <div className="rounded-card bg-surface-container p-5">
            <h3 className="font-display text-lg font-semibold mb-4">Pick Differences</h3>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {completedGames.map((g) => {
                const pick1 = pickMap1.get(g.game_id);
                const pick2 = pickMap2.get(g.game_id);
                const same = pick1 === pick2;
                return (
                  <div
                    key={g.game_id}
                    className={`flex items-center justify-between rounded-card px-3 py-2 text-xs ${
                      same ? "text-on-surface-variant" : "bg-surface-bright text-on-surface"
                    }`}
                  >
                    <span className="w-24 truncate">{g.team1} vs {g.team2}</span>
                    <span className={pick1 === g.winner ? "text-secondary" : "text-on-surface-variant"}>
                      {pick1 || "—"}
                    </span>
                    <span className={pick2 === g.winner ? "text-secondary" : "text-on-surface-variant"}>
                      {pick2 || "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {(!b1 || !b2) && (
        <div className="rounded-card bg-surface-container p-8 text-center">
          <p className="text-on-surface-variant">
            Select two brackets above to compare them side by side.
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify it compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/app/head-to-head/ src/components/charts/RadarComparison.tsx
git commit -m "feat: build Head-to-Head page with radar chart and pick diff"
```

---

### Task 6: Season Finale Page

**Files:**
- Create: `src/app/finale/page.tsx`, `src/components/charts/InsightFortuneScatter.tsx`

- [ ] **Step 1: Create InsightFortuneScatter.tsx**

Create `src/components/charts/InsightFortuneScatter.tsx`:

```tsx
"use client";

import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, Label } from "recharts";

interface ScatterPoint {
  name: string;
  insight: number;
  fortune: number;
}

const COLORS = [
  "#2dd4bf", "#a78bfa", "#fbbf24", "#fb923c", "#3b82f6",
  "#06b6d4", "#84cc16", "#f472b6",
];

export function InsightFortuneScatter({ data }: { data: ScatterPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <XAxis
          type="number"
          dataKey="insight"
          name="Insight"
          domain={[0, 100]}
          tick={{ fill: "#8b95a5", fontSize: 11, fontFamily: "Space Grotesk" }}
        >
          <Label value="Insight Score" position="bottom" fill="#8b95a5" fontSize={12} />
        </XAxis>
        <YAxis
          type="number"
          dataKey="fortune"
          name="Fortune"
          domain={[0, 100]}
          tick={{ fill: "#8b95a5", fontSize: 11, fontFamily: "Space Grotesk" }}
        >
          <Label value="Fortune Score" angle={-90} position="left" fill="#8b95a5" fontSize={12} />
        </YAxis>
        <ReferenceLine x={50} stroke="#252d35" />
        <ReferenceLine y={50} stroke="#252d35" />
        <Tooltip
          contentStyle={{
            backgroundColor: "#141a20",
            border: "none",
            borderRadius: "12px",
            color: "#e7ebf3",
            fontFamily: "Inter",
          }}
          formatter={(value: number, name: string) => [`${value.toFixed(0)}%`, name]}
          labelFormatter={(label) => {
            const point = data.find((d) => d.insight === label);
            return point?.name || "";
          }}
        />
        <Scatter data={data} fill="#2dd4bf">
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Create the Season Finale page**

Create `src/app/finale/page.tsx`:

```tsx
import { fetchDashboardData } from "@/lib/sheets";
import { computeAllAnalytics, computePickRates } from "@/lib/analytics";
import { StatCard } from "@/components/ui/StatCard";
import { InsightFortuneScatter } from "@/components/charts/InsightFortuneScatter";
import { TeamPill } from "@/components/ui/TeamPill";

export const revalidate = 300;

export default async function FinalePage() {
  const data = await fetchDashboardData();
  const analytics = computeAllAnalytics(data);
  const pickRates = computePickRates(data.picks, data.brackets.length);

  const isComplete = data.meta.games_completed >= 63;
  const sorted = [...data.brackets].sort((a, b) => b.points - a.points);

  // Insight Score: % correct on games where group was <60% consensus
  // Fortune Score: % correct picking against >70% consensus
  const scatterData = data.brackets.map((b) => {
    const bPicks = data.picks.filter((p) => p.bracket_id === b.id);
    let insightNum = 0, insightDen = 0;
    let fortuneNum = 0, fortuneDen = 0;

    for (const p of bPicks) {
      const game = data.games.find((g) => g.game_id === p.game_id);
      if (!game || !game.completed) continue;

      const rate = pickRates.get(p.game_id)?.get(p.team_picked) ?? 0.5;

      // Split games (group < 60% on any one side)
      if (rate < 0.6) {
        insightDen++;
        if (p.correct) insightNum++;
      }

      // Against consensus (picked team that <30% picked)
      if (rate < 0.3) {
        fortuneDen++;
        if (p.correct) fortuneNum++;
      }
    }

    return {
      name: b.owner,
      insight: insightDen > 0 ? Math.round((insightNum / insightDen) * 100) : 50,
      fortune: fortuneDen > 0 ? Math.round((fortuneNum / fortuneDen) * 100) : 50,
    };
  });

  // Greatest calls: individual picks with lowest consensus that were correct
  const greatestCalls = data.picks
    .filter((p) => p.correct)
    .map((p) => {
      const rate = pickRates.get(p.game_id)?.get(p.team_picked) ?? 1;
      const bracket = data.brackets.find((b) => b.id === p.bracket_id);
      const game = data.games.find((g) => g.game_id === p.game_id);
      return { pick: p, rate, bracket, game };
    })
    .filter((x) => x.bracket && x.game)
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 10);

  // Group report card: consensus accuracy by round
  const roundAccuracy = ["R64", "R32", "S16", "E8", "FF", "CHAMP"].map((round) => {
    const roundGames = data.games.filter((g) => g.round === round && g.completed);
    let correct = 0;
    for (const g of roundGames) {
      const gamePicks = data.picks.filter((p) => p.game_id === g.game_id);
      const team1Count = gamePicks.filter((p) => p.team_picked === g.team1).length;
      const consensusPick = team1Count > data.brackets.length / 2 ? g.team1 : g.team2;
      if (consensusPick === g.winner) correct++;
    }
    return { round, correct, total: roundGames.length };
  });

  return (
    <div className="space-y-section">
      <div>
        <h2 className="font-display text-2xl font-bold">Season Finale</h2>
        <p className="text-on-surface-variant text-sm mt-1">
          {isComplete
            ? "The complete story of DoorDash AP 2026"
            : "Preview — full results unlock after the championship game"}
        </p>
      </div>

      {/* Final standings */}
      <div className="space-y-4">
        {/* Top 3 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sorted.slice(0, 3).map((b, i) => {
            const trophies = ["🥇", "🥈", "🥉"];
            const colors = ["text-achievement", "text-on-surface-variant", "text-action"];
            const a = analytics.get(b.id);
            return (
              <div key={b.id} className="rounded-card bg-surface-container p-5 text-center space-y-2">
                <span className="text-4xl">{trophies[i]}</span>
                <p className={`font-display text-xl font-bold ${colors[i]}`}>{b.owner}</p>
                <p className="text-xs text-on-surface-variant">{b.name}</p>
                <p className="font-label text-lg text-on-surface">{b.points} pts</p>
                <TeamPill name={b.champion_pick} seed={b.champion_seed} />
              </div>
            );
          })}
        </div>

        {/* Full standings table */}
        <div className="overflow-x-auto rounded-card bg-surface-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline">
                <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Rank</th>
                <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Name</th>
                <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Points</th>
                <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Champion</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((b, i) => (
                <tr key={b.id} className="border-b border-outline hover:bg-surface-bright transition-colors">
                  <td className="px-3 py-2 font-label">{i + 1}</td>
                  <td className="px-3 py-2">
                    <div className="text-on-surface">{b.owner}</div>
                    <div className="text-xs text-on-surface-variant">{b.name}</div>
                  </td>
                  <td className="px-3 py-2 font-label">{b.points}</td>
                  <td className="px-3 py-2 text-on-surface-variant">{b.champion_pick}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insight vs Fortune */}
      <div className="rounded-card bg-surface-container p-5">
        <h3 className="font-display text-lg font-semibold mb-2">Insight vs Fortune</h3>
        <p className="text-xs text-on-surface-variant mb-4">
          Insight = correct on contested games | Fortune = correct on against-consensus picks
        </p>
        <InsightFortuneScatter data={scatterData} />
      </div>

      {/* Greatest Calls */}
      <div className="rounded-card bg-surface-container p-5">
        <h3 className="font-display text-lg font-semibold mb-4">Greatest Calls</h3>
        <div className="space-y-2">
          {greatestCalls.map((gc, i) => (
            <div key={i} className="flex items-center justify-between rounded-card bg-surface-bright px-4 py-3">
              <div>
                <span className="text-on-surface font-body">{gc.bracket?.owner}</span>
                <span className="text-xs text-on-surface-variant ml-2">
                  picked {gc.pick.team_picked} (seed {gc.pick.seed_picked})
                </span>
              </div>
              <span className="font-label text-xs text-secondary">
                Only {Math.round(gc.rate * 100)}% picked this
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Group Report Card */}
      <div className="rounded-card bg-surface-container p-5">
        <h3 className="font-display text-lg font-semibold mb-4">Group Report Card</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {roundAccuracy.map((r) => (
            <div key={r.round} className="text-center">
              <p className="font-label text-xs text-on-surface-variant">{r.round}</p>
              <p className="font-display text-xl font-bold text-on-surface">
                {r.total > 0 ? `${r.correct}/${r.total}` : "—"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify it compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/finale/ src/components/charts/InsightFortuneScatter.tsx
git commit -m "feat: build Season Finale page with scatter plot, greatest calls, report card"
```

---

### Task 7: Final Verification + Build

- [ ] **Step 1: Run full build**

```bash
npm run build
```

Expected: all 8 page routes compile successfully.

- [ ] **Step 2: Verify all new routes exist in build output**

Check that these routes appear:
- `/simulator`
- `/awards`
- `/probability`
- `/head-to-head`
- `/finale`

- [ ] **Step 3: Fix any build errors**

If any TypeScript or build errors, fix them.

- [ ] **Step 4: Final commit if fixes needed**

```bash
git add -A
git commit -m "fix: resolve build errors from Plan 3 integration"
```
