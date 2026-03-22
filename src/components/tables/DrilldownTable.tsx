"use client";

import React, { useState, useMemo } from "react";
import type { Bracket, BracketAnalytics, Round } from "@/lib/types";
import { TeamPill } from "@/components/ui/TeamPill";
import { ROUND_LABELS } from "@/lib/constants";
import CompareCheckbox from "@/components/ui/CompareCheckbox";
import { useMyBracket } from "@/components/ui/MyBracketProvider";

function SortIcon({ direction, active }: { direction: "asc" | "desc" | "neutral"; active?: boolean }) {
  if (direction === "asc") return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`inline-block ml-0.5 ${active ? "text-on-surface-variant" : "text-on-surface-variant/40"}`}>
      <path d="M5 2L8 6H2L5 2Z" fill="currentColor" />
    </svg>
  );
  if (direction === "desc") return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`inline-block ml-0.5 ${active ? "text-on-surface-variant" : "text-on-surface-variant/40"}`}>
      <path d="M5 8L2 4H8L5 8Z" fill="currentColor" />
    </svg>
  );
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="none" className="inline-block ml-0.5 opacity-30">
      <path d="M5 1L8 5H2L5 1Z" fill="currentColor" />
      <path d="M5 13L2 9H8L5 13Z" fill="currentColor" />
    </svg>
  );
}

interface PathPick {
  round: string;
  team: string;
  seed: number;
  pts: number;
  logo: string;
}

interface PathEntry {
  name: string;
  owner: string;
  full_name: string;
  points: number;
  maxRemaining: number;
  champion: string;
  championLogo: string;
  championAlive: boolean;
  remainingPicks: PathPick[];
  eliminatedPickCount: number;
}

type SortKey = "rank" | "points" | "max_remaining";

export function DrilldownTable({
  brackets,
  analytics,
  eliminatedTeams,
  teamLogos = {},
  pathData = [],
}: {
  brackets: Bracket[];
  analytics: Map<string, BracketAnalytics>;
  eliminatedTeams: Set<string>;
  teamLogos?: Record<string, string>;
  pathData?: PathEntry[];
}) {
  const { isMyBracket } = useMyBracket();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const pathByName = useMemo(() => {
    const map = new Map<string, PathEntry>();
    for (const p of pathData) {
      map.set(p.name, p);
    }
    return map;
  }, [pathData]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = brackets.filter(
      (b) => b.owner.toLowerCase().includes(q) || b.name.toLowerCase().includes(q) || (b.full_name || "").toLowerCase().includes(q)
    );
    return list.sort((a, b) => {
      const aA = analytics.get(a.id);
      const bA = analytics.get(b.id);
      let aVal: number, bVal: number;
      switch (sortKey) {
        case "rank": aVal = aA?.rank ?? 999; bVal = bA?.rank ?? 999; break;
        case "points": aVal = a.points; bVal = b.points; break;
        case "max_remaining": aVal = a.max_remaining; bVal = b.max_remaining; break;
        default: aVal = aA?.rank ?? 999; bVal = bA?.rank ?? 999;
      }
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
  }, [brackets, search, sortKey, sortAsc, analytics]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === "rank"); }
  }
  const sortIcon = (key: SortKey) => {
    const active = sortKey === key;
    const direction = active ? (sortAsc ? "asc" : "desc") : "neutral";
    return <SortIcon direction={direction} active={active} />;
  };
  const hdr = "group/hdr px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant cursor-pointer hover:text-on-surface select-none";
  const hdrStatic = "px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant cursor-default";

  return (
    <div className="space-y-3">
      <div className="relative w-full sm:w-72">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant pointer-events-none"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          placeholder="Search brackets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-card bg-surface-container border border-outline px-3 py-2.5 pl-9 text-sm text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all min-h-[36px]"
        />
      </div>

      {/* Mobile card stack */}
      <div className="sm:hidden space-y-2">
        {filtered.map((b) => {
          const a = analytics.get(b.id);
          return (
            <div key={b.id} className={`group rounded-card bg-surface-container border border-outline-variant p-3 space-y-2 ${isMyBracket(b.id) ? "bg-secondary/5 border-l-2 border-l-secondary" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CompareCheckbox bracketId={b.id} />
                  <div className="shrink-0 w-7 h-7 rounded-full bg-surface-bright flex items-center justify-center">
                    <span className="font-label text-xs font-bold text-on-surface">{a?.rank ?? "—"}</span>
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
                  <p className="text-[10px] text-on-surface-variant">Max {b.points + b.max_remaining}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-on-surface-variant uppercase font-label tracking-wide">Champ:</span>
                <TeamPill name={b.champion_pick} seed={b.champion_seed} eliminated={eliminatedTeams.has(b.champion_pick)} logo={teamLogos[b.champion_pick]} showStatus />
                <span className="ml-auto text-[10px] text-on-surface-variant font-label">+{b.max_remaining} remaining</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-card bg-surface-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline">
              <th className="w-8"></th>
              <th className={hdr} onClick={() => toggleSort("rank")} title="Current ranking based on total points">Rank{sortIcon("rank")}</th>
              <th className={hdrStatic} title="Bracket name and username">Name</th>
              <th className={hdrStatic} title="Championship pick — green dot if still alive">Champion</th>
              <th className={hdr} onClick={() => toggleSort("points")} title="Total points earned so far">Points{sortIcon("points")}</th>
              <th className={hdr} onClick={() => toggleSort("max_remaining")} title="Maximum possible points remaining">MAX{sortIcon("max_remaining")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => {
              const a = analytics.get(b.id);
              const isExpanded = expandedIds.has(b.id);
              const path = pathByName.get(b.name);
              return (
                <React.Fragment key={b.id}>
                <tr
                  className={`group border-b border-outline transition-colors cursor-pointer ${isExpanded ? "bg-surface-bright" : "hover:bg-surface-bright"} ${isMyBracket(b.id) ? "bg-secondary/5 border-l-2 border-l-secondary" : ""}`}
                  onClick={() => setExpandedIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(b.id)) next.delete(b.id);
                    else next.add(b.id);
                    return next;
                  })}
                >
                  <td className="w-8 px-1 py-2"><CompareCheckbox bracketId={b.id} /></td>
                  <td className="px-3 py-2 font-label">{a?.rank ?? "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-on-surface-variant/60 w-4 text-center font-label leading-none">{isExpanded ? "−" : "+"}</span>
                      <div>
                        <div className="font-semibold text-on-surface">{b.name}</div>
                        {b.full_name && b.full_name !== b.name && <div className="text-xs text-on-surface-variant">{b.full_name}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <TeamPill name={b.champion_pick} seed={b.champion_seed} eliminated={eliminatedTeams.has(b.champion_pick)} logo={teamLogos[b.champion_pick]} showStatus />
                  </td>
                  <td className="px-3 py-2 font-label">{b.points}</td>
                  <td className="px-3 py-2 font-label text-on-surface-variant">{b.max_remaining}</td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={6} className="px-4 py-3 bg-surface-bright/50">
                      <div className="space-y-2">
                        <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant">
                          Path to victory — {path ? path.remainingPicks.length : 0} alive picks remaining
                          {path && path.eliminatedPickCount > 0 && (
                            <span className="ml-2 text-on-surface-variant/50">({path.eliminatedPickCount} eliminated)</span>
                          )}
                        </p>
                        {!path || path.remainingPicks.length === 0 ? (
                          <p className="text-xs text-on-surface-variant italic">No remaining picks with alive teams</p>
                        ) : (
                          <div className="space-y-1.5">
                            {["R32", "S16", "E8", "FF", "CHAMP"].map((round) => {
                              const picks = path.remainingPicks.filter((p) => p.round === round);
                              if (picks.length === 0) return null;
                              return (
                                <div key={round} className="flex items-center gap-2">
                                  <span className="font-label text-[10px] text-on-surface-variant w-28 shrink-0">
                                    {ROUND_LABELS[round as Round] || round}
                                    <span className="ml-1 text-secondary">+{picks.reduce((s, p) => s + p.pts, 0)}</span>
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {picks.map((p) => (
                                      <TeamPill
                                        key={`${round}-${p.team}`}
                                        name={p.team}
                                        seed={p.seed}
                                        logo={p.logo}
                                      />
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
