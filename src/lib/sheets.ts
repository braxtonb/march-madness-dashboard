import { google } from "googleapis";
import { readFileSync } from "fs";
import type {
  Bracket, Pick, Game, Team, Snapshot, Meta, DashboardData,
} from "./types";

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;

// In-memory cache: { data, timestamp }
let cache: { data: DashboardData; ts: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getAuth() {
  let credentials: object;
  if (process.env.GOOGLE_CREDENTIALS) {
    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  } else if (process.env.GOOGLE_CREDENTIALS_PATH) {
    credentials = JSON.parse(
      readFileSync(process.env.GOOGLE_CREDENTIALS_PATH, "utf8")
    );
  } else {
    throw new Error(
      "Set GOOGLE_CREDENTIALS (JSON string) or GOOGLE_CREDENTIALS_PATH"
    );
  }
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

async function fetchTab(
  sheets: ReturnType<typeof google.sheets>,
  tab: string
): Promise<string[][]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tab}!A:ZZ`,
  });
  return (res.data.values as string[][]) || [];
}

function parseRows<T>(rows: string[][], parser: (headers: string[], row: string[]) => T): T[] {
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map((row) => parser(headers, row));
}

function col(headers: string[], row: string[], name: string): string {
  const idx = headers.indexOf(name);
  return idx >= 0 && idx < row.length ? row[idx] : "";
}

function num(headers: string[], row: string[], name: string): number {
  return parseFloat(col(headers, row, name)) || 0;
}

function bool(headers: string[], row: string[], name: string): boolean {
  const v = col(headers, row, name).toLowerCase();
  return v === "true" || v === "1";
}

function parseBracket(h: string[], r: string[]): Bracket {
  return {
    id: col(h, r, "id"),
    name: col(h, r, "name"),
    owner: col(h, r, "owner"),
    champion_pick: col(h, r, "champion_pick"),
    champion_seed: num(h, r, "champion_seed"),
    ff1: col(h, r, "ff1"),
    ff2: col(h, r, "ff2"),
    ff3: col(h, r, "ff3"),
    ff4: col(h, r, "ff4"),
    points: num(h, r, "points"),
    prev_rank: num(h, r, "prev_rank"),
    max_remaining: num(h, r, "max_remaining"),
    pct: num(h, r, "pct"),
    r64_pts: num(h, r, "r64_pts"),
    r32_pts: num(h, r, "r32_pts"),
    s16_pts: num(h, r, "s16_pts"),
    e8_pts: num(h, r, "e8_pts"),
    ff_pts: num(h, r, "ff_pts"),
    champ_pts: num(h, r, "champ_pts"),
  };
}

function parsePick(h: string[], r: string[]): Pick {
  return {
    bracket_id: col(h, r, "bracket_id"),
    game_id: col(h, r, "game_id"),
    round: col(h, r, "round") as Pick["round"],
    region: col(h, r, "region"),
    team_picked: col(h, r, "team_picked"),
    seed_picked: num(h, r, "seed_picked"),
    correct: bool(h, r, "correct"),
    vacated: bool(h, r, "vacated"),
  };
}

function parseGame(h: string[], r: string[]): Game {
  return {
    game_id: col(h, r, "game_id"),
    round: col(h, r, "round") as Game["round"],
    region: col(h, r, "region"),
    team1: col(h, r, "team1"),
    seed1: num(h, r, "seed1"),
    team2: col(h, r, "team2"),
    seed2: num(h, r, "seed2"),
    winner: col(h, r, "winner"),
    completed: bool(h, r, "completed"),
    national_pct_team1: num(h, r, "national_pct_team1"),
  };
}

function parseTeam(h: string[], r: string[]): Team {
  return {
    name: col(h, r, "name"),
    seed: num(h, r, "seed"),
    region: col(h, r, "region"),
    conference: col(h, r, "conference"),
    eliminated: bool(h, r, "eliminated"),
    eliminated_round: col(h, r, "eliminated_round"),
  };
}

function parseSnapshot(h: string[], r: string[]): Snapshot {
  return {
    bracket_id: col(h, r, "bracket_id"),
    round: col(h, r, "round") as Snapshot["round"],
    rank: num(h, r, "rank"),
    points: num(h, r, "points"),
    max_remaining: num(h, r, "max_remaining"),
    win_prob: num(h, r, "win_prob"),
  };
}

function parseMeta(h: string[], r: string[]): Meta {
  return {
    last_updated: col(h, r, "last_updated"),
    current_round: col(h, r, "current_round") as Meta["current_round"],
    games_completed: num(h, r, "games_completed"),
  };
}

export async function fetchDashboardData(): Promise<DashboardData> {
  // Return cache if fresh
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return cache.data;
  }

  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const [bracketsRaw, picksRaw, gamesRaw, teamsRaw, snapshotsRaw, metaRaw] =
    await Promise.all([
      fetchTab(sheets, "brackets"),
      fetchTab(sheets, "picks"),
      fetchTab(sheets, "games"),
      fetchTab(sheets, "teams"),
      fetchTab(sheets, "snapshots"),
      fetchTab(sheets, "meta"),
    ]);

  const data: DashboardData = {
    brackets: parseRows(bracketsRaw, parseBracket),
    picks: parseRows(picksRaw, parsePick),
    games: parseRows(gamesRaw, parseGame),
    teams: parseRows(teamsRaw, parseTeam),
    snapshots: parseRows(snapshotsRaw, parseSnapshot),
    meta: parseRows(metaRaw, parseMeta)[0] || {
      last_updated: "",
      current_round: "R64",
      games_completed: 0,
    },
  };

  cache = { data, ts: Date.now() };
  return data;
}
