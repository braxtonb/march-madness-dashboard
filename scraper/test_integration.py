"""Integration test — full pipeline with mocked network and store."""
import unittest
from unittest.mock import patch
from pathlib import Path

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


class TestIntegration(unittest.TestCase):

    @patch('scraper.scrape.GoogleSheetsStore')
    @patch('scraper.scrape.fetch_group_page')
    @patch('scraper.scrape.fetch_bracket_page')
    def test_full_first_run_pipeline(self, mock_fetch_bracket, mock_fetch_group, mock_store_cls):
        mock_store = MockStore()
        mock_store_cls.return_value = mock_store

        mock_fetch_group.return_value = (FIXTURES / 'group_standings.html').read_text()
        mock_fetch_bracket.return_value = (FIXTURES / 'bracket_page.html').read_text()

        run()

        # Meta should be written
        self.assertIn('meta', mock_store.tabs)
        self.assertEqual(len(mock_store.tabs['meta']), 1)
        self.assertIn('last_updated', mock_store.tabs['meta'][0])

        # Brackets should be written
        self.assertIn('brackets', mock_store.tabs)
        self.assertGreater(len(mock_store.tabs['brackets']), 0)

        # Picks should be written on first run
        self.assertIn('picks', mock_store.tabs)
        self.assertGreater(len(mock_store.tabs['picks']), 0)

        # Games and teams should be written
        self.assertIn('games', mock_store.tabs)
        self.assertIn('teams', mock_store.tabs)

    @patch('scraper.scrape.GoogleSheetsStore')
    @patch('scraper.scrape.fetch_group_page')
    @patch('scraper.scrape.fetch_bracket_page')
    def test_subsequent_run_skips_full_scrape(self, mock_fetch_bracket, mock_fetch_group, mock_store_cls):
        mock_store = MockStore()
        mock_store.tabs['picks'] = [
            {'bracket_id': 'b1', 'game_id': 'game_0', 'round': 'R64',
             'region': 'R1', 'team_picked': 'Arizona', 'seed_picked': 1,
             'correct': False, 'vacated': False}
        ]
        mock_store.tabs['meta'] = [{'current_round': 'R64', 'games_completed': 0}]
        mock_store_cls.return_value = mock_store

        mock_fetch_group.return_value = (FIXTURES / 'group_standings.html').read_text()
        mock_fetch_bracket.return_value = (FIXTURES / 'bracket_page.html').read_text()

        run()

        self.assertIn('meta', mock_store.tabs)
        # fetch_bracket_page should be called only once (for results), not 75 times
        self.assertEqual(mock_fetch_bracket.call_count, 1)


if __name__ == '__main__':
    unittest.main()
