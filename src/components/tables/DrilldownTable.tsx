"use client";

import React, { useState, useMemo, useEffect } from "react";
import type { Bracket, BracketAnalytics, Round } from "@/lib/types";
import { TeamPill } from "@/components/ui/TeamPill";
import { ROUND_LABELS } from "@/lib/constants";
import CompareCheckbox from "@/components/ui/CompareCheckbox";
import MultiSelectSearch from "@/components/ui/MultiSelectSearch";
import type { MultiSelectOption } from "@/components/ui/MultiSelectSearch";
import { useMyBracket } from "@/components/ui/MyBracketProvider";

function SortIcon({ direction, active }: { direction: "asc" | "desc" | "neutral"; active?: boolean }) {
  if (direction === "asc") return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ml-0.5 ${active ? "text-on-surface-variant" : "text-on-surface-variant/40"}`}>
      <path d="M12 5v14" /><path d="m12 5-4 4" /><path d="m12 5 4 4" />
    </svg>
  );
  if (direction === "desc") return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ml-0.5 ${active ? "text-on-surface-variant" : "text-on-surface-variant/40"}`}>
      <path d="M12 19V5" /><path d="m12 19-4-4" /><path d="m12 19 4-4" />
    </svg>
  );
  return (
    <svg width="10" height="14" viewBox="0 0 24 28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline-block ml-0.5 opacity-30">
      <path d="M12 3v8" /><path d="m12 3-3 3" /><path d="m12 3 3 3" />
      <path d="M12 25v-8" /><path d="m12 25-3-3" /><path d="m12 25 3-3" />
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
  const [searchIds, setSearchIds] = useState<string[]>([]);

  // Initialize sort from URL params (prefixed with "a" for alive table)
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    if (typeof window === "undefined") return "rank";
    const params = new URLSearchParams(window.location.search);
    const s = params.get("asort") as SortKey | null;
    const validKeys: SortKey[] = ["rank", "points", "max_remaining"];
    return s && validKeys.includes(s) ? s : "rank";
  });
  const [sortAsc, setSortAsc] = useState(() => {
    if (typeof window === "undefined") return true;
    const params = new URLSearchParams(window.location.search);
    const d = params.get("adir");
    if (d === "asc") return true;
    if (d === "desc") return false;
    return true;
  });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const bracketOptions: MultiSelectOption[] = useMemo(() => {
    return brackets.map((b) => ({
      value: b.id,
      label: b.name,
      sublabel: b.full_name && b.full_name !== b.name ? b.full_name : undefined,
    }));
  }, [brackets]);

  const pathByName = useMemo(() => {
    const map = new Map<string, PathEntry>();
    for (const p of pathData) {
      map.set(p.name, p);
    }
    return map;
  }, [pathData]);

  const filtered = useMemo(() => {
    let list = brackets;
    if (searchIds.length > 0) {
      const idSet = new Set(searchIds);
      list = brackets.filter((b) => idSet.has(b.id));
    }
    return [...list].sort((a, b) => {
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
  }, [brackets, searchIds, sortKey, sortAsc, analytics]);

  function toggleSort(key: SortKey) {
    const newAsc = sortKey === key ? !sortAsc : key === "rank";
    setSortKey(key);
    setSortAsc(newAsc);
    const url = new URL(window.location.href);
    url.searchParams.set("asort", key);
    url.searchParams.set("adir", newAsc ? "asc" : "desc");
    window.history.replaceState(null, "", url.toString());
  }
  const sortIcon = (key: SortKey) => {
    const active = sortKey === key;
    const direction = active ? (sortAsc ? "asc" : "desc") : "neutral";
    return <SortIcon direction={direction} active={active} />;
  };
  const hdr = "group/hdr px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant cursor-pointer hover:text-on-surface select-none";
  const hdrDotted = "border-b border-dotted border-on-surface-variant/40";
  const hdrStatic = "px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant cursor-default";

  return (
    <div className="space-y-3">
      <div className="w-full sm:w-72">
        <MultiSelectSearch
          mode="multi"
          label="Brackets"
          options={bracketOptions}
          selected={searchIds}
          onSelectedChange={setSearchIds}
          placeholder="Filter brackets..."
        />
      </div>
      {searchIds.length > 0 && (
        <p className="text-xs text-on-surface-variant">
          Showing {filtered.length} of {brackets.length} brackets
        </p>
      )}

      {/* Mobile card stack */}
      <div className="sm:hidden space-y-2">
        {filtered.map((b) => {
          const a = analytics.get(b.id);
          return (
            <div key={b.id} className={`group rounded-card border border-outline-variant p-3 space-y-2 ${isMyBracket(b.id) ? "bg-secondary/5 border-l-2 border-l-secondary" : "bg-surface-container"}`}>
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
                <span className="text-[10px] text-on-surface-variant uppercase font-label tracking-wide">Champion:</span>
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
          <thead className="sticky top-0 z-20 bg-surface-container">
            <tr className="border-b border-outline">
              <th className="w-8"></th>
              <th className={`${hdr} relative`} onClick={() => toggleSort("rank")}><span className={`${hdrDotted} peer`}>Rank</span>{sortIcon("rank")}<span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 rounded bg-surface-bright text-[10px] text-on-surface whitespace-nowrap opacity-0 pointer-events-none peer-hover:opacity-100 transition-opacity z-20 shadow-lg border border-outline-variant">Current overall ranking</span></th>
              <th className={hdrStatic}>Name</th>
              <th className={hdrStatic}>Champion</th>
              <th className={`${hdr} relative`} onClick={() => toggleSort("points")}><span className={`${hdrDotted} peer`}>Points</span>{sortIcon("points")}<span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 rounded bg-surface-bright text-[10px] text-on-surface whitespace-nowrap opacity-0 pointer-events-none peer-hover:opacity-100 transition-opacity z-20 shadow-lg border border-outline-variant">Total points earned so far</span></th>
              <th className={`${hdr} relative`} onClick={() => toggleSort("max_remaining")}><span className={`${hdrDotted} peer`}>MAX</span>{sortIcon("max_remaining")}<span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 rounded bg-surface-bright text-[10px] text-on-surface whitespace-nowrap opacity-0 pointer-events-none peer-hover:opacity-100 transition-opacity z-20 shadow-lg border border-outline-variant">Maximum remaining points possible</span></th>
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
                  className={`group border-b border-outline transition-colors cursor-pointer ${isMyBracket(b.id) ? "bg-secondary/5 border-l-2 border-l-secondary" : isExpanded ? "bg-surface-bright" : "hover:bg-surface-bright"}`}
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
