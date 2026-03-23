"""Monte Carlo simulation for bracket win probabilities.

Ports the logic from src/lib/montecarlo.ts to Python so it can run
at scrape time with higher iteration counts (10,000+) instead of
in the browser on every page load.
"""

import math
from collections import defaultdict

# Historical seed win rates by round (same as constants.ts SEED_WIN_RATES)
SEED_WIN_RATES = {
    1:  {"R64": 0.99, "R32": 0.88, "S16": 0.72, "E8": 0.54, "FF": 0.38, "CHAMP": 0.23},
    2:  {"R64": 0.94, "R32": 0.72, "S16": 0.52, "E8": 0.33, "FF": 0.19, "CHAMP": 0.11},
    3:  {"R64": 0.85, "R32": 0.61, "S16": 0.35, "E8": 0.19, "FF": 0.09, "CHAMP": 0.04},
    4:  {"R64": 0.79, "R32": 0.52, "S16": 0.28, "E8": 0.13, "FF": 0.06, "CHAMP": 0.03},
    5:  {"R64": 0.65, "R32": 0.37, "S16": 0.17, "E8": 0.07, "FF": 0.03, "CHAMP": 0.01},
    6:  {"R64": 0.63, "R32": 0.36, "S16": 0.16, "E8": 0.06, "FF": 0.03, "CHAMP": 0.01},
    7:  {"R64": 0.61, "R32": 0.30, "S16": 0.13, "E8": 0.05, "FF": 0.02, "CHAMP": 0.01},
    8:  {"R64": 0.50, "R32": 0.20, "S16": 0.08, "E8": 0.03, "FF": 0.01, "CHAMP": 0.005},
    9:  {"R64": 0.50, "R32": 0.18, "S16": 0.07, "E8": 0.02, "FF": 0.01, "CHAMP": 0.004},
    10: {"R64": 0.39, "R32": 0.15, "S16": 0.06, "E8": 0.02, "FF": 0.01, "CHAMP": 0.003},
    11: {"R64": 0.37, "R32": 0.14, "S16": 0.05, "E8": 0.02, "FF": 0.01, "CHAMP": 0.003},
    12: {"R64": 0.35, "R32": 0.12, "S16": 0.04, "E8": 0.01, "FF": 0.005, "CHAMP": 0.002},
    13: {"R64": 0.21, "R32": 0.06, "S16": 0.02, "E8": 0.005, "FF": 0.002, "CHAMP": 0.001},
    14: {"R64": 0.15, "R32": 0.04, "S16": 0.01, "E8": 0.003, "FF": 0.001, "CHAMP": 0.0005},
    15: {"R64": 0.06, "R32": 0.01, "S16": 0.003, "E8": 0.001, "FF": 0.0003, "CHAMP": 0.0001},
    16: {"R64": 0.01, "R32": 0.002, "S16": 0.0005, "E8": 0.0001, "FF": 0.00003, "CHAMP": 0.00001},
}

ROUND_POINTS = {"R64": 10, "R32": 20, "S16": 40, "E8": 80, "FF": 160, "CHAMP": 320}


def _seeded_random(seed: int):
    """Park-Miller LCG — same algorithm as the TypeScript version."""
    s = seed

    def next_val():
        nonlocal s
        s = (s * 16807) % 2147483647
        return s / 2147483647

    return next_val


def run_monte_carlo(brackets, picks, games, iterations=10000):
    """Run Monte Carlo simulation and return a list of result dicts.

    Args:
        brackets: list of bracket dicts (id, name, points, ...)
        picks: list of pick dicts (bracket_id, game_id, team_picked, ...)
        games: list of game dicts (game_id, round, seed1, team1, seed2, team2, completed, ...)
        iterations: number of simulations (default 10,000)

    Returns:
        list of dicts, one per bracket, with keys:
        bracket_id, wins, avg_final_points, median_rank, best_rank,
        pct_first, pct_second, pct_third, pct_top10, pct_top25
    """
    completed_ids = {g['game_id'] for g in games if g.get('completed')}
    remaining = [g for g in games if not g.get('completed')]

    # Deterministic seed (mirrors TS: brackets.length * 1000 + completed * 7 + remaining * 31)
    data_seed = len(brackets) * 1000 + len(completed_ids) * 7 + len(remaining) * 31
    random = _seeded_random(data_seed)

    # Group picks by bracket
    picks_by_bracket = defaultdict(dict)
    for p in picks:
        picks_by_bracket[p['bracket_id']][p['game_id']] = p.get('team_picked', '')

    # Current points
    current_points = {b['id']: int(b.get('points', 0)) for b in brackets}

    # Tracking
    win_counts = defaultdict(int)
    rank_lists = defaultdict(list)

    for _ in range(iterations):
        # Simulate remaining games
        sim_winners = {}
        for g in remaining:
            seed1 = int(g.get('seed1', 8))
            rnd = g.get('round', 'R64')
            rate = SEED_WIN_RATES.get(seed1, {}).get(rnd, 0.5)
            sim_winners[g['game_id']] = g['team1'] if random() < rate else g['team2']

        # Score each bracket
        scores = []
        for b in brackets:
            bp = picks_by_bracket.get(b['id'], {})
            bonus = 0
            for g in remaining:
                picked = bp.get(g['game_id'])
                winner = sim_winners.get(g['game_id'])
                if picked and picked == winner:
                    bonus += ROUND_POINTS.get(g.get('round', ''), 0)
            total = current_points.get(b['id'], 0) + bonus
            scores.append((b['id'], total))

        # Rank
        scores.sort(key=lambda x: -x[1])
        for rank_idx, (bid, _) in enumerate(scores):
            rank_lists[bid].append(rank_idx + 1)

        # Winner
        if scores:
            win_counts[scores[0][0]] += 1

    # Build results
    n = iterations
    num_brackets = len(brackets)
    results = []
    for b in brackets:
        bid = b['id']
        ranks = rank_lists.get(bid, [])
        sorted_ranks = sorted(ranks)
        median_rank = sorted_ranks[len(sorted_ranks) // 2] if sorted_ranks else num_brackets
        best_rank = sorted_ranks[0] if sorted_ranks else num_brackets

        first = sum(1 for r in ranks if r == 1)
        second = sum(1 for r in ranks if r == 2)
        third = sum(1 for r in ranks if r == 3)
        top10 = sum(1 for r in ranks if r <= 10)
        top25 = sum(1 for r in ranks if r <= 25)

        results.append({
            'bracket_id': bid,
            'wins': win_counts.get(bid, 0),
            'avg_final_points': round(sum(ranks) / len(ranks)) if ranks else 0,  # unused but kept for compat
            'median_rank': median_rank,
            'best_rank': best_rank,
            'pct_first': round(first / n * 100, 1),
            'pct_second': round(second / n * 100, 1),
            'pct_third': round(third / n * 100, 1),
            'pct_top10': round(top10 / n * 100, 1),
            'pct_top25': round(top25 / n * 100, 1),
        })

    return results
