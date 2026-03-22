import type {
  Bracket, Pick, Game, Team, Archetype, BracketAnalytics, DashboardData,
} from "./types";

/**
 * Compute pick rates: for each game, what fraction of brackets picked each team.
 * Returns Map<game_id, Map<team_name, pick_rate>>
 */
export function computePickRates(
  picks: Pick[],
  totalBrackets: number
): Map<string, Map<string, number>> {
  const counts = new Map<string, Map<string, number>>();
  for (const p of picks) {
    if (!counts.has(p.game_id)) counts.set(p.game_id, new Map());
    const game = counts.get(p.game_id)!;
    game.set(p.team_picked, (game.get(p.team_picked) || 0) + 1);
  }
  const rates = new Map<string, Map<string, number>>();
  for (const [gid, teamCounts] of Array.from(counts.entries())) {
    const rateMap = new Map<string, number>();
    for (const [team, count] of Array.from(teamCounts.entries())) {
      rateMap.set(team, count / totalBrackets);
    }
    rates.set(gid, rateMap);
  }
  return rates;
}

/**
 * Uniqueness score for a bracket: average(1 - pickRate) across all 63 picks.
 */
export function computeUniqueness(
  bracketPicks: Pick[],
  pickRates: Map<string, Map<string, number>>
): number {
  if (bracketPicks.length === 0) return 0;
  let sum = 0;
  for (const p of bracketPicks) {
    const gameRates = pickRates.get(p.game_id);
    const rate = gameRates?.get(p.team_picked) ?? 0.5;
    sum += 1 - rate;
  }
  return sum / bracketPicks.length;
}

/**
 * Classify a bracket into an archetype.
 * - Strategist: <5 upsets picked, 1-seed champion
 * - Visionary: >15 upsets picked OR champion seed >4
 * - Scout: 3+ seeds 10+ picked past R64
 * - Original: uniqueness > 0.6
 * - Analyst: default (closest to expected-value optimal)
 */
export function classifyArchetype(
  bracket: Bracket,
  bracketPicks: Pick[],
  uniqueness: number
): Archetype {
  let upsetCount = 0;
  let highSeedPastR64 = 0;

  for (const p of bracketPicks) {
    if (p.seed_picked > 8 && p.round !== "R64") {
      if (p.seed_picked >= 10) highSeedPastR64++;
    }
    if (p.seed_picked > 8) upsetCount++;
  }

  if (uniqueness > 0.6) return "Original";
  if (highSeedPastR64 >= 3) return "Scout";
  if (upsetCount > 15 || bracket.champion_seed > 4) return "Visionary";
  if (upsetCount < 5 && bracket.champion_seed === 1) return "Strategist";
  return "Analyst";
}

/**
 * Madness Index: how wild the tournament has been for the group.
 * sum(seedDiff * roundWeight) / gamesPlayed, normalized 0-100.
 */
export function computeMadnessIndex(games: Game[]): number {
  const roundWeights: Record<string, number> = {
    R64: 1, R32: 2, S16: 4, E8: 8, FF: 16, CHAMP: 32,
  };
  const completedGames = games.filter((g) => g.completed && g.winner);
  if (completedGames.length === 0) return 0;

  let madnessSum = 0;
  for (const g of completedGames) {
    const winnerSeed = g.winner === g.team1 ? g.seed1 : g.seed2;
    const loserSeed = g.winner === g.team1 ? g.seed2 : g.seed1;
    if (winnerSeed > loserSeed) {
      const seedDiff = winnerSeed - loserSeed;
      const weight = roundWeights[g.round] || 1;
      madnessSum += seedDiff * weight;
    }
  }

  const maxMadness = completedGames.reduce(
    (sum, g) => sum + 15 * (roundWeights[g.round] || 1),
    0
  );
  return maxMadness > 0 ? Math.round((madnessSum / maxMadness) * 100) : 0;
}

/**
 * Estimated win probability (leaderboard shortcut — not Monte Carlo).
 * max(0, 1 - (leaderPts - myPts) / myMaxRemaining)
 */
export function computeEstimatedWinProb(
  bracket: Bracket,
  leaderPoints: number
): number {
  if (bracket.max_remaining <= 0) return 0;
  const prob = Math.max(
    0,
    1 - (leaderPoints - bracket.points) / bracket.max_remaining
  );
  return Math.round(prob * 1000) / 10;
}

/**
 * Compute full analytics for all brackets.
 */
export function computeAllAnalytics(data: DashboardData): Map<string, BracketAnalytics> {
  const { brackets, picks, teams } = data;

  const pickRates = computePickRates(picks, brackets.length);

  const picksByBracket = new Map<string, Pick[]>();
  for (const p of picks) {
    if (!picksByBracket.has(p.bracket_id)) picksByBracket.set(p.bracket_id, []);
    picksByBracket.get(p.bracket_id)!.push(p);
  }

  const eliminatedTeams = new Set(
    teams.filter((t) => t.eliminated).map((t) => t.name)
  );

  // Sort brackets: points DESC, max_remaining DESC, name ASC
  const sorted = [...brackets].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.max_remaining !== a.max_remaining) return b.max_remaining - a.max_remaining;
    return a.name.localeCompare(b.name);
  });
  const leaderPoints = sorted[0]?.points || 0;

  // Assign ranks with ties (RANK style, not DENSE_RANK)
  const ranks: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      ranks.push(1);
    } else if (sorted[i].points === sorted[i-1].points && sorted[i].max_remaining === sorted[i-1].max_remaining) {
      ranks.push(ranks[i-1]); // same rank for ties
    } else {
      ranks.push(i + 1); // skip ranks (RANK style)
    }
  }

  const result = new Map<string, BracketAnalytics>();

  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i];
    const rank = ranks[i];
    const rank_delta = b.prev_rank > 0 ? b.prev_rank - rank : 0;
    const bracketPicks = picksByBracket.get(b.id) || [];
    const uniqueness = computeUniqueness(bracketPicks, pickRates);
    const archetype = classifyArchetype(b, bracketPicks, uniqueness);
    const estimated_win_prob = computeEstimatedWinProb(b, leaderPoints);
    const champion_alive = !eliminatedTeams.has(b.champion_pick);

    const ffTeams = [b.ff1, b.ff2, b.ff3, b.ff4].filter(Boolean);
    const final_four_alive = ffTeams.filter(
      (t) => !eliminatedTeams.has(t)
    ).length;

    result.set(b.id, {
      rank,
      rank_delta,
      uniqueness,
      archetype,
      estimated_win_prob,
      champion_alive,
      final_four_alive,
    });
  }

  return result;
}

/**
 * Group accuracy: how many games the group consensus got right in a round.
 */
export function computeGroupAccuracy(
  picks: Pick[],
  games: Game[],
  round: string,
  totalBrackets: number
): { correct: number; total: number; nationalCorrect: number } {
  const roundGames = games.filter((g) => g.round === round && g.completed);
  let correct = 0;
  let nationalCorrect = 0;

  for (const g of roundGames) {
    const gamePicks = picks.filter((p) => p.game_id === g.game_id);
    const team1Count = gamePicks.filter(
      (p) => p.team_picked === g.team1
    ).length;
    const consensusPick =
      team1Count > totalBrackets / 2 ? g.team1 : g.team2;
    if (consensusPick === g.winner) correct++;

    const nationalConsensusPick =
      g.national_pct_team1 > 50 ? g.team1 : g.team2;
    if (nationalConsensusPick === g.winner) nationalCorrect++;
  }

  return { correct, total: roundGames.length, nationalCorrect };
}
