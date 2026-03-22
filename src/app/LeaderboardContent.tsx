"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StatCard } from "@/components/ui/StatCard";
import { LeaderboardTable } from "@/components/tables/LeaderboardTable";
import { MadnessGauge } from "@/components/charts/MadnessGauge";
import { InsightFortuneScatter } from "@/components/charts/InsightFortuneScatter";
import { TeamPill } from "@/components/ui/TeamPill";
import MultiSelectSearch from "@/components/ui/MultiSelectSearch";
import type { MultiSelectOption } from "@/components/ui/MultiSelectSearch";
import { ROUND_LABELS } from "@/lib/constants";
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

  const initialTab = isValidTab(searchParams.get("tab"))
    ? (searchParams.get("tab") as LeaderboardTab)
    : "standings";

  const [tab, setTab] = useState<LeaderboardTab>(initialTab);
  const [selectedSearchIds, setSelectedSearchIds] = useState<string[]>([]);

  // Build options for MultiSelectSearch
  const bracketOptions: MultiSelectOption[] = useMemo(
    () => brackets.map((b) => ({
      value: b.id,
      label: b.name,
      sublabel: b.full_name && b.full_name !== b.name ? b.full_name : undefined,
    })),
    [brackets]
  );

  const filteredBrackets = useMemo(() => {
    if (selectedSearchIds.length === 0) return brackets;
    const idSet = new Set(selectedSearchIds);
    return brackets.filter((b) => idSet.has(b.id));
  }, [brackets, selectedSearchIds]);

  const changeTab = useCallback(
    (newTab: LeaderboardTab) => {
      setTab(newTab);
      const params = new URLSearchParams(window.location.search);
      params.set("tab", newTab);
      window.history.replaceState(null, "", `?${params.toString()}`);
    },
    []
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
              className={`px-3 py-1.5 text-sm font-semibold font-label transition-colors ${
                tab === opt.value
                  ? "text-primary border-b-2 border-primary"
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
          {/* Top-3 Stepped Podium */}
          {(() => {
            const sorted = [...brackets].sort((a, b) => {
              const aA = analytics.get(a.id);
              const bA = analytics.get(b.id);
              if (!aA || !bA) return 0;
              return aA.rank - bA.rank;
            });
            const top3 = sorted.slice(0, 3);
            if (top3.length === 0) return null;

            const podium = [
              { idx: 1, height: "h-32 sm:h-36", color: "bg-on-surface-variant/8", border: "border-on-surface-variant/20", accent: "text-on-surface-variant", label: "2nd", emoji: "🥈" },
              { idx: 0, height: "h-40 sm:h-48", color: "bg-yellow-400/10", border: "border-yellow-400/40", accent: "text-yellow-400", label: "1st", emoji: "🥇" },
              { idx: 2, height: "h-28 sm:h-32", color: "bg-orange-400/8", border: "border-orange-400/30", accent: "text-orange-400", label: "3rd", emoji: "🥉" },
            ];

            return (
              <div className="flex items-end justify-center gap-2 sm:gap-3 max-w-2xl mx-auto">
                {podium.map((p) => {
                  const b = top3[p.idx];
                  if (!b) return <div key={p.idx} className="flex-1" />;
                  return (
                    <div key={b.id} className="flex-1 flex flex-col items-center">
                      {/* Bracket info above the podium block */}
                      <div className="text-center mb-2 space-y-1 min-w-0 w-full px-1">
                        <div className="text-2xl">{p.emoji}</div>
                        <p className="font-display text-sm sm:text-base font-bold text-on-surface leading-tight truncate">{b.name}</p>
                        {b.full_name && b.full_name !== b.name && (
                          <p className="text-[10px] text-on-surface-variant truncate">{b.full_name}</p>
                        )}
                        <p className={`font-display text-lg sm:text-2xl font-black ${p.accent}`}>
                          {b.points}<span className="text-[10px] font-label ml-0.5">pts</span>
                        </p>
                        {b.champion_pick && (
                          <div className="flex items-center justify-center">
                            <TeamPill name={b.champion_pick} seed={b.champion_seed} logo={teamLogos[b.champion_pick]} eliminated={eliminatedTeams.has(b.champion_pick)} showStatus />
                          </div>
                        )}
                      </div>
                      {/* Podium block */}
                      <div className={`w-full ${p.height} rounded-t-xl border-t-2 border-x ${p.color} ${p.border} flex items-start justify-center pt-3`}>
                        <span className={`font-display text-xl sm:text-2xl font-black ${p.accent} opacity-30`}>{p.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Leaderboard table */}
          <div>
            <p className="hidden sm:block text-xs text-on-surface-variant mb-2">
              Click any row to see details &middot; Hover any row to compare brackets
            </p>
            <p className="sm:hidden text-xs text-on-surface-variant mb-2">
              Tap any row for details &middot; Tap &#9675; to compare brackets
            </p>
          </div>
          <div className="w-full sm:w-72 mb-3">
            <MultiSelectSearch
              mode="multi"
              label="Brackets"
              options={bracketOptions}
              selected={selectedSearchIds}
              onSelectedChange={setSelectedSearchIds}
              placeholder="Search brackets..."
            />
          </div>
          {selectedSearchIds.length > 0 && (
            <p className="text-xs text-on-surface-variant mb-2">
              Showing {filteredBrackets.length} of {brackets.length} brackets
            </p>
          )}
          <LeaderboardTable
            brackets={filteredBrackets}
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
                className="flex items-center justify-between rounded-card bg-surface-bright px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <span className="font-display text-lg font-bold text-on-surface-variant w-6 text-center">
                    {i + 1}
                  </span>
                  <div>
                    <div className="text-on-surface font-medium">{gc.bracketName}</div>
                    {gc.bracketFullName && gc.bracketFullName !== gc.bracketName && (
                      <div className="text-xs text-on-surface-variant">{gc.bracketFullName}</div>
                    )}
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
