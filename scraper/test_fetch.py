"""Tests for fetch module."""
import unittest
from unittest.mock import patch, MagicMock

import requests

from scraper.fetch import fetch_group_page, _fetch


class TestFetch(unittest.TestCase):

    @patch('scraper.fetch.requests.get')
    @patch('scraper.fetch.time.sleep')
    def test_fetch_group_page_returns_html(self, mock_sleep, mock_get):
        mock_resp = MagicMock(text='<html>test</html>', status_code=200)
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp
        result = fetch_group_page('test-id')
        self.assertEqual(result, '<html>test</html>')

    @patch('scraper.fetch.requests.get')
    @patch('scraper.fetch.time.sleep')
    def test_retries_on_failure_then_succeeds(self, mock_sleep, mock_get):
        mock_resp = MagicMock(text='<html>ok</html>', status_code=200)
        mock_resp.raise_for_status = MagicMock()
        mock_get.side_effect = [
            requests.RequestException("timeout"),
            mock_resp,
        ]
        result = fetch_group_page('test-id')
        self.assertEqual(result, '<html>ok</html>')
        self.assertEqual(mock_get.call_count, 2)

    @patch('scraper.fetch.requests.get')
    @patch('scraper.fetch.time.sleep')
    def test_raises_after_all_retries_exhausted(self, mock_sleep, mock_get):
        mock_get.side_effect = requests.RequestException("down")
        with self.assertRaises(requests.RequestException):
            _fetch('http://example.com', retries=1)
        self.assertEqual(mock_get.call_count, 2)  # initial + 1 retry


if __name__ == '__main__':
    unittest.main()
