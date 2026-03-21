"""
Data store abstraction for bracket data.
Swap Google Sheets for another backend by implementing DataStore.
"""
import json
import os
from abc import ABC, abstractmethod

import gspread
from google.oauth2.service_account import Credentials


class DataStore(ABC):
    """Abstract interface for bracket data storage."""

    @abstractmethod
    def read_tab(self, tab_name: str) -> list[dict]:
        """Read all rows from a tab as list of dicts."""
        ...

    @abstractmethod
    def write_tab(self, tab_name: str, rows: list[dict], headers: list[str]) -> None:
        """Overwrite a tab with new data."""
        ...

    @abstractmethod
    def append_rows(self, tab_name: str, rows: list[dict], headers: list[str]) -> None:
        """Append rows to a tab (for snapshots)."""
        ...

    @abstractmethod
    def update_meta(self, data: dict) -> None:
        """Update the meta tab with a single row."""
        ...


class GoogleSheetsStore(DataStore):
    """Google Sheets implementation of DataStore."""

    TAB_NAMES = ['brackets', 'picks', 'games', 'teams', 'snapshots', 'meta']

    def __init__(self, spreadsheet_id: str | None = None, credentials_json: str | None = None):
        creds_json = credentials_json or os.environ.get('GOOGLE_CREDENTIALS', '')
        sheet_id = spreadsheet_id or os.environ.get('SPREADSHEET_ID', '')

        if not creds_json or not sheet_id:
            raise ValueError("GOOGLE_CREDENTIALS and SPREADSHEET_ID required")

        creds_data = json.loads(creds_json)
        scopes = [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive',
        ]
        credentials = Credentials.from_service_account_info(creds_data, scopes=scopes)
        client = gspread.authorize(credentials)
        self.spreadsheet = client.open_by_key(sheet_id)
        self._worksheet_cache: dict[str, gspread.Worksheet] = {}

    def _get_worksheet(self, tab_name: str) -> gspread.Worksheet:
        if tab_name not in self._worksheet_cache:
            try:
                ws = self.spreadsheet.worksheet(tab_name)
            except gspread.WorksheetNotFound:
                ws = self.spreadsheet.add_worksheet(title=tab_name, rows=100, cols=20)
            self._worksheet_cache[tab_name] = ws
        return self._worksheet_cache[tab_name]

    def read_tab(self, tab_name: str) -> list[dict]:
        ws = self._get_worksheet(tab_name)
        return ws.get_all_records()

    def write_tab(self, tab_name: str, rows: list[dict], headers: list[str]) -> None:
        ws = self._get_worksheet(tab_name)
        ws.clear()
        if not rows:
            ws.update('A1', [headers])
            return
        data = [headers] + [[row.get(h, '') for h in headers] for row in rows]
        ws.update('A1', data)

    def append_rows(self, tab_name: str, rows: list[dict], headers: list[str]) -> None:
        ws = self._get_worksheet(tab_name)
        existing = ws.get_all_values()
        if not existing:
            ws.update('A1', [headers])
            start_row = 2
        else:
            start_row = len(existing) + 1
        # Batch write all rows at once to avoid rate limits
        data = [[row.get(h, '') for h in headers] for row in rows]
        ws.update(f'A{start_row}', data)

    def update_meta(self, data: dict) -> None:
        headers = list(data.keys())
        self.write_tab('meta', [data], headers)
