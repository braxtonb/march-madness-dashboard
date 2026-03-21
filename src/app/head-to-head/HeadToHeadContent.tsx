"use client";

import { useState } from "react";
import type { Bracket, Pick, Game, BracketAnalytics } from "@/lib/types";
import { ARCHETYPE_COLORS } from "@/lib/constants";
import { StatCard } from "@/components/ui/StatCard";
import { RadarComparison } from "@/components/charts/RadarComparison";

export function HeadToHeadContent({
  brackets,
  picks,
  games,
  analyticsObj,
  pickRatesObj,
}: {
  brackets: Bracket[];
  picks: Pick[];
  games: Game[];
  analyticsObj: Record<string, BracketAnalytics>;
  pickRatesObj: Record<string, Record<string, number>>;
}) {
  const [id1, setId1] = useState("");
  const [id2, setId2] = useState("");

  const b1 = brackets.find((b) => b.id === id1);
  const b2 = brackets.find((b) => b.id === id2);
  const a1 = id1 ? analyticsObj[id1] : null;
  const a2 = id2 ? analyticsObj[id2] : null;

  const picks1 = picks.filter((p) => p.bracket_id === id1);
  const picks2 = picks.filter((p) => p.bracket_id === id2);

  const pickMap1 = new Map(picks1.map((p) => [p.game_id, p.team_picked]));
  const pickMap2 = new Map(picks2.map((p) => [p.game_id, p.team_picked]));
  let agree = 0;
  let total = 0;
  for (const [gid, team] of pickMap1) {
    total++;
    if (pickMap2.get(gid) === team) agree++;
  }

  const radarData = b1 && b2 && a1 && a2 ? [
    { axis: "Points", person1: b1.points / Math.max(b1.points, b2.points, 1) * 100, person2: b2.points / Math.max(b1.points, b2.points, 1) * 100 },
    { axis: "MAX", person1: b1.max_remaining / Math.max(b1.max_remaining, b2.max_remaining, 1) * 100, person2: b2.max_remaining / Math.max(b1.max_remaining, b2.max_remaining, 1) * 100 },
    { axis: "Uniqueness", person1: a1.uniqueness * 100, person2: a2.uniqueness * 100 },
    { axis: "Win %", person1: a1.estimated_win_prob, person2: a2.estimated_win_prob },
    { axis: "Accuracy", person1: picks1.filter((p) => p.correct).length / Math.max(picks1.length, 1) * 100, person2: picks2.filter((p) => p.correct).length / Math.max(picks2.length, 1) * 100 },
  ] : [];

  const completedGames = games.filter((g) => g.completed);

  return (
    <div className="space-y-section">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <select value={id1} onChange={(e) => setId1(e.target.value)} className="rounded-card bg-surface-container px-4 py-2.5 text-sm text-on-surface outline-none">
          <option value="">Select bracket 1...</option>
          {brackets.map((b) => (<option key={b.id} value={b.id}>{b.owner} — {b.name}</option>))}
        </select>
        <select value={id2} onChange={(e) => setId2(e.target.value)} className="rounded-card bg-surface-container px-4 py-2.5 text-sm text-on-surface outline-none">
          <option value="">Select bracket 2...</option>
          {brackets.map((b) => (<option key={b.id} value={b.id}>{b.owner} — {b.name}</option>))}
        </select>
      </div>

      {b1 && b2 && a1 && a2 && (
        <>
          <div className="rounded-card bg-surface-container p-6 text-center">
            <span className="font-display text-4xl font-bold text-secondary">{agree}/{total}</span>
            <p className="text-on-surface-variant text-sm mt-1">You agree on {total > 0 ? Math.round((agree / total) * 100) : 0}% of picks</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-card bg-surface-container p-4 space-y-2">
              <p className="font-label text-xs text-on-surface-variant uppercase">{b1.owner}</p>
              <p className="text-on-surface">Rank #{a1.rank} | {b1.points} pts | MAX {b1.max_remaining}</p>
              <span className="rounded-full px-2 py-0.5 text-xs font-label" style={{ backgroundColor: `${ARCHETYPE_COLORS[a1.archetype]}20`, color: ARCHETYPE_COLORS[a1.archetype] }}>{a1.archetype}</span>
            </div>
            <div className="rounded-card bg-surface-container p-4 space-y-2">
              <p className="font-label text-xs text-on-surface-variant uppercase">{b2.owner}</p>
              <p className="text-on-surface">Rank #{a2.rank} | {b2.points} pts | MAX {b2.max_remaining}</p>
              <span className="rounded-full px-2 py-0.5 text-xs font-label" style={{ backgroundColor: `${ARCHETYPE_COLORS[a2.archetype]}20`, color: ARCHETYPE_COLORS[a2.archetype] }}>{a2.archetype}</span>
            </div>
          </div>

          <div className="rounded-card bg-surface-container p-5">
            <h3 className="font-display text-lg font-semibold mb-4">Comparison</h3>
            <RadarComparison data={radarData} name1={b1.owner} name2={b2.owner} />
          </div>

          <div className="rounded-card bg-surface-container p-5">
            <h3 className="font-display text-lg font-semibold mb-4">Pick Differences</h3>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {completedGames.map((g) => {
                const pick1 = pickMap1.get(g.game_id);
                const pick2 = pickMap2.get(g.game_id);
                const same = pick1 === pick2;
                return (
                  <div key={g.game_id} className={`flex items-center justify-between rounded-card px-3 py-2 text-xs ${same ? "text-on-surface-variant" : "bg-surface-bright text-on-surface"}`}>
                    <span className="w-24 truncate">{g.team1} vs {g.team2}</span>
                    <span className={pick1 === g.winner ? "text-secondary" : "text-on-surface-variant"}>{pick1 || "—"}</span>
                    <span className={pick2 === g.winner ? "text-secondary" : "text-on-surface-variant"}>{pick2 || "—"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {(!b1 || !b2) && (
        <div className="rounded-card bg-surface-container p-8 text-center">
          <p className="text-on-surface-variant">Select two brackets above to compare them side by side.</p>
        </div>
      )}
    </div>
  );
}
