"""Main scraper orchestrator. Fetch ESPN data -> parse -> write to Sheets."""
import logging
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv()

from scraper.fetch import fetch_group_page, fetch_bracket_page
from scraper.espn import (
    parse_group_standings, parse_bracket_picks,
    parse_tournament_games, parse_teams,
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
    existing_ranks = {}
    sorted_existing = sorted(existing_brackets, key=lambda b: -int(b.get('points', 0)))
    for rank, b in enumerate(sorted_existing, 1):
        existing_ranks[b.get('id', '')] = rank

    existing_meta = store.read_tab('meta')
    prev_round = existing_meta[0].get('current_round', 'PRE') if existing_meta else 'PRE'

    # Step 2: Fetch + parse group standings
    logger.info("Fetching group standings...")
    group_html = fetch_group_page(group_id)
    brackets = parse_group_standings(group_html)
    logger.info(f"Parsed {len(brackets)} brackets")

    for b in brackets:
        b['prev_rank'] = existing_ranks.get(b['id'], 0)

    # Step 3: First run -> scrape all individual brackets
    existing_picks = store.read_tab('picks')
    need_full_scrape = len(existing_picks) == 0

    if need_full_scrape:
        logger.info("First run — scraping all individual brackets...")
        all_picks = []
        for i, bracket in enumerate(brackets):
            logger.info(f"  Bracket {i + 1}/{len(brackets)}: {bracket['name']}")
            try:
                bracket_html = fetch_bracket_page(bracket['id'])
                picks = parse_bracket_picks(bracket_html, bracket['id'])
                all_picks.extend(picks)
            except Exception as e:
                logger.error(f"  Failed: {bracket['id']}: {e}")
                continue
        store.write_tab('picks', all_picks, PICKS_HEADERS)
        logger.info(f"Wrote {len(all_picks)} picks")

    # Step 4: Parse tournament results
    games: list[dict] = []
    teams: list[dict] = []

    if brackets:
        logger.info("Parsing tournament results...")
        try:
            sample_html = fetch_bracket_page(brackets[0]['id'])
            games = parse_tournament_games(sample_html)
            teams = parse_teams(sample_html)
        except Exception as e:
            logger.error(f"Failed to fetch sample bracket for results: {e}")

        # Update pick correctness with proper vacated logic
        if games and not need_full_scrape:
            winners = {g['game_id']: g['winner'] for g in games if g['completed']}
            game_participants = {
                g['game_id']: {g['team1'], g['team2']}
                for g in games if g['completed']
            }

            picks_data = store.read_tab('picks')
            for pick in picks_data:
                gid = pick['game_id']
                if gid in winners:
                    team = pick['team_picked']
                    participants = game_participants.get(gid, set())
                    pick['vacated'] = team not in participants
                    pick['correct'] = (not pick['vacated']) and (team == winners[gid])
            store.write_tab('picks', picks_data, PICKS_HEADERS)

        if games:
            store.write_tab('games', games, GAMES_HEADERS)
        if teams:
            store.write_tab('teams', teams, TEAMS_HEADERS)

    # Step 5: Write brackets
    store.write_tab('brackets', brackets, BRACKETS_HEADERS)

    # Step 6: Detect round change -> write snapshots
    games_completed = sum(1 for g in games if g['completed'])
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

    # Step 7: Update meta
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
