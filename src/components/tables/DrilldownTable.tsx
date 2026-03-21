"use client";

import { useState } from "react";
import type { Bracket, BracketAnalytics } from "@/lib/types";
import { TeamPill } from "@/components/ui/TeamPill";

export function DrilldownTable({
  brackets,
  analytics,
  eliminatedTeams,
}: {
  brackets: Bracket[];
  analytics: Map<string, BracketAnalytics>;
  eliminatedTeams: Set<string>;
}) {
  const [search, setSearch] = useState("");

  const filtered = brackets.filter(
    (b) =>
      b.owner.toLowerCase().includes(search.toLowerCase()) ||
      b.name.toLowerCase().includes(search.toLowerCase())
  );

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
              <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">
                Rank
              </th>
              <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">
                Name
              </th>
              <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">
                Champion
              </th>
              <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">
                Points
              </th>
              <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">
                MAX
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => {
              const a = analytics.get(b.id);
              return (
                <tr
                  key={b.id}
                  className="border-b border-outline hover:bg-surface-bright transition-colors"
                >
                  <td className="px-3 py-2 font-label">{a?.rank ?? "—"}</td>
                  <td className="px-3 py-2">
                    <div className="text-on-surface">{b.owner}</div>
                    <div className="text-xs text-on-surface-variant">
                      {b.name}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <TeamPill
                      name={b.champion_pick}
                      seed={b.champion_seed}
                      eliminated={eliminatedTeams.has(b.champion_pick)}
                    />
                  </td>
                  <td className="px-3 py-2 font-label">{b.points}</td>
                  <td className="px-3 py-2 font-label text-on-surface-variant">
                    {b.max_remaining}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
