"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import type { Game, Round } from "@/lib/types";
import { ROUND_ORDER, ROUND_LABELS } from "@/lib/constants";
import { useLiveScores } from "@/lib/useLiveScores";
import { RoundSelector } from "@/components/ui/RoundSelector";
import { GameCard, PicksDrawer } from "@/components/ui/GameCard";
import { TeamPill } from "@/components/ui/TeamPill";
import BottomSheet from "@/components/ui/BottomSheet";
import CompareCheckbox from "@/components/ui/CompareCheckbox";
import { GameHeatmap } from "@/components/charts/GameHeatmap";
import { BracketView } from "@/components/charts/BracketView";
import MultiSelectSearch from "@/components/ui/MultiSelectSearch";
import type { MultiSelectOption } from "@/components/ui/MultiSelectSearch";
import type { PickerDetails } from "@/components/ui/GameCard";
import { ViewBracketLink } from "@/components/ui/ViewBracketLink";
import { SimulateLink } from "@/components/ui/SimulateLink";
import type { Bracket } from "@/lib/types";

interface ChampBracketInfo {
  bracketId: string;
  bracketName: string;
  fullName: string;
}

interface ChampDistEntry {
  name: string;
  count: number;
  alive: boolean;
  logo: string;
  seed: number;
  brackets?: ChampBracketInfo[];
}

export function PicksContent({
  games,
  pickSplits,
  pickerDetailsMap,
  totalBrackets,
  currentRound,
  teamLogos = {},
  teamAbbrevs = {},
  champDistribution = [],
  brackets = [],
  bracketPicksMap = {},
  gameTeamsMap = {},
}: {
  games: Game[];
  pickSplits: Record<string, { team1Count: number; team2Count: number }>;
  pickerDetailsMap: Record<string, PickerDetails>;
  totalBrackets: number;
  currentRound: Round;
  teamLogos?: Record<string, string>;
  teamAbbrevs?: Record<string, string>;
  champDistribution?: ChampDistEntry[];
  brackets?: Bracket[];
  bracketPicksMap?: Record<string, Record<string, string>>;
  gameTeamsMap?: Record<string, [string, string]>;
}) {
  const searchParams = useSearchParams();
  const { liveGames } = useLiveScores();

  const eliminatedTeams = useMemo(() => {
    const set = new Set<string>();
    for (const g of games) {
      if (g.completed && g.winner) {
        if (g.team1 && g.team1 !== g.winner) set.add(g.team1);
        if (g.team2 && g.team2 !== g.winner) set.add(g.team2);
      }
    }
    return set;
  }, [games]);

  // Single-bracket filter for bracket view (deep-linked via ?bracket=)
  const [filterBracketId, setFilterBracketId] = useState<string>(
    searchParams.get("bracket") || ""
  );

  const bracketOptions: MultiSelectOption[] = useMemo(
    () => brackets.map((b) => ({
      value: b.id,
      label: b.name,
      sublabel: b.full_name && b.full_name !== b.name ? b.full_name : undefined,
    })),
    [brackets]
  );

  // Sync from URL when bracket param changes via Link navigation
  const lastSyncedBracket = useRef(searchParams.get("bracket") || "");
  useEffect(() => {
    const bracket = searchParams.get("bracket") || "";
    const rview = searchParams.get("rview");
    const view = searchParams.get("view") as PageTab | null;

    // Only act when the bracket param actually changed (not on other param changes like ?game=)
    if (bracket && bracket !== lastSyncedBracket.current) {
      lastSyncedBracket.current = bracket;
      setFilterBracketId(bracket);
      setDrawerGameId(null);
      setChampDrawerTeam(null);
      if (view === "results") setPageTab("results");
      if (rview === "bracket") setResultView("bracket");
    } else if (!bracket && lastSyncedBracket.current) {
      lastSyncedBracket.current = "";
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeFilterBracket = useCallback((id: string) => {
    setFilterBracketId(id);
    const url = new URL(window.location.href);
    if (id) {
      url.searchParams.set("bracket", id);
    } else {
      url.searchParams.delete("bracket");
    }
    window.history.replaceState(null, "", url.toString());
  }, []);

  type PageTab = "results" | "champions";
  const initialPageTab = (searchParams.get("view") as PageTab) || "results";
  const [pageTab, setPageTab] = useState<PageTab>(
    initialPageTab === "champions" ? "champions" : "results"
  );

  function changePageTab(t: PageTab) {
    setPageTab(t);
    const url = new URL(window.location.href);

    // Define which params belong to which tab
    const resultsParams = ["game", "round", "status", "rview"];
    const championsParams = ["champ"];

    // Clear params not belonging to the new tab
    const allTabParams = [...resultsParams, ...championsParams];
    for (const p of allTabParams) {
      if (t === "results" && resultsParams.includes(p)) continue;
      if (t === "champions" && championsParams.includes(p)) continue;
      url.searchParams.delete(p);
    }

    url.searchParams.set("view", t);
    window.history.replaceState(null, "", url.toString());
  }

  const VALID_ROUNDS: string[] = ["R64", "R32", "S16", "E8", "FF", "CHAMP", "ALL"];
  const initialRound = (() => {
    const param = searchParams.get("round");
    if (param && VALID_ROUNDS.includes(param)) return param;
    return "ALL";
  })();
  const [round, setRound] = useState<string>(initialRound);

  const isAllRounds = round === "ALL";

  const changeRound = useCallback(
    (newRound: string) => {
      setRound(newRound);
      const params = new URLSearchParams(window.location.search);
      params.set("round", newRound);
      window.history.replaceState(null, "", `?${params.toString()}`);
    },
    []
  );

  // Keep round in sync if user navigates back/forward
  useEffect(() => {
    const paramRound = searchParams.get("round");
    if (
      paramRound &&
      VALID_ROUNDS.includes(paramRound) &&
      paramRound !== round
    ) {
      setRound(paramRound);
    }
  }, [searchParams, round]);

  type StatusFilter = "all" | "completed" | "scheduled";
  const initialStatus = (() => {
    const param = searchParams.get("status");
    if (param && ["all", "completed", "scheduled"].includes(param)) return param as StatusFilter;
    return "all" as StatusFilter;
  })();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);

  type ResultView = "bracket" | "heatmap";
  const initialResultView = (() => {
    const param = searchParams.get("rview");
    if (param === "heatmap") return "heatmap" as ResultView;
    return "bracket" as ResultView;
  })();
  const [resultView, setResultView] = useState<ResultView>(initialResultView);

  const changeResultView = useCallback(
    (v: ResultView) => {
      setResultView(v);
      // Clear bracket filter when leaving bracket view so re-selecting works
      if (v !== "bracket") {
        setFilterBracketId("");
      }
      const url = new URL(window.location.href);
      url.searchParams.set("rview", v);
      if (v !== "bracket") {
        url.searchParams.delete("bracket");
      }
      window.history.replaceState(null, "", url.toString());
    },
    []
  );

  const changeStatusFilter = useCallback(
    (v: StatusFilter) => {
      setStatusFilter(v);
      const params = new URLSearchParams(window.location.search);
      params.set("status", v);
      window.history.replaceState(null, "", `?${params.toString()}`);
    },
    []
  );

  // Games for single-round view
  const roundGames = isAllRounds ? games : games.filter((g) => g.round === round);
  const completedGames = roundGames.filter((g) => g.completed);
  const scheduledGames = roundGames.filter((g) => !g.completed);

  const filteredGames = statusFilter === "completed"
    ? completedGames
    : statusFilter === "scheduled"
      ? scheduledGames
      : roundGames;

  // Collapsible rounds for All Rounds view
  const fullyCompletedRounds = useMemo(() => {
    const set = new Set<string>();
    for (const r of ROUND_ORDER) {
      const rGames = games.filter((g) => g.round === r);
      if (rGames.length > 0 && rGames.every((g) => g.completed)) {
        set.add(r);
      }
    }
    return set;
  }, [games]);

  const [collapsedRounds, setCollapsedRounds] = useState<Set<string>>(() => {
    const set = new Set(fullyCompletedRounds);
    const lastCompleted = ROUND_ORDER.filter((r) => set.has(r)).pop();
    if (lastCompleted) set.delete(lastCompleted);
    return set;
  });

  const toggleRoundCollapse = useCallback((r: string) => {
    setCollapsedRounds((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  }, []);

  // Champion distribution drawer state
  const [champDrawerTeam, setChampDrawerTeam] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const champ = params.get("champ");
    if (champ) setChampDrawerTeam(champ);
  }, []);

  function setChampDrawerWithUrl(team: string | null) {
    setChampDrawerTeam(team);
    const url = new URL(window.location.href);
    if (team) {
      url.searchParams.set("champ", team);
    } else {
      url.searchParams.delete("champ");
    }
    window.history.replaceState(null, "", url.toString());
  }
  const champDrawerEntry = champDrawerTeam
    ? champDistribution.find((e) => e.name === champDrawerTeam)
    : null;

  // Drawer state — managed here for cross-game navigation
  const [drawerGameId, setDrawerGameId] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const game = params.get("game");
    if (game) setDrawerGameId(game);
  }, []);

  function setDrawerGameWithUrl(gameId: string | null) {
    setDrawerGameId(gameId);
    const url = new URL(window.location.href);
    if (gameId) {
      url.searchParams.set("game", gameId);
    } else {
      url.searchParams.delete("game");
    }
    window.history.replaceState(null, "", url.toString());
  }

  const drawerGame = drawerGameId ? games.find((g) => g.game_id === drawerGameId) : null;
  const drawerIdx = drawerGameId ? filteredGames.findIndex((g) => g.game_id === drawerGameId) : -1;

  function openDrawer(gameId: string) {
    setDrawerGameWithUrl(gameId);
  }

  function navigateDrawer(delta: number) {
    if (drawerIdx < 0) return;
    const nextIdx = drawerIdx + delta;
    if (nextIdx >= 0 && nextIdx < filteredGames.length) {
      setDrawerGameWithUrl(filteredGames[nextIdx].game_id);
    }
  }

  const TAB_ACTIVE = "text-primary border-b-2 border-primary px-3 py-1.5 text-sm font-semibold font-label";
  const TAB_INACTIVE = "text-on-surface-variant hover:text-on-surface px-3 py-1.5 text-sm font-semibold font-label";

  // Panel icon for sidebar/drawer triggers (Fix 9)
  const panelIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );

  return (
    <div className="space-y-section">
      {/* Page-level tabs */}
      <div className="overflow-x-auto no-scrollbar">
        <div className="flex gap-2 min-w-max">
          <button onClick={() => changePageTab("results")} className={pageTab === "results" ? TAB_ACTIVE : TAB_INACTIVE}>
            Game Results
          </button>
          <button onClick={() => changePageTab("champions")} className={pageTab === "champions" ? TAB_ACTIVE : TAB_INACTIVE}>
            Champion Distribution
          </button>
        </div>
      </div>

      {pageTab === "results" && (
      <div className="space-y-section">
      {/* View toggle — ALWAYS shown, above filters */}
      <div className="overflow-x-auto no-scrollbar">
        <div className="flex gap-1.5 min-w-max">
          {([
            { label: "Bracket", value: "bracket" as ResultView },
            { label: "Heatmap", value: "heatmap" as ResultView },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => changeResultView(opt.value)}
              className={`rounded-card px-2.5 py-1 text-xs font-label h-7 transition-colors ${
                resultView === opt.value
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Round selector + status filters — ALWAYS visible, disabled for bracket view */}
      <div className={resultView === "bracket" ? "opacity-40 pointer-events-none" : ""}>
      <div className="flex flex-wrap items-center gap-3">
        <RoundSelector
          selected={round}
          onSelect={changeRound}
          extraOptions={[{ value: "ALL", label: "All Rounds" }]}
        />
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex gap-1.5 min-w-max">
            {([
              { label: `All (${roundGames.length})`, value: "all" as StatusFilter },
              { label: `Completed (${completedGames.length})`, value: "completed" as StatusFilter },
              { label: `Scheduled (${scheduledGames.length})`, value: "scheduled" as StatusFilter },
            ]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => changeStatusFilter(opt.value)}
                className={`rounded-card px-2.5 py-1 text-xs font-label h-7 transition-colors ${
                  statusFilter === opt.value
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      </div>

      {/* Bracket view — shows all rounds, ignores round/status filters */}
      {resultView === "bracket" && (
        <>
          <div className="w-full sm:w-64 mb-3">
            <MultiSelectSearch
              mode="single"
              label="Brackets"
              options={bracketOptions}
              selectedId={filterBracketId}
              onSelect={(id) => changeFilterBracket(id)}
              onClear={() => changeFilterBracket("")}
              placeholder="View a bracket's picks..."
            />
          </div>
          <BracketView
            games={games}
            pickSplits={pickSplits}
            totalBrackets={totalBrackets}
            teamLogos={teamLogos}
            teamAbbrevs={teamAbbrevs}
            eliminatedTeams={eliminatedTeams}
            onGameClick={openDrawer}
            highlightBracketPicks={filterBracketId ? bracketPicksMap[filterBracketId] : undefined}
            gameTeamsMap={gameTeamsMap}
            liveGames={liveGames}
          />
        </>
      )}

      {/* Heatmap view */}
      {resultView === "heatmap" && (
        <GameHeatmap
          games={games}
          pickSplits={pickSplits}
          totalBrackets={totalBrackets}
          round={round}
          statusFilter={statusFilter}
          onGameClick={openDrawer}
        />
      )}


      {/* Centralized drawer with prev/next navigation */}
      {drawerGame && pickerDetailsMap[drawerGame.game_id] && (
        <PicksDrawer
          game={drawerGame}
          pickerDetails={pickerDetailsMap[drawerGame.game_id]}
          onClose={() => setDrawerGameWithUrl(null)}
          teamLogos={teamLogos}
          onPrev={drawerIdx > 0 ? () => navigateDrawer(-1) : undefined}
          onNext={drawerIdx < filteredGames.length - 1 ? () => navigateDrawer(1) : undefined}
          eliminatedTeams={eliminatedTeams}
        />
      )}
      </div>
      )}

      {/* Champion Distribution tab */}
      {pageTab === "champions" && champDistribution.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs text-on-surface-variant">
            How many brackets picked each team to win the championship. Click to see who picked each team.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {[...champDistribution].sort((a, b) => {
              if (a.alive !== b.alive) return a.alive ? -1 : 1;
              if (a.seed !== b.seed) return a.seed - b.seed;
              return a.name.localeCompare(b.name);
            }).map((entry) => (
              <div
                key={entry.name}
                className="rounded-card bg-surface-container overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setChampDrawerWithUrl(entry.name)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-surface-bright transition-colors"
                >
                  <TeamPill
                    name={entry.name}
                    seed={entry.seed}
                    logo={entry.logo}
                    eliminated={!entry.alive}
                    showStatus
                  />
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <span className="font-label text-xs text-on-surface-variant">
                      {entry.count} bracket{entry.count !== 1 ? "s" : ""}
                    </span>
                    <span className="text-on-surface-variant/60">
                      {panelIcon}
                    </span>
                  </div>
                </button>
              </div>
            ))}
          </div>

          {/* Champion distribution drawer (Fix 8) */}
          {champDrawerEntry && champDrawerEntry.brackets && (
            <BottomSheet
              open={true}
              onClose={() => setChampDrawerWithUrl(null)}
              title={`Picked ${champDrawerEntry.name}`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-4">
                  <TeamPill
                    name={champDrawerEntry.name}
                    seed={champDrawerEntry.seed}
                    logo={champDrawerEntry.logo}
                    eliminated={!champDrawerEntry.alive}
                    showStatus
                  />
                  <span className="text-xs text-on-surface-variant">
                    {champDrawerEntry.count} bracket{champDrawerEntry.count !== 1 ? "s" : ""}
                  </span>
                </div>
                {champDrawerEntry.brackets.map((b) => (
                  <div key={b.bracketName} className="group flex items-center gap-2 py-1.5">
                    <CompareCheckbox bracketId={b.bracketId} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-on-surface truncate">{b.bracketName}</p>
                      {b.fullName && b.fullName !== b.bracketName && (
                        <p className="text-[10px] text-on-surface-variant truncate">{b.fullName}</p>
                      )}
                      <ViewBracketLink bracketId={b.bracketId} className="mt-0.5" />
                    </div>
                  </div>
                ))}
              </div>
            </BottomSheet>
          )}
        </div>
      )}
    </div>
  );
}
