# Admin System

The admin dashboard at `/admin` provides league management, data correction, player operations, and monitoring tools. Protected by Firebase Auth with admin role verification.

**Location:** `src/components/admin/`, `src/app/api/admin/`

---

## Table of Contents

- [Overview](#overview)
- [Authentication & Authorization](#authentication--authorization)
- [Admin Dashboard](#admin-dashboard)
- [League Management](#league-management)
- [Data Corrections](#data-corrections)
- [Manual Result Entry](#manual-result-entry)
- [Player Merge](#player-merge)
- [Player Linking](#player-linking)
- [Captain Verification](#captain-verification)
- [League Settings](#league-settings)
- [Data Source Configuration](#data-source-configuration)
- [League Health Metrics](#league-health-metrics)
- [User Management](#user-management)

---

## Overview

The admin system consists of:
- **AdminGuard** — wraps the admin UI, checking auth + admin role
- **AdminDashboard** — hub with stats cards and navigation to 9+ admin tools
- **Admin API routes** — all at `/api/admin/*`, protected by server-side auth middleware
- **Admin components** — modular panels for each tool

---

## Authentication & Authorization

### Client Side

`AdminGuard` component checks:
1. User is authenticated (Firebase Auth)
2. User has admin role (Firestore profile `isAdmin: true`)
3. Shows login prompt if unauthenticated, access denied if not admin

### Server Side

`verifyAdminAccess(request)` in `src/lib/auth/server-auth.ts`:
1. Extracts Bearer token from Authorization header
2. Verifies token with Firebase Admin SDK
3. Checks `users/{userId}` document for `isAdmin: true`
4. Returns `userId` if authorized, `null` otherwise

### Setting Up an Admin

```bash
tsx scripts/set-admin.ts <firebase-uid>
```

Self-demotion is prevented — admins cannot revoke their own admin status via the API.

---

## Admin Dashboard

**File:** `AdminDashboard.tsx`

Displays at-a-glance stats:
- Divisions count, Teams count, Results count, Frames count

Grid of admin tools with navigation to each feature panel.

---

## League Management

**Files:** `LeagueForm.tsx`, API at `/api/admin/leagues`

### Create League (POST `/api/admin/leagues`)

```json
{
  "name": "New League Name",
  "shortName": "NL",
  "primaryColor": "#FF6600",
  "logo": "https://...",
  "lat": 53.0,
  "lng": -3.0,
  "seasons": ["2526"]
}
```

Validates hex color format. Returns 201 on success.

### Update League (PUT `/api/admin/leagues/[leagueId]`)

Accepts partial `LeagueConfig` — all fields optional.

### Delete League (DELETE `/api/admin/leagues/[leagueId]`)

Cascade deletes subcollections (seasons, data sources). Returns deletion summary with counts.

### League Form UI

- League name, short name, primary color picker
- Automatic geocoding lookup (coordinates from league name)
- Season management (add/remove)

---

## Data Corrections

**File:** `DataCorrectionPanel.tsx`, API at PATCH `/api/admin/results`

Allows reviewing and editing match result scores:
- Expandable result list color-coded by outcome
- Inline edit mode for scores
- Score validation (non-negative, whole numbers)

### API

```json
{
  "seasonId": "2526",
  "resultIndex": 42,
  "result": {
    "home_score": 6,
    "away_score": 4
  }
}
```

---

## Manual Result Entry

**File:** `ManualResultEntry.tsx`, API at POST `/api/admin/results`

For entering results when automated sync misses them:
- Date picker, team selection dropdowns
- Interactive score entry with +/- buttons
- Constraint: scores must sum to 10
- Team validation (home != away)

### API

```json
{
  "seasonId": "2526",
  "result": {
    "date": "15-02-2026",
    "home": "Eagles A",
    "away": "Nomads B",
    "home_score": 7,
    "away_score": 3,
    "division": "SD1"
  }
}
```

Frames defaults to sum of scores if not provided.

---

## Player Merge

**File:** `PlayerMergePanel.tsx`, API at POST `/api/admin/players/merge`

Merges duplicate player entries into a single canonical record. Used when the same player appears under different name spellings.

### Process

1. Search players by name (minimum 2 characters)
2. Select 2+ players to merge
3. Choose primary (target) player name
4. Preview combined stats
5. Submit merge

### API

```json
{
  "seasonId": "2526",
  "sourcePlayerNames": ["John Smith", "J. Smith"],
  "targetPlayerName": "John Smith"
}
```

### What Happens

1. Rosters updated (source names replaced with target)
2. Player stats merged (weighted by games played)
3. Current season stats (2526) merged
4. All frame data references updated

Returns change counts: `rostersUpdated`, `playersRemoved`, `players2526Removed`, `framesUpdated`.

---

## Player Linking

**File:** `PlayerLinking.tsx`, API at POST `/api/admin/players/link`

Links the same player across different leagues without merging their data. Creates a `PlayerLink` in the `playerIdentities` collection.

- Cross-league searchable player table
- Automatic duplicate detection (same name, different leagues)
- Batch selection with quick-select duplicates button

---

## Captain Verification

**File:** `CaptainVerificationPanel.tsx`, API at `/api/admin/captains`

Manages captain claim requests:
- Lists pending (unverified) captain claims
- Displays claim info: user, team, division, league, season
- Verify or reject each claim

Verified captains unlock captain-specific features (lineup optimizer, captain's toolkit).

---

## League Settings

**File:** `LeagueSettingsPanel.tsx`, API at `/api/admin/leagues/settings`

Configurable league-wide settings:
- League name
- Primary/secondary colors (hex validation)
- Contact email (email validation)
- Feature toggles: notifications enabled, predictions enabled

---

## Data Source Configuration

**File:** `DataSourceConfig.tsx`, API at `/api/admin/data-sources`

Configure how league data is ingested:

| Source Type | Fields | Description |
|-------------|--------|-------------|
| `leagueapplive` | URL | Scrape from LeagueAppLive.com |
| `rackemapp` | URL | Scrape from RackEmApp.com |
| `manual` | (none) | Manual data upload |
| `api` | Endpoint URL, API key | External API integration |

Each source can be enabled/disabled independently.

---

## League Health Metrics

**File:** `LeagueHealthMetrics.tsx`, API at GET `/api/admin/analytics`

Displays league engagement and data health:

| Category | Metrics |
|----------|---------|
| **Users** | Total, active, admin, notification subscribers |
| **Engagement** | Active in last 7/30 days, recent logins, subscriptions |
| **Growth** | New users 7/30 days, growth rate |
| **League Data** | Players, teams, divisions, matches, fixtures |

---

## User Management

**API:** GET/PATCH `/api/admin/users`

### List Users (GET)

Paginated user list with:
- `limit` (default 50), `offset` (default 0)
- Returns user profiles with pagination metadata

### Update Admin Role (PATCH)

```json
{
  "userId": "firebase-uid",
  "isAdmin": true
}
```

Safety: prevents self-demotion.
