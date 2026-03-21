"use client";

import { useState, useEffect } from "react";
import type { DashboardData } from "@/lib/types";
import { ROUND_POINTS, ROUND_LABELS, ROUND_ORDER } from "@/lib/constants";

export default function SimulatorPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [selections, setSelections] = useState<Map<string, string>>(new Map());
  const [simResults, setSimResults] = useState<{ id: string; name: string; owner: string; baseRank: number; simRank: number; basePoints: number; simPoints: number }[]>([]);

  useEffect(() => {
    fetch("/api/data")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  // Auto-simulate whenever selections or data change
  useEffect(() => {
    if (!data) return;
    runSimulate(data, selections);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selections, data]);

  if (!data) {
    return (
      <div className="space-y-section">
        <div>
          <h2 className="font-display text-2xl font-bold">Scenario Simulator</h2>
          <p className="text-on-surface-variant text-sm mt-1">Loading data...</p>
        </div>
      </div>
    );
  }

  const upcomingGames = data.games.filter((g) => !g.completed);
  const knownGames = upcomingGames.filter((g) => g.team1 && g.team2);

  // Group upcoming games by round in order
  const gamesByRound = ROUND_ORDER.reduce<Record<string, typeof upcomingGames>>((acc, round) => {
    const games = upcomingGames.filter((g) => g.round === round);
    if (games.length > 0) acc[round] = games;
    return acc;
  }, {});

  function toggleWinner(gameId: string, team: string) {
    const next = new Map(selections);
    if (next.get(gameId) === team) {
      next.delete(gameId);
    } else {
      next.set(gameId, team);
    }
    setSelections(next);
  }

  function setAllFavorites() {
    const next = new Map<string, string>();
    for (const g of knownGames) {
      next.set(g.game_id, g.seed1 <= g.seed2 ? g.team1 : g.team2);
    }
    setSelections(next);
  }

  function setAllUnderdogs() {
    const next = new Map<string, string>();
    for (const g of knownGames) {
      next.set(g.game_id, g.seed1 > g.seed2 ? g.team1 : g.team2);
    }
    setSelections(next);
  }

  function runSimulate(d: DashboardData, sel: Map<string, string>) {
    const picksByBracket = new Map<string, Map<string, string>>();
    for (const p of d.picks) {
      if (!picksByBracket.has(p.bracket_id)) picksByBracket.set(p.bracket_id, new Map());
      picksByBracket.get(p.bracket_id)!.set(p.game_id, p.team_picked);
    }

    const scored = d.brackets.map((b) => {
      const bPicks = picksByBracket.get(b.id);
      let bonus = 0;
      if (bPicks) {
        for (const [gameId, winner] of sel) {
          const picked = bPicks.get(gameId);
          const game = d.games.find((g) => g.game_id === gameId);
          if (picked === winner && game) {
            bonus += ROUND_POINTS[game.round as keyof typeof ROUND_POINTS] || 0;
          }
        }
      }
      return { id: b.id, name: b.name, owner: b.owner, basePoints: b.points, simPoints: b.points + bonus };
    });

    const baseRanked = [...d.brackets].sort((a, b) => b.points - a.points);
    const simRanked = [...scored].sort((a, b) => b.simPoints - a.simPoints);

    const baseRankMap = new Map<string, number>();
    baseRanked.forEach((b, i) => baseRankMap.set(b.id, i + 1));

    setSimResults(
      simRanked.slice(0, 15).map((s, i) => ({
        ...s,
        baseRank: baseRankMap.get(s.id) || 0,
        simRank: i + 1,
      }))
    );
  }

  return (
    <div className="space-y-section">
      <div>
        <h2 className="font-display text-2xl font-bold">Scenario Simulator</h2>
        <p className="text-on-surface-variant text-sm mt-1">
          Toggle game outcomes and see how the standings shift
        </p>
      </div>

      {upcomingGames.length === 0 ? (
        <div className="rounded-card bg-surface-container p-8 text-center">
          <p className="text-on-surface font-semibold mb-2">All tournament games have been completed.</p>
          <p className="text-on-surface-variant text-sm">
            Check the{" "}
            <a href="/finale" className="text-primary underline">
              Season Finale
            </a>{" "}
            page for final results!
          </p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 flex-wrap">
            <button onClick={setAllFavorites} className="rounded-card bg-surface-container px-4 py-2 text-sm font-label text-on-surface-variant hover:text-on-surface transition-colors">
              All favorites
            </button>
            <button onClick={setAllUnderdogs} className="rounded-card bg-surface-container px-4 py-2 text-sm font-label text-on-surface-variant hover:text-on-surface transition-colors">
              All underdogs
            </button>
            <button onClick={() => setSelections(new Map())} className="rounded-card bg-surface-container px-4 py-2 text-sm font-label text-on-surface-variant hover:text-on-surface transition-colors">
              Clear
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-section">
            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-display text-lg font-semibold">Upcoming Games</h3>

              {Object.entries(gamesByRound).map(([round, games]) => (
                <div key={round} className="space-y-2">
                  <h4 className="font-label text-xs uppercase tracking-wider text-on-surface-variant">
                    {ROUND_LABELS[round as keyof typeof ROUND_LABELS]}
                  </h4>
                  {games.map((g) => {
                    const hasBothTeams = Boolean(g.team1 && g.team2);
                    return (
                      <div key={g.game_id} className="rounded-card bg-surface-container p-3">
                        {hasBothTeams ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleWinner(g.game_id, g.team1)}
                              className={`flex-1 rounded-card px-3 py-2 text-xs font-label transition-colors ${
                                selections.get(g.game_id) === g.team1
                                  ? "bg-secondary/20 text-secondary glow-primary"
                                  : "bg-surface-bright text-on-surface-variant hover:text-on-surface"
                              }`}
                            >
                              {g.seed1} {g.team1}
                            </button>
                            <span className="text-xs text-on-surface-variant">vs</span>
                            <button
                              onClick={() => toggleWinner(g.game_id, g.team2)}
                              className={`flex-1 rounded-card px-3 py-2 text-xs font-label transition-colors ${
                                selections.get(g.game_id) === g.team2
                                  ? "bg-secondary/20 text-secondary glow-primary"
                                  : "bg-surface-bright text-on-surface-variant hover:text-on-surface"
                              }`}
                            >
                              {g.seed2} {g.team2}
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-on-surface-variant italic text-center py-1">
                            TBD — waiting for earlier round results
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              <p className="text-xs text-on-surface-variant">
                {selections.size} of {knownGames.length} confirmed matchups selected — standings update automatically
              </p>
            </div>

            <div className="lg:col-span-3 space-y-4">
              <h3 className="font-display text-lg font-semibold">Impact</h3>
              {simResults.length === 0 && (
                <div className="rounded-card bg-surface-container p-8 text-center">
                  <p className="text-on-surface-variant text-sm">
                    Select game winners to see the projected standings impact.
                  </p>
                </div>
              )}
              {simResults.length > 0 && (
                <div className="overflow-x-auto rounded-card bg-surface-container">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-outline">
                        <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Sim Rank</th>
                        <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Bracket</th>
                        <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Change</th>
                        <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Pts</th>
                        <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">Sim Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simResults.map((r) => {
                        const delta = r.baseRank - r.simRank;
                        return (
                          <tr key={r.id} className="border-b border-outline hover:bg-surface-bright transition-colors">
                            <td className="px-3 py-2 font-label">{r.simRank}</td>
                            <td className="px-3 py-2">
                              <div className="text-on-surface">{r.name}</div>
                              <div className="text-xs text-on-surface-variant">{r.owner}</div>
                            </td>
                            <td className="px-3 py-2 font-label">
                              {delta > 0 && <span className="text-secondary">+{delta}</span>}
                              {delta === 0 && <span className="text-on-surface-variant">—</span>}
                              {delta < 0 && <span className="text-on-surface-variant">{delta}</span>}
                            </td>
                            <td className="px-3 py-2 font-label text-on-surface-variant">{r.basePoints}</td>
                            <td className="px-3 py-2 font-label text-on-surface">{r.simPoints}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
