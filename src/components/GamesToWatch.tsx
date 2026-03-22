"use client";

import { useState } from "react";
import { TeamPill } from "@/components/ui/TeamPill";
import BottomSheet from "@/components/ui/BottomSheet";
import CompareCheckbox from "@/components/ui/CompareCheckbox";
import { ROUND_LABELS } from "@/lib/constants";
import type { Round } from "@/lib/types";

interface AffectedBracket {
  name: string;
  owner: string;
  full_name: string;
  champion: string;
  championSeed?: number;
  bracketId?: string;
}

interface GameToWatch {
  gameId: string;
  seed1: number;
  team1: string;
  seed2: number;
  team2: string;
  round: string;
  affectedCount: number;
  affectedBrackets: AffectedBracket[];
}

export function GamesToWatch({ games, teamLogos = {}, eliminatedTeams }: { games: GameToWatch[]; teamLogos?: Record<string, string>; eliminatedTeams?: Set<string> }) {
  const [selectedGameIdx, setSelectedGameIdx] = useState<number | null>(null);

  const selectedGame = selectedGameIdx !== null ? games[selectedGameIdx] : null;

  return (
    <div className="rounded-card bg-surface-container p-5 space-y-3">
      <h3 className="font-display text-lg font-semibold">Games to Watch</h3>
      {games.length === 0 && (
        <p className="text-on-surface-variant text-sm">
          No upcoming games affecting champion picks.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {games.map((g, idx) => {
        return (
          <button
            key={g.gameId}
            onClick={() => setSelectedGameIdx(idx)}
            className="rounded-card bg-surface-bright p-4 text-left space-y-2 hover:bg-surface-bright/80 transition-colors cursor-pointer w-full"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface flex items-center gap-1.5">
                <TeamPill name={g.team1} seed={g.seed1} logo={teamLogos[g.team1]} />
                <span className="text-[10px] text-on-surface-variant">vs</span>
                <TeamPill name={g.team2} seed={g.seed2} logo={teamLogos[g.team2]} />
              </span>
              <span className="shrink-0 ml-2 flex items-center gap-1.5">
                <span className="text-xs px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">
                  {ROUND_LABELS[g.round as Round] ?? g.round}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-on-surface-variant">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M15 3v18" />
                </svg>
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              Affects {g.affectedCount} bracket{g.affectedCount !== 1 ? "s" : ""}&apos; champion hopes
            </p>
          </button>
        );
      })}
      </div>

      {/* Sidebar for affected brackets */}
      <BottomSheet
        open={!!selectedGame}
        onClose={() => setSelectedGameIdx(null)}
        title={selectedGame ? `${selectedGame.team1} vs ${selectedGame.team2}` : ""}
        onPrev={selectedGameIdx !== null && selectedGameIdx > 0 ? () => setSelectedGameIdx(selectedGameIdx - 1) : undefined}
        onNext={selectedGameIdx !== null && selectedGameIdx < games.length - 1 ? () => setSelectedGameIdx(selectedGameIdx + 1) : undefined}
      >
        {selectedGame && (
          <div className="space-y-4">
            {/* Game header */}
            <div className="flex items-center gap-2 justify-center">
              <TeamPill name={selectedGame.team1} seed={selectedGame.seed1} logo={teamLogos[selectedGame.team1]} />
              <span className="text-xs text-on-surface-variant">vs</span>
              <TeamPill name={selectedGame.team2} seed={selectedGame.seed2} logo={teamLogos[selectedGame.team2]} />
            </div>
            <p className="text-xs text-on-surface-variant text-center">
              {selectedGame.affectedCount} bracket{selectedGame.affectedCount !== 1 ? "s" : ""} have champion hopes riding on this game
            </p>

            {/* Two columns: brackets by champion pick */}
            {(() => {
              const team1Brackets = selectedGame.affectedBrackets.filter((b) => b.champion === selectedGame.team1);
              const team2Brackets = selectedGame.affectedBrackets.filter((b) => b.champion === selectedGame.team2);
              // Brackets whose champion is neither team (affected indirectly)
              const otherBrackets = selectedGame.affectedBrackets.filter(
                (b) => b.champion !== selectedGame.team1 && b.champion !== selectedGame.team2
              );

              function renderBracketList(brackets: AffectedBracket[]) {
                if (brackets.length === 0) {
                  return <p className="text-xs text-on-surface-variant italic">No brackets</p>;
                }
                return (
                  <div className="space-y-1.5">
                    {brackets.map((b) => (
                      <div key={b.name} className="group flex items-center gap-2 rounded-lg bg-surface-bright/50 px-3 py-2">
                        {b.bracketId && <CompareCheckbox bracketId={b.bracketId} />}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-on-surface truncate">{b.name}</p>
                          {b.full_name && b.full_name !== b.name && (
                            <p className="text-xs text-on-surface-variant truncate">{b.full_name}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {team1Brackets.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <TeamPill name={selectedGame.team1} seed={selectedGame.seed1} logo={teamLogos[selectedGame.team1]} />
                      </div>
                      {renderBracketList(team1Brackets)}
                    </div>
                  )}
                  {team2Brackets.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <TeamPill name={selectedGame.team2} seed={selectedGame.seed2} logo={teamLogos[selectedGame.team2]} />
                      </div>
                      {renderBracketList(team2Brackets)}
                    </div>
                  )}
                  {otherBrackets.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-label text-xs text-on-surface-variant">Other affected brackets</p>
                      {otherBrackets.map((b) => (
                        <div key={b.name} className="group flex items-center gap-2 rounded-lg bg-surface-bright/50 px-3 py-2">
                          {b.bracketId && <CompareCheckbox bracketId={b.bracketId} />}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-on-surface truncate">{b.name}</p>
                            {b.full_name && b.full_name !== b.name && (
                              <p className="text-xs text-on-surface-variant truncate">{b.full_name}</p>
                            )}
                          </div>
                          <span className="text-on-surface-variant text-xs shrink-0 ml-2">
                            <TeamPill name={b.champion} seed={b.championSeed} logo={teamLogos[b.champion]} eliminated={eliminatedTeams?.has(b.champion)} />
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
