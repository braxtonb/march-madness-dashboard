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
