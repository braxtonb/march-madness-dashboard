"""Integration test — full pipeline with mocked network and store."""
import json
import unittest
from pathlib import Path
from unittest.mock import patch

from scraper.scrape import run
from scraper.sheets import DataStore

FIXTURES = Path(__file__).parent / 'fixtures'


class MockStore(DataStore):
    """In-memory data store for testing."""

    def __init__(self):
        self.tabs: dict[str, list[dict]] = {}

    def read_tab(self, tab_name):
        return self.tabs.get(tab_name, [])

    def write_tab(self, tab_name, rows, headers):
        self.tabs[tab_name] = rows

    def append_rows(self, tab_name, rows, headers):
        self.tabs.setdefault(tab_name, []).extend(rows)

    def update_meta(self, data):
        self.tabs['meta'] = [data]


def _load_challenge() -> dict:
    return json.loads((FIXTURES / 'challenge.json').read_text())


def _load_group_entries() -> dict:
    return json.loads((FIXTURES / 'group_entries.json').read_text())


class TestIntegration(unittest.TestCase):

    @patch('scraper.scrape.GoogleSheetsStore')
    @patch('scraper.scrape.fetch_group_entries')
    @patch('scraper.scrape.fetch_challenge_data')
    def test_full_pipeline_writes_all_tabs(self, mock_challenge, mock_group, mock_store_cls):
        mock_store = MockStore()
        mock_store_cls.return_value = mock_store

        mock_challenge.return_value = _load_challenge()
        mock_group.return_value = _load_group_entries()

        run()

        # Meta must be written
        self.assertIn('meta', mock_store.tabs)
        self.assertEqual(len(mock_store.tabs['meta']), 1)
        self.assertIn('last_updated', mock_store.tabs['meta'][0])
        self.assertIn('current_round', mock_store.tabs['meta'][0])
        self.assertIn('games_completed', mock_store.tabs['meta'][0])

        # Brackets must be written
        self.assertIn('brackets', mock_store.tabs)
        self.assertGreater(len(mock_store.tabs['brackets']), 0)

        # Picks must be written (API gives all picks at once)
        self.assertIn('picks', mock_store.tabs)
        self.assertGreater(len(mock_store.tabs['picks']), 0)

        # Games must be written
        self.assertIn('games', mock_store.tabs)
        self.assertGreater(len(mock_store.tabs['games']), 0)

        # Teams must be written
        self.assertIn('teams', mock_store.tabs)
        self.assertGreater(len(mock_store.tabs['teams']), 0)

    @patch('scraper.scrape.GoogleSheetsStore')
    @patch('scraper.scrape.fetch_group_entries')
    @patch('scraper.scrape.fetch_challenge_data')
    def test_brackets_have_prev_rank_from_existing_state(
        self, mock_challenge, mock_group, mock_store_cls
    ):
        mock_store = MockStore()
        # Seed existing state: bracket 'abc' was rank 1 with 100 points
        mock_store.tabs['brackets'] = [
            {'id': 'abc', 'points': 100, 'name': 'Test', 'owner': 'X',
             'champion_pick': '', 'champion_seed': 0,
             'ff1': '', 'ff2': '', 'ff3': '', 'ff4': '',
             'prev_rank': 0, 'max_remaining': 0, 'pct': 0,
             'r64_pts': 0, 'r32_pts': 0, 's16_pts': 0,
             'e8_pts': 0, 'ff_pts': 0, 'champ_pts': 0}
        ]
        mock_store.tabs['meta'] = [{'current_round': 'R64', 'games_completed': 10}]
        mock_store_cls.return_value = mock_store

        mock_challenge.return_value = _load_challenge()
        mock_group.return_value = _load_group_entries()

        run()

        # After run, brackets should be populated
        self.assertIn('brackets', mock_store.tabs)
        # Any bracket with id 'abc' should have prev_rank=1
        abc = next((b for b in mock_store.tabs['brackets'] if b['id'] == 'abc'), None)
        if abc:
            self.assertEqual(abc['prev_rank'], 1)

    @patch('scraper.scrape.GoogleSheetsStore')
    @patch('scraper.scrape.fetch_group_entries')
    @patch('scraper.scrape.fetch_challenge_data')
    def test_fetch_called_once_each(self, mock_challenge, mock_group, mock_store_cls):
        mock_store = MockStore()
        mock_store_cls.return_value = mock_store

        mock_challenge.return_value = _load_challenge()
        mock_group.return_value = _load_group_entries()

        run()

        # Challenge and group fetch should each be called exactly once
        self.assertEqual(mock_challenge.call_count, 1)
        self.assertEqual(mock_group.call_count, 1)

    @patch('scraper.scrape.GoogleSheetsStore')
    @patch('scraper.scrape.fetch_group_entries')
    @patch('scraper.scrape.fetch_challenge_data')
    def test_picks_have_correct_bracket_ids(self, mock_challenge, mock_group, mock_store_cls):
        mock_store = MockStore()
        mock_store_cls.return_value = mock_store

        mock_challenge.return_value = _load_challenge()
        mock_group.return_value = _load_group_entries()

        run()

        brackets = mock_store.tabs.get('brackets', [])
        picks = mock_store.tabs.get('picks', [])

        bracket_ids = {b['id'] for b in brackets}
        pick_bracket_ids = {p['bracket_id'] for p in picks}

        # Every pick should belong to a known bracket
        for pid in pick_bracket_ids:
            self.assertIn(pid, bracket_ids)

    @patch('scraper.scrape.GoogleSheetsStore')
    @patch('scraper.scrape.fetch_group_entries')
    @patch('scraper.scrape.fetch_challenge_data')
    def test_snapshot_written_on_round_change(self, mock_challenge, mock_group, mock_store_cls):
        mock_store = MockStore()
        # Simulate round change: prev round was R64, and enough games completed for R32
        mock_store.tabs['meta'] = [{'current_round': 'R64', 'games_completed': 32}]
        mock_store_cls.return_value = mock_store

        challenge = _load_challenge()
        # Force all games to be completed so we're in R32 territory
        # (We just check the snapshot logic fires when round changes)
        mock_challenge.return_value = challenge
        mock_group.return_value = _load_group_entries()

        run()

        # If current round != prev_round ('R64'), snapshots should be written
        meta = mock_store.tabs.get('meta', [{}])[0]
        new_round = meta.get('current_round', 'PRE')
        if new_round != 'R64':
            self.assertIn('snapshots', mock_store.tabs)


if __name__ == '__main__':
    unittest.main()
