"use client";

import { useMemo, useState, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useMyBracket } from "@/components/ui/MyBracketProvider";

interface Checkpoint {
  gameIndex: number;
  gameId: string;
  round: string;
  team1: string;
  seed1: number;
  team2: string;
  seed2: number;
  winner: string;
  completeDate: number;
}

interface BracketLine {
  bracketId: string;
  name: string;
  champion: string;
  eliminatedAtGame: number;
  probabilities: number[];
}

interface Props {
  checkpoints: Checkpoint[];
  lines: BracketLine[];
  teamColors: Record<string, string>;
  teamLogos: Record<string, string>;
  teamSeeds?: Record<string, number>;
  eliminatedTeams?: Set<string>;
  champions?: string[];
  totalBrackets?: number;
  submittedCount?: number;
}

const FALLBACK_COLOR = "#6b8a94";

/** Ensure a color is visible on dark backgrounds */
function ensureContrast(hex: string): string {
  if (!hex || !hex.startsWith("#")) return FALLBACK_COLOR;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (luminance < 0.15) {
    const lighten = (c: number) => Math.min(255, c + 80);
    return `#${lighten(r).toString(16).padStart(2, "0")}${lighten(g).toString(16).padStart(2, "0")}${lighten(b).toString(16).padStart(2, "0")}`;
  }
  return hex;
}

/** Shift a hex color's hue by a given amount (0-360) */
function shiftHue(hex: string, degrees: number): string {
  if (!hex || !hex.startsWith("#")) return hex;
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  h = ((h * 360 + degrees) % 360) / 360;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) { r = g = b = l; } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (c: number) => Math.round(c * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function ProbabilityJourneyChart({
  checkpoints,
  lines,
  teamColors,
  teamLogos,
  teamSeeds = {},
  eliminatedTeams,
  champions = [],
  totalBrackets = 0,
  submittedCount = 0,
}: Props) {
  const { myBracketId, hydrated } = useMyBracket();
  const [hoveredBracket, setHoveredBracket] = useState<string | null>(null);
  const [pinnedBrackets, setPinnedBrackets] = useState<Set<string>>(new Set());
  const [championFilter, setChampionFilter] = useState<string[]>(champions);
  const [bracketLimit, setBracketLimit] = useState<10 | 25 | 0>(10); // 0 = all

  // Available champions (sorted by count) with seeds and alive status
  const championOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of lines) {
      if (l.champion) counts.set(l.champion, (counts.get(l.champion) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({
        name,
        count,
        seed: teamSeeds[name] || 99,
        alive: !eliminatedTeams?.has(name),
      }))
      .sort((a, b) => a.seed - b.seed || a.name.localeCompare(b.name));
  }, [lines, teamSeeds, eliminatedTeams]);

  // Assign unique colors: brackets sharing a champion get hue-shifted variants
  const bracketColorMap = useMemo(() => {
    const byChampion = new Map<string, BracketLine[]>();
    for (const l of lines) {
      const arr = byChampion.get(l.champion) || [];
      arr.push(l);
      byChampion.set(l.champion, arr);
    }
    const colors = new Map<string, string>();
    for (const [champ, group] of byChampion) {
      const baseColor = ensureContrast(teamColors[champ] || FALLBACK_COLOR);
      if (group.length === 1) {
        colors.set(group[0].bracketId, baseColor);
      } else {
        // Spread hue across ±40 degrees for same-champion brackets
        const spread = Math.min(80, group.length * 12);
        const step = spread / group.length;
        const startOffset = -spread / 2;
        // Sort by current win% so top bracket gets the truest color
        const sorted = [...group].sort(
          (a, b) => (b.probabilities[b.probabilities.length - 1] || 0) - (a.probabilities[a.probabilities.length - 1] || 0)
        );
        sorted.forEach((l, i) => {
          const offset = i === 0 ? 0 : startOffset + step * i;
          colors.set(l.bracketId, ensureContrast(shiftHue(baseColor, offset)));
        });
      }
    }
    return colors;
  }, [lines, teamColors]);

  // Round boundary indices
  const roundBoundaries = useMemo(() => {
    const boundaries: { index: number; label: string }[] = [];
    let lastRound = "";
    for (const cp of checkpoints) {
      if (cp.round !== lastRound) {
        boundaries.push({ index: cp.gameIndex, label: cp.round });
        lastRound = cp.round;
      }
    }
    return boundaries;
  }, [checkpoints]);

  // Pool after champion filter (before limit)
  const filteredPool = useMemo(() => {
    if (championFilter.length > 0) {
      return lines.filter((l) => championFilter.includes(l.champion));
    }
    return lines;
  }, [lines, championFilter]);

  // Filter and sort lines with limit
  const visibleLines = useMemo(() => {
    if (bracketLimit === 0) return filteredPool;

    const sorted = [...filteredPool].sort(
      (a, b) => (b.probabilities[b.probabilities.length - 1] || 0) - (a.probabilities[a.probabilities.length - 1] || 0)
    );
    const topIds = new Set(sorted.slice(0, bracketLimit).map((l) => l.bracketId));
    // Always include my bracket and pinned brackets
    if (myBracketId) topIds.add(myBracketId);
    for (const pid of pinnedBrackets) topIds.add(pid);
    return filteredPool.filter((l) => topIds.has(l.bracketId));
  }, [filteredPool, bracketLimit, myBracketId, pinnedBrackets]);

  // Build chart data
  const chartData = useMemo(() => {
    const startingPct = Math.round((100 / lines.length) * 100) / 100;
    const data: Record<string, unknown>[] = [{
      gameIndex: -1,
      _label: "Start",
      _round: "",
      ...Object.fromEntries(visibleLines.map((l) => [l.bracketId, startingPct])),
    }];

    for (let i = 0; i < checkpoints.length; i++) {
      const cp = checkpoints[i];
      const point: Record<string, unknown> = {
        gameIndex: cp.gameIndex,
        _label: `${cp.winner} beat ${cp.winner === cp.team1 ? cp.team2 : cp.team1}`,
        _round: cp.round,
      };
      for (const l of visibleLines) {
        point[l.bracketId] = l.probabilities[i] ?? 0;
      }
      data.push(point);
    }
    return data;
  }, [checkpoints, visibleLines, lines.length]);

  const getColor = useCallback(
    (line: BracketLine) => bracketColorMap.get(line.bracketId) || FALLBACK_COLOR,
    [bracketColorMap]
  );

  const toggleChampion = useCallback((name: string) => {
    setChampionFilter((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  }, []);

  // Stable line rendering data — does NOT depend on hoveredBracket
  const stableLines = useMemo(() => {
    return visibleLines.map((line) => ({
      line,
      color: getColor(line),
      isPinned: pinnedBrackets.has(line.bracketId),
      isMyBracket: line.bracketId === myBracketId,
      eliminated: line.eliminatedAtGame >= 0,
    }));
  }, [visibleLines, getColor, pinnedBrackets, myBracketId]);

  const togglePin = useCallback((bracketId: string) => {
    setPinnedBrackets((prev) => {
      const next = new Set(prev);
      if (next.has(bracketId)) next.delete(bracketId); else next.add(bracketId);
      return next;
    });
  }, []);

  // Custom tooltip
  const CustomTooltip = useCallback(
    ({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number; color: string }[]; label?: number }) => {
      if (!active || !payload?.length) return null;
      const gameIdx = label ?? 0;
      const cp = checkpoints[gameIdx >= 0 ? gameIdx : 0];
      const sorted = [...payload].sort((a, b) => b.value - a.value).slice(0, 8);

      return (
        <div className="bg-surface-container border border-outline/20 rounded-lg px-3 py-2 shadow-lg max-w-xs">
          {cp && gameIdx >= 0 && (() => {
            const winner = cp.winner;
            const loser = winner === cp.team1 ? cp.team2 : cp.team1;
            const winnerSeed = winner === cp.team1 ? cp.seed1 : cp.seed2;
            const loserSeed = loser === cp.team1 ? cp.seed1 : cp.seed2;
            const wLogo = teamLogos[winner];
            const lLogo = teamLogos[loser];
            return (
              <div className="flex items-center gap-1 text-[11px] text-on-surface-variant mb-1.5">
                <span className="text-on-surface-variant/60">{cp.round}:</span>
                {wLogo && <img src={wLogo} alt="" className="w-3.5 h-3.5 object-contain" />}
                <span className="text-on-surface font-semibold">{winnerSeed} {winner}</span>
                <span>over</span>
                {lLogo && <img src={lLogo} alt="" className="w-3.5 h-3.5 object-contain opacity-70" />}
                <span className="line-through">{loserSeed} {loser}</span>
              </div>
            );
          })()}
          {gameIdx < 0 && (
            <p className="text-[11px] text-on-surface-variant mb-1.5">Tournament start</p>
          )}
          <div className="space-y-0.5">
            {sorted.map((entry) => {
              const line = visibleLines.find((l) => l.bracketId === entry.dataKey);
              const champLogo = line ? teamLogos[line.champion] : undefined;
              const champSeed = line ? teamSeeds[line.champion] : undefined;
              return (
                <div key={entry.dataKey} className="flex items-center justify-between gap-3 text-[11px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-on-surface truncate">{line?.name || entry.dataKey}</span>
                    {champLogo && <img src={champLogo} alt="" className="w-3 h-3 object-contain shrink-0 opacity-60" />}
                    {champSeed && <span className="text-on-surface-variant/50 text-[9px] shrink-0">{champSeed}</span>}
                  </div>
                  <span className="text-on-surface font-semibold shrink-0">{entry.value.toFixed(1)}%</span>
                </div>
              );
            })}
            {payload.length > 8 && (
              <p className="text-[10px] text-on-surface-variant/50">+{payload.length - 8} more</p>
            )}
          </div>
        </div>
      );
    },
    [checkpoints, visibleLines]
  );

  const renderChampPill = ({ name, count, seed, alive }: typeof championOptions[number]) => {
    const active = championFilter.includes(name);
    const logo = teamLogos[name];
    return (
      <button
        key={name}
        onClick={() => toggleChampion(name)}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-label transition-all border ${
          active
            ? "bg-secondary/15 text-on-surface font-semibold border-secondary/40"
            : alive
              ? "bg-surface-container text-on-surface-variant hover:text-on-surface border-transparent hover:border-on-surface-variant/20"
              : "bg-surface-container/50 text-on-surface-variant/50 hover:text-on-surface-variant border-transparent hover:border-on-surface-variant/10"
        }`}
      >
        {logo && <img src={logo} alt="" className={`w-4 h-4 object-contain ${!alive && !active ? "opacity-40" : ""}`} />}
        <span>{seed ? `${seed} ` : ""}{name}</span>
        {alive && <span className="inline-block h-2 w-2 rounded-full bg-secondary shrink-0" />}
        {!alive && <span className="inline-block h-2 w-2 rounded-full bg-on-surface-variant/30 shrink-0" />}
        <span className={active ? "text-on-surface-variant" : "text-on-surface-variant/50"}>({count})</span>
      </button>
    );
  };

  if (checkpoints.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-on-surface-variant/50">
        <p className="text-sm font-label">No completed games yet — check back after the first tip-off</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Champion filter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <p className="text-xs text-on-surface-variant font-label">Filter by champion</p>
            {championFilter.length > 0 && (
              <button onClick={() => setChampionFilter([])} className="text-[10px] text-secondary hover:text-secondary/80 font-label transition-colors">
                Clear
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {pinnedBrackets.size > 0 && (
              <button onClick={() => setPinnedBrackets(new Set())} className="text-[10px] text-secondary hover:text-secondary/80 font-label transition-colors">
                Deselect all ({pinnedBrackets.size})
              </button>
            )}
            <span className="text-[10px] text-on-surface-variant/60 font-label">
              Showing {visibleLines.length} of {filteredPool.length}
            </span>
            <div className="inline-flex rounded-full bg-surface-container border border-outline-variant/20 overflow-hidden">
              {([10, 25, 0] as const).map((limit) => {
                const label = limit === 0 ? "All" : `Top ${limit}`;
                const active = bracketLimit === limit;
                return (
                  <button
                    key={limit}
                    onClick={() => setBracketLimit(limit)}
                    className={`px-2.5 py-0.5 text-[10px] font-label transition-colors ${
                      active
                        ? "bg-secondary/15 text-on-surface font-semibold"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          {(() => {
            const aliveTeams = championOptions.filter((o) => o.alive);
            const elimTeams = championOptions.filter((o) => !o.alive);
            return (
              <>
                {aliveTeams.length > 0 && <span className="text-[10px] font-label text-on-surface-variant/60 mr-1">Still in it:</span>}
                {aliveTeams.map((o) => renderChampPill(o))}
                {elimTeams.length > 0 && <span className="text-[10px] font-label text-on-surface-variant/40 ml-2 mr-1">Eliminated:</span>}
                {elimTeams.map((o) => renderChampPill(o))}
              </>
            );
          })()}
        </div>
      </div>

      {/* My Bracket hint */}
      {hydrated && !myBracketId && (
        <div className="flex items-center gap-2 rounded-lg bg-secondary/10 border border-secondary/20 px-3 py-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary shrink-0"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          <p className="text-xs text-on-surface-variant">
            Select <span className="text-secondary font-semibold">My Bracket</span> in the top-right navbar to always see your line highlighted.
          </p>
        </div>
      )}

      {/* Chart */}
      <style>{`
        .journey-line path { transition: stroke-opacity 200ms, stroke-width 200ms; }
        .journey-mine path { filter: drop-shadow(0 0 4px rgba(255,255,255,0.6)) drop-shadow(0 0 8px rgba(0,244,254,0.3)); }
        .journey-chart-hover .journey-line path { stroke-opacity: 0.08 !important; transition: stroke-opacity 200ms, stroke-width 200ms; }
        .journey-chart-hover .journey-line:hover path,
        .journey-chart-hover .journey-hovered path { stroke-opacity: 1 !important; stroke-width: 4.5px !important; }
        .journey-chart-hover .journey-pinned path { stroke-opacity: 1 !important; stroke-width: 4px !important; }
        .journey-chart-hover .journey-mine path { stroke-opacity: 1 !important; stroke-width: 3px !important; }
      `}</style>
      <div className={`h-[420px] w-full ${hoveredBracket ? "journey-chart-hover" : ""}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 16, bottom: 24, left: 8 }}>
            <XAxis
              dataKey="gameIndex"
              tick={{ fill: "#6b8a94", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              tickFormatter={(val: number) => {
                if (val < 0) return "";
                const cp = checkpoints[val];
                return cp ? `${val + 1}` : "";
              }}
              label={{ value: "Game #", position: "insideBottom", offset: -16, fill: "#5a7a84", fontSize: 11 }}
            />
            <YAxis
              tick={{ fill: "#6b8a94", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              tickFormatter={(val: number) => `${val}%`}
              width={45}
              domain={[0, "auto"]}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)" }} />

            {/* Round boundary lines */}
            {roundBoundaries.map((rb) => (
              <ReferenceLine
                key={rb.label}
                x={rb.index}
                stroke="rgba(255,255,255,0.08)"
                strokeDasharray="4 4"
                label={{ value: rb.label, position: "top", fill: "#5a7a84", fontSize: 10 }}
              />
            ))}

            {/* Bracket lines — stable render, hover handled via CSS classes */}
            {stableLines.map(({ line, color, isPinned, isMyBracket, eliminated }) => {
              const myColor = isMyBracket ? "#ffffff" : color;
              return (
              <Line
                key={line.bracketId}
                type="monotone"
                dataKey={line.bracketId}
                stroke={myColor}
                strokeWidth={isMyBracket ? 3 : isPinned ? 3.5 : eliminated ? 1.5 : 2.5}
                strokeOpacity={isPinned || isMyBracket ? 1 : 0.7}
                strokeDasharray={eliminated ? "6 3" : undefined}
                dot={false}
                activeDot={{ r: 5, fill: myColor, stroke: "#0a1a1f", strokeWidth: 2 }}
                className={`journey-line ${isPinned || isMyBracket ? "journey-pinned" : ""} ${isMyBracket ? "journey-mine" : ""} ${hoveredBracket === line.bracketId ? "journey-hovered" : ""}`}
                onMouseEnter={() => setHoveredBracket(line.bracketId)}
                onMouseLeave={() => setHoveredBracket(null)}
                onClick={() => togglePin(line.bracketId)}
                style={{ cursor: "pointer", transition: "stroke-opacity 200ms, stroke-width 200ms" }}
              />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend — shows all when "All" selected, otherwise top entries + My Bracket + pinned */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px]">
        {(() => {
          const sorted = [...visibleLines].sort((a, b) => (b.probabilities[b.probabilities.length - 1] || 0) - (a.probabilities[a.probabilities.length - 1] || 0));
          if (bracketLimit === 0) return sorted; // Show all in legend when "All" is selected
          const top = sorted.slice(0, bracketLimit);
          const topIds = new Set(top.map((l) => l.bracketId));
          for (const l of sorted) {
            if (topIds.has(l.bracketId)) continue;
            if (l.bracketId === myBracketId || pinnedBrackets.has(l.bracketId)) top.push(l);
          }
          return top;
        })().map((line) => {
            const color = getColor(line);
            const currentPct = line.probabilities[line.probabilities.length - 1] || 0;
            const isPinned = pinnedBrackets.has(line.bracketId);
            const isMyBracket = line.bracketId === myBracketId;
            const isHovered = hoveredBracket === line.bracketId;
            const eliminated = line.eliminatedAtGame >= 0;

            return (
              <button
                key={line.bracketId}
                className={`flex items-center gap-1.5 hover:text-on-surface transition-colors ${
                  isPinned || isMyBracket || isHovered ? "text-on-surface font-semibold" : "text-on-surface"
                } ${eliminated ? "opacity-60" : ""}`}
                onMouseEnter={() => setHoveredBracket(line.bracketId)}
                onMouseLeave={() => setHoveredBracket(null)}
                onClick={() => togglePin(line.bracketId)}
              >
                <div className="w-4 h-1.5 rounded-full shrink-0" style={{ backgroundColor: isMyBracket ? "#ffffff" : color, boxShadow: isMyBracket ? "0 0 6px rgba(255,255,255,0.5), 0 0 12px rgba(0,244,254,0.3)" : undefined }} />
                <span className="truncate max-w-[140px]">{line.name}</span>
                {isMyBracket && <span className="text-secondary font-bold text-[9px]">YOU</span>}
                <span className="text-on-surface-variant">{currentPct.toFixed(1)}%</span>
              </button>
            );
          })}
      </div>

      {/* Line style legend */}
      <div className="flex items-center gap-4 text-[10px] text-on-surface-variant">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 bg-on-surface-variant rounded-full" />
          <span>Champion alive</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0 border-t border-dashed border-on-surface-variant/60" />
          <span>Champion eliminated</span>
        </div>
        <span className="text-on-surface-variant/40">|</span>
        <span>Click line to pin. Hover to highlight.</span>
      </div>

      <p className="text-[10px] text-on-surface-variant/70">
        Win probability recalculated via 10,000 Monte Carlo simulations after each game.
        Based on historical seed win rates per round.
        {totalBrackets > submittedCount && ` ${totalBrackets - submittedCount} bracket${totalBrackets - submittedCount !== 1 ? "s" : ""} did not submit picks.`}
      </p>
    </div>
  );
}
