/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ProbabilityJourney } from "@/components/charts/ProbabilityJourney";
import { DrilldownTable } from "@/components/tables/DrilldownTable";
import { GamesToWatch } from "@/components/GamesToWatch";
import { StatCard } from "@/components/ui/StatCard";
import { TeamPill } from "@/components/ui/TeamPill";
import CompareCheckbox from "@/components/ui/CompareCheckbox";
import MultiSelectSearch from "@/components/ui/MultiSelectSearch";
import type { MultiSelectOption } from "@/components/ui/MultiSelectSearch";
import { useMyBracket } from "@/components/ui/MyBracketProvider";
import { ROUND_LABELS } from "@/lib/constants";
import type { Bracket, BracketAnalytics, Round } from "@/lib/types";

function SortIcon({ direction, active }: { direction: "asc" | "desc" | "neutral"; active?: boolean }) {
  if (direction === "asc") return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ml-0.5 ${active ? "text-on-surface-variant" : "text-on-surface-variant/40"}`}>
      <path d="M12 5v14" /><path d="m12 5-4 4" /><path d="m12 5 4 4" />
    </svg>
  );
  if (direction === "desc") return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ml-0.5 ${active ? "text-on-surface-variant" : "text-on-surface-variant/40"}`}>
      <path d="M12 19V5" /><path d="m12 19-4-4" /><path d="m12 19 4-4" />
    </svg>
  );
  return (
    <svg width="10" height="14" viewBox="0 0 24 28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline-block ml-0.5 opacity-30">
      <path d="M12 3v8" /><path d="m12 3-3 3" /><path d="m12 3 3 3" />
      <path d="M12 25v-8" /><path d="m12 25-3-3" /><path d="m12 25 3-3" />
    </svg>
  );
}

interface ProbEntry {
  id: string;
  name: string;
  owner: string;
  full_name: string;
  probability: number;
  champion: string;
  championSeed?: number;
  median_rank: number;
  best_rank: number;
  max_remaining: number;
  points: number;
  pct_first: number;
  pct_second: number;
  pct_third: number;
  pct_top10: number;
  pct_top25: number;
}

interface JourneyPoint {
  round: string;
  [bracketName: string]: string | number;
}

interface PathPick {
  round: string;
  team: string;
  seed: number;
  pts: number;
  logo: string;
}

interface PathEntry {
  name: string;
  owner: string;
  full_name: string;
  points: number;
  maxRemaining: number;
  champion: string;
  championLogo: string;
  championAlive: boolean;
  remainingPicks: PathPick[];
  eliminatedPickCount: number;
}

interface AffectedBracket {
  name: string;
  owner: string;
  full_name: string;
  champion: string;
  championSeed?: number;
  bracketId?: string;
}

interface GameToWatch {
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
  gamesToWatch: GameToWatch[];
  brackets: Bracket[];
  analyticsObj: Record<string, BracketAnalytics>;
  eliminatedArr: string[];
  bracketFFTeamsMap: Record<string, string[]>;
}

interface ProbabilityClientProps {
  probData: ProbEntry[];
  journeyData: JourneyPoint[];
  journeyBracketNames: string[];
  allSnapshotProbsZero: boolean;
  teamLogos?: Record<string, string>;
  eliminatedTeams?: string[];
  pathData?: PathEntry[];
  aliveData?: AliveData;
}

type ProbTab = "chances" | "finishes" | "path" | "alive";

type TierKey = "strong" | "hunt" | "fighting" | "longshot" | "miracle";

interface Tier {
  key: TierKey;
  label: string;
  colorClass: string;
  badgeClass: string;
}

const TIERS: Tier[] = [
  { key: "strong", label: "Strong Contender", colorClass: "text-secondary", badgeClass: "bg-secondary/15 text-secondary" },
  { key: "hunt", label: "In the Hunt", colorClass: "text-tertiary", badgeClass: "bg-tertiary/15 text-tertiary" },
  { key: "fighting", label: "Still Fighting", colorClass: "text-achievement", badgeClass: "bg-achievement/15 text-achievement" },
  { key: "longshot", label: "Long Shot Hero", colorClass: "text-on-surface-variant", badgeClass: "bg-on-surface-variant/10 text-on-surface-variant" },
  { key: "miracle", label: "Need a Miracle", colorClass: "text-on-surface-variant/60", badgeClass: "bg-on-surface-variant/5 text-on-surface-variant/60" },
];

function getTierKey(probability: number): TierKey {
  if (probability > 10) return "strong";
  if (probability >= 5) return "hunt";
  if (probability >= 1) return "fighting";
  if (probability >= 0.1) return "longshot";
  return "miracle";
}

const TAB_ACTIVE = "text-primary border-b-2 border-primary px-3 py-1.5 text-sm font-semibold font-label";
const TAB_INACTIVE = "text-on-surface-variant hover:text-on-surface px-3 py-1.5 text-sm font-semibold font-label";

type AliveFilter = "champion" | "ff3" | "ff2" | "all";
const VALID_ALIVE_FILTERS: AliveFilter[] = ["champion", "ff3", "ff2", "all"];

export function ProbabilityClient({
  probData,
  journeyData,
  journeyBracketNames,
  allSnapshotProbsZero,
  teamLogos = {},
  eliminatedTeams: eliminatedTeamsArr = [],
  pathData = [],
  aliveData,
}: ProbabilityClientProps) {
  const { isMyBracket } = useMyBracket();
  const searchParams = useSearchParams();

  const eliminatedTeamsSet = useMemo(() => new Set(eliminatedTeamsArr), [eliminatedTeamsArr]);

  const VALID_TABS: ProbTab[] = ["chances", "finishes", "path", "alive"];
  const initialTab = (() => {
    const param = searchParams.get("tab") as ProbTab;
    if (param && VALID_TABS.includes(param)) return param;
    return "chances" as ProbTab;
  })();

  const [tab, setTab] = useState<ProbTab>(initialTab);
  const [showExact, setShowExact] = useState(false);

  // Sort state for simulated finishes table
  type FinishSort = "probability" | "pct_second" | "pct_third" | "pct_top10" | "pct_top25" | "median_rank";
  const VALID_FINISH_SORTS: FinishSort[] = ["probability", "pct_second", "pct_third", "pct_top10", "pct_top25", "median_rank"];
  const [finishSortKey, setFinishSortKey] = useState<FinishSort>(() => {
    if (typeof window === "undefined") return "probability";
    const params = new URLSearchParams(window.location.search);
    const s = params.get("fsort") as FinishSort | null;
    return s && VALID_FINISH_SORTS.includes(s) ? s : "probability";
  });
  const [finishSortAsc, setFinishSortAsc] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    const d = params.get("fdir");
    if (d === "asc") return true;
    if (d === "desc") return false;
    return false;
  });
  const [expandedFinishIds, setExpandedFinishIds] = useState<Set<string>>(new Set());
  const [finishSearch, setFinishSearch] = useState<string[]>([]);

  // Build bracket options for MultiSelectSearch
  const finishBracketOptions: MultiSelectOption[] = useMemo(() => {
    return probData.map((d) => ({
      value: d.id,
      label: d.name,
      sublabel: d.full_name && d.full_name !== d.name ? d.full_name : undefined,
    }));
  }, [probData]);

  const sortedProbData = useMemo(() => {
    let data = [...probData];
    if (finishSearch.length > 0) {
      const idSet = new Set(finishSearch);
      data = data.filter((d) => idSet.has(d.id));
    }
    return data.sort((a, b) => {
      const aVal = a[finishSortKey] ?? 0;
      const bVal = b[finishSortKey] ?? 0;
      return finishSortAsc ? aVal - bVal : bVal - aVal;
    });
  }, [probData, finishSortKey, finishSortAsc, finishSearch]);

  function toggleFinishSort(key: FinishSort) {
    const newAsc = finishSortKey === key ? !finishSortAsc : false;
    setFinishSortKey(key);
    setFinishSortAsc(newAsc);
    const url = new URL(window.location.href);
    url.searchParams.set("fsort", key);
    url.searchParams.set("fdir", newAsc ? "asc" : "desc");
    window.history.replaceState(null, "", url.toString());
  }
  const fSortIcon = (key: FinishSort) => {
    const active = finishSortKey === key;
    const direction = active ? (finishSortAsc ? "asc" : "desc") : "neutral";
    return <SortIcon direction={direction} active={active} />;
  };

  // Alive filter state
  const initialAliveFilter = (() => {
    const param = searchParams.get("filter") as AliveFilter | null;
    if (param && VALID_ALIVE_FILTERS.includes(param)) return param;
    return "champion" as AliveFilter;
  })();
  const [aliveFilter, setAliveFilter] = useState<AliveFilter>(initialAliveFilter);

  function changeTab(t: ProbTab) {
    setTab(t);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", t);
    window.history.replaceState(null, "", `/probability?${params.toString()}`);
  }

  const changeAliveFilter = useCallback(
    (v: AliveFilter) => {
      setAliveFilter(v);
      const params = new URLSearchParams(window.location.search);
      params.set("filter", v);
      window.history.replaceState(null, "", `/probability?${params.toString()}`);
    },
    []
  );

  // Build path lookup by bracket name for expanded rows
  const pathByName = useMemo(() => {
    const map = new Map<string, PathEntry>();
    for (const p of pathData) {
      map.set(p.name, p);
    }
    return map;
  }, [pathData]);

  // Group brackets by tier (memoized to avoid recalc on every render)
  const tierGroups = useMemo(() => {
    const groups = new Map<TierKey, ProbEntry[]>();
    for (const tier of TIERS) {
      groups.set(tier.key, []);
    }
    for (const entry of probData) {
      const tierKey = getTierKey(entry.probability);
      groups.get(tierKey)!.push(entry);
    }
    return groups;
  }, [probData]);

  // Memoize analytics map and eliminated set to avoid new object creation each render
  const aliveAnalyticsMap = useMemo(
    () => aliveData ? new Map(Object.entries(aliveData.analyticsObj)) : new Map<string, BracketAnalytics>(),
    [aliveData]
  );
  const aliveEliminatedSet = useMemo(
    () => aliveData ? new Set(aliveData.eliminatedArr) : new Set<string>(),
    [aliveData]
  );

  // Alive tab: filter brackets (memoized)
  const aliveFiltered = useMemo(() => {
    if (!aliveData) return [];
    const { brackets, eliminatedArr, bracketFFTeamsMap } = aliveData;
    const eliminatedTeams = new Set(eliminatedArr);

    function getFFTeams(b: Bracket): string[] {
      return bracketFFTeamsMap[b.id] ?? [b.ff1, b.ff2, b.ff3, b.ff4].filter(Boolean);
    }

    switch (aliveFilter) {
      case "champion":
        return brackets
          .filter((b) => b.champion_pick && !eliminatedTeams.has(b.champion_pick))
          .sort((a, b) => b.points - a.points);
      case "ff3":
        return brackets
          .filter((b) => {
            const ffTeams = getFFTeams(b);
            return ffTeams.filter((t) => !eliminatedTeams.has(t)).length >= 3;
          })
          .sort((a, b) => b.points - a.points);
      case "ff2":
        return brackets
          .filter((b) => {
            const ffTeams = getFFTeams(b);
            return ffTeams.filter((t) => !eliminatedTeams.has(t)).length >= 2;
          })
          .sort((a, b) => b.points - a.points);
      default:
        return [...brackets].sort((a, b) => b.points - a.points);
    }
  }, [aliveData, aliveFilter]);

  return (
    <div className="space-y-section">
      <div>
        <h2 className="font-display text-2xl font-bold">Win Probability</h2>
        <p className="text-on-surface-variant text-sm mt-1">
          Estimates based on 1,000 simulated tournaments using historical seed performance. Not guarantees.
        </p>
      </div>

      {/* Tab pills */}
      <div className="overflow-x-auto no-scrollbar">
        <div className="flex gap-2 min-w-max">
          <button onClick={() => changeTab("chances")} className={tab === "chances" ? TAB_ACTIVE : TAB_INACTIVE}>
            Championship Chances
          </button>
          <button onClick={() => changeTab("finishes")} className={tab === "finishes" ? TAB_ACTIVE : TAB_INACTIVE}>
            Simulated Finishes
          </button>
          {/* Path to Victory moved to leaderboard table (expandable rows) */}
          {aliveData && (
            <button onClick={() => changeTab("alive")} className={tab === "alive" ? TAB_ACTIVE : TAB_INACTIVE}>
              Who&apos;s Still Alive
            </button>
          )}
        </div>
      </div>

      {/* Championship Chances tab */}
      {tab === "chances" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Championship Chances</h3>
            <button
              onClick={() => setShowExact(!showExact)}
              className="rounded-card px-3 py-1.5 font-label text-xs bg-surface-container hover:bg-surface-bright text-on-surface-variant transition-colors"
            >
              {showExact ? "Hide exact percentages" : "Reveal exact percentages"}
            </button>
          </div>

          {TIERS.map((tier) => {
            const entries = tierGroups.get(tier.key)!;
            if (entries.length === 0) return null;
            return (
              <div key={tier.key} className="rounded-card bg-surface-container p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-block rounded-card px-2.5 py-1 font-label text-xs font-semibold ${tier.badgeClass}`}>
                    {tier.label}
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    {entries.length} bracket{entries.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {entries.map((entry) => (
                    <div
                      key={entry.name}
                      className={`group flex items-center justify-between rounded-card px-3 py-2 overflow-hidden ${isMyBracket(entry.id) ? "bg-secondary/5 border-l-2 border-l-secondary" : "bg-surface-bright/50"}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CompareCheckbox bracketId={entry.id} />
                        <div className="min-w-0">
                          <div className={`font-body text-sm font-semibold truncate ${tier.colorClass}`}>
                            {entry.name}
                          </div>
                          {entry.full_name && entry.full_name !== entry.name && (
                            <div className="text-xs text-on-surface-variant truncate">
                              {entry.full_name}
                            </div>
                          )}
                        </div>
                      </div>
                      {showExact && (
                        <span className="font-label text-xs text-on-surface-variant ml-2 shrink-0">
                          {entry.probability.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Simulated Finishes tab */}
      {tab === "finishes" && (
        <div className="rounded-card bg-surface-container p-5">
          <div className="mb-4">
            <h3 className="font-display text-lg font-semibold">Simulated Finishes</h3>
            <p className="hidden sm:block text-xs text-on-surface-variant mt-1">
              Click any row to see details &middot; Hover any row to compare brackets
            </p>
            <p className="sm:hidden text-xs text-on-surface-variant mt-1">
              Tap any row for details &middot; Tap &#9675; to compare brackets
            </p>
          </div>
          <div className="mb-4 w-full sm:w-72">
            <MultiSelectSearch
              mode="multi"
              label="Brackets"
              options={finishBracketOptions}
              selected={finishSearch}
              onSelectedChange={setFinishSearch}
              placeholder="Filter brackets..."
            />
          </div>
          {finishSearch.length > 0 && (
            <p className="text-xs text-on-surface-variant mb-3">
              Showing {sortedProbData.length} of {probData.length} brackets
            </p>
          )}
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="min-w-[850px] w-full text-sm">
              <thead className="sticky top-0 z-20 bg-surface-container">
                <tr className="border-b border-outline-variant">
                  <th className="w-8"></th>
                  <th className="sticky left-0 bg-surface-container z-30 px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant cursor-default" title="Bracket name">Bracket</th>
                  <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant cursor-default" title="Team selected to win the championship">Champion</th>
                  <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant cursor-default" title="Championship probability tier">Tier</th>
                  <th className="group/hdr px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant cursor-pointer hover:text-on-surface select-none" title="Chance of finishing 1st from 1,000 simulations" onClick={() => toggleFinishSort("probability")}><span className="border-b border-dotted border-on-surface-variant/40">Win %</span>{fSortIcon("probability")}</th>
                  <th className="group/hdr px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant cursor-pointer hover:text-on-surface select-none" title="Chance of finishing 2nd" onClick={() => toggleFinishSort("pct_second")}><span className="border-b border-dotted border-on-surface-variant/40">2nd %</span>{fSortIcon("pct_second")}</th>
                  <th className="group/hdr px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant cursor-pointer hover:text-on-surface select-none" title="Chance of finishing 3rd" onClick={() => toggleFinishSort("pct_third")}><span className="border-b border-dotted border-on-surface-variant/40">3rd %</span>{fSortIcon("pct_third")}</th>
                  <th className="group/hdr px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant cursor-pointer hover:text-on-surface select-none" title="Chance of finishing in the top 10" onClick={() => toggleFinishSort("pct_top10")}><span className="border-b border-dotted border-on-surface-variant/40">Top 10</span>{fSortIcon("pct_top10")}</th>
                  <th className="group/hdr px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant cursor-pointer hover:text-on-surface select-none" title="Chance of finishing in the top 25" onClick={() => toggleFinishSort("pct_top25")}><span className="border-b border-dotted border-on-surface-variant/40">Top 25</span>{fSortIcon("pct_top25")}</th>
                  <th className="group/hdr px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant cursor-pointer hover:text-on-surface select-none" title="Median finishing position across simulations" onClick={() => toggleFinishSort("median_rank")}><span className="border-b border-dotted border-on-surface-variant/40">Median</span>{fSortIcon("median_rank")}</th>
                </tr>
              </thead>
              <tbody>
                {sortedProbData.map((d) => {
                  const tierKey = getTierKey(d.probability);
                  const tier = TIERS.find((t) => t.key === tierKey)!;
                  const isExpanded = expandedFinishIds.has(d.id);
                  const finishColSpan = 10;
                  return (
                    <React.Fragment key={d.id}>
                    <tr
                      className={`group border-b border-outline-variant transition-colors cursor-pointer ${isMyBracket(d.id) ? "bg-secondary/5 border-l-2 border-l-secondary" : isExpanded ? "bg-surface-bright" : "hover:bg-surface-bright"}`}
                      onClick={() => setExpandedFinishIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(d.id)) next.delete(d.id);
                        else next.add(d.id);
                        return next;
                      })}
                    >
                      <td className="w-8 px-1 py-2"><CompareCheckbox bracketId={d.id} /></td>
                      <td className={`sticky left-0 z-10 transition-colors px-2 py-2 ${isMyBracket(d.id) ? "bg-secondary/5" : isExpanded ? "bg-surface-bright" : "bg-surface-container group-hover:bg-surface-bright"}`}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-on-surface-variant/60 w-4 text-center font-label leading-none">{isExpanded ? "−" : "+"}</span>
                          <div>
                            <div className="font-semibold text-on-surface text-xs">{d.name}</div>
                            {d.full_name && d.full_name !== d.name && <div className="text-[10px] text-on-surface-variant">{d.full_name}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-xs text-on-surface-variant">
                        <TeamPill name={d.champion} seed={d.championSeed} logo={teamLogos[d.champion]} eliminated={eliminatedTeamsSet.has(d.champion)} showStatus />
                      </td>
                      <td className="px-2 py-2">
                        <span className={`inline-block rounded-card px-2 py-0.5 font-label text-[10px] ${tier.badgeClass}`}>
                          {tier.label}
                        </span>
                      </td>
                      <td className="px-2 py-2 font-label text-xs text-tertiary">{d.pct_first.toFixed(1)}%</td>
                      <td className="px-2 py-2 font-label text-xs text-on-surface-variant">{d.pct_second.toFixed(1)}%</td>
                      <td className="px-2 py-2 font-label text-xs text-on-surface-variant">{d.pct_third.toFixed(1)}%</td>
                      <td className="px-2 py-2 font-label text-xs text-secondary">{d.pct_top10.toFixed(1)}%</td>
                      <td className="px-2 py-2 font-label text-xs text-on-surface">{d.pct_top25.toFixed(1)}%</td>
                      <td className="px-2 py-2 font-label text-xs text-on-surface-variant">#{d.median_rank}</td>
                    </tr>
                    {isExpanded && (() => {
                      const path = pathByName.get(d.name);
                      return (
                        <tr>
                          <td colSpan={finishColSpan} className="px-4 py-3 bg-surface-bright/50">
                            <div className="space-y-2">
                              <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant">
                                Path to victory — {path ? path.remainingPicks.length : 0} alive picks remaining
                                {path && path.eliminatedPickCount > 0 && (
                                  <span className="ml-2 text-on-surface-variant/50">({path.eliminatedPickCount} eliminated)</span>
                                )}
                              </p>
                              {!path || path.remainingPicks.length === 0 ? (
                                <p className="text-xs text-on-surface-variant italic">No remaining picks with alive teams</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {["R32", "S16", "E8", "FF", "CHAMP"].map((round) => {
                                    const picks = path.remainingPicks.filter((p) => p.round === round);
                                    if (picks.length === 0) return null;
                                    return (
                                      <div key={round} className="flex items-center gap-2">
                                        <span className="font-label text-[10px] text-on-surface-variant w-28 shrink-0">
                                          {ROUND_LABELS[round as Round] || round}
                                          <span className="ml-1 text-secondary">+{picks.reduce((s, p) => s + p.pts, 0)}</span>
                                        </span>
                                        <div className="flex flex-wrap gap-1">
                                          {picks.map((p) => (
                                            <TeamPill
                                              key={`${round}-${p.team}`}
                                              name={p.team}
                                              seed={p.seed}
                                              logo={p.logo}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })()}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Path to Victory tab */}
      {tab === "path" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-display text-lg font-semibold">Path to Victory</h3>
            <p className="text-xs text-on-surface-variant mt-1">
              What needs to happen for each bracket to maximize their score. Shows remaining picks where the picked team is still alive.
            </p>
          </div>
          {pathData.length === 0 ? (
            <p className="text-on-surface-variant text-sm text-center py-8">No path data available.</p>
          ) : (
            <div className="space-y-3">
              {pathData.slice(0, 30).map((entry) => {
                const roundGroups = new Map<string, PathPick[]>();
                for (const p of entry.remainingPicks) {
                  if (!roundGroups.has(p.round)) roundGroups.set(p.round, []);
                  roundGroups.get(p.round)!.push(p);
                }
                const totalPossible = entry.remainingPicks.reduce((s, p) => s + p.pts, 0);
                return (
                  <div key={entry.name} className="rounded-card bg-surface-container p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-display text-sm font-semibold text-on-surface">{entry.name}</p>
                        {entry.full_name && entry.full_name !== entry.name && <p className="text-[10px] text-on-surface-variant">{entry.full_name}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-label text-xs text-on-surface">{entry.points} pts <span className="text-on-surface-variant">+ {totalPossible} possible</span></p>
                        <div className="flex items-center gap-1 justify-end">
                          <TeamPill name={entry.champion} logo={entry.championLogo} eliminated={!entry.championAlive} showStatus />
                        </div>
                      </div>
                    </div>
                    {entry.remainingPicks.length === 0 ? (
                      <p className="text-xs text-on-surface-variant italic">No remaining picks with alive teams</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {["R32", "S16", "E8", "FF", "CHAMP"].map((round) => {
                          const picks = roundGroups.get(round);
                          if (!picks) return null;
                          return picks.map((p) => (
                            <span key={`${round}-${p.team}`} className="inline-flex items-center gap-1">
                              <TeamPill name={p.team} seed={p.seed} logo={p.logo} />
                              <span className="text-on-surface-variant text-[10px]">+{p.pts}</span>
                            </span>
                          ));
                        })}
                      </div>
                    )}
                    {entry.eliminatedPickCount > 0 && (
                      <p className="text-[10px] text-on-surface-variant">{entry.eliminatedPickCount} picks eliminated</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Who's Still Alive tab */}
      {tab === "alive" && aliveData && (
        <div className="space-y-section">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

          <GamesToWatch games={aliveData.gamesToWatch} teamLogos={teamLogos} eliminatedTeams={eliminatedTeamsSet} />

          <div className="space-y-4">
            <div className="overflow-x-auto no-scrollbar">
              <div className="flex gap-2 min-w-max">
                {(
                  [
                    ["all", "All Brackets"],
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
            </div>

            <div>
              <p className="hidden sm:block text-xs text-on-surface-variant mb-1">
                Click any row to see details &middot; Hover any row to compare brackets
              </p>
              <p className="sm:hidden text-xs text-on-surface-variant mb-1">
                Tap any row for details &middot; Tap &#9675; to compare brackets
              </p>
            </div>
            <DrilldownTable
              brackets={aliveFiltered}
              analytics={aliveAnalyticsMap}
              eliminatedTeams={aliveEliminatedSet}
              teamLogos={teamLogos}
              pathData={pathData}
            />
          </div>
        </div>
      )}
    </div>
  );
}
