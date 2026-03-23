"use client";

import type { Game } from "@/lib/types";
import { TeamPill } from "./TeamPill";
import { GameHeader } from "./GameHeader";
import { ViewBracketLink } from "./ViewBracketLink";
import BottomSheet from "./BottomSheet";
import CompareCheckbox from "./CompareCheckbox";

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
                  className={`group flex items-start gap-2 rounded-lg bg-surface-bright/50 px-3 py-2 overflow-hidden ${isCorrect ? "text-secondary" : ""}`}
                >
                  <div className="pt-0.5 shrink-0"><CompareCheckbox bracketId={picker.bracketId} /></div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold truncate ${isCorrect ? "" : "text-on-surface"}`}>
                      {picker.name}{isCorrect && " \u2713"}
                    </p>
                    {picker.full_name && picker.full_name !== picker.name && (
                      <p className="text-[10px] text-on-surface-variant truncate">{picker.full_name}</p>
                    )}
                    <ViewBracketLink bracketId={picker.bracketId} className="mt-0.5" />
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
                  className={`group flex items-start gap-2 rounded-lg bg-surface-bright/50 px-3 py-2 overflow-hidden ${isCorrect ? "text-secondary" : ""}`}
                >
                  <div className="pt-0.5 shrink-0"><CompareCheckbox bracketId={picker.bracketId} /></div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold truncate ${isCorrect ? "" : "text-on-surface"}`}>
                      {picker.name}{isCorrect && " \u2713"}
                    </p>
                    {picker.full_name && picker.full_name !== picker.name && (
                      <p className="text-[10px] text-on-surface-variant truncate">{picker.full_name}</p>
                    )}
                    <ViewBracketLink bracketId={picker.bracketId} className="mt-0.5" />
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

  // Accuracy color (heatmap style) for completed games
  const accuracyPct = game.completed ? (consensusCorrect ? Math.max(team1Pct, team2Pct) / 100 : (1 - Math.max(team1Pct, team2Pct) / 100)) : -1;
  const accuracyBorder = game.completed
    ? (consensusCorrect
        ? (accuracyPct > 0.7 ? "border-l-emerald-500" : accuracyPct > 0.5 ? "border-l-emerald-500/60" : "border-l-emerald-500/30")
        : (accuracyPct < 0.3 ? "border-l-red-400" : accuracyPct < 0.5 ? "border-l-red-400/60" : "border-l-red-400/30"))
    : "border-l-transparent";

  return (
    <>
      <div className={`rounded-card bg-surface-container p-4 space-y-2.5 border-l-[3px] ${accuracyBorder}`}>
        {/* Team matchup with inline percentages */}
        <div className="space-y-1.5">
          {/* Team 1 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <TeamPill
                name={game.team1}
                seed={game.seed1}
                logo={teamLogos[game.team1]}
                eliminated={eliminatedTeams?.has(game.team1)}
                showStatus={!!eliminatedTeams}
              />
            </div>
            <span className={`font-label text-xs shrink-0 ${game.completed && game.winner === game.team1 ? "text-on-surface font-bold" : "text-on-surface-variant"}`}>
              {team1Pct}%
            </span>
          </div>
          {/* Team 2 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <TeamPill
                name={game.team2}
                seed={game.seed2}
                logo={teamLogos[game.team2]}
                eliminated={eliminatedTeams?.has(game.team2)}
                showStatus={!!eliminatedTeams}
              />
            </div>
            <span className={`font-label text-xs shrink-0 ${game.completed && game.winner === game.team2 ? "text-on-surface font-bold" : "text-on-surface-variant"}`}>
              {team2Pct}%
            </span>
          </div>
        </div>

        {/* Status badge + ESPN link */}
        <div className="flex items-center justify-between">
          {game.completed ? (
            <span className={`text-[10px] font-label ${consensusCorrect ? "text-emerald-400" : "text-on-surface-variant"}`}>
              {consensusCorrect ? "Group called it" : `${minorityCount} of ${totalBrackets} saw this coming`}
            </span>
          ) : (
            <span className="text-[10px] font-label text-on-surface-variant">Scheduled</span>
          )}
          {game.espn_url && game.completed && (
            <a
              href={game.espn_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] font-label text-on-surface-variant hover:text-secondary transition-colors"
            >
              ESPN
            </a>
          )}
        </div>

        {/* Button to open drawer for picker details */}
        {pickerDetails && onOpenDrawer && (
          <button
            onClick={onOpenDrawer}
            className="w-full text-[10px] font-label text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center gap-1"
          >
            Show individual picks
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-on-surface-variant/60">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </button>
        )}
      </div>
    </>
  );
}
