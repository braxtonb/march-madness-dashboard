"use client";

import { useState, useEffect } from "react";
import type { Game } from "@/lib/types";
import { TeamPill } from "./TeamPill";

export interface PickerDetails {
  team1Pickers: string[];
  team2Pickers: string[];
}

function PicksDrawer({
  game,
  pickerDetails,
  onClose,
}: {
  game: Game;
  pickerDetails: PickerDetails;
  onClose: () => void;
}) {
  // Prevent body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      {/* Drawer panel */}
      <div className="relative w-full max-w-md bg-surface-container shadow-xl drawer-slide-in overflow-y-auto">
        <div className="sticky top-0 bg-surface-container z-10 p-5 border-b border-surface-bright">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-lg font-semibold">
              Individual Picks
            </h3>
            <button
              onClick={onClose}
              className="rounded-card p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-bright transition-colors"
              aria-label="Close drawer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <TeamPill name={game.team1} seed={game.seed1} />
            <span className="text-xs text-on-surface-variant">vs</span>
            <TeamPill name={game.team2} seed={game.seed2} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 p-5">
          {/* Team 1 pickers */}
          <div className="space-y-2">
            <p className="text-sm font-label text-on-surface-variant mb-2">
              Picked {game.team1}{" "}
              <span className="text-on-surface font-semibold">
                ({pickerDetails.team1Pickers.length})
              </span>
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
                    className={`text-sm ${
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
          <div className="space-y-2">
            <p className="text-sm font-label text-on-surface-variant mb-2">
              Picked {game.team2}{" "}
              <span className="text-on-surface font-semibold">
                ({pickerDetails.team2Pickers.length})
              </span>
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
                    className={`text-sm ${
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
      </div>
    </div>
  );
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
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isTBD = !game.team1 && !game.team2;

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
    <>
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

        {/* Button to open drawer for picker details */}
        {pickerDetails && (
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-full text-xs font-label text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center gap-1"
          >
            Show individual picks
            <span className="inline-block">→</span>
          </button>
        )}
      </div>

      {drawerOpen && pickerDetails && (
        <PicksDrawer
          game={game}
          pickerDetails={pickerDetails}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </>
  );
}
