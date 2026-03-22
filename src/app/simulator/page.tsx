/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { DashboardData, Game, Pick, Round, Bracket } from "@/lib/types";
import { ROUND_POINTS, ROUND_LABELS, ROUND_ORDER } from "@/lib/constants";
import MultiSelectSearch from "@/components/ui/MultiSelectSearch";
import type { MultiSelectOption } from "@/components/ui/MultiSelectSearch";
import CompareCheckbox from "@/components/ui/CompareCheckbox";
import { TeamPill } from "@/components/ui/TeamPill";
import { useMyBracket } from "@/components/ui/MyBracketProvider";

interface SimResult {
  id: string;
  name: string;
  owner: string;
  full_name: string;
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
  espn_url?: string;
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
  const { isMyBracket } = useMyBracket();
  const [data, setData] = useState<DashboardData | null>(null);
  const [selections, setSelections] = useState<Map<string, string>>(new Map());
  const [simResults, setSimResults] = useState<SimResult[]>([]);
  const [collapsedRounds, setCollapsedRounds] = useState<Set<string>>(new Set());
  const [simSearch, setSimSearch] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        espn_url: g.espn_url,
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

  // Build bracket lookup by id for champion display
  const bracketById = useMemo(() => {
    if (!data) return new Map<string, Bracket>();
    return new Map(data.brackets.map((b) => [b.id, b]));
  }, [data]);

  // Build eliminated teams set
  const eliminatedTeamsSet = useMemo(() => {
    if (!data) return new Set<string>();
    return new Set(data.teams.filter((t) => t.eliminated).map((t) => t.name));
  }, [data]);

  // Build bracket options for MultiSelectSearch
  const bracketOptions: MultiSelectOption[] = useMemo(() => {
    if (!data) return [];
    return data.brackets.map((b) => ({ value: b.id, label: b.name, sublabel: b.full_name && b.full_name !== b.name ? b.full_name : undefined }));
  }, [data]);

  // Filter sim results by search
  const filteredSimResults = useMemo(() => {
    if (simSearch.length === 0) return simResults;
    const idSet = new Set(simSearch);
    return simResults.filter((r) => idSet.has(r.id));
  }, [simResults, simSearch]);

  // Path to victory per bracket
  const pathMap = useMemo(() => {
    if (!data) return new Map<string, { remainingPicks: { round: string; team: string; seed: number; pts: number; logo: string }[]; eliminatedPickCount: number }>();
    const eliminatedTeams = new Set<string>();
    for (const g of data.games) {
      if (g.completed && g.winner) {
        if (g.team1 && g.team1 !== g.winner) eliminatedTeams.add(g.team1);
        if (g.team2 && g.team2 !== g.winner) eliminatedTeams.add(g.team2);
      }
    }
    const completedGameIds = new Set(data.games.filter((g) => g.completed).map((g) => g.game_id));
    const ROUND_PTS: Record<string, number> = { R64: 10, R32: 20, S16: 40, E8: 80, FF: 160, CHAMP: 320 };
    const map = new Map<string, { remainingPicks: { round: string; team: string; seed: number; pts: number; logo: string }[]; eliminatedPickCount: number }>();
    const logos: Record<string, string> = Object.fromEntries(data.teams.map((t) => [t.name, t.logo || ""]));
    for (const b of data.brackets) {
      const bPicks = data.picks.filter((p) => p.bracket_id === b.id);
      const remainingPicks = bPicks
        .filter((p) => !completedGameIds.has(p.game_id) && p.team_picked && !eliminatedTeams.has(p.team_picked))
        .map((p) => ({
          round: p.round,
          team: p.team_picked,
          seed: p.seed_picked,
          pts: ROUND_PTS[p.round] || 0,
          logo: logos[p.team_picked] || "",
        }));
      const eliminatedPickCount = bPicks
        .filter((p) => !completedGameIds.has(p.game_id) && p.team_picked && eliminatedTeams.has(p.team_picked))
        .length;
      map.set(b.id, { remainingPicks, eliminatedPickCount });
    }
    return map;
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
        return { id: b.id, name: b.name, owner: b.owner, full_name: b.full_name, basePoints: b.points, simPoints: b.points + bonus };
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

  /**
   * Fill remaining unselected games with favorites or underdogs,
   * preserving any existing user selections.
   */
  function fillRemaining(mode: "favorites" | "underdogs") {
    if (!data) return;
    const next = new Map(selections); // start from current selections

    const gMap = new Map(data.games.map((g) => [g.game_id, g]));

    for (const round of ROUND_ORDER) {
      const roundGames = data.games.filter((g) => g.round === round);
      for (const g of roundGames) {
        if (g.completed) continue;
        if (next.has(g.game_id)) continue; // preserve existing selection

        let t1 = g.team1;
        let s1 = g.seed1;
        let t2 = g.team2;
        let s2 = g.seed2;

        if (!t1 || !t2) {
          const gameFeeders = feeders.get(g.game_id) || [];
          if (!t1 && gameFeeders[0]) {
            const feeder = gMap.get(gameFeeders[0]);
            t1 = feeder?.completed ? feeder.winner : (next.get(gameFeeders[0]) || "");
            if (t1) s1 = getTeamSeed(data.picks, t1);
          }
          if (!t2 && gameFeeders[1]) {
            const feeder = gMap.get(gameFeeders[1]);
            t2 = feeder?.completed ? feeder.winner : (next.get(gameFeeders[1]) || "");
            if (t2) s2 = getTeamSeed(data.picks, t2);
          }
        }

        if (t1 && t2) {
          let winner: string;
          if (s1 === s2) {
            winner = mode === "favorites" ? (t1 < t2 ? t1 : t2) : (t1 > t2 ? t1 : t2);
          } else {
            winner = mode === "favorites" ? (s1 <= s2 ? t1 : t2) : (s1 > s2 ? t1 : t2);
          }
          next.set(g.game_id, winner);
        }
      }
    }
    setSelections(next);
  }

  /**
   * Deterministically fill all rounds with favorites or underdogs.
   * Replaces all selections.
   */
  function fillAllRounds(mode: "favorites" | "underdogs") {
    if (!data) return;
    const next = new Map<string, string>();

    // Build a map of game_id → game for quick lookup
    const gMap = new Map(data.games.map((g) => [g.game_id, g]));

    for (const round of ROUND_ORDER) {
      const roundGames = data.games.filter((g) => g.round === round);
      for (const g of roundGames) {
        if (g.completed) continue; // skip completed games

        // Resolve teams: from game data, or from completed feeders, or from our picks in `next`
        let t1 = g.team1;
        let s1 = g.seed1;
        let t2 = g.team2;
        let s2 = g.seed2;

        if (!t1 || !t2) {
          const gameFeeders = feeders.get(g.game_id) || [];
          if (!t1 && gameFeeders[0]) {
            const feeder = gMap.get(gameFeeders[0]);
            t1 = feeder?.completed ? feeder.winner : (next.get(gameFeeders[0]) || "");
            if (t1) s1 = getTeamSeed(data.picks, t1);
          }
          if (!t2 && gameFeeders[1]) {
            const feeder = gMap.get(gameFeeders[1]);
            t2 = feeder?.completed ? feeder.winner : (next.get(gameFeeders[1]) || "");
            if (t2) s2 = getTeamSeed(data.picks, t2);
          }
        }

        if (t1 && t2) {
          let winner: string;
          if (s1 === s2) {
            // Same seed tiebreak: alphabetical (deterministic)
            winner = mode === "favorites"
              ? (t1 < t2 ? t1 : t2)
              : (t1 > t2 ? t1 : t2);
          } else {
            winner = mode === "favorites"
              ? (s1 <= s2 ? t1 : t2)  // lower seed = favorite
              : (s1 > s2 ? t1 : t2);  // higher seed = underdog
          }
          next.set(g.game_id, winner);
        }
      }
    }
    setSelections(next);
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

      <div className="relative z-50 space-y-2">
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={() => fillAllRounds("favorites")}
            className="rounded-card bg-surface-container px-4 py-2 text-sm font-label text-on-surface-variant hover:text-on-surface transition-colors"
          >
            All favorites
          </button>
          <button
            onClick={() => fillAllRounds("underdogs")}
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
        {(() => {
          const allFilled = selections.size >= totalPending;
          const nonePicked = selections.size === 0;
          const disabled = nonePicked || allFilled;
          const tooltip = nonePicked
            ? "Pick at least one game first"
            : allFilled
              ? "All games are already picked"
              : "Fill remaining unpicked games";
          return (
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-[10px] text-on-surface-variant">Fill remaining:</span>
              <button
                onClick={() => fillRemaining("favorites")}
                disabled={disabled}
                title={tooltip}
                className={`rounded-card px-3 py-1.5 text-xs font-label transition-colors border border-outline ${
                  disabled
                    ? "opacity-30 cursor-not-allowed text-on-surface-variant"
                    : "bg-surface-bright text-on-surface-variant hover:text-on-surface"
                }`}
              >
                + Chalk the rest
              </button>
              <button
                onClick={() => fillRemaining("underdogs")}
                disabled={disabled}
                title={tooltip}
                className={`rounded-card px-3 py-1.5 text-xs font-label transition-colors border border-outline ${
                  disabled
                    ? "opacity-30 cursor-not-allowed text-on-surface-variant"
                    : "bg-surface-bright text-on-surface-variant hover:text-on-surface"
                }`}
              >
                + Upset the rest
              </button>
            </div>
          );
        })()}
        <p className="text-[10px] text-on-surface-variant">
          Favorites = lower seed wins. Same seed tiebreak: alphabetical.
        </p>
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
                  <span className="font-label text-xs uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                    <span className="w-4 text-center text-sm leading-none">{isCollapsed ? "+" : "\u2212"}</span> {ROUND_LABELS[round as keyof typeof ROUND_LABELS]}
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
                                {teamLogos[g.team1] && <img src={teamLogos[g.team1]} alt="" className="w-5 h-5 inline-block rounded-full bg-on-surface/10 p-[2px]" style={{ filter: "drop-shadow(0 0 1px rgba(255,255,255,0.3))" }} />}
                                {g.seed1} {g.team1}{g.winner === g.team1 && " \u2713"}
                              </span>
                              <span className="text-[10px] text-on-surface-variant">vs</span>
                              <span className={`flex-1 rounded-card px-2 py-1.5 text-xs font-label inline-flex items-center gap-1 ${g.winner === g.team2 ? "bg-secondary/10 text-secondary" : "text-on-surface-variant"}`}>
                                {teamLogos[g.team2] && <img src={teamLogos[g.team2]} alt="" className="w-5 h-5 inline-block rounded-full bg-on-surface/10 p-[2px]" style={{ filter: "drop-shadow(0 0 1px rgba(255,255,255,0.3))" }} />}
                                {g.seed2} {g.team2}{g.winner === g.team2 && " \u2713"}
                              </span>
                              {g.espn_url && (
                                <a
                                  href={g.espn_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[9px] font-label text-on-surface-variant/50 hover:text-primary transition-colors shrink-0"
                                  title="View on ESPN"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  ESPN ↗
                                </a>
                              )}
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
                                {teamLogos[g.team1] && <img src={teamLogos[g.team1]} alt="" className="w-5 h-5 inline-block rounded-full bg-on-surface/10 p-[2px]" style={{ filter: "drop-shadow(0 0 1px rgba(255,255,255,0.3))" }} />}
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
                                {teamLogos[g.team2] && <img src={teamLogos[g.team2]} alt="" className="w-5 h-5 inline-block rounded-full bg-on-surface/10 p-[2px]" style={{ filter: "drop-shadow(0 0 1px rgba(255,255,255,0.3))" }} />}
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
                              {g.team1 ? <>{teamLogos[g.team1] && <img src={teamLogos[g.team1]} alt="" className="w-5 h-5 inline-block rounded-full bg-on-surface/10 p-[2px]" style={{ filter: "drop-shadow(0 0 1px rgba(255,255,255,0.3))" }} />}{g.seed1} {g.team1}</> : "TBD"}
                            </span>
                            <span className="text-[10px] text-on-surface-variant/40">vs</span>
                            <span className="flex-1 text-center text-xs font-label text-on-surface-variant/40 inline-flex items-center justify-center gap-1">
                              {g.team2 ? <>{teamLogos[g.team2] && <img src={teamLogos[g.team2]} alt="" className="w-5 h-5 inline-block rounded-full bg-on-surface/10 p-[2px]" style={{ filter: "drop-shadow(0 0 1px rgba(255,255,255,0.3))" }} />}{g.seed2} {g.team2}</> : "TBD"}
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
          <p className="hidden sm:block text-xs text-on-surface-variant">
            Click any row to see details &middot; Hover any row to compare brackets
          </p>
          <p className="sm:hidden text-xs text-on-surface-variant">
            Tap any row for details &middot; Tap &#9675; to compare brackets
          </p>
          <div className="w-full sm:w-72">
            <MultiSelectSearch
              mode="multi"
              label="Brackets"
              options={bracketOptions}
              selected={simSearch}
              onSelectedChange={setSimSearch}
              placeholder="Search brackets..."
            />
          </div>
          {simSearch.length > 0 && (
            <p className="text-xs text-on-surface-variant">
              Showing {filteredSimResults.length} of {simResults.length} brackets
            </p>
          )}

          {simResults.length === 0 ? (
            <div className="rounded-card bg-surface-container p-8 text-center">
              <p className="text-on-surface-variant text-sm">
                Select game winners to see the projected standings impact.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-card bg-surface-container max-h-[calc(100vh-14rem)] overflow-y-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead className="sticky top-0 bg-surface-container z-10">
                  <tr className="border-b border-outline">
                    <th className="w-8"></th>
                    <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant cursor-default">Rank</th>
                    <th className="sticky left-0 bg-surface-container px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant cursor-default">Bracket</th>
                    <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant cursor-default"><span className="inline-flex items-center gap-1"><span className="text-sm">🏆</span>Champion</span></th>
                    <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant cursor-default">Change</th>
                    <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant cursor-default">Pts</th>
                    <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant cursor-default">Sim Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSimResults.map((r) => {
                    const delta = r.baseRank - r.simRank;
                    const isExpanded = expandedId === r.id;
                    const path = pathMap.get(r.id);
                    return (
                      <>
                        <tr
                          key={r.id}
                          className={`group border-b border-outline transition-colors cursor-pointer ${isExpanded ? "bg-surface-bright" : "hover:bg-surface-bright"} ${isMyBracket(r.id) ? "bg-secondary/5 border-l-2 border-l-secondary" : ""}`}
                          onClick={() => setExpandedId(isExpanded ? null : r.id)}
                        >
                          <td className="w-8 px-1 py-2"><CompareCheckbox bracketId={r.id} /></td>
                          <td className="px-3 py-2 font-label">{r.simRank}</td>
                          <td className={`sticky left-0 z-10 transition-colors ${isMyBracket(r.id) ? "bg-secondary/5" : isExpanded ? "bg-surface-bright" : "bg-surface-container group-hover:bg-surface-bright"} px-3 py-2`}>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm text-on-surface-variant/60 w-4 text-center font-label leading-none">{isExpanded ? "\u2212" : "+"}</span>
                              <div>
                                <div className="font-semibold text-on-surface text-xs">{r.name}</div>
                                {r.full_name && r.full_name !== r.name && <div className="text-[10px] text-on-surface-variant">{r.full_name}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {(() => {
                              const bracket = bracketById.get(r.id);
                              if (!bracket) return null;
                              return <TeamPill name={bracket.champion_pick} seed={bracket.champion_seed} logo={teamLogos[bracket.champion_pick]} eliminated={eliminatedTeamsSet.has(bracket.champion_pick)} showStatus />;
                            })()}
                          </td>
                          <td className="px-3 py-2 font-label">
                            {delta > 0 && <span className="text-secondary">+{delta}</span>}
                            {delta === 0 && <span className="text-on-surface-variant">&mdash;</span>}
                            {delta < 0 && <span className="text-on-surface-variant">{delta}</span>}
                          </td>
                          <td className="px-3 py-2 font-label text-on-surface-variant">{r.basePoints}</td>
                          <td className="px-3 py-2 font-label text-on-surface">{r.simPoints}</td>
                        </tr>
                        {isExpanded && path && (
                          <tr key={`${r.id}-path`}>
                            <td colSpan={7} className="px-4 py-3 bg-surface-bright/50">
                              <div className="space-y-2">
                                <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant">
                                  Path to victory — {path.remainingPicks.length} alive picks remaining
                                  {path.eliminatedPickCount > 0 && (
                                    <span className="ml-2 text-on-surface-variant/50">({path.eliminatedPickCount} eliminated)</span>
                                  )}
                                </p>
                                {path.remainingPicks.length === 0 ? (
                                  <p className="text-xs text-on-surface-variant italic">No remaining picks with alive teams</p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {(["R32", "S16", "E8", "FF", "CHAMP"] as const).map((round) => {
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
                        )}
                      </>
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
