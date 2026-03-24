"use client";

import { useState, useMemo, useCallback } from "react";
import type { Game, Round } from "@/lib/types";
import { ROUND_ORDER, ROUND_LABELS } from "@/lib/constants";

interface GameHeatmapProps {
  games: Game[];
  pickSplits: Record<string, { team1Count: number; team2Count: number }>;
  totalBrackets: number;
  round: string;
  statusFilter: "all" | "completed" | "scheduled";
  onGameClick?: (gameId: string) => void;
}

function accuracyColor(pctCorrect: number): string {
  // Cyan for majority correct, orange for majority wrong — higher min opacity for dark bg contrast
  if (pctCorrect >= 0.8) return "bg-[#00f4fe]/50";
  if (pctCorrect >= 0.65) return "bg-[#00f4fe]/35";
  if (pctCorrect >= 0.5) return "bg-[#00f4fe]/20";
  if (pctCorrect >= 0.4) return "bg-[#ff8c42]/20";
  if (pctCorrect >= 0.25) return "bg-[#ff8c42]/35";
  return "bg-[#ff8c42]/50";
}

/** Abbreviate long team names for compact display */
function shortName(name: string): string {
  if (!name) return "TBD";
  if (name.length <= 12) return name;
  const abbrevs: Record<string, string> = {
    "Connecticut": "UConn",
    "Michigan State": "Mich St",
    "Mississippi State": "Miss St",
    "North Carolina": "UNC",
    "South Carolina": "S Carolina",
    "San Diego State": "SDSU",
    "Virginia Tech": "VA Tech",
    "Texas Tech": "TX Tech",
    "Iowa State": "Iowa St",
    "Kansas State": "K-State",
    "Colorado State": "CSU",
    "Ohio State": "Ohio St",
    "Florida State": "FSU",
    "Arizona State": "ASU",
    "Brigham Young": "BYU",
    "Saint Mary's": "St Mary's",
    "Northwestern": "NW",
    "Morehead State": "Morehead",
    "New Mexico": "N Mexico",
    "Grand Canyon": "GCU",
    "Saint Peter's": "St Pete's",
    "McNeese State": "McNeese",
    "College of Charleston": "Charleston",
    "Western Kentucky": "WKU",
    "James Madison": "JMU",
    "Long Beach State": "LBSU",
  };
  if (abbrevs[name]) return abbrevs[name];
  if (name.length > 14) return name.slice(0, 13) + "\u2026";
  return name;
}

/** Check if a game has TBD teams */
function isTBDTeam(name: string): boolean {
  return !name || name === "TBD" || name === "";
}

export function GameHeatmap({ games, pickSplits, totalBrackets, round, statusFilter, onGameClick }: GameHeatmapProps) {
  const isAllRounds = round === "ALL";

  const filteredGames = useMemo(() => {
    let gList = isAllRounds ? games : games.filter((g) => g.round === round);
    if (statusFilter === "completed") gList = gList.filter((g) => g.completed);
    else if (statusFilter === "scheduled") gList = gList.filter((g) => !g.completed);
    return gList;
  }, [games, round, isAllRounds, statusFilter]);

  // Group by round
  const groupedGames = useMemo(() => {
    if (!isAllRounds) return [{ round: round as Round, games: filteredGames }];
    return ROUND_ORDER
      .map((r) => ({
        round: r,
        games: filteredGames.filter((g) => g.round === r),
      }))
      .filter((g) => g.games.length > 0);
  }, [filteredGames, isAllRounds, round]);

  // Compute which rounds are fully completed (for default collapse state)
  const fullyCompletedRounds = useMemo(() => {
    const set = new Set<string>();
    for (const r of ROUND_ORDER) {
      const rGames = games.filter((g) => g.round === r);
      if (rGames.length > 0 && rGames.every((g) => g.completed)) {
        set.add(r);
      }
    }
    return set;
  }, [games]);

  const [collapsedRounds, setCollapsedRounds] = useState<Set<string>>(() => {
    const set = new Set(fullyCompletedRounds);
    const lastCompleted = ROUND_ORDER.filter((r) => set.has(r)).pop();
    if (lastCompleted) set.delete(lastCompleted);
    return set;
  });

  const toggleRoundCollapse = useCallback((r: string) => {
    setCollapsedRounds((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  }, []);

  if (filteredGames.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-on-surface-variant text-sm">No games to display.</p>
      </div>
    );
  }

  const peopleIcon = (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-on-surface-variant/70 group-hover:text-on-surface shrink-0 transition-colors">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );

  function renderGameCell(game: Game) {
    const split = pickSplits[game.game_id];
    const total = split ? split.team1Count + split.team2Count : 0;
    const hasTeam = !!(game.team1 || game.team2);
    const clickable = onGameClick && hasTeam;

    if (!game.completed) {
      const tbd1 = isTBDTeam(game.team1);
      const tbd2 = isTBDTeam(game.team2);

      if (tbd1 && tbd2) {
        return (
          <div
            key={game.game_id}
            className="flex items-center gap-1 rounded bg-on-surface-variant/5 px-2 py-1"
          >
            <span className="text-[11px] text-on-surface-variant/50 font-label truncate min-w-0 flex-1">TBD</span>
            <span className="text-[10px] text-on-surface-variant/30 shrink-0">v</span>
            <span className="text-[11px] text-on-surface-variant/50 font-label truncate min-w-0 flex-1 text-right">TBD</span>
          </div>
        );
      }

      const hasPicks = total > 0;
      const pct1 = hasPicks ? Math.round((split.team1Count / total) * 100) : 0;
      const pct2 = hasPicks ? 100 - pct1 : 0;

      const El = clickable ? "button" : "div";
      return (
        <El
          key={game.game_id}
          {...(clickable ? { onClick: () => onGameClick!(game.game_id), type: "button" as const } : {})}
          className={`group flex items-center gap-1 rounded bg-on-surface-variant/10 px-2 py-1 w-full text-left ${clickable ? "cursor-pointer hover:bg-on-surface-variant/15 transition-colors" : ""}`}
        >
          {!tbd1 && (
            <span className="text-[10px] text-on-surface-variant w-4 text-center font-label shrink-0">
              {game.seed1}
            </span>
          )}
          <span className={`text-xs font-medium truncate min-w-0 flex-1 ${tbd1 ? "text-on-surface-variant/50 italic" : "text-on-surface"}`}>
            {tbd1 ? "TBD" : shortName(game.team1)}
          </span>
          {hasPicks && <span className="text-[10px] text-on-surface font-label shrink-0">{pct1}% <span className="text-on-surface-variant">({split.team1Count})</span></span>}
          <span className="text-[10px] text-on-surface-variant/50 shrink-0">v</span>
          {hasPicks && <span className="text-[10px] text-on-surface font-label shrink-0"><span className="text-on-surface-variant">({split.team2Count})</span> {pct2}%</span>}
          <span className={`text-xs font-medium truncate min-w-0 flex-1 text-right ${tbd2 ? "text-on-surface-variant/50 italic" : "text-on-surface"}`}>
            {tbd2 ? "TBD" : shortName(game.team2)}
          </span>
          {!tbd2 && (
            <span className="text-[10px] text-on-surface-variant w-4 text-center font-label shrink-0">
              {game.seed2}
            </span>
          )}
          {clickable && peopleIcon}
        </El>
      );
    }

    // Completed game -- calculate group accuracy
    const winnerIsTeam1 = game.winner === game.team1;
    const correctPicks = winnerIsTeam1 ? (split?.team1Count || 0) : (split?.team2Count || 0);
    const pctCorrect = total > 0 ? correctPicks / total : 0;
    const colorClass = accuracyColor(pctCorrect);
    const hasPicks = total > 0;
    const cPct1 = hasPicks ? Math.round(((split?.team1Count || 0) / total) * 100) : 0;
    const cPct2 = hasPicks ? 100 - cPct1 : 0;

    const El2 = clickable ? "button" : "div";
    return (
      <El2
        key={game.game_id}
        {...(clickable ? { onClick: () => onGameClick!(game.game_id), type: "button" as const } : {})}
        className={`group flex items-center gap-1 rounded px-2 py-1 w-full text-left ${colorClass} ${clickable ? "cursor-pointer hover:brightness-125 transition-all" : ""}`}
      >
        <span className="text-[10px] text-on-surface-variant w-4 text-center font-label shrink-0">
          {game.seed1}
        </span>
        <span
          className={`text-xs font-medium truncate min-w-0 flex-1 ${
            game.winner === game.team1 ? "text-on-surface font-bold" : "text-on-surface-variant line-through"
          }`}
        >
          {shortName(game.team1)}
        </span>
        {hasPicks && <span className="text-[10px] text-on-surface font-label shrink-0">{cPct1}% <span className="text-on-surface-variant">({split?.team1Count || 0})</span></span>}
        <span className="text-[10px] text-on-surface-variant/50 shrink-0">v</span>
        {hasPicks && <span className="text-[10px] text-on-surface font-label shrink-0"><span className="text-on-surface-variant">({split?.team2Count || 0})</span> {cPct2}%</span>}
        <span
          className={`text-xs font-medium truncate min-w-0 flex-1 text-right ${
            game.winner === game.team2 ? "text-on-surface font-bold" : "text-on-surface-variant line-through"
          }`}
        >
          {shortName(game.team2)}
        </span>
        <span className="text-[10px] text-on-surface-variant w-4 text-center font-label shrink-0">
          {game.seed2}
        </span>
        {clickable && peopleIcon}
      </El2>
    );
  }

  const showRoundHeaders = isAllRounds && groupedGames.length > 1;

  return (
    <div className="space-y-2">
      {/* Legend */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-on-surface-variant font-label" title="Percentage of completed games where the group's most popular pick was correct">Group Accuracy:</span>
        <div className="flex items-center gap-0.5">
          <div className="w-5 h-3 rounded-sm bg-[#ff8c42]/50" />
          <div className="w-5 h-3 rounded-sm bg-[#ff8c42]/35" />
          <div className="w-5 h-3 rounded-sm bg-[#ff8c42]/20" />
          <div className="w-5 h-3 rounded-sm bg-[#00f4fe]/20" />
          <div className="w-5 h-3 rounded-sm bg-[#00f4fe]/35" />
          <div className="w-5 h-3 rounded-sm bg-[#00f4fe]/50" />
        </div>
        <span className="text-xs text-on-surface-variant">
          Wrong &larr; &rarr; Correct
        </span>
        <div className="flex items-center gap-0.5 ml-2">
          <div className="w-5 h-3 rounded-sm bg-on-surface-variant/10" />
          <span className="text-xs text-on-surface-variant">Pending</span>
        </div>
      </div>

      {groupedGames.map((group) => {
        const isCollapsed = collapsedRounds.has(group.round);

        if (showRoundHeaders) {
          return (
            <div key={group.round} className="space-y-2">
              <button
                type="button"
                onClick={() => toggleRoundCollapse(group.round)}
                className="w-full flex items-center gap-2 pt-2 border-t border-outline/20 first:border-t-0 first:pt-0 cursor-pointer hover:bg-surface-bright/30 -mx-1 px-1 rounded transition-colors"
              >
                <span className="text-sm text-on-surface-variant/60 w-4 text-center font-label leading-none shrink-0">
                  {isCollapsed ? "+" : "\u2212"}
                </span>
                <p className="font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  {ROUND_LABELS[group.round]}
                </p>
                {isCollapsed && (
                  <span className="text-xs text-on-surface-variant/50 ml-auto">
                    {group.games.length} game{group.games.length !== 1 ? "s" : ""}
                  </span>
                )}
              </button>
              {!isCollapsed && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                  {group.games.map((game) => renderGameCell(game))}
                </div>
              )}
            </div>
          );
        }

        return (
          <div key={group.round} className="space-y-2">
            {isAllRounds && (
              <p className="font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant pt-1">
                {ROUND_LABELS[group.round]}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
              {group.games.map((game) => renderGameCell(game))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
