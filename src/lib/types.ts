/** Matches the `brackets` Sheet tab */
export interface Bracket {
  id: string;
  name: string;
  owner: string;
  full_name: string;
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

export type AwardRound = Round | "ALL";

export interface AwardWinner {
  name: string;        // bracket name
  fullName: string;    // full name from ESPN (primary display)
  bracketName: string; // owner username (secondary)
  bracketId: string;
  stat: string;        // contextual stat (e.g., "8 of 8 correct")
  championPick: string;
  championSeed: number;
  championEliminated: boolean;
}

export interface Award {
  title: string;
  description: string;
  icon: string;
  tier: "gold" | "silver" | "bronze";
  winners: AwardWinner[];
}

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

/** Pre-computed Monte Carlo simulation result per bracket */
export interface SimResult {
  bracket_id: string;
  wins: number;
  avg_final_points: number;
  median_rank: number;
  best_rank: number;
  pct_first: number;
  pct_second: number;
  pct_third: number;
  pct_top10: number;
  pct_top25: number;
}

/** Pre-computed derived data from scraper */
export interface DerivedData {
  analytics: Record<string, BracketAnalytics>;
  pick_splits: Record<string, { team1Count: number; team2Count: number }>;
  eliminated_teams: string[];
  scatter_data: { name: string; skill: number; fortune: number }[];
  greatest_calls: { bracketId: string; bracketName: string; bracketOwner: string; bracketFullName: string; teamPicked: string; seedPicked: number; rate: number; round: string }[];
  round_accuracy: { round: string; correct: number; total: number }[];
  path_entries: { bracketId: string; remainingPicks: { round: string; team: string; seed: number; pts: number; logo: string }[]; eliminatedPickCount: number }[];
  alive_data: {
    champAlive: number;
    ff3Plus: number;
    ff2Plus: number;
    gamesRemaining: number;
    gamesToWatch: { gameId: string; seed1: number; team1: string; seed2: number; team2: string; round: string; affectedCount: number; affectedBrackets: { name: string; owner: string; full_name: string; champion: string; championSeed?: number; bracketId?: string }[] }[];
    bracketFFTeamsMap: Record<string, string[]>;
  };
  champ_distribution: { name: string; count: number; alive: boolean; logo: string; seed: number; brackets: { bracketId: string; bracketName: string; fullName: string }[] }[];
  madness_index: number;
  submitted_count: number;
  team_logos: Record<string, string>;
  team_abbrevs: Record<string, string>;
}

/** All data needed to render any page */
export interface DashboardData {
  brackets: Bracket[];
  picks: Pick[];
  games: Game[];
  teams: Team[];
  snapshots: Snapshot[];
  sim_results?: SimResult[];
  derived?: DerivedData;
  meta: Meta;
}
