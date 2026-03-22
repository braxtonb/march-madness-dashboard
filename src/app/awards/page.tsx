import { fetchDashboardData } from "@/lib/sheets";
import { computePickRates } from "@/lib/analytics";
import { ROUND_ORDER } from "@/lib/constants";
import { AwardsClient } from "@/components/ui/AwardsClient";
import type { Award, AwardRound, AwardWinner, Round, Bracket, Pick, Game, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

const AWARD_DEFINITIONS: { title: string; description: string; icon: string; tier: "gold" | "silver" | "bronze" }[] = [
  { title: "The Oracle", description: "Most correct picks", icon: "oracle", tier: "gold" },
  { title: "The Trendsetter", description: "Most unique correct picks", icon: "trendsetter", tier: "gold" },
  { title: "The Faithful", description: "Highest scorer whose champion is still alive", icon: "faithful", tier: "silver" },
  { title: "Hot Streak", description: "Most consecutive correct picks", icon: "streak", tier: "silver" },
  { title: "Diamond in the Rough", description: "Single best pick almost nobody else made", icon: "diamond", tier: "bronze" },
  { title: "The People's Champion", description: "Most aligned with group consensus", icon: "people", tier: "bronze" },
];

function computeAwards(
  brackets: Bracket[],
  picks: Pick[],
  games: Game[],
  teams: Team[],
  round: AwardRound,
  totalBrackets: number
): Award[] {
  const pickRates = computePickRates(picks, totalBrackets);

  const roundGames = round === "ALL"
    ? games.filter((g) => g.completed)
    : games.filter((g) => g.round === round && g.completed);
  const roundGameIds = new Set(roundGames.map((g) => g.game_id));
  const roundPicks = picks.filter((p) => roundGameIds.has(p.game_id));

  const picksByBracket = new Map<string, Pick[]>();
  for (const p of roundPicks) {
    if (!picksByBracket.has(p.bracket_id)) picksByBracket.set(p.bracket_id, []);
    picksByBracket.get(p.bracket_id)!.push(p);
  }

  const bracketMap = new Map(brackets.map((b) => [b.id, b]));
  const eliminatedTeams = new Set(teams.filter((t) => t.eliminated).map((t) => t.name));

  const awards: Award[] = [];

  // Helper to build AwardWinner from a bracket
  function toWinner(b: Bracket, stat: string): AwardWinner {
    return {
      name: b.name,
      fullName: b.full_name,
      bracketName: b.owner,
      bracketId: b.id,
      stat,
      championPick: b.champion_pick,
      championSeed: b.champion_seed,
      championEliminated: teams.find((t) => t.name === b.champion_pick)?.eliminated ?? false,
    };
  }

  // 1. The Oracle — most correct picks
  const correctCounts = new Map<string, number>();
  for (const b of brackets) {
    const bPicks = roundPicks.filter((p) => p.bracket_id === b.id);
    const correct = bPicks.filter((p) => p.correct).length;
    correctCounts.set(b.id, correct);
  }
  const maxCorrect = Math.max(...correctCounts.values(), 0);
  if (maxCorrect > 0) {
    const oracleWinners: AwardWinner[] = brackets
      .filter((b) => correctCounts.get(b.id) === maxCorrect)
      .map((b) => toWinner(b, `${maxCorrect} of ${roundGames.length} correct`));
    awards.push({ title: "The Oracle", description: "Most correct picks", icon: "oracle", tier: "gold", winners: oracleWinners });
  } else {
    awards.push({ title: "The Oracle", description: "Most correct picks", icon: "oracle", tier: "gold", winners: [] });
  }

  // 2. The Trendsetter — most unique correct picks (picked by <30% of the group)
  const uniqueCorrectCounts = new Map<string, number>();
  for (const b of brackets) {
    const bPicks = roundPicks.filter((p) => p.bracket_id === b.id);
    const uniqueCorrect = bPicks.filter((p) => {
      if (!p.correct) return false;
      const rate = pickRates.get(p.game_id)?.get(p.team_picked) ?? 1;
      return rate < 0.3;
    }).length;
    uniqueCorrectCounts.set(b.id, uniqueCorrect);
  }
  const maxUniqueCorrect = Math.max(...uniqueCorrectCounts.values(), 0);
  if (maxUniqueCorrect > 0) {
    const trendWinners: AwardWinner[] = brackets
      .filter((b) => uniqueCorrectCounts.get(b.id) === maxUniqueCorrect)
      .map((b) => toWinner(b, `${maxUniqueCorrect} unique correct picks`));
    awards.push({ title: "The Trendsetter", description: "Most unique correct picks", icon: "trendsetter", tier: "gold", winners: trendWinners });
  } else {
    awards.push({ title: "The Trendsetter", description: "Most unique correct picks", icon: "trendsetter", tier: "gold", winners: [] });
  }

  // 3. The Faithful — highest scorer whose champion is still alive
  const faithfulCandidates = brackets
    .filter((b) => b.champion_pick && !eliminatedTeams.has(b.champion_pick))
    .sort((a, b) => b.points - a.points);

  if (faithfulCandidates.length > 0) {
    const topPoints = faithfulCandidates[0].points;
    const faithfulWinners: AwardWinner[] = faithfulCandidates
      .filter((b) => b.points === topPoints)
      .map((b) => toWinner(b, `${b.points} pts`));
    awards.push({ title: "The Faithful", description: "Highest scorer whose champion is still alive", icon: "faithful", tier: "silver", winners: faithfulWinners });
  } else {
    awards.push({ title: "The Faithful", description: "No winner — all champions eliminated", icon: "faithful", tier: "silver", winners: [] });
  }

  // 4. Hot Streak — most consecutive correct picks
  const streakCounts = new Map<string, number>();
  for (const b of brackets) {
    const bPicks = [...(picksByBracket.get(b.id) || [])];
    if (round === "ALL") {
      bPicks.sort((a, bp) => {
        const ri = ROUND_ORDER.indexOf(a.round as Round) - ROUND_ORDER.indexOf(bp.round as Round);
        if (ri !== 0) return ri;
        return a.game_id.localeCompare(bp.game_id);
      });
    }
    let streak = 0, maxStreak = 0;
    for (const p of bPicks) {
      if (p.correct) { streak++; maxStreak = Math.max(maxStreak, streak); }
      else streak = 0;
    }
    streakCounts.set(b.id, maxStreak);
  }
  const maxStreak = Math.max(...streakCounts.values(), 0);
  if (maxStreak > 0) {
    const streakWinners: AwardWinner[] = brackets
      .filter((b) => streakCounts.get(b.id) === maxStreak)
      .map((b) => toWinner(b, `${maxStreak} consecutive correct picks`));
    awards.push({ title: "Hot Streak", description: "Most consecutive correct picks", icon: "streak", tier: "silver", winners: streakWinners });
  } else {
    awards.push({ title: "Hot Streak", description: "Most consecutive correct picks", icon: "streak", tier: "silver", winners: [] });
  }

  // 5. Diamond in the Rough — single best pick that almost nobody else made and was correct
  const diamondScores = new Map<string, { rate: number; team: string; seed: number }>();
  for (const b of brackets) {
    const bPicks = roundPicks.filter((p) => p.bracket_id === b.id);
    let bestRate = 1.0;
    let bestTeam = "";
    let bestSeed = 0;
    for (const p of bPicks) {
      if (!p.correct) continue;
      const rate = pickRates.get(p.game_id)?.get(p.team_picked) ?? 1;
      if (rate < bestRate) {
        bestRate = rate;
        bestTeam = p.team_picked;
        bestSeed = p.seed_picked;
      }
    }
    if (bestRate < 1) {
      diamondScores.set(b.id, { rate: bestRate, team: bestTeam, seed: bestSeed });
    }
  }
  const minDiamondRate = Math.min(...[...diamondScores.values()].map((d) => d.rate), 1);
  if (minDiamondRate < 1) {
    const diamondWinners: AwardWinner[] = brackets
      .filter((b) => diamondScores.get(b.id)?.rate === minDiamondRate)
      .map((b) => {
        const d = diamondScores.get(b.id)!;
        return toWinner(b, `Picked ${d.team} — only ${Math.round(d.rate * 100)}% of the group agreed`);
      });
    awards.push({ title: "Diamond in the Rough", description: "Single best pick almost nobody else made", icon: "diamond", tier: "bronze", winners: diamondWinners });
  } else {
    awards.push({ title: "Diamond in the Rough", description: "Single best pick almost nobody else made", icon: "diamond", tier: "bronze", winners: [] });
  }

  // 6. The People's Champion — most aligned with group consensus
  // For each game, the "consensus pick" is the team picked by the MOST brackets (plurality)
  const allRoundPicks = roundPicks; // already filtered to this round's games

  const pluralityPick = new Map<string, string>();
  const gamePickCounts = new Map<string, Map<string, number>>();
  for (const p of allRoundPicks) {
    if (!gamePickCounts.has(p.game_id)) gamePickCounts.set(p.game_id, new Map());
    const gc = gamePickCounts.get(p.game_id)!;
    gc.set(p.team_picked, (gc.get(p.team_picked) || 0) + 1);
  }
  for (const [gid, tc] of gamePickCounts) {
    let bestTeam = "";
    let bestCount = 0;
    for (const [team, count] of tc) {
      if (count > bestCount) { bestTeam = team; bestCount = count; }
    }
    pluralityPick.set(gid, bestTeam);
  }

  const allPicksByBracket = new Map<string, Pick[]>();
  for (const p of allRoundPicks) {
    if (!allPicksByBracket.has(p.bracket_id)) allPicksByBracket.set(p.bracket_id, []);
    allPicksByBracket.get(p.bracket_id)!.push(p);
  }

  const peopleCounts = new Map<string, { matched: number; total: number }>();
  for (const [bid, bPicks] of allPicksByBracket) {
    const matched = bPicks.filter((p) => pluralityPick.get(p.game_id) === p.team_picked).length;
    peopleCounts.set(bid, { matched, total: bPicks.length });
  }
  const maxPeopleMatched = Math.max(...[...peopleCounts.values()].map((p) => p.matched), 0);
  if (maxPeopleMatched > 0) {
    const peopleWinners: AwardWinner[] = brackets
      .filter((b) => peopleCounts.get(b.id)?.matched === maxPeopleMatched)
      .map((b) => {
        const pc = peopleCounts.get(b.id)!;
        return toWinner(b, `${pc.matched}/${pc.total} picks matched the group's most popular choice`);
      });
    awards.push({ title: "The People's Champion", description: "Most aligned with group consensus", icon: "people", tier: "bronze", winners: peopleWinners });
  } else {
    awards.push({ title: "The People's Champion", description: "Most aligned with group consensus", icon: "people", tier: "bronze", winners: [] });
  }

  // Sort by the canonical order
  const orderMap = new Map(AWARD_DEFINITIONS.map((d, i) => [d.title, i]));
  awards.sort((a, b) => (orderMap.get(a.title) ?? 99) - (orderMap.get(b.title) ?? 99));

  return awards;
}

export default async function AwardsPage() {
  const data = await fetchDashboardData();
  const currentRound = data.meta.current_round;

  // Compute awards for every round including "ALL"
  const awardsByRound: Record<string, Award[]> = {};
  for (const round of ROUND_ORDER) {
    awardsByRound[round] = computeAwards(data.brackets, data.picks, data.games, data.teams, round, data.brackets.length);
  }
  awardsByRound["ALL"] = computeAwards(data.brackets, data.picks, data.games, data.teams, "ALL", data.brackets.length);

  // Serialize pickRates for client (Map cannot cross server/client boundary)
  const pickRatesMap = computePickRates(data.picks, data.brackets.length);
  const pickRatesObj: Record<string, Record<string, number>> = {};
  for (const [gid, teamMap] of pickRatesMap) {
    pickRatesObj[gid] = Object.fromEntries(teamMap);
  }

  return (
    <div className="space-y-section">
      <div>
        <h2 className="font-display text-2xl font-bold">Tournament Awards</h2>
        <p className="text-on-surface-variant text-sm mt-1">
          Celebrating the best bracket moves each round
        </p>
      </div>

      <AwardsClient
        awardsByRound={awardsByRound}
        completedRounds={[...ROUND_ORDER]}
        currentRound={currentRound}
        picks={data.picks}
        games={data.games}
        teams={data.teams}
        brackets={data.brackets}
        pickRates={pickRatesObj}
      />
    </div>
  );
}
