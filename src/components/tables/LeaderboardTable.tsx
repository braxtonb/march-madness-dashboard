"use client";

import { useState } from "react";
import type { Bracket, BracketAnalytics } from "@/lib/types";
import { TeamPill } from "@/components/ui/TeamPill";

type SortKey = "rank" | "points" | "max" | "r64" | "r32" | "s16" | "e8" | "ff" | "champ";

export function LeaderboardTable({
  brackets,
  analytics,
  eliminatedTeams,
  teamLogos = {},
}: {
  brackets: Bracket[];
  analytics: Map<string, BracketAnalytics>;
  eliminatedTeams: Set<string>;
  teamLogos?: Record<string, string>;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState(true);

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
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "rank");
    }
  }

  const hdr = "px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant cursor-pointer hover:text-on-surface select-none whitespace-nowrap";
  const hdrStatic = "px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant whitespace-nowrap";
  const arrow = (key: SortKey) => sortKey === key ? (sortAsc ? " ↑" : " ↓") : "";

  return (
    <div className="overflow-x-auto rounded-card bg-surface-container">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-outline">
            <th className={hdr} onClick={() => toggleSort("rank")}>Rank{arrow("rank")}</th>
            <th className={hdrStatic}>Name</th>
            <th className={hdrStatic}>Champion</th>
            <th className={hdr} onClick={() => toggleSort("points")}>Pts{arrow("points")}</th>
            <th className={hdr} onClick={() => toggleSort("max")}>Max{arrow("max")}</th>
            <th className={hdr} onClick={() => toggleSort("r64")}>R64{arrow("r64")}</th>
            <th className={hdr} onClick={() => toggleSort("r32")}>R32{arrow("r32")}</th>
            <th className={hdr} onClick={() => toggleSort("s16")}>S16{arrow("s16")}</th>
            <th className={hdr} onClick={() => toggleSort("e8")}>E8{arrow("e8")}</th>
            <th className={hdr} onClick={() => toggleSort("ff")}>FF{arrow("ff")}</th>
            <th className={hdr} onClick={() => toggleSort("champ")}>Champ{arrow("champ")}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((b) => {
            const a = analytics.get(b.id);
            if (!a) return null;
            const champEliminated = eliminatedTeams.has(b.champion_pick);
            const maxOverall = b.points + b.max_remaining;

            return (
              <tr
                key={b.id}
                className="border-b border-outline transition-colors hover:bg-surface-bright"
              >
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
                  <div className="font-body text-on-surface text-xs">{b.name}</div>
                  <div className="text-[10px] text-on-surface-variant">{b.owner}</div>
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
                <td className="px-2 py-2 font-label text-on-surface font-semibold">
                  {b.points}
                </td>
                <td className="px-2 py-2 font-label text-on-surface-variant">
                  {maxOverall}
                </td>
                <td className="px-2 py-2 font-label text-on-surface-variant text-xs">
                  {b.r64_pts || "—"}
                </td>
                <td className="px-2 py-2 font-label text-on-surface-variant text-xs">
                  {b.r32_pts || "—"}
                </td>
                <td className="px-2 py-2 font-label text-on-surface-variant text-xs">
                  {b.s16_pts || "—"}
                </td>
                <td className="px-2 py-2 font-label text-on-surface-variant text-xs">
                  {b.e8_pts || "—"}
                </td>
                <td className="px-2 py-2 font-label text-on-surface-variant text-xs">
                  {b.ff_pts || "—"}
                </td>
                <td className="px-2 py-2 font-label text-on-surface-variant text-xs">
                  {b.champ_pts || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
