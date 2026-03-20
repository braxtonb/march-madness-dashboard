"""Tests for sheets.py DataStore abstraction."""
import unittest
from unittest.mock import MagicMock, patch, PropertyMock

from scraper.sheets import DataStore, GoogleSheetsStore


class TestDataStoreInterface(unittest.TestCase):

    def test_cannot_instantiate_abstract(self):
        with self.assertRaises(TypeError):
            DataStore()

    def test_concrete_has_all_methods(self):
        methods = ['read_tab', 'write_tab', 'append_rows', 'update_meta']
        for method in methods:
            self.assertTrue(hasattr(GoogleSheetsStore, method))


class TestGoogleSheetsStoreWithMocks(unittest.TestCase):

    @patch('scraper.sheets.gspread.authorize')
    @patch('scraper.sheets.Credentials.from_service_account_info')
    def _make_store(self, mock_creds, mock_auth):
        mock_client = MagicMock()
        mock_auth.return_value = mock_client
        store = GoogleSheetsStore(
            spreadsheet_id='fake-id',
            credentials_json='{"type":"service_account","project_id":"test"}'
        )
        return store

    def test_write_tab_calls_clear_then_update(self):
        store = self._make_store()
        mock_ws = MagicMock()
        store.spreadsheet.worksheet.return_value = mock_ws

        store.write_tab('brackets', [{'id': '1', 'name': 'test'}], ['id', 'name'])

        mock_ws.clear.assert_called_once()
        mock_ws.update.assert_called_once()
        call_args = mock_ws.update.call_args
        self.assertEqual(call_args[0][0], 'A1')
        self.assertEqual(call_args[0][1], [['id', 'name'], ['1', 'test']])

    def test_write_tab_empty_rows_writes_headers_only(self):
        store = self._make_store()
        mock_ws = MagicMock()
        store.spreadsheet.worksheet.return_value = mock_ws

        store.write_tab('brackets', [], ['id', 'name'])

        mock_ws.clear.assert_called_once()
        mock_ws.update.assert_called_once_with('A1', [['id', 'name']])


if __name__ == '__main__':
    unittest.main()
