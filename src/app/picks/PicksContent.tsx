"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Game, Round } from "@/lib/types";
import { RoundSelector } from "@/components/ui/RoundSelector";
import { GameCard, PicksDrawer } from "@/components/ui/GameCard";
import { TeamPill } from "@/components/ui/TeamPill";
import type { PickerDetails } from "@/components/ui/GameCard";

interface ChampDistEntry {
  name: string;
  count: number;
  alive: boolean;
  logo: string;
  seed: number;
}

export function PicksContent({
  games,
  pickSplits,
  pickerDetailsMap,
  totalBrackets,
  currentRound,
  teamLogos = {},
  champDistribution = [],
}: {
  games: Game[];
  pickSplits: Record<string, { team1Count: number; team2Count: number }>;
  pickerDetailsMap: Record<string, PickerDetails>;
  totalBrackets: number;
  currentRound: Round;
  teamLogos?: Record<string, string>;
  champDistribution?: ChampDistEntry[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();

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

  type PageTab = "results" | "champions";
  const initialPageTab = (searchParams.get("view") as PageTab) || "results";
  const [pageTab, setPageTab] = useState<PageTab>(
    initialPageTab === "champions" ? "champions" : "results"
  );

  function changePageTab(t: PageTab) {
    setPageTab(t);
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", t);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  const VALID_ROUNDS: Round[] = ["R64", "R32", "S16", "E8", "FF", "CHAMP"];
  const initialRound = (() => {
    const param = searchParams.get("round");
    if (param && VALID_ROUNDS.includes(param as Round)) return param as Round;
    return currentRound;
  })();
  const [round, setRound] = useState<Round>(initialRound);

  const updateUrl = useCallback(
    (params: URLSearchParams) => {
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router]
  );

  const changeRound = useCallback(
    (newRound: string) => {
      setRound(newRound as Round);
      const params = new URLSearchParams(searchParams.toString());
      params.set("round", newRound);
      updateUrl(params);
    },
    [searchParams, updateUrl]
  );

  // Keep round in sync if user navigates back/forward
  useEffect(() => {
    const paramRound = searchParams.get("round");
    if (
      paramRound &&
      VALID_ROUNDS.includes(paramRound as Round) &&
      paramRound !== round
    ) {
      setRound(paramRound as Round);
    }
  }, [searchParams, round]);

  type StatusFilter = "all" | "completed" | "scheduled";
  const initialStatus = (() => {
    const param = searchParams.get("status");
    if (param && ["all", "completed", "scheduled"].includes(param)) return param as StatusFilter;
    return "all" as StatusFilter;
  })();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);

  const changeStatusFilter = useCallback(
    (v: StatusFilter) => {
      setStatusFilter(v);
      const params = new URLSearchParams(searchParams.toString());
      params.set("status", v);
      updateUrl(params);
    },
    [searchParams, updateUrl]
  );

  const roundGames = games.filter((g) => g.round === round);
  const completedGames = roundGames.filter((g) => g.completed);
  const scheduledGames = roundGames.filter((g) => !g.completed);

  const filteredGames = statusFilter === "completed"
    ? completedGames
    : statusFilter === "scheduled"
      ? scheduledGames
      : roundGames;

  // Drawer state — managed here for cross-game navigation
  const [drawerGameId, setDrawerGameId] = useState<string | null>(null);

  const drawerGame = drawerGameId ? games.find((g) => g.game_id === drawerGameId) : null;
  const drawerIdx = drawerGameId ? filteredGames.findIndex((g) => g.game_id === drawerGameId) : -1;

  function openDrawer(gameId: string) {
    setDrawerGameId(gameId);
  }

  function navigateDrawer(delta: number) {
    if (drawerIdx < 0) return;
    const nextIdx = drawerIdx + delta;
    if (nextIdx >= 0 && nextIdx < filteredGames.length) {
      setDrawerGameId(filteredGames[nextIdx].game_id);
    }
  }

  const TAB_ACTIVE = "bg-primary/15 text-primary border border-primary/30 rounded-card px-3 py-1.5 text-sm font-label";
  const TAB_INACTIVE = "text-on-surface-variant hover:text-on-surface rounded-card px-3 py-1.5 text-sm font-label";

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
      <div className="flex flex-wrap items-center gap-3">
        <RoundSelector selected={round} onSelect={changeRound} />
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
                className={`rounded-card px-2.5 py-1 text-[10px] font-label transition-colors ${
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

      {/* Completed games */}
      {(statusFilter === "all" || statusFilter === "completed") && completedGames.length > 0 && (
        <>
          <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant">
            Completed ({completedGames.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedGames.map((game) => (
              <GameCard
                key={game.game_id}
                game={game}
                pickSplit={pickSplits[game.game_id] || { team1Count: 0, team2Count: 0 }}
                totalBrackets={totalBrackets}
                pickerDetails={pickerDetailsMap[game.game_id]}
                teamLogos={teamLogos}
                onOpenDrawer={() => openDrawer(game.game_id)}
                eliminatedTeams={eliminatedTeams}
              />
            ))}
          </div>
        </>
      )}

      {/* Scheduled games */}
      {(statusFilter === "all" || statusFilter === "scheduled") && scheduledGames.length > 0 && (
        <>
          <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant pt-2">
            Scheduled ({scheduledGames.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scheduledGames.map((game) => (
              <GameCard
                key={game.game_id}
                game={game}
                pickSplit={pickSplits[game.game_id] || { team1Count: 0, team2Count: 0 }}
                totalBrackets={totalBrackets}
                pickerDetails={pickerDetailsMap[game.game_id]}
                teamLogos={teamLogos}
                onOpenDrawer={() => openDrawer(game.game_id)}
                eliminatedTeams={eliminatedTeams}
              />
            ))}
          </div>
        </>
      )}

      {roundGames.length === 0 && (
        <p className="text-on-surface-variant text-sm text-center py-8">
          No games scheduled for this round.
        </p>
      )}

      {/* Centralized drawer with prev/next navigation */}
      {drawerGame && pickerDetailsMap[drawerGame.game_id] && (
        <PicksDrawer
          game={drawerGame}
          pickerDetails={pickerDetailsMap[drawerGame.game_id]}
          onClose={() => setDrawerGameId(null)}
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
            How many brackets picked each team to win the championship.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {champDistribution.map((entry) => (
              <div
                key={entry.name}
                className="flex items-center justify-between rounded-card bg-surface-container px-3 py-2.5"
              >
                <TeamPill
                  name={entry.name}
                  seed={entry.seed}
                  logo={entry.logo}
                  eliminated={!entry.alive}
                  showStatus
                />
                <span className="font-label text-xs text-on-surface-variant ml-2 shrink-0">
                  {entry.count} bracket{entry.count !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
