import { fetchDashboardData } from "@/lib/sheets";
import { computeGroupAccuracy } from "@/lib/analytics";
import { PicksContent } from "./PicksContent";
import type { PickerDetails } from "@/components/ui/GameCard";

export const dynamic = "force-dynamic";

export default async function GroupPicksPage() {
  const data = await fetchDashboardData();

  // Only count brackets that actually submitted picks (have a champion_pick)
  const submittedBrackets = data.brackets.filter((b) => b.champion_pick);
  const emptyBrackets = data.brackets.length - submittedBrackets.length;

  const pickSplits: Record<string, { team1Count: number; team2Count: number }> = {};
  const pickerDetailsMap: Record<string, PickerDetails> = {};

  // Build bracket_id -> { name, owner } lookup
  const bracketById = new Map<string, { name: string; owner: string }>();
  for (const b of data.brackets) {
    bracketById.set(b.id, { name: b.name, owner: b.owner });
  }

  for (const game of data.games) {
    const gamePicks = data.picks.filter((p) => p.game_id === game.game_id);
    const team1Count = gamePicks.filter(
      (p) => p.team_picked === game.team1
    ).length;
    const team2Count = gamePicks.filter(
      (p) => p.team_picked === game.team2
    ).length;
    pickSplits[game.game_id] = { team1Count, team2Count };

    const team1Pickers: { name: string; owner: string }[] = [];
    const team2Pickers: { name: string; owner: string }[] = [];
    for (const p of gamePicks) {
      const bracket = bracketById.get(p.bracket_id) || { name: p.bracket_id, owner: "" };
      if (p.team_picked === game.team1) {
        team1Pickers.push(bracket);
      } else if (p.team_picked === game.team2) {
        team2Pickers.push(bracket);
      }
    }
    // Sort pickers by points descending
    const pointsById = new Map(data.brackets.map((b) => [b.name, b.points]));
    team1Pickers.sort((a, b) => (pointsById.get(b.name) || 0) - (pointsById.get(a.name) || 0));
    team2Pickers.sort((a, b) => (pointsById.get(b.name) || 0) - (pointsById.get(a.name) || 0));
    pickerDetailsMap[game.game_id] = { team1Pickers, team2Pickers };
  }

  // Build team logo lookup
  const teamLogos: Record<string, string> = Object.fromEntries(
    data.teams.map((t) => [t.name, t.logo])
  );

  // Derive eliminated teams from game results
  const eliminatedTeams = new Set<string>();
  for (const g of data.games) {
    if (g.completed && g.winner) {
      if (g.team1 && g.team1 !== g.winner) eliminatedTeams.add(g.team1);
      if (g.team2 && g.team2 !== g.winner) eliminatedTeams.add(g.team2);
    }
  }

  // Champion distribution
  const champCounts = new Map<string, number>();
  for (const b of submittedBrackets) {
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
      logo: teamLogos[name] || "",
    }))
    .sort((a, b) => b.count - a.count);

  // Compute per-round accuracy for report card
  const roundAccuracy = ["R64", "R32", "S16", "E8", "FF", "CHAMP"].map((round) => {
    const acc = computeGroupAccuracy(data.picks, data.games, round, submittedBrackets.length);
    return { round, ...acc };
  });
  const overallCorrect = roundAccuracy.reduce((s, r) => s + r.correct, 0);
  const overallTotal = roundAccuracy.reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-section">
      <div>
        <h2 className="font-display text-2xl font-bold">Group Picks</h2>
        <p className="text-on-surface-variant text-sm mt-1">
          See how our {submittedBrackets.length} brackets collectively predicted
          each game
        </p>
        {emptyBrackets > 0 && (
          <p className="text-on-surface-variant text-xs mt-0.5 italic">
            Based on {submittedBrackets.length} submitted brackets ({emptyBrackets} did not submit picks)
          </p>
        )}
      </div>

      {/* Group accuracy report card */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant">
          Group Accuracy:
        </span>
        {roundAccuracy.map((r) => (
          <span
            key={r.round}
            className={`font-label text-xs px-2 py-1 rounded-card ${
              r.total > 0 ? "bg-surface-container text-on-surface" : "text-on-surface-variant/50"
            }`}
          >
            {r.round} {r.total > 0 ? `${r.correct}/${r.total}` : "—"}
          </span>
        ))}
        {overallTotal > 0 && (
          <span className="font-label text-xs text-secondary font-semibold ml-1">
            Overall: {overallCorrect}/{overallTotal} ({Math.round((overallCorrect / overallTotal) * 100)}%)
          </span>
        )}
      </div>

      <PicksContent
        games={data.games}
        pickSplits={pickSplits}
        pickerDetailsMap={pickerDetailsMap}
        totalBrackets={submittedBrackets.length}
        currentRound={data.meta.current_round}
        teamLogos={teamLogos}
        champDistribution={champDistribution}
      />
    </div>
  );
}
