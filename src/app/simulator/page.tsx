/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { DashboardData, Game, Pick, Round } from "@/lib/types";
import { ROUND_POINTS, ROUND_LABELS, ROUND_ORDER } from "@/lib/constants";

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
  game_id: string;
  round: string;
  region: string;
  team1: string;
  seed1: number;
  team2: string;
  seed2: number;
  completed: boolean;
  winner: string;
  simulated: boolean; // true if teams were derived from user picks
}

/**
 * Build a mapping of gameId → nextGameId by analyzing bracket picks.
 * Each team appears in picks for consecutive rounds — tracing a team
 * through rounds reveals which games feed into which.
 */
function buildGameChain(
  picks: Pick[],
  games: Game[]
): Map<string, { nextGameId: string }> {
  // Build chain from ALL brackets' picks to get complete coverage.
  // Using a single bracket misses links for teams that bracket didn't
  // predict to advance (only captures one of two feeders per game).
  const roundIdx: Record<string, number> = { R64: 0, R32: 1, S16: 2, E8: 3, FF: 4, CHAMP: 5 };
  const chain = new Map<string, { nextGameId: string }>();

  // Group picks by bracket
  const byBracket = new Map<string, Pick[]>();
  for (const p of picks) {
    if (!p.team_picked || !p.round) continue;
    if (!byBracket.has(p.bracket_id)) byBracket.set(p.bracket_id, []);
    byBracket.get(p.bracket_id)!.push(p);
  }

  // Process each bracket to discover game-to-game links
  for (const [, bracketPicks] of byBracket) {
    // Group this bracket's picks by team
    const teamGames = new Map<string, { gameId: string; round: string }[]>();
    for (const p of bracketPicks) {
      if (!teamGames.has(p.team_picked)) teamGames.set(p.team_picked, []);
      teamGames.get(p.team_picked)!.push({ gameId: p.game_id, round: p.round });
    }

    // For each team, trace through rounds to create chain links
    for (const [, tGames] of teamGames) {
      tGames.sort((a, b) => (roundIdx[a.round] ?? 0) - (roundIdx[b.round] ?? 0));
      for (let i = 0; i < tGames.length - 1; i++) {
        const curr = tGames[i].gameId;
        const next = tGames[i + 1].gameId;
        if (!chain.has(curr)) {
          chain.set(curr, { nextGameId: next });
        }
      }
    }

    // Once we have enough links, we can stop (all brackets share the same structure)
    // Check if we have links for all non-championship games
    const nonChampGames = games.filter((g) => g.round !== "CHAMP");
    if (nonChampGames.every((g) => chain.has(g.game_id))) break;
  }

  return chain;
}

/**
 * Build a mapping of nextGameId → [feederGameId1, feederGameId2]
 */
function buildFeeders(
  chain: Map<string, { nextGameId: string }>
): Map<string, string[]> {
  const feeders = new Map<string, string[]>();
  for (const [gameId, { nextGameId }] of chain) {
    if (!feeders.has(nextGameId)) feeders.set(nextGameId, []);
    const arr = feeders.get(nextGameId)!;
    if (!arr.includes(gameId)) arr.push(gameId);
  }
  return feeders;
}

/**
 * Get the seed for a team from picks data
 */
function getTeamSeed(picks: Pick[], team: string): number {
  const pick = picks.find((p) => p.team_picked === team);
  return pick?.seed_picked ?? 0;
}

export default function SimulatorPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [selections, setSelections] = useState<Map<string, string>>(new Map());
  const [simResults, setSimResults] = useState<SimResult[]>([]);
  const [collapsedRounds, setCollapsedRounds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/data")
      .then((r) => r.json())
      .then((d: DashboardData) => {
        setData(d);
        // Collapse completed rounds by default
        const completed = new Set<string>();
        const roundGameCounts: Record<string, { total: number; done: number }> = {};
        for (const g of d.games) {
          if (!roundGameCounts[g.round]) roundGameCounts[g.round] = { total: 0, done: 0 };
          roundGameCounts[g.round].total++;
          if (g.completed) roundGameCounts[g.round].done++;
        }
        for (const [round, counts] of Object.entries(roundGameCounts)) {
          if (counts.done === counts.total && counts.total > 0) completed.add(round);
        }
        setCollapsedRounds(completed);
      })
      .catch(() => {});
  }, []);

  // Build bracket structure chain
  const gameChain = useMemo(() => {
    if (!data) return new Map<string, { nextGameId: string }>();
    return buildGameChain(data.picks, data.games);
  }, [data]);

  const feeders = useMemo(() => buildFeeders(gameChain), [gameChain]);

  // Resolve games with cascading selections
  const resolvedGames = useMemo((): ResolvedGame[] => {
    if (!data) return [];

    // Start with actual game data
    const resolved = new Map<string, ResolvedGame>();
    for (const g of data.games) {
      resolved.set(g.game_id, {
        game_id: g.game_id,
        round: g.round,
        region: g.region,
        team1: g.team1,
        seed1: g.seed1,
        team2: g.team2,
        seed2: g.seed2,
        completed: g.completed,
        winner: g.winner,
        simulated: false,
      });
    }

    // Process rounds in order — cascade selections forward
    for (const round of ROUND_ORDER) {
      const roundGames = data.games.filter((g) => g.round === round);
      for (const g of roundGames) {
        const rg = resolved.get(g.game_id)!;
        // Determine winner: actual result or user selection
        const winner = rg.completed ? rg.winner : selections.get(g.game_id) || "";

        if (winner) {
          // Cascade to next game
          const link = gameChain.get(g.game_id);
          if (link) {
            const nextGame = resolved.get(link.nextGameId);
            if (nextGame && !nextGame.completed) {
              // Determine which slot this winner goes into
              const nextFeeders = feeders.get(link.nextGameId) || [];
              const feederIdx = nextFeeders.indexOf(g.game_id);

              if (feederIdx === 0 || (!nextGame.team1 && feederIdx !== 1)) {
                if (!nextGame.team1 || nextGame.simulated) {
                  nextGame.team1 = winner;
                  nextGame.seed1 = getTeamSeed(data.picks, winner);
                  nextGame.simulated = true;
                }
              } else {
                if (!nextGame.team2 || nextGame.simulated) {
                  nextGame.team2 = winner;
                  nextGame.seed2 = getTeamSeed(data.picks, winner);
                  nextGame.simulated = true;
                }
              }
            }
          }
        }
      }
    }

    return [...resolved.values()];
  }, [data, selections, gameChain, feeders]);

  // Group resolved games by round
  const gamesByRound = useMemo(() => {
    const map: Record<string, ResolvedGame[]> = {};
    for (const round of ROUND_ORDER) {
      const games = resolvedGames.filter((g) => g.round === round);
      if (games.length > 0) map[round] = games;
    }
    return map;
  }, [resolvedGames]);

  // Build team logo lookup from data.teams
  const teamLogos = useMemo(() => {
    if (!data) return {} as Record<string, string>;
    return Object.fromEntries(data.teams.map((t) => [t.name, t.logo || ""]));
  }, [data]);

  // Auto-simulate impact
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
        }))
      );
    },
    []
  );

  useEffect(() => {
    if (!data) return;
    runSimulate(data, selections);
  }, [selections, data, runSimulate]);

  // Toggle a winner selection
  function toggleWinner(gameId: string, team: string) {
    setSelections((prev) => {
      const next = new Map(prev);
      if (next.get(gameId) === team) {
        // Deselect — also clear any downstream selections that depended on this
        next.delete(gameId);
        clearDownstream(gameId, next);
      } else {
        // If switching teams, clear downstream first
        if (next.has(gameId)) {
          clearDownstream(gameId, next);
        }
        next.set(gameId, team);
      }
      return next;
    });
  }

  function clearDownstream(gameId: string, sel: Map<string, string>) {
    const link = gameChain.get(gameId);
    if (!link) return;
    if (sel.has(link.nextGameId)) {
      sel.delete(link.nextGameId);
      clearDownstream(link.nextGameId, sel);
    }
  }

  // All favorites: cascade through all rounds
  function setAllFavorites() {
    if (!data) return;
    const next = new Map<string, string>();
    // Process round by round, using resolved data
    for (const round of ROUND_ORDER) {
      const roundGames = resolvedGames.filter((g) => g.round === round);
      for (const g of roundGames) {
        if (g.completed) continue;
        const t1 = g.team1 || resolveTeamFromSelection(g.game_id, next, 1);
        const t2 = g.team2 || resolveTeamFromSelection(g.game_id, next, 2);
        const s1 = g.seed1 || (t1 ? getTeamSeed(data.picks, t1) : 99);
        const s2 = g.seed2 || (t2 ? getTeamSeed(data.picks, t2) : 99);
        if (t1 && t2) {
          next.set(g.game_id, s1 <= s2 ? t1 : t2);
        }
      }
    }
    setSelections(next);
  }

  function setAllUnderdogs() {
    if (!data) return;
    const next = new Map<string, string>();
    for (const round of ROUND_ORDER) {
      const roundGames = resolvedGames.filter((g) => g.round === round);
      for (const g of roundGames) {
        if (g.completed) continue;
        const t1 = g.team1 || resolveTeamFromSelection(g.game_id, next, 1);
        const t2 = g.team2 || resolveTeamFromSelection(g.game_id, next, 2);
        const s1 = g.seed1 || (t1 ? getTeamSeed(data.picks, t1) : 0);
        const s2 = g.seed2 || (t2 ? getTeamSeed(data.picks, t2) : 0);
        if (t1 && t2) {
          next.set(g.game_id, s1 > s2 ? t1 : t2);
        }
      }
    }
    setSelections(next);
  }

  function resolveTeamFromSelection(
    gameId: string,
    sel: Map<string, string>,
    slot: 1 | 2
  ): string {
    const gameFeeders = feeders.get(gameId) || [];
    const feeder = gameFeeders[slot - 1];
    if (!feeder) return "";
    // Check if feeder game has a completed result
    const feederGame = data?.games.find((g) => g.game_id === feeder);
    if (feederGame?.completed) return feederGame.winner;
    return sel.get(feeder) || "";
  }

  function toggleRoundCollapse(round: string) {
    setCollapsedRounds((prev) => {
      const next = new Set(prev);
      if (next.has(round)) next.delete(round);
      else next.add(round);
      return next;
    });
  }

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

  const totalPending = resolvedGames.filter((g) => !g.completed).length;

  return (
    <div className="space-y-section">
      <div>
        <h2 className="font-display text-2xl font-bold">Scenario Simulator</h2>
        <p className="text-on-surface-variant text-sm mt-1">
          Pick winners round by round — your selections cascade into later rounds
        </p>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-section lg:items-start">
        {/* Left: game picker */}
        <div className="lg:col-span-2 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto lg:pr-2 space-y-2">
          {Object.entries(gamesByRound).map(([round, games]) => {
            const isCollapsed = collapsedRounds.has(round);
            const completedCount = games.filter((g) => g.completed).length;
            const selectedCount = games.filter((g) => !g.completed && selections.has(g.game_id)).length;
            const pendingCount = games.length - completedCount;

            return (
              <div key={round}>
                <button
                  onClick={() => toggleRoundCollapse(round)}
                  className="w-full flex items-center justify-between sticky top-0 bg-surface z-10 py-2 px-1"
                >
                  <span className="font-label text-xs uppercase tracking-wider text-on-surface-variant">
                    {isCollapsed ? "▶" : "▼"} {ROUND_LABELS[round as keyof typeof ROUND_LABELS]}
                  </span>
                  <span className="font-label text-[10px] text-on-surface-variant">
                    {completedCount === games.length
                      ? "Complete"
                      : `${selectedCount}/${pendingCount} picked`}
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="space-y-1.5 pb-2">
                    {games.map((g) => {
                      const hasBothTeams = Boolean(g.team1 && g.team2);

                      if (g.completed) {
                        return (
                          <div key={g.game_id} className="rounded-card bg-surface-container/50 p-2.5 opacity-50">
                            <div className="flex items-center gap-2">
                              <span className={`flex-1 rounded-card px-2 py-1.5 text-xs font-label inline-flex items-center gap-1 ${g.winner === g.team1 ? "bg-secondary/10 text-secondary" : "text-on-surface-variant"}`}>
                                {teamLogos[g.team1] && <img src={teamLogos[g.team1]} alt="" className="w-4 h-4 inline-block rounded-sm" />}
                                {g.seed1} {g.team1}{g.winner === g.team1 && " \u2713"}
                              </span>
                              <span className="text-[10px] text-on-surface-variant">vs</span>
                              <span className={`flex-1 rounded-card px-2 py-1.5 text-xs font-label inline-flex items-center gap-1 ${g.winner === g.team2 ? "bg-secondary/10 text-secondary" : "text-on-surface-variant"}`}>
                                {teamLogos[g.team2] && <img src={teamLogos[g.team2]} alt="" className="w-4 h-4 inline-block rounded-sm" />}
                                {g.seed2} {g.team2}{g.winner === g.team2 && " \u2713"}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      if (hasBothTeams) {
                        return (
                          <div
                            key={g.game_id}
                            className={`rounded-card p-2.5 ${g.simulated ? "border border-dashed border-tertiary/30 bg-surface-container/70" : "bg-surface-container"}`}
                          >
                            {g.simulated && (
                              <span className="inline-block mb-1 rounded-full bg-tertiary/15 text-tertiary px-2 py-0.5 text-[9px] font-label">
                                Simulated matchup
                              </span>
                            )}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleWinner(g.game_id, g.team1)}
                                className={`flex-1 rounded-card px-2 py-1.5 text-xs font-label transition-colors inline-flex items-center gap-1 ${
                                  selections.get(g.game_id) === g.team1
                                    ? "bg-secondary/20 text-secondary"
                                    : "bg-surface-bright text-on-surface-variant hover:text-on-surface"
                                }`}
                              >
                                {teamLogos[g.team1] && <img src={teamLogos[g.team1]} alt="" className="w-4 h-4 inline-block rounded-sm" />}
                                {g.seed1} {g.team1}
                              </button>
                              <span className="text-[10px] text-on-surface-variant">vs</span>
                              <button
                                onClick={() => toggleWinner(g.game_id, g.team2)}
                                className={`flex-1 rounded-card px-2 py-1.5 text-xs font-label transition-colors inline-flex items-center gap-1 ${
                                  selections.get(g.game_id) === g.team2
                                    ? "bg-secondary/20 text-secondary"
                                    : "bg-surface-bright text-on-surface-variant hover:text-on-surface"
                                }`}
                              >
                                {teamLogos[g.team2] && <img src={teamLogos[g.team2]} alt="" className="w-4 h-4 inline-block rounded-sm" />}
                                {g.seed2} {g.team2}
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={g.game_id} className="rounded-card border border-dashed border-outline/30 bg-surface-container/30 p-2.5">
                          <div className="flex items-center gap-2">
                            <span className="flex-1 text-center text-xs font-label text-on-surface-variant/40 inline-flex items-center justify-center gap-1">
                              {g.team1 ? <>{teamLogos[g.team1] && <img src={teamLogos[g.team1]} alt="" className="w-4 h-4 inline-block rounded-sm" />}{g.seed1} {g.team1}</> : "TBD"}
                            </span>
                            <span className="text-[10px] text-on-surface-variant/40">vs</span>
                            <span className="flex-1 text-center text-xs font-label text-on-surface-variant/40 inline-flex items-center justify-center gap-1">
                              {g.team2 ? <>{teamLogos[g.team2] && <img src={teamLogos[g.team2]} alt="" className="w-4 h-4 inline-block rounded-sm" />}{g.seed2} {g.team2}</> : "TBD"}
                            </span>
                          </div>
                          <p className="text-[9px] text-on-surface-variant/30 italic text-center mt-1">
                            Pick earlier rounds to unlock
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          <p className="text-xs text-on-surface-variant pb-4">
            {selections.size} of {totalPending} pending games predicted
          </p>
        </div>

        {/* Right: impact table */}
        <div className="lg:col-span-3 lg:sticky lg:top-4 space-y-4">
          <h3 className="font-display text-lg font-semibold">Impact</h3>

          {simResults.length === 0 ? (
            <div className="rounded-card bg-surface-container p-8 text-center">
              <p className="text-on-surface-variant text-sm">
                Select game winners to see the projected standings impact.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-card bg-surface-container max-h-[calc(100vh-14rem)] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface-container z-10">
                  <tr className="border-b border-outline">
                    <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Rank</th>
                    <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Bracket</th>
                    <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Change</th>
                    <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Pts</th>
                    <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Sim Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {simResults.map((r) => {
                    const delta = r.baseRank - r.simRank;
                    return (
                      <tr key={r.id} className="border-b border-outline hover:bg-surface-bright transition-colors">
                        <td className="px-3 py-2 font-label">{r.simRank}</td>
                        <td className="px-3 py-2">
                          <div className="text-on-surface text-xs">{r.name}</div>
                          <div className="text-[10px] text-on-surface-variant">{r.owner}</div>
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
