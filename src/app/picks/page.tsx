import { fetchDashboardData } from "@/lib/sheets";
import { computeGroupAccuracy } from "@/lib/analytics";
import { StatCard } from "@/components/ui/StatCard";
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

  // Build a bracket_id -> owner name lookup
  const ownerById = new Map<string, string>();
  for (const b of data.brackets) {
    ownerById.set(b.id, b.owner || b.name);
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

    const team1Pickers: string[] = [];
    const team2Pickers: string[] = [];
    for (const p of gamePicks) {
      const ownerName = ownerById.get(p.bracket_id) || p.bracket_id;
      if (p.team_picked === game.team1) {
        team1Pickers.push(ownerName);
      } else if (p.team_picked === game.team2) {
        team2Pickers.push(ownerName);
      }
    }
    pickerDetailsMap[game.game_id] = { team1Pickers, team2Pickers };
  }

  // Build team logo lookup
  const teamLogos: Record<string, string> = Object.fromEntries(
    data.teams.map((t) => [t.name, t.logo])
  );

  const accuracy = computeGroupAccuracy(
    data.picks,
    data.games,
    data.meta.current_round,
    data.brackets.length
  );

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Group Accuracy (Current Round)"
          value={`${accuracy.correct}/${accuracy.total}`}
          subtitle={`National avg: ${accuracy.nationalCorrect}/${accuracy.total}`}
        />
        <StatCard
          label="Total Brackets"
          value={submittedBrackets.length}
        />
        <StatCard
          label="Games Completed"
          value={`${data.meta.games_completed}/63`}
        />
      </div>

      <PicksContent
        games={data.games}
        pickSplits={pickSplits}
        pickerDetailsMap={pickerDetailsMap}
        totalBrackets={submittedBrackets.length}
        currentRound={data.meta.current_round}
        teamLogos={teamLogos}
      />
    </div>
  );
}
