"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { DashboardData, Game, Round } from "@/lib/types";
import { ROUND_POINTS, ROUND_LABELS, ROUND_ORDER } from "@/lib/constants";

/* ── helpers ─────────────────────────────────────────────────────── */

/** Next round in the bracket progression */
const NEXT_ROUND: Partial<Record<Round, Round>> = {
  R64: "R32",
  R32: "S16",
  S16: "E8",
  E8: "FF",
  FF: "CHAMP",
};

/**
 * For regional rounds (R64→R32→S16→E8), games feed forward within the
 * same region. FF and CHAMP are cross-region.  We resolve "which game
 * does a team advance into?" by scanning later-round games for an
 * empty team slot in the same region (or any region for FF/CHAMP).
 */
function findNextGame(
  team: string,
  currentRound: Round,
  currentRegion: string,
  allGames: Game[],
  simulatedTeams: Map<string, { team1: string; seed1: number; team2: string; seed2: number }>,
): string | null {
  const nextRound = NEXT_ROUND[currentRound];
  if (!nextRound) return null;

  const isRegional = ["R64", "R32", "S16", "E8"].includes(currentRound);

  // Find a game in the next round that either already has this team OR
  // has an empty slot and is in the matching region (or any region for FF/CHAMP).
  for (const g of allGames) {
    if (g.round !== nextRound) continue;
    if (isRegional && g.region !== currentRegion) continue;

    const sim = simulatedTeams.get(g.game_id);
    const t1 = sim?.team1 ?? g.team1;
    const t2 = sim?.team2 ?? g.team2;

    // If this team is already placed here, this is the right game
    if (t1 === team || t2 === team) return g.game_id;

    // If there is an empty slot, this team might fill it
    if (!t1 || !t2) return g.game_id;
  }
  return null;
}

/** Build a seed lookup from the original games + teams data */
function buildSeedMap(games: Game[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const g of games) {
    if (g.team1) m.set(g.team1, g.seed1);
    if (g.team2) m.set(g.team2, g.seed2);
  }
  return m;
}

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

interface ResolvedGame {
  game: Game;
  /** The team names to display (may differ from game.team1/team2 if simulated) */
  displayTeam1: string;
  displaySeed1: number;
  displayTeam2: string;
  displaySeed2: number;
  /** Is at least one team derived from a user selection rather than real data? */
  isSimulated: boolean;
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

  /* ── cascading resolved games ─────────────────────────────────── */

  const seedMap = useMemo(() => (data ? buildSeedMap(data.games) : new Map<string, number>()), [data]);

  /**
   * Walk the rounds in order.  For each game whose team slots are empty,
   * try to fill them from completed-game winners or user selections in
   * earlier rounds.
   */
  const resolvedGames: ResolvedGame[] = useMemo(() => {
    if (!data) return [];

    // Track simulated overrides: gameId → { team1, seed1, team2, seed2 }
    const simTeams = new Map<string, { team1: string; seed1: number; team2: string; seed2: number }>();
    // Track which game IDs have at least one simulated team
    const simFlags = new Set<string>();

    // Process round by round so earlier picks cascade into later rounds
    for (const round of ROUND_ORDER) {
      const roundGames = data.games.filter((g) => g.round === round);

      for (const g of roundGames) {
        // Determine effective winners for completed games or user-selected games
        let winner: string | null = null;
        if (g.completed && g.winner) {
          winner = g.winner;
        } else if (selections.has(g.game_id)) {
          winner = selections.get(g.game_id)!;
        }

        if (!winner) continue;

        // Find the next-round game this winner feeds into
        const nextGameId = findNextGame(winner, g.round as Round, g.region, data.games, simTeams);
        if (!nextGameId) continue;

        const nextGame = data.games.find((ng) => ng.game_id === nextGameId);
        if (!nextGame) continue;

        const existing = simTeams.get(nextGameId) ?? {
          team1: nextGame.team1,
          seed1: nextGame.seed1,
          team2: nextGame.team2,
          seed2: nextGame.seed2,
        };

        const winnerSeed = seedMap.get(winner) ?? 0;

        // Place into the first empty slot, or if team is already placed, leave it
        if (existing.team1 === winner || existing.team2 === winner) {
          // Already placed
          simTeams.set(nextGameId, existing);
        } else if (!existing.team1) {
          simTeams.set(nextGameId, { ...existing, team1: winner, seed1: winnerSeed });
          if (!g.completed) simFlags.add(nextGameId);
        } else if (!existing.team2) {
          simTeams.set(nextGameId, { ...existing, team2: winner, seed2: winnerSeed });
          if (!g.completed) simFlags.add(nextGameId);
        }
        // else: both slots full — bracket structure mismatch; skip
      }
    }

    return data.games.map((g) => {
      const sim = simTeams.get(g.game_id);
      return {
        game: g,
        displayTeam1: sim?.team1 ?? g.team1,
        displaySeed1: sim?.seed1 ?? g.seed1,
        displayTeam2: sim?.team2 ?? g.team2,
        displaySeed2: sim?.seed2 ?? g.seed2,
        isSimulated: simFlags.has(g.game_id),
      };
    });
  }, [data, selections, seedMap]);

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
        simRanked.slice(0, 15).map((s, i) => ({
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
        // Un-selecting — also clear any downstream selections that depended on this
        next.delete(gameId);
        clearDownstream(next, gameId, team);
      } else {
        // If switching from the other team, clear downstream of old pick first
        const oldPick = next.get(gameId);
        if (oldPick) clearDownstream(next, gameId, oldPick);
        next.set(gameId, team);
      }
      return next;
    });
  }

  /**
   * When a user un-picks or switches a winner, any downstream game that
   * was populated with that team should be reset.
   */
  function clearDownstream(sel: Map<string, string>, _gameId: string, team: string) {
    if (!data) return;
    // Walk forward through rounds: if a later game had this team selected, remove it
    for (const round of ROUND_ORDER) {
      for (const g of data.games.filter((gm) => gm.round === round)) {
        if (sel.get(g.game_id) === team) {
          sel.delete(g.game_id);
        }
      }
    }
  }

  /** Pick the lower seed (favorite) for all known-team pending games */
  function setAllFavorites() {
    const next = new Map<string, string>();
    for (const rg of resolvedGames) {
      if (!rg.game.completed && rg.displayTeam1 && rg.displayTeam2) {
        next.set(rg.game.game_id, rg.displaySeed1 <= rg.displaySeed2 ? rg.displayTeam1 : rg.displayTeam2);
      }
    }
    setSelections(next);
  }

  /** Pick the higher seed (underdog) for all known-team pending games */
  function setAllUnderdogs() {
    const next = new Map<string, string>();
    for (const rg of resolvedGames) {
      if (!rg.game.completed && rg.displayTeam1 && rg.displayTeam2) {
        next.set(rg.game.game_id, rg.displaySeed1 > rg.displaySeed2 ? rg.displayTeam1 : rg.displayTeam2);
      }
    }
    setSelections(next);
  }

  /* ── group resolved games by round ─────────────────────────────── */

  const gamesByRound = useMemo(() => {
    const map: Record<string, ResolvedGame[]> = {};
    for (const round of ROUND_ORDER) {
      const games = resolvedGames.filter((rg) => rg.game.round === round);
      if (games.length > 0) map[round] = games;
    }
    return map;
  }, [resolvedGames]);

  const totalPickable = resolvedGames.filter(
    (rg) => !rg.game.completed && rg.displayTeam1 && rg.displayTeam2,
  ).length;

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

      {/* Quick-fill buttons */}
      <div className="flex gap-2 flex-wrap">
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
          <h3 className="font-display text-lg font-semibold sticky top-0 bg-surface z-10 py-1">
            All Games
          </h3>

          {Object.entries(gamesByRound).map(([round, games]) => (
            <div key={round} className="space-y-2">
              <h4 className="font-label text-xs uppercase tracking-wider text-on-surface-variant sticky top-8 bg-surface z-10 py-1">
                {ROUND_LABELS[round as keyof typeof ROUND_LABELS]}
              </h4>

              {games.map((rg) => {
                const { game: g, displayTeam1, displaySeed1, displayTeam2, displaySeed2, isSimulated } = rg;
                const hasBothTeams = Boolean(displayTeam1 && displayTeam2);
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
                      className={`rounded-card p-3 ${
                        isSimulated
                          ? "border border-dashed border-secondary/40 bg-surface-container/80"
                          : "bg-surface-container"
                      }`}
                    >
                      {isSimulated && (
                        <div className="mb-1.5 flex items-center gap-1">
                          <span className="inline-block rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-label uppercase tracking-wider text-secondary">
                            Simulated
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleWinner(g.game_id, displayTeam1)}
                          className={`flex-1 rounded-card px-3 py-2 text-xs font-label transition-colors ${
                            selections.get(g.game_id) === displayTeam1
                              ? "bg-secondary/20 text-secondary glow-primary"
                              : "bg-surface-bright text-on-surface-variant hover:text-on-surface"
                          }`}
                        >
                          {displaySeed1} {displayTeam1}
                        </button>
                        <span className="text-xs text-on-surface-variant">vs</span>
                        <button
                          onClick={() => toggleWinner(g.game_id, displayTeam2)}
                          className={`flex-1 rounded-card px-3 py-2 text-xs font-label transition-colors ${
                            selections.get(g.game_id) === displayTeam2
                              ? "bg-secondary/20 text-secondary glow-primary"
                              : "bg-surface-bright text-on-surface-variant hover:text-on-surface"
                          }`}
                        >
                          {displaySeed2} {displayTeam2}
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
                        {displayTeam1 ? `${displaySeed1} ${displayTeam1}` : "TBD"}
                      </span>
                      <span className="text-xs text-on-surface-variant/50">vs</span>
                      <span className="flex-1 rounded-card px-3 py-2 text-xs font-label text-on-surface-variant/50 text-center">
                        {displayTeam2 ? `${displaySeed2} ${displayTeam2}` : "TBD"}
                      </span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant/40 italic text-center mt-1">
                      Pick earlier rounds first
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
            <div className="overflow-x-auto rounded-card bg-surface-container">
              <table className="w-full text-sm">
                <thead>
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
