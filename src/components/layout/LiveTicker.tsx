"use client";

import { useMemo } from "react";
import { useLiveScores } from "@/lib/useLiveScores";
import type { Game } from "@/lib/types";
import Link from "next/link";

function extractEspnId(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/gameId\/(\d+)/);
  return match ? match[1] : null;
}

export function LiveTicker({ games }: { games: Game[] }) {
  const { liveGames, isLive } = useLiveScores();

  const liveEntries = useMemo(() => {
    if (!isLive || liveGames.size === 0) return [];
    return games
      .map((g) => {
        const espnId = extractEspnId(g.espn_url);
        const live = espnId ? liveGames.get(espnId) : undefined;
        if (!live || live.status !== "in") return null;
        return { game: g, live };
      })
      .filter(Boolean) as { game: Game; live: NonNullable<ReturnType<typeof liveGames.get>> }[];
  }, [games, liveGames, isLive]);

  const show = liveEntries.length > 0;

  return (
    <div
      className="sticky top-[52px] z-40 ml-0 md:ml-16 grid transition-all duration-500 ease-in-out"
      style={{ gridTemplateRows: show ? "1fr" : "0fr" }}
    >
      <div className="overflow-hidden">
        <div className={`bg-surface/95 backdrop-blur-sm border-b border-outline-variant/10 transition-opacity duration-500 ${show ? "opacity-100" : "opacity-0"}`}>
          <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center gap-3 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="text-[11px] font-label font-semibold text-primary uppercase tracking-wider">Live</span>
              <span className="text-[10px] text-on-surface-variant font-label hidden sm:inline">Updates every 30s</span>
            </div>

            {liveEntries.map(({ game, live }) => (
              <Link
                key={game.game_id}
                href="/picks?view=results&rview=bracket"
                className="flex items-center gap-1.5 sm:gap-2 rounded-lg bg-surface-container/80 px-2 sm:px-2.5 py-1 shrink-0 hover:bg-surface-bright transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  {live.team1.logo && <img src={live.team1.logo} alt="" className="w-4 h-4 object-contain" />}
                  <span className="text-xs font-label font-semibold text-on-surface">{live.team1.abbreviation}</span>
                  <span className="text-sm font-bold text-on-surface">{live.team1.score}</span>
                </div>
                <span className="text-[10px] text-on-surface-variant/60">–</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-on-surface">{live.team2.score}</span>
                  <span className="text-xs font-label font-semibold text-on-surface">{live.team2.abbreviation}</span>
                  {live.team2.logo && <img src={live.team2.logo} alt="" className="w-4 h-4 object-contain" />}
                </div>
                <span className="text-[10px] font-label text-primary">{live.statusDetail}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
