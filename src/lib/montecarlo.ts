import type { Bracket, Game, Pick, Round } from "./types";
import { SEED_WIN_RATES, ROUND_POINTS } from "./constants";

export interface SimResult {
  bracket_id: string;
  wins: number;
  avg_final_points: number;
  median_rank: number;
  best_rank: number;
  /** How often this bracket finished in each placement tier (out of iterations) */
  pct_first: number;
  pct_second: number;
  pct_third: number;
  pct_top10: number;
  pct_top25: number;
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
      pts.length > 0 ? pts.reduce((a, v) => a + v, 0) / pts.length : 0;
    const sortedRanks = [...ranks].sort((a, v) => a - v);
    const medianRank =
      sortedRanks.length > 0
        ? sortedRanks[Math.floor(sortedRanks.length / 2)]
        : brackets.length;
    const bestRank = sortedRanks.length > 0 ? sortedRanks[0] : brackets.length;

    // Compute placement percentages from rank distribution
    const n = iterations;
    const firstCount = ranks.filter((r) => r === 1).length;
    const secondCount = ranks.filter((r) => r === 2).length;
    const thirdCount = ranks.filter((r) => r === 3).length;
    const top10Count = ranks.filter((r) => r <= 10).length;
    const top25Count = ranks.filter((r) => r <= 25).length;

    results.set(b.id, {
      bracket_id: b.id,
      wins: winCounts.get(b.id) || 0,
      avg_final_points: Math.round(avgPts),
      median_rank: medianRank,
      best_rank: bestRank,
      pct_first: Math.round((firstCount / n) * 1000) / 10,
      pct_second: Math.round((secondCount / n) * 1000) / 10,
      pct_third: Math.round((thirdCount / n) * 1000) / 10,
      pct_top10: Math.round((top10Count / n) * 1000) / 10,
      pct_top25: Math.round((top25Count / n) * 1000) / 10,
    });
  }

  return results;
}
