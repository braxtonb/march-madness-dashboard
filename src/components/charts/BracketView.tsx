"use client";

import { useMemo, useRef } from "react";
import type { Game, Round } from "@/lib/types";
import { ROUND_LABELS, ROUND_POINTS } from "@/lib/constants";

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
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const GAME_H = 56;
const GAME_W = 140;
const BASE_GAP = 8;
const CONNECTOR_W = 16; // tighter connectors for less horizontal spread

/** Region codes to display labels */
const REGION_NAMES: Record<string, string> = {
  R1: "East",
  R2: "South",
  R3: "West",
  R4: "Midwest",
};

/** Rounds within each region (left-to-right) */
const REGION_ROUNDS: Round[] = ["R64", "R32", "S16", "E8"];

/** Short round labels for column headers */
const SHORT_ROUND_LABELS: Record<string, string> = {
  R64: "R64",
  R32: "R32",
  S16: "S16",
  E8: "Elite 8",
  FF: "Final Four",
  CHAMP: "Championship",
};

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

/* ------------------------------------------------------------------ */
/*  GameCell — a single matchup in the bracket tree                   */
/* ------------------------------------------------------------------ */

function GameCell({
  game,
  pickSplit,
  totalBrackets,
  eliminatedTeams,
  onClick,
  mirror = false,
}: {
  game: Game;
  pickSplit: { team1Count: number; team2Count: number };
  totalBrackets: number;
  eliminatedTeams?: Set<string>;
  onClick?: () => void;
  mirror?: boolean;
}) {
  const total = pickSplit.team1Count + pickSplit.team2Count;
  const pct1 = total > 0 ? Math.round((pickSplit.team1Count / total) * 100) : 50;
  const pct2 = total > 0 ? 100 - pct1 : 50;
  const isTBD = !game.team1 && !game.team2;
  const isCompleted = game.completed;

  if (isTBD) {
    return (
      <div
        className="rounded border border-outline-variant/20 bg-surface-container/50 opacity-50 text-left shrink-0"
        style={{ width: GAME_W }}
      >
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
      className={`rounded border border-on-surface-variant/40 bg-surface-container hover:bg-surface-bright transition-colors cursor-pointer shrink-0 ${mirror ? "text-right" : "text-left"}`}
      style={{ width: GAME_W }}
    >
      {/* Team 1 */}
      <div
        className={`flex items-center justify-between px-2 py-1 text-xs border-b border-outline-variant/20 ${mirror ? "flex-row-reverse" : ""} ${
          team1IsWinner
            ? "text-on-surface font-semibold"
            : team1Eliminated
              ? "text-on-surface-variant/40 line-through"
              : "text-on-surface-variant"
        }`}
      >
        <span className="truncate">
          {mirror ? (
            <>
              {shortName(game.team1)}{" "}
              <span className="text-on-surface-variant/60 ml-1">
                {game.seed1 || ""}
              </span>
            </>
          ) : (
            <>
              <span className="text-on-surface-variant/60 mr-1">
                {game.seed1 || ""}
              </span>
              {shortName(game.team1)}
            </>
          )}
        </span>
        <span className="text-[10px] shrink-0">{pct1}%</span>
      </div>
      {/* Team 2 */}
      <div
        className={`flex items-center justify-between px-2 py-1 text-xs ${mirror ? "flex-row-reverse" : ""} ${
          team2IsWinner
            ? "text-on-surface font-semibold"
            : team2Eliminated
              ? "text-on-surface-variant/40 line-through"
              : "text-on-surface-variant"
        }`}
      >
        <span className="truncate">
          {mirror ? (
            <>
              {shortName(game.team2)}{" "}
              <span className="text-on-surface-variant/60 ml-1">
                {game.seed2 || ""}
              </span>
            </>
          ) : (
            <>
              <span className="text-on-surface-variant/60 mr-1">
                {game.seed2 || ""}
              </span>
              {shortName(game.team2)}
            </>
          )}
        </span>
        <span className="text-[10px] shrink-0">{pct2}%</span>
      </div>
      {/* ESPN link + status */}
      <div className="flex items-center justify-between px-2 pt-0.5 pb-1">
        {game.espn_url && isCompleted ? (
          <a
            href={game.espn_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[9px] text-on-surface-variant/50 hover:text-secondary transition-colors"
          >
            ESPN
          </a>
        ) : (
          <span />
        )}
        {isCompleted && (
          <span className="text-[9px] text-on-surface-variant/40">Final</span>
        )}
      </div>
      {/* Pick split bar */}
      <div className="flex h-1">
        <div
          className="bg-primary transition-all"
          style={{ width: `${pct1}%` }}
        />
        <div
          className="bg-secondary transition-all"
          style={{ width: `${pct2}%` }}
        />
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  ConnectorColumn — draws bracket tree lines between round columns  */
/* ------------------------------------------------------------------ */

function ConnectorColumn({
  gameCount,
  regionHeight,
  mirror = false,
}: {
  gameCount: number;
  regionHeight: number;
  mirror?: boolean;
}) {
  const pairs = gameCount / 2;

  return (
    <div
      className="flex flex-col shrink-0"
      style={{ height: regionHeight, width: CONNECTOR_W }}
    >
      {Array.from({ length: pairs }).map((_, i) => (
        <div key={i} className="flex-1 flex items-stretch">
          {mirror ? (
            /* RTL: horizontal stub on left, then bracket on right */
            <>
              <div className="flex items-center">
                <div className="h-px bg-on-surface-variant/40" style={{ width: CONNECTOR_W / 2 }} />
              </div>
              <div className="flex flex-col" style={{ width: CONNECTOR_W / 2 }}>
                <div className="flex-1 border-t border-l border-on-surface-variant/40 rounded-tl" />
                <div className="flex-1 border-b border-l border-on-surface-variant/40 rounded-bl" />
              </div>
            </>
          ) : (
            /* LTR: bracket on left, horizontal stub on right */
            <>
              <div className="flex flex-col" style={{ width: CONNECTOR_W / 2 }}>
                <div className="flex-1 border-t border-r border-on-surface-variant/40 rounded-tr" />
                <div className="flex-1 border-b border-r border-on-surface-variant/40 rounded-br" />
              </div>
              <div className="flex items-center">
                <div className="h-px bg-on-surface-variant/40" style={{ width: CONNECTOR_W / 2 }} />
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ColumnHeader — round label + point value for a single column      */
/* ------------------------------------------------------------------ */

function ColumnHeader({ round }: { round: Round }) {
  const pts = ROUND_POINTS[round];
  return (
    <div
      className="shrink-0 text-center py-1"
      style={{ width: GAME_W }}
    >
      <div className="text-[9px] font-label text-on-surface-variant/60 uppercase tracking-wider leading-tight">
        {SHORT_ROUND_LABELS[round] || round}
      </div>
      <div className="text-[9px] text-primary font-semibold leading-tight">
        {pts} pts
      </div>
    </div>
  );
}

function ConnectorHeaderSpacer() {
  return <div className="shrink-0" style={{ width: CONNECTOR_W, height: 1 }} />;
}

/* ------------------------------------------------------------------ */
/*  RegionBracket — one region as a horizontal bracket tree            */
/* ------------------------------------------------------------------ */

function RegionBracket({
  games,
  region,
  direction = "ltr",
  pickSplits,
  totalBrackets,
  eliminatedTeams,
  onGameClick,
}: {
  games: Game[];
  region: string;
  direction?: "ltr" | "rtl";
  pickSplits: Record<string, { team1Count: number; team2Count: number }>;
  totalBrackets: number;
  eliminatedTeams?: Set<string>;
  onGameClick?: (gameId: string) => void;
}) {
  const regionGames = useMemo(
    () => games.filter((g) => g.region === region),
    [games, region],
  );

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

  // Calculate region height based on R64 game count (or largest available round)
  const firstRound = activeRounds[0];
  const r64Count = roundGameMap[firstRound]?.length || 8;
  const regionHeight = r64Count * GAME_H + (r64Count - 1) * BASE_GAP;

  const isMirror = direction === "rtl";

  return (
    <div>
      {/* Region label */}
      <div
        className={`font-display text-[10px] font-semibold text-on-surface-variant/70 uppercase tracking-widest mb-1 px-1 ${isMirror ? "text-right" : ""}`}
      >
        {REGION_NAMES[region] || region}
      </div>

      <div className={`flex ${isMirror ? "flex-row-reverse" : ""} items-stretch`}>
        {activeRounds.map((round, ri) => (
          <div key={round} className="flex items-stretch shrink-0">
            {/* Connector BEFORE game column (only for RTL, rounds after the first) */}
            {isMirror && ri > 0 && (
              <ConnectorColumn
                gameCount={roundGameMap[activeRounds[ri - 1]]?.length || 0}
                regionHeight={regionHeight}
                mirror
              />
            )}

            {/* Games column */}
            <div
              className="flex flex-col justify-around shrink-0"
              style={{
                height: regionHeight,
                minHeight: regionHeight,
              }}
            >
              {roundGameMap[round].map((game) => (
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
                  onClick={
                    onGameClick
                      ? () => onGameClick(game.game_id)
                      : undefined
                  }
                  mirror={isMirror}
                />
              ))}
            </div>

            {/* Connector AFTER game column (only for LTR, not after last round) */}
            {!isMirror && ri < activeRounds.length - 1 && (
              <ConnectorColumn
                gameCount={roundGameMap[round]?.length || 0}
                regionHeight={regionHeight}
              />
            )}
          </div>
        ))}
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

  const regions = useMemo(() => {
    const regionSet = new Set<string>();
    for (const g of games) {
      if (g.region && !["FF", "CHAMP"].includes(g.round)) {
        regionSet.add(g.region);
      }
    }
    return Array.from(regionSet).sort();
  }, [games]);

  const hasFinalRounds = useMemo(
    () => games.some((g) => g.round === "FF" || g.round === "CHAMP"),
    [games],
  );

  const ffGames = useMemo(
    () =>
      games
        .filter((g) => g.round === "FF")
        .sort((a, b) => a.game_id.localeCompare(b.game_id)),
    [games],
  );

  const champGames = useMemo(
    () =>
      games
        .filter((g) => g.round === "CHAMP")
        .sort((a, b) => a.game_id.localeCompare(b.game_id)),
    [games],
  );

  if (games.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-on-surface-variant text-sm">No games to display.</p>
      </div>
    );
  }

  const hasR1 = regions.includes("R1");
  const hasR2 = regions.includes("R2");
  const hasR3 = regions.includes("R3");
  const hasR4 = regions.includes("R4");

  // Column header rounds for each side
  const leftRounds: Round[] = ["R64", "R32", "S16", "E8"];
  const rightRounds: Round[] = ["E8", "S16", "R32", "R64"];
  const centerRounds: Round[] = hasFinalRounds
    ? [
        ...(ffGames.length > 0 ? (["FF"] as Round[]) : []),
        ...(champGames.length > 0 ? (["CHAMP"] as Round[]) : []),
        ...(ffGames.length > 1 ? (["FF"] as Round[]) : []),
      ]
    : [];

  const ffLeft = ffGames[0];
  const ffRight = ffGames[1];

  // Calculate the total height for the left and right halves
  // Each side has two regions stacked with a gap between them
  const regionGap = 24;

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

      {/* Horizontally scrollable bracket — no inner vertical scroll */}
      <div ref={scrollRef} className="overflow-x-auto pb-4">
        {/* Column Headers — sticky to page top (52px navbar) */}
        <div className="flex items-end sticky top-[52px] z-10 bg-surface/95 backdrop-blur-sm pb-1 border-b border-on-surface-variant/10 mb-2">
          {/* Left side headers: R64 → R32 → S16 → E8 */}
          <div className="flex items-end">
            {leftRounds.map((round, i) => (
              <div key={`lh-${round}`} className="flex items-end">
                <ColumnHeader round={round} />
                {i < leftRounds.length - 1 && <ConnectorHeaderSpacer />}
              </div>
            ))}
          </div>

          {/* Center headers: FF → CHAMP → FF */}
          {hasFinalRounds && (
            <div className="flex items-end">
              {ffLeft && (
                <>
                  <ConnectorHeaderSpacer />
                  <ColumnHeader round="FF" />
                </>
              )}
              {champGames.length > 0 && (
                <>
                  <ConnectorHeaderSpacer />
                  <ColumnHeader round="CHAMP" />
                </>
              )}
              {ffRight && (
                <>
                  <ConnectorHeaderSpacer />
                  <ColumnHeader round="FF" />
                </>
              )}
            </div>
          )}

          {/* Right side headers: E8 → S16 → R32 → R64 */}
          <div className="flex items-end">
            {rightRounds.map((round, i) => (
              <div key={`rh-${i}-${round}`} className="flex items-end">
                {i === 0 && <ConnectorHeaderSpacer />}
                <ColumnHeader round={round} />
                {i < rightRounds.length - 1 && <ConnectorHeaderSpacer />}
              </div>
            ))}
          </div>
        </div>

        {/* Bracket body */}
        <div className="flex items-stretch">
          {/* LEFT HALF: East (top) + South (bottom) flowing L→R */}
          <div className="flex flex-col shrink-0" style={{ gap: regionGap }}>
            {hasR1 && (
              <RegionBracket
                games={games}
                region="R1"
                direction="ltr"
                pickSplits={pickSplits}
                totalBrackets={totalBrackets}
                eliminatedTeams={eliminatedTeams}
                onGameClick={onGameClick}
              />
            )}
            {hasR2 && (
              <RegionBracket
                games={games}
                region="R2"
                direction="ltr"
                pickSplits={pickSplits}
                totalBrackets={totalBrackets}
                eliminatedTeams={eliminatedTeams}
                onGameClick={onGameClick}
              />
            )}
          </div>

          {/* CENTER: Final Four + Championship */}
          {hasFinalRounds && (
            <div className="flex items-center shrink-0">
              {/* Left FF game */}
              {ffLeft && (
                <div className="flex items-stretch shrink-0">
                  {/* Connector from E8 left to FF left */}
                  <ConnectorColumn gameCount={2} regionHeight={GAME_H * 2 + BASE_GAP} />
                  <div
                    className="flex flex-col justify-around shrink-0"
                    style={{ height: GAME_H * 2 + BASE_GAP }}
                  >
                    <GameCell
                      game={ffLeft}
                      pickSplit={
                        pickSplits[ffLeft.game_id] || {
                          team1Count: 0,
                          team2Count: 0,
                        }
                      }
                      totalBrackets={totalBrackets}
                      eliminatedTeams={eliminatedTeams}
                      onClick={
                        onGameClick
                          ? () => onGameClick(ffLeft.game_id)
                          : undefined
                      }
                    />
                  </div>
                </div>
              )}

              {/* Championship */}
              {champGames.length > 0 && (
                <div className="flex items-stretch shrink-0">
                  {ffLeft && (
                    <ConnectorColumn gameCount={2} regionHeight={GAME_H * 2 + BASE_GAP} />
                  )}
                  <div
                    className="flex flex-col justify-around shrink-0"
                    style={{ height: GAME_H * 2 + BASE_GAP }}
                  >
                    {champGames.map((game) => (
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
                        onClick={
                          onGameClick
                            ? () => onGameClick(game.game_id)
                            : undefined
                        }
                      />
                    ))}
                  </div>
                  {ffRight && (
                    <ConnectorColumn gameCount={2} regionHeight={GAME_H * 2 + BASE_GAP} mirror />
                  )}
                </div>
              )}

              {/* Right FF game */}
              {ffRight && (
                <div className="flex items-stretch shrink-0">
                  <div
                    className="flex flex-col justify-around shrink-0"
                    style={{ height: GAME_H * 2 + BASE_GAP }}
                  >
                    <GameCell
                      game={ffRight}
                      pickSplit={
                        pickSplits[ffRight.game_id] || {
                          team1Count: 0,
                          team2Count: 0,
                        }
                      }
                      totalBrackets={totalBrackets}
                      eliminatedTeams={eliminatedTeams}
                      onClick={
                        onGameClick
                          ? () => onGameClick(ffRight.game_id)
                          : undefined
                      }
                      mirror
                    />
                  </div>
                  {/* Connector from FF right to E8 right */}
                  <ConnectorColumn gameCount={2} regionHeight={GAME_H * 2 + BASE_GAP} mirror />
                </div>
              )}
            </div>
          )}

          {/* RIGHT HALF: West (top) + Midwest (bottom) flowing R→L */}
          <div className="flex flex-col shrink-0" style={{ gap: regionGap }}>
            {hasR3 && (
              <RegionBracket
                games={games}
                region="R3"
                direction="rtl"
                pickSplits={pickSplits}
                totalBrackets={totalBrackets}
                eliminatedTeams={eliminatedTeams}
                onGameClick={onGameClick}
              />
            )}
            {hasR4 && (
              <RegionBracket
                games={games}
                region="R4"
                direction="rtl"
                pickSplits={pickSplits}
                totalBrackets={totalBrackets}
                eliminatedTeams={eliminatedTeams}
                onGameClick={onGameClick}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
