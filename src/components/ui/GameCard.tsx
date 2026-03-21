"use client";

import { useState } from "react";
import type { Game } from "@/lib/types";
import { TeamPill } from "./TeamPill";

export interface PickerDetails {
  team1Pickers: string[];
  team2Pickers: string[];
}

export function GameCard({
  game,
  pickSplit,
  totalBrackets,
  pickerDetails,
}: {
  game: Game;
  pickSplit: { team1Count: number; team2Count: number };
  totalBrackets: number;
  pickerDetails?: PickerDetails;
}) {
  const [expanded, setExpanded] = useState(false);

  const isTBD = !game.team1 && !game.team2;
  const isScheduled = !isTBD && !game.completed;

  const team1Pct =
    totalBrackets > 0
      ? Math.round((pickSplit.team1Count / totalBrackets) * 100)
      : 0;
  const team2Pct = 100 - team1Pct;
  const consensusPick =
    pickSplit.team1Count >= pickSplit.team2Count ? game.team1 : game.team2;
  const consensusCorrect = game.completed && consensusPick === game.winner;
  const consensusCount = Math.max(pickSplit.team1Count, pickSplit.team2Count);
  const minorityCount = totalBrackets - consensusCount;

  // TBD games — teams not yet determined
  if (isTBD) {
    return (
      <div className="rounded-card bg-surface-container p-4 space-y-3 opacity-60">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center rounded-full bg-surface-bright px-2.5 py-1 text-xs font-label text-on-surface-variant">
            TBD
          </span>
          <span className="text-xs text-on-surface-variant">vs</span>
          <span className="inline-flex items-center rounded-full bg-surface-bright px-2.5 py-1 text-xs font-label text-on-surface-variant">
            TBD
          </span>
        </div>
        <div className="rounded-card px-3 py-1.5 text-xs text-center bg-surface-bright text-on-surface-variant">
          TBD
        </div>
      </div>
    );
  }

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
        <span>
          {team1Pct}% {game.team1}
        </span>
        <span>
          {game.team2} {team2Pct}%
        </span>
      </div>

      {/* Status / correctness badge */}
      {game.completed ? (
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
      ) : (
        <div className="rounded-card px-3 py-1.5 text-xs text-center bg-surface-bright text-on-surface-variant">
          Scheduled
        </div>
      )}

      {/* Expand toggle for picker details */}
      {pickerDetails && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full text-xs font-label text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center gap-1"
        >
          {expanded ? "Hide" : "Show"} individual picks
          <span
            className={`inline-block transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          >
            ▾
          </span>
        </button>
      )}

      {expanded && pickerDetails && (
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Team 1 pickers */}
          <div className="space-y-1">
            <p className="text-xs font-label text-on-surface-variant mb-1">
              Picked {game.team1}
            </p>
            {pickerDetails.team1Pickers.length === 0 ? (
              <p className="text-xs text-on-surface-variant italic">None</p>
            ) : (
              pickerDetails.team1Pickers.map((name) => {
                const isCorrect =
                  game.completed && game.winner === game.team1;
                return (
                  <p
                    key={name}
                    className={`text-xs ${
                      isCorrect
                        ? "text-secondary font-semibold"
                        : "text-on-surface"
                    }`}
                  >
                    {name}
                    {isCorrect && " ✓"}
                  </p>
                );
              })
            )}
          </div>
          {/* Team 2 pickers */}
          <div className="space-y-1">
            <p className="text-xs font-label text-on-surface-variant mb-1">
              Picked {game.team2}
            </p>
            {pickerDetails.team2Pickers.length === 0 ? (
              <p className="text-xs text-on-surface-variant italic">None</p>
            ) : (
              pickerDetails.team2Pickers.map((name) => {
                const isCorrect =
                  game.completed && game.winner === game.team2;
                return (
                  <p
                    key={name}
                    className={`text-xs ${
                      isCorrect
                        ? "text-secondary font-semibold"
                        : "text-on-surface"
                    }`}
                  >
                    {name}
                    {isCorrect && " ✓"}
                  </p>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
