import { fetchDashboardData } from "@/lib/sheets";
import { computeAllAnalytics } from "@/lib/analytics";
import { runMonteCarlo } from "@/lib/montecarlo";
import { ProbabilityClient } from "@/components/ProbabilityClient";

export const dynamic = "force-dynamic";

export default async function ProbabilityPage() {
  const data = await fetchDashboardData();
  const analytics = computeAllAnalytics(data);
  const simResults = runMonteCarlo(data.brackets, data.picks, data.games, 1000);

  const probData = data.brackets
    .filter((b) => b.champion_pick !== "")
    .map((b) => {
      const sim = simResults.get(b.id);
      return {
        id: b.id,
        name: b.name,
        owner: b.owner,
        probability: sim ? (sim.wins / 1000) * 100 : 0,
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

  // Build team logo lookup
  const teamLogos: Record<string, string> = Object.fromEntries(
    data.teams.map((t) => [t.name, t.logo])
  );

  // Build eliminated teams set
  const eliminatedTeams = new Set<string>();
  for (const g of data.games) {
    if (g.completed && g.winner) {
      if (g.team1 && g.team1 !== g.winner) eliminatedTeams.add(g.team1);
      if (g.team2 && g.team2 !== g.winner) eliminatedTeams.add(g.team2);
    }
  }

  // Path to victory: for each bracket, list their remaining picks that are still alive
  const ROUND_PTS: Record<string, number> = { R64: 10, R32: 20, S16: 40, E8: 80, FF: 160, CHAMP: 320 };
  const completedGameIds = new Set(data.games.filter((g) => g.completed).map((g) => g.game_id));

  const pathData = data.brackets
    .filter((b) => b.champion_pick)
    .map((b) => {
      const bPicks = data.picks.filter((p) => p.bracket_id === b.id);
      const remainingPicks = bPicks
        .filter((p) => !completedGameIds.has(p.game_id) && p.team_picked && !eliminatedTeams.has(p.team_picked))
        .map((p) => ({
          round: p.round,
          team: p.team_picked,
          seed: p.seed_picked,
          pts: ROUND_PTS[p.round] || 0,
          logo: teamLogos[p.team_picked] || "",
        }));
      const eliminatedPicks = bPicks
        .filter((p) => !completedGameIds.has(p.game_id) && p.team_picked && eliminatedTeams.has(p.team_picked))
        .length;
      return {
        name: b.name,
        owner: b.owner,
        points: b.points,
        maxRemaining: b.max_remaining,
        champion: b.champion_pick,
        championLogo: teamLogos[b.champion_pick] || "",
        championAlive: !eliminatedTeams.has(b.champion_pick),
        remainingPicks,
        eliminatedPickCount: eliminatedPicks,
      };
    })
    .sort((a, b) => (b.points + b.maxRemaining) - (a.points + a.maxRemaining));

  // ── Alive Board data ──
  const { brackets, picks, games } = data;

  const champAlive = brackets.filter(
    (b) => b.champion_pick && !eliminatedTeams.has(b.champion_pick)
  ).length;

  // Build a map of bracket_id -> set of Final Four teams from E8 picks
  const bracketFFPicks = new Map<string, Set<string>>();
  for (const p of picks) {
    if (p.round === "E8") {
      if (!bracketFFPicks.has(p.bracket_id))
        bracketFFPicks.set(p.bracket_id, new Set());
      if (p.team_picked) bracketFFPicks.get(p.bracket_id)!.add(p.team_picked);
    }
  }

  function getFFTeams(b: (typeof brackets)[0]): string[] {
    const fromFields = [b.ff1, b.ff2, b.ff3, b.ff4].filter(Boolean);
    const fromPicks = bracketFFPicks.get(b.id);
    const combined = new Set([...fromFields, ...(fromPicks ? [...fromPicks] : [])]);
    return [...combined];
  }

  const ff3Plus = brackets.filter((b) => {
    const ffTeams = getFFTeams(b);
    const alive = ffTeams.filter((t) => !eliminatedTeams.has(t)).length;
    return alive >= 3;
  }).length;

  const ff2Plus = brackets.filter((b) => {
    const ffTeams = getFFTeams(b);
    const alive = ffTeams.filter((t) => !eliminatedTeams.has(t)).length;
    return alive >= 2;
  }).length;

  const upcomingGames = games.filter(
    (g) => !g.completed && g.team1 && g.team2
  );
  const gamesToWatch = upcomingGames
    .map((g) => {
      const affectedBrackets = brackets.filter(
        (b) =>
          b.champion_pick === g.team1 || b.champion_pick === g.team2
      );
      const affectedNames = affectedBrackets.map((b) => ({
        name: b.name,
        owner: b.owner,
        champion: b.champion_pick,
      }));
      return {
        gameId: g.game_id,
        seed1: g.seed1,
        team1: g.team1,
        seed2: g.seed2,
        team2: g.team2,
        round: g.round,
        affectedCount: affectedBrackets.length,
        affectedBrackets: affectedNames,
      };
    })
    .filter((x) => x.affectedCount > 0)
    .sort((a, b) => b.affectedCount - a.affectedCount)
    .slice(0, 5);

  // Serialize FF teams map for client component
  const bracketFFTeamsMap: Record<string, string[]> = {};
  for (const b of brackets) {
    bracketFFTeamsMap[b.id] = getFFTeams(b);
  }

  const analyticsObj = Object.fromEntries(analytics);
  const eliminatedArr = [...eliminatedTeams];

  const aliveData = {
    champAlive,
    ff3Plus,
    ff2Plus,
    gamesRemaining: 63 - data.meta.games_completed,
    gamesToWatch,
    brackets,
    analyticsObj,
    eliminatedArr,
    bracketFFTeamsMap,
  };

  return (
    <ProbabilityClient
      probData={probData}
      journeyData={journeyData}
      journeyBracketNames={journeyBracketNames}
      allSnapshotProbsZero={allSnapshotProbsZero}
      teamLogos={teamLogos}
      eliminatedTeams={eliminatedArr}
      pathData={pathData}
      aliveData={aliveData}
    />
  );
}
