"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { StatCard } from "@/components/ui/StatCard";
import { LeaderboardTable } from "@/components/tables/LeaderboardTable";
import { MadnessGauge } from "@/components/charts/MadnessGauge";
import { InsightFortuneScatter } from "@/components/charts/InsightFortuneScatter";
import { TeamPill } from "@/components/ui/TeamPill";
import { ROUND_LABELS } from "@/lib/constants";
import type { Bracket, BracketAnalytics, Round } from "@/lib/types";

type LeaderboardTab = "standings" | "calls" | "skill" | "report";

function isValidTab(value: string | null): value is LeaderboardTab {
  return (
    value === "standings" ||
    value === "calls" ||
    value === "skill" ||
    value === "report"
  );
}

const TAB_OPTIONS: { label: string; value: LeaderboardTab }[] = [
  { label: "Standings", value: "standings" },
  { label: "Best Calls", value: "calls" },
  { label: "Skill vs Luck", value: "skill" },
  { label: "Group Report Card", value: "report" },
];

interface ScatterPoint {
  name: string;
  skill: number;
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

      {/* ===== Tab 1: Standings ===== */}
      {tab === "standings" && (
        <div className="space-y-section">
          {/* Hero stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Brackets" value={brackets.length} />
            <StatCard
              label="Games Completed"
              value={`${gamesCompleted}/63`}
            />
            <StatCard label="Current Round" value={currentRound} />
            <StatCard
              label="Top Champion Pick"
              value={topChamp ? topChamp[0] : "\u2014"}
              subtitle={topChamp ? `${topChamp[1]} brackets` : undefined}
            />
          </div>

          {/* Leaderboard table */}
          <LeaderboardTable
            brackets={brackets}
            analytics={analytics}
            eliminatedTeams={eliminatedTeams}
          />

          {/* Rising Stars + Contention */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-card bg-surface-container p-5 space-y-3">
              <h3 className="font-display text-lg font-semibold">
                Rising Stars
              </h3>
              {risingStars.length === 0 && (
                <p className="text-on-surface-variant text-sm">
                  No rank changes yet this round.
                </p>
              )}
              {risingStars.map(({ bracket, analytics: a }) => (
                <div
                  key={bracket.id}
                  className="flex items-center justify-between rounded-card bg-surface-bright px-4 py-3"
                >
                  <div>
                    <span className="font-body text-on-surface">
                      {bracket.name}
                    </span>
                    <span className="text-xs text-on-surface-variant ml-2">
                      {bracket.owner}
                    </span>
                  </div>
                  <span className="font-label text-secondary font-semibold">
                    +{a.rank_delta} ranks
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-card bg-surface-container p-5 flex flex-col items-center justify-center">
              <span className="font-display text-4xl font-bold text-secondary">
                {inContention}
              </span>
              <span className="text-on-surface-variant text-sm mt-1">
                brackets can still mathematically win
              </span>
            </div>
          </div>

          {/* Tournament Pulse */}
          <div className="rounded-card bg-surface-container p-5 space-y-4">
            <h3 className="font-display text-lg font-semibold">
              Tournament Pulse
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <MadnessGauge value={madnessIndex} />
              <div className="space-y-2">
                <p className="font-label text-xs text-on-surface-variant uppercase tracking-wider">
                  What the number means
                </p>
                <p className="text-sm text-on-surface-variant">
                  {madnessIndex < 30
                    ? "A calm tournament so far \u2014 chalk is holding."
                    : madnessIndex < 60
                      ? "Typical March Madness \u2014 some surprises keeping it exciting."
                      : "Wild tournament \u2014 bold bracket pickers are being rewarded."}
                </p>
              </div>
            </div>
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
          <div className="space-y-2">
            {greatestCalls.map((gc, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-card bg-surface-bright px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-display text-lg font-bold text-on-surface-variant w-6 text-center">
                    {i + 1}
                  </span>
                  <div>
                    <span className="text-on-surface font-body font-medium">
                      {gc.bracketName}
                    </span>
                    <span className="text-xs text-on-surface-variant ml-2">
                      {gc.bracketOwner}
                    </span>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Picked {gc.teamPicked} (seed {gc.seedPicked})
                      {gc.round &&
                        ` \u2014 ${ROUND_LABELS[gc.round as Round] || gc.round}`}
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

      {/* ===== Tab 3: Skill vs Luck ===== */}
      {tab === "skill" && (
        <div className="space-y-4">
          <div className="rounded-card bg-surface-container p-5">
            <h3 className="font-display text-lg font-semibold mb-2">
              Skill vs Luck
            </h3>
            <p className="text-xs text-on-surface-variant mb-4">
              Skill = correct on contested games | Luck = correct on
              against-consensus picks. Based on {submittedCount} submitted
              brackets.
            </p>
            <InsightFortuneScatter data={scatterData} />
          </div>
          {/* Quadrant legend */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-card bg-surface-container p-4 text-center">
              <p className="font-label text-xs text-on-surface-variant uppercase">
                High Skill + High Luck
              </p>
              <p className="text-sm text-on-surface mt-1">Skilled &amp; Lucky</p>
            </div>
            <div className="rounded-card bg-surface-container p-4 text-center">
              <p className="font-label text-xs text-on-surface-variant uppercase">
                High Skill + Low Luck
              </p>
              <p className="text-sm text-on-surface mt-1">
                Skilled &amp; Steady
              </p>
            </div>
            <div className="rounded-card bg-surface-container p-4 text-center">
              <p className="font-label text-xs text-on-surface-variant uppercase">
                Low Skill + High Luck
              </p>
              <p className="text-sm text-on-surface mt-1">Bold &amp; Lucky</p>
            </div>
            <div className="rounded-card bg-surface-container p-4 text-center">
              <p className="font-label text-xs text-on-surface-variant uppercase">
                Low Skill + Low Luck
              </p>
              <p className="text-sm text-on-surface mt-1">
                Going with the Flow
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===== Tab 4: Group Report Card ===== */}
      {tab === "report" && (
        <div className="rounded-card bg-surface-container p-5">
          <h3 className="font-display text-lg font-semibold mb-2">
            Group Report Card
          </h3>
          <p className="text-xs text-on-surface-variant mb-6">
            How accurate was the group consensus pick in each round? Based on{" "}
            {submittedCount} submitted brackets.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {roundAccuracy.map((r) => {
              const pct =
                r.total > 0
                  ? Math.round((r.correct / r.total) * 100)
                  : 0;
              return (
                <div
                  key={r.round}
                  className="rounded-card bg-surface-bright p-4 text-center space-y-2"
                >
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

export function LeaderboardContent(props: LeaderboardContentProps) {
  return (
    <Suspense fallback={null}>
      <LeaderboardContentInner {...props} />
    </Suspense>
  );
}
