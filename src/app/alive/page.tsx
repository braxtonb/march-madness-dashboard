import { fetchDashboardData } from "@/lib/sheets";
import { computeAllAnalytics } from "@/lib/analytics";
import { StatCard } from "@/components/ui/StatCard";
import { ChampionDonut } from "@/components/charts/ChampionDonut";
import { AliveContent } from "./AliveContent";

export const revalidate = 300;

export default async function AliveBoardPage() {
  const data = await fetchDashboardData();
  const analytics = computeAllAnalytics(data);

  const { brackets, teams, games } = data;

  const eliminatedTeams = new Set(
    teams.filter((t) => t.eliminated).map((t) => t.name)
  );

  const champAlive = brackets.filter(
    (b) => b.champion_pick && !eliminatedTeams.has(b.champion_pick)
  ).length;

  const ff3Plus = brackets.filter((b) => {
    const ffTeams = [b.ff1, b.ff2, b.ff3, b.ff4].filter(Boolean);
    const alive = ffTeams.filter((t) => !eliminatedTeams.has(t)).length;
    return alive >= 3;
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
      const affectedCount = brackets.filter(
        (b) =>
          b.champion_pick === g.team1 || b.champion_pick === g.team2
      ).length;
      return { game: g, affectedCount };
    })
    .filter((x) => x.affectedCount > 0)
    .sort((a, b) => b.affectedCount - a.affectedCount)
    .slice(0, 3);

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
          label="3+ Final Four"
          value={ff3Plus}
          subtitle="brackets have 3+ FF teams left"
        />
        <StatCard
          label="Total Brackets"
          value={brackets.length}
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

        <div className="rounded-card bg-surface-container p-5 space-y-3">
          <h3 className="font-display text-lg font-semibold">
            Games to Watch
          </h3>
          {gamesToWatch.length === 0 && (
            <p className="text-on-surface-variant text-sm">
              No upcoming games affecting champion picks.
            </p>
          )}
          {gamesToWatch.map(({ game, affectedCount }) => (
            <div
              key={game.game_id}
              className="rounded-card bg-surface-bright p-4 space-y-2"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface">
                  {game.seed1} {game.team1} vs {game.seed2} {game.team2}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Affects {affectedCount} brackets&apos; champion hopes
              </p>
            </div>
          ))}
        </div>
      </div>

      <AliveContent
        brackets={brackets}
        analyticsObj={analyticsObj}
        eliminatedArr={eliminatedArr}
      />
    </div>
  );
}
