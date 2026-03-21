"use client";

import { useState, useMemo } from "react";
import type { Bracket, Pick, Game, BracketAnalytics } from "@/lib/types";
import { ROUND_LABELS, ROUND_ORDER } from "@/lib/constants";
import { StatCard } from "@/components/ui/StatCard";
import { RadarComparison } from "@/components/charts/RadarComparison";

type DiffFilter = "all" | "differences" | "agreement";

export function HeadToHeadContent({
  brackets,
  picks,
  games,
  analyticsObj,
  pickRatesObj,
}: {
  brackets: Bracket[];
  picks: Pick[];
  games: Game[];
  analyticsObj: Record<string, BracketAnalytics>;
  pickRatesObj: Record<string, Record<string, number>>;
}) {
  const [id1, setId1] = useState("");
  const [id2, setId2] = useState("");
  const [diffFilter, setDiffFilter] = useState<DiffFilter>("all");

  const b1 = brackets.find((b) => b.id === id1);
  const b2 = brackets.find((b) => b.id === id2);
  const a1 = id1 ? analyticsObj[id1] : null;
  const a2 = id2 ? analyticsObj[id2] : null;

  const picks1 = picks.filter((p) => p.bracket_id === id1);
  const picks2 = picks.filter((p) => p.bracket_id === id2);

  const pickMap1 = new Map(picks1.map((p) => [p.game_id, p.team_picked]));
  const pickMap2 = new Map(picks2.map((p) => [p.game_id, p.team_picked]));
  let agree = 0;
  let total = 0;
  for (const [gid, team] of pickMap1) {
    total++;
    if (pickMap2.get(gid) === team) agree++;
  }

  // Recompute radarData reactively based on current selections
  const radarData = useMemo(() => {
    if (!b1 || !b2 || !a1 || !a2) return [];
    return [
      {
        axis: "Points",
        person1: (b1.points / Math.max(b1.points, b2.points, 1)) * 100,
        person2: (b2.points / Math.max(b1.points, b2.points, 1)) * 100,
      },
      {
        axis: "MAX",
        person1: (b1.max_remaining / Math.max(b1.max_remaining, b2.max_remaining, 1)) * 100,
        person2: (b2.max_remaining / Math.max(b1.max_remaining, b2.max_remaining, 1)) * 100,
      },
      {
        axis: "Uniqueness",
        person1: a1.uniqueness * 100,
        person2: a2.uniqueness * 100,
      },
      {
        axis: "Win %",
        person1: a1.estimated_win_prob,
        person2: a2.estimated_win_prob,
      },
      {
        axis: "Accuracy",
        person1:
          (picks1.filter((p) => p.correct).length / Math.max(picks1.length, 1)) * 100,
        person2:
          (picks2.filter((p) => p.correct).length / Math.max(picks2.length, 1)) * 100,
      },
    ];
  }, [b1, b2, a1, a2, picks1, picks2]);

  // Group ALL games by round (no completed filter)
  const gamesByRound = useMemo(() => {
    const grouped: Record<string, Game[]> = {};
    for (const round of ROUND_ORDER) {
      grouped[round] = games.filter((g) => g.round === round);
    }
    return grouped;
  }, [games]);

  const FILTER_OPTIONS: { label: string; value: DiffFilter }[] = [
    { label: "All Games", value: "all" },
    { label: "Differences Only", value: "differences" },
    { label: "Agreement Only", value: "agreement" },
  ];

  return (
    <div className="space-y-section">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <select
          value={id1}
          onChange={(e) => setId1(e.target.value)}
          className="rounded-card bg-surface-container px-4 py-2.5 text-sm text-on-surface outline-none"
        >
          <option value="">Select bracket 1...</option>
          {brackets.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} — {b.owner}
            </option>
          ))}
        </select>
        <select
          value={id2}
          onChange={(e) => setId2(e.target.value)}
          className="rounded-card bg-surface-container px-4 py-2.5 text-sm text-on-surface outline-none"
        >
          <option value="">Select bracket 2...</option>
          {brackets.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} — {b.owner}
            </option>
          ))}
        </select>
      </div>

      {b1 && b2 && a1 && a2 && (
        <>
          <div className="rounded-card bg-surface-container p-6 text-center">
            <span className="font-display text-4xl font-bold text-secondary">
              {agree}/{total}
            </span>
            <p className="text-on-surface-variant text-sm mt-1">
              You agree on {total > 0 ? Math.round((agree / total) * 100) : 0}% of picks
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-card bg-surface-container p-4 space-y-2">
              <p className="font-label text-base font-semibold text-on-surface">{b1.name}</p>
              <p className="font-label text-xs text-on-surface-variant uppercase">{b1.owner}</p>
              <p className="text-on-surface">
                Rank #{a1.rank} | {b1.points} pts | MAX {b1.max_remaining}
              </p>
              <p className="text-xs text-on-surface-variant">Champion: {b1.champion_pick}</p>
            </div>
            <div className="rounded-card bg-surface-container p-4 space-y-2">
              <p className="font-label text-base font-semibold text-on-surface">{b2.name}</p>
              <p className="font-label text-xs text-on-surface-variant uppercase">{b2.owner}</p>
              <p className="text-on-surface">
                Rank #{a2.rank} | {b2.points} pts | MAX {b2.max_remaining}
              </p>
              <p className="text-xs text-on-surface-variant">Champion: {b2.champion_pick}</p>
            </div>
          </div>

          <div className="rounded-card bg-surface-container p-5">
            <h3 className="font-display text-lg font-semibold mb-4">Comparison</h3>
            <RadarComparison data={radarData} name1={b1.name} name2={b2.name} />
          </div>

          <div className="rounded-card bg-surface-container p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="font-display text-lg font-semibold">Pick Differences</h3>
              <div className="flex gap-2">
                {FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDiffFilter(opt.value)}
                    className={`rounded-full px-3 py-1 text-xs font-label transition-colors ${
                      diffFilter === opt.value
                        ? "bg-secondary text-on-secondary"
                        : "bg-surface-bright text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 max-h-[32rem] overflow-y-auto">
              {ROUND_ORDER.map((round) => {
                const roundGames = gamesByRound[round];
                if (!roundGames || roundGames.length === 0) return null;

                const filteredGames = roundGames.filter((g) => {
                  const pick1 = pickMap1.get(g.game_id);
                  const pick2 = pickMap2.get(g.game_id);
                  const same = pick1 === pick2;
                  if (diffFilter === "differences") return !same;
                  if (diffFilter === "agreement") return same;
                  return true;
                });

                if (filteredGames.length === 0) return null;

                return (
                  <div key={round}>
                    <p className="font-label text-xs text-on-surface-variant uppercase tracking-wider mb-1 px-1">
                      {ROUND_LABELS[round]}
                    </p>
                    <div className="space-y-1">
                      {filteredGames.map((g) => {
                        const pick1 = pickMap1.get(g.game_id);
                        const pick2 = pickMap2.get(g.game_id);
                        const same = pick1 === pick2;
                        const isComplete = g.completed;
                        return (
                          <div
                            key={g.game_id}
                            className={`flex items-center justify-between rounded-card px-3 py-2 text-xs ${
                              same
                                ? "text-on-surface-variant"
                                : "bg-surface-bright text-on-surface"
                            }`}
                          >
                            <span className="w-28 truncate">
                              {g.team1} vs {g.team2}
                            </span>
                            <span
                              className={
                                isComplete && pick1 === g.winner
                                  ? "text-secondary"
                                  : "text-on-surface-variant"
                              }
                            >
                              {pick1 || "—"}
                            </span>
                            <span
                              className={
                                isComplete && pick2 === g.winner
                                  ? "text-secondary"
                                  : "text-on-surface-variant"
                              }
                            >
                              {pick2 || "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {(!b1 || !b2) && (
        <div className="rounded-card bg-surface-container p-8 text-center">
          <p className="text-on-surface-variant">
            Select two brackets above to compare them side by side.
          </p>
        </div>
      )}
    </div>
  );
}
