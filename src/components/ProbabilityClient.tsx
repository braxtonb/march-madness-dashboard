"use client";

import { useState } from "react";
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
}

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

export function ProbabilityClient({
  probData,
  journeyData,
  journeyBracketNames,
  allSnapshotProbsZero,
}: ProbabilityClientProps) {
  const [showExact, setShowExact] = useState(false);

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

      {/* Encouraging tier view */}
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

      {/* Probability Journey */}
      {allSnapshotProbsZero ? (
        <div className="rounded-card bg-surface-container p-5">
          <h3 className="font-display text-lg font-semibold mb-2">Probability Journey</h3>
          <p className="text-sm text-on-surface-variant">
            Probability journey tracking starts after the next round completes.
          </p>
        </div>
      ) : (
        journeyData.length > 0 && (
          <div className="rounded-card bg-surface-container p-5">
            <h3 className="font-display text-lg font-semibold mb-4">Probability Journey</h3>
            <ProbabilityJourney data={journeyData} bracketNames={journeyBracketNames} />
          </div>
        )
      )}

      {/* Expected Finish table */}
      <div className="rounded-card bg-surface-container p-5">
        <h3 className="font-display text-lg font-semibold mb-4">Expected Finish</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline">
                <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Bracket</th>
                <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Tier</th>
                <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Median Finish</th>
                <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Best Possible</th>
                <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Champion</th>
                {showExact && (
                  <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Win %</th>
                )}
              </tr>
            </thead>
            <tbody>
              {probData.map((d) => {
                const tierKey = getTierKey(d.probability);
                const tier = TIERS.find((t) => t.key === tierKey)!;
                return (
                  <tr key={d.name} className="border-b border-outline hover:bg-surface-bright transition-colors">
                    <td className="px-3 py-2">
                      <div className="text-on-surface">{d.name}</div>
                      <div className="text-xs text-on-surface-variant">{d.owner}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded-card px-2 py-0.5 font-label text-xs ${tier.badgeClass}`}>
                        {tier.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-label text-on-surface-variant">#{d.median_rank}</td>
                    <td className="px-3 py-2 font-label text-secondary">#{d.best_rank}</td>
                    <td className="px-3 py-2 text-on-surface-variant">{d.champion}</td>
                    {showExact && (
                      <td className="px-3 py-2 font-label text-tertiary">{d.probability.toFixed(1)}%</td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
