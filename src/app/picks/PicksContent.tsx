"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Game, Round } from "@/lib/types";
import { RoundSelector } from "@/components/ui/RoundSelector";
import { GameCard } from "@/components/ui/GameCard";
import type { PickerDetails } from "@/components/ui/GameCard";

type Tab = "consensus" | "lens";

function isValidTab(value: string | null): value is Tab {
  return value === "consensus" || value === "lens";
}

export function PicksContent({
  games,
  pickSplits,
  pickerDetailsMap,
  totalBrackets,
  conferenceData,
  currentRound,
}: {
  games: Game[];
  pickSplits: Record<string, { team1Count: number; team2Count: number }>;
  pickerDetailsMap: Record<string, PickerDetails>;
  totalBrackets: number;
  conferenceData: [string, number][];
  currentRound: Round;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialTab = isValidTab(searchParams.get("tab"))
    ? (searchParams.get("tab") as Tab)
    : "consensus";

  const [tab, setTab] = useState<Tab>(initialTab);
  const [round, setRound] = useState<Round>(currentRound);

  const changeTab = useCallback(
    (newTab: Tab) => {
      setTab(newTab);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", newTab);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  // Keep tab in sync if user navigates back/forward
  useEffect(() => {
    const paramTab = searchParams.get("tab");
    if (isValidTab(paramTab) && paramTab !== tab) {
      setTab(paramTab);
    }
  }, [searchParams, tab]);

  const filteredGames = games.filter((g) => g.round === round);
  const maxConfCount = conferenceData[0]?.[1] || 1;

  return (
    <div className="space-y-section">
      <div className="flex gap-2">
        <button
          onClick={() => changeTab("consensus")}
          className={`rounded-card px-4 py-2 text-sm font-label transition-colors ${
            tab === "consensus"
              ? "bg-surface-bright text-primary"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Consensus
        </button>
        <div className="flex flex-col items-start">
          <button
            onClick={() => changeTab("lens")}
            className={`rounded-card px-4 py-2 text-sm font-label transition-colors ${
              tab === "lens"
                ? "bg-surface-bright text-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Tournament Lens
          </button>
          <span className="text-[10px] text-on-surface-variant ml-4 -mt-1">
            Conference &amp; region trends
          </span>
        </div>
      </div>

      {tab === "consensus" && (
        <div className="space-y-section">
          <RoundSelector selected={round} onSelect={setRound} />
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
              />
            ))}
          </div>
          {filteredGames.length === 0 && (
            <p className="text-on-surface-variant text-sm text-center py-8">
              No games scheduled for this round.
            </p>
          )}
        </div>
      )}

      {tab === "lens" && (
        <div className="space-y-section">
          <div className="rounded-card bg-surface-container p-5 space-y-4">
            <h3 className="font-display text-lg font-semibold">
              How we pick by conference
            </h3>
            <p className="text-sm text-on-surface-variant">
              Discover how our group&apos;s pick tendencies compare to
              historical patterns &mdash; which conferences and seeds we believe
              in most.
            </p>
            <div className="space-y-2">
              {conferenceData.map(([conf, count]) => (
                <div key={conf} className="flex items-center gap-3">
                  <span className="font-label text-xs text-on-surface-variant w-20 shrink-0">
                    {conf}
                  </span>
                  <div className="flex-1 h-4 rounded-full bg-surface-bright overflow-hidden">
                    <div
                      className="h-full bg-secondary rounded-full transition-all"
                      style={{
                        width: `${(count / maxConfCount) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="font-label text-xs text-on-surface w-10 text-right">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {["R1", "R2", "R3", "R4"].map((region) => {
              const regionGames = games.filter(
                (g) => g.region === region
              );
              const completed = regionGames.filter((g) => g.completed).length;
              return (
                <div
                  key={region}
                  className="rounded-card bg-surface-container p-4 space-y-2"
                >
                  <span className="font-label text-xs text-on-surface-variant uppercase">
                    Region {region.replace("R", "")}
                  </span>
                  <p className="font-display text-lg font-semibold text-on-surface">
                    {completed}/{regionGames.length} complete
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
