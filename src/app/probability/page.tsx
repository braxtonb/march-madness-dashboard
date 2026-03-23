import { fetchDashboardData } from "@/lib/sheets";
import { ProbabilityClient } from "@/components/ProbabilityClient";

export const dynamic = "force-dynamic";

export default async function ProbabilityPage() {
  const data = await fetchDashboardData();
  const d = data.derived!;

  // Use pre-computed Monte Carlo results from data.json (10,000 iterations at scrape time)
  const simMap = new Map(
    (data.sim_results ?? []).map((s) => [s.bracket_id, s])
  );

  const probData = data.brackets
    .filter((b) => b.champion_pick !== "")
    .map((b) => {
      const sim = simMap.get(b.id);
      return {
        id: b.id,
        name: b.name,
        owner: b.owner,
        full_name: b.full_name,
        probability: sim?.pct_first ?? 0,
        champion: b.champion_pick,
        championSeed: b.champion_seed,
        median_rank: sim?.median_rank ?? data.brackets.length,
        best_rank: sim?.best_rank ?? data.brackets.length,
        max_remaining: b.max_remaining,
        points: b.points,
        pct_first: sim?.pct_first ?? 0,
        pct_second: sim?.pct_second ?? 0,
        pct_third: sim?.pct_third ?? 0,
        pct_top10: sim?.pct_top10 ?? 0,
        pct_top25: sim?.pct_top25 ?? 0,
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

  // Use pre-computed path data
  const pathData = d.path_entries
    .filter((pe) => {
      const b = data.brackets.find((b) => b.id === pe.bracketId);
      return b && b.champion_pick;
    })
    .map((pe) => {
      const b = data.brackets.find((b) => b.id === pe.bracketId)!;
      const champLogo = d.team_logos[b.champion_pick] || "";
      const champAlive = !d.eliminated_teams.includes(b.champion_pick);
      return {
        name: b.name,
        owner: b.owner,
        full_name: b.full_name,
        points: b.points,
        maxRemaining: b.max_remaining,
        champion: b.champion_pick,
        championLogo: champLogo,
        championAlive: champAlive,
        remainingPicks: pe.remainingPicks,
        eliminatedPickCount: pe.eliminatedPickCount,
      };
    })
    .sort((a, b) => (b.points + b.maxRemaining) - (a.points + a.maxRemaining));

  return (
    <ProbabilityClient
      probData={probData}
      journeyData={journeyData}
      journeyBracketNames={journeyBracketNames}
      allSnapshotProbsZero={allSnapshotProbsZero}
      teamLogos={d.team_logos}
      eliminatedTeams={d.eliminated_teams}
      pathData={pathData}
    />
  );
}
