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

      <div className="flex items-center gap-4 text-sm text-on-surface-variant">
        <span>
          Group accuracy ({data.meta.current_round}): <span className="text-on-surface font-semibold">{accuracy.correct}/{accuracy.total}</span>
          <span className="ml-1 text-xs">(national avg: {accuracy.nationalCorrect}/{accuracy.total})</span>
        </span>
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
