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
  espn_url?: string;
}

/** Matches the `teams` Sheet tab */
export interface Team {
  name: string;
  seed: number;
  region: string;
  conference: string;
  eliminated: boolean;
  eliminated_round: string;
  logo: string;
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
