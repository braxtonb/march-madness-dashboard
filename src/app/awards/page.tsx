import { fetchDashboardData } from "@/lib/sheets";
import { computePickRates } from "@/lib/analytics";
import { AwardCard } from "@/components/ui/AwardCard";
import type { Bracket, Pick, Round } from "@/lib/types";

export const dynamic = "force-dynamic";

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
    awards.push({ title: "The Oracle", winner: b.name, bracketName: b.owner, stat: `${oracleBest.count} correct picks this round`, tier: "gold" });
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
    awards.push({ title: "The Trendsetter", winner: b.name, bracketName: b.owner, stat: `${trendBest.count} unique correct picks`, tier: "gold" });
  }

  // The Faithful — highest scorer with champion pick
  const sorted = [...brackets].sort((a, b) => b.points - a.points);
  const faithful = sorted.find((b) => b.champion_pick !== "");
  if (faithful) {
    awards.push({ title: "The Faithful", winner: faithful.name, bracketName: faithful.owner, stat: `${faithful.points} pts, champion: ${faithful.champion_pick}`, tier: "silver" });
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
    awards.push({ title: "Hot Streak", winner: b.name, bracketName: b.owner, stat: `${streakBest.count} consecutive correct picks`, tier: "silver" });
  }

  // Momentum Builder — biggest rank climb
  let momentumBest = { id: "", delta: 0 };
  for (const b of brackets) {
    const delta = b.prev_rank > 0 ? b.prev_rank - (sorted.indexOf(b) + 1) : 0;
    if (delta > momentumBest.delta) momentumBest = { id: b.id, delta };
  }
  if (momentumBest.id) {
    const b = bracketMap.get(momentumBest.id)!;
    awards.push({ title: "Momentum Builder", winner: b.name, bracketName: b.owner, stat: `Climbed ${momentumBest.delta} ranks this round`, tier: "bronze" });
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
    awards.push({ title: "The People's Champion", winner: b.name, bracketName: b.owner, stat: `${peopleBest.count} picks aligned with group consensus`, tier: "bronze" });
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
