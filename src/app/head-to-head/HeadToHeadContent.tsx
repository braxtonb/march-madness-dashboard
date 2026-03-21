"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { Bracket, Pick, Game, BracketAnalytics, Round, Team } from "@/lib/types";
import { ROUND_LABELS, ROUND_ORDER } from "@/lib/constants";
import { RoundSelector } from "@/components/ui/RoundSelector";
import { TeamPill } from "@/components/ui/TeamPill";

type DiffFilter = "all" | "differences" | "agreement";

/* ── Custom searchable dropdown ── */
function BracketDropdown({
  brackets,
  value,
  onChange,
  label,
}: {
  brackets: Bracket[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = brackets.find((b) => b.id === value);

  const filtered = useMemo(() => {
    if (!query) return brackets;
    const q = query.toLowerCase();
    return brackets.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.owner.toLowerCase().includes(q)
    );
  }, [brackets, query]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="space-y-1" ref={containerRef}>
      <label className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={open ? query : selected ? `${selected.name} — ${selected.owner}` : ""}
          placeholder="Search brackets..."
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-card bg-surface-container border border-outline-variant px-3 py-2 text-xs text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant"
        />
        {open && (
          <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-card bg-surface-container border border-outline-variant shadow-lg">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-xs text-on-surface-variant">No matches</div>
            )}
            {filtered.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  onChange(b.id);
                  setOpen(false);
                  setQuery("");
                  inputRef.current?.blur();
                }}
                className={`w-full text-left px-3 py-2 hover:bg-surface-bright transition-colors ${
                  b.id === value ? "bg-surface-bright" : ""
                }`}
              >
                <span className="text-xs font-medium text-on-surface">{b.name}</span>
                <span className="text-[10px] text-on-surface-variant ml-2">{b.owner}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function HeadToHeadContent({
  brackets,
  picks,
  games,
  analyticsObj,
  currentRound,
  teams,
}: {
  brackets: Bracket[];
  picks: Pick[];
  games: Game[];
  analyticsObj: Record<string, BracketAnalytics>;
  pickRatesObj: Record<string, Record<string, number>>;
  currentRound: Round;
  teams?: Team[];
}) {
  const [id1, setId1] = useState("");
  const [id2, setId2] = useState("");
  const [diffFilter, setDiffFilter] = useState<DiffFilter>("all");
  const [selectedRound, setSelectedRound] = useState<Round>(currentRound);

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

  // Build team logo lookup
  const teamLogos: Record<string, string> = useMemo(() => {
    if (!teams) return {};
    return Object.fromEntries(teams.map((t) => [t.name, t.logo]));
  }, [teams]);

  // Compute per-bracket win percentage
  const winPct = (bracketId: string) => {
    const bPicks = picks.filter((p) => p.bracket_id === bracketId);
    const completedPicks = bPicks.filter((p) => {
      const game = games.find((g) => g.game_id === p.game_id);
      return game?.completed;
    });
    if (completedPicks.length === 0) return 0;
    const correct = completedPicks.filter((p) => p.correct).length;
    return Math.round((correct / completedPicks.length) * 100);
  };

  // Build game lookup for quick access
  const gameMap = useMemo(() => {
    return new Map(games.map((g) => [g.game_id, g]));
  }, [games]);

  // Get unique game_ids from picks data for the selected round (fixes S16/E8 empty issue)
  const roundGameIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of picks) {
      if (p.round === selectedRound && (p.bracket_id === id1 || p.bracket_id === id2)) {
        ids.add(p.game_id);
      }
    }
    // Also include game_ids from games data for this round
    for (const g of games) {
      if (g.round === selectedRound) {
        ids.add(g.game_id);
      }
    }
    return [...ids].sort();
  }, [picks, games, selectedRound, id1, id2]);

  // Apply diff filter on picks-based game list
  const filteredGameIds = useMemo(() => {
    return roundGameIds.filter((gid) => {
      const pick1 = pickMap1.get(gid);
      const pick2 = pickMap2.get(gid);
      const same = pick1 === pick2;
      if (diffFilter === "differences") return !same;
      if (diffFilter === "agreement") return same;
      return true;
    });
  }, [roundGameIds, pickMap1, pickMap2, diffFilter]);

  const FILTER_OPTIONS: { label: string; value: DiffFilter }[] = [
    { label: "All Games", value: "all" },
    { label: "Differences Only", value: "differences" },
    { label: "Agreement Only", value: "agreement" },
  ];

  return (
    <div className="space-y-4">
      {/* Bracket selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BracketDropdown brackets={brackets} value={id1} onChange={setId1} label="Bracket 1" />
        <BracketDropdown brackets={brackets} value={id2} onChange={setId2} label="Bracket 2" />
      </div>

      {b1 && b2 && a1 && a2 ? (
        <>
          {/* Agreement stat — compact */}
          <div className="rounded-card bg-surface-container px-4 py-3 flex items-center justify-between">
            <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant">
              Agreement
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-black text-secondary">
                {total > 0 ? Math.round((agree / total) * 100) : 0}%
              </span>
              <p className="text-on-surface-variant text-xs">
                {agree}/{total} match
              </p>
            </div>
          </div>

          {/* Stat comparison cards — compact */}
          <div className="grid grid-cols-2 gap-3">
            {/* Bracket 1 stats */}
            <div className="rounded-card bg-surface-container px-3 py-2.5 space-y-2">
              <div>
                <p className="font-display text-sm font-bold text-on-surface">{b1.name}</p>
                <p className="font-label text-[10px] text-on-surface-variant uppercase">{b1.owner}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="font-label text-[10px] text-on-surface-variant uppercase">Pts</p>
                  <p className="font-display text-lg font-bold text-on-surface">{b1.points}</p>
                </div>
                <div>
                  <p className="font-label text-[10px] text-on-surface-variant uppercase">MAX</p>
                  <p className="font-display text-lg font-bold text-on-surface">{b1.max_remaining}</p>
                </div>
                <div>
                  <p className="font-label text-[10px] text-on-surface-variant uppercase">Champ</p>
                  <TeamPill name={b1.champion_pick} seed={b1.champion_seed} logo={teamLogos[b1.champion_pick]} />
                </div>
                <div>
                  <p className="font-label text-[10px] text-on-surface-variant uppercase">Win %</p>
                  <p className="font-display text-lg font-bold text-on-surface">{winPct(b1.id)}%</p>
                </div>
              </div>
            </div>

            {/* Bracket 2 stats */}
            <div className="rounded-card bg-surface-container px-3 py-2.5 space-y-2">
              <div>
                <p className="font-display text-sm font-bold text-on-surface">{b2.name}</p>
                <p className="font-label text-[10px] text-on-surface-variant uppercase">{b2.owner}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="font-label text-[10px] text-on-surface-variant uppercase">Pts</p>
                  <p className="font-display text-lg font-bold text-on-surface">{b2.points}</p>
                </div>
                <div>
                  <p className="font-label text-[10px] text-on-surface-variant uppercase">MAX</p>
                  <p className="font-display text-lg font-bold text-on-surface">{b2.max_remaining}</p>
                </div>
                <div>
                  <p className="font-label text-[10px] text-on-surface-variant uppercase">Champ</p>
                  <TeamPill name={b2.champion_pick} seed={b2.champion_seed} logo={teamLogos[b2.champion_pick]} />
                </div>
                <div>
                  <p className="font-label text-[10px] text-on-surface-variant uppercase">Win %</p>
                  <p className="font-display text-lg font-bold text-on-surface">{winPct(b2.id)}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Round selector + filter pills */}
          <div className="flex flex-wrap items-center gap-3">
            <RoundSelector selected={selectedRound} onSelect={setSelectedRound} />
            <div className="flex gap-2">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDiffFilter(opt.value)}
                  className={`rounded-card px-3 py-1.5 text-xs font-label transition-colors ${
                    diffFilter === opt.value
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Game cards for the selected round — primary content area */}
          <div className="space-y-2">
            {filteredGameIds.length === 0 && (
              <p className="text-on-surface-variant text-sm text-center py-8">
                No games match the current filter for {ROUND_LABELS[selectedRound]}.
              </p>
            )}
            {filteredGameIds.map((gid) => {
              const g = gameMap.get(gid);
              const pick1 = pickMap1.get(gid);
              const pick2 = pickMap2.get(gid);
              const same = pick1 === pick2;
              const isComplete = g?.completed ?? false;
              const pick1Correct = isComplete && !!pick1 && pick1 === g?.winner;
              const pick2Correct = isComplete && !!pick2 && pick2 === g?.winner;

              // Use game teams if available, otherwise derive from picks
              const team1 = g?.team1 || "";
              const team2 = g?.team2 || "";
              const hasTeams = team1 && team2;

              return (
                <div
                  key={gid}
                  className={`rounded-card p-3 border-l-4 ${
                    same
                      ? "border-l-teal-500/30 bg-surface/60"
                      : "border-l-orange-400/30 bg-surface/60"
                  }`}
                >
                  {/* Game header */}
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      {hasTeams ? (
                        <div className="flex items-center gap-1.5">
                          <TeamPill name={team1} seed={g?.seed1} logo={teamLogos[team1]} />
                          <span className="text-[10px] text-on-surface-variant">vs</span>
                          <TeamPill name={team2} seed={g?.seed2} logo={teamLogos[team2]} />
                        </div>
                      ) : (
                        <p className="font-label text-xs text-on-surface-variant">
                          Game {gid}
                        </p>
                      )}
                      {isComplete && g?.winner && (
                        <p className="text-[10px] text-secondary mt-0.5">
                          Winner: {g.winner}
                        </p>
                      )}
                    </div>
                    {isComplete ? (
                      <span className="text-[10px] font-label text-on-surface-variant bg-surface-container rounded-full px-2 py-0.5">
                        Final
                      </span>
                    ) : (
                      <span className="text-[10px] font-label text-on-surface-variant bg-surface-container rounded-full px-2 py-0.5">
                        Pending
                      </span>
                    )}
                  </div>

                  {/* Pick columns */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Bracket 1 pick */}
                    <div
                      className={`rounded-md px-2.5 py-2 ${
                        pick1Correct
                          ? "bg-secondary/10 border border-secondary/40"
                          : "bg-surface-container"
                      }`}
                    >
                      <p className="text-[10px] font-semibold text-on-surface">{b1.name}</p>
                      {pick1 ? (
                        <div className="mt-1">
                          <TeamPill name={pick1} logo={teamLogos[pick1]} />
                          {isComplete && (
                            <p
                              className={`text-[10px] mt-0.5 ${
                                pick1Correct
                                  ? "text-secondary"
                                  : "text-on-surface-variant"
                              }`}
                            >
                              {pick1Correct ? "Correct" : "Incorrect"}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-on-surface-variant italic mt-1">No pick</p>
                      )}
                    </div>

                    {/* Bracket 2 pick */}
                    <div
                      className={`rounded-md px-2.5 py-2 ${
                        pick2Correct
                          ? "bg-secondary/10 border border-secondary/40"
                          : "bg-surface-container"
                      }`}
                    >
                      <p className="text-[10px] font-semibold text-on-surface">{b2.name}</p>
                      {pick2 ? (
                        <div className="mt-1">
                          <TeamPill name={pick2} logo={teamLogos[pick2]} />
                          {isComplete && (
                            <p
                              className={`text-[10px] mt-0.5 ${
                                pick2Correct
                                  ? "text-secondary"
                                  : "text-on-surface-variant"
                              }`}
                            >
                              {pick2Correct ? "Correct" : "Incorrect"}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-on-surface-variant italic mt-1">No pick</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Better empty state */
        <div className="rounded-card bg-surface-container p-12 text-center space-y-4">
          <div className="font-display text-5xl text-on-surface-variant/30">VS</div>
          <p className="font-display text-lg font-semibold text-on-surface">
            Compare Two Brackets
          </p>
          <p className="text-on-surface-variant text-sm max-w-md mx-auto">
            Select two brackets above to see how they stack up. You will get a full
            breakdown of agreement percentage, side-by-side stats, and pick-by-pick
            comparisons for every round.
          </p>
          <div className="flex justify-center gap-6 mt-4 text-xs text-on-surface-variant">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-sm border-l-4 border-l-teal-500/30 bg-surface" />
              Matching picks
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-sm border-l-4 border-l-orange-400/30 bg-surface" />
              Different picks
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
