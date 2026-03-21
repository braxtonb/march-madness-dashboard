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
TEAMS_HEADERS = ['name', 'seed', 'region', 'conference', 'eliminated', 'eliminated_round']
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

    # Step 6: Write picks (always — API gives us all picks at once, no "first run" concept)
    store.write_tab('picks', all_picks, PICKS_HEADERS)
    logger.info(f"Wrote {len(all_picks)} picks")

    # Step 7: Merge games (keep existing, update from API, add new)
    if games:
        existing_games = store.read_tab('games')
        existing_map = {g.get('game_id', ''): g for g in existing_games}
        for g in games:
            existing_map[g['game_id']] = g  # update or add
        merged_games = list(existing_map.values())
        store.write_tab('games', merged_games, GAMES_HEADERS)
    else:
        existing_games = store.read_tab('games')
        merged_games = existing_games

    # Compute elimination: a team is eliminated if it lost a completed game
    losers = set()
    for g in merged_games:
        completed_val = g.get('completed')
        is_completed = completed_val is True or str(completed_val) == 'True'
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
        if g.get('completed') is True or str(g.get('completed')) == 'True'
    )
    current_round = _determine_current_round(games_completed)

    if current_round != prev_round and prev_round != 'PRE':
        logger.info(f"Round changed: {prev_round} -> {current_round}. Writing snapshots...")
        snapshot_rows = []
        for rank, b in enumerate(sorted(brackets, key=lambda x: -x.get('points', 0)), 1):
            snapshot_rows.append({
                'bracket_id': b['id'],
                'round': prev_round,
                'rank': rank,
                'points': b.get('points', 0),
                'max_remaining': b.get('max_remaining', 0),
                'win_prob': 0.0,
            })
        store.append_rows('snapshots', snapshot_rows, SNAPSHOTS_HEADERS)
        logger.info(f"Wrote {len(snapshot_rows)} snapshot rows for {prev_round}")

    # Step 10: Update meta
    store.update_meta({
        'last_updated': datetime.now(timezone.utc).isoformat(),
        'current_round': current_round,
        'games_completed': games_completed,
    })

    logger.info(f"Done. {games_completed}/63 games. Round: {current_round}")


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
