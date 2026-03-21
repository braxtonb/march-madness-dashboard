"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { DashboardData, Game, Round } from "@/lib/types";
import { ROUND_POINTS, ROUND_LABELS, ROUND_ORDER } from "@/lib/constants";

/* ── types ───────────────────────────────────────────────────────── */

interface SimResult {
  id: string;
  name: string;
  owner: string;
  baseRank: number;
  simRank: number;
  basePoints: number;
  simPoints: number;
}

/* ── component ───────────────────────────────────────────────────── */

export default function SimulatorPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [selections, setSelections] = useState<Map<string, string>>(new Map());
  const [simResults, setSimResults] = useState<SimResult[]>([]);

  useEffect(() => {
    fetch("/api/data")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  /* ── group games by round ──────────────────────────────────────── */

  const gamesByRound = useMemo(() => {
    if (!data) return {} as Record<string, Game[]>;
    const map: Record<string, Game[]> = {};
    for (const round of ROUND_ORDER) {
      const games = data.games.filter((g) => g.round === round);
      if (games.length > 0) map[round] = games;
    }
    return map;
  }, [data]);

  /* ── pending games with both teams known ───────────────────────── */

  const pickableGames = useMemo(() => {
    if (!data) return [] as Game[];
    return data.games.filter((g) => !g.completed && g.team1 && g.team2);
  }, [data]);

  /* ── auto-simulate impact ──────────────────────────────────────── */

  const runSimulate = useCallback(
    (d: DashboardData, sel: Map<string, string>) => {
      const picksByBracket = new Map<string, Map<string, string>>();
      for (const p of d.picks) {
        if (!picksByBracket.has(p.bracket_id)) picksByBracket.set(p.bracket_id, new Map());
        picksByBracket.get(p.bracket_id)!.set(p.game_id, p.team_picked);
      }

      const scored = d.brackets.map((b) => {
        const bPicks = picksByBracket.get(b.id);
        let bonus = 0;
        if (bPicks) {
          for (const [gameId, winner] of sel) {
            const picked = bPicks.get(gameId);
            const game = d.games.find((g) => g.game_id === gameId);
            if (picked === winner && game) {
              bonus += ROUND_POINTS[game.round as keyof typeof ROUND_POINTS] || 0;
            }
          }
        }
        return { id: b.id, name: b.name, owner: b.owner, basePoints: b.points, simPoints: b.points + bonus };
      });

      const baseRanked = [...d.brackets].sort((a, b) => b.points - a.points);
      const simRanked = [...scored].sort((a, b) => b.simPoints - a.simPoints);

      const baseRankMap = new Map<string, number>();
      baseRanked.forEach((b, i) => baseRankMap.set(b.id, i + 1));

      setSimResults(
        simRanked.map((s, i) => ({
          ...s,
          baseRank: baseRankMap.get(s.id) || 0,
          simRank: i + 1,
        })),
      );
    },
    [],
  );

  useEffect(() => {
    if (!data) return;
    runSimulate(data, selections);
  }, [selections, data, runSimulate]);

  /* ── event handlers ────────────────────────────────────────────── */

  function toggleWinner(gameId: string, team: string) {
    setSelections((prev) => {
      const next = new Map(prev);
      if (next.get(gameId) === team) {
        next.delete(gameId);
      } else {
        next.set(gameId, team);
      }
      return next;
    });
  }

  /** Pick the lower seed (favorite) for all known-team pending games */
  function setAllFavorites() {
    if (!data) return;
    const next = new Map<string, string>();
    for (const g of pickableGames) {
      next.set(g.game_id, g.seed1 <= g.seed2 ? g.team1 : g.team2);
    }
    setSelections(next);
  }

  /** Pick the higher seed (underdog) for all known-team pending games */
  function setAllUnderdogs() {
    if (!data) return;
    const next = new Map<string, string>();
    for (const g of pickableGames) {
      next.set(g.game_id, g.seed1 > g.seed2 ? g.team1 : g.team2);
    }
    setSelections(next);
  }

  const totalPickable = pickableGames.length;

  /* ── loading state ─────────────────────────────────────────────── */

  if (!data) {
    return (
      <div className="space-y-section">
        <div>
          <h2 className="font-display text-2xl font-bold">Scenario Simulator</h2>
          <p className="text-on-surface-variant text-sm mt-1">Loading data...</p>
        </div>
      </div>
    );
  }

  /* ── render ─────────────────────────────────────────────────────── */

  return (
    <div className="space-y-section">
      <div>
        <h2 className="font-display text-2xl font-bold">Scenario Simulator</h2>
        <p className="text-on-surface-variant text-sm mt-1">
          Toggle game outcomes and see how the standings shift
        </p>
      </div>

      {/* Quick-fill buttons — z-50 ensures they stay above sticky round headers (z-10/z-20) */}
      <div className="relative z-50 flex gap-2 flex-wrap">
        <button
          onClick={setAllFavorites}
          className="rounded-card bg-surface-container px-4 py-2 text-sm font-label text-on-surface-variant hover:text-on-surface transition-colors"
        >
          All favorites
        </button>
        <button
          onClick={setAllUnderdogs}
          className="rounded-card bg-surface-container px-4 py-2 text-sm font-label text-on-surface-variant hover:text-on-surface transition-colors"
        >
          All underdogs
        </button>
        <button
          onClick={() => setSelections(new Map())}
          className="rounded-card bg-surface-container px-4 py-2 text-sm font-label text-on-surface-variant hover:text-on-surface transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Sticky split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-section lg:items-start">
        {/* Left: game picker (scrolls independently) */}
        <div className="lg:col-span-2 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto lg:pr-2 space-y-4">
          <h3 className="font-display text-lg font-semibold sticky top-0 bg-surface z-20 py-1">
            All Games
          </h3>

          {Object.entries(gamesByRound).map(([round, games]) => (
            <div key={round} className="space-y-2">
              <h4 className="font-label text-xs uppercase tracking-wider text-on-surface-variant sticky top-8 bg-surface z-10 py-1">
                {ROUND_LABELS[round as keyof typeof ROUND_LABELS]}
              </h4>

              {games.map((g) => {
                const hasBothTeams = Boolean(g.team1 && g.team2);
                const isCompleted = g.completed;

                /* ── Completed game (locked) ── */
                if (isCompleted) {
                  return (
                    <div
                      key={g.game_id}
                      className="rounded-card bg-surface-container/50 p-3 opacity-60"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex-1 rounded-card px-3 py-2 text-xs font-label ${
                            g.winner === g.team1
                              ? "bg-secondary/10 text-secondary"
                              : "text-on-surface-variant"
                          }`}
                        >
                          {g.seed1} {g.team1}
                          {g.winner === g.team1 && " \u2713"}
                        </span>
                        <span className="text-xs text-on-surface-variant">vs</span>
                        <span
                          className={`flex-1 rounded-card px-3 py-2 text-xs font-label ${
                            g.winner === g.team2
                              ? "bg-secondary/10 text-secondary"
                              : "text-on-surface-variant"
                          }`}
                        >
                          {g.seed2} {g.team2}
                          {g.winner === g.team2 && " \u2713"}
                        </span>
                      </div>
                    </div>
                  );
                }

                /* ── Known pending game (toggleable) ── */
                if (hasBothTeams) {
                  return (
                    <div
                      key={g.game_id}
                      className="rounded-card bg-surface-container p-3"
                    >
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleWinner(g.game_id, g.team1)}
                          className={`flex-1 rounded-card px-3 py-2 text-xs font-label transition-colors ${
                            selections.get(g.game_id) === g.team1
                              ? "bg-secondary/20 text-secondary glow-primary"
                              : "bg-surface-bright text-on-surface-variant hover:text-on-surface"
                          }`}
                        >
                          {g.seed1} {g.team1}
                        </button>
                        <span className="text-xs text-on-surface-variant">vs</span>
                        <button
                          onClick={() => toggleWinner(g.game_id, g.team2)}
                          className={`flex-1 rounded-card px-3 py-2 text-xs font-label transition-colors ${
                            selections.get(g.game_id) === g.team2
                              ? "bg-secondary/20 text-secondary glow-primary"
                              : "bg-surface-bright text-on-surface-variant hover:text-on-surface"
                          }`}
                        >
                          {g.seed2} {g.team2}
                        </button>
                      </div>
                    </div>
                  );
                }

                /* ── TBD game ── */
                return (
                  <div
                    key={g.game_id}
                    className="rounded-card border border-dashed border-outline/40 bg-surface-container/40 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex-1 rounded-card px-3 py-2 text-xs font-label text-on-surface-variant/50 text-center">
                        {g.team1 ? `${g.seed1} ${g.team1}` : "TBD"}
                      </span>
                      <span className="text-xs text-on-surface-variant/50">vs</span>
                      <span className="flex-1 rounded-card px-3 py-2 text-xs font-label text-on-surface-variant/50 text-center">
                        {g.team2 ? `${g.seed2} ${g.team2}` : "TBD"}
                      </span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant/40 italic text-center mt-1">
                      TBD — pick earlier rounds first
                    </p>
                  </div>
                );
              })}
            </div>
          ))}

          <p className="text-xs text-on-surface-variant pb-4">
            {selections.size} of {totalPickable} available matchups selected
          </p>
        </div>

        {/* Right: impact table (sticky) */}
        <div className="lg:col-span-3 lg:sticky lg:top-4 space-y-4">
          <h3 className="font-display text-lg font-semibold">Impact</h3>

          {simResults.length === 0 && (
            <div className="rounded-card bg-surface-container p-8 text-center">
              <p className="text-on-surface-variant text-sm">
                Select game winners to see the projected standings impact.
              </p>
            </div>
          )}

          {simResults.length > 0 && (
            <div className="overflow-x-auto rounded-card bg-surface-container max-h-[calc(100vh-14rem)] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface-container z-10">
                  <tr className="border-b border-outline">
                    <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">
                      Sim Rank
                    </th>
                    <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">
                      Bracket
                    </th>
                    <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">
                      Change
                    </th>
                    <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">
                      Pts
                    </th>
                    <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">
                      Sim Pts
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {simResults.map((r) => {
                    const delta = r.baseRank - r.simRank;
                    return (
                      <tr
                        key={r.id}
                        className="border-b border-outline hover:bg-surface-bright transition-colors"
                      >
                        <td className="px-3 py-2 font-label">{r.simRank}</td>
                        <td className="px-3 py-2">
                          <div className="text-on-surface">{r.name}</div>
                          <div className="text-xs text-on-surface-variant">{r.owner}</div>
                        </td>
                        <td className="px-3 py-2 font-label">
                          {delta > 0 && <span className="text-secondary">+{delta}</span>}
                          {delta === 0 && <span className="text-on-surface-variant">&mdash;</span>}
                          {delta < 0 && <span className="text-on-surface-variant">{delta}</span>}
                        </td>
                        <td className="px-3 py-2 font-label text-on-surface-variant">{r.basePoints}</td>
                        <td className="px-3 py-2 font-label text-on-surface">{r.simPoints}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
