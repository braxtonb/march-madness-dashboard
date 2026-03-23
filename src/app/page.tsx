import { fetchDashboardData } from "@/lib/sheets";
import { LeaderboardContent } from "./LeaderboardContent";
import type { BracketAnalytics } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const data = await fetchDashboardData();
  const d = data.derived!;

  const { brackets, meta } = data;

  // Convert pre-computed analytics object to Map
  const analytics = new Map<string, BracketAnalytics>(
    Object.entries(d.analytics)
  );

  const eliminatedTeams = new Set<string>(d.eliminated_teams);

  // Most popular champion still standing
  const submittedBrackets = brackets.filter((b) => b.champion_pick);
  const champCounts = new Map<string, number>();
  for (const b of submittedBrackets) {
    if (!eliminatedTeams.has(b.champion_pick)) {
      champCounts.set(b.champion_pick, (champCounts.get(b.champion_pick) || 0) + 1);
    }
  }
  const topChampEntry = [...champCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topChamp: [string, number] | null = topChampEntry ? [topChampEntry[0], topChampEntry[1]] : null;

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

  return (
    <LeaderboardContent
      brackets={brackets}
      analytics={analytics}
      eliminatedTeams={eliminatedTeams}
      gamesCompleted={meta.games_completed}
      currentRound={meta.current_round}
      topChamp={topChamp}
      risingStars={risingStars}
      inContention={inContention}
      madnessIndex={d.madness_index}
      scatterData={d.scatter_data}
      greatestCalls={d.greatest_calls}
      roundAccuracy={d.round_accuracy}
      submittedCount={d.submitted_count}
      teamLogos={d.team_logos}
      pathEntries={d.path_entries}
      aliveData={d.alive_data}
    />
  );
}
