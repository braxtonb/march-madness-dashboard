"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import type { Game, Round } from "@/lib/types";
import { ROUND_ORDER, ROUND_LABELS } from "@/lib/constants";

interface BustedBracketInfo {
  name: string;
  fullName: string;
}

interface UpsetImpactMapProps {
  games: Game[];
  pickSplits: Record<string, { team1Count: number; team2Count: number }>;
  totalBrackets: number;
  /** Optional: bracket names who picked the losing team per game. Key = game_id */
  bustedBracketsMap?: Record<string, BustedBracketInfo[]>;
}

interface UpsetData {
  gameId: string;
  round: Round;
  roundIndex: number;
  winnerName: string;
  winnerSeed: number;
  loserName: string;
  loserSeed: number;
  seedDiff: number;
  bustedCount: number;
  score?: string;
}

const ROUND_COLORS: Record<string, string> = {
  R64: "#ff8c42",
  R32: "#00f4fe",
  S16: "#c97cff",
  E8: "#2dd4bf",
  FF: "#fb923c",
  CHAMP: "#f43f5e",
};

export function UpsetImpactMap({ games, pickSplits, totalBrackets, bustedBracketsMap }: UpsetImpactMapProps) {
  const [selectedUpset, setSelectedUpset] = useState<string | null>(null);
  const [hoveredUpset, setHoveredUpset] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    if (!selectedUpset) return;
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setSelectedUpset(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [selectedUpset]);

  const upsets = useMemo(() => {
    const results: UpsetData[] = [];
    for (const game of games) {
      if (!game.completed || !game.winner) continue;
      const winnerSeed = game.winner === game.team1 ? game.seed1 : game.seed2;
      const loserSeed = game.winner === game.team1 ? game.seed2 : game.seed1;
      const loserName = game.winner === game.team1 ? game.team2 : game.team1;

      // Upset = higher seed number beat lower seed number
      if (winnerSeed <= loserSeed) continue;

      const seedDiff = winnerSeed - loserSeed;
      const roundIndex = ROUND_ORDER.indexOf(game.round as Round);
      if (roundIndex < 0) continue;

      // Count brackets that picked the losing team (busted) using pickSplits
      const split = pickSplits[game.game_id];
      const bustedCount = split
        ? (loserName === game.team1 ? split.team1Count : split.team2Count)
        : 0;

      results.push({
        gameId: game.game_id,
        round: game.round as Round,
        roundIndex,
        winnerName: game.winner,
        winnerSeed,
        loserName,
        loserSeed,
        seedDiff,
        bustedCount,
      });
    }
    return results;
  }, [games, pickSplits]);

  const maxBusted = useMemo(() => Math.max(1, ...upsets.map((u) => u.bustedCount)), [upsets]);
  const maxSeedDiff = useMemo(() => Math.max(1, ...upsets.map((u) => u.seedDiff)), [upsets]);

  // Active rounds (rounds that have upsets)
  const activeRounds = useMemo(
    () => ROUND_ORDER.filter((r) => upsets.some((u) => u.round === r)),
    [upsets]
  );

  // Determine the top N most impactful upsets per round for labeling
  const labeledUpsets = useMemo(() => {
    const labeled = new Set<string>();
    for (const r of activeRounds) {
      const roundUpsets = upsets
        .filter((u) => u.round === r)
        .sort((a, b) => b.bustedCount - a.bustedCount);
      // Label top 2 per round (or top 1 if few)
      const topN = Math.min(2, roundUpsets.length);
      for (let i = 0; i < topN; i++) {
        if (roundUpsets[i].bustedCount > 0) {
          labeled.add(roundUpsets[i].gameId);
        }
      }
    }
    return labeled;
  }, [upsets, activeRounds]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGElement>) => {
    const svg = e.currentTarget.closest("svg");
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  if (upsets.length === 0) {
    return (
      <div className="rounded-card bg-surface-container p-8 text-center">
        <p className="text-on-surface-variant text-sm">No upsets have occurred yet.</p>
      </div>
    );
  }

  // Chart dimensions - compact
  const padding = { top: 30, right: 20, bottom: 50, left: 50 };
  const chartWidth = 550;
  const chartHeight = 380;
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // Scales — use column-based layout with even spacing
  const colWidth = activeRounds.length > 1 ? plotWidth / activeRounds.length : plotWidth;
  const xScale = (roundIdx: number) => {
    const idx = activeRounds.indexOf(ROUND_ORDER[roundIdx]);
    if (idx < 0) return 0;
    return (idx + 0.5) * colWidth;
  };

  const yScale = (seedDiff: number) => {
    return plotHeight - (seedDiff / maxSeedDiff) * plotHeight;
  };

  const sizeScale = (busted: number) => {
    const minR = 6;
    const maxR = 30;
    return minR + (busted / maxBusted) * (maxR - minR);
  };

  const hoveredData = hoveredUpset ? upsets.find((u) => u.gameId === hoveredUpset) : null;
  const selectedData = selectedUpset ? upsets.find((u) => u.gameId === selectedUpset) : null;
  const selectedBrackets = selectedUpset && bustedBracketsMap ? bustedBracketsMap[selectedUpset] : null;

  return (
    <div className="rounded-card bg-surface-container p-4 space-y-3">
      <div>
        <h4 className="font-display text-sm font-semibold text-on-surface">Upset Impact Map</h4>
        <p className="text-[10px] text-on-surface-variant">
          Bubble size = brackets busted. Higher = more surprising upset. Click a bubble for details.
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {activeRounds.map((r) => (
          <div key={r} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: ROUND_COLORS[r] || "#666" }}
            />
            <span className="text-[10px] text-on-surface-variant">{ROUND_LABELS[r as Round]}</span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto -mx-4 px-4">
        <div className="relative max-w-xl mx-auto">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto"
            onMouseMove={handleMouseMove}
          >
            <g transform={`translate(${padding.left}, ${padding.top})`}>
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                const y = frac * plotHeight;
                const val = Math.round(maxSeedDiff * (1 - frac));
                return (
                  <g key={frac}>
                    <line
                      x1={0}
                      x2={plotWidth}
                      y1={y}
                      y2={y}
                      stroke="currentColor"
                      className="text-on-surface-variant/10"
                      strokeDasharray="4,4"
                    />
                    <text
                      x={-8}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-on-surface-variant text-[10px]"
                      style={{ fontSize: "10px" }}
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Column backgrounds for each round */}
              {activeRounds.map((r, i) => (
                <rect
                  key={r}
                  x={i * colWidth}
                  y={0}
                  width={colWidth}
                  height={plotHeight}
                  fill={ROUND_COLORS[r] || "#666"}
                  fillOpacity={0.03}
                />
              ))}

              {/* X axis labels */}
              {activeRounds.map((r, i) => {
                const x = (i + 0.5) * colWidth;
                return (
                  <text
                    key={r}
                    x={x}
                    y={plotHeight + 30}
                    textAnchor="middle"
                    className="fill-on-surface-variant text-[10px]"
                    style={{ fontSize: "10px" }}
                  >
                    {ROUND_LABELS[r as Round]}
                  </text>
                );
              })}

              {/* Y axis label */}
              <text
                x={-padding.left + 10}
                y={plotHeight / 2}
                textAnchor="middle"
                transform={`rotate(-90, ${-padding.left + 10}, ${plotHeight / 2})`}
                className="fill-on-surface-variant text-[10px]"
                style={{ fontSize: "10px" }}
              >
                Seed Differential
              </text>

              {/* Bubbles */}
              {upsets.map((u) => {
                const cx = xScale(u.roundIndex);
                const cy = yScale(u.seedDiff);
                const r = sizeScale(u.bustedCount);
                const color = ROUND_COLORS[u.round] || "#666";
                const isHovered = hoveredUpset === u.gameId;
                const isSelected = selectedUpset === u.gameId;
                const isHighlighted = isHovered || isSelected;
                const showLabel = labeledUpsets.has(u.gameId);

                return (
                  <g key={u.gameId}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill={color}
                      fillOpacity={isHighlighted ? 0.9 : 0.5}
                      stroke={color}
                      strokeWidth={isHighlighted ? 2.5 : 1}
                      strokeOpacity={isHighlighted ? 1 : 0.7}
                      className="transition-all duration-150 cursor-pointer"
                      onMouseEnter={() => setHoveredUpset(u.gameId)}
                      onMouseLeave={() => setHoveredUpset(null)}
                      onClick={() => setSelectedUpset(selectedUpset === u.gameId ? null : u.gameId)}
                    />
                    {/* Busted count inside large bubbles */}
                    {r >= 14 && (
                      <text
                        x={cx}
                        y={cy + 3.5}
                        textAnchor="middle"
                        className="fill-white text-[9px] pointer-events-none font-semibold"
                        style={{ fontSize: "9px" }}
                      >
                        {u.bustedCount}
                      </text>
                    )}
                    {/* Team name label for top upsets */}
                    {showLabel && (
                      <text
                        x={cx}
                        y={cy - r - 4}
                        textAnchor="middle"
                        className="fill-on-surface-variant text-[9px] pointer-events-none"
                        style={{ fontSize: "9px" }}
                      >
                        ({u.winnerSeed}) {u.winnerName}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Hover tooltip */}
          {hoveredData && !selectedUpset && (
            <div
              className="absolute pointer-events-none z-20 bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 shadow-lg text-xs"
              style={{
                left: Math.min(tooltipPos.x + 12, chartWidth - 200),
                top: tooltipPos.y - 60,
              }}
            >
              <p className="font-semibold text-on-surface">
                ({hoveredData.winnerSeed}) {hoveredData.winnerName} upset ({hoveredData.loserSeed}) {hoveredData.loserName}
              </p>
              <p className="text-on-surface-variant mt-0.5">
                {ROUND_LABELS[hoveredData.round]} &middot; Seed diff: {hoveredData.seedDiff}
              </p>
              <p className="text-error mt-0.5">
                Busted {hoveredData.bustedCount} of {totalBrackets} brackets
              </p>
              <p className="text-on-surface-variant/60 mt-1 text-[10px]">Click for details</p>
            </div>
          )}

          {/* Click popover with bracket list */}
          {selectedData && (
            <div
              ref={popoverRef}
              className="absolute z-30 bg-surface-bright border border-outline-variant rounded-lg px-4 py-3 shadow-xl text-xs w-64"
              style={{
                left: Math.min(
                  Math.max(8, ((xScale(selectedData.roundIndex) + padding.left) / chartWidth) * 100 * 5.5 / 100),
                  280
                ),
                top: Math.max(8, ((yScale(selectedData.seedDiff) + padding.top) / chartHeight) * 100 * 3.8 / 100 - 20),
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-on-surface">
                  ({selectedData.winnerSeed}) {selectedData.winnerName}
                </p>
                <button
                  onClick={() => setSelectedUpset(null)}
                  className="text-on-surface-variant hover:text-on-surface p-0.5"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <p className="text-on-surface-variant">
                upset ({selectedData.loserSeed}) {selectedData.loserName}
              </p>
              <p className="text-on-surface-variant mt-1">
                {ROUND_LABELS[selectedData.round]} &middot; Seed diff: {selectedData.seedDiff}
              </p>
              <p className="text-error mt-1 font-semibold">
                Busted {selectedData.bustedCount} of {totalBrackets} brackets
              </p>

              {selectedBrackets && selectedBrackets.length > 0 && (
                <div className="mt-2 pt-2 border-t border-outline-variant/30">
                  <p className="text-on-surface-variant text-[10px] font-label mb-1">Affected brackets:</p>
                  <div className="max-h-32 overflow-y-auto space-y-0.5">
                    {selectedBrackets.map((b, i) => (
                      <div key={i} className="text-[11px] text-on-surface truncate">
                        {b.name}
                        {b.fullName && b.fullName !== b.name && (
                          <span className="text-on-surface-variant ml-1">({b.fullName})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!selectedBrackets && (
                <p className="text-on-surface-variant/50 text-[10px] mt-2 italic">
                  Bracket details not available
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
