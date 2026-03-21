"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TeamPill } from "@/components/ui/TeamPill";
import { InsightFortuneScatter } from "@/components/charts/InsightFortuneScatter";
import { ROUND_LABELS } from "@/lib/constants";
import type { Round } from "@/lib/types";

type FinaleTab = "standings" | "insight" | "calls" | "report";

interface BracketStanding {
  id: string;
  name: string;
  owner: string;
  points: number;
  champion_pick: string;
  champion_seed: number;
}

interface ScatterPoint {
  name: string;
  insight: number;
  fortune: number;
}

interface GreatestCall {
  bracketName: string;
  bracketOwner: string;
  teamPicked: string;
  seedPicked: number;
  rate: number;
  round: string;
}

interface RoundAccuracy {
  round: string;
  correct: number;
  total: number;
}

function isValidTab(value: string | null): value is FinaleTab {
  return value === "standings" || value === "insight" || value === "calls" || value === "report";
}

const TAB_OPTIONS: { label: string; value: FinaleTab }[] = [
  { label: "Standings", value: "standings" },
  { label: "Insight vs Fortune", value: "insight" },
  { label: "Greatest Calls", value: "calls" },
  { label: "Group Report Card", value: "report" },
];

export function FinaleContent({
  sorted,
  scatterData,
  greatestCalls,
  roundAccuracy,
  isComplete,
}: {
  sorted: BracketStanding[];
  scatterData: ScatterPoint[];
  greatestCalls: GreatestCall[];
  roundAccuracy: RoundAccuracy[];
  isComplete: boolean;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialTab = isValidTab(searchParams.get("tab"))
    ? (searchParams.get("tab") as FinaleTab)
    : "standings";

  const [tab, setTab] = useState<FinaleTab>(initialTab);

  const updateUrl = useCallback(
    (params: URLSearchParams) => {
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router]
  );

  const changeTab = useCallback(
    (newTab: FinaleTab) => {
      setTab(newTab);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", newTab);
      updateUrl(params);
    },
    [searchParams, updateUrl]
  );

  // Keep tab in sync if user navigates back/forward
  useEffect(() => {
    const paramTab = searchParams.get("tab");
    if (isValidTab(paramTab) && paramTab !== tab) {
      setTab(paramTab);
    }
  }, [searchParams, tab]);

  const trophies = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];
  const colors = ["text-achievement", "text-on-surface-variant", "text-action"];

  return (
    <div className="space-y-6">
      {/* Tab pills */}
      <div className="flex gap-2 flex-wrap">
        {TAB_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => changeTab(opt.value)}
            className={`rounded-card px-4 py-2 text-sm font-label transition-colors ${
              tab === opt.value
                ? "bg-surface-bright text-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Standings tab */}
      {tab === "standings" && (
        <div className="space-y-6">
          {/* Top 3 podium */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sorted.slice(0, 3).map((b, i) => (
              <div key={b.id} className="rounded-card bg-surface-container p-5 text-center space-y-2">
                <span className="text-4xl">{trophies[i]}</span>
                <p className={`font-display text-xl font-bold ${colors[i]}`}>{b.name}</p>
                <p className="text-xs text-on-surface-variant">{b.owner}</p>
                <p className="font-label text-lg text-on-surface">{b.points} pts</p>
                <TeamPill name={b.champion_pick} seed={b.champion_seed} />
              </div>
            ))}
          </div>

          {/* Full standings table */}
          <div className="overflow-x-auto rounded-card bg-surface-container">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline">
                  <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Rank</th>
                  <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Bracket</th>
                  <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Points</th>
                  <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Champion</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((b, i) => (
                  <tr key={b.id} className="border-b border-outline hover:bg-surface-bright transition-colors">
                    <td className="px-3 py-2 font-label">{i + 1}</td>
                    <td className="px-3 py-2">
                      <div className="text-on-surface font-medium">{b.name}</div>
                      <div className="text-xs text-on-surface-variant">{b.owner}</div>
                    </td>
                    <td className="px-3 py-2 font-label">{b.points}</td>
                    <td className="px-3 py-2 text-on-surface-variant">{b.champion_pick}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Insight vs Fortune tab */}
      {tab === "insight" && (
        <div className="space-y-4">
          <div className="rounded-card bg-surface-container p-5">
            <h3 className="font-display text-lg font-semibold mb-2">Insight vs Fortune</h3>
            <p className="text-xs text-on-surface-variant mb-4">
              Insight = correct on contested games | Fortune = correct on against-consensus picks
            </p>
            <InsightFortuneScatter data={scatterData} />
          </div>
          {/* Quadrant legend */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-card bg-surface-container p-4 text-center">
              <p className="font-label text-xs text-on-surface-variant uppercase">High Insight + High Fortune</p>
              <p className="text-sm text-on-surface mt-1">Skilled & Lucky</p>
            </div>
            <div className="rounded-card bg-surface-container p-4 text-center">
              <p className="font-label text-xs text-on-surface-variant uppercase">High Insight + Low Fortune</p>
              <p className="text-sm text-on-surface mt-1">Smart but Unlucky</p>
            </div>
            <div className="rounded-card bg-surface-container p-4 text-center">
              <p className="font-label text-xs text-on-surface-variant uppercase">Low Insight + High Fortune</p>
              <p className="text-sm text-on-surface mt-1">Riding the Wave</p>
            </div>
            <div className="rounded-card bg-surface-container p-4 text-center">
              <p className="font-label text-xs text-on-surface-variant uppercase">Low Insight + Low Fortune</p>
              <p className="text-sm text-on-surface mt-1">Better Luck Next Year</p>
            </div>
          </div>
        </div>
      )}

      {/* Greatest Calls tab */}
      {tab === "calls" && (
        <div className="rounded-card bg-surface-container p-5">
          <h3 className="font-display text-lg font-semibold mb-4">Greatest Calls</h3>
          <p className="text-xs text-on-surface-variant mb-4">
            The most contrarian correct picks — the ones almost nobody else got right.
          </p>
          <div className="space-y-2">
            {greatestCalls.map((gc, i) => (
              <div key={i} className="flex items-center justify-between rounded-card bg-surface-bright px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-display text-lg font-bold text-on-surface-variant w-6 text-center">
                    {i + 1}
                  </span>
                  <div>
                    <span className="text-on-surface font-body font-medium">{gc.bracketName}</span>
                    <span className="text-xs text-on-surface-variant ml-2">{gc.bracketOwner}</span>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Picked {gc.teamPicked} (seed {gc.seedPicked})
                      {gc.round && ` — ${ROUND_LABELS[gc.round as Round] || gc.round}`}
                    </p>
                  </div>
                </div>
                <span className="font-label text-xs text-secondary whitespace-nowrap">
                  Only {Math.round(gc.rate * 100)}% picked this
                </span>
              </div>
            ))}
            {greatestCalls.length === 0 && (
              <p className="text-on-surface-variant text-sm text-center py-8">
                No completed games yet to evaluate.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Group Report Card tab */}
      {tab === "report" && (
        <div className="rounded-card bg-surface-container p-5">
          <h3 className="font-display text-lg font-semibold mb-2">Group Report Card</h3>
          <p className="text-xs text-on-surface-variant mb-6">
            How accurate was the group consensus pick in each round?
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {roundAccuracy.map((r) => {
              const pct = r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0;
              return (
                <div key={r.round} className="rounded-card bg-surface-bright p-4 text-center space-y-2">
                  <p className="font-label text-xs text-on-surface-variant uppercase">
                    {ROUND_LABELS[r.round as Round] || r.round}
                  </p>
                  <p className="font-display text-3xl font-bold text-on-surface">
                    {r.total > 0 ? `${r.correct}/${r.total}` : "\u2014"}
                  </p>
                  {r.total > 0 && (
                    <p className="text-xs text-on-surface-variant">{pct}%</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
