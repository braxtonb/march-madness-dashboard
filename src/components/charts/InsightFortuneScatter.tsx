"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { displayName } from "@/lib/constants";
import MultiSelectSearch from "@/components/ui/MultiSelectSearch";

interface ScatterPoint {
  name: string;
  owner?: string;
  full_name?: string;
  points?: number;
  skill: number;
  fortune: number;
  champion?: string;
  logo?: string;
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

export function InsightFortuneScatter({ data }: { data: ScatterPoint[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeCluster, setActiveCluster] = useState<number | null>(null);

  // Initialize from URL params (comma-separated for multi-select)
  const [nameFilter, setNameFilter] = useState<string[]>(() => {
    const v = searchParams.get("search");
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
    updateUrl("search", v.join(","));
  }
  function changeChampionFilter(v: string[]) { setChampionFilter(v); updateUrl("champion", v.join(",")); }
  function changePointsFilter(v: string) { setPointsFilter(v); updateUrl("pts", v); }
  function changePointsOp(v: PointsOp) { setPointsOp(v); updateUrl("ptsOp", v); }

  // Build options
  const sheetOptions = useMemo(() =>
    data.map((d) => ({ value: d.name, label: displayName(d), sublabel: d.name })),
    [data]
  );

  const championOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of data) if (d.champion) map.set(d.champion, d.logo || "");
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([c, logo]) => ({ value: c, label: c, logo }));
  }, [data]);

  // Apply filters
  const filtered = useMemo(() => {
    return data.filter((d) => {
      if (nameFilter.length > 0) {
        if (!nameFilter.includes(d.name)) return false;
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
    params.delete("search"); params.delete("champion"); params.delete("pts"); params.delete("ptsOp");
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
            return (
              <g key={i} onClick={(e) => { e.stopPropagation(); setActiveCluster(activeCluster === i ? null : i); }} className="cursor-pointer">
                {isSingle ? (
                  <>
                    {point.logo ? (
                      <image x={cx - 12} y={cy - 12} width={24} height={24} href={point.logo} />
                    ) : (
                      <circle cx={cx} cy={cy} r={6} fill="#00f4fe" opacity={0.8} />
                    )}
                    <text x={cx} y={cy + 20} textAnchor="middle" fill="#a7abb2" fontSize={8} fontFamily="Inter">
                      {(() => { const dn = displayName(point); return dn.length > 18 ? dn.slice(0, 17) + "\u2026" : dn; })()}
                    </text>
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
                    <div className="text-on-surface truncate">{displayName(p)}</div>
                    <div className="text-[10px] text-on-surface-variant truncate">
                      {p.name}{p.points != null ? ` · ${p.points} pts` : ""}
                    </div>
                    <div className="text-[10px] text-on-surface-variant">
                      Chalk: {p.skill}% · Upset: {p.fortune}%
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
