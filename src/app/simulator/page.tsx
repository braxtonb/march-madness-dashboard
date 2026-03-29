/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { DashboardData, Game, Pick, Round, Bracket } from "@/lib/types";
import { ROUND_POINTS, ROUND_LABELS, ROUND_ORDER } from "@/lib/constants";
import MultiSelectSearch from "@/components/ui/MultiSelectSearch";
import type { MultiSelectOption } from "@/components/ui/MultiSelectSearch";
import { CHAMPION_GROUPS } from "@/components/ui/MultiSelectSearch";
import CompareCheckbox from "@/components/ui/CompareCheckbox";
import { TeamPill } from "@/components/ui/TeamPill";
import { useMyBracket } from "@/components/ui/MyBracketProvider";
import { Skeleton } from "@/components/ui/Skeleton";
import { ViewBracketLink } from "@/components/ui/ViewBracketLink";

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

// --- Deep link helpers for simulator picks ---
function encodePicks(picks: Map<string, string>, games: Game[]): string {
  const parts: string[] = [];
  games.forEach((g, i) => {
    const winner = picks.get(g.game_id);
    if (winner) {
      parts.push(`${i}:${winner === g.team1 ? 1 : 2}`);
    }
  });
  return parts.length > 0 ? `picks=${parts.join(",")}` : "";
}

function decodePicks(hash: string, games: Game[]): Map<string, string> {
  const picks = new Map<string, string>();
  const match = hash.match(/picks=([^&]+)/);
  if (!match) return picks;
  for (const part of match[1].split(",")) {
    const [gi, ti] = part.split(":").map(Number);
    const game = games[gi];
    if (game) {
      picks.set(game.game_id, ti === 1 ? game.team1 : game.team2);
    }
  }
  return picks;
}

function parseHashParams(hash: string): URLSearchParams {
  const stripped = hash.startsWith("#") ? hash.slice(1) : hash;
  return new URLSearchParams(stripped);
}

function updateHash(params: URLSearchParams) {
  const str = params.toString();
  window.location.hash = str ? `#${str}` : "";
}

interface SimResult {
  id: string;
  name: string;
  owner: string;
  full_name: string;
  champion: string;
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
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  // simResults is now a useMemo, not useState — see below
  const [collapsedRounds, setCollapsedRounds] = useState<Set<string>>(new Set());
  const [simSearch, setSimSearch] = useState<string[]>([]);
  const [simChampionFilter, setSimChampionFilter] = useState<string[]>([]);
  const [bestCaseBracketId, setBestCaseBracketId] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Impact table sort state (from hash)
  type ImpactSort = "simRank" | "simPoints" | "basePoints" | "delta";
  const VALID_IMPACT_SORTS: ImpactSort[] = ["simRank", "simPoints", "basePoints", "delta"];
  const [impactSortKey, setImpactSortKey] = useState<ImpactSort>("simRank");
  const [impactSortAsc, setImpactSortAsc] = useState(true);
  useEffect(() => {
    const hp = parseHashParams(window.location.hash);
    const s = hp.get("isort") as ImpactSort | null;
    if (s && VALID_IMPACT_SORTS.includes(s)) setImpactSortKey(s);
    const d = hp.get("idir");
    if (d === "desc") setImpactSortAsc(false);
    else if (d === "asc") setImpactSortAsc(true);
  }, []);

  // Flag to track hash restoration status:
  // "pending" = haven't tried yet, "done" = restored (or nothing to restore)
  const hashRestoreRef = useRef<"pending" | "done">("pending");

  // Save the initial hash before any effects can modify it
  const initialHashRef = useRef(typeof window !== "undefined" ? window.location.hash : "");

  useEffect(() => {
    fetch("/api/data")
      .then((r) => r.json())
      .then((d: DashboardData) => {
        // Check for scenario deep link (e.g., #scenario=favorites)
        const hp = parseHashParams(window.location.hash);
        const scenario = hp.get("scenario");

        if (scenario && scenario.startsWith("bracket:")) {
          // Best-case scenario for a specific bracket — cascade round-by-round
          const bracketId = scenario.slice("bracket:".length);
          const bracketPicks = d.picks.filter((p) => p.bracket_id === bracketId);
          const pickMap = new Map(bracketPicks.map((p) => [p.game_id, p.team_picked]));
          const chain = buildGameChain(d.picks, d.games);
          const fds = buildFeeders(chain);
          const gMap = new Map(d.games.map((g) => [g.game_id, g]));
          // Future value per team for fallback selection
          const teamFV = new Map<string, number>();
          for (const p of bracketPicks) {
            const pg = gMap.get(p.game_id);
            if (pg && !pg.completed && p.team_picked) {
              teamFV.set(p.team_picked, (teamFV.get(p.team_picked) || 0) + (ROUND_POINTS[pg.round as keyof typeof ROUND_POINTS] || 0));
            }
          }
          const next = new Map<string, string>();
          for (const round of ROUND_ORDER) {
            for (const g of d.games.filter((g) => g.round === round)) {
              if (g.completed) continue;
              let t1 = g.team1, t2 = g.team2;
              if (!t1 || !t2) {
                const gameFeeders = fds.get(g.game_id) || [];
                if (!t1 && gameFeeders[0]) {
                  const feeder = gMap.get(gameFeeders[0]);
                  t1 = feeder?.completed ? feeder.winner : (next.get(gameFeeders[0]) || "");
                }
                if (!t2 && gameFeeders[1]) {
                  const feeder = gMap.get(gameFeeders[1]);
                  t2 = feeder?.completed ? feeder.winner : (next.get(gameFeeders[1]) || "");
                }
              }
              if (t1 && t2) {
                const picked = pickMap.get(g.game_id);
                if (picked === t1 || picked === t2) {
                  next.set(g.game_id, picked);
                } else {
                  next.set(g.game_id, (teamFV.get(t1) || 0) >= (teamFV.get(t2) || 0) ? t1 : t2);
                }
              }
            }
          }
          setSelections(next);
          setActiveScenario(scenario);
          setBestCaseBracketId(bracketId);
          hashRestoreRef.current = "done";
        } else if (scenario === "favorites" || scenario === "underdogs") {
          // Apply scenario inline with fresh data — no closure issues
          const chain = buildGameChain(d.picks, d.games);
          const fds = buildFeeders(chain);
          const gMap = new Map(d.games.map((g) => [g.game_id, g]));
          const next = new Map<string, string>();
          for (const round of ROUND_ORDER) {
            for (const g of d.games.filter((g) => g.round === round)) {
              if (g.completed) continue;
              let t1 = g.team1, s1 = g.seed1, t2 = g.team2, s2 = g.seed2;
              if (!t1 || !t2) {
                const gameFeeders = fds.get(g.game_id) || [];
                if (!t1 && gameFeeders[0]) {
                  const feeder = gMap.get(gameFeeders[0]);
                  t1 = feeder?.completed ? feeder.winner : (next.get(gameFeeders[0]) || "");
                  if (t1) s1 = getTeamSeed(d.picks, t1);
                }
                if (!t2 && gameFeeders[1]) {
                  const feeder = gMap.get(gameFeeders[1]);
                  t2 = feeder?.completed ? feeder.winner : (next.get(gameFeeders[1]) || "");
                  if (t2) s2 = getTeamSeed(d.picks, t2);
                }
              }
              if (t1 && t2) {
                const winner = s1 === s2
                  ? (scenario === "favorites" ? (t1 < t2 ? t1 : t2) : (t1 > t2 ? t1 : t2))
                  : (scenario === "favorites" ? (s1 <= s2 ? t1 : t2) : (s1 > s2 ? t1 : t2));
                next.set(g.game_id, winner);
              }
            }
          }
          setSelections(next);
          setActiveScenario(scenario);
          hashRestoreRef.current = "done";
        } else if (hashRestoreRef.current === "pending") {
          // Restore picks from hash (non-scenario case)
          hashRestoreRef.current = "done";
          const hash = initialHashRef.current;
          if (hash) {
            const restored = decodePicks(hash, d.games);
            if (restored.size > 0) {
              setSelections(restored);
            }
          }
        }

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

  // Compute sim results synchronously as a memo — no useEffect flicker
  const simResults = useMemo((): SimResult[] => {
    if (!data) return [];
    const picksByBracket = new Map<string, Map<string, string>>();
    for (const p of data.picks) {
      if (!picksByBracket.has(p.bracket_id)) picksByBracket.set(p.bracket_id, new Map());
      picksByBracket.get(p.bracket_id)!.set(p.game_id, p.team_picked);
    }

    const scored = data.brackets.map((b) => {
      const bPicks = picksByBracket.get(b.id);
      let bonus = 0;
      if (bPicks) {
        for (const [gameId, winner] of selections) {
          const picked = bPicks.get(gameId);
          const game = data.games.find((g) => g.game_id === gameId);
          if (picked === winner && game) {
            bonus += ROUND_POINTS[game.round as keyof typeof ROUND_POINTS] || 0;
          }
        }
      }
      const cappedBonus = Math.min(bonus, b.max_remaining);
      return { id: b.id, name: b.name, owner: b.owner, full_name: b.full_name, champion: b.champion_pick, basePoints: b.points, simPoints: b.points + cappedBonus };
    });

    const baseRanked = [...data.brackets].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.max_remaining !== a.max_remaining) return b.max_remaining - a.max_remaining;
      return a.name.localeCompare(b.name);
    });
    const baseRankMap = new Map<string, number>();
    for (let i = 0; i < baseRanked.length; i++) {
      if (i === 0) { baseRankMap.set(baseRanked[i].id, 1); }
      else if (baseRanked[i].points === baseRanked[i - 1].points && baseRanked[i].max_remaining === baseRanked[i - 1].max_remaining) {
        baseRankMap.set(baseRanked[i].id, baseRankMap.get(baseRanked[i - 1].id)!);
      } else { baseRankMap.set(baseRanked[i].id, i + 1); }
    }

    // Build a max_remaining lookup for tiebreaking
    const maxRemainingMap = new Map(data.brackets.map((b) => [b.id, b.max_remaining]));

    const simRanked = [...scored].sort((a, b) => {
      if (b.simPoints !== a.simPoints) return b.simPoints - a.simPoints;
      const aMax = maxRemainingMap.get(a.id) || 0;
      const bMax = maxRemainingMap.get(b.id) || 0;
      if (bMax !== aMax) return bMax - aMax;
      return a.name.localeCompare(b.name);
    });
    const simRankList: number[] = [];
    for (let i = 0; i < simRanked.length; i++) {
      if (i === 0) { simRankList.push(1); }
      else if (simRanked[i].simPoints === simRanked[i - 1].simPoints && (maxRemainingMap.get(simRanked[i].id) || 0) === (maxRemainingMap.get(simRanked[i - 1].id) || 0)) { simRankList.push(simRankList[i - 1]); }
      else { simRankList.push(i + 1); }
    }

    return simRanked.map((s, i) => ({
      ...s,
      baseRank: baseRankMap.get(s.id) || 0,
      simRank: simRankList[i],
    }));
  }, [data, selections]);

  const simChampionOptions: MultiSelectOption[] = useMemo(() => {
    const champSeeds = new Map<string, number>();
    for (const r of simResults) if (r.champion) champSeeds.set(r.champion, 0);
    // Get seeds from brackets
    for (const b of (data?.brackets || [])) if (b.champion_pick && champSeeds.has(b.champion_pick)) champSeeds.set(b.champion_pick, b.champion_seed || 0);
    const elimList: string[] = data?.derived?.eliminated_teams || [];
    const elim = new Set(elimList);
    const logos: Record<string, string> = data?.derived?.team_logos || {};
    return [...champSeeds.entries()]
      .sort((a, b) => {
        const aAlive = !elim.has(a[0]);
        const bAlive = !elim.has(b[0]);
        if (aAlive !== bAlive) return aAlive ? -1 : 1;
        return a[0].localeCompare(b[0]);
      })
      .map(([c, seed]) => ({ value: c, label: c, logo: logos[c], seed, eliminated: elim.has(c), group: elim.has(c) ? "eliminated" : "alive" }));
  }, [simResults, data]);

  // Filter and sort sim results
  const filteredSimResults = useMemo(() => {
    let list = simSearch.length === 0 ? simResults : simResults.filter((r) => new Set(simSearch).has(r.id));
    if (simChampionFilter.length > 0) {
      const champSet = new Set(simChampionFilter);
      list = list.filter((r) => champSet.has(r.champion));
    }
    return [...list].sort((a, b) => {
      let aVal: number, bVal: number;
      switch (impactSortKey) {
        case "simRank": aVal = a.simRank; bVal = b.simRank; break;
        case "simPoints": aVal = a.simPoints; bVal = b.simPoints; break;
        case "basePoints": aVal = a.basePoints; bVal = b.basePoints; break;
        case "delta": aVal = a.baseRank - a.simRank; bVal = b.baseRank - b.simRank; break;
        default: aVal = a.simRank; bVal = b.simRank;
      }
      return impactSortAsc ? aVal - bVal : bVal - aVal;
    });
  }, [simResults, simSearch, simChampionFilter, impactSortKey, impactSortAsc]);

  // Pinned row rendered separately — not part of the sorted list to avoid flicker
  const pinnedResult = bestCaseBracketId ? filteredSimResults.find((r) => r.id === bestCaseBracketId) : null;

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
    // Use canonical ROUND_POINTS from constants
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
          pts: ROUND_POINTS[p.round as keyof typeof ROUND_POINTS] || 0,
          logo: logos[p.team_picked] || "",
        }));
      const eliminatedPickCount = bPicks
        .filter((p) => !completedGameIds.has(p.game_id) && p.team_picked && eliminatedTeams.has(p.team_picked))
        .length;
      map.set(b.id, { remainingPicks, eliminatedPickCount });
    }
    return map;
  }, [data]);

  // Sync selections to URL hash (only after initial restore is complete)
  useEffect(() => {
    if (!data || hashRestoreRef.current !== "done") return;
    const hp = parseHashParams(window.location.hash);
    if (activeScenario) {
      // Scenario mode: clean URL with just the scenario name
      hp.delete("picks");
      hp.set("scenario", activeScenario);
    } else {
      // Custom picks mode: encode individual picks
      hp.delete("scenario");
      const picksStr = encodePicks(selections, data.games);
      if (picksStr) {
        const match = picksStr.match(/picks=(.+)/);
        if (match) hp.set("picks", match[1]);
      } else {
        hp.delete("picks");
      }
    }
    updateHash(hp);
  }, [selections, data, activeScenario]);

  // Toggle a winner selection (clears scenario since it's a custom pick)
  function toggleWinner(gameId: string, team: string) {
    setActiveScenario(null);
    setBestCaseBracketId("");
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
    setActiveScenario(null);
    setBestCaseBracketId("");
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
    setActiveScenario(mode);
    setBestCaseBracketId("");
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

  /**
   * Fill all incomplete games with a specific bracket's picks — their best-case scenario.
   * Processes round-by-round with cascading so only valid (alive) teams are selected.
   * When the bracket's pick was eliminated, chooses the team that appears more often
   * in the bracket's future picks (maximizing downstream correct picks).
   */
  function fillBracketBestCase(bracketId: string) {
    if (!data) return;
    setActiveScenario(`bracket:${bracketId}`);
    const bracketPicks = data.picks.filter((p) => p.bracket_id === bracketId);
    const pickMap = new Map(bracketPicks.map((p) => [p.game_id, p.team_picked]));
    const gMap = new Map(data.games.map((g) => [g.game_id, g]));
    const next = new Map<string, string>();

    // Count how many future picks each team appears in for this bracket
    const teamFutureValue = new Map<string, number>();
    for (const p of bracketPicks) {
      const g = gMap.get(p.game_id);
      if (g && !g.completed && p.team_picked) {
        teamFutureValue.set(
          p.team_picked,
          (teamFutureValue.get(p.team_picked) || 0) + (ROUND_POINTS[g.round as keyof typeof ROUND_POINTS] || 0)
        );
      }
    }

    for (const round of ROUND_ORDER) {
      for (const g of data.games.filter((g) => g.round === round)) {
        if (g.completed) continue;

        // Resolve teams from game data or from feeders/previous picks
        let t1 = g.team1, t2 = g.team2;
        if (!t1 || !t2) {
          const gameFeeders = feeders.get(g.game_id) || [];
          if (!t1 && gameFeeders[0]) {
            const feeder = gMap.get(gameFeeders[0]);
            t1 = feeder?.completed ? feeder.winner : (next.get(gameFeeders[0]) || "");
          }
          if (!t2 && gameFeeders[1]) {
            const feeder = gMap.get(gameFeeders[1]);
            t2 = feeder?.completed ? feeder.winner : (next.get(gameFeeders[1]) || "");
          }
        }

        if (t1 && t2) {
          const picked = pickMap.get(g.game_id);
          if (picked === t1 || picked === t2) {
            // Bracket's pick is in this game — use it
            next.set(g.game_id, picked);
          } else {
            // Bracket's pick was eliminated — choose the team with more future value
            const v1 = teamFutureValue.get(t1) || 0;
            const v2 = teamFutureValue.get(t2) || 0;
            next.set(g.game_id, v1 >= v2 ? t1 : t2);
          }
        }
      }
    }
    setSelections(next);
  }

  function toggleImpactSort(key: ImpactSort) {
    const newAsc = impactSortKey === key ? !impactSortAsc : key === "simRank";
    setImpactSortKey(key);
    setImpactSortAsc(newAsc);
    const hp = parseHashParams(window.location.hash);
    hp.set("isort", key);
    hp.set("idir", newAsc ? "asc" : "desc");
    updateHash(hp);
  }

  const impactSortIcon = (key: ImpactSort) => {
    const active = impactSortKey === key;
    const direction = active ? (impactSortAsc ? "asc" : "desc") : "neutral";
    return <SortIcon direction={direction} active={active} />;
  };

  function toggleRoundCollapse(round: string) {
    setCollapsedRounds((prev) => {
      const next = new Set(prev);
      if (next.has(round)) next.delete(round);
      else next.add(round);
      return next;
    });
  }

  // Bracket options for "Best Case" selector (must be before early return)
  const bestCaseOptions: MultiSelectOption[] = useMemo(() => {
    if (!data) return [];
    return data.brackets.map((b) => ({
      value: b.id,
      label: b.name,
      sublabel: b.full_name && b.full_name !== b.name ? b.full_name : undefined,
    }));
  }, [data]);

  if (!data) {
    return (
      <div className="space-y-section">
        {/* Title + description */}
        <div>
          <h2 className="font-display text-2xl font-bold">Scenario Simulator</h2>
          <Skeleton className="h-4 w-64 mt-1" />
        </div>

        {/* Action buttons row */}
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-28 rounded-card" />
            ))}
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-28 rounded-card" />
            <Skeleton className="h-7 w-28 rounded-card" />
          </div>
        </div>

        {/* Two-column layout matching actual grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-section lg:items-start">
          {/* Left: game picker (takes 2 cols) */}
          <div className="lg:col-span-2 space-y-2">
            {Array.from({ length: 3 }).map((_, r) => (
              <div key={r} className="space-y-1.5">
                <Skeleton className="h-5 w-32" />
                <div className="space-y-1.5">
                  {Array.from({ length: 4 }).map((_, g) => (
                    <Skeleton key={g} className="h-12 rounded-card" />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Right: impact table (takes 3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-48" />
            <div className="rounded-card bg-surface-container p-4 space-y-3">
              {/* Table header */}
              <div className="flex gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 flex-1" />
                ))}
              </div>
              {/* Table rows */}
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  {Array.from({ length: 6 }).map((_, c) => (
                    <Skeleton key={c} className="h-8 flex-1" />
                  ))}
                </div>
              ))}
            </div>
          </div>
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

      {/* Sticky preset bar */}
      <div className="sticky top-[52px] z-50 bg-surface/95 backdrop-blur-sm py-2 border-b border-on-surface-variant/10 -mx-4 px-4 sm:-mx-6 sm:px-6 space-y-2">
        <div className="flex gap-3 flex-wrap items-center">
          <div className="w-full sm:w-48 [&_input]:text-xs [&_input]:py-1">
            <MultiSelectSearch
              mode="single"
              label="Brackets"
              options={bestCaseOptions}
              selectedId={bestCaseBracketId}
              onSelect={(id) => {
                setBestCaseBracketId(id);
                fillBracketBestCase(id);
              }}
              onClear={() => {
                setBestCaseBracketId("");
                setSelections(new Map());
                setActiveScenario(null);
              }}
              placeholder="Path to Victory..."
            />
          </div>
          <button
            onClick={() => fillAllRounds("favorites")}
            className="rounded-card bg-surface-container px-3 py-1.5 text-xs font-label text-on-surface-variant hover:text-on-surface transition-colors"
          >
            All favorites
          </button>
          <button
            onClick={() => fillAllRounds("underdogs")}
            className="rounded-card bg-surface-container px-3 py-1.5 text-xs font-label text-on-surface-variant hover:text-on-surface transition-colors"
          >
            All underdogs
          </button>
          {(() => {
            const allFilled = selections.size >= totalPending;
            const nonePicked = selections.size === 0;
            const disabled = nonePicked || allFilled;
            return (
              <>
                <button
                  onClick={() => fillRemaining("favorites")}
                  disabled={disabled}
                  className={`rounded-card bg-surface-container px-3 py-1.5 text-xs font-label transition-colors ${disabled ? "opacity-30 cursor-not-allowed text-on-surface-variant" : "text-on-surface-variant hover:text-on-surface"}`}
                >
                  + Chalk rest
                </button>
                <button
                  onClick={() => fillRemaining("underdogs")}
                  disabled={disabled}
                  className={`rounded-card bg-surface-container px-3 py-1.5 text-xs font-label transition-colors ${disabled ? "opacity-30 cursor-not-allowed text-on-surface-variant" : "text-on-surface-variant hover:text-on-surface"}`}
                >
                  + Upset rest
                </button>
              </>
            );
          })()}
          <button
            onClick={() => { setSelections(new Map()); setActiveScenario(null); setBestCaseBracketId(""); }}
            className="rounded-card bg-surface-container px-3 py-1.5 text-xs font-label text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Clear
          </button>
          <p className="text-[10px] text-on-surface-variant leading-relaxed">
            <span className="text-primary font-semibold">Path to Victory</span> simulates every remaining game in a bracket&apos;s favor. When their predicted team is still alive, it wins. When eliminated, the team with the most value to the bracket advances instead.
          </p>
        </div>
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
                  <span className="flex items-center gap-2">
                    <span className="text-sm text-on-surface-variant/60 w-4 text-center font-label leading-none shrink-0">{isCollapsed ? "+" : "\u2212"}</span>
                    <span className="font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{ROUND_LABELS[round as keyof typeof ROUND_LABELS]}</span>
                  </span>
                  <span className="font-label text-[10px] text-on-surface-variant">
                    {completedCount === games.length
                      ? "Complete"
                      : `${selectedCount}/${pendingCount} picked`}
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="space-y-0.5 pb-1">
                    {games.map((g) => {
                      const hasBothTeams = Boolean(g.team1 && g.team2);

                      if (g.completed) {
                        return (
                          <div key={g.game_id} className="flex items-center gap-1.5 py-1 px-1 opacity-50">
                            <span className={`flex-1 rounded px-1.5 py-1 text-[11px] font-label inline-flex items-center gap-1 ${g.winner === g.team1 ? "bg-secondary/10 text-secondary" : "text-on-surface-variant"}`}>
                              {teamLogos[g.team1] && <img src={teamLogos[g.team1]} alt="" className="w-4 h-4 inline-block rounded-full bg-on-surface/10 p-[1px]" />}
                              <span className="text-on-surface-variant/60">{g.seed1}</span> {g.team1}{g.winner === g.team1 && " \u2713"}
                            </span>
                            <span className="text-[9px] text-on-surface-variant shrink-0">vs</span>
                            <span className={`flex-1 rounded px-1.5 py-1 text-[11px] font-label inline-flex items-center gap-1 ${g.winner === g.team2 ? "bg-secondary/10 text-secondary" : "text-on-surface-variant"}`}>
                              {teamLogos[g.team2] && <img src={teamLogos[g.team2]} alt="" className="w-4 h-4 inline-block rounded-full bg-on-surface/10 p-[1px]" />}
                              <span className="text-on-surface-variant/60">{g.seed2}</span> {g.team2}{g.winner === g.team2 && " \u2713"}
                            </span>
                            {g.espn_url && (
                              <a href={g.espn_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[8px] font-label text-on-surface-variant/40 hover:text-primary transition-colors shrink-0">ESPN</a>
                            )}
                          </div>
                        );
                      }

                      if (hasBothTeams) {
                        return (
                          <div key={g.game_id} className={`flex items-center gap-1.5 py-1 px-1 ${g.simulated ? "border-l-2 border-l-tertiary/40" : ""}`}>
                            <button
                              onClick={() => toggleWinner(g.game_id, g.team1)}
                              className={`flex-1 rounded px-1.5 py-1 text-[11px] font-label transition-colors inline-flex items-center gap-1 ${
                                selections.get(g.game_id) === g.team1
                                  ? "bg-secondary/20 text-secondary"
                                  : "bg-surface-bright text-on-surface-variant hover:text-on-surface"
                              }`}
                            >
                              {teamLogos[g.team1] && <img src={teamLogos[g.team1]} alt="" className="w-4 h-4 inline-block rounded-full bg-on-surface/10 p-[1px]" />}
                              <span className="text-on-surface-variant/60">{g.seed1}</span> {g.team1}
                            </button>
                            <span className="text-[9px] text-on-surface-variant shrink-0">vs</span>
                            <button
                              onClick={() => toggleWinner(g.game_id, g.team2)}
                              className={`flex-1 rounded px-1.5 py-1 text-[11px] font-label transition-colors inline-flex items-center gap-1 ${
                                selections.get(g.game_id) === g.team2
                                  ? "bg-secondary/20 text-secondary"
                                  : "bg-surface-bright text-on-surface-variant hover:text-on-surface"
                              }`}
                            >
                              {teamLogos[g.team2] && <img src={teamLogos[g.team2]} alt="" className="w-4 h-4 inline-block rounded-full bg-on-surface/10 p-[1px]" />}
                              <span className="text-on-surface-variant/60">{g.seed2}</span> {g.team2}
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div key={g.game_id} className="flex items-center gap-1.5 py-1 px-1 opacity-40">
                          <span className="flex-1 text-center text-[11px] font-label text-on-surface-variant/40 inline-flex items-center justify-center gap-1">
                            {g.team1 ? <>{teamLogos[g.team1] && <img src={teamLogos[g.team1]} alt="" className="w-4 h-4 inline-block rounded-full bg-on-surface/10 p-[1px]" />}{g.seed1} {g.team1}</> : "TBD"}
                          </span>
                          <span className="text-[9px] text-on-surface-variant/40 shrink-0">vs</span>
                          <span className="flex-1 text-center text-[11px] font-label text-on-surface-variant/40 inline-flex items-center justify-center gap-1">
                            {g.team2 ? <>{teamLogos[g.team2] && <img src={teamLogos[g.team2]} alt="" className="w-4 h-4 inline-block rounded-full bg-on-surface/10 p-[1px]" />}{g.seed2} {g.team2}</> : "TBD"}
                          </span>
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
          <div className="flex flex-wrap gap-3">
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
            <div className="w-full sm:w-56">
              <MultiSelectSearch
                mode="multi"
                label="Champions"
                options={simChampionOptions}
                selected={simChampionFilter}
                onSelectedChange={setSimChampionFilter}
                placeholder="Filter by champion..."
                groups={CHAMPION_GROUPS}
              />
            </div>
          </div>
          {(simSearch.length > 0 || simChampionFilter.length > 0) && (
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
                <thead className="sticky top-0 z-20 bg-surface-container">
                  <tr className="border-b border-outline">
                    <th className="w-8"></th>
                    <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant !cursor-pointer hover:text-on-surface select-none" title="Simulated rank based on your picks" onClick={() => toggleImpactSort("simRank")}><span className="border-b border-dotted border-on-surface-variant/40">Rank</span>{impactSortIcon("simRank")}</th>
                    <th className="sticky left-0 bg-surface-container px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant !cursor-default" title="Bracket name">Bracket</th>
                    <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant !cursor-default" title="Team selected to win the championship">Champion</th>
                    <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant !cursor-pointer hover:text-on-surface select-none" title="Change in rank from current to simulated" onClick={() => toggleImpactSort("delta")}><span className="border-b border-dotted border-on-surface-variant/40">Change</span>{impactSortIcon("delta")}</th>
                    <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant !cursor-pointer hover:text-on-surface select-none" title="Current total points" onClick={() => toggleImpactSort("basePoints")}><span className="border-b border-dotted border-on-surface-variant/40">Pts</span>{impactSortIcon("basePoints")}</th>
                    <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant !cursor-pointer hover:text-on-surface select-none" title="Simulated total points based on your picks" onClick={() => toggleImpactSort("simPoints")}><span className="border-b border-dotted border-on-surface-variant/40">Sim Pts</span>{impactSortIcon("simPoints")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(pinnedResult ? [pinnedResult, ...filteredSimResults.filter((r) => r.id !== bestCaseBracketId)] : filteredSimResults).map((r) => {
                    const delta = r.baseRank - r.simRank;
                    const isExpanded = expandedId === r.id;
                    const path = pathMap.get(r.id);
                    const isBestCase = r.id === bestCaseBracketId;
                    const rowBg = isMyBracket(r.id)
                      ? "bg-[#0f2e36] border-l-2 border-l-secondary"
                      : isBestCase
                        ? "bg-[#241a0a] border-l-2 border-l-primary"
                        : isExpanded ? "bg-surface-bright" : "hover:bg-surface-bright";
                    return (
                      <React.Fragment key={r.id}>
                        <tr
                          className={`group border-b border-outline transition-colors cursor-pointer ${rowBg}`}
                          onClick={() => setExpandedId(isExpanded ? null : r.id)}
                        >
                          <td className="w-8 px-1 py-2"><CompareCheckbox bracketId={r.id} /></td>
                          <td className="px-3 py-2 font-label">{r.simRank}</td>
                          <td className={`sticky left-0 z-10 transition-colors ${isMyBracket(r.id) ? "bg-[#0f2e36]" : isBestCase ? "bg-[#241a0a]" : isExpanded ? "bg-surface-bright" : "bg-surface-container group-hover:bg-surface-bright"} px-3 py-2`}>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm text-on-surface-variant/60 w-4 text-center font-label leading-none">{isExpanded ? "\u2212" : "+"}</span>
                              <div>
                                <div className="font-semibold text-on-surface text-xs flex items-center gap-1">
                                  {r.name}
                                  {isBestCase && (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0" aria-label="Pinned — best case scenario">
                                      <path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76z" />
                                    </svg>
                                  )}
                                </div>
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
                                <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant flex items-center gap-2 flex-wrap">
                                  <span>Path to victory — {path.remainingPicks.length} alive picks remaining
                                    {path.eliminatedPickCount > 0 && (
                                      <span className="ml-1 text-on-surface-variant/50">({path.eliminatedPickCount} eliminated)</span>
                                    )}
                                  </span>
                                  <ViewBracketLink bracketId={r.id} />
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
                      </React.Fragment>
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
