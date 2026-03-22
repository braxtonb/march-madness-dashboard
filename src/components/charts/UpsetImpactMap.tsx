"use client";

import { useState, useMemo, useCallback } from "react";
import type { Game, Round } from "@/lib/types";
import { ROUND_ORDER, ROUND_LABELS } from "@/lib/constants";

interface UpsetImpactMapProps {
  games: Game[];
  pickSplits: Record<string, { team1Count: number; team2Count: number }>;
  totalBrackets: number;
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
}

const ROUND_COLORS: Record<string, string> = {
  R64: "#ff8c42",
  R32: "#00f4fe",
  S16: "#c97cff",
  E8: "#2dd4bf",
  FF: "#fb923c",
  CHAMP: "#f43f5e",
};

export function UpsetImpactMap({ games, pickSplits, totalBrackets }: UpsetImpactMapProps) {
  const [hoveredUpset, setHoveredUpset] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

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

  // Chart dimensions
  const padding = { top: 30, right: 30, bottom: 50, left: 60 };
  const chartWidth = 700;
  const chartHeight = 400;
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // Scales
  const xScale = (roundIdx: number) => {
    if (activeRounds.length <= 1) return plotWidth / 2;
    const idx = activeRounds.indexOf(ROUND_ORDER[roundIdx]);
    if (idx < 0) return 0;
    return (idx / (activeRounds.length - 1)) * plotWidth;
  };

  const yScale = (seedDiff: number) => {
    return plotHeight - (seedDiff / maxSeedDiff) * plotHeight;
  };

  const sizeScale = (busted: number) => {
    const minR = 8;
    const maxR = 35;
    return minR + (busted / maxBusted) * (maxR - minR);
  };

  const hoveredData = hoveredUpset ? upsets.find((u) => u.gameId === hoveredUpset) : null;

  return (
    <div className="rounded-card bg-surface-container p-4 space-y-3">
      <div>
        <h4 className="font-display text-sm font-semibold text-on-surface">Upset Impact Map</h4>
        <p className="text-[10px] text-on-surface-variant">
          Bubble size = brackets busted. Higher = more surprising upset.
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
        <div className="relative min-w-[500px]">
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

              {/* X axis labels */}
              {activeRounds.map((r, i) => {
                const x = activeRounds.length <= 1 ? plotWidth / 2 : (i / (activeRounds.length - 1)) * plotWidth;
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

                return (
                  <g key={u.gameId}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill={color}
                      fillOpacity={isHovered ? 0.9 : 0.5}
                      stroke={color}
                      strokeWidth={isHovered ? 2 : 1}
                      strokeOpacity={isHovered ? 1 : 0.7}
                      className="transition-all duration-150 cursor-pointer"
                      onMouseEnter={() => setHoveredUpset(u.gameId)}
                      onMouseLeave={() => setHoveredUpset(null)}
                    />
                    {r >= 16 && (
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
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Tooltip */}
          {hoveredData && (
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
