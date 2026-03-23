"use client";

import { useState, useEffect } from "react";
import { TeamPill } from "@/components/ui/TeamPill";
import BottomSheet from "@/components/ui/BottomSheet";
import { ViewBracketLink } from "@/components/ui/ViewBracketLink";
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

export function GamesToWatch({ games, teamLogos = {}, eliminatedTeams = new Set() }: { games: GameToWatch[]; teamLogos?: Record<string, string>; eliminatedTeams?: Set<string> }) {
  const [selectedGameIdx, setSelectedGameIdx] = useState<number | null>(null);

  // Hydrate from URL on mount (client-only to avoid SSR mismatch)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const watchParam = params.get("watch");
    if (watchParam) {
      const idx = games.findIndex((g) => g.gameId === watchParam);
      if (idx >= 0) setSelectedGameIdx(idx);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function setGameIdxWithUrl(idx: number | null) {
    setSelectedGameIdx(idx);
    const url = new URL(window.location.href);
    if (idx != null && games[idx]) {
      url.searchParams.set("watch", games[idx].gameId);
    } else {
      url.searchParams.delete("watch");
    }
    window.history.replaceState(null, "", url.toString());
  }

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
            onClick={() => setGameIdxWithUrl(idx)}
            className="group rounded-card bg-surface-bright p-4 text-left space-y-2 hover:bg-surface-bright/80 transition-colors cursor-pointer w-full"
          >
            <div className="flex items-center justify-between text-sm gap-1">
              <span className="text-on-surface flex items-center gap-1.5 flex-wrap min-w-0">
                <TeamPill name={g.team1} seed={g.seed1} logo={teamLogos[g.team1]} eliminated={eliminatedTeams.has(g.team1)} showStatus />
                <span className="text-[10px] text-on-surface-variant">vs</span>
                <TeamPill name={g.team2} seed={g.seed2} logo={teamLogos[g.team2]} eliminated={eliminatedTeams.has(g.team2)} showStatus />
              </span>
              <span className="shrink-0">
                <span className="inline-block rounded-card px-2 py-0.5 font-label text-[10px] bg-tertiary/15 text-tertiary">
                  {ROUND_LABELS[g.round as Round] ?? g.round}
                </span>
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              Affects {g.affectedCount} bracket{g.affectedCount !== 1 ? "s" : ""}&apos; champion hopes
            </p>
            <span className="flex items-center justify-end text-on-surface-variant group-hover:text-on-surface transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
          </button>
        );
      })}
      </div>

      {/* Sidebar for affected brackets */}
      <BottomSheet
        open={!!selectedGame}
        onClose={() => setGameIdxWithUrl(null)}
        title={selectedGame ? `${selectedGame.team1} vs ${selectedGame.team2}` : ""}
        onPrev={selectedGameIdx !== null && selectedGameIdx > 0 ? () => setGameIdxWithUrl(selectedGameIdx - 1) : undefined}
        onNext={selectedGameIdx !== null && selectedGameIdx < games.length - 1 ? () => setGameIdxWithUrl(selectedGameIdx + 1) : undefined}
      >
        {selectedGame && (
          <div className="space-y-4">
            {/* Game header */}
            <div className="flex items-center justify-between">
              <TeamPill name={selectedGame.team1} seed={selectedGame.seed1} logo={teamLogos[selectedGame.team1]} eliminated={eliminatedTeams.has(selectedGame.team1)} showStatus />
              <span className="text-xs text-on-surface-variant">vs</span>
              <TeamPill name={selectedGame.team2} seed={selectedGame.seed2} logo={teamLogos[selectedGame.team2]} eliminated={eliminatedTeams.has(selectedGame.team2)} showStatus />
            </div>
            <p className="text-xs text-on-surface-variant">
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
                          {b.bracketId && <ViewBracketLink bracketId={b.bracketId} className="mt-0.5" />}
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
                        <TeamPill name={selectedGame.team1} seed={selectedGame.seed1} logo={teamLogos[selectedGame.team1]} eliminated={eliminatedTeams.has(selectedGame.team1)} showStatus />
                      </div>
                      {renderBracketList(team1Brackets)}
                    </div>
                  )}
                  {team2Brackets.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <TeamPill name={selectedGame.team2} seed={selectedGame.seed2} logo={teamLogos[selectedGame.team2]} eliminated={eliminatedTeams.has(selectedGame.team2)} showStatus />
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
                            <TeamPill name={b.champion} seed={b.championSeed} logo={teamLogos[b.champion]} eliminated={eliminatedTeams.has(b.champion)} showStatus />
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
