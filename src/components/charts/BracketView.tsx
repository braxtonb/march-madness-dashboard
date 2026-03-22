"use client";

import { useMemo, useRef } from "react";
import type { Game, Round } from "@/lib/types";
import { ROUND_LABELS } from "@/lib/constants";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BracketViewProps {
  games: Game[];
  pickSplits: Record<string, { team1Count: number; team2Count: number }>;
  totalBrackets: number;
  teamLogos?: Record<string, string>;
  eliminatedTeams?: Set<string>;
  onGameClick?: (gameId: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

/** Region codes to display labels */
const REGION_LABELS: Record<string, string> = {
  R1: "Region 1",
  R2: "Region 2",
  R3: "Region 3",
  R4: "Region 4",
};

/** Rounds within each region (left-to-right) */
const REGION_ROUNDS: Round[] = ["R64", "R32", "S16", "E8"];

/* ------------------------------------------------------------------ */
/*  GameCell — a single matchup in the bracket tree                   */
/* ------------------------------------------------------------------ */

function GameCell({
  game,
  pickSplit,
  totalBrackets,
  eliminatedTeams,
  onClick,
}: {
  game: Game;
  pickSplit: { team1Count: number; team2Count: number };
  totalBrackets: number;
  eliminatedTeams?: Set<string>;
  onClick?: () => void;
}) {
  const total = pickSplit.team1Count + pickSplit.team2Count;
  const pct1 = total > 0 ? Math.round((pickSplit.team1Count / total) * 100) : 50;
  const pct2 = total > 0 ? 100 - pct1 : 50;
  const isTBD = !game.team1 && !game.team2;
  const isCompleted = game.completed;

  if (isTBD) {
    return (
      <div className="w-40 rounded border border-outline-variant/20 bg-surface-container/50 opacity-50 text-left">
        <div className="flex items-center justify-between px-2 py-1 text-xs border-b border-outline-variant/10">
          <span className="text-on-surface-variant/50">TBD</span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 text-xs">
          <span className="text-on-surface-variant/50">TBD</span>
        </div>
        <div className="flex h-1">
          <div className="bg-surface-bright w-full" />
        </div>
      </div>
    );
  }

  const team1IsWinner = isCompleted && game.winner === game.team1;
  const team2IsWinner = isCompleted && game.winner === game.team2;
  const team1Eliminated = eliminatedTeams?.has(game.team1);
  const team2Eliminated = eliminatedTeams?.has(game.team2);

  return (
    <button
      onClick={onClick}
      className="w-40 rounded border border-outline-variant/30 bg-surface-container hover:bg-surface-bright transition-colors text-left cursor-pointer"
    >
      {/* Team 1 */}
      <div
        className={`flex items-center justify-between px-2 py-1 text-xs border-b border-outline-variant/20 ${
          team1IsWinner
            ? "text-on-surface font-semibold"
            : team1Eliminated
              ? "text-on-surface-variant/40 line-through"
              : "text-on-surface-variant"
        }`}
      >
        <span className="truncate">
          <span className="text-on-surface-variant/60 mr-1">{game.seed1 || ""}</span>
          {shortName(game.team1)}
        </span>
        <span className="text-[10px] ml-1 shrink-0">{pct1}%</span>
      </div>
      {/* Team 2 */}
      <div
        className={`flex items-center justify-between px-2 py-1 text-xs ${
          team2IsWinner
            ? "text-on-surface font-semibold"
            : team2Eliminated
              ? "text-on-surface-variant/40 line-through"
              : "text-on-surface-variant"
        }`}
      >
        <span className="truncate">
          <span className="text-on-surface-variant/60 mr-1">{game.seed2 || ""}</span>
          {shortName(game.team2)}
        </span>
        <span className="text-[10px] ml-1 shrink-0">{pct2}%</span>
      </div>
      {/* Mini pick split bar */}
      <div className="flex h-1">
        <div className="bg-primary transition-all" style={{ width: `${pct1}%` }} />
        <div className="bg-secondary transition-all" style={{ width: `${pct2}%` }} />
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  RegionBracket — one region as a horizontal tree                   */
/* ------------------------------------------------------------------ */

function RegionBracket({
  games,
  region,
  pickSplits,
  totalBrackets,
  eliminatedTeams,
  onGameClick,
}: {
  games: Game[];
  region: string;
  pickSplits: Record<string, { team1Count: number; team2Count: number }>;
  totalBrackets: number;
  eliminatedTeams?: Set<string>;
  onGameClick?: (gameId: string) => void;
}) {
  const regionGames = useMemo(
    () => games.filter((g) => g.region === region),
    [games, region]
  );

  // Group and sort games by round. Sort by game_id within each round
  // to maintain standard bracket topology (1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15)
  const roundGameMap = useMemo(() => {
    const map: Record<string, Game[]> = {};
    for (const round of REGION_ROUNDS) {
      const rGames = regionGames
        .filter((g) => g.round === round)
        .sort((a, b) => a.game_id.localeCompare(b.game_id));
      if (rGames.length > 0) {
        map[round] = rGames;
      }
    }
    return map;
  }, [regionGames]);

  const activeRounds = REGION_ROUNDS.filter((r) => roundGameMap[r]);

  if (activeRounds.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="font-display text-sm font-semibold text-on-surface px-1">
        {REGION_LABELS[region] || region}
      </h3>
      <div className="flex items-center gap-0">
        {activeRounds.map((round, roundIdx) => {
          const roundGames = roundGameMap[round];
          // Exponentially increasing gap to create tree alignment
          const gapPx = Math.pow(2, roundIdx) * 8;

          return (
            <div key={round} className="flex flex-col items-stretch shrink-0">
              {/* Round label */}
              <div className="text-center mb-1">
                <span className="text-[9px] font-label text-on-surface-variant/60 uppercase tracking-wider">
                  {ROUND_LABELS[round] || round}
                </span>
              </div>
              {/* Games column with increasing gap */}
              <div
                className="flex flex-col justify-around"
                style={{ gap: `${gapPx}px` }}
              >
                {roundGames.map((game) => (
                  <div key={game.game_id} className="flex items-center">
                    <GameCell
                      game={game}
                      pickSplit={
                        pickSplits[game.game_id] || { team1Count: 0, team2Count: 0 }
                      }
                      totalBrackets={totalBrackets}
                      eliminatedTeams={eliminatedTeams}
                      onClick={onGameClick ? () => onGameClick(game.game_id) : undefined}
                    />
                    {/* Connector line to next round */}
                    {roundIdx < activeRounds.length - 1 && (
                      <div className="w-3 h-px bg-outline-variant/30 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FinalRoundsBracket — Final Four + Championship in the center      */
/* ------------------------------------------------------------------ */

function FinalRoundsBracket({
  games,
  pickSplits,
  totalBrackets,
  eliminatedTeams,
  onGameClick,
}: {
  games: Game[];
  pickSplits: Record<string, { team1Count: number; team2Count: number }>;
  totalBrackets: number;
  eliminatedTeams?: Set<string>;
  onGameClick?: (gameId: string) => void;
}) {
  const ffGames = useMemo(
    () =>
      games
        .filter((g) => g.round === "FF")
        .sort((a, b) => a.game_id.localeCompare(b.game_id)),
    [games]
  );
  const champGames = useMemo(
    () =>
      games
        .filter((g) => g.round === "CHAMP")
        .sort((a, b) => a.game_id.localeCompare(b.game_id)),
    [games]
  );

  if (ffGames.length === 0 && champGames.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="font-display text-sm font-semibold text-on-surface px-1">
        Final Four &amp; Championship
      </h3>
      <div className="flex items-center gap-0">
        {/* Final Four column */}
        {ffGames.length > 0 && (
          <div className="flex flex-col items-stretch shrink-0">
            <div className="text-center mb-1">
              <span className="text-[9px] font-label text-on-surface-variant/60 uppercase tracking-wider">
                {ROUND_LABELS["FF"]}
              </span>
            </div>
            <div className="flex flex-col justify-around" style={{ gap: "16px" }}>
              {ffGames.map((game) => (
                <div key={game.game_id} className="flex items-center">
                  <GameCell
                    game={game}
                    pickSplit={
                      pickSplits[game.game_id] || { team1Count: 0, team2Count: 0 }
                    }
                    totalBrackets={totalBrackets}
                    eliminatedTeams={eliminatedTeams}
                    onClick={onGameClick ? () => onGameClick(game.game_id) : undefined}
                  />
                  {champGames.length > 0 && (
                    <div className="w-3 h-px bg-outline-variant/30 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Championship column */}
        {champGames.length > 0 && (
          <div className="flex flex-col items-stretch shrink-0">
            <div className="text-center mb-1">
              <span className="text-[9px] font-label text-on-surface-variant/60 uppercase tracking-wider">
                {ROUND_LABELS["CHAMP"]}
              </span>
            </div>
            <div className="flex flex-col justify-around" style={{ gap: "16px" }}>
              {champGames.map((game) => (
                <GameCell
                  key={game.game_id}
                  game={game}
                  pickSplit={
                    pickSplits[game.game_id] || { team1Count: 0, team2Count: 0 }
                  }
                  totalBrackets={totalBrackets}
                  eliminatedTeams={eliminatedTeams}
                  onClick={onGameClick ? () => onGameClick(game.game_id) : undefined}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  BracketView — main export                                          */
/* ------------------------------------------------------------------ */

export function BracketView({
  games,
  pickSplits,
  totalBrackets,
  teamLogos = {},
  eliminatedTeams,
  onGameClick,
}: BracketViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Determine which regions have games
  const regions = useMemo(() => {
    const regionSet = new Set<string>();
    for (const g of games) {
      if (g.region && !["FF", "CHAMP"].includes(g.region)) {
        regionSet.add(g.region);
      }
    }
    return Array.from(regionSet).sort();
  }, [games]);

  const hasFinalRounds = useMemo(
    () => games.some((g) => g.round === "FF" || g.round === "CHAMP"),
    [games]
  );

  if (games.length === 0) {
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
        {onGameClick && (
          <>
            <span className="text-on-surface-variant/50">|</span>
            <span>Click a game to see individual picks</span>
          </>
        )}
      </div>

      {/* Horizontally scrollable bracket */}
      <div
        ref={scrollRef}
        className="overflow-x-auto no-scrollbar pb-4"
      >
        <div className="space-y-6 min-w-max">
          {/* Each region as a bracket tree */}
          {regions.map((region) => (
            <RegionBracket
              key={region}
              games={games}
              region={region}
              pickSplits={pickSplits}
              totalBrackets={totalBrackets}
              eliminatedTeams={eliminatedTeams}
              onGameClick={onGameClick}
            />
          ))}

          {/* Final Four + Championship */}
          {hasFinalRounds && (
            <FinalRoundsBracket
              games={games}
              pickSplits={pickSplits}
              totalBrackets={totalBrackets}
              eliminatedTeams={eliminatedTeams}
              onGameClick={onGameClick}
            />
          )}
        </div>
      </div>
    </div>
  );
}
