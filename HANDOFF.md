# Context Handoff: March Madness Dashboard — Session 2

**Created:** 2026-03-22 20:00 ET
**Project:** `/Users/braxtonbrewton/Organized/Projects/distributed-playground/golang/pocs/playground/march-madness-dashboard`
**Branch:** `main`
**Live:** https://march-madness-dashboard-six.vercel.app

## Goal
75-person March Madness bracket analytics dashboard. Scrapes ESPN data, serves via Next.js on Vercel. Session 2 added mobile responsiveness, awards overhaul, bracket comparison UX, and 40+ iterations of polish across all 6 pages.

## Current State
- **6 pages**: Leaderboard, Probability, Simulator, Head-to-Head, Group Picks, Awards
- **3 Group Picks views**: Card View, Bracket View (ESPN-style nested tree), Heatmap
- **Full names**: Extracted via authenticated ESPN API, stored in `scraper/fixtures/users.json`, synced to Google Sheets
- **My Bracket mode**: localStorage pin with navbar badge, highlighted on all tables
- **Bracket comparison**: Hover-reveal checkboxes → floating compare bar → deep link to H2H
- **Deep linking**: Tabs, filters, sort order, sidebar state, simulator picks, bracket search all URL-persisted
- **~50 unpushed commits** on main — all build-passing, not yet deployed

## Completed Work (Session 2)
- Mobile responsiveness across all 6 pages (BottomSheet, MobileCard, scrollable filters, sticky columns)
- Awards overhaul: 6 awards with SVG icons, detail sidebar, multiple winners, "All Rounds", The Contrarian replaced Hot Streak
- Bracket compare UX: hover-reveal checkboxes, floating bar, deep link to H2H
- Full names from ESPN authenticated API (`scraper/fixtures/users.json` → Google Sheets → data.json)
- My Bracket mode with localStorage, navbar badge, table highlighting
- Quick link hero cards on leaderboard
- Bracket View (ESPN-style nested tree layout) on Group Picks
- Heatmap view with cyan/orange accuracy spectrum
- Leaderboard ribbon podium, window-style ranking (RANK not DENSE_RANK)
- Performance fixes: split contexts, `React.memo`, `window.history.replaceState` for tab switches, seeded PRNG for Monte Carlo
- Unified MultiSelectSearch component replacing BracketSearch + FilterDropdown
- Consistent TeamPill with `showStatus` everywhere
- SVG award icons, Lucide-style thin arrows, +/- expansion icons
- Column header tooltips (native `title`), sticky table headers
- Deep linking for simulator picks, sort order, sidebar state, bracket search
- Skeleton loaders, DoorDash×basketball favicon
- Games to Watch sidebar, champion distribution drawer
- Tab switch URL param cleanup

## Active Tasks
- [ ] Bracket View spacing refinement — rounds nest/overlap but connector lines removed; may need visual connectors restored or spacing tuned further based on feedback
- [ ] Push ~50 commits to remote and deploy to Vercel (user controls when)
- [ ] Potential bracket view mobile layout (current nested layout needs horizontal scroll on mobile)

## Key Decisions Made
| Decision | Rationale |
|----------|-----------|
| Hot Streak → The Contrarian | Hot Streak ordering was inaccurate (no game timestamps); Contrarian uses `national_pct_team1` data |
| `window.history.replaceState` for all tab/filter URL updates | `router.replace` caused full Next.js route re-renders and stuttering |
| Split CompareProvider into state + actions contexts | Prevents cascading re-renders when only actions are consumed |
| Seeded PRNG for Monte Carlo | `Math.random()` caused hydration mismatch and data jumping on probability page |
| `users.json` as full name SOT | ESPN public API doesn't return `fullName`; requires auth cookies; stored once, never overwritten |
| Bracket name primary, full name secondary everywhere | Most usernames are "ESPNFAN" + random numbers |
| Orange checkboxes for filtering, cyan circles for comparison | Visual language distinguishing multi-select filters vs bracket comparison |
| Ribbon podium over stepped podium | User preference; stepped was option B, ribbon was option C (chosen) |
| Do not push/deploy unless user explicitly asks | Memory saved at `~/.claude/projects/-Users-braxtonbrewton/memory/feedback_deploy_workflow.md` |

## Important Context
- **Google Sheets creds**: `secrets/march-madness-2026-490823-656c22c3024f.json`, Sheet ID: `1BT4Yz1Gs951frXXIAH498UFWvrBjxiCXWe21cUY5FcM`
- **ESPN group**: `f2683f8e-fbba-4625-9188-84a820659e90`, challenge ID: 277
- **Build quirk**: `_document` PageNotFoundError during static gen is pre-existing, doesn't block build
- **Podium preference order**: B (stepped) → C (ribbon, current) → D (trophy shelf) → E (crown)
- **Quick links preference order**: A (hero cards, current) → B (inline banner) → D (command palette) → C (contextual tips)
- **User memories**: See `~/.claude/projects/-Users-braxtonbrewton/memory/MEMORY.md`

## Files to Review
1. `FEATURES.md` — comprehensive feature list (just updated)
2. `src/components/charts/BracketView.tsx` — ESPN-style nested bracket tree (most recent active work)
3. `src/components/ui/MultiSelectSearch.tsx` — unified search component used everywhere
4. `src/components/ui/CompareProvider.tsx` — split state/actions contexts for performance
5. `src/app/LeaderboardContent.tsx` — ribbon podium, quick links, search, tabs

## How to Continue
1. Read `FEATURES.md` for current state
2. Run `npm run build` to verify
3. User will provide next feedback items
4. Do NOT push or deploy unless user explicitly asks
5. Check `~/.claude/projects/-Users-braxtonbrewton/memory/MEMORY.md` for user preferences
