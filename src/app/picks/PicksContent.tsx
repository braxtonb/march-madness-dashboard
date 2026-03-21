"use client";

import { useState } from "react";
import type { Game, Round } from "@/lib/types";
import { RoundSelector } from "@/components/ui/RoundSelector";
import { GameCard } from "@/components/ui/GameCard";

type Tab = "consensus" | "lens";

export function PicksContent({
  games,
  pickSplits,
  totalBrackets,
  conferenceData,
  currentRound,
}: {
  games: Game[];
  pickSplits: Record<string, { team1Count: number; team2Count: number }>;
  totalBrackets: number;
  conferenceData: [string, number][];
  currentRound: Round;
}) {
  const [tab, setTab] = useState<Tab>("consensus");
  const [round, setRound] = useState<Round>(currentRound);

  const filteredGames = games.filter((g) => g.round === round);
  const maxConfCount = conferenceData[0]?.[1] || 1;

  return (
    <div className="space-y-section">
      <div className="flex gap-2">
        <button
          onClick={() => setTab("consensus")}
          className={`rounded-card px-4 py-2 text-sm font-label transition-colors ${
            tab === "consensus"
              ? "bg-surface-bright text-primary"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Consensus
        </button>
        <button
          onClick={() => setTab("lens")}
          className={`rounded-card px-4 py-2 text-sm font-label transition-colors ${
            tab === "lens"
              ? "bg-surface-bright text-primary"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Tournament Lens
        </button>
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
              />
            ))}
          </div>
          {filteredGames.length === 0 && (
            <p className="text-on-surface-variant text-sm text-center py-8">
              No games in this round yet.
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
              Total advancing picks our brackets gave to each conference&apos;s teams.
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
