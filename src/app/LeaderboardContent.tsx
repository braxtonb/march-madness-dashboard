"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { StatCard } from "@/components/ui/StatCard";
import { LeaderboardTable } from "@/components/tables/LeaderboardTable";
import { MadnessGauge } from "@/components/charts/MadnessGauge";
import { InsightFortuneScatter } from "@/components/charts/InsightFortuneScatter";
import { ProbabilityJourneyChart } from "@/components/charts/ProbabilityJourneyChart";
import { ProbabilityClient } from "@/components/ProbabilityClient";
import { GamesToWatch } from "@/components/GamesToWatch";
import { TeamPill } from "@/components/ui/TeamPill";
import MultiSelectSearch from "@/components/ui/MultiSelectSearch";
import type { MultiSelectOption } from "@/components/ui/MultiSelectSearch";
import { ROUND_LABELS } from "@/lib/constants";
import type { Bracket, BracketAnalytics, Round } from "@/lib/types";

type LeaderboardTab = "standings" | "probability" | "insights" | "style";

function isValidTab(value: string | null): value is LeaderboardTab {
  return (
    value === "standings" ||
    value === "probability" ||
    value === "insights" ||
    value === "alive" || // legacy alias
    value === "calls" || // legacy alias
    value === "style" ||
    value === "journey" // legacy alias
  );
}

/** Map legacy tab values to current ones */
function normalizeTab(value: string | null): LeaderboardTab {
  if (value === "alive" || value === "calls") return "insights";
  if (value === "journey") return "probability"; // legacy alias
  if (value === "standings" || value === "probability" || value === "insights" || value === "style") return value;
  return "standings";
}

const TAB_OPTIONS: { label: string; value: LeaderboardTab }[] = [
  { label: "Standings", value: "standings" },
  { label: "Win Probability", value: "probability" },
  { label: "Insights", value: "insights" },
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

interface AffectedBracket {
  name: string;
  owner: string;
  full_name: string;
  champion: string;
  championSeed?: number;
  bracketId?: string;
}

interface GameToWatchData {
  gameId: string;
  seed1: number;
  team1: string;
  seed2: number;
  team2: string;
  round: string;
  affectedCount: number;
  affectedBrackets: AffectedBracket[];
}

interface AliveData {
  champAlive: number;
  ff3Plus: number;
  ff2Plus: number;
  gamesRemaining: number;
  gamesToWatch: GameToWatchData[];
  bracketFFTeamsMap: Record<string, string[]>;
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
  teamColors?: Record<string, string>;
  pathEntries?: { bracketId: string; remainingPicks: { round: string; team: string; seed: number; pts: number; logo: string }[]; eliminatedPickCount: number }[];
  aliveData?: AliveData;
  probabilityTimeline?: {
    checkpoints: { gameIndex: number; gameId: string; round: string; team1: string; seed1: number; team2: string; seed2: number; winner: string; completeDate: number }[];
    lines: { bracketId: string; name: string; champion: string; eliminatedAtGame: number; probabilities: number[] }[];
  };
  probData?: { id: string; name: string; owner: string; full_name: string; probability: number; champion: string; championSeed?: number; median_rank: number; best_rank: number; max_remaining: number; points: number; pct_first: number; pct_second: number; pct_third: number; pct_top10: number; pct_top25: number }[];
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
  teamColors = {},
  pathEntries = [],
  aliveData,
  probabilityTimeline,
  probData = [],
}: LeaderboardContentProps) {
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<LeaderboardTab>(
    normalizeTab(searchParams.get("tab")),
  );

  const [probView, setProbView] = useState<"journey" | "chances" | "finishes">(() => {
    const pv = searchParams.get("pview");
    if (pv === "journey" || pv === "chances" || pv === "finishes") return pv;
    return "journey";
  });

  // Sync pview to URL
  const setProbViewWithUrl = useCallback((view: "journey" | "chances" | "finishes") => {
    setProbView(view);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "probability");
    url.searchParams.set("pview", view);
    window.history.replaceState({}, "", url.toString());
  }, []);

  // Build team seeds map from bracket champion picks
  const teamSeeds = useMemo(() => {
    const seeds: Record<string, number> = {};
    for (const b of brackets) {
      if (b.champion_pick && b.champion_seed) seeds[b.champion_pick] = b.champion_seed;
    }
    return seeds;
  }, [brackets]);

  // Deep-link bracket search: initialize from searchParams (SSR-safe via Suspense)
  const [selectedSearchIds, setSelectedSearchIds] = useState<string[]>(() => {
    const bracketParam = searchParams.get("brackets");
    return bracketParam ? bracketParam.split(",").filter(Boolean) : [];
  });

  // Update URL when bracket selection changes
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedSearchIds.length > 0) {
      url.searchParams.set("brackets", selectedSearchIds.join(","));
    } else {
      url.searchParams.delete("brackets");
    }
    window.history.replaceState(null, "", url.toString());
  }, [selectedSearchIds]);

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

  // Alive filter state for standings tab (deep-linked via ?filter=)
  type AliveFilter = "all" | "champion" | "ff3" | "ff2";
  const VALID_ALIVE_FILTERS: AliveFilter[] = ["all", "champion", "ff3", "ff2"];
  const [aliveFilter, setAliveFilter] = useState<AliveFilter>(() => {
    const f = searchParams.get("filter") as AliveFilter | null;
    return f && VALID_ALIVE_FILTERS.includes(f) ? f : "all";
  });

  const changeAliveFilter = useCallback((f: AliveFilter) => {
    setAliveFilter(f);
    const url = new URL(window.location.href);
    if (f !== "all") {
      url.searchParams.set("filter", f);
    } else {
      url.searchParams.delete("filter");
    }
    window.history.replaceState(null, "", url.toString());
  }, []);

  // Champion filter (deep-linked via ?champion=)
  const [championFilter, setChampionFilter] = useState<string[]>(() => {
    const v = searchParams.get("champion");
    return v ? v.split(",").filter(Boolean) : [];
  });
  const championOptions: MultiSelectOption[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of brackets) if (b.champion_pick) map.set(b.champion_pick, (map.get(b.champion_pick) || 0) + 1);
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([c]) => ({ value: c, label: c }));
  }, [brackets]);
  const changeChampionFilter = useCallback((ids: string[]) => {
    setChampionFilter(ids);
    const url = new URL(window.location.href);
    if (ids.length > 0) url.searchParams.set("champion", ids.join(","));
    else url.searchParams.delete("champion");
    window.history.replaceState(null, "", url.toString());
  }, []);

  const aliveFilteredBrackets = useMemo(() => {
    let result = filteredBrackets;
    if (championFilter.length > 0) {
      const champSet = new Set(championFilter);
      result = result.filter((b) => champSet.has(b.champion_pick));
    }
    if (aliveFilter !== "all" && aliveData) {
      result = result.filter((b) => {
        if (aliveFilter === "champion") {
          return b.champion_pick && !eliminatedTeams.has(b.champion_pick);
        }
        const ffTeams = aliveData.bracketFFTeamsMap[b.id] ?? [b.ff1, b.ff2, b.ff3, b.ff4].filter(Boolean);
        const aliveCount = ffTeams.filter((t) => !eliminatedTeams.has(t)).length;
        if (aliveFilter === "ff3") return aliveCount >= 3;
        if (aliveFilter === "ff2") return aliveCount >= 2;
        return true;
      });
    }
    return result;
  }, [filteredBrackets, championFilter, aliveFilter, aliveData, eliminatedTeams]);

  const eliminatedTeamsSet = useMemo(() => eliminatedTeams, [eliminatedTeams]);

  const changeTab = useCallback(
    (newTab: LeaderboardTab) => {
      setTab(newTab);
      setSelectedSearchIds([]);
      setAliveFilter("all");
      setChampionFilter([]);
      const url = new URL(window.location.href);

      const allTabParams = ["sort", "dir", "brackets", "champion", "pts", "ptsOp", "filter"];
      for (const p of allTabParams) {
        url.searchParams.delete(p);
      }

      url.searchParams.set("tab", newTab);
      window.history.replaceState(null, "", url.toString());
    },
    []
  );

  // Keep tab in sync if user navigates back/forward
  useEffect(() => {
    const paramTab = searchParams.get("tab");
    if (isValidTab(paramTab)) {
      const normalized = normalizeTab(paramTab);
      if (normalized !== tab) setTab(normalized);
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
          {/* Top-3 Ribbon */}
          {(() => {
            const sorted = [...brackets].sort((a, b) => {
              const aA = analytics.get(a.id);
              const bA = analytics.get(b.id);
              if (!aA || !bA) return 0;
              return aA.rank - bA.rank;
            });
            const top3 = sorted.slice(0, 3);
            if (top3.length === 0) return null;

            const accents = ["text-yellow-400", "text-on-surface-variant", "text-orange-400"];
            const emojis = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];

            return (
              <div className="rounded-card overflow-hidden" style={{ background: "linear-gradient(90deg, rgba(250,204,21,0.12) 0%, rgba(156,163,175,0.08) 50%, rgba(251,146,60,0.08) 100%)" }}>
                {/* Desktop: horizontal */}
                <div className="hidden sm:flex items-center divide-x divide-outline-variant/20">
                  {top3.map((b, idx) => (
                    <div key={b.id} className="flex-1 px-4 py-3 flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">{emojis[idx]}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-display font-bold text-on-surface text-sm truncate">{b.name}</p>
                        {b.full_name && b.full_name !== b.name && (
                          <p className="text-[10px] text-on-surface-variant truncate">{b.full_name}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-display font-black text-lg leading-tight ${accents[idx]}`}>{b.points} <span className="text-[10px] font-normal text-on-surface-variant">/ {b.points + b.max_remaining} pts</span></p>
                      </div>
                      {b.champion_pick && (
                        <div className="shrink-0">
                          <TeamPill name={b.champion_pick} seed={b.champion_seed} logo={teamLogos[b.champion_pick]} eliminated={eliminatedTeams.has(b.champion_pick)} showStatus />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {/* Mobile: stacked */}
                <div className="sm:hidden divide-y divide-outline-variant/20">
                  {top3.map((b, idx) => (
                    <div key={b.id} className="px-3 py-2.5 flex items-center gap-2.5">
                      <span className="text-lg shrink-0">{emojis[idx]}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-display font-bold text-on-surface text-sm truncate">{b.name}</p>
                        {b.full_name && b.full_name !== b.name && (
                          <p className="text-[10px] text-on-surface-variant truncate">{b.full_name}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-display font-black text-base leading-tight ${accents[idx]}`}>{b.points} <span className="text-[10px] font-normal text-on-surface-variant">/ {b.points + b.max_remaining} pts</span></p>
                      </div>
                      {b.champion_pick && (
                        <div className="shrink-0">
                          <TeamPill name={b.champion_pick} seed={b.champion_seed} logo={teamLogos[b.champion_pick]} eliminated={eliminatedTeams.has(b.champion_pick)} showStatus />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Quick Link Hero Cards */}
          {(() => {
            const sorted = [...brackets].sort((a, b) => {
              const aA = analytics.get(a.id);
              const bA = analytics.get(b.id);
              if (!aA || !bA) return 0;
              return aA.rank - bA.rank;
            });
            const top1Id = sorted[0]?.id ?? "";
            const top2Id = sorted[1]?.id ?? "";

            const quickLinks = [
              {
                href: "/picks?rview=bracket",
                title: "Bracket View",
                description: "See every pick in bracket format",
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    {/* Left: 4 lines → 2 → 1 */}
                    <path d="M1 2h2v3h2" /><path d="M1 8h2v-3" /><path d="M1 16h2v3h2" /><path d="M1 22h2v-3" /><path d="M5 5h2v6" /><path d="M5 19h2v-6" /><path d="M7 11h5v1" />
                    {/* Right: 4 lines → 2 → 1 (mirror) */}
                    <path d="M23 2h-2v3h-2" /><path d="M23 8h-2v-3" /><path d="M23 16h-2v3h-2" /><path d="M23 22h-2v-3" /><path d="M19 5h-2v6" /><path d="M19 19h-2v-6" /><path d="M17 11h-5" />
                  </svg>
                ),
              },
              {
                href: "/simulator#scenario=favorites",
                title: "Simulate Favorites",
                description: "What if all favorites win?",
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                ),
              },
              {
                href: `/head-to-head?b1=${top1Id}&b2=${top2Id}`,
                title: "Compare Top 2",
                description: "Head-to-head comparison",
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
                  </svg>
                ),
              },
              {
                href: "/?tab=probability",
                title: "Win% Journey",
                description: "How odds shifted each game",
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                ),
              },
            ];

            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {quickLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group rounded-card bg-surface-container border border-outline-variant/30 p-3 hover:bg-surface-bright hover:border-outline-variant transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-primary shrink-0">{link.icon}</span>
                      <span className="font-display text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">{link.title}</span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant leading-relaxed">{link.description}</p>
                  </Link>
                ))}
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
          <div className="flex flex-wrap items-end gap-3 mb-3">
            <div className="w-full sm:w-72">
              <MultiSelectSearch
                mode="multi"
                label="Brackets"
                options={bracketOptions}
                selected={selectedSearchIds}
                onSelectedChange={setSelectedSearchIds}
                placeholder="Search brackets..."
              />
            </div>
            <div className="w-full sm:w-56">
              <MultiSelectSearch
                mode="multi"
                label="Champions"
                options={championOptions}
                selected={championFilter}
                onSelectedChange={changeChampionFilter}
                placeholder="Filter by champion..."
              />
            </div>
            {aliveData && (
              <div className="flex gap-1.5">
                {(
                  [
                    ["all", "All"],
                    ["champion", "Champion Alive"],
                    ["ff3", "3+ Final Four"],
                    ["ff2", "2+ Final Four"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => changeAliveFilter(key)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-label h-7 transition-colors ${
                      aliveFilter === key
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-on-surface-variant mb-2">
            Showing {aliveFilteredBrackets.length} of {brackets.length} brackets
          </p>
          <LeaderboardTable
            brackets={aliveFilteredBrackets}
            analytics={analytics}
            eliminatedTeams={eliminatedTeams}
            teamLogos={teamLogos}
            pathEntries={pathEntries}
            initialSort={searchParams.get("sort") || "rank"}
            initialDir={searchParams.get("dir") || "asc"}
          />

        </div>
      )}

      {/* ===== Tab 2: Insights (Alive + Best Calls) ===== */}
      {tab === "insights" && (
        <div className="space-y-section">
          {/* Alive stat cards */}
          {aliveData && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              <StatCard
                label="Champion Alive"
                value={aliveData.champAlive}
                subtitle="brackets still have their champion"
              />
              <StatCard
                label="3+ Final Four Teams"
                value={aliveData.ff3Plus}
                subtitle="brackets have 3+ Final Four teams left"
              />
              <StatCard
                label="2+ Final Four Teams"
                value={aliveData.ff2Plus}
                subtitle="brackets have 2+ Final Four teams left"
              />
              <StatCard
                label="Games Remaining"
                value={aliveData.gamesRemaining}
              />
            </div>
          )}

          {/* Games to Watch */}
          {aliveData && aliveData.gamesToWatch.length > 0 && (
            <GamesToWatch games={aliveData.gamesToWatch} teamLogos={teamLogos} eliminatedTeams={eliminatedTeamsSet} />
          )}

          {/* Best Calls */}
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
                  className="flex items-center justify-between gap-2 rounded-card bg-surface-bright px-3 py-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-display text-lg font-bold text-on-surface-variant w-6 text-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-on-surface font-medium truncate">{gc.bracketName}</div>
                      {gc.bracketFullName && gc.bracketFullName !== gc.bracketName && (
                        <div className="text-xs text-on-surface-variant truncate">{gc.bracketFullName}</div>
                      )}
                      <p className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1 flex-wrap">
                        Picked <TeamPill name={gc.teamPicked} seed={gc.seedPicked} logo={teamLogos[gc.teamPicked]} eliminated={eliminatedTeams.has(gc.teamPicked)} showStatus />
                        {gc.round &&
                          <span>{"\u2014"} {ROUND_LABELS[gc.round as Round] || gc.round}</span>}
                      </p>
                    </div>
                  </div>
                  <span className="font-label text-xs text-secondary whitespace-nowrap shrink-0">
                    Only {Math.round(gc.rate * 100)}%
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

      {tab === "probability" && (
        <div className="space-y-4">
          {/* Sub-view toggle */}
          <div className="overflow-x-auto no-scrollbar">
            <div className="flex gap-1.5 min-w-max">
              {([
                { label: "Win% Journey", value: "journey" as const },
                { label: "Championship Chances", value: "chances" as const },
                { label: "Simulated Finishes", value: "finishes" as const },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setProbViewWithUrl(opt.value)}
                  className={`rounded-card px-2.5 py-1 text-xs font-label h-7 transition-colors ${
                    probView === opt.value
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Win% Journey view */}
          {probView === "journey" && probabilityTimeline && (
            <div className="space-y-3">
              <p className="text-xs text-on-surface-variant">
                Championship win probability recalculated after each completed game.
                See how every result shifted the odds across all {submittedCount} submitted brackets.
                {brackets.length > submittedCount && ` (${brackets.length - submittedCount} did not submit)`}
              </p>
              <div className="rounded-card bg-surface-container p-4 sm:p-5">
                <ProbabilityJourneyChart
                  checkpoints={probabilityTimeline.checkpoints}
                  lines={probabilityTimeline.lines}
                  teamColors={teamColors}
                  teamLogos={teamLogos}
                  teamSeeds={teamSeeds}
                  eliminatedTeams={eliminatedTeams}
                  totalBrackets={brackets.length}
                  submittedCount={submittedCount}
                />
              </div>
            </div>
          )}

          {/* Championship Chances + Simulated Finishes views */}
          {(probView === "chances" || probView === "finishes") && (
            <ProbabilityClient
              probData={probData}
              journeyData={[]}
              journeyBracketNames={[]}
              allSnapshotProbsZero={true}
              teamLogos={teamLogos}
              eliminatedTeams={Array.from(eliminatedTeams)}
              timelineCheckpoints={probabilityTimeline?.checkpoints}
              timelineLines={probabilityTimeline?.lines}
              embedded
              initialTab={probView}
            />
          )}
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
