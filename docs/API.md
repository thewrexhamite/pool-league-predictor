# API Reference

All API routes live under `src/app/api/` using Next.js App Router route handlers.

---

## Table of Contents

- [Authentication](#authentication)
- [Admin Endpoints](#admin-endpoints)
- [Notification Endpoints](#notification-endpoints)
- [Sync Endpoints](#sync-endpoints)
- [Calendar Endpoints](#calendar-endpoints)
- [AI Endpoints](#ai-endpoints)
- [OG Image Endpoints](#og-image-endpoints)
- [Cron Endpoints](#cron-endpoints)

---

## Authentication

### Admin Routes

All `/api/admin/*` endpoints require:
- `Authorization: Bearer <firebase-id-token>` header
- The authenticated user must have `isAdmin: true` in their Firestore profile

### Cron/Sync Routes

The `/api/sync` endpoint requires:
- `Authorization: Bearer <CRON_SECRET>` header
- In development without `CRON_SECRET` set, auth is skipped

---

## Admin Endpoints

### Leagues

#### `GET /api/admin/leagues`

List all leagues.

**Response:**
```json
{
  "success": true,
  "leagues": [{ "id": "wrexham", "name": "Wrexham & District Pool League", ... }]
}
```

#### `POST /api/admin/leagues`

Create a new league.

**Body:**
```json
{
  "name": "League Name",
  "shortName": "LN",
  "primaryColor": "#FF6600",
  "logo": "https://...",
  "lat": 53.0,
  "lng": -3.0,
  "seasons": ["2526"]
}
```

**Response:** 201 with created league.

#### `GET /api/admin/leagues/[leagueId]`

Get a specific league.

#### `PUT /api/admin/leagues/[leagueId]`

Update a league. Body accepts partial `LeagueConfig`.

#### `DELETE /api/admin/leagues/[leagueId]`

Delete a league and its subcollections (seasons, data sources).

---

### League Settings

#### `GET /api/admin/leagues/settings`

Retrieve league settings.

#### `PATCH /api/admin/leagues/settings`

Update league settings. Validates hex colors and email format. Merges with existing settings.

---

### Results

#### `GET /api/admin/results`

List results with filtering.

**Query params:**
| Param | Default | Description |
|-------|---------|-------------|
| `leagueId` | `wrexham` | League to query |
| `seasonId` | (required) | Season to query |
| `division` | (all) | Filter by division |
| `team` | (all) | Filter by team |
| `limit` | 100 | Max results |

#### `POST /api/admin/results`

Create a new result.

**Body:**
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

Frames defaults to `home_score + away_score` if not provided.

#### `PATCH /api/admin/results`

Update an existing result by index.

**Body:**
```json
{
  "seasonId": "2526",
  "resultIndex": 42,
  "result": { "home_score": 6, "away_score": 4 }
}
```

#### `DELETE /api/admin/results`

Remove a result by index.

**Body:** `{ "seasonId", "resultIndex", "leagueId" }`

---

### Players

#### `POST /api/admin/players/merge`

Merge duplicate player entries.

**Body:**
```json
{
  "seasonId": "2526",
  "sourcePlayerNames": ["John Smith", "J. Smith"],
  "targetPlayerName": "John Smith",
  "leagueId": "wrexham"
}
```

**Response:**
```json
{
  "success": true,
  "changes": {
    "rostersUpdated": 2,
    "playersRemoved": 1,
    "players2526Removed": 1,
    "framesUpdated": 15
  }
}
```

#### `POST /api/admin/players/link`

Link player identities across leagues.

**Body:**
```json
{
  "playerId": "canonical-id",
  "linkedPlayers": ["wrexham:John Smith", "nwpa:John Smith"]
}
```

---

### Captains

#### `GET /api/admin/captains`

Fetch pending (unverified) captain claims.

#### `POST /api/admin/captains`

Verify or reject a captain claim.

**Body:**
```json
{
  "action": "verify",
  "userId": "firebase-uid",
  "league": "wrexham",
  "season": "2526",
  "team": "Eagles A"
}
```

---

### Data Sources

#### `GET /api/admin/data-sources`

List data sources. Optional `leagueId` query param to filter.

#### `POST /api/admin/data-sources`

Create a data source configuration.

**Body:**
```json
{
  "leagueId": "newleague",
  "sourceType": "leagueapplive",
  "config": { "url": "https://leagueapplive.com/newleague" },
  "enabled": true
}
```

---

### Users

#### `GET /api/admin/users`

Paginated user list. Query params: `limit` (default 50), `offset` (default 0).

#### `PATCH /api/admin/users`

Update user admin role. Prevents self-demotion.

**Body:** `{ "userId": "uid", "isAdmin": true }`

---

### Analytics

#### `GET /api/admin/analytics`

League health metrics.

**Response:**
```json
{
  "users": { "totalUsers": 150, "activeUsers": 42, "adminUsers": 2, "usersWithNotifications": 28 },
  "engagement": { "activeInLast7Days": 31, "activeInLast30Days": 42, "recentLogins": 18 },
  "growth": { "newUsersLast7Days": 5, "newUsersLast30Days": 12, "growthRate": 8.0 },
  "leagueData": { "totalPlayers": 320, "totalTeams": 40, "totalDivisions": 4, "totalMatches": 180 }
}
```

---

## Notification Endpoints

### Push Notifications

#### `POST /api/notifications/subscribe`

Subscribe to push notifications.

**Body:**
```json
{
  "token": "fcm-token",
  "userId": "firebase-uid",
  "preferences": {
    "match_results": true,
    "upcoming_fixtures": true,
    "standings_updates": false,
    "prediction_updates": true,
    "teamFilters": ["Eagles A"],
    "divisionFilters": ["SD1"],
    "quietHoursEnabled": true,
    "quietHoursStart": "22:00",
    "quietHoursEnd": "08:00"
  },
  "myTeam": { "team": "Eagles A", "div": "SD1" }
}
```

#### `POST /api/notifications/unsubscribe`

**Body:** `{ "userId": "firebase-uid" }`

### Email Notifications

#### `POST /api/notifications/email/subscribe`

**Body:**
```json
{
  "userId": "firebase-uid",
  "email": "user@example.com",
  "preferences": {
    "match_results": true,
    "upcoming_fixtures": true,
    "standings_updates": true,
    "weekly_digest": true
  },
  "frequency": "weekly"
}
```

Frequency options: `instant`, `daily`, `weekly`.

#### `POST /api/notifications/email/unsubscribe`

**Body:** `{ "userId": "firebase-uid" }`

---

## Sync Endpoints

#### `POST /api/sync`

Trigger data synchronization from external sources.

**Auth:** `Authorization: Bearer <CRON_SECRET>`

**Body:**
```json
{
  "league": "wrexham",
  "dryRun": false
}
```

Omit `league` to sync all configured leagues.

**Response:**
```json
{
  "success": true,
  "leagues": 3,
  "totals": { "results": 180, "fixtures": 40, "frames": 1800, "players": 320 },
  "details": [
    { "league": "wrexham", "success": true, "results": 80, "fixtures": 20, "frames": 800, "players": 160 }
  ]
}
```

On failure, sends error notifications via `sendSyncErrorNotification()`.

---

## Calendar Endpoints

#### `GET /api/calendar/export`

Export fixtures as an iCalendar (.ics) file.

**Query params:**
| Param | Required | Description |
|-------|----------|-------------|
| `division` | Yes | Division code |
| `team` | No | Filter to specific team |

**Response:** `text/calendar` content with `Content-Disposition: attachment` header.

---

## AI Endpoints

#### `GET /api/ai/status`

Check AI configuration status.

**Response:**
```json
{
  "configured": true,
  "model": "googleai/gemini-2.0-flash",
  "message": "AI features are configured and ready."
}
```

Returns `configured: false` if `GEMINI_API_KEY` is not set.

---

## OG Image Endpoints

Dynamic Open Graph image generation for social sharing.

| Endpoint | Purpose |
|----------|---------|
| `GET /api/og/prediction` | OG image for a match prediction |
| `GET /api/og/simulation` | OG image for a season simulation |
| `GET /api/og/standings` | OG image for division standings |
| `GET /api/og/team` | OG image for a team profile |

---

## Cron Endpoints

Scheduled email digest endpoints, typically triggered by Vercel Cron or Cloud Functions.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/cron/daily-digest` | POST | Send daily email digest to subscribers |
| `POST /api/cron/weekly-digest` | POST | Send weekly email digest to subscribers |
