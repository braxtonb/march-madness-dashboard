# March Madness Dashboard

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript 5, Tailwind CSS 3.4, Recharts
- **Backend/Data:** Python 3.11 scraper (ESPN API → Google Sheets → static JSON)
- **Deployment:** Vercel (free tier), GitHub Actions (hourly scraper cron)

## Key Commands

### Frontend (Next.js)
- `npm run dev` — Start development server (localhost:3000)
- `npm run build` — Production build
- `npm run lint` — ESLint validation
- `npm start` — Start production server

### Scraper (Python)
- `cd scraper && pytest -v` — Run scraper tests
- `python -m scraper.scrape --local` — Run scraper locally (uses fixtures, updates public/data.json)
- `cd scraper && python save_fixtures.py` — Refresh fixtures from live ESPN API

### Testing Fallback & Backup
- `./scripts/test-fallback.sh fallback` — Simulate missing data (shows maintenance UI)
- `./scripts/test-fallback.sh backup` — Simulate primary missing, backup available
- `./scripts/test-fallback.sh restore` — Restore normal state

**How to test:**
1. Run one of the commands above
2. Start the dev server: `npm run dev`
3. Open http://localhost:3000
4. Verify the expected behavior (see below)
5. Run `./scripts/test-fallback.sh restore` to put files back
6. Restart the dev server

**Expected behavior per mode:**

| Mode | data.json | data.backup.json | What you see |
|------|-----------|------------------|--------------|
| Normal | Present | Optional | Full dashboard |
| `backup` | Missing | Present | Full dashboard (from backup), console warns "using backup" |
| `fallback` | Missing | Missing | Bouncing basketball + rotating trivia facts + refresh button |

**Important:** Always run `restore` before committing — the script renames files with `.disabled` suffix.

## Code Patterns

- Follow existing patterns in the codebase
- Components live in `src/components/` organized by type: `ui/`, `charts/`, `tables/`, `layout/`
- Pages use App Router conventions in `src/app/`
- Data types defined in `src/lib/types.ts`
- Constants and helpers in `src/lib/constants.ts`
- Data loading via `src/lib/sheets.ts` (30-second cache from `public/data.json`)
- Split React contexts (state + actions) to prevent cascading re-renders
- Seeded PRNG for Monte Carlo simulations (deterministic, no hydration mismatch)
- `window.history.replaceState` for URL state (avoids full Next.js re-renders)

## Before Making Changes

- Read existing code before modifying
- Run `npm run build` and verify success before every git commit
- **Never commit `public/data.json` from local** — CI scraper is the sole authority for production data. Use specific `git add <files>` instead of `git add -A` or `git add .`
- Do NOT push to remote or deploy to Vercel unless explicitly asked
- Use positive framing only (no "dead", "worst", "graveyard" language)
- Show bracket name (not full name) in displays
- Exclude empty brackets from views

## Project Structure

```
src/
├── app/           # Next.js App Router pages
├── components/    # React components (ui/, charts/, tables/, layout/)
└── lib/           # Utilities (types, constants, montecarlo, sheets)
scraper/
├── scrape.py      # Main entry point
├── espn.py        # ESPN API interactions
├── fetch.py       # 3-endpoint merge strategy
├── precompute.py  # Awards, win probability, snapshots
├── sheets.py      # Google Sheets sync
└── fixtures/      # Local dev data cache
public/
└── data.json      # Static data export (committed by CI)
```

## Documentation

- ADRs: `docs/adr/`
- Reference: `docs/reference/`
- Explanation: `docs/explanation/`
- How-to guides: `docs/how-to/`
- Tutorials: `docs/tutorials/`

## Claude Code Marketplace

This project uses [velo](https://github.com/braxtonb/claude-marketplace) for documentation, review, and memory management.

Available commands:
- `/velo:review` — Full-spectrum code review + documentation updates
- `/velo:learn` — Interactive codebase exploration
- `/velo:baseline` — Generate baseline documentation
- `/velo:health` — Project health audit
- `/velo:remember` — Persist knowledge across sessions
- `/velo:author` — Guided document authoring
