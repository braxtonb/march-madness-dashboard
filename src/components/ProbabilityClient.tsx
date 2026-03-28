/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useCallback, useMemo } from "react";
import { ViewBracketLink } from "@/components/ui/ViewBracketLink";
import { SimulateLink } from "@/components/ui/SimulateLink";
import { useSearchParams } from "next/navigation";
import { ProbabilityJourney } from "@/components/charts/ProbabilityJourney";
import { TeamPill } from "@/components/ui/TeamPill";
import CompareCheckbox from "@/components/ui/CompareCheckbox";
import MultiSelectSearch from "@/components/ui/MultiSelectSearch";
import type { MultiSelectOption } from "@/components/ui/MultiSelectSearch";
import { useMyBracket } from "@/components/ui/MyBracketProvider";
import { ROUND_LABELS } from "@/lib/constants";
import type { Round } from "@/lib/types";

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
  bracketId?: string;
  name?: string;
  owner?: string;
  full_name?: string;
  points?: number;
  maxRemaining?: number;
  champion?: string;
  championLogo?: string;
  championAlive?: boolean;
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

interface TimelineCheckpoint {
  gameIndex: number;
  gameId: string;
  round: string;
  team1: string;
  seed1: number;
  team2: string;
  seed2: number;
  winner: string;
}

interface TimelineLine {
  bracketId: string;
  name: string;
  champion: string;
  eliminatedAtGame: number;
  probabilities: number[];
}

interface ProbabilityClientProps {
  probData: ProbEntry[];
  journeyData: JourneyPoint[];
  journeyBracketNames: string[];
  allSnapshotProbsZero: boolean;
  teamLogos?: Record<string, string>;
  eliminatedTeams?: string[];
  pathData?: PathEntry[];
  timelineCheckpoints?: TimelineCheckpoint[];
  timelineLines?: TimelineLine[];
  embedded?: boolean;
  initialTab?: "chances" | "finishes";
}

type ProbTab = "chances" | "finishes" | "path";

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

export function ProbabilityClient({
  probData,
  journeyData,
  journeyBracketNames,
  allSnapshotProbsZero,
  teamLogos = {},
  eliminatedTeams: eliminatedTeamsArr = [],
  pathData = [],
  timelineCheckpoints = [],
  timelineLines = [],
  embedded = false,
  initialTab: initialTabProp,
}: ProbabilityClientProps) {
  const { isMyBracket } = useMyBracket();
  const searchParams = useSearchParams();

  const eliminatedTeamsSet = useMemo(() => new Set(eliminatedTeamsArr), [eliminatedTeamsArr]);

  const VALID_TABS: ProbTab[] = ["chances", "finishes"];
  const initialTab = (() => {
    if (initialTabProp && VALID_TABS.includes(initialTabProp)) return initialTabProp;
    const param = searchParams.get("tab") as ProbTab;
    if (param && VALID_TABS.includes(param)) return param;
    return "chances" as ProbTab;
  })();

  const [tab, setTab] = useState<ProbTab>(initialTab);
  // Sync tab when parent changes the initialTab prop (embedded mode)
  React.useEffect(() => {
    if (initialTabProp && VALID_TABS.includes(initialTabProp)) setTab(initialTabProp);
  }, [initialTabProp, VALID_TABS]);
  const [showExact, setShowExact] = useState(false);

  // Sort state for simulated finishes table
  type FinishSort = "probability" | "pct_second" | "pct_third" | "pct_top10" | "pct_top25" | "median_rank";
  const VALID_FINISH_SORTS: FinishSort[] = ["probability", "pct_second", "pct_third", "pct_top10", "pct_top25", "median_rank"];
  const [finishSortKey, setFinishSortKey] = useState<FinishSort>(() => {
    const s = searchParams.get("fsort") as FinishSort | null;
    return s && VALID_FINISH_SORTS.includes(s) ? s : "probability";
  });
  const [finishSortAsc, setFinishSortAsc] = useState(() => {
    const d = searchParams.get("fdir");
    if (d === "asc") return true;
    if (d === "desc") return false;
    return false;
  });
  const [expandedFinishIds, setExpandedFinishIds] = useState<Set<string>>(new Set());
  const [finishSearch, setFinishSearch] = useState<string[]>(() => {
    const fb = searchParams.get("finishBrackets");
    return fb ? fb.split(",").filter(Boolean) : [];
  });

  // Build bracket options for MultiSelectSearch
  const finishBracketOptions: MultiSelectOption[] = useMemo(() => {
    return probData.map((d) => ({
      value: d.id,
      label: d.name,
      sublabel: d.full_name && d.full_name !== d.name ? d.full_name : undefined,
    }));
  }, [probData]);

  const handleFinishSearchChange = useCallback((ids: string[]) => {
    setFinishSearch(ids);
    const url = new URL(window.location.href);
    if (ids.length > 0) {
      url.searchParams.set("finishBrackets", ids.join(","));
    } else {
      url.searchParams.delete("finishBrackets");
    }
    window.history.replaceState(null, "", url.toString());
  }, []);

  // Champion filter for simulated finishes
  const [finishChampionFilter, setFinishChampionFilter] = useState<string[]>(() => {
    const v = searchParams.get("finishChampion");
    return v ? v.split(",").filter(Boolean) : [];
  });
  const finishChampionOptions: MultiSelectOption[] = useMemo(() => {
    const map = new Set<string>();
    for (const d of probData) if (d.champion) map.add(d.champion);
    return [...map].sort().map((c) => ({ value: c, label: c }));
  }, [probData]);
  const handleFinishChampionChange = useCallback((ids: string[]) => {
    setFinishChampionFilter(ids);
    const url = new URL(window.location.href);
    if (ids.length > 0) url.searchParams.set("finishChampion", ids.join(","));
    else url.searchParams.delete("finishChampion");
    window.history.replaceState(null, "", url.toString());
  }, []);

  // Tier filter for simulated finishes
  const [finishTierFilter, setFinishTierFilter] = useState<string[]>([]);
  const tierOptions: MultiSelectOption[] = useMemo(() =>
    TIERS.map((t) => ({ value: t.key, label: t.label })),
    [],
  );
  const handleFinishTierChange = useCallback((ids: string[]) => {
    setFinishTierFilter(ids);
  }, []);

  // Checkpoint filter for simulated finishes — -1 means "current" (latest)
  const [checkpointIndex, setCheckpointIndex] = useState<number>(-1);
  const [checkpointOpen, setCheckpointOpen] = useState(false);

  // Build checkpoint options for the selector
  const checkpointOptions = useMemo(() => {
    return timelineCheckpoints.map((cp, i) => ({
      index: i,
      label: `Game ${i + 1}: ${cp.winner} beat ${cp.winner === cp.team1 ? cp.team2 : cp.team1}`,
      round: cp.round,
    }));
  }, [timelineCheckpoints]);

  // Override probData with checkpoint probabilities when a checkpoint is selected
  const displayProbData = useMemo(() => {
    if (checkpointIndex < 0 || timelineLines.length === 0) return probData;

    // Build a map of bracketId -> win% at this checkpoint
    const winPctMap = new Map<string, number>();
    for (const line of timelineLines) {
      const pct = line.probabilities[checkpointIndex] ?? 0;
      winPctMap.set(line.bracketId, pct);
    }

    return probData.map((d) => ({
      ...d,
      probability: winPctMap.get(d.id) ?? 0,
      pct_first: winPctMap.get(d.id) ?? 0,
      // Zero out detailed rank stats since we only have win% per checkpoint
      pct_second: 0,
      pct_third: 0,
      pct_top10: 0,
      pct_top25: 0,
      median_rank: 0,
      best_rank: 0,
    }));
  }, [probData, checkpointIndex, timelineLines]);

  const sortedProbData = useMemo(() => {
    let data = [...displayProbData];
    if (finishSearch.length > 0) {
      const idSet = new Set(finishSearch);
      data = data.filter((d) => idSet.has(d.id));
    }
    if (finishChampionFilter.length > 0) {
      const champSet = new Set(finishChampionFilter);
      data = data.filter((d) => champSet.has(d.champion));
    }
    if (finishTierFilter.length > 0) {
      const tierSet = new Set(finishTierFilter);
      data = data.filter((d) => tierSet.has(getTierKey(d.probability)));
    }
    return data.sort((a, b) => {
      const aVal = a[finishSortKey] ?? 0;
      const bVal = b[finishSortKey] ?? 0;
      return finishSortAsc ? aVal - bVal : bVal - aVal;
    });
  }, [displayProbData, finishSortKey, finishSortAsc, finishSearch, finishChampionFilter, finishTierFilter]);

  function toggleFinishSort(key: FinishSort) {
    const newAsc = finishSortKey === key ? !finishSortAsc : key === "median_rank";
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
  function changeTab(t: ProbTab) {
    setTab(t);
    const url = new URL(window.location.href);

    // Clear ALL tab-specific params, then set the new tab
    const allTabParams = ["fsort", "fdir", "finishBrackets", "finishChampion", "filter", "watch"];
    for (const p of allTabParams) {
      url.searchParams.delete(p);
    }

    url.searchParams.set("tab", t);
    window.history.replaceState(null, "", url.toString());
  }

  // Build path lookup by bracket name for expanded rows
  const pathByBracketId = useMemo(() => {
    const map = new Map<string, PathEntry>();
    for (const p of pathData) {
      if (p.bracketId) map.set(p.bracketId, p);
      else if (p.name) map.set(p.name, p);
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

  return (
    <div className="space-y-section">
      {!embedded && (
        <div>
          <h2 className="font-display text-2xl font-bold">Win Probability</h2>
          <p className="text-on-surface-variant text-sm mt-1">
            Estimates based on 10,000 simulated tournaments using historical seed performance. Not guarantees.
          </p>
        </div>
      )}

      {/* Tab pills — hidden when embedded (parent handles view switching) */}
      {!embedded && (
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex gap-2 min-w-max">
            <button onClick={() => changeTab("chances")} className={tab === "chances" ? TAB_ACTIVE : TAB_INACTIVE}>
              Championship Chances
            </button>
            <button onClick={() => changeTab("finishes")} className={tab === "finishes" ? TAB_ACTIVE : TAB_INACTIVE}>
              Simulated Finishes
            </button>
          </div>
        </div>
      )}

      {/* Championship Chances tab */}
      {tab === "chances" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button
              onClick={() => setShowExact(!showExact)}
              className="rounded-card px-3 py-1.5 font-label text-xs bg-surface-container hover:bg-surface-bright text-on-surface-variant transition-colors whitespace-nowrap min-h-[44px] flex items-center"
            >
              {showExact ? "Hide exact %" : "Reveal exact %"}
            </button>
          </div>

          {TIERS.map((tier) => {
            const entries = tierGroups.get(tier.key)!;
            if (entries.length === 0) return null;
            return (
              <div key={tier.key} className="space-y-1">
                <div className="flex items-center gap-2 pt-1">
                  <span className={`inline-block rounded-full px-2 py-0.5 font-label text-[10px] font-semibold ${tier.badgeClass}`}>
                    {tier.label}
                  </span>
                  <span className="text-[10px] text-on-surface-variant">
                    {entries.length} bracket{entries.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
                  {entries.map((entry) => (
                    <div
                      key={entry.name}
                      className={`flex items-center gap-1.5 rounded px-2 py-1.5 overflow-hidden ${isMyBracket(entry.id) ? "bg-[#0f2e36] border-l-2 border-l-secondary" : "bg-surface-container"}`}
                    >
                      <CompareCheckbox bracketId={entry.id} />
                      <div className="min-w-0 flex-1">
                        <div className={`text-xs font-semibold truncate ${tier.colorClass}`}>
                          {entry.name}
                        </div>
                        {entry.full_name && entry.full_name !== entry.name && (
                          <div className="text-[10px] text-on-surface-variant truncate">
                            {entry.full_name}
                          </div>
                        )}
                      </div>
                      {showExact && (
                        <span className="font-label text-[10px] text-on-surface-variant shrink-0">
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
        <div className="rounded-card bg-surface-container p-3 sm:p-5">
          <p className="text-xs text-on-surface-variant mb-4">
            Click any row to see details &middot; Hover to compare
          </p>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="w-full sm:w-72">
              <MultiSelectSearch
                mode="multi"
                label="Brackets"
                options={finishBracketOptions}
                selected={finishSearch}
                onSelectedChange={handleFinishSearchChange}
                placeholder="Filter brackets..."
              />
            </div>
            <div className="w-full sm:w-56">
              <MultiSelectSearch
                mode="multi"
                label="Champions"
                options={finishChampionOptions}
                selected={finishChampionFilter}
                onSelectedChange={handleFinishChampionChange}
                placeholder="Filter by champion..."
              />
            </div>
            <div className="w-full sm:w-48">
              <MultiSelectSearch
                mode="multi"
                label="Tiers"
                options={tierOptions}
                selected={finishTierFilter}
                onSelectedChange={handleFinishTierChange}
                placeholder="Filter by tier..."
              />
            </div>
          </div>
          {/* Checkpoint time-travel selector */}
          {checkpointOptions.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-label text-on-surface-variant shrink-0">View as of:</span>
                <div className="relative">
                  <button
                    onClick={() => setCheckpointOpen(!checkpointOpen)}
                    className="inline-flex items-center gap-1.5 bg-surface-container border border-outline-variant/30 rounded-lg px-3 py-2 text-sm text-on-surface font-label hover:border-secondary/40 transition-colors"
                  >
                    <span className="truncate inline-flex items-center gap-1">
                      {checkpointIndex < 0
                        ? "Current (after all games)"
                        : (() => {
                            const cpData = timelineCheckpoints[checkpointIndex];
                            const winner = cpData?.winner || "";
                            const loser = winner === cpData?.team1 ? cpData?.team2 : cpData?.team1;
                            const winnerSeed = winner === cpData?.team1 ? cpData?.seed1 : cpData?.seed2;
                            const loserSeed = loser === cpData?.team1 ? cpData?.seed1 : cpData?.seed2;
                            const wLogo = teamLogos[winner];
                            const lLogo = loser ? teamLogos[loser] : undefined;
                            return (
                              <>
                                <span className="text-on-surface-variant/60">{cpData?.round}</span>
                                {wLogo && <img src={wLogo} alt="" className="w-3.5 h-3.5 object-contain" />}
                                <span className="font-semibold">{winnerSeed ? `${winnerSeed} ` : ""}{winner}</span>
                                <span className="text-on-surface-variant">over</span>
                                {lLogo && <img src={lLogo} alt="" className="w-3.5 h-3.5 object-contain opacity-70" />}
                                <span className="text-on-surface-variant line-through">{loserSeed ? `${loserSeed} ` : ""}{loser}</span>
                              </>
                            );
                          })()}
                    </span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-on-surface-variant/60"><path d="m6 9 6 6 6-6"/></svg>
                  </button>
                  {checkpointOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setCheckpointOpen(false)} />
                      <div className="absolute top-full left-0 mt-1 z-50 w-80 max-h-72 overflow-y-auto rounded-lg bg-surface-container border border-outline-variant/30 shadow-xl">
                        <button
                          onClick={() => { setCheckpointIndex(-1); setCheckpointOpen(false); }}
                          className={`w-full text-left px-3 py-2.5 text-sm font-label hover:bg-surface-bright transition-colors ${checkpointIndex < 0 ? "text-primary font-semibold bg-primary/5 border-l-2 border-l-primary" : "text-on-surface border-l-2 border-l-transparent"}`}
                        >
                          Current (after all games)
                        </button>
                        {[...checkpointOptions].reverse().map((cp) => {
                          const cpData = timelineCheckpoints[cp.index];
                          const winner = cpData?.winner || "";
                          const loser = winner === cpData?.team1 ? cpData?.team2 : cpData?.team1;
                          const winnerSeed = winner === cpData?.team1 ? cpData?.seed1 : cpData?.seed2;
                          const loserSeed = loser === cpData?.team1 ? cpData?.seed1 : cpData?.seed2;
                          const winnerLogo = teamLogos[winner];
                          const loserLogo = loser ? teamLogos[loser] : undefined;
                          const loserEliminated = loser ? eliminatedTeamsSet.has(loser) : false;
                          return (
                          <button
                            key={cp.index}
                            onClick={() => { setCheckpointIndex(cp.index); setCheckpointOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-sm font-label hover:bg-surface-bright transition-colors border-t border-outline-variant/10 ${checkpointIndex === cp.index ? "text-primary font-semibold bg-primary/5 border-l-2 border-l-primary" : "text-on-surface border-l-2 border-l-transparent"}`}
                          >
                            <span className="text-on-surface-variant/60 mr-1.5 text-xs">{cp.round}</span>
                            <span className="inline-flex items-center gap-1">
                              {winnerLogo && <img src={winnerLogo} alt="" className="w-3.5 h-3.5 inline-block object-contain" />}
                              <span className="font-semibold">{winnerSeed ? `${winnerSeed} ` : ""}{winner}</span>
                              <span className="text-on-surface-variant">over</span>
                              {loserLogo && <img src={loserLogo} alt="" className="w-3.5 h-3.5 inline-block object-contain opacity-70" />}
                              <span className={loserEliminated ? "text-on-surface-variant/60 line-through" : "text-on-surface-variant"}>{loserSeed ? `${loserSeed} ` : ""}{loser}</span>
                            </span>
                          </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
                {checkpointIndex >= 0 && (
                  <button
                    onClick={() => setCheckpointIndex(-1)}
                    className="text-[10px] text-secondary hover:text-secondary/80 font-label transition-colors"
                  >
                    Reset to current
                  </button>
                )}
              </div>
              {checkpointIndex >= 0 && (
                <p className="text-[10px] text-on-surface-variant/60 mt-1">
                  Showing win probabilities as they were after game {checkpointIndex + 1} of {checkpointOptions.length}. Only Win% column is available for historical checkpoints.
                </p>
              )}
            </div>
          )}
          {(finishSearch.length > 0 || finishChampionFilter.length > 0 || finishTierFilter.length > 0) && (
            <p className="text-xs text-on-surface-variant mb-3">
              Showing {sortedProbData.length} of {probData.length} brackets
            </p>
          )}
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <table className="min-w-[850px] w-full text-sm">
              <thead className="sticky top-0 z-20 bg-surface-container">
                <tr className="border-b border-outline-variant">
                  <th className="w-8"></th>
                  <th className="sticky left-0 bg-surface-container z-30 px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant !cursor-default" title="Bracket name">Bracket</th>
                  <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant !cursor-default" title="Current points">Pts</th>
                  <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant !cursor-default" title="Maximum possible points">Max</th>
                  <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant !cursor-default" title="Team selected to win the championship">Champion</th>
                  <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant !cursor-default" title="Championship probability tier">Tier</th>
                  <th className="group/hdr px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant !cursor-pointer hover:text-on-surface select-none" title="Chance of finishing 1st from 1,000 simulations" onClick={() => toggleFinishSort("probability")}><span className="border-b border-dotted border-on-surface-variant/40">Win %</span>{fSortIcon("probability")}</th>
                  <th className="group/hdr px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant !cursor-pointer hover:text-on-surface select-none" title="Chance of finishing 2nd" onClick={() => toggleFinishSort("pct_second")}><span className="border-b border-dotted border-on-surface-variant/40">2nd %</span>{fSortIcon("pct_second")}</th>
                  <th className="group/hdr px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant !cursor-pointer hover:text-on-surface select-none" title="Chance of finishing 3rd" onClick={() => toggleFinishSort("pct_third")}><span className="border-b border-dotted border-on-surface-variant/40">3rd %</span>{fSortIcon("pct_third")}</th>
                  <th className="group/hdr px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant !cursor-pointer hover:text-on-surface select-none" title="Chance of finishing in the top 10" onClick={() => toggleFinishSort("pct_top10")}><span className="border-b border-dotted border-on-surface-variant/40">Top 10</span>{fSortIcon("pct_top10")}</th>
                  <th className="group/hdr px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant !cursor-pointer hover:text-on-surface select-none" title="Chance of finishing in the top 25" onClick={() => toggleFinishSort("pct_top25")}><span className="border-b border-dotted border-on-surface-variant/40">Top 25</span>{fSortIcon("pct_top25")}</th>
                  <th className="group/hdr px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant !cursor-pointer hover:text-on-surface select-none" title="Median finishing position across simulations" onClick={() => toggleFinishSort("median_rank")}><span className="border-b border-dotted border-on-surface-variant/40">Median</span>{fSortIcon("median_rank")}</th>
                </tr>
              </thead>
              <tbody>
                {sortedProbData.map((d) => {
                  const tierKey = getTierKey(d.probability);
                  const tier = TIERS.find((t) => t.key === tierKey)!;
                  const isExpanded = expandedFinishIds.has(d.id);
                  const finishColSpan = 12;
                  return (
                    <React.Fragment key={d.id}>
                    <tr
                      className={`group border-b border-outline-variant transition-colors cursor-pointer ${isMyBracket(d.id) ? "bg-[#0f2e36] border-l-2 border-l-secondary" : isExpanded ? "bg-surface-bright" : "hover:bg-surface-bright"}`}
                      onClick={() => setExpandedFinishIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(d.id)) next.delete(d.id);
                        else next.add(d.id);
                        return next;
                      })}
                    >
                      <td className="w-8 px-1 py-2"><CompareCheckbox bracketId={d.id} /></td>
                      <td className={`sticky left-0 z-10 transition-colors px-2 py-2 ${isMyBracket(d.id) ? "bg-[#0f2e36]" : isExpanded ? "bg-surface-bright" : "bg-surface-container group-hover:bg-surface-bright"}`}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-on-surface-variant/60 w-4 text-center font-label leading-none">{isExpanded ? "−" : "+"}</span>
                          <div>
                            <div className="font-semibold text-on-surface text-xs">{d.name}</div>
                            {d.full_name && d.full_name !== d.name && <div className="text-[10px] text-on-surface-variant">{d.full_name}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2 font-label text-xs text-on-surface">{d.points}</td>
                      <td className="px-2 py-2 font-label text-xs text-on-surface-variant">{d.points + d.max_remaining}</td>
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
                      const path = pathByBracketId.get(d.id);
                      return (
                        <tr>
                          <td colSpan={finishColSpan} className="px-4 py-3 bg-surface-bright/50">
                            <div className="space-y-2">
                              <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant flex items-center gap-2 flex-wrap">
                                <span>Path to victory — {path ? path.remainingPicks.length : 0} alive picks remaining
                                  {path && path.eliminatedPickCount > 0 && (
                                    <span className="ml-1 text-on-surface-variant/50">({path.eliminatedPickCount} eliminated)</span>
                                  )}
                                </span>
                                <ViewBracketLink bracketId={d.id} />
                                <SimulateLink bracketId={d.id} />
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

      {/* Who's Still Alive content moved to leaderboard Insights tab */}
    </div>
  );
}
