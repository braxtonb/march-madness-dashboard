"use client";

import { useState } from "react";
import { TeamPill } from "@/components/ui/TeamPill";
import { displayName } from "@/lib/constants";

interface AffectedBracket {
  name: string;
  owner: string;
  full_name: string;
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

export function GamesToWatch({ games, teamLogos = {} }: { games: GameToWatch[]; teamLogos?: Record<string, string> }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="rounded-card bg-surface-container p-5 space-y-3">
      <h3 className="font-display text-lg font-semibold">Games to Watch</h3>
      {games.length === 0 && (
        <p className="text-on-surface-variant text-sm">
          No upcoming games affecting champion picks.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {games.map((g) => {
        const isExpanded = expandedId === g.gameId;
        return (
          <div key={g.gameId} className="rounded-card bg-surface-bright p-4">
            <button
              onClick={() => setExpandedId(isExpanded ? null : g.gameId)}
              className="w-full text-left space-y-2"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface flex items-center gap-1.5">
                  <TeamPill name={g.team1} seed={g.seed1} logo={teamLogos[g.team1]} />
                  <span className="text-[10px] text-on-surface-variant">vs</span>
                  <TeamPill name={g.team2} seed={g.seed2} logo={teamLogos[g.team2]} />
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
              <div className="mt-3 pt-3 border-t border-surface-container space-y-2">
                {g.affectedBrackets.map((b) => (
                  <div
                    key={b.name}
                    className="flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">
                        {displayName(b)}
                      </p>
                      {displayName(b) !== b.name && (
                        <p className="text-xs text-on-surface-variant truncate">
                          {b.name}
                        </p>
                      )}
                    </div>
                    <span className="text-on-surface-variant text-xs shrink-0 ml-2">
                      <TeamPill name={b.champion} logo={teamLogos[b.champion]} />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}
