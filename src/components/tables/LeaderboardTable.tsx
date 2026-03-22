"use client";

import { useState, useEffect } from "react";
import type { Bracket, BracketAnalytics } from "@/lib/types";
import { TeamPill } from "@/components/ui/TeamPill";
import { ROUND_LABELS } from "@/lib/constants";
import type { Round } from "@/lib/types";
import MobileSortDropdown from "@/components/ui/MobileSortDropdown";
import MobileCard from "@/components/ui/MobileCard";
import CompareCheckbox from "@/components/ui/CompareCheckbox";
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

type SortKey = "rank" | "points" | "max" | "r64" | "r32" | "s16" | "e8" | "ff" | "champ";

interface PathPick {
  round: string;
  team: string;
  seed: number;
  pts: number;
  logo: string;
}

interface PathEntry {
  bracketId: string;
  remainingPicks: PathPick[];
  eliminatedPickCount: number;
}

export function LeaderboardTable({
  brackets,
  analytics,
  eliminatedTeams,
  teamLogos = {},
  pathEntries = [],
}: {
  brackets: Bracket[];
  analytics: Map<string, BracketAnalytics>;
  eliminatedTeams: Set<string>;
  teamLogos?: Record<string, string>;
  pathEntries?: PathEntry[];
}) {
  const { isMyBracket } = useMyBracket();

  // Initialize sort from URL params
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    if (typeof window === "undefined") return "rank";
    const params = new URLSearchParams(window.location.search);
    const s = params.get("sort") as SortKey | null;
    const validKeys: SortKey[] = ["rank", "points", "max", "r64", "r32", "s16", "e8", "ff", "champ"];
    return s && validKeys.includes(s) ? s : "rank";
  });
  const [sortAsc, setSortAsc] = useState(() => {
    if (typeof window === "undefined") return true;
    const params = new URLSearchParams(window.location.search);
    const d = params.get("dir");
    if (d === "asc") return true;
    if (d === "desc") return false;
    return true;
  });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const pathMap = new Map(pathEntries.map((p) => [p.bracketId, p]));

  const sorted = [...brackets].sort((a, b) => {
    const aA = analytics.get(a.id);
    const bA = analytics.get(b.id);
    if (!aA || !bA) return 0;

    let aVal: number, bVal: number;
    switch (sortKey) {
      case "rank": aVal = aA.rank; bVal = bA.rank; break;
      case "points": aVal = a.points; bVal = b.points; break;
      case "max": aVal = a.points + a.max_remaining; bVal = b.points + b.max_remaining; break;
      case "r64": aVal = a.r64_pts; bVal = b.r64_pts; break;
      case "r32": aVal = a.r32_pts; bVal = b.r32_pts; break;
      case "s16": aVal = a.s16_pts; bVal = b.s16_pts; break;
      case "e8": aVal = a.e8_pts; bVal = b.e8_pts; break;
      case "ff": aVal = a.ff_pts; bVal = b.ff_pts; break;
      case "champ": aVal = a.champ_pts; bVal = b.champ_pts; break;
      default: aVal = aA.rank; bVal = bA.rank;
    }
    return sortAsc ? aVal - bVal : bVal - aVal;
  });

  function toggleSort(key: SortKey) {
    const newAsc = sortKey === key ? !sortAsc : key === "rank";
    setSortKey(key);
    setSortAsc(newAsc);
    const url = new URL(window.location.href);
    url.searchParams.set("sort", key);
    url.searchParams.set("dir", newAsc ? "asc" : "desc");
    window.history.replaceState(null, "", url.toString());
  }

  const mobileSortOptions = [
    { key: "rank", label: "Sort by Rank" },
    { key: "points", label: "Sort by Points" },
    { key: "max", label: "Sort by Max Possible" },
  ];

  const hdr = "group/hdr px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant cursor-pointer hover:text-on-surface select-none whitespace-nowrap";
  const hdrDotted = "border-b border-dotted border-on-surface-variant/40";
  const hdrStatic = "px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant cursor-default whitespace-nowrap";
  const sortIcon = (key: SortKey) => {
    const active = sortKey === key;
    const direction = active ? (sortAsc ? "asc" : "desc") : "neutral";
    return <SortIcon direction={direction} active={active} />;
  };
  const colCount = 12;

  return (
    <>
      {/* Mobile card view */}
      <div className="sm:hidden space-y-2">
        <MobileSortDropdown
          options={mobileSortOptions}
          value={sortKey}
          onChange={(key) => {
            const newKey = key as SortKey;
            const newAsc = sortKey === newKey ? !sortAsc : newKey === "rank";
            setSortKey(newKey);
            setSortAsc(newAsc);
            const url = new URL(window.location.href);
            url.searchParams.set("sort", newKey);
            url.searchParams.set("dir", newAsc ? "asc" : "desc");
            window.history.replaceState(null, "", url.toString());
          }}
        />
        {sorted.map((b) => {
          const a = analytics.get(b.id);
          if (!a) return null;
          return (
            <MobileCard
              key={b.id}
              bracket={b}
              analytics={a}
              eliminatedTeams={eliminatedTeams}
              teamLogos={teamLogos}
            />
          );
        })}
      </div>

      {/* Desktop table view */}
      <div className="hidden sm:block overflow-x-auto rounded-card bg-surface-container">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-20 bg-surface-container">
          <tr className="border-b border-outline">
            <th className="w-8"></th>
            <th className={`${hdr} relative`} onClick={() => toggleSort("rank")}><span className={`${hdrDotted} peer`}>Rank</span>{sortIcon("rank")}<span className="absolute left-0 top-full mt-1 px-2 py-1 rounded bg-surface-bright text-[10px] text-on-surface w-max max-w-[200px] opacity-0 pointer-events-none peer-hover:opacity-100 transition-opacity z-30 shadow-lg border border-outline-variant">Current standing based on total points</span></th>
            <th className={hdrStatic}>Name</th>
            <th className={hdrStatic}>Champion</th>
            <th className={`${hdr} relative`} onClick={() => toggleSort("points")}><span className={`${hdrDotted} peer`}>Pts</span>{sortIcon("points")}<span className="absolute left-0 top-full mt-1 px-2 py-1 rounded bg-surface-bright text-[10px] text-on-surface w-max max-w-[200px] opacity-0 pointer-events-none peer-hover:opacity-100 transition-opacity z-30 shadow-lg border border-outline-variant">Total points earned from correct picks</span></th>
            <th className={`${hdr} relative`} onClick={() => toggleSort("max")}><span className={`${hdrDotted} peer`}>Max</span>{sortIcon("max")}<span className="absolute left-0 top-full mt-1 px-2 py-1 rounded bg-surface-bright text-[10px] text-on-surface w-max max-w-[200px] opacity-0 pointer-events-none peer-hover:opacity-100 transition-opacity z-30 shadow-lg border border-outline-variant">Maximum possible points if all remaining picks are correct</span></th>
            <th className={`${hdr} relative`} onClick={() => toggleSort("r64")}><span className={`${hdrDotted} peer`}>R64</span>{sortIcon("r64")}<span className="absolute left-0 top-full mt-1 px-2 py-1 rounded bg-surface-bright text-[10px] text-on-surface w-max max-w-[200px] opacity-0 pointer-events-none peer-hover:opacity-100 transition-opacity z-30 shadow-lg border border-outline-variant">Points earned in the Round of 64 (10 pts per correct pick)</span></th>
            <th className={`${hdr} relative`} onClick={() => toggleSort("r32")}><span className={`${hdrDotted} peer`}>R32</span>{sortIcon("r32")}<span className="absolute left-0 top-full mt-1 px-2 py-1 rounded bg-surface-bright text-[10px] text-on-surface w-max max-w-[200px] opacity-0 pointer-events-none peer-hover:opacity-100 transition-opacity z-30 shadow-lg border border-outline-variant">Points earned in the Round of 32 (20 pts per correct pick)</span></th>
            <th className={`${hdr} relative`} onClick={() => toggleSort("s16")}><span className={`${hdrDotted} peer`}>S16</span>{sortIcon("s16")}<span className="absolute left-0 top-full mt-1 px-2 py-1 rounded bg-surface-bright text-[10px] text-on-surface w-max max-w-[200px] opacity-0 pointer-events-none peer-hover:opacity-100 transition-opacity z-30 shadow-lg border border-outline-variant">Points earned in the Sweet 16 (40 pts per correct pick)</span></th>
            <th className={`${hdr} relative`} onClick={() => toggleSort("e8")}><span className={`${hdrDotted} peer`}>E8</span>{sortIcon("e8")}<span className="absolute left-0 top-full mt-1 px-2 py-1 rounded bg-surface-bright text-[10px] text-on-surface w-max max-w-[200px] opacity-0 pointer-events-none peer-hover:opacity-100 transition-opacity z-30 shadow-lg border border-outline-variant">Points earned in the Elite 8 (80 pts per correct pick)</span></th>
            <th className={`${hdr} relative`} onClick={() => toggleSort("ff")}><span className={`${hdrDotted} peer`}>FF</span>{sortIcon("ff")}<span className="absolute left-0 top-full mt-1 px-2 py-1 rounded bg-surface-bright text-[10px] text-on-surface w-max max-w-[200px] opacity-0 pointer-events-none peer-hover:opacity-100 transition-opacity z-30 shadow-lg border border-outline-variant">Points earned in the Final Four (160 pts per correct pick)</span></th>
            <th className={`${hdr} relative`} onClick={() => toggleSort("champ")}><span className={`${hdrDotted} peer`}>Champ</span>{sortIcon("champ")}<span className="absolute left-0 top-full mt-1 px-2 py-1 rounded bg-surface-bright text-[10px] text-on-surface w-max max-w-[200px] opacity-0 pointer-events-none peer-hover:opacity-100 transition-opacity z-30 shadow-lg border border-outline-variant">Points earned in the Championship (320 pts per correct pick)</span></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((b) => {
            const a = analytics.get(b.id);
            if (!a) return null;
            const champEliminated = eliminatedTeams.has(b.champion_pick);
            const maxOverall = b.points + b.max_remaining;
            const isExpanded = expandedIds.has(b.id);
            const path = pathMap.get(b.id);

            return (
              <>
                <tr
                  key={b.id}
                  className={`group border-b border-outline transition-colors cursor-pointer ${isMyBracket(b.id) ? "bg-secondary/5 border-l-2 border-l-secondary" : isExpanded ? "bg-surface-bright" : "hover:bg-surface-bright"}`}
                  onClick={() => setExpandedIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(b.id)) next.delete(b.id);
                    else next.add(b.id);
                    return next;
                  })}
                >
                  <td className="w-8 px-1 py-2"><CompareCheckbox bracketId={b.id} /></td>
                  <td className="px-2 py-2 font-label">
                    <span className="text-on-surface">{a.rank}</span>
                    {a.rank_delta > 0 && (
                      <span className="ml-1 text-secondary text-xs">+{a.rank_delta}</span>
                    )}
                    {a.rank_delta === 0 && (
                      <span className="ml-1 text-on-surface-variant text-xs">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-on-surface-variant/60 w-4 text-center font-label leading-none">{isExpanded ? "−" : "+"}</span>
                      <div>
                        <div className="font-body font-semibold text-on-surface text-xs">{b.name}</div>
                        {b.full_name && b.full_name !== b.name && <div className="text-[10px] text-on-surface-variant">{b.full_name}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <TeamPill
                      name={b.champion_pick}
                      seed={b.champion_seed}
                      eliminated={champEliminated}
                      logo={teamLogos[b.champion_pick]}
                      showStatus
                    />
                  </td>
                  <td className="px-2 py-2 font-label text-on-surface font-semibold">{b.points}</td>
                  <td className="px-2 py-2 font-label text-on-surface-variant">{maxOverall}</td>
                  <td className="px-2 py-2 font-label text-on-surface-variant text-xs">{b.r64_pts || "—"}</td>
                  <td className="px-2 py-2 font-label text-on-surface-variant text-xs">{b.r32_pts || "—"}</td>
                  <td className="px-2 py-2 font-label text-on-surface-variant text-xs">{b.s16_pts || "—"}</td>
                  <td className="px-2 py-2 font-label text-on-surface-variant text-xs">{b.e8_pts || "—"}</td>
                  <td className="px-2 py-2 font-label text-on-surface-variant text-xs">{b.ff_pts || "—"}</td>
                  <td className="px-2 py-2 font-label text-on-surface-variant text-xs">{b.champ_pts || "—"}</td>
                </tr>
                {isExpanded && path && (
                  <tr key={`${b.id}-path`}>
                    <td colSpan={colCount} className="px-4 py-3 bg-surface-bright/50">
                      <div className="space-y-2">
                        <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant">
                          Path to victory — {path.remainingPicks.length} alive picks remaining
                          {path.eliminatedPickCount > 0 && (
                            <span className="ml-2 text-on-surface-variant/50">({path.eliminatedPickCount} eliminated)</span>
                          )}
                        </p>
                        {path.remainingPicks.length === 0 ? (
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
              </>
            );
          })}
        </tbody>
      </table>
      </div>
    </>
  );
}
