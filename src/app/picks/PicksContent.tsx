"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Game, Round } from "@/lib/types";
import { RoundSelector } from "@/components/ui/RoundSelector";
import { GameCard, PicksDrawer } from "@/components/ui/GameCard";
import type { PickerDetails } from "@/components/ui/GameCard";

export function PicksContent({
  games,
  pickSplits,
  pickerDetailsMap,
  totalBrackets,
  currentRound,
  teamLogos = {},
}: {
  games: Game[];
  pickSplits: Record<string, { team1Count: number; team2Count: number }>;
  pickerDetailsMap: Record<string, PickerDetails>;
  totalBrackets: number;
  currentRound: Round;
  teamLogos?: Record<string, string>;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();

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
    (newRound: Round) => {
      setRound(newRound);
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

  const filteredGames = games.filter((g) => g.round === round);

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

  return (
    <div className="space-y-section">
      <RoundSelector selected={round} onSelect={changeRound} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGames.map((game) => (
          <GameCard
            key={game.game_id}
            game={game}
            pickSplit={
              pickSplits[game.game_id] || { team1Count: 0, team2Count: 0 }
            }
            totalBrackets={totalBrackets}
            pickerDetails={pickerDetailsMap[game.game_id]}
            teamLogos={teamLogos}
            onOpenDrawer={() => openDrawer(game.game_id)}
          />
        ))}
      </div>
      {filteredGames.length === 0 && (
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
        />
      )}
    </div>
  );
}
