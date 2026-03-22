"use client";

import { useState, useMemo } from "react";
import type { Bracket, BracketAnalytics } from "@/lib/types";
import { TeamPill } from "@/components/ui/TeamPill";

type SortKey = "rank" | "points" | "max_remaining";

export function DrilldownTable({
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
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = brackets.filter(
      (b) => b.owner.toLowerCase().includes(q) || b.name.toLowerCase().includes(q)
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
  const arrow = (key: SortKey) => sortKey === key ? (sortAsc ? " ↑" : " ↓") : "";
  const hdr = "px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant cursor-pointer hover:text-on-surface select-none";

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Search brackets..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-card bg-surface-bright px-4 py-2 text-sm text-on-surface placeholder:text-on-surface-variant outline-none"
      />
      <div className="overflow-x-auto rounded-card bg-surface-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline">
              <th className={hdr} onClick={() => toggleSort("rank")} title="Current ranking based on total points">Rank{arrow("rank")}</th>
              <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant" title="Bracket name and username">Name</th>
              <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant" title="Championship pick — green dot if still alive">Champion</th>
              <th className={hdr} onClick={() => toggleSort("points")} title="Total points earned so far">Points{arrow("points")}</th>
              <th className={hdr} onClick={() => toggleSort("max_remaining")} title="Maximum possible points remaining">MAX{arrow("max_remaining")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => {
              const a = analytics.get(b.id);
              return (
                <tr key={b.id} className="border-b border-outline hover:bg-surface-bright transition-colors">
                  <td className="px-3 py-2 font-label">{a?.rank ?? "—"}</td>
                  <td className="px-3 py-2">
                    <div className="text-on-surface">{b.name}</div>
                    <div className="text-xs text-on-surface-variant">{b.owner}</div>
                  </td>
                  <td className="px-3 py-2">
                    <TeamPill name={b.champion_pick} seed={b.champion_seed} eliminated={eliminatedTeams.has(b.champion_pick)} logo={teamLogos[b.champion_pick]} showStatus />
                  </td>
                  <td className="px-3 py-2 font-label">{b.points}</td>
                  <td className="px-3 py-2 font-label text-on-surface-variant">{b.max_remaining}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
