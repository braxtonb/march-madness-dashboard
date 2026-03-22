"use client";

import { useState } from "react";
import type { Bracket, BracketAnalytics } from "@/lib/types";
import { TeamPill } from "@/components/ui/TeamPill";
import CompareCheckbox from "@/components/ui/CompareCheckbox";
import { useMyBracket } from "@/components/ui/MyBracketProvider";

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
  const { isMyBracket } = useMyBracket();
  const [expanded, setExpanded] = useState(false);
  const champEliminated = eliminatedTeams.has(b.champion_pick);
  const maxOverall = b.points + b.max_remaining;

  return (
    <div
      className={`group rounded-card border border-outline-variant p-3 space-y-2 ${isMyBracket(b.id) ? "bg-secondary/5 border-l-2 border-l-secondary" : "bg-surface-container"}`}
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
            <p className="font-body text-sm text-on-surface font-semibold truncate">{b.name}</p>
            {b.full_name && b.full_name !== b.name && (
              <p className="text-[11px] text-on-surface-variant truncate">{b.full_name}</p>
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
        <span className="text-[10px] text-on-surface-variant uppercase font-label tracking-wide inline-flex items-center gap-0.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>Champion:</span>
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
