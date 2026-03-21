import { fetchDashboardData } from "@/lib/sheets";
import { computeAllAnalytics, computePickRates } from "@/lib/analytics";
import { StatCard } from "@/components/ui/StatCard";
import { InsightFortuneScatter } from "@/components/charts/InsightFortuneScatter";
import { TeamPill } from "@/components/ui/TeamPill";

export const dynamic = "force-dynamic";

export default async function FinalePage() {
  const data = await fetchDashboardData();
  const analytics = computeAllAnalytics(data);
  const pickRates = computePickRates(data.picks, data.brackets.length);

  const isComplete = data.meta.games_completed >= 63;
  const sorted = [...data.brackets].sort((a, b) => b.points - a.points);

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
      name: b.owner,
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
    .slice(0, 10);

  // Group report card
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
          {isComplete ? "The complete story of DoorDash AP 2026" : "Preview — full results unlock after the championship game"}
        </p>
      </div>

      {/* Top 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sorted.slice(0, 3).map((b, i) => {
          const trophies = ["🥇", "🥈", "🥉"];
          const colors = ["text-achievement", "text-on-surface-variant", "text-action"];
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

      {/* Full standings */}
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
                <td className="px-3 py-2"><div className="text-on-surface">{b.owner}</div><div className="text-xs text-on-surface-variant">{b.name}</div></td>
                <td className="px-3 py-2 font-label">{b.points}</td>
                <td className="px-3 py-2 text-on-surface-variant">{b.champion_pick}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Insight vs Fortune */}
      <div className="rounded-card bg-surface-container p-5">
        <h3 className="font-display text-lg font-semibold mb-2">Insight vs Fortune</h3>
        <p className="text-xs text-on-surface-variant mb-4">Insight = correct on contested games | Fortune = correct on against-consensus picks</p>
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
                <span className="text-xs text-on-surface-variant ml-2">picked {gc.pick.team_picked} (seed {gc.pick.seed_picked})</span>
              </div>
              <span className="font-label text-xs text-secondary">Only {Math.round(gc.rate * 100)}% picked this</span>
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
              <p className="font-display text-xl font-bold text-on-surface">{r.total > 0 ? `${r.correct}/${r.total}` : "—"}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
