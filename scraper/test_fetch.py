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

    @patch('scraper.fetch.requests.get')
    @patch('scraper.fetch.time.sleep')
    def test_calls_challenge_slug_url(self, mock_sleep, mock_get):
        mock_resp = MagicMock(status_code=200)
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = {}
        mock_get.return_value = mock_resp

        fetch_challenge_data()
        called_url = mock_get.call_args[0][0]
        self.assertIn('tournament-challenge-bracket-2026', called_url)


class TestFetchGroupEntries(unittest.TestCase):
    """Tests for the multi-endpoint merge strategy."""

    @patch('scraper.fetch._fetch_json')
    def test_merges_chui_and_slug_entries(self, mock_fetch):
        # chui returns 3 entries without picks, slug returns 2 with picks
        chui_entries = [
            {'id': 'a', 'name': 'A', 'score': {'overallScore': 100}},
            {'id': 'b', 'name': 'B', 'score': {'overallScore': 90}},
            {'id': 'c', 'name': 'C', 'score': {'overallScore': 80}},
        ]
        slug_entries = [
            {'id': 'a', 'name': 'A', 'picks': [{'p': 1}], 'score': {'overallScore': 95}},
            {'id': 'b', 'name': 'B', 'picks': [{'p': 2}], 'score': {'overallScore': 85}},
        ]
        # entry 'c' fetched individually
        individual_entry = {'id': 'c', 'name': 'C', 'picks': [{'p': 3}]}

        mock_fetch.side_effect = [
            {'entries': chui_entries},  # chui call
            {'entries': slug_entries, 'entryStats': {'data': True}},  # slug call
            individual_entry,  # individual fetch for 'c'
        ]

        result = fetch_group_entries('test-group')
        self.assertEqual(len(result['entries']), 3)
        # All should have picks
        self.assertTrue(all(e.get('picks') for e in result['entries']))
        # entryStats preserved from slug
        self.assertEqual(result.get('entryStats'), {'data': True})

    @patch('scraper.fetch._fetch_json')
    def test_handles_all_entries_in_slug(self, mock_fetch):
        """When slug returns all entries, no individual fetches needed."""
        entries = [{'id': str(i), 'picks': [{'p': i}]} for i in range(10)]
        mock_fetch.side_effect = [
            {'entries': [{'id': str(i)} for i in range(10)]},  # chui
            {'entries': entries, 'entryStats': {}},  # slug has all 10
        ]

        result = fetch_group_entries('grp')
        self.assertEqual(len(result['entries']), 10)
        # Only 2 calls (chui + slug), no individual fetches
        self.assertEqual(mock_fetch.call_count, 2)


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
