/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ProbabilityJourney } from "@/components/charts/ProbabilityJourney";
import { DrilldownTable } from "@/components/tables/DrilldownTable";
import { GamesToWatch } from "@/components/GamesToWatch";
import { StatCard } from "@/components/ui/StatCard";
import type { Bracket, BracketAnalytics } from "@/lib/types";

interface ProbEntry {
  name: string;
  owner: string;
  probability: number;
  champion: string;
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
  pathData = [],
  aliveData,
}: ProbabilityClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const VALID_TABS: ProbTab[] = ["chances", "finishes", "path", "alive"];
  const initialTab = (() => {
    const param = searchParams.get("tab") as ProbTab;
    if (param && VALID_TABS.includes(param)) return param;
    return "chances" as ProbTab;
  })();

  const [tab, setTab] = useState<ProbTab>(initialTab);
  const [showExact, setShowExact] = useState(false);

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
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => changeTab("chances")} className={tab === "chances" ? TAB_ACTIVE : TAB_INACTIVE}>
          Championship Chances
        </button>
        <button onClick={() => changeTab("finishes")} className={tab === "finishes" ? TAB_ACTIVE : TAB_INACTIVE}>
          Simulated Finishes
        </button>
        <button onClick={() => changeTab("path")} className={tab === "path" ? TAB_ACTIVE : TAB_INACTIVE}>
          Path to Victory
        </button>
        {aliveData && (
          <button onClick={() => changeTab("alive")} className={tab === "alive" ? TAB_ACTIVE : TAB_INACTIVE}>
            Who&apos;s Still Alive
          </button>
        )}
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
              <div key={tier.key} className="rounded-card bg-surface-container p-5 space-y-3">
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
                      className="flex items-center justify-between rounded-card bg-surface-bright/50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className={`font-body text-sm font-medium truncate ${tier.colorClass}`}>
                          {entry.name}
                        </div>
                        <div className="text-xs text-on-surface-variant truncate">
                          {entry.owner}
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline">
                  <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant" title="Bracket name and username">Bracket</th>
                  <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant" title="Championship chances tier based on simulation results">Tier</th>
                  <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant" title="Percentage of 1,000 simulations where this bracket finishes 1st">Win %</th>
                  <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant" title="Percentage of simulations finishing 2nd">2nd %</th>
                  <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant" title="Percentage of simulations finishing 3rd">3rd %</th>
                  {showExact && (
                    <>
                      <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant" title="Percentage of simulations finishing in the top 10">Top 10</th>
                      <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant" title="Percentage of simulations finishing in the top 25">Top 25</th>
                    </>
                  )}
                  <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant" title="Median finish position across 1,000 simulations">Median</th>
                  <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant" title="Championship pick for this bracket">Champion</th>
                </tr>
              </thead>
              <tbody>
                {probData.map((d) => {
                  const tierKey = getTierKey(d.probability);
                  const tier = TIERS.find((t) => t.key === tierKey)!;
                  return (
                    <tr key={d.name} className="border-b border-outline hover:bg-surface-bright transition-colors">
                      <td className="px-2 py-2">
                        <div className="text-on-surface text-xs">{d.name}</div>
                        <div className="text-[10px] text-on-surface-variant">{d.owner}</div>
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
                        <span className="inline-flex items-center gap-1">
                          {teamLogos[d.champion] && <img src={teamLogos[d.champion]} alt="" className="w-5 h-5 inline-block rounded-full bg-on-surface/10 p-[2px]" style={{ filter: "drop-shadow(0 0 1px rgba(255,255,255,0.3))" }} />}
                          {d.champion}
                        </span>
                      </td>
                    </tr>
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
                        <p className="text-[10px] text-on-surface-variant">{entry.owner}</p>
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
            <div className="flex gap-2 flex-wrap">
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

            <DrilldownTable
              brackets={aliveFiltered}
              analytics={new Map(Object.entries(aliveData.analyticsObj))}
              eliminatedTeams={new Set(aliveData.eliminatedArr)}
              teamLogos={teamLogos}
            />
          </div>
        </div>
      )}
    </div>
  );
}
