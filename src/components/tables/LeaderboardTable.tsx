"use client";

import { useState } from "react";
import type { Bracket, BracketAnalytics } from "@/lib/types";
import { TeamPill } from "@/components/ui/TeamPill";

type SortKey = "rank" | "points" | "max_remaining" | "uniqueness";

export function LeaderboardTable({
  brackets,
  analytics,
  eliminatedTeams,
}: {
  brackets: Bracket[];
  analytics: Map<string, BracketAnalytics>;
  eliminatedTeams: Set<string>;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = [...brackets].sort((a, b) => {
    const aA = analytics.get(a.id);
    const bA = analytics.get(b.id);
    if (!aA || !bA) return 0;

    let aVal: number, bVal: number;
    switch (sortKey) {
      case "rank":
        aVal = aA.rank;
        bVal = bA.rank;
        break;
      case "points":
        aVal = a.points;
        bVal = b.points;
        break;
      case "max_remaining":
        aVal = a.max_remaining;
        bVal = b.max_remaining;
        break;
      case "uniqueness":
        aVal = aA.uniqueness;
        bVal = bA.uniqueness;
        break;
      default:
        aVal = aA.rank;
        bVal = bA.rank;
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

  const headerClass =
    "px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant cursor-pointer hover:text-on-surface select-none";

  return (
    <div className="overflow-x-auto rounded-card bg-surface-container">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-outline">
            <th className={headerClass} onClick={() => toggleSort("rank")}>
              Rank {sortKey === "rank" && (sortAsc ? "↑" : "↓")}
            </th>
            <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">
              Name
            </th>
            <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">
              Champion
            </th>
            <th className={headerClass} onClick={() => toggleSort("points")}>
              Pts {sortKey === "points" && (sortAsc ? "↑" : "↓")}
            </th>
            <th className={headerClass} onClick={() => toggleSort("max_remaining")}>
              MAX {sortKey === "max_remaining" && (sortAsc ? "↑" : "↓")}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((b) => {
            const a = analytics.get(b.id);
            if (!a) return null;
            const champEliminated = eliminatedTeams.has(b.champion_pick);

            return (
              <tr
                key={b.id}
                className="border-b border-outline transition-colors hover:bg-surface-bright"
              >
                <td className="px-3 py-2.5 font-label">
                  <span className="text-on-surface">{a.rank}</span>
                  {a.rank_delta > 0 && (
                    <span className="ml-1.5 text-secondary text-xs">
                      +{a.rank_delta}
                    </span>
                  )}
                  {a.rank_delta === 0 && (
                    <span className="ml-1.5 text-on-surface-variant text-xs">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <div className="font-body text-on-surface">{b.name}</div>
                  <div className="text-xs text-on-surface-variant">{b.owner}</div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <TeamPill
                      name={b.champion_pick}
                      seed={b.champion_seed}
                      eliminated={champEliminated}
                    />
                    {!champEliminated && b.champion_pick && (
                      <span className="inline-block h-2 w-2 rounded-full bg-secondary" />
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 font-label text-on-surface">
                  {b.points}
                </td>
                <td className="px-3 py-2.5 font-label text-on-surface-variant">
                  {b.max_remaining}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
