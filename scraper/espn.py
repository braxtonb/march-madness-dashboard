"""ESPN JSON API parsing. All functions take parsed dicts and return plain dicts.
No network calls, no storage, no BeautifulSoup — pure data transformation."""

# Conference lookup — hardcoded for 2026 tournament field
TEAM_CONFERENCES: dict[str, str] = {
    'Arizona': 'Big 12', 'Houston': 'Big 12', 'Duke': 'ACC', 'Auburn': 'SEC',
    'UConn': 'Big East', 'Tennessee': 'SEC', 'Illinois': 'Big Ten', 'Purdue': 'Big Ten',
    'Michigan St': 'Big Ten', 'St John\'s': 'Big East', 'Gonzaga': 'WCC', 'Kansas': 'Big 12',
    'Florida': 'SEC', 'Alabama': 'SEC', 'Kentucky': 'SEC', 'Texas A&M': 'SEC',
    'UCLA': 'Big Ten', 'Marquette': 'Big East', 'BYU': 'Big 12', 'Iowa St': 'Big 12',
    'Memphis': 'AAC', 'Missouri': 'SEC', 'Oregon': 'Big Ten', 'Michigan': 'Big Ten',
    'Clemson': 'ACC', 'Louisville': 'ACC', 'Maryland': 'Big Ten', 'Texas Tech': 'Big 12',
    'Wisconsin': 'Big Ten', 'Creighton': 'Big East', 'Texas': 'SEC', 'Oklahoma': 'SEC',
    'Arkansas': 'SEC', 'Miss State': 'SEC', 'Baylor': 'Big 12', 'Arizona St': 'Big 12',
    'Georgia': 'SEC', 'VCU': 'A-10', 'New Mexico': 'MWC', 'Drake': 'MVC',
    'McNeese': 'Southland', 'Liberty': 'CUSA', 'Troy': 'Sun Belt', 'Colgate': 'Patriot',
    'Yale': 'Ivy', 'Akron': 'MAC', 'Grand Canyon': 'WAC', 'Lipscomb': 'ASUN',
    'UC San Diego': 'Big West', 'Norfolk St': 'MEAC', 'High Point': 'Big South',
    'Omaha': 'Summit', 'Robert Morris': 'Horizon', 'Wofford': 'SoCon',
    'Bryant': 'America East', 'SIU Edwardsville': 'OVC',
    'Col of Chas': 'CAA', 'UNC Wilmington': 'CAA',
    'St Peter\'s': 'MAAC', 'Belmont': 'MVC', 'Montana St': 'Big Sky',
    'Merrimack': 'NEC', 'Howard': 'MEAC', 'Wagner': 'NEC',
    # Additional 2026 tournament teams
    'Saint Louis': 'A-10', 'Santa Clara': 'WCC', 'Iowa State': 'Big 12',
    'Tennessee St': 'OVC', 'North Carolina': 'ACC', 'Penn': 'Ivy',
    "Hawai'i": 'Big West', 'UCF': 'Big 12', 'Furman': 'SoCon',
    'Siena': 'MAAC', 'Ohio State': 'Big Ten', 'TCU': 'Big 12',
    'Miami': 'ACC', 'Queens': 'ASUN', 'Hofstra': 'CAA',
    'Saint Mary\'s': 'WCC', 'Idaho': 'Big Sky', 'Long Island': 'NEC',
    'Villanova': 'Big East', 'Utah State': 'MWC', 'Kennesaw St': 'ASUN',
    'Miami OH': 'MAC', 'Virginia': 'ACC', 'Wright St': 'Horizon',
    'Northern Iowa': 'MVC', 'CA Baptist': 'WAC', 'South Florida': 'AAC',
    'N Dakota St': 'Summit', 'Prairie View': 'SWAC', 'Iowa': 'Big Ten',
    'Vanderbilt': 'SEC', 'Nebraska': 'Big Ten',
}

# scoringPeriodId -> round label
ROUND_MAP: dict[int, str] = {
    1: 'R64',
    2: 'R32',
    3: 'S16',
    4: 'E8',
    5: 'FF',
    6: 'CHAMP',
}

# regionId -> region label (ESPN uses 1-4)
REGION_MAP: dict[int, str] = {
    1: 'R1',
    2: 'R2',
    3: 'R3',
    4: 'R4',
}


def build_outcome_map(challenge_data: dict) -> dict[str, dict]:
    """Build outcomeId -> team metadata map from challenge API data.

    Returns a dict keyed by str(outcomeId) with keys:
        name, abbrev, seed, region, regionId, conference, logo,
        color_primary, color_secondary
    """
    outcome_map: dict[str, dict] = {}

    for prop in challenge_data.get('propositions', []):
        for outcome in prop.get('possibleOutcomes', []):
            oid = str(outcome.get('id', ''))
            if not oid or oid in outcome_map:
                continue

            # Extract mappings array into a lookup dict
            mappings: dict[str, str] = {}
            for m in outcome.get('mappings', []):
                mappings[m.get('mappingType', '')] = m.get('value', '')

            region_id = outcome.get('regionId', 0)

            outcome_map[oid] = {
                'name': outcome.get('name', ''),
                'abbrev': outcome.get('abbrev', ''),
                'seed': outcome.get('regionSeed', 0),
                'region': REGION_MAP.get(region_id, f'R{region_id}'),
                'regionId': region_id,
                'conference': TEAM_CONFERENCES.get(outcome.get('name', ''), ''),
                'logo': mappings.get('IMAGE_PRIMARY', ''),
                'color_primary': mappings.get('COLOR_PRIMARY', ''),
                'color_secondary': mappings.get('COLOR_SECONDARY', ''),
            }

    return outcome_map


def build_proposition_map(challenge_data: dict) -> dict[str, dict]:
    """Build propositionId -> game metadata map from challenge API data.

    Returns a dict keyed by str(propositionId) with keys:
        name, round, region, team1, seed1, team2, seed2,
        winner, completed, national_pct_team1
    """
    prop_map: dict[str, dict] = {}

    for prop in challenge_data.get('propositions', []):
        pid = str(prop.get('id', ''))
        if not pid:
            continue

        period_id = prop.get('scoringPeriodId', 1)
        round_label = ROUND_MAP.get(period_id, 'R64')

        outcomes = prop.get('possibleOutcomes', [])
        correct_ids = set(str(c) for c in prop.get('correctOutcomes', []))

        team1_name = ''
        seed1 = 0
        team2_name = ''
        seed2 = 0
        region = ''
        national_pct_team1 = 0.0

        # For multi-outcome propositions (R32 has 4, S16 has 8, etc.),
        # the ACTIVE matchup teams are those with 'additionalInfo' present.
        # For R64 (2 outcomes), both teams are the matchup.
        active_outcomes = [o for o in outcomes if 'additionalInfo' in o]

        if len(active_outcomes) >= 2:
            # Use active (advancing) teams as the matchup
            # Sort by matchupPosition to get consistent team1/team2
            active_outcomes.sort(key=lambda o: o.get('matchupPosition', 0))
            o1 = active_outcomes[0]
            o2 = active_outcomes[1]
        elif len(outcomes) == 2:
            # R64 games: exactly 2 outcomes = the actual matchup
            o1 = outcomes[0]
            o2 = outcomes[1]
        else:
            # Future round with >2 outcomes but no active teams yet: TBD
            # Use first outcome for region info only, leave team names empty
            o1 = {}
            o2 = {}
            if outcomes:
                region_id = outcomes[0].get('regionId', 0)
                region = REGION_MAP.get(region_id, f'R{region_id}')

        if o1:
            team1_name = o1.get('name', '')
            seed1 = o1.get('regionSeed', 0)
            region_id = o1.get('regionId', 0)
            region = REGION_MAP.get(region_id, f'R{region_id}')
            counters = o1.get('choiceCounters', {})
            if isinstance(counters, dict):
                national_pct_team1 = float(counters.get('percentage', 0.0))
            elif isinstance(counters, list) and counters:
                national_pct_team1 = float(counters[0].get('percentage', 0.0))

        if o2:
            team2_name = o2.get('name', '')
            seed2 = o2.get('regionSeed', 0)

        # Determine winner from correctOutcomes
        winner = ''
        completed = bool(correct_ids)
        if completed:
            for o in outcomes:
                if str(o.get('id', '')) in correct_ids:
                    winner = o.get('name', '')
                    break

        # FF/CHAMP games span regions — use 'FF' as region label
        if round_label in ('FF', 'CHAMP'):
            region = round_label

        prop_map[pid] = {
            'name': prop.get('name', ''),
            'round': round_label,
            'region': region,
            'team1': team1_name,
            'seed1': seed1,
            'team2': team2_name,
            'seed2': seed2,
            'winner': winner,
            'completed': completed,
            'national_pct_team1': national_pct_team1,
        }

    return prop_map


def parse_entries(
    group_data: dict,
    outcome_map: dict[str, dict],
    proposition_map: dict[str, dict],
) -> tuple[list[dict], list[dict]]:
    """Parse group entries into (brackets, picks) lists matching the Sheet schema."""
    brackets: list[dict] = []
    all_picks: list[dict] = []

    for entry in group_data.get('entries', []):
        entry_id = str(entry.get('id', ''))
        name = entry.get('name', '')
        member = entry.get('member', {})
        owner = member.get('displayName', '') if isinstance(member, dict) else ''

        # Champion pick
        final_pick = entry.get('finalPick', {})
        champion_outcome_id = ''
        if final_pick and isinstance(final_pick, dict):
            fp_outcomes = final_pick.get('outcomesPicked', [])
            if fp_outcomes:
                champion_outcome_id = str(fp_outcomes[0].get('outcomeId', ''))
        champion_team = outcome_map.get(champion_outcome_id, {})
        champion_name = champion_team.get('name', '')
        champion_seed = champion_team.get('seed', 0)

        # Score info
        score = entry.get('score', {}) or {}
        overall_score = int(score.get('overallScore', 0))
        rank = int(score.get('rank', 0))
        percentile = float(score.get('percentile', 0.0))
        possible_max = int(score.get('possiblePointsMax', 0) or 0)
        # ESPN doesn't provide possiblePointsRemaining — derive from max - current
        possible_remaining = max(0, possible_max - overall_score)

        score_by_period = score.get('scoreByPeriod', {}) or {}

        def _period_score(period_key: str) -> int:
            p = score_by_period.get(period_key, {})
            return int(p.get('score', 0)) if isinstance(p, dict) else 0

        r64_pts = _period_score('1')
        r32_pts = _period_score('2')
        s16_pts = _period_score('3')
        e8_pts = _period_score('4')
        ff_pts = _period_score('5')
        champ_pts = _period_score('6')

        # Final Four picks — find picks for FF propositions, exclude champion
        ff_picks: list[str] = []
        for pick in entry.get('picks', []):
            pid = str(pick.get('propositionId', ''))
            prop_meta = proposition_map.get(pid, {})
            if prop_meta.get('round') == 'FF':
                for op in pick.get('outcomesPicked', []):
                    oid = str(op.get('outcomeId', ''))
                    team = outcome_map.get(oid, {})
                    tname = team.get('name', '')
                    if tname and tname not in ff_picks:
                        ff_picks.append(tname)

        while len(ff_picks) < 4:
            ff_picks.append('')

        bracket = {
            'id': entry_id,
            'name': name,
            'owner': owner,
            'champion_pick': champion_name,
            'champion_seed': champion_seed,
            'ff1': ff_picks[0],
            'ff2': ff_picks[1],
            'ff3': ff_picks[2],
            'ff4': ff_picks[3],
            'points': overall_score,
            'prev_rank': 0,  # filled in by orchestrator from previous state
            'max_remaining': possible_remaining,
            'pct': percentile,
            'r64_pts': r64_pts,
            'r32_pts': r32_pts,
            's16_pts': s16_pts,
            'e8_pts': e8_pts,
            'ff_pts': ff_pts,
            'champ_pts': champ_pts,
        }
        brackets.append(bracket)

        # Parse individual picks
        for pick in entry.get('picks', []):
            pid = str(pick.get('propositionId', ''))
            prop_meta = proposition_map.get(pid, {})

            for op in pick.get('outcomesPicked', []):
                oid = str(op.get('outcomeId', ''))
                result = op.get('result', 'UNDECIDED')
                team = outcome_map.get(oid, {})

                correct = result == 'CORRECT'
                vacated = result == 'VACATED'

                all_picks.append({
                    'bracket_id': entry_id,
                    'game_id': pid,
                    'round': prop_meta.get('round', ''),
                    'region': prop_meta.get('region', ''),
                    'team_picked': team.get('name', ''),
                    'seed_picked': team.get('seed', 0),
                    'correct': correct,
                    'vacated': vacated,
                })

    return brackets, all_picks


def parse_games(proposition_map: dict[str, dict]) -> list[dict]:
    """Convert proposition map to games list matching the Sheet schema."""
    games: list[dict] = []
    for pid, prop in proposition_map.items():
        games.append({
            'game_id': pid,
            'round': prop['round'],
            'region': prop['region'],
            'team1': prop['team1'],
            'seed1': prop['seed1'],
            'team2': prop['team2'],
            'seed2': prop['seed2'],
            'winner': prop['winner'],
            'completed': prop['completed'],
            'national_pct_team1': prop['national_pct_team1'],
        })
    return games


def parse_teams(outcome_map: dict[str, dict]) -> list[dict]:
    """Convert outcome map to teams list matching the Sheet schema.

    Deduplicates by team name, keeps only R64 participants (seed > 0),
    and marks eliminated status based on whether the team won games
    beyond R64 — but since that requires game data, we just record
    the team list; eliminated status is set to False by default.
    """
    seen: set[str] = set()
    teams: list[dict] = []

    for oid, team in outcome_map.items():
        name = team.get('name', '')
        seed = team.get('seed', 0)
        if not name or name in seen or seed == 0:
            continue
        seen.add(name)
        teams.append({
            'name': name,
            'seed': seed,
            'region': team.get('region', ''),
            'conference': team.get('conference', ''),
            'eliminated': False,
            'eliminated_round': '',
            'logo': team.get('logo', ''),
        })

    return teams
