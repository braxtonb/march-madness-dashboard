"""ESPN page parsing. All functions take HTML strings and return plain dicts.
No network calls, no storage — pure parsing."""
import re
from bs4 import BeautifulSoup


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
}


def parse_group_standings(html: str) -> list[dict]:
    """Parse the group standings page into bracket summary dicts."""
    soup = BeautifulSoup(html, 'html.parser')
    brackets = []

    rows = soup.select('tr.Table__TR')
    for row in rows:
        cells = row.select('td')
        if len(cells) < 5:
            continue

        try:
            link = row.select_one('a[href*="/bracket?id="]')
            bracket_id = ''
            name = ''
            if link:
                href = link.get('href', '')
                id_match = re.search(r'id=([a-f0-9-]+)', href)
                bracket_id = id_match.group(1) if id_match else ''
                name = link.get_text(strip=True)

            owner_el = row.select_one('span.owner')
            owner = owner_el.get_text(strip=True) if owner_el else ''

            champ_img = row.select_one('img[alt]')
            champion_pick = champ_img.get('alt', '') if champ_img else ''

            bracket = {
                'id': bracket_id,
                'name': name,
                'owner': owner,
                'champion_pick': champion_pick,
                'champion_seed': 0,
                'ff1': '', 'ff2': '', 'ff3': '', 'ff4': '',
                'points': _parse_int(cells, 3),
                'prev_rank': 0,
                'max_remaining': _parse_int(cells, 5),
                'pct': _parse_float(cells, 4),
                'r64_pts': _parse_int(cells, 6) if len(cells) > 6 else 0,
                'r32_pts': 0, 's16_pts': 0,
                'e8_pts': 0, 'ff_pts': 0, 'champ_pts': 0,
            }
            if bracket['id']:
                brackets.append(bracket)
        except (ValueError, IndexError, AttributeError):
            continue

    return brackets


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

        picked_name = name1 if radios[0].get('checked') is not None else name2

        seed_match = re.match(r'^(\d+)', picked_name)
        seed = int(seed_match.group(1)) if seed_match else 0
        team = re.sub(r'^\d+', '', picked_name).strip()

        picks.append({
            'bracket_id': bracket_id,
            'game_id': f'game_{i}',
            'round': _game_index_to_round(i),
            'region': _game_index_to_region(i),
            'team_picked': team,
            'seed_picked': seed,
            'correct': False,
            'vacated': False,
        })

    return picks


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

        completed = False
        winner = ''

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


def _parse_int(cells: list, index: int) -> int:
    try:
        return int(cells[index].get_text(strip=True).replace(',', ''))
    except (ValueError, IndexError):
        return 0


def _parse_float(cells: list, index: int) -> float:
    try:
        return float(cells[index].get_text(strip=True).replace('%', ''))
    except (ValueError, IndexError):
        return 0.0


def _game_index_to_round(index: int) -> str:
    if index < 32: return 'R64'
    if index < 48: return 'R32'
    if index < 56: return 'S16'
    if index < 60: return 'E8'
    if index < 62: return 'FF'
    return 'CHAMP'


def _game_index_to_region(index: int) -> str:
    if index < 8: return 'R1'
    if index < 16: return 'R2'
    if index < 24: return 'R3'
    if index < 32: return 'R4'
    if index < 36: return 'R1'
    if index < 40: return 'R2'
    if index < 44: return 'R3'
    if index < 48: return 'R4'
    if index < 50: return 'R1'
    if index < 52: return 'R2'
    if index < 54: return 'R3'
    if index < 56: return 'R4'
    if index < 57: return 'R1'
    if index < 58: return 'R2'
    if index < 59: return 'R3'
    if index < 60: return 'R4'
    return 'FF'
