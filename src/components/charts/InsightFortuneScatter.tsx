"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import MultiSelectSearch, { CHAMPION_GROUPS } from "@/components/ui/MultiSelectSearch";
import { useMyBracket } from "@/components/ui/MyBracketProvider";

const ARCHETYPE_COLORS: Record<string, string> = {
  Strategist: "#3b82f6",
  Visionary: "#a78bfa",
  Scout: "#2dd4bf",
  Original: "#fb923c",
  Analyst: "#06b6d4",
};

interface ScatterPoint {
  id?: string;
  name: string;
  owner?: string;
  full_name?: string;
  points?: number;
  skill: number;
  fortune: number;
  champion?: string;
  logo?: string;
  archetype?: string;
}

interface Cluster {
  x: number;
  y: number;
  points: ScatterPoint[];
}

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

type PointsOp = "gte" | "lte" | "eq";

export function InsightFortuneScatter({ data, eliminatedTeams = [] }: { data: ScatterPoint[]; eliminatedTeams?: string[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeCluster, setActiveCluster] = useState<number | null>(null);

  const { isMyBracket } = useMyBracket();
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);

  // Initialize from URL params (comma-separated bracket IDs for multi-select)
  const [nameFilter, setNameFilter] = useState<string[]>(() => {
    const v = searchParams.get("brackets");
    return v ? v.split(",").filter(Boolean) : [];
  });
  const [championFilter, setChampionFilter] = useState<string[]>(() => {
    const v = searchParams.get("champion");
    return v ? v.split(",").filter(Boolean) : [];
  });
  const [pointsFilter, setPointsFilter] = useState(searchParams.get("pts") || "");
  const [pointsOp, setPointsOp] = useState<PointsOp>((searchParams.get("ptsOp") as PointsOp) || "gte");

  function updateUrl(key: string, val: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (val) params.set(key, val);
    else params.delete(key);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function changeNameFilter(v: string[]) {
    setNameFilter(v);
    updateUrl("brackets", v.join(","));
  }
  function changeChampionFilter(v: string[]) { setChampionFilter(v); updateUrl("champion", v.join(",")); }
  function changePointsFilter(v: string) { setPointsFilter(v); updateUrl("pts", v); }
  function changePointsOp(v: PointsOp) { setPointsOp(v); updateUrl("ptsOp", v); }

  // Build options — use bracket ID as value for consistent deep linking
  const sheetOptions = useMemo(() =>
    data.map((d) => ({
      value: d.id || d.name,
      label: d.name,
      sublabel: d.full_name && d.full_name !== d.name ? d.full_name : undefined,
    })),
    [data]
  );

  // Build a lookup from bracket ID to ScatterPoint for filtering
  const idToPoint = useMemo(() => {
    const m = new Map<string, ScatterPoint>();
    for (const d of data) m.set(d.id || d.name, d);
    return m;
  }, [data]);

  const championOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of data) if (d.champion) map.set(d.champion, d.logo || "");
    const elim = new Set(eliminatedTeams || []);
    return [...map.entries()]
      .sort((a, b) => {
        const aAlive = !elim.has(a[0]);
        const bAlive = !elim.has(b[0]);
        if (aAlive !== bAlive) return aAlive ? -1 : 1;
        return a[0].localeCompare(b[0]);
      })
      .map(([c, logo]) => ({ value: c, label: c, logo, group: elim.has(c) ? "eliminated" : "alive" }));
  }, [data, eliminatedTeams]);

  // Apply filters
  const filtered = useMemo(() => {
    return data.filter((d) => {
      if (nameFilter.length > 0) {
        const bracketId = d.id || d.name;
        if (!nameFilter.includes(bracketId)) return false;
      }
      if (championFilter.length > 0) {
        if (!d.champion || !championFilter.includes(d.champion)) return false;
      }
      if (pointsFilter) {
        const val = parseInt(pointsFilter);
        if (!isNaN(val) && d.points != null) {
          if (pointsOp === "gte" && d.points < val) return false;
          if (pointsOp === "lte" && d.points > val) return false;
          if (pointsOp === "eq" && d.points !== val) return false;
        }
      }
      return true;
    });
  }, [data, nameFilter, championFilter, pointsFilter, pointsOp]);

  const hasFilters = nameFilter.length > 0 || championFilter.length > 0 || pointsFilter;

  function clearAll() {
    setNameFilter([]); setChampionFilter([]); setPointsFilter("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("brackets"); params.delete("champion"); params.delete("pts"); params.delete("ptsOp");
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  const clusters = useMemo(() => clusterPoints(filtered, 6), [filtered]);

  const width = 700;
  const height = 500;
  const margin = { top: 30, right: 30, bottom: 50, left: 60 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const toX = (v: number) => margin.left + (v / 100) * plotW;
  const toY = (v: number) => margin.top + ((100 - v) / 100) * plotH;

  return (
    <div className="space-y-4">
      {/* Filters — fixed-height row, no layout shift */}
      <div className="flex flex-wrap items-center gap-2">
        <MultiSelectSearch
          mode="multi"
          label="Brackets"
          options={sheetOptions}
          selected={nameFilter}
          onSelectedChange={changeNameFilter}
          searchable
        />
        <MultiSelectSearch
          mode="multi"
          label="Champions"
          options={championOptions}
          selected={championFilter}
          onSelectedChange={changeChampionFilter}
          groups={CHAMPION_GROUPS}
        />
        <div className="flex gap-1 items-center">
          <div className="flex rounded-lg bg-surface-container border border-outline overflow-hidden min-h-[36px]">
            {([["gte", "\u2265"], ["lte", "\u2264"], ["eq", "="]] as const).map(([op, symbol]) => (
              <button
                key={op}
                type="button"
                onClick={() => changePointsOp(op)}
                className={`px-2.5 py-1.5 text-xs font-label transition-colors ${
                  pointsOp === op
                    ? "bg-primary/15 text-primary"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {symbol}
              </button>
            ))}
          </div>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pointsFilter}
            onChange={(e) => changePointsFilter(e.target.value.replace(/\D/g, ""))}
            placeholder="Pts"
            className="rounded-lg bg-surface-container border border-outline px-3 py-1.5 text-sm text-on-surface outline-none focus:border-primary/50 transition-colors w-16 min-h-[36px]"
          />
        </div>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-xs font-label text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Clear all
          </button>
        )}
        <span className="text-xs text-on-surface-variant ml-auto">
          {filtered.length}/{data.length}
        </span>
      </div>

      {/* Chart */}
      <div className="relative" onClick={() => setActiveCluster(null)}>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 500 }}>
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line x1={toX(v)} y1={margin.top} x2={toX(v)} y2={margin.top + plotH} stroke="#1e2a36" strokeWidth={v === 50 ? 1.5 : 0.5} />
              <line x1={margin.left} y1={toY(v)} x2={margin.left + plotW} y2={toY(v)} stroke="#1e2a36" strokeWidth={v === 50 ? 1.5 : 0.5} />
            </g>
          ))}
          <text x={toX(25)} y={toY(85)} textAnchor="middle" fill="#a7abb2" fontSize={10} opacity={0.5}>Upset Artists</text>
          <text x={toX(75)} y={toY(85)} textAnchor="middle" fill="#a7abb2" fontSize={10} opacity={0.5}>Sharp Chalk Pickers</text>
          <text x={toX(25)} y={toY(15)} textAnchor="middle" fill="#a7abb2" fontSize={10} opacity={0.5}>Bold Believers</text>
          <text x={toX(75)} y={toY(15)} textAnchor="middle" fill="#a7abb2" fontSize={10} opacity={0.5}>Playing It Safe</text>
          <text x={toX(50)} y={height - 8} textAnchor="middle" fill="#a7abb2" fontSize={12} fontFamily="Space Grotesk">Chalk Score →</text>
          <text x={14} y={toY(50)} textAnchor="middle" fill="#a7abb2" fontSize={12} fontFamily="Space Grotesk" transform={`rotate(-90, 14, ${toY(50)})`}>↑ Upset Score</text>
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={`tick-${v}`}>
              <text x={toX(v)} y={margin.top + plotH + 16} textAnchor="middle" fill="#a7abb2" fontSize={10}>{v}</text>
              <text x={margin.left - 8} y={toY(v) + 4} textAnchor="end" fill="#a7abb2" fontSize={10}>{v}</text>
            </g>
          ))}
          {clusters.map((cluster, i) => {
            const cx = toX(cluster.x);
            const cy = toY(cluster.y);
            const isSingle = cluster.points.length === 1;
            const isActive = activeCluster === i;
            const point = cluster.points[0];
            const dotColor = isSingle ? (ARCHETYPE_COLORS[point.archetype || ""] || "#00f4fe") : "#00f4fe";
            const isMine = isSingle && point.id && isMyBracket(point.id);
            const isHovered = isSingle && hoveredPoint === (point.id || point.name);
            return (
              <g
                key={i}
                onClick={(e) => { e.stopPropagation(); setActiveCluster(activeCluster === i ? null : i); }}
                onMouseEnter={() => isSingle && setHoveredPoint(point.id || point.name)}
                onMouseLeave={() => setHoveredPoint(null)}
                className="cursor-pointer"
              >
                {isSingle ? (
                  <>
                    {isMine && <circle cx={cx} cy={cy} r={16} fill={dotColor} opacity={0.15} />}
                    {point.logo ? (
                      <>
                        <circle cx={cx} cy={cy} r={isMine ? 16 : 14} fill="#111820" stroke={isMine ? "#fff" : dotColor} strokeWidth={isMine ? 2 : 1} opacity={isHovered ? 1 : 0.9} />
                        <image x={cx - (isMine ? 13 : 11)} y={cy - (isMine ? 13 : 11)} width={isMine ? 26 : 22} height={isMine ? 26 : 22} href={point.logo} clipPath={`circle(${isMine ? 13 : 11}px at ${isMine ? 13 : 11}px ${isMine ? 13 : 11}px)`} />
                      </>
                    ) : (
                      <circle cx={cx} cy={cy} r={isMine ? 8 : 6} fill={dotColor} opacity={isHovered ? 1 : 0.8} stroke={isMine ? "#fff" : "none"} strokeWidth={isMine ? 1.5 : 0} />
                    )}
                    {(isHovered || isMine) && (
                      <text x={cx} y={cy - (isMine ? 18 : 14)} textAnchor="middle" fill="#f0f4ff" fontSize={9} fontFamily="Inter" fontWeight={isMine ? "bold" : "normal"}>
                        {point.name.length > 20 ? point.name.slice(0, 19) + "\u2026" : point.name}
                      </text>
                    )}
                  </>
                ) : (
                  <>
                    <circle cx={cx} cy={cy} r={isActive ? 20 : 16} fill="#00f4fe" opacity={isActive ? 0.3 : 0.15} />
                    <circle cx={cx} cy={cy} r={isActive ? 18 : 14} fill="none" stroke="#00f4fe" strokeWidth={1} opacity={0.5} />
                    <text x={cx} y={cy + 5} textAnchor="middle" fill="#f0f4ff" fontSize={11} fontWeight="bold" fontFamily="Space Grotesk">
                      +{cluster.points.length}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* Archetype legend */}
        <div className="flex items-center gap-3 flex-wrap mt-2">
          <span className="text-[10px] text-on-surface-variant font-label">Archetype:</span>
          {Object.entries(ARCHETYPE_COLORS).map(([name, color]) => (
            <span key={name} className="flex items-center gap-1 text-[10px] text-on-surface-variant">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              {name}
            </span>
          ))}
        </div>

        {/* Popover for clusters */}
        {activeCluster !== null && clusters[activeCluster] && (
          <div
            className="absolute z-50 bg-surface-container border border-outline rounded-card p-3 shadow-xl max-w-xs"
            onClick={(e) => e.stopPropagation()}
            style={{
              left: `${Math.min(85, Math.max(5, (clusters[activeCluster].x / 100) * 90))}%`,
              top: `${Math.min(70, Math.max(5, ((100 - clusters[activeCluster].y) / 100) * 80))}%`,
            }}
          >
            <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider mb-2">
              {clusters[activeCluster].points.length} bracket{clusters[activeCluster].points.length > 1 ? "s" : ""} here
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {clusters[activeCluster].points.map((p) => (
                <div key={p.name} className="flex items-center gap-2 text-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.logo && <img src={p.logo} alt="" className="w-5 h-5 rounded-full bg-on-surface/10 p-[2px]" />}
                  <div className="min-w-0">
                    <div className="font-semibold text-on-surface truncate">{p.name}</div>
                    {p.full_name && p.full_name !== p.name && (
                      <div className="text-[10px] text-on-surface-variant truncate">{p.full_name}</div>
                    )}
                    <div className="text-[10px] text-on-surface-variant truncate">
                      {p.points != null ? `${p.points} pts` : ""}
                    </div>
                    <div className="text-[10px] text-on-surface-variant flex items-center gap-1">
                      {p.archetype && <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ARCHETYPE_COLORS[p.archetype] || "#888" }} />}
                      {p.archetype || ""} · Chalk: {p.skill}% · Upset: {p.fortune}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
