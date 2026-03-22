"use client";

import { useState } from "react";
import type { Bracket, BracketAnalytics } from "@/lib/types";
import { TeamPill } from "@/components/ui/TeamPill";
import CompareCheckbox from "@/components/ui/CompareCheckbox";
import { displayName } from "@/lib/constants";

interface MobileCardProps {
  bracket: Bracket;
  analytics: BracketAnalytics;
  eliminatedTeams: Set<string>;
  teamLogos?: Record<string, string>;
}

const ROUND_ROWS: { label: string; field: keyof Bracket }[] = [
  { label: "Round of 64", field: "r64_pts" },
  { label: "Round of 32", field: "r32_pts" },
  { label: "Sweet 16", field: "s16_pts" },
  { label: "Elite 8", field: "e8_pts" },
  { label: "Final Four", field: "ff_pts" },
  { label: "Championship", field: "champ_pts" },
];

export default function MobileCard({
  bracket: b,
  analytics: a,
  eliminatedTeams,
  teamLogos = {},
}: MobileCardProps) {
  const [expanded, setExpanded] = useState(false);
  const champEliminated = eliminatedTeams.has(b.champion_pick);
  const maxOverall = b.points + b.max_remaining;
  const primary = displayName(b);
  const showSecondary = primary !== b.name;

  return (
    <div
      className="rounded-card bg-surface-container border border-outline-variant p-3 space-y-2"
      onClick={() => setExpanded((prev) => !prev)}
    >
      {/* Top row: rank, name, points */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <CompareCheckbox bracketId={b.id} />
          {/* Rank badge */}
          <div className="shrink-0 w-8 h-8 rounded-full bg-surface-bright flex items-center justify-center">
            <span className="font-label text-sm font-bold text-on-surface">{a.rank}</span>
          </div>
          <div className="min-w-0">
            <p className="font-body text-sm text-on-surface font-medium truncate">{primary}</p>
            {showSecondary && (
              <p className="text-[11px] text-on-surface-variant truncate">{b.name}</p>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-display text-lg font-bold text-on-surface leading-tight">{b.points}</p>
          <p className="text-[10px] text-on-surface-variant">Max {maxOverall}</p>
        </div>
      </div>

      {/* Champion pill */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-on-surface-variant uppercase font-label tracking-wide">Champ:</span>
        <TeamPill
          name={b.champion_pick}
          seed={b.champion_seed}
          eliminated={champEliminated}
          logo={teamLogos[b.champion_pick]}
          showStatus
        />
        {a.rank_delta > 0 && (
          <span className="ml-auto text-xs text-secondary font-label">+{a.rank_delta}</span>
        )}
        {a.rank_delta === 0 && (
          <span className="ml-auto text-xs text-on-surface-variant font-label">&mdash;</span>
        )}
      </div>

      {/* Expandable round breakdown */}
      {expanded && (
        <div className="pt-1 border-t border-outline-variant space-y-1">
          <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant">Round Breakdown</p>
          {ROUND_ROWS.map(({ label, field }) => {
            const val = b[field] as number;
            return (
              <div key={field} className="flex justify-between text-xs">
                <span className="text-on-surface-variant">{label}</span>
                <span className={val ? "text-on-surface font-label" : "text-on-surface-variant/50"}>
                  {val || "\u2014"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Expand hint */}
      <div className="text-center">
        <span className="text-[10px] text-on-surface-variant/50">
          {expanded ? "Tap to collapse" : "Tap for round breakdown"}
        </span>
      </div>
    </div>
  );
}
