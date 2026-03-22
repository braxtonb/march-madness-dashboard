"use client";

import { useState, useMemo, useCallback } from "react";
import BottomSheet from "./BottomSheet";
import { TeamPill } from "./TeamPill";
import type { Award, AwardWinner, Pick, Game, Team, Bracket, Round } from "@/lib/types";
import { ROUND_ORDER, ROUND_LABELS, ROUND_POINTS } from "@/lib/constants";

/* ── Collapsible Round Section ───────────────────── */

function CollapsibleRound({
  round,
  label,
  defaultCollapsed,
  children,
  gameCount,
}: {
  round: string;
  label: string;
  defaultCollapsed: boolean;
  children: React.ReactNode;
  gameCount?: number;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center gap-2 pt-2 border-t border-surface-bright cursor-pointer hover:bg-surface-bright/30 -mx-1 px-1 rounded transition-colors"
      >
        <span className="text-sm text-on-surface-variant/60 w-4 text-center font-label leading-none shrink-0">
          {collapsed ? "+" : "\u2212"}
        </span>
        <p className="font-label text-xs font-semibold text-on-surface">{label}</p>
        {collapsed && gameCount !== undefined && (
          <span className="text-[10px] text-on-surface-variant/50 ml-auto">
            {gameCount} game{gameCount !== 1 ? "s" : ""}
          </span>
        )}
      </button>
      {!collapsed && children}
    </div>
  );
}

interface AwardDetailSidebarProps {
  awards: Award[];
  selectedIndex: number;
  onChangeIndex: (idx: number) => void;
  open: boolean;
  onClose: () => void;
  picks: Pick[];
  games: Game[];
  teams: Team[];
  brackets: Bracket[];
  pickRates: Record<string, Record<string, number>>;
  selectedRound: string;
}

/* ── Shared helpers ───────────────────────────────── */

function teamLogo(teams: Team[], name: string) {
  return teams.find((t) => t.name === name)?.logo;
}

function teamSeed(teams: Team[], name: string) {
  return teams.find((t) => t.name === name)?.seed;
}

function teamEliminated(teams: Team[], name: string) {
  return teams.find((t) => t.name === name)?.eliminated ?? false;
}

function roundGamesForRound(games: Game[], round: string): Game[] {
  if (round === "ALL") return games.filter((g) => g.completed);
  return games.filter((g) => g.round === round && g.completed);
}

function winnerPicks(picks: Pick[], bracketId: string, gameIds: Set<string>): Pick[] {
  return picks.filter((p) => p.bracket_id === bracketId && gameIds.has(p.game_id));
}

/* ── Pick rate bar ────────────────────────────────── */

function PickRateBar({ rate, label }: { rate: number; label?: string }) {
  const pct = Math.round(rate * 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex-1 h-1.5 rounded-full bg-surface-bright overflow-hidden">
        <div
          className="h-full rounded-full bg-primary/60"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-on-surface-variant whitespace-nowrap">
        {label ?? `${pct}% picked`}
      </span>
    </div>
  );
}

/* ── 1. Oracle Content ────────────────────────────── */

function OracleContent({
  winner,
  picks,
  games,
  teams,
  selectedRound,
  completedRounds,
}: {
  winner: AwardWinner;
  picks: Pick[];
  games: Game[];
  teams: Team[];
  selectedRound: string;
  completedRounds: Set<string>;
}) {
  const rGames = roundGamesForRound(games, selectedRound);
  const gameIds = new Set(rGames.map((g) => g.game_id));
  const wPicks = winnerPicks(picks, winner.bracketId, gameIds);
  const pickMap = new Map(wPicks.map((p) => [p.game_id, p]));
  const correct = wPicks.filter((p) => p.correct).length;

  const groupByRound = selectedRound === "ALL";
  const rounds = groupByRound
    ? ROUND_ORDER.filter((r) => rGames.some((g) => g.round === r))
    : [selectedRound];

  function renderGame(g: Game) {
    const pick = pickMap.get(g.game_id);
    const isCorrect = pick?.correct ?? false;
    return (
      <div
        key={g.game_id}
        className="flex items-center justify-between rounded-lg bg-surface-bright/50 px-3 py-2"
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          <TeamPill name={g.team1} seed={g.seed1} logo={teamLogo(teams, g.team1)} eliminated={teamEliminated(teams, g.team1)} />
          <span className="text-[10px] text-on-surface-variant">vs</span>
          <TeamPill name={g.team2} seed={g.seed2} logo={teamLogo(teams, g.team2)} eliminated={teamEliminated(teams, g.team2)} />
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {pick && (
            <TeamPill name={pick.team_picked} seed={pick.seed_picked} logo={teamLogo(teams, pick.team_picked)} eliminated={teamEliminated(teams, pick.team_picked)} />
          )}
          <span className={isCorrect ? "text-secondary" : "text-error"}>
            {isCorrect ? "\u2713" : "\u00d7"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-label text-secondary">
        {correct} of {rGames.length} correct
      </p>
      {groupByRound ? (
        <div className="space-y-2">
          {rounds.length === 1 ? (
            <div className="space-y-2">
              <div className="pt-2 border-t border-surface-bright">
                <p className="font-label text-xs font-semibold text-on-surface">{ROUND_LABELS[rounds[0] as Round]}</p>
              </div>
              {rGames.filter((g) => g.round === rounds[0]).map(renderGame)}
            </div>
          ) : (
            rounds.map((round) => {
              const roundFilteredGames = rGames.filter((g) => g.round === round);
              return (
                <CollapsibleRound
                  key={round}
                  round={round}
                  label={ROUND_LABELS[round as Round]}
                  defaultCollapsed={completedRounds.has(round)}
                  gameCount={roundFilteredGames.length}
                >
                  <div className="space-y-2">
                    {roundFilteredGames.map(renderGame)}
                  </div>
                </CollapsibleRound>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {rGames.map(renderGame)}
        </div>
      )}
    </div>
  );
}

/* ── 2. Trendsetter Content ───────────────────────── */

function TrendsetterContent({
  winner,
  picks,
  games,
  teams,
  pickRates,
  selectedRound,
  completedRounds,
}: {
  winner: AwardWinner;
  picks: Pick[];
  games: Game[];
  teams: Team[];
  pickRates: Record<string, Record<string, number>>;
  selectedRound: string;
  completedRounds: Set<string>;
}) {
  const rGames = roundGamesForRound(games, selectedRound);
  const gameIds = new Set(rGames.map((g) => g.game_id));
  const wPicks = winnerPicks(picks, winner.bracketId, gameIds);

  const uniquePicks = wPicks
    .filter((p) => {
      if (!p.correct) return false;
      const rate = pickRates[p.game_id]?.[p.team_picked] ?? 1;
      return rate < 0.3;
    })
    .sort((a, b) => {
      const rA = pickRates[a.game_id]?.[a.team_picked] ?? 1;
      const rB = pickRates[b.game_id]?.[b.team_picked] ?? 1;
      return rA - rB;
    });

  if (uniquePicks.length === 0) {
    return (
      <p className="text-sm text-on-surface-variant italic">
        No unique picks this round
      </p>
    );
  }

  const groupByRound = selectedRound === "ALL";
  const rounds = groupByRound
    ? ROUND_ORDER.filter((r) => uniquePicks.some((p) => p.round === r))
    : null;

  function renderPick(p: Pick) {
    const rate = pickRates[p.game_id]?.[p.team_picked] ?? 0;
    return (
      <div key={p.game_id} className="space-y-1 rounded-lg bg-surface-bright/50 px-3 py-2">
        <div className="flex items-center gap-2">
          <TeamPill name={p.team_picked} seed={p.seed_picked} logo={teamLogo(teams, p.team_picked)} eliminated={teamEliminated(teams, p.team_picked)} />
          <span className="text-[10px] text-on-surface-variant">Only {Math.round(rate * 100)}% picked this</span>
        </div>
        <PickRateBar rate={rate} />
      </div>
    );
  }

  if (groupByRound && rounds) {
    if (rounds.length === 1) {
      return (
        <div className="space-y-3">
          <div className="pt-2 border-t border-surface-bright">
            <p className="font-label text-xs font-semibold text-on-surface">{ROUND_LABELS[rounds[0] as Round]}</p>
          </div>
          {uniquePicks.filter((p) => p.round === rounds[0]).map(renderPick)}
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {rounds.map((round) => {
          const roundPicks = uniquePicks.filter((p) => p.round === round);
          return (
            <CollapsibleRound
              key={round}
              round={round}
              label={ROUND_LABELS[round as Round]}
              defaultCollapsed={completedRounds.has(round)}
              gameCount={roundPicks.length}
            >
              <div className="space-y-3">{roundPicks.map(renderPick)}</div>
            </CollapsibleRound>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">{uniquePicks.map(renderPick)}</div>
  );
}

/* ── 3. Faithful Content ──────────────────────────── */

function FaithfulContent({
  winner,
  brackets,
  teams,
}: {
  winner: AwardWinner;
  brackets: Bracket[];
  teams: Team[];
}) {
  const bracket = brackets.find((b) => b.id === winner.bracketId);
  if (!bracket) return null;

  const champTeam = teams.find((t) => t.name === bracket.champion_pick);
  const champAlive = champTeam ? !champTeam.eliminated : false;

  // Compute remaining point value from bracket round point fields
  const roundFields: { round: Round; field: keyof Bracket }[] = [
    { round: "R64", field: "r64_pts" },
    { round: "R32", field: "r32_pts" },
    { round: "S16", field: "s16_pts" },
    { round: "E8", field: "e8_pts" },
    { round: "FF", field: "ff_pts" },
    { round: "CHAMP", field: "champ_pts" },
  ];

  // The bracket's rank (sorted by points descending)
  const sorted = [...brackets].sort((a, b) => b.points - a.points);
  const rank = sorted.findIndex((b) => b.id === bracket.id) + 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-on-surface-variant">Current Rank</p>
          <p className="text-2xl font-display font-bold text-on-surface">#{rank}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-on-surface-variant">Points</p>
          <p className="text-2xl font-display font-bold text-secondary">{bracket.points}</p>
        </div>
      </div>

      <div className="rounded-lg bg-surface-bright/50 px-3 py-3 space-y-2">
        <p className="text-xs text-on-surface-variant">Champion Pick</p>
        <div className="flex items-center gap-2">
          <TeamPill
            name={bracket.champion_pick}
            seed={bracket.champion_seed}
            logo={teamLogo(teams, bracket.champion_pick)}
            eliminated={!champAlive}
            showStatus
          />
          <span className={`text-xs ${champAlive ? "text-secondary" : "text-on-surface-variant"}`}>
            {champAlive ? "Still alive" : "Eliminated"}
          </span>
        </div>
      </div>

      <div className="rounded-lg bg-surface-bright/50 px-3 py-3">
        <p className="text-xs text-on-surface-variant mb-2">Max Remaining Points</p>
        <p className="text-lg font-display font-bold text-on-surface">{bracket.max_remaining}</p>
      </div>

      <div className="rounded-lg bg-surface-bright/50 px-3 py-3 space-y-1">
        <p className="text-xs text-on-surface-variant mb-2">Points by Round</p>
        {roundFields.map(({ round, field }) => {
          const pts = bracket[field] as number;
          return (
            <div key={round} className="flex items-center justify-between text-xs">
              <span className="text-on-surface-variant">{ROUND_LABELS[round]}</span>
              <span className="text-on-surface font-medium">{pts}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── 4. Contrarian Content ────────────────────────── */

function ContrarianContent({
  winner,
  picks,
  games,
  selectedRound,
  teams,
  completedRounds,
}: {
  winner: AwardWinner;
  picks: Pick[];
  games: Game[];
  selectedRound: string;
  teams: Team[];
  completedRounds: Set<string>;
}) {
  const rGames = roundGamesForRound(games, selectedRound);
  const gameIds = new Set(rGames.map((g) => g.game_id));
  const gameMap = new Map(rGames.map((g) => [g.game_id, g]));
  const wPicks = winnerPicks(picks, winner.bracketId, gameIds);

  // Find correct picks that went against national consensus
  const contrarianPicks = wPicks
    .filter((p) => {
      if (!p.correct) return false;
      const game = gameMap.get(p.game_id);
      if (!game || !game.completed) return false;
      const nationalPctForPick = p.team_picked === game.team1
        ? (game.national_pct_team1 || 0.5)
        : (1 - (game.national_pct_team1 || 0.5));
      return nationalPctForPick < 0.5;
    })
    .sort((a, b) => {
      // Sort by how contrarian (lowest national pct first)
      const gA = gameMap.get(a.game_id);
      const gB = gameMap.get(b.game_id);
      const pctA = a.team_picked === gA?.team1
        ? (gA?.national_pct_team1 || 0.5)
        : (1 - (gA?.national_pct_team1 || 0.5));
      const pctB = b.team_picked === gB?.team1
        ? (gB?.national_pct_team1 || 0.5)
        : (1 - (gB?.national_pct_team1 || 0.5));
      return pctA - pctB;
    });

  if (contrarianPicks.length === 0) {
    return (
      <p className="text-sm text-on-surface-variant italic">No contrarian picks found</p>
    );
  }

  const groupByRound = selectedRound === "ALL";
  const rounds = groupByRound
    ? ROUND_ORDER.filter((r) => contrarianPicks.some((p) => { const g = gameMap.get(p.game_id); return g?.round === r; }))
    : null;

  function renderContrarianItem(p: Pick) {
    const g = gameMap.get(p.game_id);
    if (!g) return null;
    const nationalPctForPick = p.team_picked === g.team1
      ? (g.national_pct_team1 || 0.5)
      : (1 - (g.national_pct_team1 || 0.5));
    const nationalPctDisplay = Math.round(nationalPctForPick * 100);
    return (
      <div key={p.game_id} className="space-y-1 rounded-lg bg-surface-bright/50 px-3 py-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <TeamPill name={g.team1} seed={g.seed1} logo={teamLogo(teams, g.team1)} eliminated={teamEliminated(teams, g.team1)} />
          <span className="text-[10px] text-on-surface-variant">vs</span>
          <TeamPill name={g.team2} seed={g.seed2} logo={teamLogo(teams, g.team2)} eliminated={teamEliminated(teams, g.team2)} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TeamPill name={p.team_picked} seed={p.seed_picked} logo={teamLogo(teams, p.team_picked)} eliminated={teamEliminated(teams, p.team_picked)} />
            <span className="text-secondary shrink-0">{"\u2713"}</span>
          </div>
          <span className="text-[10px] text-on-surface-variant">Only {nationalPctDisplay}% picked this nationally</span>
        </div>
      </div>
    );
  }

  if (groupByRound && rounds) {
    if (rounds.length === 1) {
      return (
        <div className="space-y-2">
          <div className="pt-2 border-t border-surface-bright">
            <p className="font-label text-xs font-semibold text-on-surface">{ROUND_LABELS[rounds[0] as Round]}</p>
          </div>
          {contrarianPicks.filter((p) => { const g = gameMap.get(p.game_id); return g?.round === rounds[0]; }).map(renderContrarianItem)}
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {rounds.map((round) => {
          const roundPicks = contrarianPicks.filter((p) => { const g = gameMap.get(p.game_id); return g?.round === round; });
          return (
            <CollapsibleRound
              key={round}
              round={round}
              label={ROUND_LABELS[round as Round]}
              defaultCollapsed={completedRounds.has(round)}
              gameCount={roundPicks.length}
            >
              <div className="space-y-2">
                {roundPicks.map(renderContrarianItem)}
              </div>
            </CollapsibleRound>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {contrarianPicks.map(renderContrarianItem)}
    </div>
  );
}

/* ── 5. Diamond Content ───────────────────────────── */

function DiamondContent({
  winner,
  picks,
  games,
  teams,
  pickRates,
  selectedRound,
}: {
  winner: AwardWinner;
  picks: Pick[];
  games: Game[];
  teams: Team[];
  pickRates: Record<string, Record<string, number>>;
  selectedRound: string;
}) {
  const rGames = roundGamesForRound(games, selectedRound);
  const gameIds = new Set(rGames.map((g) => g.game_id));
  const gameMap = new Map(rGames.map((g) => [g.game_id, g]));
  const wPicks = winnerPicks(picks, winner.bracketId, gameIds);

  // Find the single best (lowest rate) correct pick
  let bestPick: Pick | null = null;
  let bestRate = 1;
  for (const p of wPicks) {
    if (!p.correct) continue;
    const rate = pickRates[p.game_id]?.[p.team_picked] ?? 1;
    if (rate < bestRate) {
      bestRate = rate;
      bestPick = p;
    }
  }

  if (!bestPick) {
    return (
      <p className="text-sm text-on-surface-variant italic">No qualifying pick found</p>
    );
  }

  const g = gameMap.get(bestPick.game_id);
  const pctLabel = Math.round(bestRate * 100);
  const roundLabel = g ? (ROUND_LABELS[g.round as Round] || g.round) : bestPick.round ? (ROUND_LABELS[bestPick.round as Round] || bestPick.round) : "";

  return (
    <div className="space-y-4">
      {g && (
        <div className="rounded-lg bg-surface-bright/50 px-3 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-on-surface-variant">Game</p>
            {roundLabel && (
              <span className="inline-block rounded-card px-2 py-0.5 font-label text-[10px] bg-tertiary/15 text-tertiary">
                {roundLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <TeamPill
              name={g.team1}
              seed={g.seed1}
              logo={teamLogo(teams, g.team1)}
              eliminated={teamEliminated(teams, g.team1)}
            />
            <span className="text-[10px] text-on-surface-variant">vs</span>
            <TeamPill
              name={g.team2}
              seed={g.seed2}
              logo={teamLogo(teams, g.team2)}
              eliminated={teamEliminated(teams, g.team2)}
            />
          </div>
        </div>
      )}

      <div className="rounded-lg bg-surface-bright/50 px-3 py-3 space-y-2">
        <p className="text-xs text-on-surface-variant">The Pick</p>
        <TeamPill
          name={bestPick.team_picked}
          seed={bestPick.seed_picked}
          logo={teamLogo(teams, bestPick.team_picked)}
          eliminated={teamEliminated(teams, bestPick.team_picked)}
        />
      </div>

      <div className="rounded-lg bg-surface-bright/50 px-3 py-3 space-y-2">
        <p className="text-xs text-on-surface-variant">Pick Rate</p>
        <PickRateBar rate={bestRate} label={`Only ${pctLabel}% of brackets picked this`} />
      </div>
    </div>
  );
}

/* ── 6. People's Champion Content ─────────────────── */

function PeoplesChampionContent({
  winner,
  picks,
  games,
  teams,
  pickRates,
  selectedRound,
  completedRounds,
}: {
  winner: AwardWinner;
  picks: Pick[];
  games: Game[];
  teams: Team[];
  pickRates: Record<string, Record<string, number>>;
  selectedRound: string;
  completedRounds: Set<string>;
}) {
  const rGames = roundGamesForRound(games, selectedRound);
  const gameIds = new Set(rGames.map((g) => g.game_id));
  const wPicks = winnerPicks(picks, winner.bracketId, gameIds);
  const pickMap = new Map(wPicks.map((p) => [p.game_id, p]));

  // Compute plurality pick for each game (most-picked team across all brackets)
  const allRoundPicks = picks.filter((p) => gameIds.has(p.game_id));
  const pluralityPick = new Map<string, string>();
  const gamePickCounts = new Map<string, Map<string, number>>();
  for (const p of allRoundPicks) {
    if (!gamePickCounts.has(p.game_id)) gamePickCounts.set(p.game_id, new Map());
    const gc = gamePickCounts.get(p.game_id)!;
    gc.set(p.team_picked, (gc.get(p.team_picked) || 0) + 1);
  }
  for (const [gid, tc] of gamePickCounts) {
    let bestTeam = "";
    let bestCount = 0;
    for (const [team, count] of tc) {
      if (count > bestCount) { bestTeam = team; bestCount = count; }
    }
    pluralityPick.set(gid, bestTeam);
  }

  const matched = wPicks.filter((p) => pluralityPick.get(p.game_id) === p.team_picked).length;

  // Group by round when in ALL mode
  const groupByRound = selectedRound === "ALL";
  const rounds = groupByRound
    ? ROUND_ORDER.filter((r) => rGames.some((g) => g.round === r))
    : [selectedRound];

  function renderGameCard(g: Game) {
    const pick = pickMap.get(g.game_id);
    const plurality = pluralityPick.get(g.game_id) ?? "";
    const matchedPlurality = pick?.team_picked === plurality;
    return (
      <div
        key={g.game_id}
        className={`rounded-lg px-3 py-2 ${
          matchedPlurality ? "bg-secondary/10" : "bg-surface-bright/50"
        }`}
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          <TeamPill name={g.team1} seed={g.seed1} logo={teamLogo(teams, g.team1)} eliminated={teamEliminated(teams, g.team1)} />
          <span className="text-[10px] text-on-surface-variant">vs</span>
          <TeamPill name={g.team2} seed={g.seed2} logo={teamLogo(teams, g.team2)} eliminated={teamEliminated(teams, g.team2)} />
        </div>
        <div className="flex items-center justify-between mt-1 text-[10px]">
          <span className="text-on-surface-variant">Most popular: {plurality}</span>
          {matchedPlurality && (
            <span className="text-secondary font-label">Matched</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-label text-secondary">
        Matched {matched} of {rGames.length} plurality picks
      </p>

      {groupByRound ? (
        rounds.length === 1 ? (
          <div className="space-y-2">
            <div className="pt-2 border-t border-surface-bright">
              <p className="font-label text-xs font-semibold text-on-surface">{ROUND_LABELS[rounds[0] as Round]}</p>
            </div>
            {rGames.filter((g) => g.round === rounds[0]).map(renderGameCard)}
          </div>
        ) : (
          rounds.map((round) => {
            const roundFilteredGames = rGames.filter((g) => g.round === round);
            return (
              <CollapsibleRound
                key={round}
                round={round}
                label={ROUND_LABELS[round as Round]}
                defaultCollapsed={completedRounds.has(round)}
                gameCount={roundFilteredGames.length}
              >
                <div className="space-y-2">
                  {roundFilteredGames.map(renderGameCard)}
                </div>
              </CollapsibleRound>
            );
          })
        )
      ) : (
        rounds.map((round) => {
          const roundFilteredGames = rGames.filter((g) =>
            groupByRound ? g.round === round : true
          );
          return (
            <div key={round} className="space-y-2">
              {roundFilteredGames.map(renderGameCard)}
            </div>
          );
        })
      )}
    </div>
  );
}

/* ── Main Sidebar Component ───────────────────────── */

export default function AwardDetailSidebar({
  awards,
  selectedIndex,
  onChangeIndex,
  open,
  onClose,
  picks,
  games,
  teams,
  brackets,
  pickRates,
  selectedRound,
}: AwardDetailSidebarProps) {
  const [winnerIdx, setWinnerIdx] = useState(0);

  // Compute which rounds are fully completed (for default collapse state)
  const completedRounds = useMemo(() => {
    const set = new Set<string>();
    for (const round of ROUND_ORDER) {
      const roundGames = games.filter((g) => g.round === round);
      if (roundGames.length > 0 && roundGames.every((g) => g.completed)) {
        set.add(round);
      }
    }
    return set;
  }, [games]);

  const award = awards[selectedIndex];
  if (!award) return null;

  // Reset winner index when switching awards
  const winner = award.winners[winnerIdx] ?? award.winners[0];
  if (!winner) return null;

  const total = award.winners.length;
  const hasPrev = winnerIdx > 0;
  const hasNext = winnerIdx < total - 1;

  const title = award.title;

  const hasAwardPrev = selectedIndex > 0;
  const hasAwardNext = selectedIndex < awards.length - 1;

  function renderContent() {
    switch (award.title) {
      case "The Oracle":
        return (
          <OracleContent
            winner={winner}
            picks={picks}
            games={games}
            teams={teams}
            selectedRound={selectedRound}
            completedRounds={completedRounds}
          />
        );
      case "The Trendsetter":
        return (
          <TrendsetterContent
            winner={winner}
            picks={picks}
            games={games}
            teams={teams}
            pickRates={pickRates}
            selectedRound={selectedRound}
            completedRounds={completedRounds}
          />
        );
      case "The Faithful":
        return (
          <FaithfulContent winner={winner} brackets={brackets} teams={teams} />
        );
      case "The Contrarian":
        return (
          <ContrarianContent
            winner={winner}
            picks={picks}
            games={games}
            selectedRound={selectedRound}
            teams={teams}
            completedRounds={completedRounds}
          />
        );
      case "Diamond in the Rough":
        return (
          <DiamondContent
            winner={winner}
            picks={picks}
            games={games}
            teams={teams}
            pickRates={pickRates}
            selectedRound={selectedRound}
          />
        );
      case "The People's Champion":
        return (
          <PeoplesChampionContent
            winner={winner}
            picks={picks}
            games={games}
            teams={teams}
            pickRates={pickRates}
            selectedRound={selectedRound}
            completedRounds={completedRounds}
          />
        );
      default:
        return (
          <p className="text-sm text-on-surface-variant italic">
            No detail view for this award yet.
          </p>
        );
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      onPrev={hasAwardPrev ? () => { onChangeIndex(selectedIndex - 1); setWinnerIdx(0); } : undefined}
      onNext={hasAwardNext ? () => { onChangeIndex(selectedIndex + 1); setWinnerIdx(0); } : undefined}
    >
      <div className="space-y-4">
        {/* Winner info header with compact prev/next navigation */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 min-w-0">
            {total > 1 && hasPrev && (
              <button onClick={() => setWinnerIdx((i) => i - 1)} className="p-1 hover:bg-surface-bright rounded-lg text-on-surface-variant shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 12h12" /><path d="m6 12 4-4" /><path d="m6 12 4 4" />
                </svg>
              </button>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-on-surface font-semibold truncate">{winner.name}</div>
              {winner.fullName && winner.fullName !== winner.name && (
                <div className="text-xs text-on-surface-variant truncate">{winner.fullName}</div>
              )}
            </div>
            {total > 1 && hasNext && (
              <button onClick={() => setWinnerIdx((i) => i + 1)} className="p-1 hover:bg-surface-bright rounded-lg text-on-surface-variant shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 12H6" /><path d="m18 12-4-4" /><path d="m18 12-4 4" />
                </svg>
              </button>
            )}
            {total > 1 && (
              <span className="text-xs text-on-surface-variant whitespace-nowrap shrink-0">
                {winnerIdx + 1} of {total}
              </span>
            )}
          </div>
          {winner.championPick && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-on-surface-variant inline-flex items-center gap-1">{"\uD83C\uDFC6"} Champion:</span>
              <TeamPill
                name={winner.championPick}
                seed={winner.championSeed}
                logo={teamLogo(teams, winner.championPick)}
                eliminated={winner.championEliminated}
                showStatus
              />
            </div>
          )}
        </div>
        <p className="text-sm text-on-surface-variant">{winner.stat}</p>

        {/* Award-specific content */}
        {renderContent()}
      </div>
    </BottomSheet>
  );
}
