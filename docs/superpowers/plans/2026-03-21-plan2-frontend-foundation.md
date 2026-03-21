# Plan 2: Frontend Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Next.js frontend for the March Madness bracket analytics dashboard — scaffold, data layer, shared components, and first 3 pages (Leaderboard, Group Picks, Alive Board).

**Architecture:** Next.js 14 App Router with server components. Data fetched from Google Sheets API via service account (not published CSV). Analytics computed server-side. Recharts for charts. Kinetic Terminal design system via Tailwind.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, googleapis (Google Sheets API), Recharts, Plus Jakarta Sans / Inter / Space Grotesk fonts

---

## File Structure

```
march-madness-dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx                # Global shell (Navbar + Sidebar)
│   │   ├── page.tsx                  # Leaderboard + Tournament Pulse
│   │   ├── picks/page.tsx            # Group Picks (Consensus + Lens tabs)
│   │   ├── alive/page.tsx            # Alive Board
│   │   └── globals.css               # Global styles + CSS custom properties
│   ├── lib/
│   │   ├── types.ts                  # TypeScript interfaces matching Sheet schema
│   │   ├── constants.ts              # ROUND_POINTS, SEED_WIN_RATES, colors, rounds
│   │   ├── sheets.ts                 # Google Sheets API fetch + cache
│   │   └── analytics.ts              # uniqueness, archetypes, madness index, estimated win prob
│   └── components/
│       ├── layout/
│       │   ├── Navbar.tsx
│       │   └── Sidebar.tsx
│       ├── ui/
│       │   ├── StatCard.tsx
│       │   ├── TeamPill.tsx
│       │   └── RoundSelector.tsx
│       ├── charts/
│       │   ├── MadnessGauge.tsx       # Animated ring gauge (Recharts PieChart)
│       │   └── ChampionDonut.tsx      # Champion distribution donut (Recharts)
│       └── tables/
│           ├── LeaderboardTable.tsx    # Sortable standings table
│           └── DrilldownTable.tsx      # Reusable sortable/searchable table
├── tailwind.config.ts
├── next.config.js
├── package.json
├── tsconfig.json
└── .env.local                         # GOOGLE_CREDENTIALS, SPREADSHEET_ID
```

**Key references:**
- Spec: `docs/superpowers/specs/2026-03-20-bracket-dashboard-design.md`
- Design system: `stitch/apex_bracket_terminal/DESIGN.md`
- Scraper data shapes: `scraper/espn.py` (bracket/pick/game/team structures)
- Sheet ID: `1BT4Yz1Gs951frXXIAH498UFWvrBjxiCXWe21cUY5FcM`
- Service account creds: `secrets/march-madness-2026-490823-656c22c3024f.json`

---

### Task 1: Project Scaffold + Tailwind + Design Tokens

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.mjs`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `.env.local`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /Users/braxtonbrewton/Organized/Projects/distributed-playground/golang/pocs/playground/march-madness-dashboard
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack --use-npm
```

Accept overwrite prompts. This creates the scaffold with App Router.

- [ ] **Step 2: Install dependencies**

```bash
npm install googleapis recharts @next/font
npm install -D @types/node
```

- `googleapis` — Google Sheets API via service account
- `recharts` — charts (bar, donut, line, pie)
- No `d3` yet (Plan 3 handles D3 components)

- [ ] **Step 3: Configure Tailwind with Kinetic Terminal design tokens**

Replace `tailwind.config.ts` with:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Kinetic Terminal surfaces (no 1px borders — tonal shifts only)
        surface: {
          DEFAULT: "#0a0f14",
          container: "#141a20",
          bright: "#252d35",
          variant: "#1c2430",
        },
        // Accents
        primary: {
          DEFAULT: "#ff9159",
          container: "#ff7a2f",
        },
        secondary: {
          DEFAULT: "#2dd4bf", // teal — alive/positive
          fixed: "#5eead4",
        },
        tertiary: {
          DEFAULT: "#a78bfa", // purple — probability
          fixed: "#c4b5fd",
        },
        achievement: "#fbbf24", // gold — awards
        action: "#fb923c", // orange — CTAs
        // Text
        "on-surface": "#e7ebf3",
        "on-surface-variant": "#8b95a5",
        "on-primary": "#0a0f14",
        // Ghost borders
        outline: "rgba(67, 72, 78, 0.15)",
      },
      fontFamily: {
        display: ["Plus Jakarta Sans", "sans-serif"],
        body: ["Inter", "sans-serif"],
        label: ["Space Grotesk", "monospace"],
      },
      borderRadius: {
        card: "12px",
      },
      spacing: {
        tight: "0.5rem",
        section: "1.75rem",
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 4: Set up globals.css with base styles**

Replace `src/app/globals.css` with:

```css
@import "tailwindcss";

@theme {
  --color-surface: #0a0f14;
  --color-surface-container: #141a20;
  --color-surface-bright: #252d35;
  --color-surface-variant: #1c2430;
  --color-primary: #ff9159;
  --color-primary-container: #ff7a2f;
  --color-secondary: #2dd4bf;
  --color-secondary-fixed: #5eead4;
  --color-tertiary: #a78bfa;
  --color-tertiary-fixed: #c4b5fd;
  --color-achievement: #fbbf24;
  --color-action: #fb923c;
  --color-on-surface: #e7ebf3;
  --color-on-surface-variant: #8b95a5;
  --color-on-primary: #0a0f14;
  --color-outline: rgba(67, 72, 78, 0.15);

  --font-display: "Plus Jakarta Sans", sans-serif;
  --font-body: "Inter", sans-serif;
  --font-label: "Space Grotesk", monospace;

  --radius-card: 12px;
  --spacing-tight: 0.5rem;
  --spacing-section: 1.75rem;
}

body {
  background-color: var(--color-surface);
  color: var(--color-on-surface);
  font-family: var(--font-body);
}

/* Glassmorphism overlay utility */
.glass {
  background: rgba(28, 36, 48, 0.6);
  backdrop-filter: blur(20px);
}

/* Glow accent for primary actions */
.glow-primary {
  box-shadow: 0 0 16px rgba(255, 145, 89, 0.3);
}

/* Ghost border */
.ghost-border {
  border: 1px solid rgba(67, 72, 78, 0.15);
}

/* Eliminated state — 40% opacity, desaturated */
.eliminated {
  opacity: 0.4;
  filter: grayscale(0.5);
}
```

- [ ] **Step 5: Create .env.local with credentials config**

Create `.env.local`:

```
GOOGLE_CREDENTIALS_PATH=./secrets/march-madness-2026-490823-656c22c3024f.json
SPREADSHEET_ID=1BT4Yz1Gs951frXXIAH498UFWvrBjxiCXWe21cUY5FcM
```

Add to `.gitignore` (append):
```
.env.local
node_modules/
.next/
```

- [ ] **Step 6: Create placeholder layout.tsx with fonts**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DoorDash AP 2026 Bracket Lab",
  description: "March Madness bracket analytics dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&family=Space+Grotesk:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface text-on-surface font-body antialiased">
        {children}
      </body>
    </html>
  );
}
```

Replace `src/app/page.tsx` with a smoke-test placeholder:

```tsx
export default function Home() {
  return (
    <main className="p-section">
      <h1 className="font-display text-3xl font-bold">
        DoorDash AP 2026 Bracket Lab
      </h1>
      <p className="text-on-surface-variant mt-2">Dashboard loading...</p>
    </main>
  );
}
```

- [ ] **Step 7: Verify scaffold runs**

```bash
cd /Users/braxtonbrewton/Organized/Projects/distributed-playground/golang/pocs/playground/march-madness-dashboard
npm run dev &
sleep 4
curl -s http://localhost:3000 | head -20
kill %1
```

Expected: HTML response with "DoorDash AP 2026 Bracket Lab".

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 14 app with Kinetic Terminal design tokens"
```

---

### Task 2: TypeScript Types + Constants

**Files:**
- Create: `src/lib/types.ts`, `src/lib/constants.ts`

- [ ] **Step 1: Create types.ts matching Sheet schema**

Create `src/lib/types.ts`:

```typescript
/** Matches the `brackets` Sheet tab */
export interface Bracket {
  id: string;
  name: string;
  owner: string;
  champion_pick: string;
  champion_seed: number;
  ff1: string;
  ff2: string;
  ff3: string;
  ff4: string;
  points: number;
  prev_rank: number;
  max_remaining: number;
  pct: number;
  r64_pts: number;
  r32_pts: number;
  s16_pts: number;
  e8_pts: number;
  ff_pts: number;
  champ_pts: number;
}

/** Matches the `picks` Sheet tab */
export interface Pick {
  bracket_id: string;
  game_id: string;
  round: Round;
  region: string;
  team_picked: string;
  seed_picked: number;
  correct: boolean;
  vacated: boolean;
}

/** Matches the `games` Sheet tab */
export interface Game {
  game_id: string;
  round: Round;
  region: string;
  team1: string;
  seed1: number;
  team2: string;
  seed2: number;
  winner: string;
  completed: boolean;
  national_pct_team1: number;
}

/** Matches the `teams` Sheet tab */
export interface Team {
  name: string;
  seed: number;
  region: string;
  conference: string;
  eliminated: boolean;
  eliminated_round: string;
}

/** Matches the `snapshots` Sheet tab */
export interface Snapshot {
  bracket_id: string;
  round: Round;
  rank: number;
  points: number;
  max_remaining: number;
  win_prob: number;
}

/** Matches the `meta` Sheet tab */
export interface Meta {
  last_updated: string;
  current_round: Round;
  games_completed: number;
}

export type Round = "R64" | "R32" | "S16" | "E8" | "FF" | "CHAMP";

export type Archetype = "Strategist" | "Visionary" | "Scout" | "Original" | "Analyst";

/** Computed per-bracket analytics added at render time */
export interface BracketAnalytics {
  rank: number;
  rank_delta: number;
  uniqueness: number;
  archetype: Archetype;
  estimated_win_prob: number;
  champion_alive: boolean;
  final_four_alive: number;
}

/** All data needed to render any page */
export interface DashboardData {
  brackets: Bracket[];
  picks: Pick[];
  games: Game[];
  teams: Team[];
  snapshots: Snapshot[];
  meta: Meta;
}
```

- [ ] **Step 2: Create constants.ts with scoring + colors**

Create `src/lib/constants.ts`:

```typescript
import type { Round, Archetype } from "./types";

export const ROUND_POINTS: Record<Round, number> = {
  R64: 10,
  R32: 20,
  S16: 40,
  E8: 80,
  FF: 160,
  CHAMP: 320,
};

export const ROUND_LABELS: Record<Round, string> = {
  R64: "Round of 64",
  R32: "Round of 32",
  S16: "Sweet 16",
  E8: "Elite 8",
  FF: "Final Four",
  CHAMP: "Championship",
};

export const ROUND_ORDER: Round[] = ["R64", "R32", "S16", "E8", "FF", "CHAMP"];

export const SEED_WIN_RATES: Record<number, Record<Round, number>> = {
  1:  { R64: 0.99, R32: 0.88, S16: 0.72, E8: 0.54, FF: 0.38, CHAMP: 0.23 },
  2:  { R64: 0.94, R32: 0.72, S16: 0.52, E8: 0.33, FF: 0.19, CHAMP: 0.11 },
  3:  { R64: 0.85, R32: 0.61, S16: 0.35, E8: 0.19, FF: 0.09, CHAMP: 0.04 },
  4:  { R64: 0.79, R32: 0.52, S16: 0.28, E8: 0.13, FF: 0.06, CHAMP: 0.03 },
  5:  { R64: 0.65, R32: 0.37, S16: 0.17, E8: 0.07, FF: 0.03, CHAMP: 0.01 },
  6:  { R64: 0.63, R32: 0.36, S16: 0.16, E8: 0.06, FF: 0.03, CHAMP: 0.01 },
  7:  { R64: 0.61, R32: 0.30, S16: 0.13, E8: 0.05, FF: 0.02, CHAMP: 0.01 },
  8:  { R64: 0.50, R32: 0.20, S16: 0.08, E8: 0.03, FF: 0.01, CHAMP: 0.005 },
  9:  { R64: 0.50, R32: 0.18, S16: 0.07, E8: 0.02, FF: 0.01, CHAMP: 0.004 },
  10: { R64: 0.39, R32: 0.15, S16: 0.06, E8: 0.02, FF: 0.01, CHAMP: 0.003 },
  11: { R64: 0.37, R32: 0.14, S16: 0.05, E8: 0.02, FF: 0.01, CHAMP: 0.003 },
  12: { R64: 0.35, R32: 0.12, S16: 0.04, E8: 0.01, FF: 0.005, CHAMP: 0.002 },
  13: { R64: 0.21, R32: 0.06, S16: 0.02, E8: 0.005, FF: 0.002, CHAMP: 0.001 },
  14: { R64: 0.15, R32: 0.04, S16: 0.01, E8: 0.003, FF: 0.001, CHAMP: 0.0005 },
  15: { R64: 0.06, R32: 0.01, S16: 0.003, E8: 0.001, FF: 0.0003, CHAMP: 0.0001 },
  16: { R64: 0.01, R32: 0.002, S16: 0.0005, E8: 0.0001, FF: 0.00003, CHAMP: 0.00001 },
};

export const ARCHETYPE_COLORS: Record<Archetype, string> = {
  Strategist: "#3b82f6", // blue
  Visionary: "#a78bfa",  // purple
  Scout: "#2dd4bf",      // teal/green
  Original: "#fb923c",   // orange
  Analyst: "#06b6d4",    // cyan/teal
};

export const NAV_PAGES = [
  { path: "/", label: "Leaderboard", icon: "trophy" },
  { path: "/picks", label: "Group Picks", icon: "users" },
  { path: "/alive", label: "Alive Board", icon: "heart-pulse" },
  { path: "/simulator", label: "Simulator", icon: "sliders" },
  { path: "/awards", label: "Awards", icon: "award" },
  { path: "/probability", label: "Probability", icon: "bar-chart" },
  { path: "/head-to-head", label: "Head-to-Head", icon: "git-compare" },
  { path: "/finale", label: "Season Finale", icon: "star" },
] as const;
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts src/lib/constants.ts
git commit -m "feat: add TypeScript types and constants for sheet schema"
```

---

### Task 3: Google Sheets Data Fetching Layer

**Files:**
- Create: `src/lib/sheets.ts`

**Context:** The Google Sheets are NOT publicly published. We use the Google Sheets API with a service account. The service account JSON key is at `secrets/march-madness-2026-490823-656c22c3024f.json`. In production (Vercel), the key JSON will be in the `GOOGLE_CREDENTIALS` env var as a string. Locally, we read it from a file path via `GOOGLE_CREDENTIALS_PATH`.

- [ ] **Step 1: Create sheets.ts — Google Sheets API data fetcher with 5-min cache**

Create `src/lib/sheets.ts`:

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/sheets.ts
git commit -m "feat: add Google Sheets API data fetching layer with 5-min cache"
```

---

### Task 4: Analytics Library

**Files:**
- Create: `src/lib/analytics.ts`

**Context:** This file computes uniqueness, archetypes, madness index, and estimated win probability from raw sheet data. All pure functions — no network calls. Refer to spec section "Computed Analytics" for formulas.

- [ ] **Step 1: Create analytics.ts**

Create `src/lib/analytics.ts`:

```typescript
import type {
  Bracket, Pick, Game, Team, Archetype, BracketAnalytics, DashboardData,
} from "./types";

/**
 * Compute pick rates: for each game, what fraction of brackets picked each team.
 * Returns Map<game_id, Map<team_name, pick_rate>>
 */
export function computePickRates(
  picks: Pick[],
  totalBrackets: number
): Map<string, Map<string, number>> {
  const counts = new Map<string, Map<string, number>>();
  for (const p of picks) {
    if (!counts.has(p.game_id)) counts.set(p.game_id, new Map());
    const game = counts.get(p.game_id)!;
    game.set(p.team_picked, (game.get(p.team_picked) || 0) + 1);
  }
  // Convert counts to rates
  const rates = new Map<string, Map<string, number>>();
  for (const [gid, teamCounts] of counts) {
    const rateMap = new Map<string, number>();
    for (const [team, count] of teamCounts) {
      rateMap.set(team, count / totalBrackets);
    }
    rates.set(gid, rateMap);
  }
  return rates;
}

/**
 * Uniqueness score for a bracket: average(1 - pickRate) across all 63 picks.
 */
export function computeUniqueness(
  bracketPicks: Pick[],
  pickRates: Map<string, Map<string, number>>
): number {
  if (bracketPicks.length === 0) return 0;
  let sum = 0;
  for (const p of bracketPicks) {
    const gameRates = pickRates.get(p.game_id);
    const rate = gameRates?.get(p.team_picked) ?? 0.5;
    sum += 1 - rate;
  }
  return sum / bracketPicks.length;
}

/**
 * Classify a bracket into an archetype.
 * - Strategist: <5 upsets picked, 1-seed champion
 * - Visionary: >15 upsets picked OR champion seed >4
 * - Scout: 3+ seeds 10+ picked past R64
 * - Original: uniqueness > 0.6
 * - Analyst: default (closest to expected-value optimal)
 */
export function classifyArchetype(
  bracket: Bracket,
  bracketPicks: Pick[],
  uniqueness: number
): Archetype {
  // Count upset picks: picked the higher seed (lower-seeded team = higher number)
  let upsetCount = 0;
  let highSeedPastR64 = 0;

  for (const p of bracketPicks) {
    if (p.seed_picked > 8 && p.round !== "R64") {
      // Picking a high seed past R64 = Cinderella belief
      if (p.seed_picked >= 10) highSeedPastR64++;
    }
    // An "upset" pick is picking seed > 8 to win any game
    if (p.seed_picked > 8) upsetCount++;
  }

  if (uniqueness > 0.6) return "Original";
  if (highSeedPastR64 >= 3) return "Scout";
  if (upsetCount > 15 || bracket.champion_seed > 4) return "Visionary";
  if (upsetCount < 5 && bracket.champion_seed === 1) return "Strategist";
  return "Analyst";
}

/**
 * Madness Index: how wild the tournament has been for the group.
 * sum(seedDiff * roundWeight) / gamesPlayed, normalized 0-100.
 */
export function computeMadnessIndex(games: Game[]): number {
  const roundWeights: Record<string, number> = {
    R64: 1, R32: 2, S16: 4, E8: 8, FF: 16, CHAMP: 32,
  };
  const completedGames = games.filter((g) => g.completed && g.winner);
  if (completedGames.length === 0) return 0;

  let madnessSum = 0;
  for (const g of completedGames) {
    // If the lower seed won (higher seed number), that's madness
    const winnerSeed = g.winner === g.team1 ? g.seed1 : g.seed2;
    const loserSeed = g.winner === g.team1 ? g.seed2 : g.seed1;
    if (winnerSeed > loserSeed) {
      const seedDiff = winnerSeed - loserSeed;
      const weight = roundWeights[g.round] || 1;
      madnessSum += seedDiff * weight;
    }
  }

  // Normalize: max theoretical madness = 15 * weight for every game being a 16 over 1
  const maxMadness = completedGames.reduce(
    (sum, g) => sum + 15 * (roundWeights[g.round] || 1),
    0
  );
  return maxMadness > 0 ? Math.round((madnessSum / maxMadness) * 100) : 0;
}

/**
 * Estimated win probability (leaderboard shortcut — not Monte Carlo).
 * max(0, 1 - (leaderPts - myPts) / myMaxRemaining)
 */
export function computeEstimatedWinProb(
  bracket: Bracket,
  leaderPoints: number
): number {
  if (bracket.max_remaining <= 0) return 0;
  const prob = Math.max(
    0,
    1 - (leaderPoints - bracket.points) / bracket.max_remaining
  );
  return Math.round(prob * 1000) / 10; // one decimal place percentage
}

/**
 * Compute full analytics for all brackets.
 */
export function computeAllAnalytics(data: DashboardData): Map<string, BracketAnalytics> {
  const { brackets, picks, teams } = data;

  // Build pick rates
  const pickRates = computePickRates(picks, brackets.length);

  // Group picks by bracket
  const picksByBracket = new Map<string, Pick[]>();
  for (const p of picks) {
    if (!picksByBracket.has(p.bracket_id)) picksByBracket.set(p.bracket_id, []);
    picksByBracket.get(p.bracket_id)!.push(p);
  }

  // Eliminated teams set
  const eliminatedTeams = new Set(
    teams.filter((t) => t.eliminated).map((t) => t.name)
  );

  // Sort brackets by points desc for ranking
  const sorted = [...brackets].sort((a, b) => b.points - a.points);
  const leaderPoints = sorted[0]?.points || 0;

  const result = new Map<string, BracketAnalytics>();

  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i];
    const rank = i + 1;
    const rank_delta = b.prev_rank > 0 ? b.prev_rank - rank : 0;
    const bracketPicks = picksByBracket.get(b.id) || [];
    const uniqueness = computeUniqueness(bracketPicks, pickRates);
    const archetype = classifyArchetype(b, bracketPicks, uniqueness);
    const estimated_win_prob = computeEstimatedWinProb(b, leaderPoints);
    const champion_alive = !eliminatedTeams.has(b.champion_pick);

    // Count Final Four teams still alive
    const ffTeams = [b.ff1, b.ff2, b.ff3, b.ff4].filter(Boolean);
    const final_four_alive = ffTeams.filter(
      (t) => !eliminatedTeams.has(t)
    ).length;

    result.set(b.id, {
      rank,
      rank_delta,
      uniqueness,
      archetype,
      estimated_win_prob,
      champion_alive,
      final_four_alive,
    });
  }

  return result;
}

/**
 * Group accuracy: how many games the group consensus got right in a round.
 */
export function computeGroupAccuracy(
  picks: Pick[],
  games: Game[],
  round: string,
  totalBrackets: number
): { correct: number; total: number; nationalCorrect: number } {
  const roundGames = games.filter((g) => g.round === round && g.completed);
  let correct = 0;
  let nationalCorrect = 0;

  for (const g of roundGames) {
    // Group consensus = team picked by >50%
    const gamePicks = picks.filter((p) => p.game_id === g.game_id);
    const team1Count = gamePicks.filter(
      (p) => p.team_picked === g.team1
    ).length;
    const consensusPick =
      team1Count > totalBrackets / 2 ? g.team1 : g.team2;
    if (consensusPick === g.winner) correct++;

    // National consensus
    const nationalConsensusPick =
      g.national_pct_team1 > 50 ? g.team1 : g.team2;
    if (nationalConsensusPick === g.winner) nationalCorrect++;
  }

  return { correct, total: roundGames.length, nationalCorrect };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/analytics.ts
git commit -m "feat: add analytics library — uniqueness, archetypes, madness index, win prob"
```

---

### Task 5: Layout Shell — Navbar + Sidebar

**Files:**
- Create: `src/components/layout/Navbar.tsx`, `src/components/layout/Sidebar.tsx`
- Modify: `src/app/layout.tsx`

**Context:** Global shell wrapping all pages. Navbar at top with title, round pill, last-updated. Sidebar on left with 8 page links. Mobile: sidebar collapses to hamburger.

- [ ] **Step 1: Create Navbar.tsx**

Create `src/components/layout/Navbar.tsx`:

```tsx
import type { Meta } from "@/lib/types";
import { ROUND_LABELS } from "@/lib/constants";

export function Navbar({ meta }: { meta: Meta | null }) {
  const roundLabel = meta ? ROUND_LABELS[meta.current_round] : "Loading...";
  const gamesCompleted = meta?.games_completed ?? 0;

  // Compute "last updated X min ago"
  let lastUpdated = "—";
  if (meta?.last_updated) {
    const updatedAt = new Date(meta.last_updated);
    const diffMs = Date.now() - updatedAt.getTime();
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 1) lastUpdated = "Just now";
    else if (diffMin < 60) lastUpdated = `${diffMin}m ago`;
    else lastUpdated = `${Math.round(diffMin / 60)}h ago`;
  }

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-surface-container">
      <div className="flex items-center gap-4">
        <h1 className="font-display text-lg font-bold text-on-surface">
          DoorDash AP 2026 Bracket Lab
        </h1>
        <span className="rounded-card bg-surface-bright px-3 py-1 font-label text-xs text-secondary">
          {roundLabel}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm text-on-surface-variant">
        <span>{gamesCompleted}/63 games</span>
        <span>Updated {lastUpdated}</span>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Create Sidebar.tsx**

Create `src/components/layout/Sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_PAGES } from "@/lib/constants";

const ICONS: Record<string, string> = {
  trophy: "🏆",
  users: "👥",
  "heart-pulse": "💚",
  sliders: "🎛️",
  award: "🎖️",
  "bar-chart": "📊",
  "git-compare": "⚔️",
  star: "⭐",
};

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="fixed top-3 left-3 z-50 rounded-card bg-surface-bright p-2 md:hidden"
        aria-label="Toggle menu"
      >
        <span className="text-on-surface text-xl">☰</span>
      </button>

      <aside
        className={`
          fixed left-0 top-[52px] z-40 h-[calc(100vh-52px)] w-56
          bg-surface-container transition-transform duration-200
          ${collapsed ? "-translate-x-full" : "translate-x-0"}
          md:translate-x-0
        `}
      >
        <nav className="flex flex-col gap-1 p-3 pt-4">
          {NAV_PAGES.map((page) => {
            const active = pathname === page.path;
            return (
              <Link
                key={page.path}
                href={page.path}
                onClick={() => setCollapsed(true)}
                className={`
                  flex items-center gap-3 rounded-card px-3 py-2.5 text-sm transition-colors
                  ${
                    active
                      ? "bg-surface-bright text-primary glow-primary"
                      : "text-on-surface-variant hover:bg-surface-bright hover:text-on-surface"
                  }
                `}
              >
                <span className="text-base">{ICONS[page.icon] || "•"}</span>
                <span className="font-body">{page.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
```

- [ ] **Step 3: Update layout.tsx to include Navbar + Sidebar**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { fetchDashboardData } from "@/lib/sheets";

export const metadata: Metadata = {
  title: "DoorDash AP 2026 Bracket Lab",
  description: "March Madness bracket analytics dashboard",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let meta = null;
  try {
    const data = await fetchDashboardData();
    meta = data.meta;
  } catch {
    // Layout still renders without data — pages handle their own errors
  }

  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&family=Space+Grotesk:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface text-on-surface font-body antialiased">
        <Navbar meta={meta} />
        <div className="flex">
          <Sidebar />
          <main className="ml-0 md:ml-56 w-full min-h-[calc(100vh-52px)] p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Verify it compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/ src/app/layout.tsx
git commit -m "feat: add Navbar and Sidebar layout shell"
```

---

### Task 6: Shared UI Components

**Files:**
- Create: `src/components/ui/StatCard.tsx`, `src/components/ui/TeamPill.tsx`, `src/components/ui/RoundSelector.tsx`

- [ ] **Step 1: Create StatCard.tsx**

Create `src/components/ui/StatCard.tsx`:

```tsx
export function StatCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="rounded-card bg-surface-container p-5 flex flex-col gap-1">
      <span className="font-label text-xs uppercase tracking-wider text-on-surface-variant">
        {label}
      </span>
      <span className="font-display text-2xl font-bold text-on-surface">
        {value}
      </span>
      {subtitle && (
        <span className="text-sm text-on-surface-variant">{subtitle}</span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create TeamPill.tsx**

Create `src/components/ui/TeamPill.tsx`:

```tsx
export function TeamPill({
  name,
  seed,
  eliminated = false,
}: {
  name: string;
  seed?: number;
  eliminated?: boolean;
}) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full bg-surface-bright
        px-2.5 py-1 text-xs font-label
        ${eliminated ? "eliminated" : "text-on-surface"}
      `}
    >
      {seed != null && (
        <span className="text-on-surface-variant">{seed}</span>
      )}
      <span>{name}</span>
    </span>
  );
}
```

- [ ] **Step 3: Create RoundSelector.tsx**

Create `src/components/ui/RoundSelector.tsx`:

```tsx
"use client";

import { ROUND_ORDER, ROUND_LABELS } from "@/lib/constants";
import type { Round } from "@/lib/types";

export function RoundSelector({
  selected,
  onSelect,
}: {
  selected: Round;
  onSelect: (round: Round) => void;
}) {
  return (
    <div className="flex gap-1 rounded-card bg-surface-container p-1">
      {ROUND_ORDER.map((round) => (
        <button
          key={round}
          onClick={() => onSelect(round)}
          className={`
            rounded-card px-3 py-1.5 font-label text-xs transition-colors
            ${
              selected === round
                ? "bg-surface-bright text-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }
          `}
        >
          {ROUND_LABELS[round]}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Verify it compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/
git commit -m "feat: add shared UI components — StatCard, TeamPill, RoundSelector"
```

---

### Task 7: Leaderboard Table Component

**Files:**
- Create: `src/components/tables/LeaderboardTable.tsx`

- [ ] **Step 1: Create LeaderboardTable.tsx**

Create `src/components/tables/LeaderboardTable.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { Bracket, BracketAnalytics } from "@/lib/types";
import { ARCHETYPE_COLORS } from "@/lib/constants";
import { TeamPill } from "@/components/ui/TeamPill";

type SortKey = "rank" | "points" | "max_remaining" | "estimated_win_prob" | "uniqueness";

export function LeaderboardTable({
  brackets,
  analytics,
  eliminatedTeams,
}: {
  brackets: Bracket[];
  analytics: Map<string, BracketAnalytics>;
  eliminatedTeams: Set<string>;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = [...brackets].sort((a, b) => {
    const aA = analytics.get(a.id);
    const bA = analytics.get(b.id);
    if (!aA || !bA) return 0;

    let aVal: number, bVal: number;
    switch (sortKey) {
      case "rank":
        aVal = aA.rank;
        bVal = bA.rank;
        break;
      case "points":
        aVal = a.points;
        bVal = b.points;
        break;
      case "max_remaining":
        aVal = a.max_remaining;
        bVal = b.max_remaining;
        break;
      case "estimated_win_prob":
        aVal = aA.estimated_win_prob;
        bVal = bA.estimated_win_prob;
        break;
      case "uniqueness":
        aVal = aA.uniqueness;
        bVal = bA.uniqueness;
        break;
      default:
        aVal = aA.rank;
        bVal = bA.rank;
    }
    return sortAsc ? aVal - bVal : bVal - aVal;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "rank");
    }
  }

  const headerClass =
    "px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant cursor-pointer hover:text-on-surface select-none";

  return (
    <div className="overflow-x-auto rounded-card bg-surface-container">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-outline">
            <th className={headerClass} onClick={() => toggleSort("rank")}>
              Rank {sortKey === "rank" && (sortAsc ? "↑" : "↓")}
            </th>
            <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">
              Name
            </th>
            <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">
              Type
            </th>
            <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">
              Champion
            </th>
            <th className={headerClass} onClick={() => toggleSort("points")}>
              Pts {sortKey === "points" && (sortAsc ? "↑" : "↓")}
            </th>
            <th className={headerClass} onClick={() => toggleSort("max_remaining")}>
              MAX {sortKey === "max_remaining" && (sortAsc ? "↑" : "↓")}
            </th>
            <th className={headerClass} onClick={() => toggleSort("estimated_win_prob")}>
              Win % {sortKey === "estimated_win_prob" && (sortAsc ? "↑" : "↓")}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((b) => {
            const a = analytics.get(b.id);
            if (!a) return null;
            const champEliminated = eliminatedTeams.has(b.champion_pick);

            return (
              <tr
                key={b.id}
                className="border-b border-outline transition-colors hover:bg-surface-bright"
              >
                <td className="px-3 py-2.5 font-label">
                  <span className="text-on-surface">{a.rank}</span>
                  {a.rank_delta > 0 && (
                    <span className="ml-1.5 text-secondary text-xs">
                      +{a.rank_delta}
                    </span>
                  )}
                  {a.rank_delta === 0 && (
                    <span className="ml-1.5 text-on-surface-variant text-xs">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <div className="font-body text-on-surface">{b.owner}</div>
                  <div className="text-xs text-on-surface-variant">{b.name}</div>
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-label"
                    style={{
                      backgroundColor: `${ARCHETYPE_COLORS[a.archetype]}20`,
                      color: ARCHETYPE_COLORS[a.archetype],
                    }}
                  >
                    {a.archetype}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <TeamPill
                      name={b.champion_pick}
                      seed={b.champion_seed}
                      eliminated={champEliminated}
                    />
                    {!champEliminated && b.champion_pick && (
                      <span className="inline-block h-2 w-2 rounded-full bg-secondary" />
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 font-label text-on-surface">
                  {b.points}
                </td>
                <td className="px-3 py-2.5 font-label text-on-surface-variant">
                  {b.max_remaining}
                </td>
                <td className="px-3 py-2.5 font-label text-tertiary">
                  {a.estimated_win_prob}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/tables/LeaderboardTable.tsx
git commit -m "feat: add sortable LeaderboardTable component"
```

---

### Task 8: Leaderboard Page

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/charts/MadnessGauge.tsx`

**Context:** Homepage. Hero stats bar (4 cards), leaderboard table, rising stars section, tournament pulse with madness gauge. Server component that fetches data, passes to client components.

- [ ] **Step 1: Create MadnessGauge.tsx**

Create `src/components/charts/MadnessGauge.tsx`:

```tsx
"use client";

import { PieChart, Pie, Cell } from "recharts";

export function MadnessGauge({ value }: { value: number }) {
  // Semi-circle gauge using a pie chart
  const data = [
    { value: value },
    { value: 100 - value },
  ];

  const getColor = (v: number) => {
    if (v < 30) return "#2dd4bf"; // teal — calm
    if (v < 60) return "#fbbf24"; // gold — moderate
    return "#ff9159"; // orange — wild
  };

  return (
    <div className="flex flex-col items-center">
      <PieChart width={200} height={120}>
        <Pie
          data={data}
          cx={100}
          cy={100}
          startAngle={180}
          endAngle={0}
          innerRadius={60}
          outerRadius={80}
          dataKey="value"
          stroke="none"
        >
          <Cell fill={getColor(value)} />
          <Cell fill="#252d35" />
        </Pie>
      </PieChart>
      <div className="-mt-8 text-center">
        <span className="font-display text-3xl font-bold" style={{ color: getColor(value) }}>
          {value}
        </span>
        <p className="text-xs text-on-surface-variant mt-1">Madness Index</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build the Leaderboard page**

Replace `src/app/page.tsx`:

```tsx
import { fetchDashboardData } from "@/lib/sheets";
import { computeAllAnalytics, computeMadnessIndex } from "@/lib/analytics";
import { StatCard } from "@/components/ui/StatCard";
import { LeaderboardTable } from "@/components/tables/LeaderboardTable";
import { MadnessGauge } from "@/components/charts/MadnessGauge";

export const revalidate = 300; // ISR: revalidate every 5 min

export default async function LeaderboardPage() {
  const data = await fetchDashboardData();
  const analytics = computeAllAnalytics(data);

  const { brackets, games, teams, meta } = data;

  // Hero stats
  const gamesCompleted = meta.games_completed;
  const eliminatedTeams = new Set(
    teams.filter((t) => t.eliminated).map((t) => t.name)
  );

  // Most popular champion still standing
  const champCounts = new Map<string, number>();
  for (const b of brackets) {
    if (b.champion_pick && !eliminatedTeams.has(b.champion_pick)) {
      champCounts.set(
        b.champion_pick,
        (champCounts.get(b.champion_pick) || 0) + 1
      );
    }
  }
  const topChamp = [...champCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  // Rising Stars: top 3 rank climbers
  const risingStars = [...brackets]
    .map((b) => ({ bracket: b, analytics: analytics.get(b.id)! }))
    .filter((x) => x.analytics && x.analytics.rank_delta > 0)
    .sort((a, b) => b.analytics.rank_delta - a.analytics.rank_delta)
    .slice(0, 3);

  // Still in contention: brackets where estimated_win_prob > 0
  const inContention = [...analytics.values()].filter(
    (a) => a.estimated_win_prob > 0
  ).length;

  // Madness Index
  const madnessIndex = computeMadnessIndex(games);

  // Group resilience: average % of picks still possible
  const avgMaxRemaining =
    brackets.reduce((sum, b) => sum + b.max_remaining, 0) / brackets.length;
  const totalPossiblePoints = 1920; // max possible score: 10*32 + 20*16 + 40*8 + 80*4 + 160*2 + 320*1 = 1920
  const groupResilience = Math.round(
    (avgMaxRemaining / totalPossiblePoints) * 100
  );

  return (
    <div className="space-y-section">
      {/* Page header */}
      <div>
        <h2 className="font-display text-2xl font-bold">Leaderboard</h2>
        <p className="text-on-surface-variant text-sm mt-1">
          Championship standings and tournament pulse
        </p>
      </div>

      {/* Hero stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Brackets" value={brackets.length} />
        <StatCard label="Games Completed" value={`${gamesCompleted}/63`} />
        <StatCard label="Current Round" value={meta.current_round} />
        <StatCard
          label="Top Champion Pick"
          value={topChamp ? topChamp[0] : "—"}
          subtitle={topChamp ? `${topChamp[1]} brackets` : undefined}
        />
      </div>

      {/* Leaderboard table */}
      <LeaderboardTable
        brackets={brackets}
        analytics={analytics}
        eliminatedTeams={eliminatedTeams}
      />

      {/* Rising Stars + Contention */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rising Stars */}
        <div className="rounded-card bg-surface-container p-5 space-y-3">
          <h3 className="font-display text-lg font-semibold">Rising Stars</h3>
          {risingStars.length === 0 && (
            <p className="text-on-surface-variant text-sm">
              No rank changes yet this round.
            </p>
          )}
          {risingStars.map(({ bracket, analytics: a }) => (
            <div
              key={bracket.id}
              className="flex items-center justify-between rounded-card bg-surface-bright px-4 py-3"
            >
              <div>
                <span className="font-body text-on-surface">
                  {bracket.owner}
                </span>
                <span className="text-xs text-on-surface-variant ml-2">
                  {bracket.name}
                </span>
              </div>
              <span className="font-label text-secondary font-semibold">
                +{a.rank_delta} ranks
              </span>
            </div>
          ))}
        </div>

        {/* Still in contention */}
        <div className="rounded-card bg-surface-container p-5 flex flex-col items-center justify-center">
          <span className="font-display text-4xl font-bold text-secondary">
            {inContention}
          </span>
          <span className="text-on-surface-variant text-sm mt-1">
            brackets can still mathematically win
          </span>
        </div>
      </div>

      {/* Tournament Pulse */}
      <div className="rounded-card bg-surface-container p-5 space-y-4">
        <h3 className="font-display text-lg font-semibold">Tournament Pulse</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <MadnessGauge value={madnessIndex} />
          <div className="space-y-3">
            <StatCard
              label="Group Resilience"
              value={`${groupResilience}%`}
              subtitle="of picks still possible on average"
            />
          </div>
          <div className="space-y-2">
            <p className="font-label text-xs text-on-surface-variant uppercase tracking-wider">
              What the number means
            </p>
            <p className="text-sm text-on-surface-variant">
              {madnessIndex < 30
                ? "A calm tournament so far — chalk is holding."
                : madnessIndex < 60
                  ? "Typical March Madness — some surprises keeping it exciting."
                  : "Wild tournament — bold bracket pickers are being rewarded."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify it compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/components/charts/MadnessGauge.tsx
git commit -m "feat: build Leaderboard page with hero stats, table, rising stars, tournament pulse"
```

---

### Task 9: Group Picks Page

**Files:**
- Create: `src/app/picks/page.tsx`, `src/components/ui/GameCard.tsx`

**Context:** Two tabs: Consensus (default) and Tournament Lens. Consensus shows game cards with pick split bars per round. Tournament Lens shows conference/seed analysis. Uses RoundSelector for round filtering.

- [ ] **Step 1: Create GameCard.tsx**

Create `src/components/ui/GameCard.tsx`:

```tsx
import type { Game, Pick } from "@/lib/types";
import { TeamPill } from "./TeamPill";

export function GameCard({
  game,
  pickSplit,
  totalBrackets,
}: {
  game: Game;
  pickSplit: { team1Count: number; team2Count: number };
  totalBrackets: number;
}) {
  const team1Pct = Math.round(
    (pickSplit.team1Count / totalBrackets) * 100
  );
  const team2Pct = 100 - team1Pct;
  const consensusPick =
    pickSplit.team1Count >= pickSplit.team2Count ? game.team1 : game.team2;
  const consensusCorrect = game.completed && consensusPick === game.winner;
  const consensusCount = Math.max(pickSplit.team1Count, pickSplit.team2Count);
  const minorityCount = totalBrackets - consensusCount;

  return (
    <div className="rounded-card bg-surface-container p-4 space-y-3">
      {/* Teams */}
      <div className="flex items-center justify-between">
        <TeamPill name={game.team1} seed={game.seed1} />
        <span className="text-xs text-on-surface-variant">vs</span>
        <TeamPill name={game.team2} seed={game.seed2} />
      </div>

      {/* Pick split bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-surface-bright">
        <div
          className="bg-secondary transition-all"
          style={{ width: `${team1Pct}%` }}
        />
        <div
          className="bg-tertiary transition-all"
          style={{ width: `${team2Pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs font-label text-on-surface-variant">
        <span>{team1Pct}% {game.team1}</span>
        <span>{game.team2} {team2Pct}%</span>
      </div>

      {/* Post-game badge */}
      {game.completed && (
        <div
          className={`rounded-card px-3 py-1.5 text-xs text-center ${
            consensusCorrect
              ? "bg-secondary/10 text-secondary"
              : "bg-tertiary/10 text-tertiary"
          }`}
        >
          {consensusCorrect
            ? "We called it!"
            : `Surprise! Only ${minorityCount} of us saw this coming`}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the Group Picks page**

Create `src/app/picks/page.tsx`:

```tsx
import { fetchDashboardData } from "@/lib/sheets";
import { computeGroupAccuracy } from "@/lib/analytics";
import { StatCard } from "@/components/ui/StatCard";
import { PicksContent } from "./PicksContent";

export const revalidate = 300;

export default async function GroupPicksPage() {
  const data = await fetchDashboardData();

  // Pre-compute pick splits for all games
  const pickSplits = new Map<
    string,
    { team1Count: number; team2Count: number }
  >();
  for (const game of data.games) {
    const gamePicks = data.picks.filter((p) => p.game_id === game.game_id);
    const team1Count = gamePicks.filter(
      (p) => p.team_picked === game.team1
    ).length;
    const team2Count = gamePicks.filter(
      (p) => p.team_picked === game.team2
    ).length;
    pickSplits.set(game.game_id, { team1Count, team2Count });
  }

  // Group accuracy for current round
  const accuracy = computeGroupAccuracy(
    data.picks,
    data.games,
    data.meta.current_round,
    data.brackets.length
  );

  // Conference pick analysis
  const conferenceAdvances = new Map<string, number>();
  for (const p of data.picks) {
    if (p.round !== "R64") {
      const team = data.teams.find((t) => t.name === p.team_picked);
      if (team?.conference) {
        conferenceAdvances.set(
          team.conference,
          (conferenceAdvances.get(team.conference) || 0) + 1
        );
      }
    }
  }

  // Serialize for client component
  const pickSplitsObj = Object.fromEntries(pickSplits);
  const confData = [...conferenceAdvances.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="space-y-section">
      <div>
        <h2 className="font-display text-2xl font-bold">Group Picks</h2>
        <p className="text-on-surface-variant text-sm mt-1">
          See how our {data.brackets.length} brackets collectively predicted
          each game
        </p>
      </div>

      {/* Group accuracy hero */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Group Accuracy (Current Round)"
          value={`${accuracy.correct}/${accuracy.total}`}
          subtitle={`National avg: ${accuracy.nationalCorrect}/${accuracy.total}`}
        />
        <StatCard
          label="Total Brackets"
          value={data.brackets.length}
        />
        <StatCard
          label="Games Completed"
          value={`${data.meta.games_completed}/63`}
        />
      </div>

      <PicksContent
        games={data.games}
        pickSplits={pickSplitsObj}
        totalBrackets={data.brackets.length}
        conferenceData={confData}
        currentRound={data.meta.current_round}
      />
    </div>
  );
}
```

- [ ] **Step 3: Create PicksContent client component for tabs + round selector**

Create `src/app/picks/PicksContent.tsx`:

```tsx
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
      {/* Tab switcher */}
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
          {/* Conference analysis */}
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

          {/* Regional breakdown placeholder */}
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
```

- [ ] **Step 4: Verify it compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/app/picks/ src/components/ui/GameCard.tsx
git commit -m "feat: build Group Picks page with Consensus and Tournament Lens tabs"
```

---

### Task 10: Alive Board Page

**Files:**
- Create: `src/app/alive/page.tsx`, `src/components/charts/ChampionDonut.tsx`, `src/components/tables/DrilldownTable.tsx`

**Context:** Aggregate counter cards (clickable), drill-down panel, champion distribution donut, games to watch. Uses client-side interactivity for drill-down.

- [ ] **Step 1: Create ChampionDonut.tsx**

Create `src/components/charts/ChampionDonut.tsx`:

```tsx
"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ChampionSlice {
  name: string;
  count: number;
  alive: boolean;
}

export function ChampionDonut({ data }: { data: ChampionSlice[] }) {
  const ALIVE_COLORS = [
    "#2dd4bf", "#a78bfa", "#fbbf24", "#fb923c", "#3b82f6",
    "#06b6d4", "#84cc16", "#f472b6",
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          stroke="none"
        >
          {data.map((entry, i) => (
            <Cell
              key={entry.name}
              fill={
                entry.alive
                  ? ALIVE_COLORS[i % ALIVE_COLORS.length]
                  : "#252d35"
              }
              opacity={entry.alive ? 1 : 0.4}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#141a20",
            border: "none",
            borderRadius: "12px",
            color: "#e7ebf3",
            fontFamily: "Inter",
          }}
          formatter={(value: number, name: string) => [
            `${value} brackets`,
            name,
          ]}
        />
        <Legend
          wrapperStyle={{ fontSize: "12px", fontFamily: "Space Grotesk" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Create DrilldownTable.tsx**

Create `src/components/tables/DrilldownTable.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { Bracket, BracketAnalytics } from "@/lib/types";
import { TeamPill } from "@/components/ui/TeamPill";

export function DrilldownTable({
  brackets,
  analytics,
  eliminatedTeams,
}: {
  brackets: Bracket[];
  analytics: Map<string, BracketAnalytics>;
  eliminatedTeams: Set<string>;
}) {
  const [search, setSearch] = useState("");

  const filtered = brackets.filter(
    (b) =>
      b.owner.toLowerCase().includes(search.toLowerCase()) ||
      b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Search brackets..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-card bg-surface-bright px-4 py-2 text-sm text-on-surface placeholder:text-on-surface-variant outline-none"
      />
      <div className="overflow-x-auto rounded-card bg-surface-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline">
              <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">
                Rank
              </th>
              <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">
                Name
              </th>
              <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">
                Champion
              </th>
              <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">
                Points
              </th>
              <th className="px-3 py-2 text-left font-label text-xs uppercase tracking-wider text-on-surface-variant">
                MAX
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => {
              const a = analytics.get(b.id);
              return (
                <tr
                  key={b.id}
                  className="border-b border-outline hover:bg-surface-bright transition-colors"
                >
                  <td className="px-3 py-2 font-label">{a?.rank ?? "—"}</td>
                  <td className="px-3 py-2">
                    <div className="text-on-surface">{b.owner}</div>
                    <div className="text-xs text-on-surface-variant">
                      {b.name}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <TeamPill
                      name={b.champion_pick}
                      seed={b.champion_seed}
                      eliminated={eliminatedTeams.has(b.champion_pick)}
                    />
                  </td>
                  <td className="px-3 py-2 font-label">{b.points}</td>
                  <td className="px-3 py-2 font-label text-on-surface-variant">
                    {b.max_remaining}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the Alive Board page**

Create `src/app/alive/page.tsx`:

```tsx
import { fetchDashboardData } from "@/lib/sheets";
import { computeAllAnalytics } from "@/lib/analytics";
import { StatCard } from "@/components/ui/StatCard";
import { ChampionDonut } from "@/components/charts/ChampionDonut";
import { AliveContent } from "./AliveContent";

export const revalidate = 300;

export default async function AliveBoardPage() {
  const data = await fetchDashboardData();
  const analytics = computeAllAnalytics(data);

  const { brackets, teams, games } = data;

  const eliminatedTeams = new Set(
    teams.filter((t) => t.eliminated).map((t) => t.name)
  );

  // Aggregate counters
  const champAlive = brackets.filter(
    (b) => b.champion_pick && !eliminatedTeams.has(b.champion_pick)
  ).length;

  const ff3Plus = brackets.filter((b) => {
    const ffTeams = [b.ff1, b.ff2, b.ff3, b.ff4].filter(Boolean);
    const alive = ffTeams.filter((t) => !eliminatedTeams.has(t)).length;
    return alive >= 3;
  }).length;

  // Champion distribution
  const champCounts = new Map<string, number>();
  for (const b of brackets) {
    if (b.champion_pick) {
      champCounts.set(
        b.champion_pick,
        (champCounts.get(b.champion_pick) || 0) + 1
      );
    }
  }
  const champDistribution = [...champCounts.entries()]
    .map(([name, count]) => ({
      name,
      count,
      alive: !eliminatedTeams.has(name),
    }))
    .sort((a, b) => b.count - a.count);

  // Games to watch: upcoming games affecting most brackets' champion picks
  const upcomingGames = games.filter((g) => !g.completed);
  const gamesToWatch = upcomingGames
    .map((g) => {
      const affectedCount = brackets.filter(
        (b) =>
          b.champion_pick === g.team1 || b.champion_pick === g.team2
      ).length;
      return { game: g, affectedCount };
    })
    .filter((x) => x.affectedCount > 0)
    .sort((a, b) => b.affectedCount - a.affectedCount)
    .slice(0, 3);

  // Serialize analytics for client
  const analyticsObj = Object.fromEntries(analytics);
  const eliminatedArr = [...eliminatedTeams];

  return (
    <div className="space-y-section">
      <div>
        <h2 className="font-display text-2xl font-bold">Alive Board</h2>
        <p className="text-on-surface-variant text-sm mt-1">
          Track which predictions are still in play
        </p>
      </div>

      {/* Aggregate counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Champion Alive"
          value={champAlive}
          subtitle="brackets still have their champion"
        />
        <StatCard
          label="3+ Final Four"
          value={ff3Plus}
          subtitle="brackets have 3+ FF teams left"
        />
        <StatCard
          label="Total Brackets"
          value={brackets.length}
        />
        <StatCard
          label="Games Remaining"
          value={63 - data.meta.games_completed}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-section">
        {/* Champion distribution */}
        <div className="rounded-card bg-surface-container p-5">
          <h3 className="font-display text-lg font-semibold mb-4">
            Champion Distribution
          </h3>
          <ChampionDonut data={champDistribution} />
        </div>

        {/* Games to watch */}
        <div className="rounded-card bg-surface-container p-5 space-y-3">
          <h3 className="font-display text-lg font-semibold">
            Games to Watch
          </h3>
          {gamesToWatch.length === 0 && (
            <p className="text-on-surface-variant text-sm">
              No upcoming games affecting champion picks.
            </p>
          )}
          {gamesToWatch.map(({ game, affectedCount }) => (
            <div
              key={game.game_id}
              className="rounded-card bg-surface-bright p-4 space-y-2"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface">
                  {game.seed1} {game.team1} vs {game.seed2} {game.team2}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Affects {affectedCount} brackets&apos; champion hopes
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Drill-down: all brackets with champion alive */}
      <AliveContent
        brackets={brackets}
        analyticsObj={analyticsObj}
        eliminatedArr={eliminatedArr}
      />
    </div>
  );
}
```

- [ ] **Step 4: Create AliveContent client component for drill-down**

Create `src/app/alive/AliveContent.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { Bracket, BracketAnalytics } from "@/lib/types";
import { DrilldownTable } from "@/components/tables/DrilldownTable";

type Filter = "champion" | "ff3" | "all";

export function AliveContent({
  brackets,
  analyticsObj,
  eliminatedArr,
}: {
  brackets: Bracket[];
  analyticsObj: Record<string, BracketAnalytics>;
  eliminatedArr: string[];
}) {
  const [filter, setFilter] = useState<Filter>("champion");

  const eliminatedTeams = new Set(eliminatedArr);
  const analytics = new Map(Object.entries(analyticsObj));

  let filtered: Bracket[];
  switch (filter) {
    case "champion":
      filtered = brackets
        .filter(
          (b) => b.champion_pick && !eliminatedTeams.has(b.champion_pick)
        )
        .sort((a, b) => b.points - a.points);
      break;
    case "ff3":
      filtered = brackets
        .filter((b) => {
          const ffTeams = [b.ff1, b.ff2, b.ff3, b.ff4].filter(Boolean);
          return ffTeams.filter((t) => !eliminatedTeams.has(t)).length >= 3;
        })
        .sort((a, b) => b.points - a.points);
      break;
    default:
      filtered = [...brackets].sort((a, b) => b.points - a.points);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(
          [
            ["champion", "Champion Alive"],
            ["ff3", "3+ FF Teams"],
            ["all", "All Brackets"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-card px-4 py-2 text-sm font-label transition-colors ${
              filter === key
                ? "bg-surface-bright text-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <DrilldownTable
        brackets={filtered}
        analytics={analytics}
        eliminatedTeams={eliminatedTeams}
      />
    </div>
  );
}
```

- [ ] **Step 5: Verify it compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/app/alive/ src/components/charts/ChampionDonut.tsx src/components/tables/DrilldownTable.tsx
git commit -m "feat: build Alive Board page with counters, champion donut, drill-down"
```

---

### Task 11: Final Verification + Fix Any Issues

- [ ] **Step 1: Run the dev server and verify all 3 pages render**

```bash
cd /Users/braxtonbrewton/Organized/Projects/distributed-playground/golang/pocs/playground/march-madness-dashboard
npm run build
```

Expected: build succeeds with no errors. If there are errors, fix them.

- [ ] **Step 2: Test each page route compiles**

```bash
npm run dev &
sleep 5
curl -s http://localhost:3000 | grep -o "Leaderboard" | head -1
curl -s http://localhost:3000/picks | grep -o "Group Picks" | head -1
curl -s http://localhost:3000/alive | grep -o "Alive Board" | head -1
kill %1
```

Expected: each curl returns the page name, confirming the page renders.

- [ ] **Step 3: Fix any issues found**

If build or curl tests fail, fix the specific error and re-run.

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve build errors from Plan 2 integration"
```
