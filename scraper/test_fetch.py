"""Tests for fetch module (ESPN JSON API)."""
import unittest
from unittest.mock import patch, MagicMock

import requests

from scraper.fetch import fetch_challenge_data, fetch_group_entries, _fetch_json


class TestFetchChallengeData(unittest.TestCase):

    @patch('scraper.fetch.requests.get')
    @patch('scraper.fetch.time.sleep')
    def test_returns_parsed_json(self, mock_sleep, mock_get):
        mock_resp = MagicMock(status_code=200)
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = {'propositions': [], 'currentScoringPeriod': {}}
        mock_get.return_value = mock_resp

        result = fetch_challenge_data()
        self.assertIn('propositions', result)
        self.assertIn('currentScoringPeriod', result)

    @patch('scraper.fetch.requests.get')
    @patch('scraper.fetch.time.sleep')
    def test_calls_correct_url(self, mock_sleep, mock_get):
        mock_resp = MagicMock(status_code=200)
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = {}
        mock_get.return_value = mock_resp

        fetch_challenge_data()
        called_url = mock_get.call_args[0][0]
        self.assertIn('tournament-challenge-bracket-2026', called_url)
        self.assertNotIn('/groups/', called_url)


class TestFetchGroupEntries(unittest.TestCase):

    @patch('scraper.fetch.requests.get')
    @patch('scraper.fetch.time.sleep')
    def test_fewer_than_50_fetches_twice_for_dedup(self, mock_sleep, mock_get):
        """With <50 entries, page 1 returns all, page 2 returns dupes → stops."""
        mock_resp = MagicMock(status_code=200)
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = {
            'entries': [{'id': str(i)} for i in range(10)],
            'size': 10,
        }
        mock_get.return_value = mock_resp

        result = fetch_group_entries('test-group-id')
        self.assertEqual(len(result['entries']), 10)
        # Page 1 + dedup check page = 2 calls
        self.assertEqual(mock_get.call_count, 2)

    @patch('scraper.fetch.requests.get')
    @patch('scraper.fetch.time.sleep')
    def test_deduplicates_across_pages(self, mock_sleep, mock_get):
        """With 75 unique entries across 2 pages, dedup merges them."""
        page1_resp = MagicMock(status_code=200)
        page1_resp.raise_for_status = MagicMock()
        page1_resp.json.return_value = {
            'entries': [{'id': str(i)} for i in range(50)],
            'size': 75,
        }
        page2_resp = MagicMock(status_code=200)
        page2_resp.raise_for_status = MagicMock()
        page2_resp.json.return_value = {
            'entries': [{'id': str(i)} for i in range(50, 75)],
            'size': 75,
        }
        # Page 3 returns all dupes → stops
        page3_resp = MagicMock(status_code=200)
        page3_resp.raise_for_status = MagicMock()
        page3_resp.json.return_value = {
            'entries': [{'id': str(i)} for i in range(25)],
            'size': 75,
        }
        mock_get.side_effect = [page1_resp, page2_resp, page3_resp]

        result = fetch_group_entries('test-group-id')
        self.assertEqual(len(result['entries']), 75)

    @patch('scraper.fetch.requests.get')
    @patch('scraper.fetch.time.sleep')
    def test_includes_group_id_in_url(self, mock_sleep, mock_get):
        mock_resp = MagicMock(status_code=200)
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = {'entries': [], 'size': 0}
        mock_get.return_value = mock_resp

        fetch_group_entries('my-group')
        called_url = mock_get.call_args_list[0][0][0]
        self.assertIn('my-group', called_url)
        self.assertIn('offset=0', called_url)

    @patch('scraper.fetch.requests.get')
    @patch('scraper.fetch.time.sleep')
    def test_preserves_top_level_fields(self, mock_sleep, mock_get):
        mock_resp = MagicMock(status_code=200)
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = {
            'entries': [{'id': 'a'}],
            'size': 1,
            'extra_field': 'preserved',
        }
        mock_get.return_value = mock_resp

        result = fetch_group_entries('grp')
        self.assertEqual(result.get('extra_field'), 'preserved')


class TestFetchJson(unittest.TestCase):

    @patch('scraper.fetch.requests.get')
    @patch('scraper.fetch.time.sleep')
    def test_retries_on_failure_then_succeeds(self, mock_sleep, mock_get):
        ok_resp = MagicMock(status_code=200)
        ok_resp.raise_for_status = MagicMock()
        ok_resp.json.return_value = {'ok': True}

        mock_get.side_effect = [requests.RequestException("timeout"), ok_resp]

        result = _fetch_json('http://example.com')
        self.assertEqual(result, {'ok': True})
        self.assertEqual(mock_get.call_count, 2)

    @patch('scraper.fetch.requests.get')
    @patch('scraper.fetch.time.sleep')
    def test_raises_after_all_retries_exhausted(self, mock_sleep, mock_get):
        mock_get.side_effect = requests.RequestException("down")
        with self.assertRaises(requests.RequestException):
            _fetch_json('http://example.com', retries=1)
        self.assertEqual(mock_get.call_count, 2)


if __name__ == '__main__':
    unittest.main()
