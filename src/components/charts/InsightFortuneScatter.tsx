"use client";

import { useState, useMemo } from "react";

interface ScatterPoint {
  name: string;
  skill: number;
  fortune: number;
  champion?: string;
  logo?: string;
}

interface Cluster {
  x: number; // average skill
  y: number; // average fortune
  points: ScatterPoint[];
}

/** Group nearby points into clusters (within `radius` units of each other) */
function clusterPoints(data: ScatterPoint[], radius: number = 5): Cluster[] {
  const clusters: Cluster[] = [];
  const used = new Set<number>();

  for (let i = 0; i < data.length; i++) {
    if (used.has(i)) continue;
    const group: ScatterPoint[] = [data[i]];
    used.add(i);

    for (let j = i + 1; j < data.length; j++) {
      if (used.has(j)) continue;
      const dx = data[i].skill - data[j].skill;
      const dy = data[i].fortune - data[j].fortune;
      if (Math.sqrt(dx * dx + dy * dy) <= radius) {
        group.push(data[j]);
        used.add(j);
      }
    }

    const avgX = group.reduce((s, p) => s + p.skill, 0) / group.length;
    const avgY = group.reduce((s, p) => s + p.fortune, 0) / group.length;
    clusters.push({ x: avgX, y: avgY, points: group });
  }

  return clusters;
}

export function InsightFortuneScatter({ data }: { data: ScatterPoint[] }) {
  const [hoveredCluster, setHoveredCluster] = useState<number | null>(null);
  const [pinnedCluster, setPinnedCluster] = useState<number | null>(null);

  const clusters = useMemo(() => clusterPoints(data, 6), [data]);

  // Chart dimensions
  const width = 700;
  const height = 500;
  const margin = { top: 30, right: 30, bottom: 50, left: 60 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const toX = (v: number) => margin.left + (v / 100) * plotW;
  const toY = (v: number) => margin.top + ((100 - v) / 100) * plotH;

  const activeCluster = pinnedCluster ?? hoveredCluster;

  // Click anywhere outside a cluster to dismiss pinned
  function handleBackgroundClick() {
    setPinnedCluster(null);
  }

  return (
    <div className="relative" onClick={handleBackgroundClick}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 500 }}>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={toX(v)} y1={margin.top} x2={toX(v)} y2={margin.top + plotH} stroke="#1e2a36" strokeWidth={v === 50 ? 1.5 : 0.5} />
            <line x1={margin.left} y1={toY(v)} x2={margin.left + plotW} y2={toY(v)} stroke="#1e2a36" strokeWidth={v === 50 ? 1.5 : 0.5} />
          </g>
        ))}

        {/* Quadrant labels */}
        <text x={toX(25)} y={toY(85)} textAnchor="middle" fill="#a7abb2" fontSize={10} opacity={0.5}>Upset Artists</text>
        <text x={toX(75)} y={toY(85)} textAnchor="middle" fill="#a7abb2" fontSize={10} opacity={0.5}>Sharp Chalk Pickers</text>
        <text x={toX(25)} y={toY(15)} textAnchor="middle" fill="#a7abb2" fontSize={10} opacity={0.5}>Bold Believers</text>
        <text x={toX(75)} y={toY(15)} textAnchor="middle" fill="#a7abb2" fontSize={10} opacity={0.5}>Playing It Safe</text>

        {/* Axis labels */}
        <text x={toX(50)} y={height - 8} textAnchor="middle" fill="#a7abb2" fontSize={12} fontFamily="Space Grotesk">
          Chalk Score →
        </text>
        <text x={14} y={toY(50)} textAnchor="middle" fill="#a7abb2" fontSize={12} fontFamily="Space Grotesk" transform={`rotate(-90, 14, ${toY(50)})`}>
          ↑ Upset Score
        </text>

        {/* Axis ticks */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={`tick-${v}`}>
            <text x={toX(v)} y={margin.top + plotH + 16} textAnchor="middle" fill="#a7abb2" fontSize={10}>{v}</text>
            <text x={margin.left - 8} y={toY(v) + 4} textAnchor="end" fill="#a7abb2" fontSize={10}>{v}</text>
          </g>
        ))}

        {/* Clusters */}
        {clusters.map((cluster, i) => {
          const cx = toX(cluster.x);
          const cy = toY(cluster.y);
          const isSingle = cluster.points.length === 1;
          const isActive = activeCluster === i;
          const point = cluster.points[0];

          return (
            <g
              key={i}
              onMouseEnter={() => setHoveredCluster(i)}
              onMouseLeave={() => setHoveredCluster(null)}
              onClick={(e) => { e.stopPropagation(); setPinnedCluster(pinnedCluster === i ? null : i); }}
              className="cursor-pointer"
            >
              {isSingle ? (
                <>
                  {point.logo ? (
                    <image x={cx - 12} y={cy - 12} width={24} height={24} href={point.logo} clipPath="circle(12px)" />
                  ) : (
                    <circle cx={cx} cy={cy} r={6} fill="#00f4fe" opacity={0.8} />
                  )}
                  <text x={cx} y={cy + 20} textAnchor="middle" fill="#a7abb2" fontSize={8} fontFamily="Inter">
                    {point.name.length > 18 ? point.name.slice(0, 17) + "…" : point.name}
                  </text>
                </>
              ) : (
                <>
                  <circle cx={cx} cy={cy} r={isActive ? 20 : 16} fill="#00f4fe" opacity={isActive ? 0.3 : 0.15} />
                  <circle cx={cx} cy={cy} r={isActive ? 18 : 14} fill="none" stroke="#00f4fe" strokeWidth={1} opacity={0.5} />
                  <text x={cx} y={cy + 4} textAnchor="middle" fill="#f0f4ff" fontSize={11} fontWeight="bold" fontFamily="Space Grotesk">
                    +{cluster.points.length}
                  </text>
                  <text x={cx} y={cy + 24} textAnchor="middle" fill="#a7abb2" fontSize={7} fontFamily="Inter">
                    brackets
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>

      {/* Popover for hovered/pinned cluster */}
      {activeCluster !== null && clusters[activeCluster] && clusters[activeCluster].points.length > 1 && (
        <div
          className="absolute z-50 bg-surface-container border border-outline rounded-card p-3 shadow-xl max-w-xs"
          style={{
            left: `${Math.min(85, Math.max(5, (clusters[activeCluster].x / 100) * 90))}%`,
            top: `${Math.min(70, Math.max(5, ((100 - clusters[activeCluster].y) / 100) * 80))}%`,
          }}
        >
          <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider mb-2">
            {clusters[activeCluster].points.length} brackets in this area
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {clusters[activeCluster].points.map((p) => (
              <div key={p.name} className="flex items-center gap-2 text-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.logo && <img src={p.logo} alt="" className="w-4 h-4 rounded-sm" />}
                <div className="min-w-0">
                  <div className="text-on-surface truncate">{p.name}</div>
                  <div className="text-[10px] text-on-surface-variant">
                    Chalk: {p.skill}% · Upset: {p.fortune}%
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-on-surface-variant mt-2 italic">Click to pin, click again to dismiss</p>
        </div>
      )}
    </div>
  );
}
