# Pool League Pro

A full-featured Progressive Web App for pool league management, match prediction, and season simulation. Built with Next.js 15, Firebase, and Gemini AI.

**Live:** Deployed via Firebase App Hosting
**Stack:** Next.js 15 (App Router) | TypeScript | Tailwind CSS | Framer Motion | Firebase | Genkit AI | Recharts

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Deployment](#deployment)
- [Data Sync & Maintenance](#data-sync--maintenance)
- [Adding a New League](#adding-a-new-league)
- [Admin Tools](#admin-tools)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Further Documentation](#further-documentation)

---

## Features

### Core
- **Live Standings** — league tables updated automatically after match nights, with projected finishes and power rankings
- **Match Predictions** — Bayesian player ratings drive frame-level Monte Carlo simulations to predict match outcomes with calibrated probabilities
- **Season Simulation** — full-season Monte Carlo simulation showing title race, relegation probabilities, and projected final standings
- **Squad Builder** — swap players in/out of teams and see the impact on predicted win probability
- **Lineup Optimizer** — AI-powered lineup ordering to maximise match win probability given available players

### Analytics & Insights
- **Player Stats** — ratings, form trends, home/away splits, consistency metrics, career trend tracking across seasons
- **Head-to-Head** — player and team H2H records, comparative charts, and side-by-side player comparisons
- **Scouting Reports** — tactical summaries with strengths, weaknesses, and B&D (break and dish) statistics
- **AI Match Analysis** — Gemini-powered natural language analysis of matches, players, and team reports
- **Time Machine** — view standings, stats, and predictions as they were on any historical date

### Captain's Dashboard
- **Player Availability** — track who's available for upcoming matches
- **Season Goals** — set and monitor team targets
- **Opponent Scouting** — pre-match scouting reports for upcoming opponents
- **Lineup Recommendations** — AI-suggested lineups based on opponent and availability

### User Features
- **My Team** — set a favourite team for a personalised dashboard
- **Push Notifications** — FCM-powered alerts for match results, fixtures, and more (with quiet hours, team/division filters)
- **Email Digests** — daily and weekly email summaries via Resend
- **Prediction Tracking** — track prediction accuracy with calibration charts and historical trends
- **Social Sharing** — shareable links with auto-generated OG images for predictions, standings, teams, and simulations
- **Calendar Export** — download fixtures as `.ics` files

### Technical
- **Multi-League** — supports multiple leagues with separate data, branding, and division structures
- **PWA / Offline** — installable, works offline with Cache API and background sync
- **Light/Dark Mode** — system preference auto-detection with manual toggle
- **Progressive CSS** — 10 cutting-edge CSS features (View Transitions, scroll-driven animations, `@starting-style`, glassmorphism, `color-mix()`, etc.) with graceful fallbacks
- **Responsive** — mobile-first with bottom tab bar, swipeable bottom sheets, and safe area handling

---

## Architecture

```
Browser
  |
  v
Next.js 15 (App Router)
  |-- Pages (SSR/SSG)
  |-- API Routes (/api/*)
  |-- Genkit AI Flows (/src/ai/flows/)
  |
  v
Firebase
  |-- Firestore (league data, user profiles, sessions, notifications)
  |-- Auth (Google OAuth)
  |-- Cloud Functions (scheduled data sync)
  |-- Analytics (GA4)
  |-- Cloud Messaging (push notifications)
```

### Data Flow

```
LeagueAppLive.com  --(scrape)-->  Cloud Functions (scheduled)
                                        |
                                        v
                                   Firestore
                                   /leagues/{id}/seasons/{id}
                                        |
                                        v
                              DataProvider (client)
                              static JSON fallback -> Cache API -> Firestore
                                        |
                                        v
                              ActiveDataProvider
                              (applies Time Machine date filter)
                                        |
                                        v
                                   UI Components
```

### Prediction Engine

1. **Player Ratings** — Bayesian-adjusted win percentages using 24/25 season priors blended with current 25/26 results. Unknown players get a conservative prior.
2. **Team Strength** — aggregated from individual player ratings weighted by games played
3. **Frame Simulation** — Monte Carlo simulation of individual frames using player matchup probabilities
4. **Match Outcome** — thousands of simulated matches produce win/draw/loss probabilities with confidence intervals
5. **Season Projection** — remaining fixtures simulated many times to produce finishing position distributions

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+
- Firebase project (Firestore, Auth, Cloud Functions, Cloud Messaging)
- Gemini API key (for AI features)
- Resend API key (for email notifications, optional)

### Install

```bash
git clone https://github.com/thewrexhamite/pool-league-predictor.git
cd pool-league-predictor
npm install
```

### Configure Environment

```bash
cp .env.local.example .env.local
# Edit .env.local with your Firebase, Gemini, and Resend credentials
```

### Run Development Server

```bash
npm run dev
```

The app runs at `http://localhost:3000` using Next.js Turbopack.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | Firebase client API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Firebase project ID (`pool-league-predictor`) |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | FCM sender ID (for push notifications) |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | Firebase app ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | No | GA4 measurement ID |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | No | FCM VAPID key (for web push) |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `GEMINI_MODEL` | No | AI model ID (default: `googleai/gemini-2.0-flash`) |
| `CRON_SECRET` | No | Secret for authenticating cron/sync API calls |
| `RESEND_API_KEY` | No | Resend API key for email notifications |

---

## Development

### NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | ESLint check |
| `npm run typecheck` | TypeScript type check (no emit) |
| `npm test` | Run Jest test suite |
| `npm run test:watch` | Jest in watch mode |
| `npm run test:coverage` | Jest with coverage report |
| `npm run sync-data` | Manual single-league data sync (local) |
| `npm run build-data` | Build static JSON data files |
| `npm run genkit:dev` | Start Genkit AI dev server |

### Pre-build Hook

The `prebuild` and `predev` scripts run `scripts/generate-sw.js` to generate the service worker, combining Firebase Cloud Messaging with offline caching strategies.

---

## Deployment

### Firebase App Hosting (Primary)

The app is deployed via **Firebase App Hosting**, configured in `apphosting.yaml` and `firebase.json`.

```bash
# Deploy the web app
firebase deploy --only hosting

# Deploy Firestore security rules
firebase deploy --only firestore:rules

# Deploy Cloud Functions (data sync)
cd functions && npm run deploy
```

**Important:** Always check the active Firebase project before deploying:

```bash
firebase use
# Should show: pool-league-predictor
```

### Firebase Cloud Functions

The `functions/` directory contains scheduled sync functions. To deploy:

```bash
cd functions
npm install
npm run build    # esbuild bundles src/index.ts + copies league-config.json
npm run deploy   # OR: firebase deploy --only functions
```

The build step uses esbuild to bundle `functions/src/index.ts` and copies `league-config.json` into `functions/lib/` so the functions can read league configuration at runtime.

### CI/CD

GitHub Actions runs on every push and PR (`.github/workflows/ci.yml`):
1. TypeScript type check
2. ESLint
3. Jest tests
4. Production build

---

## Data Sync & Maintenance

### How Data Sync Works

League data is scraped from [LeagueAppLive.com](https://leagueapplive.com) and stored in Firestore. The sync pipeline:

1. Fetches division pages for each configured league
2. Parses match results, fixtures, player stats, rosters, and frame data
3. Performs incremental sync (only scrapes frame details for new results)
4. Writes to Firestore at `/leagues/{leagueId}/seasons/{seasonId}`
5. Optionally writes local JSON files (for static fallback data)

### Automated Sync (Cloud Functions)

Four scheduled functions run automatically:

| Function | Schedule | Purpose |
|----------|----------|---------|
| `syncSunNight` | 23:00 UTC Sunday | After Sunday match night |
| `syncMonMorning` | 08:00 UTC Monday | Morning catch-up |
| `syncWedNight` | 23:00 UTC Wednesday | After Wednesday match night |
| `syncThuMorning` | 08:00 UTC Thursday | Morning catch-up |

Each run syncs **all configured leagues** sequentially with a 30-second pause between leagues to avoid rate limiting.

### Manual Sync

**Via HTTP trigger:**
```bash
curl -X POST https://<region>-pool-league-predictor.cloudfunctions.net/syncLeaguesHttp \
  -H "x-sync-key: YOUR_SYNC_AUTH_KEY" \
  -G -d "league=wrexham"   # or league=all
```

**Via local script:**
```bash
npm run sync-data          # Syncs default league
tsx scripts/sync-all.ts    # Syncs all leagues with report
```

### Monitoring Sync Health

- Cloud Function logs are available in the Firebase Console under **Functions > Logs**
- Each sync run reports: results count, fixtures count, frames scraped, requests made, skipped frames, duration
- Failed syncs throw errors that appear in Cloud Function error logs
- The app shows a "Data updated X ago" indicator in the header

### Updating Static Fallback Data

The app falls back to static JSON files in `data/wrexham/` when Firestore is unavailable. To update:

```bash
npm run sync-data    # Writes to data/*.json
npm run build        # Bundles the updated JSON
```

---

## Adding a New League

1. **Add league to `league-config.json`:**
   ```json
   "newleague": {
     "site": "newleague",
     "leagueId": "newleague",
     "seasonId": "2526",
     "leagueName": "New League Name",
     "shortName": "NL",
     "primaryColor": "#FF6600",
     "dataDir": "data/newleague",
     "divisions": [
       { "code": "D1", "siteGroup": "Division One" },
       { "code": "D2", "siteGroup": "Division Two" }
     ],
     "teamNameMap": {}
   }
   ```

2. **Create the data directory:**
   ```bash
   mkdir data/newleague
   ```

3. **Seed league metadata in Firestore:**
   ```bash
   tsx scripts/seed-leagues.ts
   ```

4. **Run initial sync:**
   ```bash
   tsx scripts/sync-data.ts --league newleague
   ```

5. **Rebuild and deploy** — the league will appear automatically in the landing page league selector.

The `teamNameMap` field is for normalising team names when the source site uses different names than you want displayed (e.g., `"The Eagles A": "Eagles A"`).

---

## Admin Tools

The admin dashboard is available at `/admin` and requires an admin role on the user's Firebase Auth profile.

### Setting Up an Admin User

```bash
tsx scripts/set-admin.ts <firebase-uid>
```

### Admin Features

- **League Management** — create, edit, and configure leagues
- **Data Corrections** — fix incorrect results or player data
- **Manual Result Entry** — enter results when automated sync misses them
- **Player Merge** — deduplicate players who appear under different names
- **Player Linking** — link the same player across different leagues/seasons
- **League Settings** — configure league-specific options (branding, divisions, data source)
- **League Health Metrics** — monitor data completeness and quality
- **User Management** — view users and assign admin roles

All admin API endpoints are protected by authentication middleware that verifies both Firebase Auth and admin role.

---

## API Reference

### Public Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sync` | POST | Trigger data sync (requires `CRON_SECRET` header) |
| `/api/calendar/export` | GET | Export fixtures as `.ics` file |
| `/api/og/prediction` | GET | Generate OG image for a prediction |
| `/api/og/simulation` | GET | Generate OG image for a simulation |
| `/api/og/standings` | GET | Generate OG image for standings |
| `/api/og/team` | GET | Generate OG image for a team |

### Notification Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notifications/subscribe` | POST | Subscribe to push notifications |
| `/api/notifications/unsubscribe` | POST | Unsubscribe from push |
| `/api/notifications/email/subscribe` | POST | Subscribe to email notifications |
| `/api/notifications/email/unsubscribe` | POST/GET | Unsubscribe from email (supports one-click) |
| `/api/notifications/send` | POST | Send a test notification |
| `/api/notifications/history` | GET | Get notification history |

### Cron Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cron/daily-digest` | POST | Send daily email digest |
| `/api/cron/weekly-digest` | POST | Send weekly email digest |

### Admin Endpoints (Require Admin Auth)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/leagues` | GET/POST | List/create leagues |
| `/api/admin/leagues/[leagueId]` | GET/PUT/DELETE | Manage specific league |
| `/api/admin/leagues/settings` | GET/PUT | League settings |
| `/api/admin/results` | POST/PUT | Manual result entry/correction |
| `/api/admin/players/merge` | POST | Merge duplicate players |
| `/api/admin/players/link` | POST | Link player identities |
| `/api/admin/users` | GET/PUT | User management |
| `/api/admin/data-sources` | GET/PUT | Data source configuration |
| `/api/admin/analytics` | GET | League health analytics |

---

## Project Structure

```
pool-league-predictor/
|-- src/
|   |-- app/                    # Next.js App Router
|   |   |-- globals.css         # Global styles + CSS features
|   |   |-- layout.tsx          # Root layout with providers
|   |   |-- page.tsx            # Home page
|   |   |-- admin/              # Admin pages
|   |   |-- auth/               # Auth pages
|   |   |-- api/                # API routes (25 endpoints)
|   |   |-- share/              # Social sharing pages
|   |-- components/             # React components (~100 files)
|   |   |-- App.tsx             # Main app shell
|   |   |-- AppHeader.tsx       # Header with nav, search, dropdowns
|   |   |-- AppTabs.tsx         # Tab container with transitions
|   |   |-- BottomTabBar.tsx    # Mobile bottom navigation
|   |   |-- LeagueSelector.tsx  # Landing page / league picker
|   |   |-- DashboardTab.tsx    # Home dashboard
|   |   |-- tabs/               # Tab containers (Standings, Matches, Stats, MyTeam)
|   |   |-- ui/                 # Shared UI (DetailSheet, ScrollProgress, etc.)
|   |   |-- auth/               # Auth components (UserMenu, etc.)
|   |   |-- admin/              # Admin components (13 files)
|   |   |-- dashboard/          # Dashboard widget components
|   |-- lib/                    # Core logic (~58 files)
|   |   |-- data-provider.tsx   # Data fetching: static -> cache -> Firestore
|   |   |-- active-data-provider.tsx  # Time Machine filtering layer
|   |   |-- firebase.ts         # Firebase client init
|   |   |-- types.ts            # TypeScript type definitions
|   |   |-- router.ts           # Hash-based client router
|   |   |-- sync-pipeline.ts    # Scraping & sync logic
|   |   |-- predictions/        # Prediction engine modules
|   |   |-- stats/              # Statistics modules (10 files)
|   |   |-- auth/               # Auth utilities
|   |   |-- sync/               # User data sync
|   |   |-- email-templates/    # Email templates (4 files)
|   |   |-- view-transitions.ts # View Transitions API utility
|   |-- hooks/                  # Custom React hooks
|   |-- ai/                     # Genkit AI flows
|       |-- flows/              # AI flow definitions
|-- functions/                  # Firebase Cloud Functions
|   |-- src/index.ts            # Scheduled sync + HTTP trigger
|-- scripts/                    # Build & maintenance scripts (12 files)
|-- data/                       # Static JSON data (all leagues)
|   |-- wrexham/                # Wrexham & District
|   |-- nwpa/                   # North Wales Pool Association
|   |-- chester/                # Chester & District
|-- league-config.json          # Multi-league configuration
|-- firebase.json               # Firebase project config
|-- apphosting.yaml             # Firebase App Hosting config
|-- CHANGELOG.md                # Full project history
|-- docs/                       # Additional documentation
```

---

## Testing

### Unit Tests

```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage report
```

Tests use Jest with React Testing Library. Test files are co-located with source (`*.test.ts`, `*.test.tsx`).

### Type Checking

```bash
npm run typecheck       # TypeScript strict mode check
```

### Linting

```bash
npm run lint            # ESLint with Next.js rules
```

### Manual Testing Guides

See `docs/` for detailed testing guides:
- [PWA Testing Guide](docs/MOBILE_PWA_TESTING_GUIDE.md)
- [Lighthouse PWA Audit Guide](docs/LIGHTHOUSE_PWA_AUDIT_GUIDE.md)
- [Admin Test Checklist](docs/E2E_ADMIN_TEST_CHECKLIST.md)

---

## Further Documentation

### System Documentation

| Document | Description |
|----------|-------------|
| [docs/PREDICTIONS.md](docs/PREDICTIONS.md) | Prediction engine — Bayesian ratings, Monte Carlo simulation, lineup optimization |
| [docs/STATISTICS.md](docs/STATISTICS.md) | Statistics & analytics — power rankings, clutch index, cross-league comparison |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Data architecture — providers, caching, sync pipeline, Firestore structure |
| [docs/ADMIN.md](docs/ADMIN.md) | Admin system — league management, data corrections, player merge/link |
| [docs/API.md](docs/API.md) | API reference — all endpoints with request/response schemas |
| [docs/FEATURES.md](docs/FEATURES.md) | Gamification, AI, auth & notifications systems |
| [docs/KIOSK.md](docs/KIOSK.md) | Chalk kiosk — real-time pool table queue management system |

### Testing & Deployment

| Document | Description |
|----------|-------------|
| [CHANGELOG.md](CHANGELOG.md) | Full commit history grouped by feature |
| [docs/DATA-SOURCE-INTEGRATION.md](docs/DATA-SOURCE-INTEGRATION.md) | Data source factory pattern |
| [docs/multi-league-setup.md](docs/multi-league-setup.md) | Multi-league setup guide |
| [docs/MOBILE_PWA_TESTING_GUIDE.md](docs/MOBILE_PWA_TESTING_GUIDE.md) | Mobile PWA testing procedures |
| [docs/LIGHTHOUSE_PWA_AUDIT_GUIDE.md](docs/LIGHTHOUSE_PWA_AUDIT_GUIDE.md) | PWA audit methodology |
| [docs/E2E_ADMIN_TEST_CHECKLIST.md](docs/E2E_ADMIN_TEST_CHECKLIST.md) | Admin feature test checklist |
| [docs/FEATURE_COMPLETE.md](docs/FEATURE_COMPLETE.md) | Feature completion status tracker |

---

## License

Private project. All rights reserved.
