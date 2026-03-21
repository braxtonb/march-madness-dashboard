import { fetchDashboardData } from "@/lib/sheets";
import { runMonteCarlo } from "@/lib/montecarlo";
import { StatCard } from "@/components/ui/StatCard";
import { WinProbBar } from "@/components/charts/WinProbBar";
import { ProbabilityJourney } from "@/components/charts/ProbabilityJourney";

export const dynamic = "force-dynamic";

export default async function ProbabilityPage() {
  const data = await fetchDashboardData();
  const simResults = runMonteCarlo(data.brackets, data.picks, data.games, 1000);

  const probData = data.brackets
    .map((b) => {
      const sim = simResults.get(b.id);
      return {
        name: b.name,
        owner: b.owner,
        probability: sim ? (sim.wins / 1000) * 100 : 0,
        champion: b.champion_pick,
        median_rank: sim?.median_rank ?? data.brackets.length,
        best_rank: sim?.best_rank ?? data.brackets.length,
      };
    })
    .sort((a, b) => b.probability - a.probability);

  const top10Ids = probData.slice(0, 10).map((d) => d.name);
  const journeyRounds = [...new Set(data.snapshots.map((s) => s.round))];
  const bracketNameMap = new Map(data.brackets.map((b) => [b.id, b.name]));

  const journeyData = journeyRounds.map((round) => {
    const point: Record<string, string | number> = { round };
    const roundSnaps = data.snapshots.filter((s) => s.round === round);
    for (const snap of roundSnaps) {
      const name = bracketNameMap.get(snap.bracket_id) || snap.bracket_id;
      if (top10Ids.includes(name)) {
        point[name] = Math.round(snap.win_prob * 100 * 10) / 10;
      }
    }
    return point as { round: string; [bracketName: string]: string | number };
  });

  const topContender = probData[0];

  return (
    <div className="space-y-section">
      <div>
        <h2 className="font-display text-2xl font-bold">Win Probability</h2>
        <p className="text-on-surface-variant text-sm mt-1">
          We simulated the rest of the tournament 1,000 times to estimate everyone&apos;s chances
        </p>
      </div>

      <div className="rounded-card bg-surface-container p-4 space-y-2">
        <p className="text-sm text-on-surface-variant">
          Based on historical NCAA tournament seed win rates, we simulate 1,000 possible
          tournament outcomes. Each bracket&apos;s win probability is how often it finishes
          first across all simulations.
        </p>
        <p className="text-sm text-on-surface-variant">
          Note: Even a 50% probability means there&apos;s a coin-flip chance someone else wins.
          The tournament&apos;s remaining games create significant uncertainty — high probability
          doesn&apos;t mean guaranteed victory, only that they win most often across simulations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Top Contender" value={topContender?.name || "—"} subtitle={topContender ? `${topContender.probability.toFixed(1)}% win probability` : undefined} />
        <StatCard label="Brackets With a Shot" value={probData.filter((d) => d.probability > 0).length} subtitle="have non-zero win probability" />
        <StatCard label="Simulations Run" value="1,000" />
      </div>

      <div className="rounded-card bg-surface-container p-5">
        <h3 className="font-display text-lg font-semibold mb-4">Win Probability</h3>
        <WinProbBar data={probData.filter((d) => d.probability > 0)} />
      </div>

      {journeyData.length > 0 && (
        <div className="rounded-card bg-surface-container p-5">
          <h3 className="font-display text-lg font-semibold mb-4">Probability Journey</h3>
          <ProbabilityJourney data={journeyData} bracketNames={top10Ids} />
        </div>
      )}

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
                  <td className="px-3 py-2">
                    <div className="text-on-surface">{d.name}</div>
                    <div className="text-xs text-on-surface-variant">{d.owner}</div>
                  </td>
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
