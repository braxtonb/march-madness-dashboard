"use client";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import type { Bracket, Pick, Game, BracketAnalytics, Round, AwardRound, Team } from "@/lib/types";
import { ROUND_LABELS, ROUND_ORDER } from "@/lib/constants";
import { TeamPill } from "@/components/ui/TeamPill";
import { GameHeader } from "@/components/ui/GameHeader";
import MultiSelectSearch from "@/components/ui/MultiSelectSearch";
import type { MultiSelectOption } from "@/components/ui/MultiSelectSearch";

type DiffFilter = "all" | "differences" | "agreement";
type StatusFilter = "all" | "completed" | "scheduled";

export function HeadToHeadContent({
  brackets,
  picks,
  games,
  analyticsObj,
  currentRound,
  teams,
}: {
  brackets: Bracket[];
  picks: Pick[];
  games: Game[];
  analyticsObj: Record<string, BracketAnalytics>;
  pickRatesObj: Record<string, Record<string, number>>;
  currentRound: Round;
  teams?: Team[];
}) {
  const searchParams = useSearchParams();

  const initialDiffFilter = (searchParams.get("filter") as DiffFilter) || "all";
  const initialStatusFilter = (searchParams.get("status") as StatusFilter) || "all";
  const initialRound: AwardRound = (() => {
    const param = searchParams.get("round");
    if (param === "ALL") return "ALL" as AwardRound;
    if (param && ROUND_ORDER.includes(param as Round)) return param as Round;
    return "ALL" as AwardRound;
  })();

  const paramB1 = searchParams.get("b1") ?? "";
  const paramB2 = searchParams.get("b2") ?? "";
  // If both URL params point to the same bracket, only pre-populate bracket 1
  const [id1, setId1] = useState(paramB1);
  const [id2, setId2] = useState(paramB1 && paramB1 === paramB2 ? "" : paramB2);
  const [diffFilter, setDiffFilter] = useState<DiffFilter>(
    ["all", "differences", "agreement"].includes(initialDiffFilter) ? initialDiffFilter : "all"
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    ["all", "completed", "scheduled"].includes(initialStatusFilter) ? initialStatusFilter : "all"
  );
  const [selectedRound, setSelectedRound] = useState<AwardRound>(initialRound);

  // Fix 7: Collapsible rounds for All Rounds view
  // Default: collapse all fully completed rounds (where every game in that round is finished)
  const fullyCompletedRounds = useMemo(() => {
    const set = new Set<string>();
    for (const round of ROUND_ORDER) {
      const roundGames = games.filter((g) => g.round === round);
      if (roundGames.length > 0 && roundGames.every((g) => g.completed)) {
        set.add(round);
      }
    }
    return set;
  }, [games]);

  const [collapsedRounds, setCollapsedRounds] = useState<Set<string>>(() => new Set(fullyCompletedRounds));

  const toggleRoundCollapse = useCallback((round: string) => {
    setCollapsedRounds((prev) => {
      const next = new Set(prev);
      if (next.has(round)) next.delete(round);
      else next.add(round);
      return next;
    });
  }, []);

  const updateUrl = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(window.location.search);
      params.set(key, value);
      window.history.replaceState(null, "", `?${params.toString()}`);
    },
    []
  );

  function changeDiffFilter(v: DiffFilter) {
    setDiffFilter(v);
    updateUrl("filter", v);
  }
  function changeStatusFilter(v: StatusFilter) {
    setStatusFilter(v);
    updateUrl("status", v);
  }
  function changeRound(v: AwardRound) {
    setSelectedRound(v);
    updateUrl("round", v);
  }

  // Build bracket options for MultiSelectSearch
  const bracketOptions: MultiSelectOption[] = useMemo(
    () => brackets.map((b) => ({
      value: b.id,
      label: b.name,
      sublabel: b.full_name && b.full_name !== b.name ? b.full_name : undefined,
    })),
    [brackets]
  );

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

  // Build team logo lookup
  const teamLogos: Record<string, string> = useMemo(() => {
    if (!teams) return {};
    return Object.fromEntries(teams.map((t) => [t.name, t.logo]));
  }, [teams]);

  // Compute per-bracket win percentage
  const winPct = (bracketId: string) => {
    const bPicks = picks.filter((p) => p.bracket_id === bracketId);
    const completedPicks = bPicks.filter((p) => {
      const game = games.find((g) => g.game_id === p.game_id);
      return game?.completed;
    });
    if (completedPicks.length === 0) return 0;
    const correct = completedPicks.filter((p) => p.correct).length;
    return Math.round((correct / completedPicks.length) * 100);
  };

  // Build game lookup for quick access
  const gameMap = useMemo(() => {
    return new Map(games.map((g) => [g.game_id, g]));
  }, [games]);

  // Team seed lookup from picks
  const teamSeeds = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of picks) {
      if (p.team_picked && p.seed_picked && !map.has(p.team_picked)) {
        map.set(p.team_picked, p.seed_picked);
      }
    }
    return map;
  }, [picks]);

  // Eliminated teams set
  const eliminatedTeams = useMemo(() => {
    const set = new Set<string>();
    for (const g of games) {
      if (g.completed && g.winner) {
        if (g.team1 && g.team1 !== g.winner) set.add(g.team1);
        if (g.team2 && g.team2 !== g.winner) set.add(g.team2);
      }
    }
    return set;
  }, [games]);

  const isAllRounds = selectedRound === "ALL";

  // Get unique game_ids from picks data for the selected round (fixes S16/E8 empty issue)
  const roundGameIds = useMemo(() => {
    const ids = new Set<string>();
    if (isAllRounds) {
      for (const p of picks) {
        if (p.bracket_id === id1 || p.bracket_id === id2) {
          ids.add(p.game_id);
        }
      }
      for (const g of games) {
        ids.add(g.game_id);
      }
    } else {
      for (const p of picks) {
        if (p.round === selectedRound && (p.bracket_id === id1 || p.bracket_id === id2)) {
          ids.add(p.game_id);
        }
      }
      for (const g of games) {
        if (g.round === selectedRound) {
          ids.add(g.game_id);
        }
      }
    }
    return [...ids].sort();
  }, [picks, games, selectedRound, id1, id2, isAllRounds]);

  // Compute per-round agreement/difference counts
  const roundStats = useMemo(() => {
    const stats: Record<string, { agree: number; diff: number; completed: number; scheduled: number; total: number }> = {};
    for (const round of ROUND_ORDER) {
      const ids = new Set<string>();
      for (const p of picks) {
        if (p.round === round && (p.bracket_id === id1 || p.bracket_id === id2)) ids.add(p.game_id);
      }
      for (const g of games) { if (g.round === round) ids.add(g.game_id); }
      let ag = 0, df = 0, comp = 0, sched = 0;
      for (const gid of ids) {
        const p1 = pickMap1.get(gid), p2 = pickMap2.get(gid);
        if (p1 === p2) ag++; else df++;
        const g = gameMap.get(gid);
        if (g?.completed) comp++; else sched++;
      }
      stats[round] = { agree: ag, diff: df, completed: comp, scheduled: sched, total: ids.size };
    }
    return stats;
  }, [picks, games, id1, id2, pickMap1, pickMap2, gameMap]);

  // Apply diff + status filter
  const filteredGameIds = useMemo(() => {
    return roundGameIds.filter((gid) => {
      const pick1 = pickMap1.get(gid);
      const pick2 = pickMap2.get(gid);
      const same = pick1 === pick2;
      if (diffFilter === "differences" && same) return false;
      if (diffFilter === "agreement" && !same) return false;
      const g = gameMap.get(gid);
      if (statusFilter === "completed" && !g?.completed) return false;
      if (statusFilter === "scheduled" && g?.completed) return false;
      return true;
    });
  }, [roundGameIds, pickMap1, pickMap2, diffFilter, statusFilter, gameMap]);

  // Separate filtered games by status for grouping
  const completedFilteredIds = filteredGameIds.filter((gid) => gameMap.get(gid)?.completed);
  const scheduledFilteredIds = filteredGameIds.filter((gid) => !gameMap.get(gid)?.completed);

  // Counts for current round (aggregate when ALL)
  const currentRoundAgree = isAllRounds
    ? ROUND_ORDER.reduce((sum, r) => sum + (roundStats[r]?.agree ?? 0), 0)
    : (roundStats[selectedRound]?.agree ?? 0);
  const currentRoundDiff = isAllRounds
    ? ROUND_ORDER.reduce((sum, r) => sum + (roundStats[r]?.diff ?? 0), 0)
    : (roundStats[selectedRound]?.diff ?? 0);
  const currentRoundCompleted = isAllRounds
    ? ROUND_ORDER.reduce((sum, r) => sum + (roundStats[r]?.completed ?? 0), 0)
    : (roundStats[selectedRound]?.completed ?? 0);
  const currentRoundScheduled = isAllRounds
    ? ROUND_ORDER.reduce((sum, r) => sum + (roundStats[r]?.scheduled ?? 0), 0)
    : (roundStats[selectedRound]?.scheduled ?? 0);

  return (
    <div className="space-y-4">
      {/* Bracket selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MultiSelectSearch mode="single" label="Brackets" options={bracketOptions} selectedId={id1} onSelect={setId1} onClear={() => setId1("")} inputLabel="Bracket 1" excludeValue={id2} placeholder="Search brackets..." />
        <MultiSelectSearch mode="single" label="Brackets" options={bracketOptions} selectedId={id2} onSelect={setId2} onClear={() => setId2("")} inputLabel="Bracket 2" excludeValue={id1} placeholder="Search brackets..." />
      </div>

      {b1 && b2 && a1 && a2 ? (
        <>
          {/* Agreement stat — inline subtle */}

          {/* Stat comparison — compact inline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-card bg-surface-container px-3 py-2 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold text-on-surface truncate">{b1.name}</p>
                {b1.full_name && b1.full_name !== b1.name && <p className="font-label text-[10px] text-on-surface-variant">{b1.full_name}</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-center">
                  <p className="font-display text-sm font-bold text-on-surface">{b1.points}</p>
                  <p className="font-label text-[8px] text-on-surface-variant">PTS</p>
                </div>
                <div className="text-center">
                  <p className="font-display text-sm font-bold text-on-surface">{b1.max_remaining}</p>
                  <p className="font-label text-[8px] text-on-surface-variant">MAX</p>
                </div>
                <TeamPill name={b1.champion_pick} seed={b1.champion_seed} logo={teamLogos[b1.champion_pick]} eliminated={eliminatedTeams.has(b1.champion_pick)} showStatus />
              </div>
            </div>

            <div className="rounded-card bg-surface-container px-3 py-2 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold text-on-surface truncate">{b2.name}</p>
                {b2.full_name && b2.full_name !== b2.name && <p className="font-label text-[10px] text-on-surface-variant">{b2.full_name}</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-center">
                  <p className="font-display text-sm font-bold text-on-surface">{b2.points}</p>
                  <p className="font-label text-[8px] text-on-surface-variant">PTS</p>
                </div>
                <div className="text-center">
                  <p className="font-display text-sm font-bold text-on-surface">{b2.max_remaining}</p>
                  <p className="font-label text-[8px] text-on-surface-variant">MAX</p>
                </div>
                <TeamPill name={b2.champion_pick} seed={b2.champion_seed} logo={teamLogos[b2.champion_pick]} eliminated={eliminatedTeams.has(b2.champion_pick)} showStatus />
              </div>
            </div>
          </div>

          {/* Overall agreement inline */}
          <p className="text-xs text-on-surface-variant">
            Overall: <span className="text-on-surface font-semibold">{agree}/{total}</span> picks agree ({total > 0 ? Math.round((agree / total) * 100) : 0}%)
          </p>

          {/* Round selector with counts */}
          <div className="flex gap-1 flex-wrap rounded-card bg-surface-container p-1 overflow-x-auto no-scrollbar">
            <button
              onClick={() => changeRound("ALL")}
              className={`rounded-card px-2.5 py-1 font-label text-xs h-7 transition-colors ${
                isAllRounds
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span>All Rounds</span>
              {id1 && id2 && (() => {
                const totalAg = ROUND_ORDER.reduce((s, r) => s + (roundStats[r]?.agree ?? 0), 0);
                const totalDf = ROUND_ORDER.reduce((s, r) => s + (roundStats[r]?.diff ?? 0), 0);
                return (totalAg + totalDf) > 0 ? (
                  <span className="ml-1.5 text-[10px] opacity-70">{totalAg}-{totalDf}</span>
                ) : null;
              })()}
            </button>
            <div className="w-px bg-on-surface-variant/20 my-1 mx-1" />
            {ROUND_ORDER.map((round) => {
              const stats = roundStats[round];
              const isActive = selectedRound === round;
              return (
                <button
                  key={round}
                  onClick={() => changeRound(round)}
                  className={`rounded-card px-2.5 py-1 font-label text-xs h-7 transition-colors ${
                    isActive
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <span>{ROUND_LABELS[round]}</span>
                  {stats && id1 && id2 && stats.total > 0 && (
                    <span className="ml-1.5 text-[10px] opacity-70">{stats.agree}-{stats.diff}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Filter pills with counts + status filter */}
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto no-scrollbar">
            <div className="flex gap-1.5 min-w-max">
              <button
                onClick={() => changeDiffFilter("all")}
                className={`rounded-lg px-2.5 py-1 text-xs font-label h-7 transition-colors ${diffFilter === "all" ? "bg-primary/15 text-primary border border-primary/30" : "text-on-surface-variant hover:text-on-surface"}`}
              >
                All ({currentRoundAgree + currentRoundDiff})
              </button>
              <button
                onClick={() => changeDiffFilter("agreement")}
                className={`rounded-lg px-2.5 py-1 text-xs font-label h-7 transition-colors ${diffFilter === "agreement" ? "bg-primary/15 text-primary border border-primary/30" : "text-on-surface-variant hover:text-on-surface"}`}
              >
                Agreement ({currentRoundAgree})
              </button>
              <button
                onClick={() => changeDiffFilter("differences")}
                className={`rounded-lg px-2.5 py-1 text-xs font-label h-7 transition-colors ${diffFilter === "differences" ? "bg-primary/15 text-primary border border-primary/30" : "text-on-surface-variant hover:text-on-surface"}`}
              >
                Differences ({currentRoundDiff})
              </button>
            </div>
            <span className="text-on-surface-variant/30">|</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => changeStatusFilter("all")}
                className={`rounded-lg px-2.5 py-1 text-xs font-label h-7 transition-colors ${statusFilter === "all" ? "bg-primary/15 text-primary border border-primary/30" : "text-on-surface-variant hover:text-on-surface"}`}
              >
                All ({currentRoundCompleted + currentRoundScheduled})
              </button>
              <button
                onClick={() => changeStatusFilter("completed")}
                className={`rounded-lg px-2.5 py-1 text-xs font-label h-7 transition-colors ${statusFilter === "completed" ? "bg-primary/15 text-primary border border-primary/30" : "text-on-surface-variant hover:text-on-surface"}`}
              >
                Completed ({currentRoundCompleted})
              </button>
              <button
                onClick={() => changeStatusFilter("scheduled")}
                className={`rounded-lg px-2.5 py-1 text-xs font-label h-7 transition-colors ${statusFilter === "scheduled" ? "bg-primary/15 text-primary border border-primary/30" : "text-on-surface-variant hover:text-on-surface"}`}
              >
                Scheduled ({currentRoundScheduled})
              </button>
            </div>
          </div>

          {/* Game cards — grouped by round when ALL, otherwise by status */}
          <div className="space-y-3">
            {filteredGameIds.length === 0 && (
              <p className="text-on-surface-variant text-sm text-center py-8">
                No games match the current filter for {isAllRounds ? "All Rounds" : (ROUND_LABELS[selectedRound as Round] || selectedRound)}.
              </p>
            )}
            {isAllRounds ? (
              /* Group by round with collapsible round headers */
              ROUND_ORDER.map((round) => {
                const roundIds = filteredGameIds.filter((gid) => {
                  const g = gameMap.get(gid);
                  return g?.round === round;
                });
                if (roundIds.length === 0) return null;
                const stats = roundStats[round];
                const roundCompleted = roundIds.filter((gid) => gameMap.get(gid)?.completed);
                const roundScheduled = roundIds.filter((gid) => !gameMap.get(gid)?.completed);
                const isCollapsed = collapsedRounds.has(round);
                return (
                  <div key={round} className="space-y-2">
                    <button
                      type="button"
                      onClick={() => toggleRoundCollapse(round)}
                      className="w-full flex items-center gap-2 pt-3 border-t border-outline/20 first:border-t-0 first:pt-0 cursor-pointer hover:bg-surface-bright/30 -mx-1 px-1 rounded transition-colors"
                    >
                      <span className="text-sm text-on-surface-variant/60 w-4 text-center font-label leading-none shrink-0">{isCollapsed ? "+" : "\u2212"}</span>
                      <p className="font-label text-xs font-semibold text-on-surface">
                        {ROUND_LABELS[round]}
                      </p>
                      {stats && id1 && id2 && stats.total > 0 && (
                        <span className="text-[10px] text-on-surface-variant">
                          {stats.agree} agree / {stats.diff} differ
                        </span>
                      )}
                      {isCollapsed && (
                        <span className="text-[10px] text-on-surface-variant/50 ml-auto">
                          {roundIds.length} game{roundIds.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </button>
                    {!isCollapsed && (
                      <>
                        {roundCompleted.length > 0 && statusFilter !== "scheduled" && (
                          <>
                            <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant">
                              Completed ({roundCompleted.length})
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {roundCompleted.map((gid) => renderGameCard(gid))}
                            </div>
                          </>
                        )}
                        {roundScheduled.length > 0 && statusFilter !== "completed" && (
                          <>
                            <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant pt-1">
                              Scheduled ({roundScheduled.length})
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {roundScheduled.map((gid) => renderGameCard(gid))}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                );
              })
            ) : (
              /* Single round: group by status */
              <>
                {completedFilteredIds.length > 0 && statusFilter !== "scheduled" && (
                  <>
                    <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant">
                      Completed ({completedFilteredIds.length})
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {completedFilteredIds.map((gid) => renderGameCard(gid))}
                    </div>
                  </>
                )}
                {scheduledFilteredIds.length > 0 && statusFilter !== "completed" && (
                  <>
                    <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant pt-1">
                      Scheduled ({scheduledFilteredIds.length})
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {scheduledFilteredIds.map((gid) => renderGameCard(gid))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </>
      ) : (
        /* Better empty state */
        <div className="rounded-card bg-surface-container p-12 text-center space-y-4">
          <div className="font-display text-5xl text-on-surface-variant/30">VS</div>
          <p className="font-display text-lg font-semibold text-on-surface">
            Compare Two Brackets
          </p>
          <p className="text-on-surface-variant text-sm max-w-md mx-auto">
            Select two brackets above to see how they stack up.
          </p>
        </div>
      )}
    </div>
  );

  function renderGameCard(gid: string) {
    const g = gameMap.get(gid);
    const pick1 = pickMap1.get(gid);
    const pick2 = pickMap2.get(gid);
    const same = pick1 === pick2;
    const isComplete = g?.completed ?? false;
    const pick1Correct = isComplete && !!pick1 && pick1 === g?.winner;
    const pick2Correct = isComplete && !!pick2 && pick2 === g?.winner;
    return (
      <div
        key={gid}
        className={`rounded-card p-3 border-l-4 ${
          same ? "border-l-teal-500/30 bg-surface-container" : "border-l-orange-400/30 bg-surface-container"
        }`}
      >
        <div className="mb-2">
          <GameHeader
            eliminatedTeams={eliminatedTeams}
            game={{
              team1: g?.team1 || "",
              seed1: g?.seed1 ?? 0,
              team2: g?.team2 || "",
              seed2: g?.seed2 ?? 0,
              completed: isComplete,
              winner: g?.winner || "",
              espn_url: g?.espn_url,
            }}
            teamLogos={teamLogos}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className={`rounded-md px-2.5 py-2 ${pick1Correct ? "bg-secondary/10 border border-secondary/40" : "bg-surface-container"}`}>
            <p className="text-[10px] font-semibold text-on-surface" title={b1 && b1.full_name && b1.full_name !== b1.name ? b1.full_name : undefined}>{b1 ? b1.name : ""}</p>
            {b1 && b1.full_name && b1.full_name !== b1.name && <p className="text-[8px] text-on-surface-variant">{b1.full_name}</p>}
            {pick1 ? (
              <div className="mt-1">
                <TeamPill name={pick1} seed={teamSeeds.get(pick1)} logo={teamLogos[pick1]} eliminated={eliminatedTeams.has(pick1)} showStatus />
                {isComplete && (
                  <p className={`text-[10px] mt-0.5 ${pick1Correct ? "text-secondary" : "text-on-surface-variant"}`}>
                    {pick1Correct ? "Correct" : "Incorrect"}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant italic mt-1">No pick</p>
            )}
          </div>
          <div className={`rounded-md px-2.5 py-2 ${pick2Correct ? "bg-secondary/10 border border-secondary/40" : "bg-surface-container"}`}>
            <p className="text-[10px] font-semibold text-on-surface" title={b2 && b2.full_name && b2.full_name !== b2.name ? b2.full_name : undefined}>{b2 ? b2.name : ""}</p>
            {b2 && b2.full_name && b2.full_name !== b2.name && <p className="text-[8px] text-on-surface-variant">{b2.full_name}</p>}
            {pick2 ? (
              <div className="mt-1">
                <TeamPill name={pick2} seed={teamSeeds.get(pick2)} logo={teamLogos[pick2]} eliminated={eliminatedTeams.has(pick2)} showStatus />
                {isComplete && (
                  <p className={`text-[10px] mt-0.5 ${pick2Correct ? "text-secondary" : "text-on-surface-variant"}`}>
                    {pick2Correct ? "Correct" : "Incorrect"}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant italic mt-1">No pick</p>
            )}
          </div>
        </div>
      </div>
    );
  }
}
