"use client";

import { useState } from "react";
import type { Bracket, BracketAnalytics } from "@/lib/types";
import { DrilldownTable } from "@/components/tables/DrilldownTable";

type Filter = "champion" | "ff3" | "all";

export function AliveContent({
  brackets,
  analyticsObj,
  eliminatedArr,
}: {
  brackets: Bracket[];
  analyticsObj: Record<string, BracketAnalytics>;
  eliminatedArr: string[];
}) {
  const [filter, setFilter] = useState<Filter>("champion");

  const eliminatedTeams = new Set(eliminatedArr);
  const analytics = new Map(Object.entries(analyticsObj));

  let filtered: Bracket[];
  switch (filter) {
    case "champion":
      filtered = brackets
        .filter(
          (b) => b.champion_pick && !eliminatedTeams.has(b.champion_pick)
        )
        .sort((a, b) => b.points - a.points);
      break;
    case "ff3":
      filtered = brackets
        .filter((b) => {
          const ffTeams = [b.ff1, b.ff2, b.ff3, b.ff4].filter(Boolean);
          return ffTeams.filter((t) => !eliminatedTeams.has(t)).length >= 3;
        })
        .sort((a, b) => b.points - a.points);
      break;
    default:
      filtered = [...brackets].sort((a, b) => b.points - a.points);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(
          [
            ["champion", "Champion Alive"],
            ["ff3", "3+ Final Four Teams"],
            ["all", "All Brackets"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-card px-4 py-2 text-sm font-label transition-colors ${
              filter === key
                ? "bg-surface-bright text-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <DrilldownTable
        brackets={filtered}
        analytics={analytics}
        eliminatedTeams={eliminatedTeams}
      />
    </div>
  );
}
