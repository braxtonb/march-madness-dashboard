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
  Strategist: "#3b82f6",
  Visionary: "#a78bfa",
  Scout: "#2dd4bf",
  Original: "#fb923c",
  Analyst: "#06b6d4",
};

export const NAV_PAGES = [
  { path: "/", label: "Leaderboard", icon: "trophy" },
  { path: "/picks", label: "Group Picks", icon: "users" },
  { path: "/alive", label: "Alive Board", icon: "heart-pulse" },
  { path: "/simulator", label: "Simulator", icon: "sliders" },
  { path: "/awards", label: "Awards", icon: "award" },
  { path: "/probability", label: "Probability", icon: "bar-chart" },
  { path: "/head-to-head", label: "Head-to-Head", icon: "git-compare" },
] as const;
