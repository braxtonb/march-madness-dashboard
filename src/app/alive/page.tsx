import { fetchDashboardData } from "@/lib/sheets";
import { computeAllAnalytics } from "@/lib/analytics";
import { StatCard } from "@/components/ui/StatCard";
import { ChampionDonut } from "@/components/charts/ChampionDonut";
import { AliveContent } from "./AliveContent";
import { GamesToWatch } from "./GamesToWatch";

export const dynamic = "force-dynamic";

export default async function AliveBoardPage() {
  const data = await fetchDashboardData();
  const analytics = computeAllAnalytics(data);

  const { brackets, picks, teams, games } = data;

  // Derive elimination from game results: a team is eliminated if it lost a completed game
  const eliminatedTeams = new Set<string>();
  for (const g of games) {
    if (g.completed && g.winner) {
      if (g.team1 && g.team1 !== g.winner) eliminatedTeams.add(g.team1);
      if (g.team2 && g.team2 !== g.winner) eliminatedTeams.add(g.team2);
    }
  }

  const champAlive = brackets.filter(
    (b) => b.champion_pick && !eliminatedTeams.has(b.champion_pick)
  ).length;

  // Build a map of bracket_id -> set of FF-round picked teams from picks data.
  // This is more reliable than ff1-ff4 fields which may have empty strings.
  const bracketFFPicks = new Map<string, Set<string>>();
  for (const p of picks) {
    if (p.round === "FF" || p.round === "CHAMP") {
      if (!bracketFFPicks.has(p.bracket_id))
        bracketFFPicks.set(p.bracket_id, new Set());
      bracketFFPicks.get(p.bracket_id)!.add(p.team_picked);
    }
  }

  // For each bracket, gather unique FF teams from both picks data and ff1-ff4 fields
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

  const champCounts = new Map<string, number>();
  for (const b of brackets) {
    if (b.champion_pick) {
      champCounts.set(
        b.champion_pick,
        (champCounts.get(b.champion_pick) || 0) + 1
      );
    }
  }
  const champDistribution = [...champCounts.entries()]
    .map(([name, count]) => ({
      name,
      count,
      alive: !eliminatedTeams.has(name),
    }))
    .sort((a, b) => b.count - a.count);

  const upcomingGames = games.filter((g) => !g.completed);
  const gamesToWatch = upcomingGames
    .map((g) => {
      const affectedBrackets = brackets.filter(
        (b) =>
          b.champion_pick === g.team1 || b.champion_pick === g.team2
      );
      const affectedNames = affectedBrackets.map((b) => ({
        name: b.name,
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

  // Serialize for client component
  const analyticsObj = Object.fromEntries(analytics);
  const eliminatedArr = [...eliminatedTeams];

  return (
    <div className="space-y-section">
      <div>
        <h2 className="font-display text-2xl font-bold">Alive Board</h2>
        <p className="text-on-surface-variant text-sm mt-1">
          Track which predictions are still in play
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Champion Alive"
          value={champAlive}
          subtitle="brackets still have their champion"
        />
        <StatCard
          label="3+ Final Four Teams"
          value={ff3Plus}
          subtitle="brackets have 3+ Final Four teams left"
        />
        <StatCard
          label="2+ Final Four Teams"
          value={ff2Plus}
          subtitle="brackets have 2+ Final Four teams left"
        />
        <StatCard
          label="Games Remaining"
          value={63 - data.meta.games_completed}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-section">
        <div className="rounded-card bg-surface-container p-5">
          <h3 className="font-display text-lg font-semibold mb-4">
            Champion Distribution
          </h3>
          <ChampionDonut data={champDistribution} />
        </div>

        <GamesToWatch games={gamesToWatch} />
      </div>

      <AliveContent
        brackets={brackets}
        analyticsObj={analyticsObj}
        eliminatedArr={eliminatedArr}
        bracketFFTeamsMap={bracketFFTeamsMap}
      />
    </div>
  );
}
