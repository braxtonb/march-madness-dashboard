"use client";

import { useState } from "react";

interface AffectedBracket {
  name: string;
  champion: string;
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

export function GamesToWatch({ games }: { games: GameToWatch[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="rounded-card bg-surface-container p-5 space-y-3">
      <h3 className="font-display text-lg font-semibold">Games to Watch</h3>
      {games.length === 0 && (
        <p className="text-on-surface-variant text-sm">
          No upcoming games affecting champion picks.
        </p>
      )}
      {games.map((g) => {
        const isExpanded = expandedId === g.gameId;
        return (
          <div key={g.gameId} className="rounded-card bg-surface-bright p-4">
            <button
              onClick={() => setExpandedId(isExpanded ? null : g.gameId)}
              className="w-full text-left space-y-2"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface">
                  {g.seed1} {g.team1} vs {g.seed2} {g.team2}
                </span>
                <span
                  className={`text-on-surface-variant text-xs transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                >
                  &#9660;
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Affects {g.affectedCount} bracket{g.affectedCount !== 1 ? "s" : ""}&apos; champion hopes
              </p>
            </button>
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-surface-container space-y-1">
                {g.affectedBrackets.map((b) => (
                  <div
                    key={b.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-on-surface truncate">{b.name}</span>
                    <span className="text-on-surface-variant shrink-0 ml-2">
                      {b.champion}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
