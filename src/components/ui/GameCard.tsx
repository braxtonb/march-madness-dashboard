import type { Game } from "@/lib/types";
import { TeamPill } from "./TeamPill";

export function GameCard({
  game,
  pickSplit,
  totalBrackets,
}: {
  game: Game;
  pickSplit: { team1Count: number; team2Count: number };
  totalBrackets: number;
}) {
  const team1Pct = Math.round(
    (pickSplit.team1Count / totalBrackets) * 100
  );
  const team2Pct = 100 - team1Pct;
  const consensusPick =
    pickSplit.team1Count >= pickSplit.team2Count ? game.team1 : game.team2;
  const consensusCorrect = game.completed && consensusPick === game.winner;
  const consensusCount = Math.max(pickSplit.team1Count, pickSplit.team2Count);
  const minorityCount = totalBrackets - consensusCount;

  return (
    <div className="rounded-card bg-surface-container p-4 space-y-3">
      <div className="flex items-center justify-between">
        <TeamPill name={game.team1} seed={game.seed1} />
        <span className="text-xs text-on-surface-variant">vs</span>
        <TeamPill name={game.team2} seed={game.seed2} />
      </div>

      <div className="flex h-3 rounded-full overflow-hidden bg-surface-bright">
        <div
          className="bg-secondary transition-all"
          style={{ width: `${team1Pct}%` }}
        />
        <div
          className="bg-tertiary transition-all"
          style={{ width: `${team2Pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs font-label text-on-surface-variant">
        <span>{team1Pct}% {game.team1}</span>
        <span>{game.team2} {team2Pct}%</span>
      </div>

      {game.completed && (
        <div
          className={`rounded-card px-3 py-1.5 text-xs text-center ${
            consensusCorrect
              ? "bg-secondary/10 text-secondary"
              : "bg-tertiary/10 text-tertiary"
          }`}
        >
          {consensusCorrect
            ? "We called it!"
            : `Surprise! Only ${minorityCount} of us saw this coming`}
        </div>
      )}
    </div>
  );
}
