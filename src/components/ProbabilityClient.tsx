/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ProbabilityJourney } from "@/components/charts/ProbabilityJourney";

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

interface ProbabilityClientProps {
  probData: ProbEntry[];
  journeyData: JourneyPoint[];
  journeyBracketNames: string[];
  allSnapshotProbsZero: boolean;
  teamLogos?: Record<string, string>;
}

type ProbTab = "chances" | "finishes" | "journey";

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

export function ProbabilityClient({
  probData,
  journeyData,
  journeyBracketNames,
  allSnapshotProbsZero,
  teamLogos = {},
}: ProbabilityClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = (searchParams.get("tab") as ProbTab) || "chances";
  const [tab, setTab] = useState<ProbTab>(initialTab);
  const [showExact, setShowExact] = useState(false);

  function changeTab(t: ProbTab) {
    setTab(t);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", t);
    router.replace(`/probability?${params.toString()}`, { scroll: false });
  }

  // Group brackets by tier
  const tierGroups = new Map<TierKey, ProbEntry[]>();
  for (const tier of TIERS) {
    tierGroups.set(tier.key, []);
  }
  for (const entry of probData) {
    const tierKey = getTierKey(entry.probability);
    tierGroups.get(tierKey)!.push(entry);
  }

  return (
    <div className="space-y-section">
      <div>
        <h2 className="font-display text-2xl font-bold">Win Probability</h2>
        <p className="text-on-surface-variant text-sm mt-1">
          Estimates based on 1,000 simulated tournaments using historical seed performance. Not guarantees.
        </p>
      </div>

      {/* Tab pills */}
      <div className="flex gap-2">
        <button onClick={() => changeTab("chances")} className={tab === "chances" ? TAB_ACTIVE : TAB_INACTIVE}>
          Championship Chances
        </button>
        <button onClick={() => changeTab("finishes")} className={tab === "finishes" ? TAB_ACTIVE : TAB_INACTIVE}>
          Simulated Finishes
        </button>
        <button onClick={() => changeTab("journey")} className={tab === "journey" ? TAB_ACTIVE : TAB_INACTIVE}>
          Probability Journey
        </button>
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
                  <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant">Bracket</th>
                  <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant">Tier</th>
                  <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant">Win %</th>
                  <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant">2nd %</th>
                  <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant">3rd %</th>
                  {showExact && (
                    <>
                      <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant">Top 10</th>
                      <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant">Top 25</th>
                    </>
                  )}
                  <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant">Median</th>
                  <th className="px-2 py-2 text-left font-label text-[10px] uppercase tracking-wider text-on-surface-variant">Champion</th>
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
                          {teamLogos[d.champion] && <img src={teamLogos[d.champion]} alt="" className="w-4 h-4 inline-block rounded-sm" />}
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

      {/* Probability Journey tab */}
      {tab === "journey" && (
        <div className="rounded-card bg-surface-container p-5">
          <h3 className="font-display text-lg font-semibold mb-4">Probability Journey</h3>
          {allSnapshotProbsZero ? (
            <p className="text-sm text-on-surface-variant">
              Probability journey tracking starts after the next round completes. The scraper captures
              win probability snapshots at the end of each round, building a picture of how chances
              shift throughout the tournament.
            </p>
          ) : journeyData.length > 0 ? (
            <ProbabilityJourney data={journeyData} bracketNames={journeyBracketNames} />
          ) : (
            <p className="text-sm text-on-surface-variant">No journey data available yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
