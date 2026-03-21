import { fetchDashboardData } from "@/lib/sheets";
import { computeAllAnalytics, computeMadnessIndex } from "@/lib/analytics";
import { StatCard } from "@/components/ui/StatCard";
import { LeaderboardTable } from "@/components/tables/LeaderboardTable";
import { MadnessGauge } from "@/components/charts/MadnessGauge";

export const revalidate = 300;

export default async function LeaderboardPage() {
  const data = await fetchDashboardData();
  const analytics = computeAllAnalytics(data);

  const { brackets, games, teams, meta } = data;

  const gamesCompleted = meta.games_completed;
  const eliminatedTeams = new Set(
    teams.filter((t) => t.eliminated).map((t) => t.name)
  );

  // Most popular champion still standing
  const champCounts = new Map<string, number>();
  for (const b of brackets) {
    if (b.champion_pick && !eliminatedTeams.has(b.champion_pick)) {
      champCounts.set(
        b.champion_pick,
        (champCounts.get(b.champion_pick) || 0) + 1
      );
    }
  }
  const topChamp = [...champCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  // Rising Stars: top 3 rank climbers
  const risingStars = [...brackets]
    .map((b) => ({ bracket: b, analytics: analytics.get(b.id)! }))
    .filter((x) => x.analytics && x.analytics.rank_delta > 0)
    .sort((a, b) => b.analytics.rank_delta - a.analytics.rank_delta)
    .slice(0, 3);

  // Still in contention
  const inContention = [...analytics.values()].filter(
    (a) => a.estimated_win_prob > 0
  ).length;

  // Madness Index
  const madnessIndex = computeMadnessIndex(games);

  // Group resilience
  const avgMaxRemaining =
    brackets.reduce((sum, b) => sum + b.max_remaining, 0) / brackets.length;
  const totalPossiblePoints = 1920;
  const groupResilience = Math.round(
    (avgMaxRemaining / totalPossiblePoints) * 100
  );

  return (
    <div className="space-y-section">
      <div>
        <h2 className="font-display text-2xl font-bold">Leaderboard</h2>
        <p className="text-on-surface-variant text-sm mt-1">
          Championship standings and tournament pulse
        </p>
      </div>

      {/* Hero stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Brackets" value={brackets.length} />
        <StatCard label="Games Completed" value={`${gamesCompleted}/63`} />
        <StatCard label="Current Round" value={meta.current_round} />
        <StatCard
          label="Top Champion Pick"
          value={topChamp ? topChamp[0] : "—"}
          subtitle={topChamp ? `${topChamp[1]} brackets` : undefined}
        />
      </div>

      {/* Leaderboard table */}
      <LeaderboardTable
        brackets={brackets}
        analytics={analytics}
        eliminatedTeams={eliminatedTeams}
      />

      {/* Rising Stars + Contention */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-card bg-surface-container p-5 space-y-3">
          <h3 className="font-display text-lg font-semibold">Rising Stars</h3>
          {risingStars.length === 0 && (
            <p className="text-on-surface-variant text-sm">
              No rank changes yet this round.
            </p>
          )}
          {risingStars.map(({ bracket, analytics: a }) => (
            <div
              key={bracket.id}
              className="flex items-center justify-between rounded-card bg-surface-bright px-4 py-3"
            >
              <div>
                <span className="font-body text-on-surface">
                  {bracket.owner}
                </span>
                <span className="text-xs text-on-surface-variant ml-2">
                  {bracket.name}
                </span>
              </div>
              <span className="font-label text-secondary font-semibold">
                +{a.rank_delta} ranks
              </span>
            </div>
          ))}
        </div>

        <div className="rounded-card bg-surface-container p-5 flex flex-col items-center justify-center">
          <span className="font-display text-4xl font-bold text-secondary">
            {inContention}
          </span>
          <span className="text-on-surface-variant text-sm mt-1">
            brackets can still mathematically win
          </span>
        </div>
      </div>

      {/* Tournament Pulse */}
      <div className="rounded-card bg-surface-container p-5 space-y-4">
        <h3 className="font-display text-lg font-semibold">Tournament Pulse</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <MadnessGauge value={madnessIndex} />
          <div className="space-y-3">
            <StatCard
              label="Group Resilience"
              value={`${groupResilience}%`}
              subtitle="of picks still possible on average"
            />
          </div>
          <div className="space-y-2">
            <p className="font-label text-xs text-on-surface-variant uppercase tracking-wider">
              What the number means
            </p>
            <p className="text-sm text-on-surface-variant">
              {madnessIndex < 30
                ? "A calm tournament so far — chalk is holding."
                : madnessIndex < 60
                  ? "Typical March Madness — some surprises keeping it exciting."
                  : "Wild tournament — bold bracket pickers are being rewarded."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
