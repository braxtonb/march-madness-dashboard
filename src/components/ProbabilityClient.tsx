/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ProbabilityJourney } from "@/components/charts/ProbabilityJourney";
import { DrilldownTable } from "@/components/tables/DrilldownTable";
import { GamesToWatch } from "@/components/GamesToWatch";
import { StatCard } from "@/components/ui/StatCard";
import { TeamPill } from "@/components/ui/TeamPill";
import CompareCheckbox from "@/components/ui/CompareCheckbox";
import { ROUND_LABELS, displayName } from "@/lib/constants";
import type { Bracket, BracketAnalytics, Round } from "@/lib/types";

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

const TAB_ACTIVE = "bg-primary/15 text-primary border border-primary/30 rounded-card px-3 py-1.5 text-sm font-label";
const TAB_INACTIVE = "text-on-surface-variant hover:text-on-surface rounded-card px-3 py-1.5 text-sm font-label";

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
  const searchParams = useSearchParams();
  const router = useRouter();

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
  const [finishSortKey, setFinishSortKey] = useState<FinishSort>("probability");
  const [finishSortAsc, setFinishSortAsc] = useState(false);
  const [expandedFinishIds, setExpandedFinishIds] = useState<Set<string>>(new Set());

  const sortedProbData = useMemo(() => {
    return [...probData].sort((a, b) => {
      const aVal = a[finishSortKey] ?? 0;
      const bVal = b[finishSortKey] ?? 0;
      return finishSortAsc ? aVal - bVal : bVal - aVal;
    });
  }, [probData, finishSortKey, finishSortAsc]);

  function toggleFinishSort(key: FinishSort) {
    if (finishSortKey === key) setFinishSortAsc(!finishSortAsc);
    else { setFinishSortKey(key); setFinishSortAsc(false); }
  }
  const fArrow = (key: FinishSort) => finishSortKey === key ? (finishSortAsc ? " ↑" : " ↓") : "";

  // Alive filter state
  const initialAliveFilter = (() => {
    const param = searchParams.get("filter") as AliveFilter | null;
    if (param && VALID_ALIVE_FILTERS.includes(param)) return param;
    return "champion" as AliveFilter;
  })();
  const [aliveFilter, setAliveFilter] = useState<AliveFilter>(initialAliveFilter);

  function changeTab(t: ProbTab) {
    setTab(t);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", t);
    router.replace(`/probability?${params.toString()}`, { scroll: false });
  }

  const changeAliveFilter = useCallback(
    (v: AliveFilter) => {
      setAliveFilter(v);
      const params = new URLSearchParams(searchParams.toString());
      params.set("filter", v);
      router.replace(`/probability?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  // Build path lookup by bracket name for expanded rows
  const pathByName = useMemo(() => {
    const map = new Map<string, PathEntry>();
    for (const p of pathData) {
      map.set(p.name, p);
    }
    return map;
  }, [pathData]);

  // Group brackets by tier
  const tierGroups = new Map<TierKey, ProbEntry[]>();
  for (const tier of TIERS) {
    tierGroups.set(tier.key, []);
  }
  for (const entry of probData) {
    const tierKey = getTierKey(entry.probability);
    tierGroups.get(tierKey)!.push(entry);
  }

  // Alive tab: filter brackets
  const aliveFiltered = (() => {
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
  })();

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
                      className="flex items-center justify-between rounded-card bg-surface-bright/50 px-3 py-2 overflow-hidden"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CompareCheckbox bracketId={entry.id} />
                        <div className="min-w-0">
                          <div className={`font-body text-sm font-medium truncate ${tier.colorClass}`}>
                            {displayName(entry)}
                          </div>
                          <div className="text-xs text-on-surface-variant truncate">
                            {entry.name}
                          </div>
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold">Simulated Finishes</h3>
            <button
              onClick={() => setShowExact(!showExact)}
              className="rounded-card px-3 py-1.5 font-label text-xs bg-surface-container hover:bg-surface-bright text-on-surface-variant transition-colors border border-outline"
            >
              {showExact ? "Hide Top 10 & Top 25" : "Show Top 10 & Top 25"}
            </button>
          </div>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="min-w-[700px] w-full text-sm">
              <thead>
                <tr className="border-b border-outline">
                  <th className="w-8"></th>
                  <th className="sticky left-0 bg-surface-container z-10 px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant" title="Bracket name and username">Bracket</th>
                  <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant" title="Championship chances tier">Tier</th>
                  <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant cursor-pointer hover:text-on-surface select-none" title="Percentage finishing 1st across 1,000 simulations" onClick={() => toggleFinishSort("probability")}>Win %{fArrow("probability")}</th>
                  <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant cursor-pointer hover:text-on-surface select-none" title="Percentage finishing 2nd" onClick={() => toggleFinishSort("pct_second")}>2nd %{fArrow("pct_second")}</th>
                  <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant cursor-pointer hover:text-on-surface select-none" title="Percentage finishing 3rd" onClick={() => toggleFinishSort("pct_third")}>3rd %{fArrow("pct_third")}</th>
                  {showExact && (
                    <>
                      <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant cursor-pointer hover:text-on-surface select-none" title="Percentage finishing in top 10" onClick={() => toggleFinishSort("pct_top10")}>Top 10{fArrow("pct_top10")}</th>
                      <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant cursor-pointer hover:text-on-surface select-none" title="Percentage finishing in top 25" onClick={() => toggleFinishSort("pct_top25")}>Top 25{fArrow("pct_top25")}</th>
                    </>
                  )}
                  <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant cursor-pointer hover:text-on-surface select-none" title="Median finish position across simulations" onClick={() => toggleFinishSort("median_rank")}>Median{fArrow("median_rank")}</th>
                  <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant" title="Championship pick">Champion</th>
                </tr>
              </thead>
              <tbody>
                {sortedProbData.map((d) => {
                  const tierKey = getTierKey(d.probability);
                  const tier = TIERS.find((t) => t.key === tierKey)!;
                  const isExpanded = expandedFinishIds.has(d.id);
                  const finishColSpan = showExact ? 10 : 8;
                  return (
                    <React.Fragment key={d.id}>
                    <tr
                      className={`border-b border-outline transition-colors cursor-pointer ${isExpanded ? "bg-surface-bright" : "hover:bg-surface-bright"}`}
                      onClick={() => setExpandedFinishIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(d.id)) next.delete(d.id);
                        else next.add(d.id);
                        return next;
                      })}
                    >
                      <td className="w-8 px-1 py-2"><CompareCheckbox bracketId={d.id} /></td>
                      <td className="sticky left-0 bg-surface-container z-10 px-2 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-on-surface-variant/60 w-4 text-center font-label leading-none">{isExpanded ? "−" : "+"}</span>
                          <div>
                            <div className="text-on-surface text-xs">{displayName(d)}</div>
                            <div className="text-[10px] text-on-surface-variant">{d.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <span className={`inline-block rounded-card px-2 py-0.5 font-label text-[10px] ${tier.badgeClass}`}>
                          {tier.label}
                        </span>
                      </td>
                      <td className="px-2 py-2 font-label text-xs text-tertiary">{d.pct_first.toFixed(1)}%</td>
                      <td className="px-2 py-2 font-label text-xs text-on-surface-variant">{d.pct_second.toFixed(1)}%</td>
                      <td className="px-2 py-2 font-label text-xs text-on-surface-variant">{d.pct_third.toFixed(1)}%</td>
                      {showExact && (
                        <>
                          <td className="px-2 py-2 font-label text-xs text-secondary">{d.pct_top10.toFixed(1)}%</td>
                          <td className="px-2 py-2 font-label text-xs text-on-surface">{d.pct_top25.toFixed(1)}%</td>
                        </>
                      )}
                      <td className="px-2 py-2 font-label text-xs text-on-surface-variant">#{d.median_rank}</td>
                      <td className="px-2 py-2 text-xs text-on-surface-variant">
                        <TeamPill name={d.champion} seed={d.championSeed} logo={teamLogos[d.champion]} eliminated={eliminatedTeamsSet.has(d.champion)} showStatus />
                      </td>
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
                        <p className="font-display text-sm font-semibold text-on-surface">{displayName(entry)}</p>
                        <p className="text-[10px] text-on-surface-variant">{entry.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-label text-xs text-on-surface">{entry.points} pts <span className="text-on-surface-variant">+ {totalPossible} possible</span></p>
                        <div className="flex items-center gap-1 justify-end">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {entry.championLogo && <img src={entry.championLogo} alt="" className="w-4 h-4 rounded-full bg-on-surface/10 p-[1px]" />}
                          <span className={`text-[10px] ${entry.championAlive ? "text-secondary" : "text-on-surface-variant line-through"}`}>
                            {entry.champion}
                          </span>
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
                            <span key={`${round}-${p.team}`} className="inline-flex items-center gap-1 rounded-full bg-surface-bright px-2 py-0.5 text-[10px] font-label text-on-surface">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              {p.logo && <img src={p.logo} alt="" className="w-3.5 h-3.5 rounded-full" />}
                              {p.team}
                              <span className="text-on-surface-variant">+{p.pts}</span>
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

          <GamesToWatch games={aliveData.gamesToWatch} teamLogos={teamLogos} />

          <div className="space-y-4">
            <div className="overflow-x-auto no-scrollbar">
              <div className="flex gap-2 min-w-max">
                {(
                  [
                    ["champion", "Champion Alive"],
                    ["ff3", "3+ Final Four"],
                    ["ff2", "2+ Final Four"],
                    ["all", "All Brackets"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => changeAliveFilter(key)}
                    className={`rounded-card px-3 py-1.5 text-sm font-label transition-colors ${
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

            <DrilldownTable
              brackets={aliveFiltered}
              analytics={new Map(Object.entries(aliveData.analyticsObj))}
              eliminatedTeams={new Set(aliveData.eliminatedArr)}
              teamLogos={teamLogos}
              pathData={pathData}
            />
          </div>
        </div>
      )}
    </div>
  );
}
