import { fetchDashboardData } from "@/lib/sheets";
import { computeGroupAccuracy } from "@/lib/analytics";
import { PicksContent } from "./PicksContent";
import type { PickerDetails } from "@/components/ui/GameCard";

export const dynamic = "force-dynamic";

export default async function GroupPicksPage() {
  const data = await fetchDashboardData();
  const d = data.derived!;

  const submittedCount = d.submitted_count;
  const emptyBrackets = data.brackets.length - submittedCount;

  // Picker details still computed here (needed for drawer, keyed by game)
  const bracketById = new Map(data.brackets.map((b) => [b.id, { name: b.name, owner: b.owner, full_name: b.full_name }]));
  const pointsById = new Map(data.brackets.map((b) => [b.name, b.points]));

  const pickerDetailsMap: Record<string, PickerDetails> = {};
  for (const game of data.games) {
    const gamePicks = data.picks.filter((p) => p.game_id === game.game_id);
    const team1Pickers: { bracketId: string; name: string; owner: string; full_name: string }[] = [];
    const team2Pickers: { bracketId: string; name: string; owner: string; full_name: string }[] = [];
    for (const p of gamePicks) {
      const bracket = bracketById.get(p.bracket_id) || { name: p.bracket_id, owner: "", full_name: "" };
      if (p.team_picked === game.team1) {
        team1Pickers.push({ bracketId: p.bracket_id, ...bracket });
      } else if (p.team_picked === game.team2) {
        team2Pickers.push({ bracketId: p.bracket_id, ...bracket });
      }
    }
    team1Pickers.sort((a, b) => (pointsById.get(b.name) || 0) - (pointsById.get(a.name) || 0));
    team2Pickers.sort((a, b) => (pointsById.get(b.name) || 0) - (pointsById.get(a.name) || 0));
    pickerDetailsMap[game.game_id] = { team1Pickers, team2Pickers };
  }

  // Build bracket picks lookup for single-bracket filter on bracket view
  const bracketPicksMap: Record<string, Record<string, string>> = {};
  for (const p of data.picks) {
    if (!bracketPicksMap[p.bracket_id]) bracketPicksMap[p.bracket_id] = {};
    bracketPicksMap[p.bracket_id][p.game_id] = p.team_picked;
  }

  // Round accuracy from pre-computed data
  const roundAccuracy = d.round_accuracy;
  const overallCorrect = roundAccuracy.reduce((s, r) => s + r.correct, 0);
  const overallTotal = roundAccuracy.reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-section">
      <div>
        <h2 className="font-display text-2xl font-bold">Group Picks</h2>
        <p className="text-on-surface-variant text-sm mt-1">
          See how our {submittedCount} brackets collectively predicted
          each game
        </p>
        {emptyBrackets > 0 && (
          <p className="text-on-surface-variant text-xs mt-0.5 italic">
            Based on {submittedCount} submitted brackets ({emptyBrackets} did not submit picks)
          </p>
        )}
      </div>

      {/* Group accuracy report card */}
      <div className="space-y-1">
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-3 min-w-max">
            <span className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant shrink-0">
              Group Accuracy:
            </span>
            {roundAccuracy.map((r) => (
              <span
                key={r.round}
                className={`font-label text-xs px-2 py-1 rounded-card whitespace-nowrap ${
                  r.total > 0 ? "bg-surface-container text-on-surface" : "text-on-surface-variant/50"
                }`}
              >
                {r.round} {r.total > 0 ? `${r.correct}/${r.total}` : "—"}
              </span>
            ))}
            {overallTotal > 0 && (
              <span className="font-label text-xs text-secondary font-semibold ml-1 whitespace-nowrap">
                Overall: {overallCorrect}/{overallTotal} ({Math.round((overallCorrect / overallTotal) * 100)}%)
              </span>
            )}
          </div>
        </div>
        <p className="text-[10px] text-on-surface-variant/70">
          Percentage of completed games where the group&apos;s most popular pick was correct
        </p>
      </div>

      <PicksContent
        games={data.games}
        pickSplits={d.pick_splits}
        pickerDetailsMap={pickerDetailsMap}
        totalBrackets={submittedCount}
        currentRound={data.meta.current_round}
        teamLogos={d.team_logos}
        champDistribution={d.champ_distribution}
        brackets={data.brackets}
        bracketPicksMap={bracketPicksMap}
      />
    </div>
  );
}
