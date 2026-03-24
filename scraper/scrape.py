"""Main scraper orchestrator. Fetch ESPN JSON API data -> parse -> write to Sheets."""
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from scraper.fetch import fetch_challenge_data, fetch_group_entries
from scraper.espn import (
    build_outcome_map, build_proposition_map,
    parse_entries, parse_games, parse_teams,
)
from scraper.sheets import GoogleSheetsStore

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

BRACKETS_HEADERS = [
    'id', 'name', 'owner', 'full_name', 'champion_pick', 'champion_seed',
    'ff1', 'ff2', 'ff3', 'ff4',
    'points', 'prev_rank', 'max_remaining', 'pct',
    'r64_pts', 'r32_pts', 's16_pts', 'e8_pts', 'ff_pts', 'champ_pts',
]
PICKS_HEADERS = [
    'bracket_id', 'game_id', 'round', 'region',
    'team_picked', 'seed_picked', 'correct', 'vacated',
]
GAMES_HEADERS = [
    'game_id', 'round', 'region', 'team1', 'seed1', 'team2', 'seed2',
    'winner', 'completed', 'national_pct_team1', 'espn_url', 'start_date', 'complete_date',
]
TEAMS_HEADERS = ['name', 'abbrev', 'seed', 'region', 'conference', 'eliminated', 'eliminated_round', 'logo', 'color_primary']
SNAPSHOTS_HEADERS = ['bracket_id', 'round', 'rank', 'points', 'max_remaining', 'win_prob']


def run():
    """Main scraper entry point."""
    group_id = os.environ.get('ESPN_GROUP_ID', 'f2683f8e-fbba-4625-9188-84a820659e90')
    store = GoogleSheetsStore()

    # Step 1: Read existing state for prev_rank + round detection
    logger.info("Reading existing state...")
    existing_brackets = store.read_tab('brackets')
    existing_ranks: dict[str, int] = {}
    sorted_existing = sorted(existing_brackets, key=lambda b: -int(b.get('points', 0)))
    for rank, b in enumerate(sorted_existing, 1):
        existing_ranks[b.get('id', '')] = rank

    existing_meta = store.read_tab('meta')
    prev_round = existing_meta[0].get('current_round', 'PRE') if existing_meta else 'PRE'

    # Step 2: Fetch challenge data (propositions + outcomes — the game/team structure)
    logger.info("Fetching ESPN challenge data...")
    challenge_data = fetch_challenge_data()
    outcome_map = build_outcome_map(challenge_data)
    proposition_map = build_proposition_map(challenge_data)
    logger.info(f"Built maps: {len(outcome_map)} outcomes, {len(proposition_map)} propositions")

    # Step 3: Fetch all group entries (paginated)
    logger.info(f"Fetching group entries for group {group_id}...")
    group_data = fetch_group_entries(group_id)
    logger.info(f"Fetched {len(group_data.get('entries', []))} entries")

    # Step 4: Parse entries into brackets + picks
    brackets, all_picks = parse_entries(group_data, outcome_map, proposition_map)
    logger.info(f"Parsed {len(brackets)} brackets, {len(all_picks)} picks")

    # Load users lookup for full names
    users_path = Path(__file__).resolve().parent / 'fixtures' / 'users.json'
    users_lookup = {}
    if users_path.exists():
        with open(users_path) as f:
            users_lookup = json.load(f)

    # Merge full names from users.json (prefer over API since API may not return fullName without auth)
    for bracket in brackets:
        user = users_lookup.get(bracket['id'], {})
        if user.get('fullName') and not bracket.get('full_name'):
            bracket['full_name'] = user['fullName']

    # Apply prev_rank from stored state
    for b in brackets:
        b['prev_rank'] = existing_ranks.get(b['id'], 0)

    # Step 5: Parse games + teams from proposition/outcome maps
    games = parse_games(proposition_map)
    teams = parse_teams(outcome_map)
    logger.info(f"Parsed {len(games)} games, {len(teams)} teams")

    # max_remaining is computed in parse_entries from possiblePointsMax - overallScore

    # Step 6: Write picks (always — API gives us all picks at once, no "first run" concept)
    store.write_tab('picks', all_picks, PICKS_HEADERS)
    logger.info(f"Wrote {len(all_picks)} picks")

    # Step 7: Reconstruct all 63 games from picks + API data + existing sheet
    # ESPN API only returns current-round propositions, so we must rebuild
    # historical games from picks data (which has all 63 game_ids).
    existing_games = store.read_tab('games')
    game_map: dict[str, dict] = {g.get('game_id', ''): g for g in existing_games}

    # Overlay API games (freshest data for current round)
    for g in games:
        game_map[g['game_id']] = g

    # Build set of teams that appear in current API propositions (= still active)
    # Teams in R32 propositions are R64 winners, etc.
    active_teams: set[str] = set()
    for prop in proposition_map.values():
        if prop.get('team1'): active_teams.add(prop['team1'])
        if prop.get('team2'): active_teams.add(prop['team2'])
    logger.info(f"Active teams in current API propositions: {len(active_teams)}")

    # Reconstruct missing games from picks data
    picks_by_game: dict[str, list] = {}
    for p in all_picks:
        gid = p['game_id']
        if gid not in picks_by_game:
            picks_by_game[gid] = []
        picks_by_game[gid].append(p)

    # Build round order for determining advancement
    round_order = ['R64', 'R32', 'S16', 'E8', 'FF', 'CHAMP']

    for gid, game_picks in picks_by_game.items():
        if gid in game_map:
            # Update existing game if it has no winner but we can determine one
            existing = game_map[gid]
            is_completed = existing.get('completed') is True or str(existing.get('completed')) == 'True'
            if not is_completed and not existing.get('winner'):
                t1, t2 = existing.get('team1', ''), existing.get('team2', '')
                rnd = existing.get('round', '')
                rnd_idx = round_order.index(rnd) if rnd in round_order else -1
                if rnd_idx >= 0 and rnd_idx < len(round_order) - 1:
                    # Check if one team advanced (appears in a later round's API data)
                    if t1 in active_teams and t2 and t2 not in active_teams:
                        existing['winner'] = t1
                        existing['completed'] = True
                    elif t2 in active_teams and t1 and t1 not in active_teams:
                        existing['winner'] = t2
                        existing['completed'] = True
            continue

        # Reconstruct from picks
        sample = game_picks[0]
        teams_in_game: dict[str, int] = {}
        for p in game_picks:
            if p['team_picked'] and p['team_picked'] not in teams_in_game:
                teams_in_game[p['team_picked']] = p['seed_picked']
        team_list = list(teams_in_game.items())
        team1 = team_list[0][0] if len(team_list) > 0 else ''
        seed1 = team_list[0][1] if len(team_list) > 0 else 0
        team2 = team_list[1][0] if len(team_list) > 1 else ''
        seed2 = team_list[1][1] if len(team_list) > 1 else 0

        # Determine winner: check correct picks first
        winner = ''
        for p in game_picks:
            if p['correct']:
                winner = p['team_picked']
                break

        # If no correct picks, check if one team advanced to a later round
        if not winner and team1 and team2:
            rnd = sample['round']
            rnd_idx = round_order.index(rnd) if rnd in round_order else -1
            if rnd_idx >= 0 and rnd_idx < len(round_order) - 1:
                if team1 in active_teams and team2 not in active_teams:
                    winner = team1
                elif team2 in active_teams and team1 not in active_teams:
                    winner = team2

        game_map[gid] = {
            'game_id': gid,
            'round': sample['round'],
            'region': sample['region'],
            'team1': team1,
            'seed1': seed1,
            'team2': team2,
            'seed2': seed2,
            'winner': winner,
            'completed': bool(winner),
            'national_pct_team1': 0.0,
        }

    # Backfill espn_url from API games onto all games in map
    api_game_urls = {g['game_id']: g.get('espn_url', '') for g in games if g.get('espn_url')}
    for gid, url in api_game_urls.items():
        if gid in game_map and not game_map[gid].get('espn_url'):
            game_map[gid]['espn_url'] = url

    merged_games = list(game_map.values())
    logger.info(f"Merged games: {len(merged_games)} total ({sum(1 for g in merged_games if g.get('completed') or str(g.get('completed')) == 'True')} completed)")
    store.write_tab('games', merged_games, GAMES_HEADERS)

    # Compute elimination: a team is eliminated if it lost a completed game
    losers = set()
    for g in merged_games:
        is_completed = g.get('completed') and str(g.get('completed')).lower() not in ('false', '0', '')
        if is_completed and g.get('winner'):
            if g.get('team1') and g.get('team1') != g.get('winner'):
                losers.add(g['team1'])
            if g.get('team2') and g.get('team2') != g.get('winner'):
                losers.add(g['team2'])

    for t in teams:
        if t['name'] in losers:
            t['eliminated'] = True
            # Find the round they were eliminated in
            for g in merged_games:
                completed_val = g.get('completed')
                is_completed = completed_val is True or str(completed_val) == 'True'
                if is_completed and g.get('winner') and g.get('winner') != t['name']:
                    if t['name'] in (g.get('team1'), g.get('team2')):
                        t['eliminated_round'] = g.get('round', '')
                        break

    if teams:
        store.write_tab('teams', teams, TEAMS_HEADERS)

    # Step 8: Write brackets
    store.write_tab('brackets', brackets, BRACKETS_HEADERS)

    # Step 9: Detect round change -> write snapshots
    games_completed = sum(
        1 for g in merged_games
        if g.get('completed') and str(g.get('completed')).lower() not in ('false', '0', '')
    )
    current_round = _determine_current_round(games_completed)

    if current_round != prev_round and prev_round != 'PRE':
        logger.info(f"Round changed: {prev_round} -> {current_round}. Writing snapshots...")
        # Compute simple win probability estimate for snapshots
        sorted_brackets = sorted(brackets, key=lambda x: -x.get('points', 0))
        leader_pts = sorted_brackets[0].get('points', 0) if sorted_brackets else 0
        snapshot_rows = []
        for rank, b in enumerate(sorted_brackets, 1):
            max_rem = b.get('max_remaining', 0)
            # Simple estimate: probability of catching the leader
            if max_rem > 0:
                win_prob = max(0.0, min(1.0, 1.0 - (leader_pts - b.get('points', 0)) / max_rem))
            else:
                win_prob = 1.0 if rank == 1 else 0.0
            snapshot_rows.append({
                'bracket_id': b['id'],
                'round': prev_round,
                'rank': rank,
                'points': b.get('points', 0),
                'max_remaining': max_rem,
                'win_prob': round(win_prob, 4),
            })
        store.append_rows('snapshots', snapshot_rows, SNAPSHOTS_HEADERS)
        logger.info(f"Wrote {len(snapshot_rows)} snapshot rows for {prev_round}")

    # Step 10: Update meta
    meta = {
        'last_updated': datetime.now(timezone.utc).isoformat(),
        'last_checked_at': int(datetime.now(timezone.utc).timestamp() * 1000),
        'current_round': current_round,
        'games_completed': games_completed,
    }
    store.update_meta(meta)

    # Step 11: Export static JSON for the frontend (no Sheets API calls needed)
    _export_data_json(brackets, all_picks, merged_games, teams, store, meta)

    logger.info(f"Done. {games_completed}/63 games. Round: {current_round}")


def _export_data_json(brackets, picks, games, teams, store, meta):
    """Production export — reads snapshots from Google Sheets, then delegates to shared function."""
    try:
        snapshots = store.read_tab('snapshots')
    except Exception:
        snapshots = []
    _export_data_json_shared(brackets, picks, games, teams, snapshots, meta)


def _export_data_json_shared(brackets, picks, games, teams, snapshots, meta):
    """Shared export function used by both production and local modes.

    Normalizes data, runs pre-computation + Monte Carlo, writes public/data.json.
    """

    def _normalize(rows, bool_fields=None):
        bool_fields = bool_fields or []
        result = []
        for row in rows:
            r = {}
            for k, v in row.items():
                if k in bool_fields:
                    r[k] = str(v).lower() in ('true', '1') if isinstance(v, str) else bool(v)
                elif isinstance(v, str) and v.replace('.', '', 1).replace('-', '', 1).isdigit():
                    try:
                        r[k] = int(v) if '.' not in v else float(v)
                    except ValueError:
                        r[k] = v
                else:
                    r[k] = v
            result.append(r)
        return result

    norm_brackets = _normalize(brackets)
    norm_picks = _normalize(picks, bool_fields=['correct', 'vacated'])
    norm_games = _normalize(games, bool_fields=['completed'])
    norm_teams = _normalize(teams, bool_fields=['eliminated'])

    # Pre-compute all derived data (analytics, pick splits, awards, etc.)
    from scraper.precompute import precompute_all
    derived = precompute_all(norm_brackets, norm_picks, norm_games, norm_teams)
    logger.info("Pre-computed analytics, pick splits, scatter, awards, paths, alive data")

    # Run Monte Carlo simulation (10,000 iterations)
    from scraper.montecarlo import run_monte_carlo, simulate_timeline
    sim_results = run_monte_carlo(norm_brackets, norm_picks, norm_games, iterations=10000)
    logger.info(f"Monte Carlo: {len(sim_results)} brackets simulated (10,000 iterations)")

    # Run incremental Monte Carlo timeline (win% after each game)
    checkpoint_path = os.path.join(os.path.dirname(__file__), 'data', 'probability_checkpoints.json')
    probability_timeline = simulate_timeline(norm_brackets, norm_picks, norm_games, checkpoint_path, iterations=10000)
    derived['probability_timeline'] = probability_timeline

    data = {
        'brackets': norm_brackets,
        'picks': norm_picks,
        'games': norm_games,
        'teams': norm_teams,
        'snapshots': _normalize(snapshots),
        'sim_results': sim_results,
        'derived': derived,
        'meta': meta,
    }

    out_path = Path(__file__).resolve().parent.parent / 'public' / 'data.json'
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(data, default=str), encoding='utf-8')
    logger.info(f"Exported data.json ({out_path.stat().st_size // 1024}KB)")


def _determine_current_round(games_completed: int) -> str:
    if games_completed <= 0: return 'PRE'
    if games_completed <= 32: return 'R64'
    if games_completed <= 48: return 'R32'
    if games_completed <= 56: return 'S16'
    if games_completed <= 60: return 'E8'
    if games_completed <= 62: return 'FF'
    return 'CHAMP'


def run_local():
    """Generate data.json from local fixtures only — no API calls, no Google Sheets.

    Usage: python -m scraper.scrape --local
    """
    fixtures_dir = Path(__file__).resolve().parent / 'fixtures'
    logger.info("Running in local mode — using fixtures only")

    # Load challenge data from all periods
    all_props = []
    seen_ids: set[str] = set()
    for period in range(1, 7):
        fp = fixtures_dir / f'challenge_period_{period}.json'
        if fp.exists():
            with open(fp) as f:
                data = json.load(f)
            for p in data.get('propositions', []):
                pid = str(p.get('id', ''))
                if pid and pid not in seen_ids:
                    all_props.append(p)
                    seen_ids.add(pid)
    challenge_data = {'propositions': all_props}
    logger.info(f"Loaded {len(all_props)} propositions from fixtures")

    outcome_map = build_outcome_map(challenge_data)
    proposition_map = build_proposition_map(challenge_data)

    # Load group entries from fixtures
    with open(fixtures_dir / 'group_slug.json') as f:
        slug_data = json.load(f)
    with open(fixtures_dir / 'group_chui.json') as f:
        chui_data = json.load(f)

    entries_with_picks = {e['id']: e for e in slug_data.get('entries', [])}

    # Load individual entries
    ind_path = fixtures_dir / 'individual_entries.json'
    if ind_path.exists():
        with open(ind_path) as f:
            individual = json.load(f)
        for eid_str, entry in individual.items():
            eid = entry.get('id', int(eid_str) if eid_str.isdigit() else eid_str)
            entries_with_picks[eid] = entry

    # Merge
    merged_entries = []
    for entry in chui_data.get('entries', []):
        eid = entry['id']
        if eid in entries_with_picks:
            full = entries_with_picks[eid]
            if 'score' in entry:
                full['score'] = entry['score']
            merged_entries.append(full)
        else:
            merged_entries.append(entry)
    chui_data['entries'] = merged_entries

    brackets, all_picks = parse_entries(chui_data, outcome_map, proposition_map)
    games = parse_games(proposition_map)
    teams = parse_teams(outcome_map)
    logger.info(f"Parsed {len(brackets)} brackets, {len(all_picks)} picks, {len(games)} games, {len(teams)} teams")

    # Load users lookup
    users_path = fixtures_dir / 'users.json'
    if users_path.exists():
        with open(users_path) as f:
            users_lookup = json.load(f)
        for bracket in brackets:
            user = users_lookup.get(bracket['id'], {})
            if user.get('fullName'):
                bracket['full_name'] = user['fullName']

    # Build game map with reconstruction (same logic as run())
    game_map: dict[str, dict] = {}
    for g in games:
        game_map[g['game_id']] = g

    active_teams: set[str] = set()
    for prop in proposition_map.values():
        if prop.get('team1'): active_teams.add(prop['team1'])
        if prop.get('team2'): active_teams.add(prop['team2'])

    picks_by_game: dict[str, list] = {}
    for p in all_picks:
        gid = p['game_id']
        if gid not in picks_by_game:
            picks_by_game[gid] = []
        picks_by_game[gid].append(p)

    round_order = ['R64', 'R32', 'S16', 'E8', 'FF', 'CHAMP']
    for gid, game_picks in picks_by_game.items():
        if gid in game_map:
            continue
        sample = game_picks[0]
        teams_in_game: dict[str, int] = {}
        for p in game_picks:
            if p['team_picked'] and p['team_picked'] not in teams_in_game:
                teams_in_game[p['team_picked']] = p['seed_picked']
        team_list = list(teams_in_game.items())
        team1 = team_list[0][0] if len(team_list) > 0 else ''
        seed1 = team_list[0][1] if len(team_list) > 0 else 0
        team2 = team_list[1][0] if len(team_list) > 1 else ''
        seed2 = team_list[1][1] if len(team_list) > 1 else 0

        winner = ''
        for p in game_picks:
            if p['correct']:
                winner = p['team_picked']
                break
        if not winner and team1 and team2:
            rnd = sample['round']
            rnd_idx = round_order.index(rnd) if rnd in round_order else -1
            if rnd_idx >= 0 and rnd_idx < len(round_order) - 1:
                if team1 in active_teams and team2 not in active_teams:
                    winner = team1
                elif team2 in active_teams and team1 not in active_teams:
                    winner = team2

        game_map[gid] = {
            'game_id': gid, 'round': sample['round'], 'region': sample['region'],
            'team1': team1, 'seed1': seed1, 'team2': team2, 'seed2': seed2,
            'winner': winner, 'completed': bool(winner),
            'national_pct_team1': 0.0, 'espn_url': '',
        }

    # Backfill espn_url
    for g in games:
        if g.get('espn_url') and g['game_id'] in game_map:
            game_map[g['game_id']]['espn_url'] = g['espn_url']

    merged_games = list(game_map.values())

    # Compute elimination
    losers: set[str] = set()
    for g in merged_games:
        if g.get('completed') and g.get('winner'):
            if g.get('team1') and g['team1'] != g['winner']: losers.add(g['team1'])
            if g.get('team2') and g['team2'] != g['winner']: losers.add(g['team2'])
    for t in teams:
        if t['name'] in losers:
            t['eliminated'] = True

    games_completed = sum(1 for g in merged_games if g.get('completed'))
    current_round = _determine_current_round(games_completed)

    meta = {
        'last_updated': datetime.now(timezone.utc).isoformat(),
        'last_checked_at': int(datetime.now(timezone.utc).timestamp() * 1000),
        'current_round': current_round,
        'games_completed': games_completed,
    }

    # Export data.json using the same function as production (no sheets for snapshots)
    _export_data_json_shared(brackets, all_picks, merged_games, teams, [], meta)
    logger.info(f"Done (local). {games_completed}/63 games. Round: {current_round}")


if __name__ == '__main__':
    import sys
    if '--local' in sys.argv:
        run_local()
    else:
        run()
