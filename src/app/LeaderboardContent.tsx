"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { StatCard } from "@/components/ui/StatCard";
import { LeaderboardTable } from "@/components/tables/LeaderboardTable";
import { MadnessGauge } from "@/components/charts/MadnessGauge";
import { InsightFortuneScatter } from "@/components/charts/InsightFortuneScatter";
import { TeamPill } from "@/components/ui/TeamPill";
import CompareCheckbox from "@/components/ui/CompareCheckbox";
import { ROUND_LABELS, displayName } from "@/lib/constants";
import type { Bracket, BracketAnalytics, Round } from "@/lib/types";

type LeaderboardTab = "standings" | "calls" | "style";

function isValidTab(value: string | null): value is LeaderboardTab {
  return (
    value === "standings" ||
    value === "calls" ||
    value === "style"
  );
}

const TAB_OPTIONS: { label: string; value: LeaderboardTab }[] = [
  { label: "Standings", value: "standings" },
  { label: "Best Calls", value: "calls" },
  { label: "Picking Style", value: "style" },
];

interface ScatterPoint {
  name: string;
  skill: number;
  fortune: number;
}

interface GreatestCall {
  bracketId: string;
  bracketName: string;
  bracketOwner: string;
  bracketFullName: string;
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

interface RisingStar {
  bracket: Bracket;
  analytics: BracketAnalytics;
}

interface LeaderboardContentProps {
  brackets: Bracket[];
  analytics: Map<string, BracketAnalytics>;
  eliminatedTeams: Set<string>;
  gamesCompleted: number;
  currentRound: string;
  topChamp: [string, number] | null;
  risingStars: RisingStar[];
  inContention: number;
  madnessIndex: number;
  scatterData: ScatterPoint[];
  greatestCalls: GreatestCall[];
  roundAccuracy: RoundAccuracy[];
  submittedCount: number;
  teamLogos?: Record<string, string>;
  pathEntries?: { bracketId: string; remainingPicks: { round: string; team: string; seed: number; pts: number; logo: string }[]; eliminatedPickCount: number }[];
}

function LeaderboardContentInner({
  brackets,
  analytics,
  eliminatedTeams,
  gamesCompleted,
  currentRound,
  topChamp,
  risingStars,
  inContention,
  madnessIndex,
  scatterData,
  greatestCalls,
  roundAccuracy,
  submittedCount,
  teamLogos = {},
  pathEntries = [],
}: LeaderboardContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialTab = isValidTab(searchParams.get("tab"))
    ? (searchParams.get("tab") as LeaderboardTab)
    : "standings";

  const [tab, setTab] = useState<LeaderboardTab>(initialTab);

  const updateUrl = useCallback(
    (params: URLSearchParams) => {
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router]
  );

  const changeTab = useCallback(
    (newTab: LeaderboardTab) => {
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

  return (
    <div className="space-y-section">
      <div>
        <h2 className="font-display text-2xl font-bold">Leaderboard</h2>
        <p className="text-on-surface-variant text-sm mt-1">
          Championship standings and tournament pulse
        </p>
      </div>

      {/* Tab pills */}
      <div className="overflow-x-auto no-scrollbar">
        <div className="flex gap-2 min-w-max">
          {TAB_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => changeTab(opt.value)}
              className={`rounded-card px-3 py-1.5 text-sm font-label transition-colors ${
                tab === opt.value
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== Tab 1: Standings ===== */}
      {tab === "standings" && (
        <div className="space-y-section">
          {/* Top-3 Podium */}
          {(() => {
            const sorted = [...brackets].sort((a, b) => {
              const aA = analytics.get(a.id);
              const bA = analytics.get(b.id);
              if (!aA || !bA) return 0;
              return aA.rank - bA.rank;
            });
            const top3 = sorted.slice(0, 3);
            const medals = [
              { emoji: "🥇", label: "1st Place", borderClass: "border-yellow-400/50", bgClass: "bg-yellow-400/10", textClass: "text-yellow-400" },
              { emoji: "🥈", label: "2nd Place", borderClass: "border-on-surface-variant/30", bgClass: "bg-surface-container", textClass: "text-on-surface-variant" },
              { emoji: "🥉", label: "3rd Place", borderClass: "border-orange-400/50", bgClass: "bg-orange-400/10", textClass: "text-orange-400" },
            ];
            if (top3.length === 0) return null;
            // Reorder for podium display: 2nd, 1st, 3rd
            const podiumOrder = [1, 0, 2];
            return (
              <div className="grid grid-cols-3 gap-3 items-end">
                {podiumOrder.map((idx) => {
                  const b = top3[idx];
                  if (!b) return <div key={idx} />;
                  const m = medals[idx];
                  const a = analytics.get(b.id);
                  return (
                    <div
                      key={b.id}
                      className={`group rounded-card border p-4 text-center space-y-2 ${m.bgClass} ${m.borderClass} ${idx === 0 ? "pb-6 pt-6" : ""}`}
                    >
                      <div className="flex justify-end"><CompareCheckbox bracketId={b.id} /></div>
                      <div className="text-3xl">{m.emoji}</div>
                      <p className={`font-label text-xs uppercase tracking-wider ${m.textClass}`}>
                        {m.label}
                      </p>
                      <p className="font-display text-base font-bold text-on-surface leading-tight">
                        {displayName(b)}
                      </p>
                      <p className="text-xs text-on-surface-variant">{b.name}</p>
                      <p className={`font-display text-2xl font-black ${m.textClass}`}>
                        {b.points}
                        <span className="text-xs font-label ml-1">pts</span>
                      </p>
                      {b.champion_pick && (
                        <div className="text-xs text-on-surface-variant flex items-center justify-center gap-1">
                          Champ: <TeamPill name={b.champion_pick} seed={b.champion_seed} logo={teamLogos[b.champion_pick]} eliminated={eliminatedTeams.has(b.champion_pick)} showStatus />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Leaderboard table */}
          <div>
            <p className="text-xs text-on-surface-variant">Click any row to see their path to victory</p>
            <p className="hidden sm:block text-xs text-on-surface-variant/60 mb-2">
              Hover any row to compare brackets
            </p>
            <p className="sm:hidden text-xs text-on-surface-variant/60 mb-2">
              Tap &#9675; to compare brackets
            </p>
          </div>
          <LeaderboardTable
            brackets={brackets}
            analytics={analytics}
            eliminatedTeams={eliminatedTeams}
            teamLogos={teamLogos}
            pathEntries={pathEntries}
          />

          {/* Contention counter */}
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span className="font-display text-lg font-bold text-secondary">{inContention}</span>
            <span>brackets can still mathematically win</span>
          </div>
        </div>
      )}

      {/* ===== Tab 2: Best Calls ===== */}
      {tab === "calls" && (
        <div className="rounded-card bg-surface-container p-5">
          <h3 className="font-display text-lg font-semibold mb-4">
            Best Calls
          </h3>
          <p className="text-xs text-on-surface-variant mb-4">
            The most contrarian correct picks &mdash; the ones almost nobody
            else got right. Based on {submittedCount} submitted brackets.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {greatestCalls.slice(0, 15).map((gc, i) => (
              <div
                key={i}
                className="group flex items-center justify-between rounded-card bg-surface-bright px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <CompareCheckbox bracketId={gc.bracketId} />
                  <span className="font-display text-lg font-bold text-on-surface-variant w-6 text-center">
                    {i + 1}
                  </span>
                  <div>
                    <span className="text-on-surface font-body font-medium">
                      {displayName({ full_name: gc.bracketFullName, name: gc.bracketName, owner: gc.bracketOwner })}
                    </span>
                    <span className="text-xs text-on-surface-variant ml-2">
                      {gc.bracketName}
                    </span>
                    <p className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1 flex-wrap">
                      Picked <TeamPill name={gc.teamPicked} seed={gc.seedPicked} logo={teamLogos[gc.teamPicked]} eliminated={eliminatedTeams.has(gc.teamPicked)} showStatus />
                      {gc.round &&
                        <span>{"\u2014"} {ROUND_LABELS[gc.round as Round] || gc.round}</span>}
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

      {/* ===== Tab 3: Picking Style ===== */}
      {tab === "style" && (
        <div className="space-y-4">
          <h3 className="font-display text-lg font-semibold">Picking Style</h3>
          <p className="text-xs text-on-surface-variant">
            Chalk Score = how often they picked favorites (higher = more chalk).
            Upset Score = how often their non-consensus picks were correct (higher = better at calling upsets).
            Based on {submittedCount} submitted brackets.
          </p>
          {/* Chart + legend side by side on large screens */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="rounded-card bg-surface-container p-5 flex-1 min-w-0">
              <InsightFortuneScatter data={scatterData} />
            </div>
            <div className="lg:w-64 shrink-0 space-y-2">
              <div className="rounded-card bg-surface-container p-3">
                <p className="font-label text-[10px] text-on-surface-variant uppercase">↖ Top Left</p>
                <p className="text-sm text-on-surface font-semibold">Upset Artists</p>
                <p className="text-[10px] text-on-surface-variant">Go against the grain and nail it</p>
              </div>
              <div className="rounded-card bg-surface-container p-3">
                <p className="font-label text-[10px] text-on-surface-variant uppercase">↗ Top Right</p>
                <p className="text-sm text-on-surface font-semibold">Sharp Chalk Pickers</p>
                <p className="text-[10px] text-on-surface-variant">Play it smart and still find edges</p>
              </div>
              <div className="rounded-card bg-surface-container p-3">
                <p className="font-label text-[10px] text-on-surface-variant uppercase">↙ Bottom Left</p>
                <p className="text-sm text-on-surface font-semibold">Bold Believers</p>
                <p className="text-[10px] text-on-surface-variant">Swinging for the fences — upside ahead</p>
              </div>
              <div className="rounded-card bg-surface-container p-3">
                <p className="font-label text-[10px] text-on-surface-variant uppercase">↘ Bottom Right</p>
                <p className="text-sm text-on-surface font-semibold">Playing It Safe</p>
                <p className="text-[10px] text-on-surface-variant">Steady and reliable — few surprises</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Report Card moved to /picks page */}
    </div>
  );
}

export function LeaderboardContent(props: LeaderboardContentProps) {
  return (
    <Suspense fallback={null}>
      <LeaderboardContentInner {...props} />
    </Suspense>
  );
}
