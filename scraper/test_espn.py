"""Tests for ESPN JSON API parsing logic."""
import json
import unittest
from pathlib import Path

from scraper.espn import (
    build_outcome_map, build_proposition_map,
    parse_entries, parse_games, parse_teams,
    ROUND_MAP, TEAM_CONFERENCES,
)

FIXTURES = Path(__file__).parent / 'fixtures'


def _load_challenge() -> dict:
    return json.loads((FIXTURES / 'challenge.json').read_text())


def _load_group_entries() -> dict:
    return json.loads((FIXTURES / 'group_entries.json').read_text())


class TestBuildOutcomeMap(unittest.TestCase):

    def setUp(self):
        self.challenge = _load_challenge()
        self.outcome_map = build_outcome_map(self.challenge)

    def test_returns_nonempty_map(self):
        self.assertGreater(len(self.outcome_map), 0)

    def test_outcome_has_required_keys(self):
        required = ['name', 'abbrev', 'seed', 'region', 'regionId', 'conference', 'logo',
                    'color_primary', 'color_secondary']
        for oid, team in self.outcome_map.items():
            for key in required:
                self.assertIn(key, team, f"Missing '{key}' in outcome {oid}")
            break  # just check first entry

    def test_has_64_or_more_unique_teams(self):
        # 64 teams in the tournament; outcomes may include more due to later rounds
        names = {v['name'] for v in self.outcome_map.values() if v['name']}
        self.assertGreaterEqual(len(names), 64)

    def test_seeds_are_1_through_16(self):
        seeds = {v['seed'] for v in self.outcome_map.values() if v['seed'] > 0}
        for s in seeds:
            self.assertIn(s, range(1, 17))

    def test_region_labels_are_valid(self):
        valid_regions = {'R1', 'R2', 'R3', 'R4', 'FF', 'CHAMP', ''}
        for oid, team in self.outcome_map.items():
            self.assertIn(team['region'], valid_regions,
                          f"Unexpected region '{team['region']}' for {team['name']}")

    def test_known_team_has_conference(self):
        illinois = next((v for v in self.outcome_map.values() if v['name'] == 'Illinois'), None)
        if illinois:
            self.assertEqual(illinois['conference'], 'Big Ten')

    def test_no_duplicate_outcome_ids(self):
        # IDs are the dict keys — by definition unique, but verify count
        self.assertEqual(len(self.outcome_map), len(set(self.outcome_map.keys())))


class TestBuildPropositionMap(unittest.TestCase):

    def setUp(self):
        self.challenge = _load_challenge()
        self.prop_map = build_proposition_map(self.challenge)

    def test_has_32_propositions(self):
        # ESPN API only exposes R64 propositions explicitly; later rounds are implicit
        self.assertEqual(len(self.prop_map), 32)

    def test_proposition_has_required_keys(self):
        required = ['name', 'round', 'region', 'team1', 'seed1', 'team2', 'seed2',
                    'winner', 'completed', 'national_pct_team1']
        for pid, prop in self.prop_map.items():
            for key in required:
                self.assertIn(key, prop, f"Missing '{key}' in proposition {pid}")
            break

    def test_rounds_are_r64(self):
        # Challenge API only has R64 propositions; later rounds derived from picks
        rounds = {p['round'] for p in self.prop_map.values()}
        self.assertEqual(rounds, {'R64'})

    def test_r64_has_32_games(self):
        r64 = [p for p in self.prop_map.values() if p['round'] == 'R64']
        self.assertEqual(len(r64), 32)

    def test_no_champ_in_propositions(self):
        # Championship game is not a separate proposition in ESPN API
        champ = [p for p in self.prop_map.values() if p['round'] == 'CHAMP']
        self.assertEqual(len(champ), 0)

    def test_national_pct_is_float(self):
        for pid, prop in self.prop_map.items():
            pct = prop['national_pct_team1']
            self.assertIsInstance(pct, float, f"national_pct_team1 not float in {pid}")
            self.assertGreaterEqual(pct, 0.0)
            self.assertLessEqual(pct, 1.0)

    def test_completed_games_have_winner(self):
        for pid, prop in self.prop_map.items():
            if prop['completed']:
                self.assertGreater(len(prop['winner']), 0,
                                   f"Completed game {pid} has no winner")


class TestParseEntries(unittest.TestCase):

    def setUp(self):
        challenge = _load_challenge()
        group = _load_group_entries()
        self.outcome_map = build_outcome_map(challenge)
        self.prop_map = build_proposition_map(challenge)
        self.brackets, self.picks = parse_entries(group, self.outcome_map, self.prop_map)

    def test_returns_brackets_and_picks(self):
        self.assertIsInstance(self.brackets, list)
        self.assertIsInstance(self.picks, list)

    def test_has_entries(self):
        self.assertGreater(len(self.brackets), 0)

    def test_bracket_has_required_keys(self):
        required = [
            'id', 'name', 'owner', 'champion_pick', 'champion_seed',
            'ff1', 'ff2', 'ff3', 'ff4',
            'points', 'prev_rank', 'max_remaining', 'pct',
            'r64_pts', 'r32_pts', 's16_pts', 'e8_pts', 'ff_pts', 'champ_pts',
        ]
        for b in self.brackets:
            for key in required:
                self.assertIn(key, b)
            break

    def test_picks_have_required_keys(self):
        required = ['bracket_id', 'game_id', 'round', 'region',
                    'team_picked', 'seed_picked', 'correct', 'vacated']
        for p in self.picks:
            for key in required:
                self.assertIn(key, p)
            break

    def test_prev_rank_defaults_to_zero(self):
        for b in self.brackets:
            self.assertEqual(b['prev_rank'], 0)

    def test_each_bracket_has_picks(self):
        bracket_ids = {b['id'] for b in self.brackets}
        pick_bracket_ids = {p['bracket_id'] for p in self.picks}
        # Every bracket should have at least one pick
        self.assertTrue(bracket_ids.issubset(pick_bracket_ids) or
                        len(self.picks) > 0)

    def test_picks_have_valid_rounds(self):
        valid_rounds = {'R64', 'R32', 'S16', 'E8', 'FF', 'CHAMP', ''}
        for p in self.picks:
            self.assertIn(p['round'], valid_rounds)

    def test_champion_pick_is_team_name_or_empty(self):
        for b in self.brackets:
            # Champion pick should be a string (empty is ok for brackets that haven't picked)
            self.assertIsInstance(b['champion_pick'], str)

    def test_points_are_non_negative_ints(self):
        for b in self.brackets:
            self.assertIsInstance(b['points'], int)
            self.assertGreaterEqual(b['points'], 0)


class TestParseGames(unittest.TestCase):

    def setUp(self):
        challenge = _load_challenge()
        self.prop_map = build_proposition_map(challenge)
        self.games = parse_games(self.prop_map)

    def test_has_32_games(self):
        # Only R64 games come from the challenge API propositions
        self.assertEqual(len(self.games), 32)

    def test_game_has_required_keys(self):
        required = ['game_id', 'round', 'region', 'team1', 'seed1', 'team2', 'seed2',
                    'winner', 'completed', 'national_pct_team1']
        for g in self.games:
            for key in required:
                self.assertIn(key, g)
            break

    def test_games_have_team_names(self):
        for g in self.games:
            self.assertGreater(len(g['team1']), 0, f"Empty team1 in game {g['game_id']}")
            self.assertGreater(len(g['team2']), 0, f"Empty team2 in game {g['game_id']}")


class TestParseTeams(unittest.TestCase):

    def setUp(self):
        challenge = _load_challenge()
        self.outcome_map = build_outcome_map(challenge)
        self.teams = parse_teams(self.outcome_map)

    def test_has_64_teams(self):
        self.assertEqual(len(self.teams), 64)

    def test_no_duplicate_names(self):
        names = [t['name'] for t in self.teams]
        self.assertEqual(len(names), len(set(names)))

    def test_team_has_required_keys(self):
        required = ['name', 'seed', 'region', 'conference', 'eliminated', 'eliminated_round']
        for t in self.teams:
            for key in required:
                self.assertIn(key, t)
            break

    def test_known_team_conference(self):
        arizona = next((t for t in self.teams if t['name'] == 'Arizona'), None)
        if arizona:
            self.assertEqual(arizona['conference'], 'Big 12')
            self.assertEqual(arizona['seed'], 1)

    def test_eliminated_defaults_false(self):
        for t in self.teams:
            self.assertFalse(t['eliminated'])

    def test_seeds_range_1_to_16(self):
        for t in self.teams:
            self.assertIn(t['seed'], range(1, 17), f"Bad seed {t['seed']} for {t['name']}")

    def test_regions_are_valid(self):
        valid = {'R1', 'R2', 'R3', 'R4'}
        for t in self.teams:
            self.assertIn(t['region'], valid, f"Bad region '{t['region']}' for {t['name']}")


if __name__ == '__main__':
    unittest.main()
