"""Tests for ESPN scraping logic."""
import re
import unittest
from pathlib import Path

from scraper.espn import (
    parse_group_standings, parse_bracket_picks,
    parse_tournament_games, parse_teams,
)

FIXTURES = Path(__file__).parent / 'fixtures'


class TestParseGroupStandings(unittest.TestCase):

    def test_parses_5_brackets(self):
        html = (FIXTURES / 'group_standings.html').read_text()
        brackets = parse_group_standings(html)
        self.assertEqual(len(brackets), 5)

    def test_first_bracket_has_real_values(self):
        html = (FIXTURES / 'group_standings.html').read_text()
        brackets = parse_group_standings(html)
        first = brackets[0]
        self.assertEqual(first['name'], "dave5burton's Picks 1")
        self.assertEqual(first['owner'], 'dave5burton')
        self.assertEqual(first['points'], 140)
        self.assertEqual(first['champion_pick'], 'Illinois')
        self.assertEqual(first['max_remaining'], 1900)

    def test_bracket_ids_are_valid(self):
        html = (FIXTURES / 'group_standings.html').read_text()
        brackets = parse_group_standings(html)
        for b in brackets:
            self.assertRegex(b['id'], r'^[a-f0-9-]+$')


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

    def test_bracket_id_propagated(self):
        html = (FIXTURES / 'bracket_page.html').read_text()
        picks = parse_bracket_picks(html, bracket_id='my-bracket-42')
        for p in picks:
            self.assertEqual(p['bracket_id'], 'my-bracket-42')

    def test_first_pick_is_arizona(self):
        html = (FIXTURES / 'bracket_page.html').read_text()
        picks = parse_bracket_picks(html, bracket_id='test')
        self.assertEqual(picks[0]['team_picked'], 'Arizona')
        self.assertEqual(picks[0]['seed_picked'], 1)
        self.assertEqual(picks[0]['round'], 'R64')


class TestParseTournamentResults(unittest.TestCase):

    def test_parses_63_games(self):
        html = (FIXTURES / 'bracket_page.html').read_text()
        games = parse_tournament_games(html)
        self.assertEqual(len(games), 63)

    def test_game_has_both_teams(self):
        html = (FIXTURES / 'bracket_page.html').read_text()
        games = parse_tournament_games(html)
        for g in games:
            self.assertIn('team1', g)
            self.assertIn('team2', g)
            self.assertGreater(len(g['team1']), 0)
            self.assertGreater(len(g['team2']), 0)


class TestParseTeams(unittest.TestCase):

    def test_parses_teams(self):
        html = (FIXTURES / 'bracket_page.html').read_text()
        teams = parse_teams(html)
        self.assertGreater(len(teams), 0)

    def test_team_has_conference(self):
        html = (FIXTURES / 'bracket_page.html').read_text()
        teams = parse_teams(html)
        arizona = next((t for t in teams if t['name'] == 'Arizona'), None)
        self.assertIsNotNone(arizona)
        self.assertEqual(arizona['conference'], 'Big 12')
        self.assertEqual(arizona['seed'], 1)

    def test_no_duplicate_teams(self):
        html = (FIXTURES / 'bracket_page.html').read_text()
        teams = parse_teams(html)
        names = [t['name'] for t in teams]
        self.assertEqual(len(names), len(set(names)))


if __name__ == '__main__':
    unittest.main()
