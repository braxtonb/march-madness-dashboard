"use client";

import { useState, useMemo } from "react";

interface ChampionFlowEntry {
  team: string;
  seed: number;
  count: number;
  logo?: string;
  alive: boolean;
}

interface ChampionSankeyProps {
  distribution: ChampionFlowEntry[];
  totalBrackets: number;
}

// Vibrant color palette
const SEED_COLORS: Record<number, string> = {
  1: "#00f4fe",   // cyan / secondary
  2: "#c97cff",   // purple / tertiary
  3: "#ff8c42",   // orange / primary
  4: "#2dd4bf",   // teal
  5: "#fb923c",   // amber
  6: "#f43f5e",   // rose
  7: "#a78bfa",   // violet
  8: "#34d399",   // emerald
  9: "#fbbf24",   // yellow
  10: "#f472b6",  // pink
  11: "#60a5fa",  // blue
  12: "#4ade80",  // green
  13: "#e879f9",  // fuchsia
  14: "#f97316",  // deep orange
  15: "#22d3ee",  // light cyan
  16: "#ef4444",  // red
};

function getSeedColor(seed: number): string {
  return SEED_COLORS[seed] || "#888";
}

export function ChampionSankey({ distribution, totalBrackets }: ChampionSankeyProps) {
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);

  // Group by seed
  const seedGroups = useMemo(() => {
    const groups = new Map<number, { seed: number; teams: ChampionFlowEntry[]; totalCount: number }>();
    for (const entry of distribution) {
      if (!groups.has(entry.seed)) {
        groups.set(entry.seed, { seed: entry.seed, teams: [], totalCount: 0 });
      }
      const g = groups.get(entry.seed)!;
      g.teams.push(entry);
      g.totalCount += entry.count;
    }
    return [...groups.values()].sort((a, b) => a.seed - b.seed);
  }, [distribution]);

  // Sort teams by count desc
  const sortedTeams = useMemo(
    () => [...distribution].sort((a, b) => b.count - a.count),
    [distribution]
  );

  // Layout constants
  const padding = { top: 20, right: 20, bottom: 20, left: 20 };
  const colWidth = 120;
  const gapWidth = 200;
  const chartWidth = padding.left + colWidth + gapWidth + colWidth + padding.right;
  const nodeGap = 4;
  const maxCount = totalBrackets || 1;

  const plotHeight = useMemo(
    () => Math.max(400, seedGroups.length * 40, sortedTeams.length * 28),
    [seedGroups.length, sortedTeams.length]
  );
  const chartHeight = plotHeight + padding.top + padding.bottom;

  const heightScale = useMemo(
    () => (count: number) => Math.max(4, (count / maxCount) * plotHeight * 0.85),
    [maxCount, plotHeight]
  );

  // Left column: seeds
  const leftNodes = useMemo(() => {
    const nodes: { seed: number; y: number; height: number; count: number; color: string }[] = [];
    let currentY = 0;
    for (const g of seedGroups) {
      const h = heightScale(g.totalCount);
      nodes.push({
        seed: g.seed,
        y: currentY,
        height: h,
        count: g.totalCount,
        color: getSeedColor(g.seed),
      });
      currentY += h + nodeGap;
    }
    const totalH = currentY - (nodes.length > 0 ? nodeGap : 0);
    const offset = Math.max(0, (plotHeight - totalH) / 2);
    return nodes.map((n) => ({ ...n, y: n.y + offset }));
  }, [seedGroups, plotHeight, heightScale]);

  // Right column: teams
  const rightNodes = useMemo(() => {
    const nodes: { team: string; seed: number; y: number; height: number; count: number; color: string; alive: boolean }[] = [];
    let currentY = 0;
    for (const t of sortedTeams) {
      const h = heightScale(t.count);
      nodes.push({
        team: t.team,
        seed: t.seed,
        y: currentY,
        height: h,
        count: t.count,
        color: getSeedColor(t.seed),
        alive: t.alive,
      });
      currentY += h + nodeGap;
    }
    const totalH = currentY - (nodes.length > 0 ? nodeGap : 0);
    const offset = Math.max(0, (plotHeight - totalH) / 2);
    return nodes.map((n) => ({ ...n, y: n.y + offset }));
  }, [sortedTeams, plotHeight, heightScale]);

  // Build lookup maps for connecting bands
  const leftNodeMap = useMemo(() => new Map(leftNodes.map((n) => [n.seed, n])), [leftNodes]);
  const rightNodeMap = useMemo(() => new Map(rightNodes.map((n) => [n.team, n])), [rightNodes]);

  // Build bands: each connects a seed node (left) to a team node (right)
  const bands = useMemo(() => {
    const consumed = new Map<number, number>();
    return sortedTeams.map((t) => {
      const leftNode = leftNodeMap.get(t.seed);
      const rightNode = rightNodeMap.get(t.team);
      if (!leftNode || !rightNode) return null;

      const bandHeight = heightScale(t.count);
      const c = consumed.get(t.seed) || 0;
      consumed.set(t.seed, c + bandHeight);

      const leftY = leftNode.y + c;
      const rightY = rightNode.y;

      return {
        team: t.team,
        seed: t.seed,
        count: t.count,
        color: getSeedColor(t.seed),
        leftY,
        rightY,
        height: bandHeight,
        alive: t.alive,
      };
    }).filter(Boolean) as {
      team: string;
      seed: number;
      count: number;
      color: string;
      leftY: number;
      rightY: number;
      height: number;
      alive: boolean;
    }[];
  }, [sortedTeams, leftNodeMap, rightNodeMap, heightScale]);

  // Early return for empty state (after all hooks)
  if (distribution.length === 0) {
    return (
      <div className="rounded-card bg-surface-container p-8 text-center">
        <p className="text-on-surface-variant text-sm">No champion pick data available.</p>
      </div>
    );
  }

  // SVG coordinates
  const leftX = padding.left;
  const rightX = padding.left + colWidth + gapWidth;
  const bandStartX = leftX + colWidth;
  const bandEndX = rightX;

  const isTeamHovered = (team: string) => hoveredTeam === team;
  const isSeedHovered = (seed: number) => {
    if (!hoveredTeam) return false;
    const t = sortedTeams.find((entry) => entry.team === hoveredTeam);
    return t?.seed === seed;
  };

  return (
    <div className="rounded-card bg-surface-container p-4 space-y-3">
      <div>
        <h4 className="font-display text-sm font-semibold text-on-surface">Champion Pick Flow</h4>
        <p className="text-[10px] text-on-surface-variant">
          How bracket champion picks flow from seeds to teams. Band width = number of brackets.
        </p>
      </div>

      <div className="overflow-x-auto -mx-4 px-4">
        <div className="min-w-[480px]">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto">
            <g transform={`translate(0, ${padding.top})`}>
              {/* Column labels */}
              <text
                x={leftX + colWidth / 2}
                y={-6}
                textAnchor="middle"
                className="fill-on-surface-variant text-[10px] font-semibold"
                style={{ fontSize: "10px" }}
              >
                Seed
              </text>
              <text
                x={rightX + colWidth / 2}
                y={-6}
                textAnchor="middle"
                className="fill-on-surface-variant text-[10px] font-semibold"
                style={{ fontSize: "10px" }}
              >
                Champion Pick
              </text>

              {/* Bands (connections) */}
              {bands.map((band) => {
                const highlighted = isTeamHovered(band.team) || !hoveredTeam;
                const dimmed = hoveredTeam && !isTeamHovered(band.team);

                // Bezier control points for smooth curve
                const midX = (bandStartX + bandEndX) / 2;
                const path = `
                  M ${bandStartX} ${band.leftY}
                  C ${midX} ${band.leftY}, ${midX} ${band.rightY}, ${bandEndX} ${band.rightY}
                  L ${bandEndX} ${band.rightY + band.height}
                  C ${midX} ${band.rightY + band.height}, ${midX} ${band.leftY + band.height}, ${bandStartX} ${band.leftY + band.height}
                  Z
                `;
                return (
                  <path
                    key={band.team}
                    d={path}
                    fill={band.color}
                    fillOpacity={dimmed ? 0.08 : highlighted ? 0.45 : 0.25}
                    stroke={band.color}
                    strokeWidth={dimmed ? 0 : 0.5}
                    strokeOpacity={0.3}
                    className="transition-all duration-200"
                    onMouseEnter={() => setHoveredTeam(band.team)}
                    onMouseLeave={() => setHoveredTeam(null)}
                  />
                );
              })}

              {/* Left nodes (seeds) */}
              {leftNodes.map((node) => {
                const highlighted = isSeedHovered(node.seed);
                return (
                  <g key={`seed-${node.seed}`}>
                    <rect
                      x={leftX}
                      y={node.y}
                      width={colWidth}
                      height={node.height}
                      rx={4}
                      fill={node.color}
                      fillOpacity={hoveredTeam ? (highlighted ? 0.6 : 0.15) : 0.35}
                      className="transition-all duration-200"
                    />
                    {node.height >= 14 && (
                      <text
                        x={leftX + 8}
                        y={node.y + node.height / 2 + 4}
                        className="fill-white text-[11px] font-semibold pointer-events-none"
                        style={{ fontSize: "11px" }}
                      >
                        #{node.seed} ({node.count})
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Right nodes (teams) */}
              {rightNodes.map((node) => {
                const highlighted = isTeamHovered(node.team);
                return (
                  <g
                    key={`team-${node.team}`}
                    onMouseEnter={() => setHoveredTeam(node.team)}
                    onMouseLeave={() => setHoveredTeam(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={rightX}
                      y={node.y}
                      width={colWidth}
                      height={node.height}
                      rx={4}
                      fill={node.color}
                      fillOpacity={hoveredTeam ? (highlighted ? 0.6 : 0.15) : 0.35}
                      className="transition-all duration-200"
                    />
                    {node.height >= 12 && (
                      <text
                        x={rightX + 8}
                        y={node.y + node.height / 2 + 4}
                        className="text-[10px] font-semibold pointer-events-none"
                        style={{
                          fontSize: "10px",
                          fill: node.alive ? "white" : "#999",
                          textDecoration: node.alive ? "none" : "line-through",
                        }}
                      >
                        {node.team} ({node.count})
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
