"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { Bracket, Pick, Game, BracketAnalytics, Round } from "@/lib/types";
import { ROUND_LABELS, ROUND_ORDER } from "@/lib/constants";
import { RoundSelector } from "@/components/ui/RoundSelector";

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
    <div className="space-y-2" ref={containerRef}>
      <label className="font-label text-xs uppercase tracking-wider text-on-surface-variant">
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
          className="w-full rounded-card bg-surface-container border border-outline-variant px-4 py-3 text-sm text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant"
        />
        {open && (
          <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-card bg-surface-container border border-outline-variant shadow-lg">
            {filtered.length === 0 && (
              <div className="px-4 py-3 text-sm text-on-surface-variant">No matches</div>
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
                className={`w-full text-left px-4 py-2.5 hover:bg-surface-bright transition-colors ${
                  b.id === value ? "bg-surface-bright" : ""
                }`}
              >
                <span className="text-sm font-medium text-on-surface">{b.name}</span>
                <span className="text-xs text-on-surface-variant ml-2">{b.owner}</span>
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
}: {
  brackets: Bracket[];
  picks: Pick[];
  games: Game[];
  analyticsObj: Record<string, BracketAnalytics>;
  pickRatesObj: Record<string, Record<string, number>>;
  currentRound: Round;
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

  // Games for the selected round
  const roundGames = useMemo(() => {
    return games.filter((g) => g.round === selectedRound);
  }, [games, selectedRound]);

  // Apply diff filter
  const filteredGames = useMemo(() => {
    return roundGames.filter((g) => {
      const pick1 = pickMap1.get(g.game_id);
      const pick2 = pickMap2.get(g.game_id);
      const same = pick1 === pick2;
      if (diffFilter === "differences") return !same;
      if (diffFilter === "agreement") return same;
      return true;
    });
  }, [roundGames, pickMap1, pickMap2, diffFilter]);

  const FILTER_OPTIONS: { label: string; value: DiffFilter }[] = [
    { label: "All Games", value: "all" },
    { label: "Differences Only", value: "differences" },
    { label: "Agreement Only", value: "agreement" },
  ];

  return (
    <div className="space-y-6">
      {/* Bracket selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BracketDropdown brackets={brackets} value={id1} onChange={setId1} label="Bracket 1" />
        <BracketDropdown brackets={brackets} value={id2} onChange={setId2} label="Bracket 2" />
      </div>

      {b1 && b2 && a1 && a2 ? (
        <>
          {/* Agreement stat — prominent */}
          <div className="rounded-card bg-surface-container p-8 text-center">
            <p className="font-label text-xs uppercase tracking-wider text-on-surface-variant mb-2">
              Agreement
            </p>
            <span className="font-display text-6xl font-black text-secondary">
              {total > 0 ? Math.round((agree / total) * 100) : 0}%
            </span>
            <p className="text-on-surface-variant text-sm mt-2">
              {agree} of {total} picks match
            </p>
          </div>

          {/* Stat comparison cards */}
          <div className="grid grid-cols-2 gap-4">
            {/* Bracket 1 stats */}
            <div className="rounded-card bg-surface-container p-5 space-y-4">
              <div>
                <p className="font-display text-lg font-bold text-on-surface">{b1.name}</p>
                <p className="font-label text-xs text-on-surface-variant uppercase">{b1.owner}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-label text-xs text-on-surface-variant uppercase">Points</p>
                  <p className="font-display text-2xl font-bold text-on-surface">{b1.points}</p>
                </div>
                <div>
                  <p className="font-label text-xs text-on-surface-variant uppercase">MAX Remaining</p>
                  <p className="font-display text-2xl font-bold text-on-surface">{b1.max_remaining}</p>
                </div>
                <div>
                  <p className="font-label text-xs text-on-surface-variant uppercase">Champion</p>
                  <p className="text-sm font-medium text-on-surface mt-1">{b1.champion_pick}</p>
                </div>
                <div>
                  <p className="font-label text-xs text-on-surface-variant uppercase">Win %</p>
                  <p className="font-display text-2xl font-bold text-on-surface">{winPct(b1.id)}%</p>
                </div>
              </div>
            </div>

            {/* Bracket 2 stats */}
            <div className="rounded-card bg-surface-container p-5 space-y-4">
              <div>
                <p className="font-display text-lg font-bold text-on-surface">{b2.name}</p>
                <p className="font-label text-xs text-on-surface-variant uppercase">{b2.owner}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-label text-xs text-on-surface-variant uppercase">Points</p>
                  <p className="font-display text-2xl font-bold text-on-surface">{b2.points}</p>
                </div>
                <div>
                  <p className="font-label text-xs text-on-surface-variant uppercase">MAX Remaining</p>
                  <p className="font-display text-2xl font-bold text-on-surface">{b2.max_remaining}</p>
                </div>
                <div>
                  <p className="font-label text-xs text-on-surface-variant uppercase">Champion</p>
                  <p className="text-sm font-medium text-on-surface mt-1">{b2.champion_pick}</p>
                </div>
                <div>
                  <p className="font-label text-xs text-on-surface-variant uppercase">Win %</p>
                  <p className="font-display text-2xl font-bold text-on-surface">{winPct(b2.id)}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Round selector + filter pills */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <RoundSelector selected={selectedRound} onSelect={setSelectedRound} />
              <div className="flex gap-2">
                {FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDiffFilter(opt.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-label transition-colors ${
                      diffFilter === opt.value
                        ? "bg-surface-bright text-on-surface"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Game cards for the selected round */}
          <div className="space-y-3">
            {filteredGames.length === 0 && (
              <p className="text-on-surface-variant text-sm text-center py-8">
                No games match the current filter for {ROUND_LABELS[selectedRound]}.
              </p>
            )}
            {filteredGames.map((g) => {
              const pick1 = pickMap1.get(g.game_id);
              const pick2 = pickMap2.get(g.game_id);
              const same = pick1 === pick2;
              const isComplete = g.completed;
              const pick1Correct = isComplete && !!pick1 && pick1 === g.winner;
              const pick2Correct = isComplete && !!pick2 && pick2 === g.winner;

              return (
                <div
                  key={g.game_id}
                  className={`rounded-card border p-4 ${
                    same
                      ? "bg-surface border-outline-variant border-l-4 border-l-teal-500/30"
                      : "bg-surface border-outline-variant border-l-4 border-l-orange-400/30"
                  }`}
                >
                  {/* Game header */}
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="font-label text-sm font-semibold text-on-surface">
                        {g.team1} vs {g.team2}
                      </p>
                      {isComplete && g.winner && (
                        <p className="text-xs text-secondary mt-0.5">
                          Winner: {g.winner}
                        </p>
                      )}
                    </div>
                    {isComplete ? (
                      <span className="text-xs font-label text-on-surface-variant bg-surface-container rounded-full px-2 py-0.5">
                        Final
                      </span>
                    ) : (
                      <span className="text-xs font-label text-on-surface-variant bg-surface-container rounded-full px-2 py-0.5">
                        Pending
                      </span>
                    )}
                  </div>

                  {/* Pick columns */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Bracket 1 pick */}
                    <div
                      className={`rounded-md p-3 ${
                        pick1Correct
                          ? "bg-secondary/10 border border-secondary/40"
                          : "bg-surface-container"
                      }`}
                    >
                      <p className="text-xs font-semibold text-on-surface">{b1.name}</p>
                      <p className="text-xs text-on-surface-variant mb-2">{b1.owner}</p>
                      {pick1 ? (
                        <>
                          <p
                            className={`text-sm font-medium ${
                              pick1Correct ? "text-secondary" : "text-on-surface"
                            }`}
                          >
                            {pick1}
                          </p>
                          {isComplete && (
                            <p
                              className={`text-xs mt-0.5 ${
                                pick1Correct
                                  ? "text-secondary"
                                  : "text-on-surface-variant"
                              }`}
                            >
                              {pick1Correct ? "Correct" : "Incorrect"}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-on-surface-variant italic">No pick</p>
                      )}
                    </div>

                    {/* Bracket 2 pick */}
                    <div
                      className={`rounded-md p-3 ${
                        pick2Correct
                          ? "bg-secondary/10 border border-secondary/40"
                          : "bg-surface-container"
                      }`}
                    >
                      <p className="text-xs font-semibold text-on-surface">{b2.name}</p>
                      <p className="text-xs text-on-surface-variant mb-2">{b2.owner}</p>
                      {pick2 ? (
                        <>
                          <p
                            className={`text-sm font-medium ${
                              pick2Correct ? "text-secondary" : "text-on-surface"
                            }`}
                          >
                            {pick2}
                          </p>
                          {isComplete && (
                            <p
                              className={`text-xs mt-0.5 ${
                                pick2Correct
                                  ? "text-secondary"
                                  : "text-on-surface-variant"
                              }`}
                            >
                              {pick2Correct ? "Correct" : "Incorrect"}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-on-surface-variant italic">No pick</p>
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
