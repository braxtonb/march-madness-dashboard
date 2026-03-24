"""Pre-compute all derived dashboard data at scrape time.

Computes analytics, pick splits, eliminated teams, alive data, scatter data,
greatest calls, path entries, round accuracy, and champion distribution.
All outputs are JSON-serializable dicts/lists.
"""

from collections import defaultdict

ROUND_POINTS = {"R64": 10, "R32": 20, "S16": 40, "E8": 80, "FF": 160, "CHAMP": 320}
ROUND_ORDER = ["R64", "R32", "S16", "E8", "FF", "CHAMP"]


def precompute_all(brackets, picks, games, teams):
    """Compute all derived data from raw scraper output.

    Returns a dict with all pre-computed fields to include in data.json.
    """
    # Common lookups
    eliminated_teams = _compute_eliminated(games)
    team_logos = {t['name']: t.get('logo', '') for t in teams}
    team_abbrevs = {t['name']: t.get('abbrev', '') for t in teams}
    team_colors = {t['name']: t.get('color_primary', '') for t in teams if t.get('color_primary')}
    team_seeds = {t['name']: int(t.get('seed', 0)) for t in teams}
    submitted = [b for b in brackets if b.get('champion_pick')]
    total_brackets = len(submitted)

    # Note: max_remaining comes from ESPN's (possiblePointsMax - overallScore) which is authoritative.
    # Do NOT recompute it — ESPN accounts for bracket-specific pick trees correctly.

    pick_rates = _compute_pick_rates(picks, total_brackets)
    pick_splits = _compute_pick_splits(games, picks)

    # Build bracket picks map: bracket_id -> {game_id: team_picked}
    bracket_picks_map = defaultdict(dict)
    for p in picks:
        bracket_picks_map[p['bracket_id']][p['game_id']] = p.get('team_picked', '')

    analytics = _compute_analytics(brackets, picks, games, teams, eliminated_teams, pick_rates, total_brackets)
    scatter_data = _compute_scatter_data(submitted, picks, games, pick_rates, team_logos)
    # Enrich scatter data with archetype from analytics
    for s in scatter_data:
        a = analytics.get(s.get('id', ''), {})
        s['archetype'] = a.get('archetype', 'Scout')
    greatest_calls = _compute_greatest_calls(picks, games, brackets, pick_rates, team_logos)
    round_accuracy = _compute_round_accuracy(picks, games, total_brackets)
    path_entries = _compute_path_entries(brackets, picks, games, eliminated_teams, team_logos)
    alive_data = _compute_alive_data(brackets, picks, games, eliminated_teams, team_logos)
    champ_distribution = _compute_champ_distribution(submitted, eliminated_teams, team_logos, team_seeds)
    madness_index = _compute_madness_index(games)

    return {
        'analytics': analytics,
        'pick_splits': pick_splits,
        'eliminated_teams': list(eliminated_teams),
        'scatter_data': scatter_data,
        'greatest_calls': greatest_calls,
        'round_accuracy': round_accuracy,
        'path_entries': path_entries,
        'alive_data': alive_data,
        'champ_distribution': champ_distribution,
        'madness_index': madness_index,
        'submitted_count': total_brackets,
        'team_logos': team_logos,
        'team_abbrevs': team_abbrevs,
        'team_colors': team_colors,
    }


def _compute_eliminated(games):
    eliminated = set()
    for g in games:
        if g.get('completed') and g.get('winner'):
            if g.get('team1') and g['team1'] != g['winner']:
                eliminated.add(g['team1'])
            if g.get('team2') and g['team2'] != g['winner']:
                eliminated.add(g['team2'])
    return eliminated


def _fix_max_remaining(brackets, picks, games, eliminated):
    """Recompute max_remaining from picks data + eliminated teams.

    ESPN's possiblePointsMax can be stale if fetched before games complete.
    We recompute: sum of round points for each bracket's picks where the
    team is still alive and the game is not yet completed.
    """
    completed_ids = {g['game_id'] for g in games if g.get('completed')}
    picks_by_bracket = defaultdict(list)
    for p in picks:
        picks_by_bracket[p['bracket_id']].append(p)

    for b in brackets:
        bp = picks_by_bracket.get(b['id'], [])
        remaining = 0
        for p in bp:
            if p['game_id'] in completed_ids:
                continue
            team = p.get('team_picked', '')
            if team and team not in eliminated:
                remaining += ROUND_POINTS.get(p.get('round', ''), 0)
        b['max_remaining'] = remaining


def _compute_pick_rates(picks, total_brackets):
    """game_id -> {team -> rate}"""
    counts = defaultdict(lambda: defaultdict(int))
    for p in picks:
        if p.get('team_picked'):
            counts[p['game_id']][p['team_picked']] += 1
    rates = {}
    for gid, teams in counts.items():
        rates[gid] = {t: c / total_brackets if total_brackets > 0 else 0 for t, c in teams.items()}
    return rates


def _compute_pick_splits(games, picks):
    splits = {}
    for g in games:
        gid = g['game_id']
        game_picks = [p for p in picks if p['game_id'] == gid]
        t1 = sum(1 for p in game_picks if p.get('team_picked') == g.get('team1'))
        t2 = sum(1 for p in game_picks if p.get('team_picked') == g.get('team2'))
        splits[gid] = {'team1Count': t1, 'team2Count': t2}
    return splits


def _compute_analytics(brackets, picks, games, teams, eliminated, pick_rates, total_brackets):
    """Per-bracket analytics: rank, rank_delta, uniqueness, archetype, win_prob, champion_alive, ff_alive."""
    # Uniqueness per bracket
    picks_by_bracket = defaultdict(list)
    for p in picks:
        picks_by_bracket[p['bracket_id']].append(p)

    uniqueness_map = {}
    for b in brackets:
        bp = picks_by_bracket.get(b['id'], [])
        if not bp:
            uniqueness_map[b['id']] = 0.5
            continue
        total_u = 0
        count = 0
        for p in bp:
            rate = pick_rates.get(p['game_id'], {}).get(p.get('team_picked', ''), 0.5)
            total_u += (1 - rate)
            count += 1
        uniqueness_map[b['id']] = total_u / count if count > 0 else 0.5

    # Sort for ranking
    sorted_b = sorted(brackets, key=lambda b: (-int(b.get('points', 0)), -int(b.get('max_remaining', 0)), b.get('name', '')))
    leader_pts = int(sorted_b[0]['points']) if sorted_b else 0

    # Compute ranks (RANK style — skip on ties)
    ranks = []
    for i, b in enumerate(sorted_b):
        if i == 0:
            ranks.append(1)
        elif (int(b.get('points', 0)) == int(sorted_b[i-1].get('points', 0)) and
              int(b.get('max_remaining', 0)) == int(sorted_b[i-1].get('max_remaining', 0))):
            ranks.append(ranks[-1])
        else:
            ranks.append(i + 1)

    rank_map = {sorted_b[i]['id']: ranks[i] for i in range(len(sorted_b))}

    # FF teams per bracket
    ff_picks = defaultdict(set)
    for p in picks:
        if p.get('round') == 'E8' and p.get('team_picked'):
            ff_picks[p['bracket_id']].add(p['team_picked'])

    results = {}
    for b in brackets:
        bid = b['id']
        rank = rank_map.get(bid, len(brackets))
        prev_rank = int(b.get('prev_rank', 0)) or rank
        rank_delta = prev_rank - rank

        uniqueness = uniqueness_map.get(bid, 0.5)

        # Archetype classification
        bp = picks_by_bracket.get(bid, [])
        upsets = sum(1 for p in bp if p.get('correct') and
                     pick_rates.get(p['game_id'], {}).get(p.get('team_picked', ''), 1) < 0.5)
        champ_seed = int(b.get('champion_seed', 8))

        if upsets >= 5 and uniqueness > 0.55:
            archetype = "Visionary"
        elif upsets >= 3 and champ_seed <= 3:
            archetype = "Strategist"
        elif uniqueness > 0.6:
            archetype = "Original"
        elif champ_seed <= 2:
            archetype = "Analyst"
        else:
            archetype = "Scout"

        # Win probability estimate
        max_rem = int(b.get('max_remaining', 0))
        if max_rem > 0:
            win_prob = max(0, 1 - (leader_pts - int(b.get('points', 0))) / max_rem)
            win_prob = round(win_prob * 1000) / 10
        else:
            win_prob = 0

        champ_alive = bool(b.get('champion_pick') and b['champion_pick'] not in eliminated)

        ff_teams = list(ff_picks.get(bid, set())) + [b.get(f'ff{i}', '') for i in range(1, 5)]
        ff_teams = list(set(t for t in ff_teams if t))
        ff_alive = sum(1 for t in ff_teams if t not in eliminated)

        results[bid] = {
            'rank': rank,
            'rank_delta': rank_delta,
            'uniqueness': round(uniqueness, 4),
            'archetype': archetype,
            'estimated_win_prob': win_prob,
            'champion_alive': champ_alive,
            'final_four_alive': ff_alive,
        }

    return results


def _compute_scatter_data(submitted, picks, games, pick_rates, team_logos):
    picks_by_bracket = defaultdict(list)
    for p in picks:
        picks_by_bracket[p['bracket_id']].append(p)

    completed_ids = {g['game_id'] for g in games if g.get('completed')}
    result = []
    for b in submitted:
        bp = picks_by_bracket.get(b['id'], [])
        skill_num = skill_den = fortune_num = fortune_den = 0
        for p in bp:
            if p['game_id'] not in completed_ids:
                continue
            rate = pick_rates.get(p['game_id'], {}).get(p.get('team_picked', ''), 0.5)
            if rate < 0.6:
                skill_den += 1
                if p.get('correct'):
                    skill_num += 1
            if rate < 0.3:
                fortune_den += 1
                if p.get('correct'):
                    fortune_num += 1
        result.append({
            'id': b['id'],
            'name': b['name'],
            'owner': b.get('owner', ''),
            'full_name': b.get('full_name', ''),
            'points': int(b.get('points', 0)),
            'skill': round(skill_num / skill_den * 100) if skill_den > 0 else 50,
            'fortune': round(fortune_num / fortune_den * 100) if fortune_den > 0 else 50,
            'champion': b.get('champion_pick', ''),
            'logo': team_logos.get(b.get('champion_pick', ''), ''),
        })
    return result


def _compute_greatest_calls(picks, games, brackets, pick_rates, team_logos):
    bracket_map = {b['id']: b for b in brackets}
    correct = [p for p in picks if p.get('correct')]
    scored = []
    for p in correct:
        rate = pick_rates.get(p['game_id'], {}).get(p.get('team_picked', ''), 1)
        b = bracket_map.get(p['bracket_id'])
        g = next((g for g in games if g['game_id'] == p['game_id']), None)
        if b and g:
            scored.append({
                'bracketId': b['id'],
                'bracketName': b['name'],
                'bracketOwner': b.get('owner', ''),
                'bracketFullName': b.get('full_name', ''),
                'teamPicked': p['team_picked'],
                'seedPicked': int(p.get('seed_picked', 0)),
                'rate': rate,
                'round': g.get('round', ''),
            })
    scored.sort(key=lambda x: x['rate'])
    return scored[:15]


def _compute_round_accuracy(picks, games, total_brackets):
    result = []
    for rnd in ROUND_ORDER:
        round_games = [g for g in games if g.get('round') == rnd and g.get('completed')]
        correct = 0
        for g in round_games:
            game_picks = [p for p in picks if p['game_id'] == g['game_id']]
            t1_count = sum(1 for p in game_picks if p.get('team_picked') == g.get('team1'))
            consensus = g['team1'] if t1_count > total_brackets / 2 else g['team2']
            if consensus == g.get('winner'):
                correct += 1
        result.append({'round': rnd, 'correct': correct, 'total': len(round_games)})
    return result


def _compute_path_entries(brackets, picks, games, eliminated, team_logos):
    completed_ids = {g['game_id'] for g in games if g.get('completed')}
    picks_by_bracket = defaultdict(list)
    for p in picks:
        picks_by_bracket[p['bracket_id']].append(p)

    entries = []
    for b in brackets:
        bp = picks_by_bracket.get(b['id'], [])
        remaining = []
        elim_count = 0
        for p in bp:
            if p['game_id'] in completed_ids:
                continue
            team = p.get('team_picked', '')
            if not team:
                continue
            if team in eliminated:
                elim_count += 1
            else:
                remaining.append({
                    'round': p.get('round', ''),
                    'team': team,
                    'seed': int(p.get('seed_picked', 0)),
                    'pts': ROUND_POINTS.get(p.get('round', ''), 0),
                    'logo': team_logos.get(team, ''),
                })
        entries.append({
            'bracketId': b['id'],
            'remainingPicks': remaining,
            'eliminatedPickCount': elim_count,
        })
    return entries


def _compute_alive_data(brackets, picks, games, eliminated, team_logos):
    champ_alive = sum(1 for b in brackets if b.get('champion_pick') and b['champion_pick'] not in eliminated)

    ff_picks = defaultdict(set)
    for p in picks:
        if p.get('round') == 'E8' and p.get('team_picked'):
            ff_picks[p['bracket_id']].add(p['team_picked'])

    def get_ff_teams(b):
        fields = [b.get(f'ff{i}', '') for i in range(1, 5)]
        from_picks = ff_picks.get(b['id'], set())
        return list(set(t for t in fields + list(from_picks) if t))

    ff3 = sum(1 for b in brackets if sum(1 for t in get_ff_teams(b) if t not in eliminated) >= 3)
    ff2 = sum(1 for b in brackets if sum(1 for t in get_ff_teams(b) if t not in eliminated) >= 2)
    games_completed = sum(1 for g in games if g.get('completed'))

    # Games to watch
    upcoming = [g for g in games if not g.get('completed') and g.get('team1') and g.get('team2')]
    gtw = []
    for g in upcoming:
        affected = [b for b in brackets if b.get('champion_pick') in (g['team1'], g['team2'])]
        if not affected:
            continue
        gtw.append({
            'gameId': g['game_id'],
            'seed1': int(g.get('seed1', 0)),
            'team1': g['team1'],
            'seed2': int(g.get('seed2', 0)),
            'team2': g['team2'],
            'round': g.get('round', ''),
            'affectedCount': len(affected),
            'affectedBrackets': [{
                'name': b['name'],
                'owner': b.get('owner', ''),
                'full_name': b.get('full_name', ''),
                'champion': b['champion_pick'],
                'championSeed': int(b.get('champion_seed', 0)),
                'bracketId': b['id'],
            } for b in affected],
        })
    gtw.sort(key=lambda x: -x['affectedCount'])

    ff_map = {b['id']: get_ff_teams(b) for b in brackets}

    return {
        'champAlive': champ_alive,
        'ff3Plus': ff3,
        'ff2Plus': ff2,
        'gamesRemaining': 63 - games_completed,
        'gamesToWatch': gtw[:5],
        'bracketFFTeamsMap': ff_map,
    }


def _compute_champ_distribution(submitted, eliminated, team_logos, team_seeds):
    counts = defaultdict(int)
    bracket_lists = defaultdict(list)
    for b in submitted:
        champ = b.get('champion_pick', '')
        if champ:
            counts[champ] += 1
            bracket_lists[champ].append({
                'bracketId': b['id'],
                'bracketName': b['name'],
                'fullName': b.get('full_name', ''),
            })
    result = []
    for name, count in sorted(counts.items(), key=lambda x: -x[1]):
        result.append({
            'name': name,
            'count': count,
            'alive': name not in eliminated,
            'logo': team_logos.get(name, ''),
            'seed': team_seeds.get(name, 0),
            'brackets': bracket_lists[name],
        })
    return result


def _compute_madness_index(games):
    total = 0
    round_weights = {"R64": 1, "R32": 2, "S16": 4, "E8": 8, "FF": 16, "CHAMP": 32}
    max_possible = 0
    for g in games:
        if not g.get('completed'):
            continue
        s1 = int(g.get('seed1', 8))
        s2 = int(g.get('seed2', 8))
        weight = round_weights.get(g.get('round', 'R64'), 1)
        diff = abs(s1 - s2)
        max_possible += 15 * weight
        winner = g.get('winner', '')
        if winner:
            winner_seed = s1 if winner == g.get('team1') else s2
            loser_seed = s2 if winner == g.get('team1') else s1
            if winner_seed > loser_seed:
                total += diff * weight
    return round(total / max_possible * 100) if max_possible > 0 else 0
