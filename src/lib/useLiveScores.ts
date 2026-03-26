"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface LiveTeam {
  name: string;
  abbreviation: string;
  score: string;
  logo: string;
}

export interface LiveGame {
  espnGameId: string;
  status: "pre" | "in" | "post";
  statusDetail: string;
  displayClock: string;
  period: number;
  team1: LiveTeam;
  team2: LiveTeam;
}

interface LiveScoresResponse {
  games: LiveGame[];
  nextCheckMs: number;
  reason: string;
}

/**
 * Hook that polls /api/live-scores with smart scheduling.
 * Returns a Map of espnGameId -> LiveGame for easy lookup.
 */
export function useLiveScores() {
  const [liveGames, setLiveGames] = useState<Map<string, LiveGame>>(new Map());
  const [isLive, setIsLive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const fetchScores = useCallback(async () => {
    try {
      const res = await fetch("/api/live-scores");
      if (!res.ok) return;
      const data: LiveScoresResponse = await res.json();

      if (!mountedRef.current) return;

      const map = new Map<string, LiveGame>();
      for (const g of data.games) {
        map.set(g.espnGameId, g);
      }
      setLiveGames(map);
      setIsLive(data.games.some((g) => g.status === "in"));

      // Schedule next poll based on server's recommendation
      if (timerRef.current) clearTimeout(timerRef.current);
      const nextMs = Math.max(data.nextCheckMs, 10000); // minimum 10s
      timerRef.current = setTimeout(() => {
        if (mountedRef.current) fetchScores();
      }, nextMs);
    } catch {
      // Retry in 60s on error
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (mountedRef.current) fetchScores();
      }, 60000);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchScores();
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchScores]);

  return { liveGames, isLive };
}
