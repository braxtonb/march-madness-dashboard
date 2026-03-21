"use client";

import { useState, useMemo } from "react";
import type { Bracket, Pick, Game, BracketAnalytics } from "@/lib/types";
import { ROUND_LABELS, ROUND_ORDER } from "@/lib/constants";

type DiffFilter = "all" | "differences" | "agreement";

export function HeadToHeadContent({
  brackets,
  picks,
  games,
  analyticsObj,
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
          {/* Agreement stat */}
          <div className="rounded-card bg-surface-container p-6 text-center">
            <span className="font-display text-4xl font-bold text-secondary">
              {agree}/{total}
            </span>
            <p className="text-on-surface-variant text-sm mt-1">
              You agree on {total > 0 ? Math.round((agree / total) * 100) : 0}% of picks
            </p>
          </div>

          {/* Side-by-side bracket stat cards */}
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

          {/* Pick differences — card-based view */}
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

            <div className="space-y-6 max-h-[48rem] overflow-y-auto pr-1">
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
                    <p className="font-label text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3 px-1">
                      {ROUND_LABELS[round]}
                    </p>
                    <div className="space-y-3">
                      {filteredGames.map((g) => {
                        const pick1 = pickMap1.get(g.game_id);
                        const pick2 = pickMap2.get(g.game_id);
                        const same = pick1 === pick2;
                        const isComplete = g.completed;
                        const pick1Correct = isComplete && !!pick1 && pick1 === g.winner;
                        const pick2Correct = isComplete && !!pick2 && pick2 === g.winner;

                        return (
                          <div
                            key={g.game_id}
                            className={`rounded-card border p-4 ${
                              same
                                ? "bg-surface border-outline-variant"
                                : "bg-surface-bright border-secondary/30"
                            }`}
                          >
                            {/* Game header */}
                            <div className="mb-3">
                              <p className="font-label text-sm font-semibold text-on-surface">
                                {g.team1} vs {g.team2}
                              </p>
                              <p className="text-xs text-on-surface-variant mt-0.5">
                                {ROUND_LABELS[round]}
                                {isComplete && (
                                  <span className="ml-2 text-on-surface-variant">• Completed</span>
                                )}
                              </p>
                            </div>

                            {/* Pick columns */}
                            <div className="grid grid-cols-2 gap-3">
                              {/* Bracket 1 pick */}
                              <div
                                className={`rounded-md p-3 ${
                                  pick1Correct
                                    ? "bg-secondary/10 border border-secondary/40"
                                    : "bg-surface-container"
                                }`}
                              >
                                <p className="text-xs font-semibold text-on-surface">{b1.name}</p>
                                <p className="text-xs text-on-surface-variant mb-2">{b1.owner}</p>
                                {pick1 ? (
                                  <>
                                    <p
                                      className={`text-sm font-medium ${
                                        pick1Correct ? "text-secondary" : "text-on-surface"
                                      }`}
                                    >
                                      {pick1}
                                    </p>
                                    {isComplete && (
                                      <p
                                        className={`text-xs mt-0.5 ${
                                          pick1Correct
                                            ? "text-secondary"
                                            : "text-on-surface-variant"
                                        }`}
                                      >
                                        {pick1Correct ? "✓ Correct" : "✗ Incorrect"}
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-sm text-on-surface-variant italic">No pick</p>
                                )}
                              </div>

                              {/* Bracket 2 pick */}
                              <div
                                className={`rounded-md p-3 ${
                                  pick2Correct
                                    ? "bg-secondary/10 border border-secondary/40"
                                    : "bg-surface-container"
                                }`}
                              >
                                <p className="text-xs font-semibold text-on-surface">{b2.name}</p>
                                <p className="text-xs text-on-surface-variant mb-2">{b2.owner}</p>
                                {pick2 ? (
                                  <>
                                    <p
                                      className={`text-sm font-medium ${
                                        pick2Correct ? "text-secondary" : "text-on-surface"
                                      }`}
                                    >
                                      {pick2}
                                    </p>
                                    {isComplete && (
                                      <p
                                        className={`text-xs mt-0.5 ${
                                          pick2Correct
                                            ? "text-secondary"
                                            : "text-on-surface-variant"
                                        }`}
                                      >
                                        {pick2Correct ? "✓ Correct" : "✗ Incorrect"}
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-sm text-on-surface-variant italic">No pick</p>
                                )}
                              </div>
                            </div>
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
