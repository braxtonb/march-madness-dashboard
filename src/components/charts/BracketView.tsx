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
  /** When set, highlights which team this bracket picked in each game */
  highlightBracketPicks?: Record<string, string>;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const GAME_H = 56;
const GAME_W = 170;
const BASE_GAP = 44; // vertical gap between R64 games — R32 nests between parents via z-index
const REGION_GAP = 32;
const CENTER_GAP = 8; // gap between FF/Champ games in center section
const SECTION_GAP = 8; // gap between left/center and center/right sections

/** Per-round x-offsets (LTR direction, from outer edge toward center) */
const ROUND_X: Record<string, number> = { R64: 0, R32: 150, S16: 300, E8: 380 };
const MAX_ROUND_X = 380; // rightmost regional round offset

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
  bracketPick,
}: {
  game: Game;
  pickSplit: { team1Count: number; team2Count: number };
  totalBrackets: number;
  eliminatedTeams?: Set<string>;
  onClick?: () => void;
  mirror?: boolean;
  /** The team this bracket picked for this game (if filtering by bracket) */
  bracketPick?: string;
}) {
  const total = pickSplit.team1Count + pickSplit.team2Count;
  const pct1 = total > 0 ? Math.round((pickSplit.team1Count / total) * 100) : 50;
  const pct2 = total > 0 ? 100 - pct1 : 50;
  const isTBD = !game.team1 && !game.team2;
  const isCompleted = game.completed;

  if (isTBD) {
    return (
      <div
        className="rounded border border-outline-variant/30 bg-surface-container/80 opacity-70 text-left shrink-0"
        style={{ width: GAME_W }}
      >
        <div className="flex items-center justify-between px-2 py-1 text-xs border-b border-outline-variant/10">
          <span className="text-on-surface-variant/50">TBD</span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 text-xs">
          <span className="text-on-surface-variant/50">TBD</span>
        </div>
        {/* Placeholder row to match non-TBD card height */}
        <div className="px-2 pt-0.5 pb-1">
          <span className="text-[9px] invisible">.</span>
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

  // Determine the displayed pick: bracket pick if selected, otherwise consensus (most popular)
  const consensusPick = pickSplit.team1Count >= pickSplit.team2Count ? game.team1 : game.team2;
  const displayedPick = bracketPick || consensusPick;
  const isConsensusPick = !bracketPick;

  const team1IsPick = displayedPick === game.team1;
  const team2IsPick = displayedPick === game.team2;
  const hasPick = !!displayedPick && (team1IsPick || team2IsPick);

  // Determine pick outcome: correct (green), incorrect (red), or pending
  const pickCorrect = hasPick && isCompleted && displayedPick === game.winner;
  const pickIncorrect = hasPick && isCompleted && displayedPick !== game.winner;
  const pickPending = hasPick && !isCompleted;

  const borderClass = !isConsensusPick
    ? (pickCorrect ? "border-emerald-500/70" : pickIncorrect ? "border-red-400/40" : pickPending ? "border-secondary/60" : "border-on-surface-variant/40")
    : "border-on-surface-variant/40";

  const pickedTeamName = displayedPick ? shortName(displayedPick) : "";
  const opponentName = displayedPick === game.team1 ? shortName(game.team2) : shortName(game.team1);
  const pickLabel = isConsensusPick ? "Group" : "Pick";

  return (
    <button
      onClick={onClick}
      className={`block rounded border ${borderClass} bg-surface-container hover:bg-surface-bright transition-colors cursor-pointer shrink-0 ${mirror ? "text-right" : "text-left"}`}
      style={{ width: GAME_W }}
    >
      {/* Pick header — shows bracket pick or group consensus */}
      {hasPick && (
        <div className={`flex items-center justify-between px-2 py-0.5 text-[10px] font-label border-b border-outline-variant/20 ${
          isConsensusPick
            ? (pickCorrect ? "text-emerald-400/70" : pickIncorrect ? "text-red-400/50" : "text-on-surface-variant/60")
            : (pickCorrect ? "bg-emerald-500/10 text-emerald-400" : pickIncorrect ? "bg-red-400/10 text-red-400" : "bg-secondary/10 text-secondary")
        }`}>
          <span className="truncate">{pickLabel}: <span className="font-semibold">{pickedTeamName}</span> <span className="opacity-60">over {opponentName}</span></span>
          {pickCorrect && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M20 6L9 17l-5-5" /></svg>}
          {pickIncorrect && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>}
          {pickPending && !isConsensusPick && <span className="inline-block w-2 h-2 rounded-full bg-secondary shrink-0" />}
        </div>
      )}
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
      {/* ESPN link + status — fixed height so all cards match */}
      <div className="flex items-center justify-between px-2 pt-0.5 pb-1" style={{ minHeight: 16 }}>
        {game.espn_url && isCompleted ? (
          <a
            href={game.espn_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[10px] font-label text-on-surface-variant hover:text-secondary transition-colors"
          >
            ESPN
          </a>
        ) : (
          <span />
        )}
        {isCompleted ? (
          <span className="text-[9px] text-on-surface-variant/70">Final</span>
        ) : (
          <span className="text-[9px] text-on-surface-variant/70">Scheduled</span>
        )}
      </div>
    </button>
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
      <div className="inline-block rounded-full bg-surface-bright/80 px-2.5 py-0.5 text-[10px] font-label text-on-surface-variant uppercase tracking-wider leading-tight">
        {SHORT_ROUND_LABELS[round] || round}
      </div>
      <div className="text-[10px] text-primary font-bold mt-0.5 leading-tight">
        {pts} pts
      </div>
    </div>
  );
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
  highlightBracketPicks,
}: {
  games: Game[];
  region: string;
  direction?: "ltr" | "rtl";
  pickSplits: Record<string, { team1Count: number; team2Count: number }>;
  totalBrackets: number;
  eliminatedTeams?: Set<string>;
  onGameClick?: (gameId: string) => void;
  highlightBracketPicks?: Record<string, string>;
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

  const activeRounds = useMemo(
    () => REGION_ROUNDS.filter((r) => roundGameMap[r]),
    [roundGameMap],
  );

  // Calculate exact y-positions for each game — bracket tree alignment
  // Each subsequent round centers between its two parent games
  const gamePositions = useMemo(() => {
    if (activeRounds.length === 0) return {};
    const stride = GAME_H + BASE_GAP;
    const positions: Record<string, number[]> = {};

    // First round: evenly spaced by stride
    positions[activeRounds[0]] = Array.from(
      { length: roundGameMap[activeRounds[0]]?.length || 0 },
      (_, i) => i * stride,
    );

    // Subsequent rounds: center between parent pair
    for (let ri = 1; ri < activeRounds.length; ri++) {
      const prev = positions[activeRounds[ri - 1]];
      const next: number[] = [];
      for (let i = 0; i + 1 < prev.length; i += 2) {
        const center1 = prev[i] + GAME_H / 2;
        const center2 = prev[i + 1] + GAME_H / 2;
        next.push((center1 + center2) / 2 - GAME_H / 2);
      }
      positions[activeRounds[ri]] = next;
    }

    return positions;
  }, [activeRounds, roundGameMap]);

  if (activeRounds.length === 0) return null;

  // Calculate region height based on first round game count
  const firstRound = activeRounds[0];
  const r64Count = roundGameMap[firstRound]?.length || 8;
  const regionHeight = r64Count * GAME_H + (r64Count - 1) * BASE_GAP;

  const isMirror = direction === "rtl";

  return (
    <div>
      {/* Region label — prominent static block above bracket grid */}
      <div
        className={`font-display text-sm font-bold text-on-surface uppercase tracking-widest mb-3 px-1 ${isMirror ? "text-right" : ""}`}
      >
        <span className="inline-block border-b-2 border-primary pb-0.5">
          {REGION_NAMES[region] || region}
        </span>
      </div>

      <div
        className="relative"
        style={{
          height: regionHeight,
          width: GAME_W + MAX_ROUND_X,
        }}
      >
        {activeRounds.map((round, ri) => {
          const roundGames = roundGameMap[round];
          const yPositions = gamePositions[round] || [];
          const ltrX = ROUND_X[round] ?? ri * 80;
          const xOffset = isMirror ? MAX_ROUND_X - ltrX : ltrX;

          return (
            <div
              key={round}
              className="absolute top-0 pointer-events-none"
              style={{
                left: xOffset,
                width: GAME_W,
                height: regionHeight,
                zIndex: ri + 1, // later rounds render on top
              }}
            >
              {roundGames.map((game, gi) => (
                <div
                  key={game.game_id}
                  className="absolute pointer-events-auto"
                  style={{ top: yPositions[gi] ?? 0, width: GAME_W }}
                >
                  <GameCell
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
                    bracketPick={highlightBracketPicks?.[game.game_id]}
                  />
                </div>
              ))}
            </div>
          );
        })}
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
  highlightBracketPicks,
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
  const regionGap = REGION_GAP;

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

      {/* Bracket flows with page scroll — no separate scroll container */}
      <div ref={scrollRef} className="pb-4">
        {/* Column Headers — sticky, mirrors body flex layout exactly */}
        <div className="sticky top-[52px] z-10 bg-surface/95 backdrop-blur-sm pb-1 border-b border-on-surface-variant/10 mb-4">
          <div className="flex items-stretch" style={{ height: 40 }}>
            {/* Left header region — same width/positioning as left bracket body */}
            <div className="relative shrink-0" style={{ width: GAME_W + MAX_ROUND_X }}>
              {leftRounds.map((round) => (
                <div key={`lh-${round}`} className="absolute" style={{ left: ROUND_X[round] ?? 0, width: GAME_W, top: 0 }}>
                  <ColumnHeader round={round} />
                </div>
              ))}
            </div>
            {/* Center header — single "Final Rounds" spanning FF + Championship */}
            {hasFinalRounds && (() => {
              const centerItemCount = (ffLeft ? 1 : 0) + (champGames.length > 0 ? 1 : 0) + (ffRight ? 1 : 0);
              const centerContentWidth = centerItemCount * GAME_W + Math.max(0, centerItemCount - 1) * CENTER_GAP;
              return (
                <div className="shrink-0 text-center py-1 flex items-center justify-center" style={{ width: centerContentWidth, marginLeft: SECTION_GAP, marginRight: SECTION_GAP }}>
                  <div>
                    <div className="inline-block rounded-full bg-surface-bright/80 px-2.5 py-0.5 text-[10px] font-label text-on-surface-variant uppercase tracking-wider leading-tight">
                      Final Rounds
                    </div>
                    <div className="text-[10px] text-primary font-bold mt-0.5 leading-tight">
                      {ROUND_POINTS.FF}&ndash;{ROUND_POINTS.CHAMP} pts
                    </div>
                  </div>
                </div>
              );
            })()}
            {/* Right header region — same width/positioning as right bracket body */}
            <div className="relative shrink-0" style={{ width: GAME_W + MAX_ROUND_X }}>
              {rightRounds.map((round) => (
                <div key={`rh-${round}`} className="absolute" style={{ left: MAX_ROUND_X - (ROUND_X[round] ?? 0), width: GAME_W, top: 0 }}>
                  <ColumnHeader round={round} />
                </div>
              ))}
            </div>
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
                highlightBracketPicks={highlightBracketPicks}
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
                highlightBracketPicks={highlightBracketPicks}
              />
            )}
          </div>

          {/* CENTER: Final Four + Championship — no connector lines */}
          {hasFinalRounds && (
            <div className="flex items-center shrink-0" style={{ gap: CENTER_GAP, marginLeft: SECTION_GAP, marginRight: SECTION_GAP }}>
              {/* Left FF game */}
              {ffLeft && (
                <div
                  className="flex flex-col justify-evenly shrink-0"
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
                    bracketPick={highlightBracketPicks?.[ffLeft.game_id]}
                  />
                </div>
              )}

              {/* Championship */}
              {champGames.length > 0 && (
                <div
                  className="flex flex-col justify-evenly shrink-0"
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
                      bracketPick={highlightBracketPicks?.[game.game_id]}
                    />
                  ))}
                </div>
              )}

              {/* Right FF game */}
              {ffRight && (
                <div
                  className="flex flex-col justify-evenly shrink-0"
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
                    bracketPick={highlightBracketPicks?.[ffRight.game_id]}
                  />
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
                highlightBracketPicks={highlightBracketPicks}
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
                highlightBracketPicks={highlightBracketPicks}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
