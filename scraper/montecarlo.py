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


def simulate_timeline(brackets, picks, games, checkpoint_path=None, iterations=10000):
    """Run Monte Carlo at each completed game checkpoint to build a win% timeline.

    Loads existing checkpoints from checkpoint_path (if any), only simulates
    newly completed games, appends results, and saves back. Returns the full
    timeline data structure.

    Args:
        brackets: list of bracket dicts
        picks: list of pick dicts
        games: list of game dicts (must include complete_date, start_date)
        checkpoint_path: path to persistent JSON checkpoint file (optional)
        iterations: MC iterations per checkpoint (default 10,000)

    Returns:
        dict with 'checkpoints' and 'lines' keys for the probability timeline
    """
    import json
    import os
    import logging

    logger = logging.getLogger(__name__)

    # Load existing checkpoints
    existing = {'checkpoints': [], 'processed_game_ids': []}
    if checkpoint_path and os.path.exists(checkpoint_path):
        try:
            with open(checkpoint_path, 'r') as f:
                existing = json.load(f)
        except (json.JSONDecodeError, IOError):
            pass

    processed_ids = set(existing.get('processed_game_ids', []))

    # Sort completed games chronologically by complete_date
    completed_games = sorted(
        [g for g in games if g.get('completed') and g.get('complete_date')],
        key=lambda g: g['complete_date']
    )

    # Find new games to process
    new_games = [g for g in completed_games if g['game_id'] not in processed_ids]

    if new_games:
        logger.info(f"Timeline: {len(new_games)} new games to simulate (of {len(completed_games)} total)")
    else:
        logger.info(f"Timeline: all {len(completed_games)} games already checkpointed")

    # Group picks by bracket
    picks_by_bracket = defaultdict(dict)
    for p in picks:
        picks_by_bracket[p['bracket_id']][p['game_id']] = p.get('team_picked', '')

    # Build game lookup
    game_map = {g['game_id']: g for g in games}

    # Ordered list of all completed game IDs (for reconstructing state at each checkpoint)
    completed_order = [g['game_id'] for g in completed_games]

    # Process each new game
    checkpoints = list(existing.get('checkpoints', []))

    for new_game in new_games:
        gid = new_game['game_id']
        # Find position in chronological order
        game_idx = completed_order.index(gid)

        # Reconstruct state: games up to and including this one are completed
        completed_at_checkpoint = set(completed_order[:game_idx + 1])

        # Calculate current points for each bracket at this checkpoint
        bracket_points = {}
        for b in brackets:
            bp = picks_by_bracket.get(b['id'], {})
            pts = 0
            for cgid in completed_at_checkpoint:
                cg = game_map.get(cgid, {})
                picked = bp.get(cgid)
                if picked and picked == cg.get('winner'):
                    pts += ROUND_POINTS.get(cg.get('round', ''), 0)
            bracket_points[b['id']] = pts

        # Remaining games = all games NOT in completed_at_checkpoint
        remaining = [g for g in games if g['game_id'] not in completed_at_checkpoint
                     and g.get('team1') and g.get('team2')]

        # Deterministic seed per checkpoint
        data_seed = len(brackets) * 1000 + len(completed_at_checkpoint) * 7 + len(remaining) * 31
        random = _seeded_random(data_seed)

        # Run MC
        win_counts = defaultdict(int)
        for _ in range(iterations):
            sim_winners = {}
            for g in remaining:
                seed1 = int(g.get('seed1', 8))
                rnd = g.get('round', 'R64')
                rate = SEED_WIN_RATES.get(seed1, {}).get(rnd, 0.5)
                sim_winners[g['game_id']] = g['team1'] if random() < rate else g['team2']

            scores = []
            for b in brackets:
                bp = picks_by_bracket.get(b['id'], {})
                bonus = sum(
                    ROUND_POINTS.get(g.get('round', ''), 0)
                    for g in remaining
                    if bp.get(g['game_id']) and bp[g['game_id']] == sim_winners.get(g['game_id'])
                )
                scores.append((b['id'], bracket_points.get(b['id'], 0) + bonus))

            scores.sort(key=lambda x: -x[1])
            if scores:
                win_counts[scores[0][0]] += 1

        # Record checkpoint
        checkpoints.append({
            'gameIndex': game_idx,
            'gameId': gid,
            'round': new_game.get('round', ''),
            'team1': new_game.get('team1', ''),
            'seed1': new_game.get('seed1', 0),
            'team2': new_game.get('team2', ''),
            'seed2': new_game.get('seed2', 0),
            'winner': new_game.get('winner', ''),
            'completeDate': new_game.get('complete_date', 0),
            'winPcts': {
                b['id']: round(win_counts.get(b['id'], 0) / iterations * 100, 2)
                for b in brackets
            },
        })
        processed_ids.add(gid)
        logger.info(f"  Checkpoint {game_idx + 1}/{len(completed_games)}: {new_game.get('team1')} vs {new_game.get('team2')} ({new_game.get('round')})")

    # Sort checkpoints by gameIndex
    checkpoints.sort(key=lambda c: c['gameIndex'])

    # Save checkpoint file
    if checkpoint_path:
        os.makedirs(os.path.dirname(checkpoint_path), exist_ok=True)
        with open(checkpoint_path, 'w') as f:
            json.dump({
                'checkpoints': checkpoints,
                'processed_game_ids': list(processed_ids),
            }, f)
        logger.info(f"Timeline: saved {len(checkpoints)} checkpoints to {checkpoint_path}")

    # Build output: extract per-bracket probability arrays and champion elimination info
    # Determine when each bracket's champion was eliminated
    eliminated_teams = set()
    champ_eliminated_at = {}  # team -> gameIndex
    for cp in checkpoints:
        loser = cp['team1'] if cp['winner'] == cp['team2'] else cp['team2']
        if loser and loser not in eliminated_teams:
            eliminated_teams.add(loser)
            champ_eliminated_at[loser] = cp['gameIndex']

    lines = []
    for b in brackets:
        champion = b.get('champion_pick', '')
        elim_game = champ_eliminated_at.get(champion, -1)
        probs = [cp['winPcts'].get(b['id'], 0) for cp in checkpoints]
        lines.append({
            'bracketId': b['id'],
            'name': b.get('name', ''),
            'champion': champion,
            'eliminatedAtGame': elim_game,
            'probabilities': probs,
        })

    checkpoint_meta = [{
        'gameIndex': cp['gameIndex'],
        'gameId': cp['gameId'],
        'round': cp['round'],
        'team1': cp['team1'],
        'seed1': cp.get('seed1', 0),
        'team2': cp['team2'],
        'seed2': cp.get('seed2', 0),
        'winner': cp['winner'],
        'completeDate': cp['completeDate'],
    } for cp in checkpoints]

    return {
        'checkpoints': checkpoint_meta,
        'lines': lines,
    }
