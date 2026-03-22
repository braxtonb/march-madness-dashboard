"use client";

import { useMemo, useRef, useEffect } from "react";
import type { Game, Round } from "@/lib/types";
import { ROUND_ORDER, ROUND_LABELS } from "@/lib/constants";

interface BracketViewProps {
  games: Game[];
  pickSplits: Record<string, { team1Count: number; team2Count: number }>;
  totalBrackets: number;
  teamLogos?: Record<string, string>;
  eliminatedTeams?: Set<string>;
}

/** Abbreviate long team names for compact display */
function shortName(name: string): string {
  if (!name) return "TBD";
  if (name.length <= 12) return name;
  const abbrevs: Record<string, string> = {
    Connecticut: "UConn",
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
    Northwestern: "NW",
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

function GameCell({
  game,
  pickSplit,
  totalBrackets,
  eliminatedTeams,
}: {
  game: Game;
  pickSplit: { team1Count: number; team2Count: number };
  totalBrackets: number;
  eliminatedTeams?: Set<string>;
}) {
  const total = pickSplit.team1Count + pickSplit.team2Count;
  const pct1 = total > 0 ? Math.round((pickSplit.team1Count / total) * 100) : 50;
  const pct2 = total > 0 ? 100 - pct1 : 50;
  const isTBD = !game.team1 && !game.team2;
  const isCompleted = game.completed;

  if (isTBD) {
    return (
      <div className="rounded-lg bg-surface-container/50 border border-outline/20 px-2 py-1.5 min-w-[180px] opacity-50">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] text-on-surface-variant/50 font-label">TBD</span>
          <span className="text-[9px] text-on-surface-variant/30">vs</span>
          <span className="text-[11px] text-on-surface-variant/50 font-label">TBD</span>
        </div>
      </div>
    );
  }

  const team1IsWinner = isCompleted && game.winner === game.team1;
  const team2IsWinner = isCompleted && game.winner === game.team2;
  const team1Eliminated = eliminatedTeams?.has(game.team1);
  const team2Eliminated = eliminatedTeams?.has(game.team2);

  return (
    <div
      className={`rounded-lg border px-2 py-1.5 min-w-[180px] space-y-1 ${
        isCompleted
          ? "bg-surface-container border-outline/30"
          : "bg-surface-container/60 border-outline/15"
      }`}
    >
      {/* Team 1 row */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-on-surface-variant font-label w-4 text-right shrink-0">
          {game.seed1 || ""}
        </span>
        <span
          className={`text-[11px] font-label flex-1 min-w-0 truncate ${
            team1IsWinner
              ? "text-on-surface font-bold"
              : team1Eliminated
                ? "text-on-surface-variant/40 line-through"
                : "text-on-surface"
          }`}
        >
          {shortName(game.team1)}
        </span>
        <span className="text-[10px] font-label text-on-surface-variant shrink-0">
          {pct1}%
        </span>
      </div>

      {/* Pick split bar */}
      <div className="flex h-1.5 rounded-full overflow-hidden bg-surface-bright">
        <div
          className="bg-primary transition-all"
          style={{ width: `${pct1}%` }}
        />
        <div
          className="bg-secondary transition-all"
          style={{ width: `${pct2}%` }}
        />
      </div>

      {/* Team 2 row */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-on-surface-variant font-label w-4 text-right shrink-0">
          {game.seed2 || ""}
        </span>
        <span
          className={`text-[11px] font-label flex-1 min-w-0 truncate ${
            team2IsWinner
              ? "text-on-surface font-bold"
              : team2Eliminated
                ? "text-on-surface-variant/40 line-through"
                : "text-on-surface"
          }`}
        >
          {shortName(game.team2)}
        </span>
        <span className="text-[10px] font-label text-on-surface-variant shrink-0">
          {pct2}%
        </span>
      </div>

      {/* Winner / status badge */}
      {isCompleted && game.winner && (
        <div className="text-[9px] font-label text-secondary truncate">
          Winner: {shortName(game.winner)}
        </div>
      )}
      {!isCompleted && game.team1 && game.team2 && (
        <div className="text-[9px] font-label text-on-surface-variant/50">
          Scheduled
        </div>
      )}
    </div>
  );
}

export function BracketView({
  games,
  pickSplits,
  totalBrackets,
  teamLogos = {},
  eliminatedTeams,
}: BracketViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Group games by round
  const gamesByRound = useMemo(() => {
    const map: Record<string, Game[]> = {};
    for (const round of ROUND_ORDER) {
      const roundGames = games.filter((g) => g.round === round);
      if (roundGames.length > 0) {
        map[round] = roundGames;
      }
    }
    return map;
  }, [games]);

  // Find the latest round that has at least one game, and scroll to it on mobile
  const latestRoundIdx = useMemo(() => {
    let latest = 0;
    for (let i = ROUND_ORDER.length - 1; i >= 0; i--) {
      const round = ROUND_ORDER[i];
      const roundGames = games.filter((g) => g.round === round);
      if (roundGames.some((g) => g.completed || (g.team1 && g.team2))) {
        latest = i;
        break;
      }
    }
    return latest;
  }, [games]);

  // Auto-scroll to the latest round on mount (mobile)
  useEffect(() => {
    if (scrollRef.current && latestRoundIdx > 0) {
      const columns = scrollRef.current.querySelectorAll("[data-round-col]");
      if (columns[latestRoundIdx]) {
        columns[latestRoundIdx].scrollIntoView({
          behavior: "smooth",
          inline: "start",
          block: "nearest",
        });
      }
    }
  }, [latestRoundIdx]);

  const roundsWithGames = useMemo(
    () => ROUND_ORDER.filter((r) => gamesByRound[r]),
    [gamesByRound]
  );

  // Group games by region within each round
  const regionsByRound = useMemo(() => {
    const result: Record<string, { region: string; games: Game[] }[]> = {};
    for (const round of roundsWithGames) {
      const roundGames = gamesByRound[round];
      if (!roundGames) continue;
      const regionMap = new Map<string, Game[]>();
      for (const g of roundGames) {
        const region = g.region || "Other";
        if (!regionMap.has(region)) regionMap.set(region, []);
        regionMap.get(region)!.push(g);
      }
      result[round] = [...regionMap.entries()].map(([region, games]) => ({
        region,
        games,
      }));
    }
    return result;
  }, [roundsWithGames, gamesByRound]);

  if (roundsWithGames.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-on-surface-variant text-sm">No games to display.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap text-xs text-on-surface-variant">
        <span className="font-label">Pick Split:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-2 rounded-sm bg-primary" />
          <span>Team 1</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-2 rounded-sm bg-secondary" />
          <span>Team 2</span>
        </div>
        <span className="text-on-surface-variant/50">|</span>
        <span>Bold = Winner</span>
      </div>

      {/* Horizontally scrollable bracket columns */}
      <div
        ref={scrollRef}
        className="overflow-x-auto no-scrollbar pb-4"
      >
        <div className="flex gap-3 min-w-max">
          {roundsWithGames.map((round) => {
            const regions = regionsByRound[round];
            const gameCount = gamesByRound[round].length;

            return (
              <div
                key={round}
                data-round-col
                className="flex flex-col gap-2 shrink-0"
                style={{ width: 200 }}
              >
                {/* Round header */}
                <div className="sticky top-0 z-10 bg-surface rounded-lg px-2 py-1.5 border border-outline/20">
                  <p className="font-label text-xs font-semibold text-on-surface text-center">
                    {ROUND_LABELS[round as Round] || round}
                  </p>
                  <p className="text-[9px] text-on-surface-variant text-center">
                    {gameCount} game{gameCount !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Games stacked by region */}
                {regions.map(({ region, games: regionGames }) => (
                  <div key={region} className="space-y-1.5">
                    {regions.length > 1 && (
                      <p className="text-[9px] font-label text-on-surface-variant/60 uppercase tracking-wider px-1">
                        {region}
                      </p>
                    )}
                    {regionGames.map((game) => (
                      <GameCell
                        key={game.game_id}
                        game={game}
                        pickSplit={
                          pickSplits[game.game_id] || {
                            team1Count: 0,
                            team2Count: 0,
                          }
                        }
                        totalBrackets={totalBrackets}
                        eliminatedTeams={eliminatedTeams}
                      />
                    ))}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
