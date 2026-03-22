"use client";

import type { Game } from "@/lib/types";
import { TeamPill } from "./TeamPill";
import { GameHeader } from "./GameHeader";
import BottomSheet from "./BottomSheet";
import CompareCheckbox from "./CompareCheckbox";
import { displayName } from "@/lib/constants";

export interface PickerInfo {
  bracketId: string; // bracket id for compare
  name: string;   // bracket name
  owner: string;  // username
  full_name: string; // real name from ESPN
}

export interface PickerDetails {
  team1Pickers: PickerInfo[];
  team2Pickers: PickerInfo[];
}

export function PicksDrawer({
  game,
  pickerDetails,
  onClose,
  teamLogos = {},
  onPrev,
  onNext,
  eliminatedTeams,
}: {
  game: Game;
  pickerDetails: PickerDetails;
  onClose: () => void;
  teamLogos?: Record<string, string>;
  onPrev?: () => void;
  onNext?: () => void;
  eliminatedTeams?: Set<string>;
}) {
  return (
    <BottomSheet
      open={true}
      onClose={onClose}
      title="Individual Picks"
      onPrev={onPrev}
      onNext={onNext}
    >
      <div className="flex items-center justify-between mb-4">
        <TeamPill name={game.team1} seed={game.seed1} logo={teamLogos[game.team1]} eliminated={eliminatedTeams?.has(game.team1)} showStatus={!!eliminatedTeams} />
        <span className="text-xs text-on-surface-variant">vs</span>
        <TeamPill name={game.team2} seed={game.seed2} logo={teamLogos[game.team2]} eliminated={eliminatedTeams?.has(game.team2)} showStatus={!!eliminatedTeams} />
      </div>

      <div className="grid grid-cols-2 gap-4">
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
            pickerDetails.team1Pickers.map((picker) => {
              const isCorrect =
                game.completed && game.winner === game.team1;
              return (
                <div
                  key={picker.name}
                  className={`group flex items-center gap-2 ${isCorrect ? "text-secondary" : ""}`}
                >
                  <CompareCheckbox bracketId={picker.bracketId} />
                  <div>
                    <p className={`text-sm ${isCorrect ? "font-semibold" : "text-on-surface"}`}>
                      {displayName(picker)}{isCorrect && " \u2713"}
                    </p>
                    {displayName(picker) !== picker.name && (
                      <p className="text-[10px] text-on-surface-variant">{picker.name}</p>
                    )}
                  </div>
                </div>
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
            pickerDetails.team2Pickers.map((picker) => {
              const isCorrect =
                game.completed && game.winner === game.team2;
              return (
                <div
                  key={picker.name}
                  className={`group flex items-center gap-2 ${isCorrect ? "text-secondary" : ""}`}
                >
                  <CompareCheckbox bracketId={picker.bracketId} />
                  <div>
                    <p className={`text-sm ${isCorrect ? "font-semibold" : "text-on-surface"}`}>
                      {displayName(picker)}{isCorrect && " \u2713"}
                    </p>
                    {displayName(picker) !== picker.name && (
                      <p className="text-[10px] text-on-surface-variant">{picker.name}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

export function GameCard({
  game,
  pickSplit,
  totalBrackets,
  pickerDetails,
  teamLogos = {},
  onOpenDrawer,
  eliminatedTeams,
}: {
  game: Game;
  pickSplit: { team1Count: number; team2Count: number };
  totalBrackets: number;
  pickerDetails?: PickerDetails;
  teamLogos?: Record<string, string>;
  onOpenDrawer?: () => void;
  eliminatedTeams?: Set<string>;
}) {

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
        <GameHeader game={game} teamLogos={teamLogos} eliminatedTeams={eliminatedTeams} />

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
        {pickerDetails && onOpenDrawer && (
          <button
            onClick={onOpenDrawer}
            className="w-full text-xs font-label text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center gap-1"
          >
            Show individual picks
            <span className="inline-block">→</span>
          </button>
        )}
      </div>
    </>
  );
}
