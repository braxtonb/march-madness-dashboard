"""Main scraper orchestrator. Fetch ESPN JSON API data -> parse -> write to Sheets."""
import logging
import os
from datetime import datetime, timezone

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
    'id', 'name', 'owner', 'champion_pick', 'champion_seed',
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
    'winner', 'completed', 'national_pct_team1',
]
TEAMS_HEADERS = ['name', 'seed', 'region', 'conference', 'eliminated', 'eliminated_round', 'logo']
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
        'current_round': current_round,
        'games_completed': games_completed,
    }
    store.update_meta(meta)

    # Step 11: Export static JSON for the frontend (no Sheets API calls needed)
    _export_data_json(brackets, all_picks, merged_games, teams, store, meta)

    logger.info(f"Done. {games_completed}/63 games. Round: {current_round}")


def _export_data_json(brackets, picks, games, teams, store, meta):
    """Export all dashboard data as a single JSON file for the frontend.

    The frontend reads this instead of hitting the Sheets API, avoiding
    rate limits entirely.
    """
    import json
    from pathlib import Path

    # Read snapshots from sheet (already written earlier)
    try:
        snapshots = store.read_tab('snapshots')
    except Exception:
        snapshots = []

    # Normalize types for JSON serialization
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

    data = {
        'brackets': _normalize(brackets),
        'picks': _normalize(picks, bool_fields=['correct', 'vacated']),
        'games': _normalize(games, bool_fields=['completed']),
        'teams': _normalize(teams, bool_fields=['eliminated']),
        'snapshots': _normalize(snapshots),
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


if __name__ == '__main__':
    run()
