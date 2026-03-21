import { fetchDashboardData } from "@/lib/sheets";
import { computePickRates } from "@/lib/analytics";
import { FinaleContent } from "./FinaleContent";

export const dynamic = "force-dynamic";

export default async function FinalePage() {
  const data = await fetchDashboardData();
  const pickRates = computePickRates(data.picks, data.brackets.length);

  const isComplete = data.meta.games_completed >= 63;
  const sorted = [...data.brackets]
    .sort((a, b) => b.points - a.points)
    .map((b) => ({
      id: b.id,
      name: b.name,
      owner: b.owner,
      points: b.points,
      champion_pick: b.champion_pick,
      champion_seed: b.champion_seed,
    }));

  // Insight & Fortune scores
  const scatterData = data.brackets.map((b) => {
    const bPicks = data.picks.filter((p) => p.bracket_id === b.id);
    let insightNum = 0, insightDen = 0;
    let fortuneNum = 0, fortuneDen = 0;

    for (const p of bPicks) {
      const game = data.games.find((g) => g.game_id === p.game_id);
      if (!game || !game.completed) continue;
      const rate = pickRates.get(p.game_id)?.get(p.team_picked) ?? 0.5;
      if (rate < 0.6) { insightDen++; if (p.correct) insightNum++; }
      if (rate < 0.3) { fortuneDen++; if (p.correct) fortuneNum++; }
    }

    return {
      name: b.name,
      insight: insightDen > 0 ? Math.round((insightNum / insightDen) * 100) : 50,
      fortune: fortuneDen > 0 ? Math.round((fortuneNum / fortuneDen) * 100) : 50,
    };
  });

  // Greatest calls
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
    .slice(0, 10)
    .map((gc) => ({
      bracketName: gc.bracket!.name,
      bracketOwner: gc.bracket!.owner,
      teamPicked: gc.pick.team_picked,
      seedPicked: gc.pick.seed_picked,
      rate: gc.rate,
      round: gc.game?.round ?? "",
    }));

  // Group report card
  const roundAccuracy = (["R64", "R32", "S16", "E8", "FF", "CHAMP"] as const).map((round) => {
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
          {isComplete ? "The complete story of DoorDash AP 2026" : "Preview — full results unlock after the championship game"}
        </p>
      </div>
      <FinaleContent
        sorted={sorted}
        scatterData={scatterData}
        greatestCalls={greatestCalls}
        roundAccuracy={roundAccuracy}
        isComplete={isComplete}
      />
    </div>
  );
}
