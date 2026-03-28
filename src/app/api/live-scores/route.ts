import { NextResponse } from "next/server";
import { fetchDashboardData } from "@/lib/sheets";

// Tournament date bounds (ET)
const TOURNAMENT_START = new Date("2026-03-19T00:00:00-04:00").getTime();
const TOURNAMENT_END = new Date("2026-04-08T00:00:00-04:00").getTime();

// Quiet hours: 3am-10am ET — games can run past midnight with OT/late tips
const QUIET_START_HOUR_ET = 3;
const QUIET_END_HOUR_ET = 10;

// How far ahead of a game start time to begin checking (ms)
const LOOKAHEAD_MS = 60 * 60 * 1000; // 1 hour before
// How long after a game's scheduled start to keep checking even if no live data (ms)
const LOOKBEHIND_MS = 4 * 60 * 60 * 1000; // 4 hours after (covers OT, delays)

interface LiveGame {
  espnGameId: string;
  status: "pre" | "in" | "post";
  statusDetail: string;
  displayClock: string;
  period: number;
  team1: { name: string; abbreviation: string; score: string; logo: string };
  team2: { name: string; abbreviation: string; score: string; logo: string };
}

interface LiveScoresResponse {
  games: LiveGame[];
  nextCheckMs: number; // ms from now until client should poll again
  reason: string; // why this response was returned (for debugging)
}

function getETHour(): number {
  const now = new Date();
  const etString = now.toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false });
  return parseInt(etString, 10);
}

export async function GET(): Promise<NextResponse<LiveScoresResponse>> {
  const now = Date.now();

  // 1. Outside tournament dates — don't check
  if (now < TOURNAMENT_START || now > TOURNAMENT_END) {
    return NextResponse.json(
      { games: [], nextCheckMs: 24 * 60 * 60 * 1000, reason: "outside_tournament" },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=3600" } }
    );
  }

  // 2. Quiet hours (1am-10am ET) — no games
  const etHour = getETHour();
  if (etHour >= QUIET_START_HOUR_ET && etHour < QUIET_END_HOUR_ET) {
    // Next check at 10am ET
    const msUntil10am = ((QUIET_END_HOUR_ET - etHour) * 60 * 60 * 1000);
    return NextResponse.json(
      { games: [], nextCheckMs: msUntil10am, reason: "quiet_hours" },
      { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=1800" } }
    );
  }

  // 3. Check if any games are near their start time
  let hasNearbyGames = false;
  let nextGameStartMs = Infinity;

  try {
    const data = await fetchDashboardData();
    for (const g of data.games) {
      if (g.completed) continue;
      const startDate = g.start_date;
      if (!startDate || startDate === 0) continue;

      const timeDiff = startDate - now;

      // Game is within the check window (1h before to 4h after start)
      if (timeDiff < LOOKAHEAD_MS && timeDiff > -LOOKBEHIND_MS) {
        hasNearbyGames = true;
        break;
      }

      // Track next upcoming game for nextCheck calculation
      if (timeDiff > 0 && startDate < nextGameStartMs) {
        nextGameStartMs = startDate;
      }
    }
  } catch {
    // If data.json fails, check ESPN anyway
    hasNearbyGames = true;
  }

  // 4. No games nearby — tell client when to check next
  if (!hasNearbyGames) {
    const msUntilNextGame = nextGameStartMs === Infinity
      ? 60 * 60 * 1000  // default 1 hour
      : Math.max(0, nextGameStartMs - now - LOOKAHEAD_MS);

    return NextResponse.json(
      { games: [], nextCheckMs: Math.min(msUntilNextGame, 60 * 60 * 1000), reason: "no_nearby_games" },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300" } }
    );
  }

  // 5. Games are near — fetch ESPN scoreboard (today + yesterday to catch games past midnight)
  try {
    const nowET = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
    const today = nowET.toISOString().slice(0, 10).replace(/-/g, "");
    const yesterday = new Date(nowET.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, "");

    const baseUrl = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard";
    const [resToday, resYesterday] = await Promise.all([
      fetch(`${baseUrl}?dates=${today}&groups=100`, { next: { revalidate: 30 } }),
      etHour < 3 ? fetch(`${baseUrl}?dates=${yesterday}&groups=100`, { next: { revalidate: 30 } }) : Promise.resolve(null),
    ]);

    if (!resToday.ok) {
      return NextResponse.json(
        { games: [], nextCheckMs: 60 * 1000, reason: "espn_error" },
        { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" } }
      );
    }

    const espnDataToday = await resToday.json();
    const espnDataYesterday = resYesterday && resYesterday.ok ? await resYesterday.json() : { events: [] };
    // Deduplicate by event ID in case same game appears on both dates
    const seenIds = new Set<string>();
    const events = [...(espnDataToday.events || []), ...(espnDataYesterday.events || [])].filter((e: Record<string, unknown>) => {
      const id = String(e.id || "");
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });

    const games: LiveGame[] = events
      .filter((e: Record<string, unknown>) => {
        const comp = ((e.competitions as Record<string, unknown>[]) || [])[0] || {};
        const status = (comp.status as Record<string, unknown>) || {};
        const statusType = (status.type as Record<string, unknown>) || {};
        // Only include in-progress or recently completed (within last 30 min)
        const name = statusType.name as string;
        return name === "STATUS_IN_PROGRESS" || name === "STATUS_HALFTIME" || name === "STATUS_FINAL" || name === "STATUS_SCHEDULED";
      })
      .map((e: Record<string, unknown>) => {
        const comp = ((e.competitions as Record<string, unknown>[]) || [])[0] || {};
        const status = (comp.status as Record<string, unknown>) || {};
        const statusType = (status.type as Record<string, unknown>) || {};
        const competitors = (comp.competitors as Record<string, unknown>[]) || [];
        const c1 = competitors[0] || {};
        const c2 = competitors[1] || {};
        const t1 = (c1.team as Record<string, unknown>) || {};
        const t2 = (c2.team as Record<string, unknown>) || {};

        const statusName = statusType.name as string;
        let mappedStatus: "pre" | "in" | "post" = "pre";
        if (statusName === "STATUS_IN_PROGRESS" || statusName === "STATUS_HALFTIME") mappedStatus = "in";
        else if (statusName === "STATUS_FINAL") mappedStatus = "post";

        return {
          espnGameId: String(comp.id || e.id || ""),
          status: mappedStatus,
          statusDetail: String((statusType.shortDetail || statusType.detail || "") as string),
          displayClock: String((status.displayClock || "") as string),
          period: Number(status.period || 0),
          team1: {
            name: String(t1.displayName || ""),
            abbreviation: String(t1.abbreviation || ""),
            score: String(c1.score || "0"),
            logo: String(((t1.logos as Record<string, unknown>[]) || [])[0]?.href || t1.logo || ""),
          },
          team2: {
            name: String(t2.displayName || ""),
            abbreviation: String(t2.abbreviation || ""),
            score: String(c2.score || "0"),
            logo: String(((t2.logos as Record<string, unknown>[]) || [])[0]?.href || t2.logo || ""),
          },
        };
      });

    const hasLiveGames = games.some((g) => g.status === "in");

    return NextResponse.json(
      {
        games,
        nextCheckMs: hasLiveGames ? 30 * 1000 : 5 * 60 * 1000,
        reason: hasLiveGames ? "live_games" : "games_today",
      },
      { headers: { "Cache-Control": `public, s-maxage=${hasLiveGames ? 30 : 120}, stale-while-revalidate=${hasLiveGames ? 30 : 120}` } }
    );
  } catch {
    return NextResponse.json(
      { games: [], nextCheckMs: 60 * 1000, reason: "fetch_error" },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" } }
    );
  }
}
