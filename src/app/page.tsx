import { fetchDashboardData } from "@/lib/sheets";
import { computeAllAnalytics, computeMadnessIndex, computePickRates } from "@/lib/analytics";
import { LeaderboardContent } from "./LeaderboardContent";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const data = await fetchDashboardData();
  const analytics = computeAllAnalytics(data);

  const { brackets, picks, games, teams, meta } = data;

  // Build team logo lookup
  const teamLogos: Record<string, string> = Object.fromEntries(
    teams.map((t) => [t.name, t.logo])
  );

  // Submitted brackets = those with a champion pick
  const submittedBrackets = brackets.filter((b) => b.champion_pick);
  const submittedCount = submittedBrackets.length;

  const pickRates = computePickRates(picks, submittedCount);

  const gamesCompleted = meta.games_completed;

  // Derive elimination from game results
  const eliminatedTeams = new Set<string>();
  for (const g of games) {
    if (g.completed && g.winner) {
      if (g.team1 && g.team1 !== g.winner) eliminatedTeams.add(g.team1);
      if (g.team2 && g.team2 !== g.winner) eliminatedTeams.add(g.team2);
    }
  }

  // Most popular champion still standing (only submitted brackets)
  const champCounts = new Map<string, number>();
  for (const b of submittedBrackets) {
    if (!eliminatedTeams.has(b.champion_pick)) {
      champCounts.set(
        b.champion_pick,
        (champCounts.get(b.champion_pick) || 0) + 1
      );
    }
  }
  const topChampEntry = [...champCounts.entries()].sort(
    (a, b) => b[1] - a[1]
  )[0];
  const topChamp: [string, number] | null = topChampEntry
    ? [topChampEntry[0], topChampEntry[1]]
    : null;

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

  // Skill & Fortune scores for scatter plot
  const scatterData = submittedBrackets.map((b) => {
    const bPicks = picks.filter((p) => p.bracket_id === b.id);
    let skillNum = 0,
      skillDen = 0;
    let fortuneNum = 0,
      fortuneDen = 0;

    for (const p of bPicks) {
      const game = games.find((g) => g.game_id === p.game_id);
      if (!game || !game.completed) continue;
      const rate = pickRates.get(p.game_id)?.get(p.team_picked) ?? 0.5;
      if (rate < 0.6) {
        skillDen++;
        if (p.correct) skillNum++;
      }
      if (rate < 0.3) {
        fortuneDen++;
        if (p.correct) fortuneNum++;
      }
    }

    return {
      name: b.name,
      owner: b.owner,
      points: b.points,
      skill: skillDen > 0 ? Math.round((skillNum / skillDen) * 100) : 50,
      fortune:
        fortuneDen > 0 ? Math.round((fortuneNum / fortuneDen) * 100) : 50,
      champion: b.champion_pick,
      logo: teamLogos[b.champion_pick] || "",
    };
  });

  // Best calls (greatest contrarian correct picks)
  const greatestCalls = picks
    .filter((p) => p.correct)
    .map((p) => {
      const rate = pickRates.get(p.game_id)?.get(p.team_picked) ?? 1;
      const bracket = brackets.find((b) => b.id === p.bracket_id);
      const game = games.find((g) => g.game_id === p.game_id);
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

  // Group report card: round-by-round consensus accuracy
  const roundAccuracy = (
    ["R64", "R32", "S16", "E8", "FF", "CHAMP"] as const
  ).map((round) => {
    const roundGames = games.filter(
      (g) => g.round === round && g.completed
    );
    let correct = 0;
    for (const g of roundGames) {
      const gamePicks = picks.filter((p) => p.game_id === g.game_id);
      const team1Count = gamePicks.filter(
        (p) => p.team_picked === g.team1
      ).length;
      const consensusPick =
        team1Count > submittedCount / 2 ? g.team1 : g.team2;
      if (consensusPick === g.winner) correct++;
    }
    return { round, correct, total: roundGames.length };
  });

  return (
    <LeaderboardContent
      brackets={brackets}
      analytics={analytics}
      eliminatedTeams={eliminatedTeams}
      gamesCompleted={gamesCompleted}
      currentRound={meta.current_round}
      topChamp={topChamp}
      risingStars={risingStars}
      inContention={inContention}
      madnessIndex={madnessIndex}
      scatterData={scatterData}
      greatestCalls={greatestCalls}
      roundAccuracy={roundAccuracy}
      submittedCount={submittedCount}
      teamLogos={teamLogos}
    />
  );
}
