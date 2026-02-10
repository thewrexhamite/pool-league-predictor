# Changelog

All notable changes to Pool League Pro are documented here. This project follows a loose chronological structure grouped by feature area. Dates are UTC.

---

## [2026-02-10] Documentation

### docs: add comprehensive README and consolidate docs into docs/ (`f7a9da6`)
Added a full `README.md` (523 lines) covering features, architecture, deployment, data sync & maintenance, adding new leagues, admin tools, API reference, project structure, and testing. Moved 14 scattered root-level `.md` files (verification reports, test checklists, PWA guides) into a `docs/` directory.

### docs: add comprehensive CHANGELOG documenting full project evolution (`ebfaa2e`)
Created `CHANGELOG.md` documenting all 434 commits from initial build through feature branches, multi-league expansion, admin tools, and cutting-edge CSS enhancements.

---

## [2026-02-10] Cutting-Edge CSS & View Transitions

### feat: add 10 cutting-edge CSS features with graceful fallbacks (`62e00f5`)
Progressive enhancements gated behind `@supports` or silent degradation — Chrome users get premium visuals, Safari/Firefox/older browsers fall back gracefully with zero breakage.

**Features added:**
1. **CSS Scroll-Driven Animations** — pure-CSS scroll progress bar (`animation-timeline: scroll()`), with Framer Motion spring fallback for unsupported browsers
2. **`text-wrap: balance` / `pretty`** — even heading line lengths, no orphan words in paragraphs
3. **`interpolate-size: allow-keywords`** — enables native CSS height auto transitions
4. **`@starting-style` dropdown animations** — fade+scale entry/exit for all dropdowns (league switcher, search results, time machine, user menu) via `hidden` attribute toggle instead of conditional rendering
5. **View Transitions API** — cross-fade + slide on tab changes, trophy-to-logo morph when entering/leaving a league; `withViewTransition()` utility wraps state changes
6. **Enhanced Glassmorphism** — `backdrop-filter: blur(16px) saturate(180%)` on header, bottom tab bar, and detail sheet backdrop, with frosted edge highlights
7. **`color-mix()` hover states** — dynamic theme-aware hover shadows on interactive cards using `color-mix(in srgb, ...)`
8. **`light-dark()` + `color-scheme`** — native scrollbar/form control theming in dark mode, utility CSS variables
9. **Scroll-State Container Queries** — header gains shadow only when scrolled via `@container scroll-state(scrolled: top)` (Chrome 133+)
10. **`@property` animated CSS variables** — smooth `--glow-intensity` transitions on card hover, `--progress-value` for animated progress bars

**Files changed:** `globals.css` (+228 lines), `AppHeader.tsx`, `BottomTabBar.tsx`, `DetailSheet.tsx`, `UserMenu.tsx`, `ScrollProgress.tsx` (rewritten with dual CSS/FM render), `AppTabs.tsx`, `App.tsx`, `LeagueSelector.tsx`, `layout.tsx`

**New file:** `src/lib/view-transitions.ts`

---

## [2026-02-10] Streamlined Navigation

### feat: streamlined navigation — 5 tabs, sheet-based details, sub-navigation (`5b258f6`)
Major navigation overhaul reducing from 7+ tabs to 5 core tabs. Team and player detail views now open in a slide-over sheet (bottom sheet on mobile, side panel on desktop) instead of replacing the tab content. Each tab gains internal sub-navigation for its various views.

### fix: move DetailSheetProvider above useSheetBridge to fix context error (`f6ccf43`)
Context provider ordering fix — `DetailSheetProvider` must wrap `useSheetBridge` consumers.

---

## [2026-02-10] Advanced Insights

### feat: add advanced insights features (Tier 2-4) (`08a9a13`)
Extended AI-powered and statistical insights beyond the initial tier, adding deeper analysis capabilities for match predictions, team performance, and player evaluation.

---

## [2026-02-09] UI & Build Fixes

### chore: commit remaining UI changes to fix build (`b9e2eeb`)
Batch commit of accumulated UI changes needed to restore build after feature merges.

### fix: replace broken "My Team tab" message with button that opens modal (`aa2e517`)
The My Team tab showed a broken message when no team was set — replaced with a clear call-to-action button that opens the team selection modal.

---

## [2026-02-09] Firebase Cloud Functions

### feat: automate league data sync with Firebase Cloud Functions (`139d58a`)
Moved data synchronisation from manual scripts to automated Firebase Cloud Functions, ensuring league data stays fresh without human intervention.

---

## [2026-02-09] Premium Landing Page & Navigation

### Replace LeagueSelector with premium SaaS-quality landing page (`d269795`)
Complete landing page redesign with hero section, animated feature grid, stats counters, league selection cards, and polished footer. Premium visual identity with gradient borders, button shine effects, floating orbs, and noise texture overlays.

### Delete orphaned AppRouter.tsx (`21d6989`)
Cleanup of removed `LandingPage` import reference.

### Make logo click navigate back to landing page (`5bca27c`)
Header logo/title now acts as a back button to the league selector landing page.

---

## [2026-02-09] Post-Merge Stabilisation

### Fix build errors from auto-claude branch merges (`d17e34b`)
Resolved all TypeScript and import errors from merging 18 feature branches simultaneously.

### Fix type errors in test files for CI (`c17d2d2`)
Test suite type fixes to pass CI pipeline.

### Wire Captain, Optimizer tabs into AppTabs (`1912834`)
Connected the Captain Dashboard and Lineup Optimizer tabs that were built in branches but not wired into the main tab router.

### Fix all 9 failing test suites and player-identity source bugs (`6ed6f79`)
Comprehensive test suite repair and player identity resolution fixes.

---

## [2026-02-09] Feature Branch Merges (18 branches)

All features below were developed in parallel on isolated branches and merged into main:

### Merge: Player trend filter for Stats tab (`5688bdd`)
Filter players by trend direction (improving, declining, stable) in the stats leaderboards.

### Merge: Toast notification mobile positioning (`4f9935d`)
Fixed toast notifications overlapping the mobile bottom navigation bar.

### Merge: Form/select label associations (`273566a`)
Added proper `id`/`htmlFor` label associations to all form inputs for accessibility.

### Merge: Empty state for search (`982d9b4`)
Shows a helpful empty state message when search returns no results.

### Merge: Skeleton loading during simulation (`042004c`)
Added skeleton table placeholder while season simulation is running.

### Merge: Automated data sync pipeline (`210c6a7`)
Created `sync-pipeline.ts` library with sync functions, `/api/sync` endpoint with auth token validation, Vercel cron job configuration, and structured logging.

### Merge: App.tsx prediction engine refactoring (`dde6859`)
Extracted prediction engine into modular `lib/predictions/` directory with separate modules for simulation, matchup, lineup, analytics, player stats, and fixtures. Extracted custom hooks (`usePrediction`, `useSimulation`, `useSquadBuilder`, `useSearch`, `useUIState`). Extracted header sub-components (`SearchPanel`, `LeagueSwitcher`, `MobileMenu`, `TimeMachinePanel`).

### Merge: Head-to-head player comparison tool (`1b45d48`)
New Compare tab with side-by-side player comparison — core stats, form, home/away splits, H2H records, trend charts, and comparative bar charts. Includes share button for comparison URLs.

### Merge: Match night quick lookup mode (`4f461d9`)
`Cmd/Ctrl+K` quick lookup overlay with player search, real-time filtering, player stats cards, keyboard navigation, and offline support.

### Merge: Lineup optimizer tool (`c330813`)
AI-powered lineup optimiser with player availability selection, position lock/unlock, optimised lineup display with win probability, and alternative lineup comparisons.

### Merge: Full PWA offline support (`5f00c8d`)
Complete Progressive Web App implementation — Cache API for Firestore data, background sync, offline indicator, cached data badges, iOS PWA meta tags, enhanced service worker with offline-first strategies.

### Merge: Historical season archive (`6e961f7`)
Season selector component, historical standings view, season comparison charts, multi-season player stats, and cross-season search.

### Merge: Advanced notification preferences (`1f30ddd`)
Quiet hours settings, team/division filters, reminder timing controls, notification history panel, and calendar export for fixtures.

### Merge: Long-term form trend analysis (`bc05296`)
Career data fetching, career trend charts, improvement rate calculations, consistency metrics, career highlights, and AI insights integration with career data.

### Merge: Email notification preferences (`ae12b9d`)
Resend integration, email subscription/unsubscribe API routes, match results and weekly digest email templates, daily/weekly cron jobs.

### Merge: Captain's dashboard (`2919404`)
Player availability manager, season goals panel, opponent scouting panel, lineup recommendation panel — all combined in a dedicated captain's dashboard tab.

### Merge: Custom dashboard views (`0b76f05`)
Drag-and-drop dashboard editor with `@dnd-kit`, widget library, per-user dashboard configuration saved to Firestore, extracted reusable widgets (Season Progress, Title Race, Relegation, Next Matchday, Recent Results, Hot & Cold, Prediction Accuracy).

### Merge: Multi-league support infrastructure (`7b28c31`)
Data source interface/factory pattern, `LeagueAppLive` scraper refactored as data source implementation, player identity resolution service, cross-league player stats, migration script.

### Merge: League admin tools (`b8f83e6`)
Admin role system, admin API middleware, user management, league CRUD, manual result entry, player merge/deduplication, league settings, league health metrics dashboard, data source configuration — all behind `AdminGuard` route protection.

---

## [2026-02-08] Bug Fixes & QA

### fix: add authentication/authorization to admin endpoints (`1427c91`)
Security fix ensuring all admin API endpoints require proper authentication.

### fix: Address QA issues (`8fc60a4`)
Batch QA fixes across multiple components.

### fix: Escape apostrophes and fix test validation logic (`3cf67d9`)
Text rendering and test assertion fixes.

### fix: handle undefined values in chart tooltip formatter (`905a85b`)
Guard against undefined values in Recharts tooltip callbacks.

### fix: implement notification filtering logic (`8152867`)
Connected notification preference filters to actual notification delivery.

### fix: correct firestore query for predictions without results (`632854f`)
Fixed Firestore query that failed when fetching predictions that hadn't resolved yet.

### fix: correct property names and tooltip formatter types (`6f47718`)
Post-merge type and property name corrections.

---

## [2026-02-08] Feature Development (parallel branches)

Extensive parallel development across 18 feature branches — see merge section above for details on each feature. All branches prefixed `auto-claude/` with numbered task IDs and subtask commits.

---

## [2026-02-07] Auth, Analytics & Multi-League

### Add Firebase Auth and player profile claiming system (`0f3fb4e`)
Google sign-in, user profile creation, player profile claiming with disclaimer and agreement checkbox. Includes claim page, auth provider, and Firestore rules.

### Integrate auth into frontend UI (`7f7d879`)
User menu in header with avatar, sign out, and claim profile link. Auth-gated features (AI chat, notifications).

### Add Firebase Analytics (`232061c`)
Google Analytics 4 tracking via `gtag.js` and Firebase Analytics initialisation.

### Add league switcher dropdown to header (`b66218a`)
Desktop header dropdown to switch between leagues without returning to landing page.

### Add NWPA multi-league support (`a444df0`)
Extended data sync to support multiple leagues (Wrexham + NWPA). Removed Microsoft/Facebook OAuth providers.

---

## [2026-02-06] Stability & Bug Fixes

### Fix division mismatch when switching leagues (`d85b8b5`)
Division codes from one league were being applied to another league after switching.

### Fix React hooks order (`9085d39`, `64017fb`)
Moved loading guards to prevent hooks from running before data was available, fixing conditional hook call violations.

### Add loading guard when divisions are empty (`d2c8f5c`)
Prevents rendering App content before league data has loaded.

---

## [2026-02-05] Initial Build & Rapid Feature Development

### Add Pool League Predictor app (`d0d11b2`)
Initial commit — full pool league prediction app with standings, fixtures, match predictions using Bayesian player ratings, and season simulation (Monte Carlo).

### Fix bugs, add features, and improve code quality (`cfbbed3`)
First batch of improvements after initial launch.

### Add 25/26 season player stats alongside 24/25 ratings (`780f467`)
Dual-season player statistics allowing comparison between current and prior season performance.

### Add What If Squad Builder (`bef57c7`)
Hypothetical team changes — swap players in/out and see projected impact on match win probability.

### Disambiguate Rich Williams into two separate players (`4344432`)
Data fix for name collision — two different players with identical names split into separate entities.

### Add collapsible How It Works & Glossary section (`6d9d333`)
Educational section explaining prediction methodology and terminology.

### Add lineup size filter (Best N) to Squad Builder (`f01abba`)
Squad Builder filter to optimise for best N players rather than full roster.

### Add Predict/Set Result buttons to Fixtures tab (`b08fcbf`, `2d1ef10`)
Quick-access prediction and manual result entry from the fixtures list.

### Show squad changes and before/after comparison (`1074ec7`)
Predict tab now shows what changed when squad is modified and the impact on win probability.

### Migrate to Next.js 15 with Firebase App Hosting and Genkit AI (`de55262`)
Major infrastructure upgrade from static site to Next.js 15 with server-side rendering, Firebase App Hosting, and Google Genkit for AI features.

### Add Firestore integration and LeagueAppLive scraper (`e39dabe`)
Backend data layer with Firestore for persistent storage and automated scraping from LeagueAppLive.com for match results and fixtures.

### Add frame drill-down to match results (`9deb3f5`)
Click into any match result to see individual frame-by-frame scores.

### Add tactical edge features (`3e94d22`)
Form trends, home/away splits, head-to-head matrix, set analysis, and break & dish statistics.

### Add composite tactical features (`a429ed1`)
Scouting reports, lineup suggester, and must-win match analysis.

### Rebrand to Pool League Pro (`a419136`, `ab97bee`)
Full UI overhaul with premium identity — dark theme, gold accents, refined typography, and cohesive visual language.

### Add Bayesian adjusted win% and Time Machine (`5795d4d`)
Bayesian-adjusted win percentages for fairer early-season estimates. Time Machine feature to view standings as they were on any historical date. Merged Fixtures and What-If tabs.

### Fix AI match analysis (`8366ce6`)
AI analysis now uses computed prediction probabilities rather than placeholder values.

### Fix Time Machine to show true historical state (`09bdddf`)
Time Machine now correctly filters all data sources (results, standings, stats) to the selected date.

### Add personalised My Team dashboard (`472eefa`)
Set a favourite team and get a personalised dashboard with upcoming fixtures, recent results, team stats, and AI-generated team reports.

### Blend 24/25 prior into predictions (`7577adf`, `1ea5b28`)
Early-season prediction accuracy improved by blending prior season performance with conservative priors for unknown players.

### Add light/dark mode (`9868441`)
System preference auto-detection with manual toggle. Light mode with enhanced contrast for readability. Dark mode with thinner anti-aliased strokes.

### Mobile bottom tab bar and multi-league architecture (`e55d8b9`)
Fixed bottom navigation bar for mobile. Architectural foundation for supporting multiple leagues with separate data and branding.

### Back-to-top button and polish (`758b29f`)
Floating back-to-top button, auto scroll-to-top on tab change, match analysis and frame data fixes.

### Beta polish (`33e7aca`)
Clean footer, tabbed glossary, rating explanations, error message sanitisation, dynamic league name display.

### UI refinements (`42345a0`, `5cdd39f`, `063d54d`)
Tooltip improvements, frame row alignment fixes, title race and relegation table alignment fixes.

### Add Time Machine to Simulate tab (`b488d93`)
Season simulation can now be run from any historical date to see how projections would have looked mid-season.

---

## Architecture Overview

**Stack:** Next.js 15 (App Router) | TypeScript | Tailwind CSS | Framer Motion | Firebase (Auth, Firestore, Cloud Functions, Analytics) | Genkit AI | Recharts

**Key directories:**
- `src/app/` — Next.js pages, API routes, and global styles
- `src/components/` — React components (tabs, modals, sheets, auth, admin)
- `src/lib/` — Core logic (predictions, data providers, router, sync, stats)
- `src/hooks/` — Custom React hooks (app state, my team, notifications, search)
- `scripts/` — Build scripts (service worker generation, data sync, migrations)

**Data flow:** LeagueAppLive scraper &rarr; Firebase Cloud Functions &rarr; Firestore &rarr; DataProvider &rarr; ActiveDataProvider (with Time Machine filtering) &rarr; UI components

**Prediction engine:** Bayesian player ratings &rarr; team strength aggregation &rarr; Monte Carlo frame simulation &rarr; match/season outcome probabilities
