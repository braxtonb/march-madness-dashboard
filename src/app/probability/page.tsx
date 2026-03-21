import { fetchDashboardData } from "@/lib/sheets";
import { runMonteCarlo } from "@/lib/montecarlo";
import { ProbabilityClient } from "@/components/ProbabilityClient";

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

  // Check if snapshots have meaningful win_prob values
  const allSnapshotProbsZero = data.snapshots.length === 0 ||
    data.snapshots.every((s) => s.win_prob === 0);

  let journeyData: { round: string; [key: string]: string | number }[] = [];
  let journeyBracketNames: string[] = [];

  if (!allSnapshotProbsZero) {
    const top10Ids = probData.slice(0, 10).map((d) => d.name);
    const journeyRounds = [...new Set(data.snapshots.map((s) => s.round))];
    const bracketNameMap = new Map(data.brackets.map((b) => [b.id, b.name]));

    journeyData = journeyRounds.map((round) => {
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
    journeyBracketNames = top10Ids;
  }

  return (
    <ProbabilityClient
      probData={probData}
      journeyData={journeyData}
      journeyBracketNames={journeyBracketNames}
      allSnapshotProbsZero={allSnapshotProbsZero}
    />
  );
}
