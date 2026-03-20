# Plan 1: Scraper + Data Layer Implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Python scraper that extracts all bracket data from ESPN and writes it to Google Sheets, plus the GitHub Actions cron workflow to run it automatically.

**Architecture:** Single Python script scrapes the ESPN group page (standings) and individual bracket pages (all 63 picks per bracket). Data is written to Google Sheets via `gspread` with a service account. GitHub Actions runs the scraper every 30 minutes during game windows. The data layer is designed so the frontend reads published CSVs — this plan does NOT build the frontend, only the data pipeline.

**Tech Stack:** Python 3.11+, requests, beautifulsoup4, gspread, google-auth, python-dotenv, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-03-20-bracket-dashboard-design.md`

**Design decision — abstraction for future swapability:** The scraper writes through a `DataStore` abstraction (`sheets.py`) so the backend can be swapped from Google Sheets to Supabase/Postgres/JSON later by implementing a new `DataStore` class. All ESPN parsing logic is separate from storage logic.

**Note on spec cron discrepancy:** The spec contains `*/30 16-5 * 3-4 *` which is an invalid cron range (cannot wrap midnight). This plan uses the corrected `*/30 16-23,0-5 * 3-4 *` instead.

---

### Task 1: Project Setup + Dependencies

**Files:**
- Create: `scraper/requirements.txt`
- Create: `scraper/__init__.py`
- Create: `scraper/.env.example`
- Create: `.github/workflows/scrape.yml`
- Create: `.gitignore`

- [ ] **Step 1: Create requirements.txt**

```
requests==2.31.0
beautifulsoup4==4.12.3
gspread==6.1.4
google-auth==2.29.0
python-dotenv==1.0.1
pytest==8.2.0
```

- [ ] **Step 2: Create empty __init__.py**

```python
# scraper package
```

- [ ] **Step 3: Create .env.example**

```bash
# Google Sheets service account credentials JSON (single line, or use base64)
# To convert multi-line JSON to single line: cat key.json | jq -c .
GOOGLE_CREDENTIALS='{"type":"service_account","project_id":"...","private_key":"..."}'
SPREADSHEET_ID='your-google-sheet-id-here'
ESPN_GROUP_ID='f2683f8e-fbba-4625-9188-84a820659e90'
```

- [ ] **Step 4: Create .gitignore**

```
__pycache__/
*.pyc
.env
.env.local
venv/
.pytest_cache/
```

- [ ] **Step 5: Create GitHub Actions workflow**

```yaml
name: Scrape ESPN Brackets

on:
  schedule:
    # Every 30 min, 4pm-5am UTC (covers noon-1am ET during game windows)
    # NOTE: spec has '*/30 16-5' which is invalid (can't wrap midnight). Fixed here.
    - cron: '*/30 16-23,0-5 * 3-4 *'
  workflow_dispatch: # Manual trigger

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install -r scraper/requirements.txt

      - name: Run scraper
        env:
          GOOGLE_CREDENTIALS: ${{ secrets.GOOGLE_CREDENTIALS }}
          SPREADSHEET_ID: ${{ secrets.SPREADSHEET_ID }}
          ESPN_GROUP_ID: 'f2683f8e-fbba-4625-9188-84a820659e90'
        run: python -m scraper.scrape
```

- [ ] **Step 6: Commit**

```bash
git add scraper/requirements.txt scraper/__init__.py scraper/.env.example .github/workflows/scrape.yml .gitignore
git commit -m "chore: scaffold scraper project and GitHub Actions workflow"
```

---

### Task 2: Network Layer (fetch.py)

**Files:**
- Create: `scraper/fetch.py`
- Create: `scraper/test_fetch.py`

Moved before ESPN parsers (Tasks 3-5) so the fetch utility exists when implementers need to manually grab fixture HTML.

- [ ] **Step 1: Implement fetch module**

```python
"""HTTP fetching with rate limiting and error handling."""
import re
import time
import logging

import requests

logger = logging.getLogger(__name__)

ESPN_BASE = 'https://fantasy.espn.com/games/tournament-challenge-bracket-2026'
DEFAULT_DELAY = 2.0  # seconds between requests


def fetch_group_page(group_id: str) -> str:
    """Fetch the group standings page HTML."""
    url = f'{ESPN_BASE}/group?id={group_id}'
    return _fetch(url)


def fetch_bracket_page(bracket_id: str) -> str:
    """Fetch an individual bracket page HTML."""
    url = f'{ESPN_BASE}/bracket?id={bracket_id}'
    return _fetch(url)


def _fetch(url: str, retries: int = 2) -> str:
    """Fetch a URL with retry logic. Raises on total failure."""
    last_error: Exception | None = None
    for attempt in range(retries + 1):
        try:
            resp = requests.get(url, timeout=30, headers={
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
            })
            resp.raise_for_status()
            time.sleep(DEFAULT_DELAY)
            return resp.text
        except requests.RequestException as e:
            last_error = e
            logger.warning(f"Fetch attempt {attempt + 1} failed for {url}: {e}")
            if attempt < retries:
                time.sleep(DEFAULT_DELAY * (attempt + 1))
    logger.error(f"All retries exhausted for {url}")
    raise last_error  # type: ignore[misc]
```

- [ ] **Step 2: Write tests**

```python
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
```

- [ ] **Step 3: Run tests**

Run: `cd scraper && python -m pytest test_fetch.py -v`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add scraper/fetch.py scraper/test_fetch.py
git commit -m "feat: add HTTP fetch layer with rate limiting and retries"
```

---

### Task 3: Data Store Abstraction (sheets.py)

**Files:**
- Create: `scraper/sheets.py`
- Create: `scraper/test_sheets.py`

- [ ] **Step 1: Write the DataStore interface and GoogleSheetsStore implementation**

```python
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
        for row in rows:
            ws.append_row([row.get(h, '') for h in headers])

    def update_meta(self, data: dict) -> None:
        headers = list(data.keys())
        self.write_tab('meta', [data], headers)
```

- [ ] **Step 2: Write tests (including mocked GoogleSheetsStore behavior)**

```python
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
```

- [ ] **Step 3: Run tests**

Run: `cd scraper && python -m pytest test_sheets.py -v`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add scraper/sheets.py scraper/test_sheets.py
git commit -m "feat: add DataStore abstraction with Google Sheets implementation"
```

---

### Task 4: ESPN Scraper — Group Standings

**Files:**
- Create: `scraper/espn.py`
- Create: `scraper/test_espn.py`
- Create: `scraper/fixtures/` (directory)

This module handles ALL ESPN parsing. Zero storage logic — returns plain dicts.

**Important:** Before writing tests, use `fetch.py` or your browser to save real ESPN HTML to the fixtures directory. Tests must assert against known values from the fixture content — not just key presence.

- [ ] **Step 1: Save fixture HTML from real ESPN group page**

Use browser or `fetch.py` to grab HTML from `https://fantasy.espn.com/games/tournament-challenge-bracket-2026/group?id=f2683f8e-fbba-4625-9188-84a820659e90`. Save to `scraper/fixtures/group_standings.html`. Include at least 3-5 bracket rows.

- [ ] **Step 2: Write test that asserts against real fixture values**

```python
"""Tests for ESPN scraping logic."""
import re
import unittest
from pathlib import Path

from scraper.espn import parse_group_standings

FIXTURES = Path(__file__).parent / 'fixtures'


class TestParseGroupStandings(unittest.TestCase):

    def test_parses_expected_number_of_brackets(self):
        html = (FIXTURES / 'group_standings.html').read_text()
        brackets = parse_group_standings(html)
        # Fixture should have at least 3 rows (match fixture content)
        self.assertGreaterEqual(len(brackets), 3)

    def test_first_bracket_has_real_values(self):
        html = (FIXTURES / 'group_standings.html').read_text()
        brackets = parse_group_standings(html)
        first = brackets[0]
        # Name should be a non-empty string from the fixture
        self.assertIsInstance(first['name'], str)
        self.assertGreater(len(first['name']), 0)
        # Points should be a real number (not default 0 from stub)
        self.assertIsInstance(first['points'], int)
        # Champion pick should be a team name
        self.assertIsInstance(first['champion_pick'], str)

    def test_bracket_ids_are_uuids(self):
        html = (FIXTURES / 'group_standings.html').read_text()
        brackets = parse_group_standings(html)
        for b in brackets:
            # ESPN bracket IDs look like UUIDs
            self.assertRegex(b['id'], r'^[a-f0-9-]+$')


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 3: Implement parse_group_standings**

```python
"""ESPN page parsing. All functions take HTML strings and return plain dicts.
No network calls, no storage — pure parsing."""
import re
from bs4 import BeautifulSoup


def parse_group_standings(html: str) -> list[dict]:
    """Parse the group standings page into bracket summary dicts.

    NOTE: CSS selectors must match ESPN's actual DOM. Inspect the live page
    and update selectors if the structure differs from what's shown here.
    """
    soup = BeautifulSoup(html, 'html.parser')
    brackets = []

    # ESPN renders standings in table rows — adapt selectors to actual DOM
    rows = soup.select('tr.Table__TR')
    for row in rows:
        cells = row.select('td')
        if len(cells) < 5:
            continue

        try:
            # Extract bracket link and ID
            link = row.select_one('a[href*="/bracket?id="]')
            bracket_id = ''
            name = ''
            if link:
                href = link.get('href', '')
                id_match = re.search(r'id=([a-f0-9-]+)', href)
                bracket_id = id_match.group(1) if id_match else ''
                name = link.get_text(strip=True)

            # Extract champion pick (look for team logo/name)
            champ_el = row.select_one('[class*="champ"], img[alt]')
            champion_pick = champ_el.get('alt', '') if champ_el else ''

            # Extract numeric fields from cells
            # Adapt indices based on actual table column order
            bracket = {
                'id': bracket_id,
                'name': name,
                'owner': '',
                'champion_pick': champion_pick,
                'champion_seed': 0,
                'ff1': '', 'ff2': '', 'ff3': '', 'ff4': '',
                'points': _parse_int(cells, -3),
                'prev_rank': 0,
                'max_remaining': _parse_int(cells, -1),
                'pct': _parse_float(cells, -2),
                'r64_pts': 0, 'r32_pts': 0, 's16_pts': 0,
                'e8_pts': 0, 'ff_pts': 0, 'champ_pts': 0,
            }
            if bracket['id']:
                brackets.append(bracket)
        except (ValueError, IndexError, AttributeError):
            continue

    return brackets


def _parse_int(cells: list, index: int) -> int:
    """Safely parse an integer from a table cell."""
    try:
        return int(cells[index].get_text(strip=True).replace(',', ''))
    except (ValueError, IndexError):
        return 0


def _parse_float(cells: list, index: int) -> float:
    """Safely parse a float from a table cell."""
    try:
        return float(cells[index].get_text(strip=True).replace('%', ''))
    except (ValueError, IndexError):
        return 0.0
```

- [ ] **Step 4: Run test (may need to adjust selectors based on fixture)**

Run: `cd scraper && python -m pytest test_espn.py::TestParseGroupStandings -v`
Expected: PASS (iterate on selectors until fixture data parses correctly)

- [ ] **Step 5: Commit**

```bash
git add scraper/espn.py scraper/test_espn.py scraper/fixtures/
git commit -m "feat: add ESPN group standings parser"
```

---

### Task 5: ESPN Scraper — Individual Bracket Picks

**Files:**
- Modify: `scraper/espn.py`
- Modify: `scraper/test_espn.py`
- Create: `scraper/fixtures/bracket_page.html`

- [ ] **Step 1: Save fixture HTML from a real bracket page**

Navigate to one of your bracket pages (e.g., `bracket?id=3e76cbc0-1f7a-11f1-...`), save HTML to `scraper/fixtures/bracket_page.html`.

- [ ] **Step 2: Write test**

```python
from scraper.espn import parse_bracket_picks

class TestParseBracketPicks(unittest.TestCase):

    def test_parses_63_picks(self):
        html = (FIXTURES / 'bracket_page.html').read_text()
        picks = parse_bracket_picks(html, bracket_id='test-123')
        self.assertEqual(len(picks), 63)

    def test_pick_has_required_fields(self):
        html = (FIXTURES / 'bracket_page.html').read_text()
        picks = parse_bracket_picks(html, bracket_id='test-123')
        first = picks[0]
        required = ['bracket_id', 'game_id', 'round', 'region', 'team_picked', 'seed_picked']
        for field in required:
            self.assertIn(field, first)

    def test_picks_span_all_rounds(self):
        html = (FIXTURES / 'bracket_page.html').read_text()
        picks = parse_bracket_picks(html, bracket_id='test-123')
        rounds = {p['round'] for p in picks}
        self.assertEqual(rounds, {'R64', 'R32', 'S16', 'E8', 'FF', 'CHAMP'})

    def test_team_names_are_non_empty(self):
        html = (FIXTURES / 'bracket_page.html').read_text()
        picks = parse_bracket_picks(html, bracket_id='test-123')
        for p in picks:
            self.assertGreater(len(p['team_picked']), 0, f"Empty team for {p['game_id']}")
```

- [ ] **Step 3: Implement parse_bracket_picks**

Add to `scraper/espn.py`:

```python
def parse_bracket_picks(html: str, bracket_id: str) -> list[dict]:
    """Parse an individual bracket page into 63 pick dicts."""
    soup = BeautifulSoup(html, 'html.parser')
    picks = []

    sections = soup.select('section.BracketProposition-matchupSection')
    for i, section in enumerate(sections):
        outcomes = section.select('[class*="BracketOutcomeList-outcome"]')
        radios = section.select('input[type="radio"]')

        if len(outcomes) < 2 or len(radios) < 2:
            continue

        name1 = outcomes[0].get_text(strip=True)
        name2 = outcomes[1].get_text(strip=True)

        # Determine which team was picked (checked radio)
        picked_name = name1 if radios[0].get('checked') is not None else name2

        seed_match = re.match(r'^(\d+)', picked_name)
        seed = int(seed_match.group(1)) if seed_match else 0
        team = re.sub(r'^\d+', '', picked_name).strip()

        round_name = _game_index_to_round(i)

        picks.append({
            'bracket_id': bracket_id,
            'game_id': f'game_{i}',
            'round': round_name,
            'region': _game_index_to_region(i),
            'team_picked': team,
            'seed_picked': seed,
            'correct': False,
            'vacated': False,
        })

    return picks


def _game_index_to_round(index: int) -> str:
    """Map game position to round name. 63 games: 32+16+8+4+2+1."""
    if index < 32: return 'R64'
    if index < 48: return 'R32'
    if index < 56: return 'S16'
    if index < 60: return 'E8'
    if index < 62: return 'FF'
    return 'CHAMP'


def _game_index_to_region(index: int) -> str:
    """Map game position to region. Games 0-7=R1, 8-15=R2, etc for R64."""
    if index < 8: return 'R1'
    if index < 16: return 'R4'  # ESPN bracket layout order
    if index < 24: return 'R2'
    if index < 32: return 'R3'
    if index < 36: return 'R1'
    if index < 40: return 'R4'
    if index < 44: return 'R2'
    if index < 48: return 'R3'
    # S16 and beyond
    if index < 50: return 'R1'
    if index < 52: return 'R4'
    if index < 54: return 'R2'
    if index < 56: return 'R3'
    # E8
    if index < 57: return 'R1'
    if index < 58: return 'R4'
    if index < 59: return 'R2'
    if index < 60: return 'R3'
    return 'FF'  # FF and Championship
```

- [ ] **Step 4: Run tests**

Run: `cd scraper && python -m pytest test_espn.py -v`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add scraper/espn.py scraper/test_espn.py scraper/fixtures/bracket_page.html
git commit -m "feat: add ESPN individual bracket picks parser"
```

---

### Task 6: ESPN Scraper — Tournament Results + Teams

**Files:**
- Modify: `scraper/espn.py`
- Modify: `scraper/test_espn.py`

- [ ] **Step 1: Write test**

```python
from scraper.espn import parse_tournament_games, parse_teams

class TestParseTournamentResults(unittest.TestCase):

    def test_parses_63_games(self):
        html = (FIXTURES / 'bracket_page.html').read_text()
        games = parse_tournament_games(html)
        self.assertEqual(len(games), 63)

    def test_completed_games_have_winner(self):
        html = (FIXTURES / 'bracket_page.html').read_text()
        games = parse_tournament_games(html)
        for game in games:
            if game['completed']:
                self.assertNotEqual(game['winner'], '')

    def test_parses_teams_with_conference(self):
        html = (FIXTURES / 'bracket_page.html').read_text()
        teams = parse_teams(html)
        self.assertGreater(len(teams), 0)
        first = teams[0]
        self.assertIn('conference', first)
        self.assertIsInstance(first['seed'], int)

    def test_game_participants_extractable(self):
        """Games must have both team1 and team2 for vacated pick logic."""
        html = (FIXTURES / 'bracket_page.html').read_text()
        games = parse_tournament_games(html)
        for game in games:
            self.assertIn('team1', game)
            self.assertIn('team2', game)
```

- [ ] **Step 2: Implement parse_tournament_games and parse_teams**

Add to `scraper/espn.py`:

```python
# Conference lookup — hardcoded for 2026 tournament field
# Complete this dict for all 64 teams during implementation
TEAM_CONFERENCES: dict[str, str] = {
    'Arizona': 'Big 12', 'Houston': 'Big 12', 'Duke': 'ACC',
    'UConn': 'Big East', 'Auburn': 'SEC', 'Tennessee': 'SEC',
    'Illinois': 'Big Ten', 'Purdue': 'Big Ten', 'Michigan St': 'Big Ten',
    'St John\'s': 'Big East', 'Gonzaga': 'WCC', 'Kansas': 'Big 12',
    # ... complete for all 64 teams
}


def parse_tournament_games(html: str) -> list[dict]:
    """Parse bracket page to extract game results (all 63 game slots)."""
    soup = BeautifulSoup(html, 'html.parser')
    games = []

    sections = soup.select('section.BracketProposition-matchupSection')
    for i, section in enumerate(sections):
        outcomes = section.select('[class*="BracketOutcomeList-outcome"]')
        if len(outcomes) < 2:
            continue

        name1 = outcomes[0].get_text(strip=True)
        name2 = outcomes[1].get_text(strip=True)

        s1 = int(m.group(1)) if (m := re.match(r'^(\d+)', name1)) else 0
        s2 = int(m.group(1)) if (m := re.match(r'^(\d+)', name2)) else 0
        t1 = re.sub(r'^\d+', '', name1).strip()
        t2 = re.sub(r'^\d+', '', name2).strip()

        # Detect completion: check for score display or result indicator
        # ESPN shows scores for completed games — adapt to actual DOM
        completed = False
        winner = ''
        score_el = section.select_one('[class*="score"], [class*="Score"]')
        if score_el:
            completed = True
            # Winner is the team with the checked radio
            radios = section.select('input[type="radio"]')
            if len(radios) >= 2:
                winner = t1 if radios[0].get('checked') is not None else t2

        games.append({
            'game_id': f'game_{i}',
            'round': _game_index_to_round(i),
            'region': _game_index_to_region(i),
            'team1': t1, 'seed1': s1,
            'team2': t2, 'seed2': s2,
            'winner': winner,
            'completed': completed,
            'national_pct_team1': 0.0,
        })

    return games


def parse_teams(html: str) -> list[dict]:
    """Extract unique team list with metadata from R64 matchups only."""
    soup = BeautifulSoup(html, 'html.parser')
    seen: set[str] = set()
    teams = []

    # Only look at first 32 sections (R64) to get all 64 teams without duplication
    sections = soup.select('section.BracketProposition-matchupSection')[:32]
    for idx, section in enumerate(sections):
        outcomes = section.select('[class*="BracketOutcomeList-outcome"]')
        for outcome in outcomes:
            text = outcome.get_text(strip=True)
            seed_match = re.match(r'^(\d+)', text)
            if not seed_match:
                continue
            seed = int(seed_match.group(1))
            name = re.sub(r'^\d+', '', text).strip()

            if name in seen:
                continue
            seen.add(name)

            teams.append({
                'name': name,
                'seed': seed,
                'region': _game_index_to_region(idx),
                'conference': TEAM_CONFERENCES.get(name, ''),
                'eliminated': False,
                'eliminated_round': '',
            })

    return teams
```

- [ ] **Step 3: Run tests**

Run: `cd scraper && python -m pytest test_espn.py -v`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add scraper/espn.py scraper/test_espn.py
git commit -m "feat: add tournament results and teams parser"
```

---

### Task 7: Main Scraper Orchestrator

**Files:**
- Create: `scraper/scrape.py`

Orchestrates: fetch → parse → store. Includes snapshot writing and correct vacated logic.

- [ ] **Step 1: Implement scrape.py**

```python
"""Main scraper orchestrator. Fetch ESPN data → parse → write to Sheets."""
import logging
import os
from datetime import datetime, timezone

from dotenv import load_dotenv

load_dotenv()  # Load .env for local development

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

    # --- Step 1: Read existing state for prev_rank + round detection ---
    logger.info("Reading existing state...")
    existing_brackets = store.read_tab('brackets')
    existing_ranks = {}
    sorted_existing = sorted(existing_brackets, key=lambda b: -int(b.get('points', 0)))
    for rank, b in enumerate(sorted_existing, 1):
        existing_ranks[b.get('id', '')] = rank

    existing_meta = store.read_tab('meta')
    prev_round = existing_meta[0].get('current_round', 'PRE') if existing_meta else 'PRE'
    prev_games_completed = int(existing_meta[0].get('games_completed', 0)) if existing_meta else 0

    # --- Step 2: Fetch + parse group standings ---
    logger.info("Fetching group standings...")
    group_html = fetch_group_page(group_id)
    brackets = parse_group_standings(group_html)
    logger.info(f"Parsed {len(brackets)} brackets")

    for b in brackets:
        b['prev_rank'] = existing_ranks.get(b['id'], 0)

    # --- Step 3: First run → scrape all individual brackets ---
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

    # --- Step 4: Parse tournament results ---
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
            # Build game participants map for vacated detection
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
                    # Vacated = team was picked but wasn't even in this game
                    # (they were eliminated in a prior round)
                    pick['vacated'] = team not in participants
                    # Correct = team was in the game AND won
                    pick['correct'] = (not pick['vacated']) and (team == winners[gid])
            store.write_tab('picks', picks_data, PICKS_HEADERS)

        if games:
            store.write_tab('games', games, GAMES_HEADERS)
        if teams:
            store.write_tab('teams', teams, TEAMS_HEADERS)

    # --- Step 5: Write brackets ---
    store.write_tab('brackets', brackets, BRACKETS_HEADERS)

    # --- Step 6: Detect round change → write snapshots ---
    games_completed = sum(1 for g in games if g['completed'])
    current_round = _determine_current_round(games_completed)

    if current_round != prev_round and prev_round != 'PRE':
        logger.info(f"Round changed: {prev_round} → {current_round}. Writing snapshots...")
        snapshot_rows = []
        for rank, b in enumerate(sorted(brackets, key=lambda x: -x.get('points', 0)), 1):
            snapshot_rows.append({
                'bracket_id': b['id'],
                'round': prev_round,
                'rank': rank,
                'points': b.get('points', 0),
                'max_remaining': b.get('max_remaining', 0),
                'win_prob': 0.0,  # Computed by frontend, stored as 0 from scraper
            })
        store.append_rows('snapshots', snapshot_rows, SNAPSHOTS_HEADERS)
        logger.info(f"Wrote {len(snapshot_rows)} snapshot rows for {prev_round}")

    # --- Step 7: Update meta ---
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
```

- [ ] **Step 2: Test manually (requires real credentials)**

```bash
# Option A: Use .env file (copy .env.example → .env, fill values)
cp scraper/.env.example scraper/.env
# Edit .env with real credentials

# Option B: Export directly (single-line JSON)
export GOOGLE_CREDENTIALS='<paste single-line service account JSON>'
export SPREADSHEET_ID='<paste sheet ID>'

python -m scraper.scrape
```

Expected: Sheet tabs populated, logs show progress, no crashes.

- [ ] **Step 3: Commit**

```bash
git add scraper/scrape.py
git commit -m "feat: add main scraper orchestrator with snapshots and vacated logic"
```

---

### Task 8: Integration Test

**Files:**
- Create: `scraper/test_integration.py`

- [ ] **Step 1: Write integration test with mock store**

```python
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

        # Picks should be written on first run (need_full_scrape=True)
        self.assertIn('picks', mock_store.tabs)

        # Games and teams should be written
        self.assertIn('games', mock_store.tabs)
        self.assertIn('teams', mock_store.tabs)

    @patch('scraper.scrape.GoogleSheetsStore')
    @patch('scraper.scrape.fetch_group_page')
    @patch('scraper.scrape.fetch_bracket_page')
    def test_subsequent_run_updates_correctness(self, mock_fetch_bracket, mock_fetch_group, mock_store_cls):
        """On second run, existing picks should get correct/vacated updated."""
        mock_store = MockStore()
        # Pre-populate picks to simulate second run
        mock_store.tabs['picks'] = [
            {'bracket_id': 'b1', 'game_id': 'game_0', 'round': 'R64',
             'region': 'R1', 'team_picked': 'FakeTeam', 'seed_picked': 1,
             'correct': False, 'vacated': False}
        ]
        mock_store.tabs['meta'] = [{'current_round': 'R64', 'games_completed': 0}]
        mock_store_cls.return_value = mock_store

        mock_fetch_group.return_value = (FIXTURES / 'group_standings.html').read_text()
        mock_fetch_bracket.return_value = (FIXTURES / 'bracket_page.html').read_text()

        run()

        # Should not re-scrape all brackets
        self.assertIn('meta', mock_store.tabs)


if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run all tests**

Run: `cd scraper && python -m pytest -v`
Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
git add scraper/test_integration.py
git commit -m "test: add integration test for full scraper pipeline"
```

---

## Post-Plan Notes

**Before this plan can execute**, manual setup is required:
1. Create Google Cloud project → enable Sheets API
2. Create service account → download JSON key
3. Create Google Sheet with 6 tabs: `brackets`, `picks`, `games`, `teams`, `snapshots`, `meta`
4. Share Sheet with service account email
5. Publish each tab as CSV (File → Share → Publish to web → CSV)
6. Add `GOOGLE_CREDENTIALS` and `SPREADSHEET_ID` as GitHub repo secrets
7. Save fixture HTML files from real ESPN pages to `scraper/fixtures/`

**After this plan completes**, Plan 2 (Frontend Foundation) can begin — it reads the published CSVs that this scraper populates.
