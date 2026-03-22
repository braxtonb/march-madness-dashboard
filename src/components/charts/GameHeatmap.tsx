"use client";

import { useMemo } from "react";
import type { Game, Round } from "@/lib/types";
import { ROUND_ORDER, ROUND_LABELS } from "@/lib/constants";

interface GameHeatmapProps {
  games: Game[];
  pickSplits: Record<string, { team1Count: number; team2Count: number }>;
  totalBrackets: number;
  round: string;
  statusFilter: "all" | "completed" | "scheduled";
}

function accuracyColor(pctCorrect: number): string {
  // Green gradient for majority correct, red gradient for majority wrong
  if (pctCorrect >= 0.8) return "bg-emerald-600/70";
  if (pctCorrect >= 0.65) return "bg-emerald-500/50";
  if (pctCorrect >= 0.5) return "bg-emerald-400/30";
  if (pctCorrect >= 0.4) return "bg-red-400/30";
  if (pctCorrect >= 0.25) return "bg-red-500/50";
  return "bg-red-600/70";
}

function accuracyLabel(pctCorrect: number): string {
  const pct = Math.round(pctCorrect * 100);
  if (pctCorrect >= 0.5) return `${pct}% correct`;
  return `${pct}% correct`;
}

export function GameHeatmap({ games, pickSplits, totalBrackets, round, statusFilter }: GameHeatmapProps) {
  const isAllRounds = round === "ALL";

  const filteredGames = useMemo(() => {
    let gList = isAllRounds ? games : games.filter((g) => g.round === round);
    if (statusFilter === "completed") gList = gList.filter((g) => g.completed);
    else if (statusFilter === "scheduled") gList = gList.filter((g) => !g.completed);
    return gList;
  }, [games, round, isAllRounds, statusFilter]);

  // Group by round
  const groupedGames = useMemo(() => {
    if (!isAllRounds) return [{ round: round as Round, games: filteredGames }];
    return ROUND_ORDER
      .map((r) => ({
        round: r,
        games: filteredGames.filter((g) => g.round === r),
      }))
      .filter((g) => g.games.length > 0);
  }, [filteredGames, isAllRounds, round]);

  if (filteredGames.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-on-surface-variant text-sm">No games to display.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-on-surface-variant font-label" title="Percentage of completed games where the group's most popular pick was correct">Group Accuracy:</span>
        <div className="flex items-center gap-0.5">
          <div className="w-5 h-3 rounded-sm bg-red-600/70" />
          <div className="w-5 h-3 rounded-sm bg-red-500/50" />
          <div className="w-5 h-3 rounded-sm bg-red-400/30" />
          <div className="w-5 h-3 rounded-sm bg-emerald-400/30" />
          <div className="w-5 h-3 rounded-sm bg-emerald-500/50" />
          <div className="w-5 h-3 rounded-sm bg-emerald-600/70" />
        </div>
        <span className="text-[10px] text-on-surface-variant">
          Wrong &larr; &rarr; Correct
        </span>
        <div className="flex items-center gap-0.5 ml-2">
          <div className="w-5 h-3 rounded-sm bg-on-surface-variant/10" />
          <span className="text-[10px] text-on-surface-variant">Pending</span>
        </div>
      </div>

      {groupedGames.map((group) => (
        <div key={group.round} className="space-y-1">
          {isAllRounds && (
            <p className="font-label text-xs font-semibold text-on-surface pt-1">
              {ROUND_LABELS[group.round]}
            </p>
          )}
          <div className="space-y-0.5">
            {group.games.map((game) => {
              const split = pickSplits[game.game_id];
              const total = split ? split.team1Count + split.team2Count : 0;

              if (!game.completed) {
                // Pending game
                const pct1 = total > 0 ? Math.round((split.team1Count / total) * 100) : 50;
                const pct2 = total > 0 ? 100 - pct1 : 50;
                return (
                  <div
                    key={game.game_id}
                    className="flex items-center gap-1 rounded bg-on-surface-variant/10 px-2 py-1"
                  >
                    <span className="text-[10px] text-on-surface-variant w-5 text-center font-label shrink-0">
                      {game.seed1}
                    </span>
                    <span className="text-[11px] text-on-surface font-medium truncate min-w-0 flex-1">
                      {game.team1}
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-label shrink-0">{pct1}%</span>
                    <span className="text-[9px] text-on-surface-variant/50 shrink-0">vs</span>
                    <span className="text-[10px] text-on-surface-variant font-label shrink-0">{pct2}%</span>
                    <span className="text-[11px] text-on-surface font-medium truncate min-w-0 flex-1 text-right">
                      {game.team2}
                    </span>
                    <span className="text-[10px] text-on-surface-variant w-5 text-center font-label shrink-0">
                      {game.seed2}
                    </span>
                  </div>
                );
              }

              // Completed game -- calculate group accuracy
              const winnerIsTeam1 = game.winner === game.team1;
              const correctPicks = winnerIsTeam1 ? (split?.team1Count || 0) : (split?.team2Count || 0);
              const pctCorrect = total > 0 ? correctPicks / total : 0;
              const colorClass = accuracyColor(pctCorrect);
              const pctDisplay = Math.round(pctCorrect * 100);

              return (
                <div
                  key={game.game_id}
                  className={`flex items-center gap-1 rounded px-2 py-1 ${colorClass}`}
                >
                  <span className="text-[10px] text-on-surface-variant w-5 text-center font-label shrink-0">
                    {game.seed1}
                  </span>
                  <span
                    className={`text-[11px] font-medium truncate min-w-0 flex-1 ${
                      game.winner === game.team1 ? "text-on-surface font-bold" : "text-on-surface-variant line-through"
                    }`}
                  >
                    {game.team1}
                  </span>
                  <span className="text-[9px] text-on-surface-variant/50 shrink-0">vs</span>
                  <span
                    className={`text-[11px] font-medium truncate min-w-0 flex-1 text-right ${
                      game.winner === game.team2 ? "text-on-surface font-bold" : "text-on-surface-variant line-through"
                    }`}
                  >
                    {game.team2}
                  </span>
                  <span className="text-[10px] text-on-surface-variant w-5 text-center font-label shrink-0">
                    {game.seed2}
                  </span>
                  <span className="text-[10px] text-on-surface font-label w-10 text-right shrink-0">
                    {pctDisplay}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
