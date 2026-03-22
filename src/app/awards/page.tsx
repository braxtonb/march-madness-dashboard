import { fetchDashboardData } from "@/lib/sheets";
import { computePickRates } from "@/lib/analytics";
import { ROUND_ORDER } from "@/lib/constants";
import { AwardsClient } from "@/components/ui/AwardsClient";
import type { Award } from "@/components/ui/AwardsClient";
import type { Bracket, Pick, Round } from "@/lib/types";

export const dynamic = "force-dynamic";

const AWARD_DEFINITIONS: { title: string; tier: "gold" | "silver" | "bronze" }[] = [
  { title: "The Oracle", tier: "gold" },
  { title: "The Trendsetter", tier: "gold" },
  { title: "The Faithful", tier: "silver" },
  { title: "Hot Streak", tier: "silver" },
  { title: "Momentum Builder", tier: "bronze" },
  { title: "The People's Champion", tier: "bronze" },
];

function emptyAward(def: { title: string; tier: "gold" | "silver" | "bronze" }): Award {
  return {
    title: def.title,
    winner: "No winner yet",
    bracketName: "",
    stat: "Awaiting results",
    tier: def.tier,
  };
}

function computeAwards(
  brackets: Bracket[],
  picks: Pick[],
  round: Round,
  totalBrackets: number
): Award[] {
  const pickRates = computePickRates(picks, totalBrackets);
  const roundPicks = picks.filter((p) => p.round === round);

  const picksByBracket = new Map<string, Pick[]>();
  for (const p of roundPicks) {
    if (!picksByBracket.has(p.bracket_id)) picksByBracket.set(p.bracket_id, []);
    picksByBracket.get(p.bracket_id)!.push(p);
  }

  const bracketMap = new Map(brackets.map((b) => [b.id, b]));
  const sorted = [...brackets].sort((a, b) => b.points - a.points);

  const awards: Award[] = [];

  // 1. The Oracle — most correct picks this round
  let oracleBest = { id: "", count: 0 };
  for (const [bid, bPicks] of picksByBracket) {
    const correct = bPicks.filter((p) => p.correct).length;
    if (correct > oracleBest.count) oracleBest = { id: bid, count: correct };
  }
  if (oracleBest.id && oracleBest.count > 0) {
    const b = bracketMap.get(oracleBest.id)!;
    awards.push({ title: "The Oracle", winner: b.name, bracketName: b.owner, stat: `${oracleBest.count} correct picks this round`, tier: "gold" });
  }

  // 2. The Trendsetter — most unique correct picks
  let trendBest = { id: "", count: 0 };
  for (const [bid, bPicks] of picksByBracket) {
    const uniqueCorrect = bPicks.filter((p) => {
      if (!p.correct) return false;
      const rate = pickRates.get(p.game_id)?.get(p.team_picked) ?? 1;
      return rate < 0.3;
    }).length;
    if (uniqueCorrect > trendBest.count) trendBest = { id: bid, count: uniqueCorrect };
  }
  if (trendBest.id && trendBest.count > 0) {
    const b = bracketMap.get(trendBest.id)!;
    awards.push({ title: "The Trendsetter", winner: b.name, bracketName: b.owner, stat: `${trendBest.count} unique correct picks`, tier: "gold" });
  }

  // 3. The Faithful — highest scorer whose champion is still alive
  const faithful = sorted.find((b) => b.champion_pick !== "");
  if (faithful) {
    awards.push({ title: "The Faithful", winner: faithful.name, bracketName: faithful.owner, stat: `${faithful.points} pts`, tier: "silver", championName: faithful.champion_pick });
  }

  // 4. Hot Streak — most consecutive correct picks
  let streakBest = { id: "", count: 0 };
  for (const [bid, bPicks] of picksByBracket) {
    let streak = 0, maxStreak = 0;
    for (const p of bPicks) {
      if (p.correct) { streak++; maxStreak = Math.max(maxStreak, streak); }
      else streak = 0;
    }
    if (maxStreak > streakBest.count) streakBest = { id: bid, count: maxStreak };
  }
  if (streakBest.id && streakBest.count > 0) {
    const b = bracketMap.get(streakBest.id)!;
    awards.push({ title: "Hot Streak", winner: b.name, bracketName: b.owner, stat: `${streakBest.count} consecutive correct picks`, tier: "silver" });
  }

  // 5. Momentum Builder — biggest rank climb
  let momentumBest = { id: "", delta: 0 };
  for (const b of brackets) {
    const delta = b.prev_rank > 0 ? b.prev_rank - (sorted.indexOf(b) + 1) : 0;
    if (delta > momentumBest.delta) momentumBest = { id: b.id, delta };
  }
  if (momentumBest.id && momentumBest.delta > 0) {
    const b = bracketMap.get(momentumBest.id)!;
    awards.push({ title: "Momentum Builder", winner: b.name, bracketName: b.owner, stat: `Climbed ${momentumBest.delta} ranks this round`, tier: "bronze" });
  }

  // 6. The People's Champion — most aligned with consensus
  let peopleBest = { id: "", count: 0 };
  for (const [bid, bPicks] of picksByBracket) {
    const consensus = bPicks.filter((p) => {
      const rate = pickRates.get(p.game_id)?.get(p.team_picked) ?? 0;
      return rate > 0.5;
    }).length;
    if (consensus > peopleBest.count) peopleBest = { id: bid, count: consensus };
  }
  if (peopleBest.id && peopleBest.count > 0) {
    const b = bracketMap.get(peopleBest.id)!;
    awards.push({ title: "The People's Champion", winner: b.name, bracketName: b.owner, stat: `${peopleBest.count} picks aligned with group consensus`, tier: "bronze" });
  }

  // Ensure all 6 awards are present. Fill in missing ones with "No winner yet".
  const awardTitles = new Set(awards.map((a) => a.title));
  for (const def of AWARD_DEFINITIONS) {
    if (!awardTitles.has(def.title)) {
      awards.push(emptyAward(def));
    }
  }

  // Sort by the canonical order
  const orderMap = new Map(AWARD_DEFINITIONS.map((d, i) => [d.title, i]));
  awards.sort((a, b) => (orderMap.get(a.title) ?? 99) - (orderMap.get(b.title) ?? 99));

  return awards;
}

export default async function AwardsPage() {
  const data = await fetchDashboardData();
  const currentRound = data.meta.current_round;

  // Show ALL rounds in the selector, including future ones
  const allRounds: Round[] = [...ROUND_ORDER];

  // Compute awards for every round — future rounds with no picks get empty awards
  const awardsByRound: Record<string, Award[]> = {};
  for (const round of allRounds) {
    const hasPicks = data.picks.some((p) => p.round === round);
    if (hasPicks) {
      awardsByRound[round] = computeAwards(data.brackets, data.picks, round, data.brackets.length);
    } else {
      // No completed games for this round — show all 6 empty award cards
      awardsByRound[round] = AWARD_DEFINITIONS.map((def) => emptyAward(def));
    }
  }

  // Default to the latest round that has picks, or the current round
  const roundsWithPicks = allRounds.filter((r) => data.picks.some((p) => p.round === r));
  const defaultRound = roundsWithPicks.length > 0
    ? roundsWithPicks[roundsWithPicks.length - 1]
    : currentRound;

  // Build team logo lookup and inject logos into awards that have championName
  const teamLogos: Record<string, string> = Object.fromEntries(
    data.teams.map((t) => [t.name, t.logo])
  );
  for (const awards of Object.values(awardsByRound)) {
    for (const award of awards) {
      if (award.championName && teamLogos[award.championName]) {
        award.championLogo = teamLogos[award.championName];
      }
    }
  }

  return (
    <div className="space-y-section">
      <div>
        <h2 className="font-display text-2xl font-bold">Tournament Awards</h2>
        <p className="text-on-surface-variant text-sm mt-1">
          Celebrating the best bracket moves each round
        </p>
      </div>

      <AwardsClient
        awardsByRound={awardsByRound}
        completedRounds={allRounds}
        currentRound={defaultRound}
      />
    </div>
  );
}
