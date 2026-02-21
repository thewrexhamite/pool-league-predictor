# Data Architecture

How data flows from external sources through Firestore to the UI, including caching, offline support, and the Time Machine feature.

---

## Table of Contents

- [Overview](#overview)
- [Data Flow](#data-flow)
- [Type System](#type-system)
- [Data Provider](#data-provider)
- [Active Data Provider](#active-data-provider)
- [League Context](#league-context)
- [Time Machine](#time-machine)
- [Cache Strategies](#cache-strategies)
- [Sync Pipeline](#sync-pipeline)
- [Player Identity](#player-identity)
- [Firestore Structure](#firestore-structure)
- [Multi-League Configuration](#multi-league-configuration)
- [File Reference](#file-reference)

---

## Overview

The app uses an offline-first, multi-layer data architecture:

```
External Sources (LeagueAppLive, RackEmApp)
    |
    v  (scrape)
Sync Pipeline
    |
    v  (write)
Firestore + Static JSON
    |
    v  (fetch with fallback)
DataProvider (React Context)
    |
    v  (optional time filter)
ActiveDataProvider
    |
    v
UI Components + Prediction Engine
```

---

## Data Flow

### Loading Priority

The `DataProvider` uses a multi-layer fallback pattern:

```
1. getCachedDataSync()     -> localStorage (SSR-safe, synchronous)
2. getStaticData()         -> bundled JSON (wrexham/2526 only)
3. getEmptyData()          -> empty defaults for other leagues
          |
          v  (after render, async)
4. getCachedData()         -> Cache API, then localStorage
5. fetchFromFirestore()    -> only if lastUpdated > cached timestamp
6. setCachedData()         -> save to Cache API + localStorage
```

When the browser comes back online, an event listener triggers a re-sync from Firestore.

### Cache Keys

- **Cache API:** `pool-league-data-v1` cache store
- **Per-league key:** `pool-league-${leagueId}-${seasonId}-data`
- **Timestamp key:** `pool-league-${leagueId}-${seasonId}-ts`
- **Max age:** 1 year (stale data is better than no data for offline)

---

## Type System

**File:** `src/lib/types.ts`

### Match & Result Types

| Type | Purpose |
|------|---------|
| `MatchResult` | Completed match (date, teams, scores, division, frame count) |
| `Fixture` | Upcoming match with optional venue |
| `FrameData` | Individual frame-level player results per match |
| `TeamResult` | Enriched result with perspective (home/away, opponent, result) |

### Player Types

| Type | Purpose |
|------|---------|
| `PlayerStats2425` | Prior season stats (rating `r`, win% `w`, games `p`) |
| `PlayersMap` | `Record<string, PlayerStats2425>` |
| `PlayerData2526` | Current season with per-team breakdown |
| `Players2526Map` | `Record<string, PlayerData2526>` |
| `PlayerTeamStats2526` | Stats within a specific team (p, w, pct, bdF, bdA, forf) |
| `TeamPlayer` | Combined roster + stats for display |

### League Structure

| Type | Purpose |
|------|---------|
| `Division` | Name + team list |
| `Divisions` | `Record<DivisionCode, Division>` |
| `LeagueMeta` | League metadata (id, name, colors, seasons) |
| `SeasonMeta` | Season details (id, label, current, status, divisions) |

### Prediction Types

| Type | Purpose |
|------|---------|
| `PredictionResult` | Match prediction probabilities and expected scores |
| `PredictionSnapshot` | Tracked prediction with actual result and accuracy |
| `AccuracyStats` | Aggregate prediction accuracy with calibration buckets |

---

## Data Provider

**File:** `src/lib/data-provider.tsx`

React context that manages league data with caching and offline support.

### `LeagueData` Shape

```typescript
{
  results: MatchResult[],
  fixtures: Fixture[],
  players: PlayersMap,
  rosters: RostersMap,
  players2526: Players2526Map,
  frames: FrameData[],
  divisions: Divisions,
  knockouts: KnockoutCompetition[],
  lastUpdated: number,
  source: 'static' | 'cache' | 'firestore',
  isOffline: boolean,
  cacheAge: number
}
```

### Hook

`useLeagueData()` returns `{ data, loading, refreshing }`.

---

## Active Data Provider

**File:** `src/lib/active-data-provider.tsx`

Wraps the league data with an optional Time Machine filter. Without Time Machine, data passes through unchanged.

### `ActiveDataContextValue`

```typescript
{
  data: LeagueData,        // possibly filtered
  ds: DataSources,         // divisions, results, fixtures, players, rosters, players2526
  frames: FrameData[],     // filtered frames
  isTimeMachine: boolean
}
```

### Hook

`useActiveData()` — throws if used outside the provider.

---

## League Context

**File:** `src/lib/league-context.tsx`

Manages current league/season selection across the app.

### Selection Priority

1. URL params (`?league=X&season=Y`)
2. localStorage (persisted selection)
3. Default (wrexham)

### Hook

`useLeagueContext()` returns:
```typescript
{
  leagues: LeagueMeta[],
  loading: boolean,
  selected: { leagueId, seasonId, league } | null,
  selectLeague: (leagueId, seasonId) => void,
  clearSelection: () => void
}
```

Selection is persisted to localStorage and updates URL params. Logs `select_content` to Firebase Analytics.

---

## Time Machine

**File:** `src/lib/time-machine.ts`

Enables viewing the league state as it was on any past date.

### How It Works

`createTimeMachineData(leagueData, cutoffDate)`:
1. Filters results to those on or before the cutoff date
2. Filters frames to those on or before the cutoff date
3. Moves future results back to the fixtures array (for simulation)
4. Reconstructs player stats from filtered frame data via `reconstructPlayerStats()`

### Player Stats Reconstruction

`reconstructPlayerStats(frames, cutoffDate)` rebuilds `Players2526Map` entirely from frame data:
- Tracks per-player per-team statistics
- Calculates wins, games played, win%, BD for/against, forfeits
- Result: accurate player stats as they were on that date

### Available Dates

`getAvailableMatchDates(results)` extracts unique dates from results for the date picker UI.

---

## Cache Strategies

**File:** `src/lib/cache-strategies.ts`

Service Worker caching patterns used by the PWA:

| Strategy | Behaviour | Use Case |
|----------|-----------|----------|
| `cacheFirst` | Check cache, fallback to network | Static assets, images, fonts |
| `networkFirst` | Try network, fallback to cache | API requests, dynamic content |
| `staleWhileRevalidate` | Return cached immediately, update in background | Frequently updated content |
| `cacheFirstWithExpiration` | Cache with TTL (default 1 hour) | Data needing periodic refresh |

---

## Sync Pipeline

**File:** `src/lib/sync-pipeline.ts`

Scrapes league data from external sources and syncs to Firestore + static JSON files.

### Data Sources

| Source | Sites | Scraper |
|--------|-------|---------|
| LeagueAppLive | wrexham, nwpa | `sync-pipeline.ts` |
| RackEmApp | chester | `rackemapp-scraper.ts` |

### Sync Process

1. Fetch division pages for each configured league
2. Parse match results, fixtures, player stats, rosters, frame data
3. Incremental sync — only scrapes frame details for new results
4. Write to Firestore at `leagues/{leagueId}/seasons/{seasonId}`
5. Optionally write local JSON files for static fallback

### Anti-Detection

Both scrapers implement anti-detection measures:
- Variable request delays with jitter (base ~2.5s)
- Batch-based pausing (30-60s every 10 requests)
- User-Agent spoofing (Chrome 122)
- Adaptive backoff on rate limiting (429) and server errors (5xx)
- Max 3 retries per request, 30s timeout

---

## Player Identity

**File:** `src/lib/player-identity.ts`

Fuzzy matching for linking the same player across leagues.

### Matching

- `normalizePlayerName()` — lowercase, trim whitespace
- `calculateSimilarity()` — Levenshtein distance normalized to 0-1
- `calculateMatchConfidence()` — exact match = 1.0, same league = 0.0, otherwise similarity

### PlayerLink Management

- `createPlayerLink(canonicalId, players)` — create link with deduplication
- `mergePlayerLinks(links)` — combine multiple links
- `resolveCanonicalId(leagueId, playerId)` — lookup canonical ID

---

## Firestore Structure

```
leagues/
  {leagueId}/                          # LeagueMeta
    seasons/
      {seasonId}/                      # SeasonData
        results[]                      # MatchResult array
        fixtures[]                     # Fixture array
        players                        # PlayersMap (24/25)
        rosters                        # RostersMap
        players2526                    # Players2526Map
        divisions                      # Divisions
        knockouts[]                    # KnockoutCompetition array
        lastUpdated                    # Timestamp
        frames/
          {matchId}/                   # Optional subcollection
            frames[]                   # ScrapedFrame array

users/
  {userId}/                            # UserProfile
    notificationSubscription/
      active                           # Push notification preferences
    emailSubscription/
      active                           # Email notification preferences

gamification/
  {userId}/                            # PlayerInsights

miniLeagues/
  {miniLeagueId}/                      # MiniLeague

playerIdentities/
  {playerId}/                          # PlayerLink (cross-league)

dataSources/
  {leagueId}-{sourceType}/            # DataSourceConfig

settings/
  league                               # League-wide settings
```

---

## Multi-League Configuration

**File:** `league-config.json` (project root)

Defines all leagues, their data sources, divisions, and knockouts.

```json
{
  "wrexham": {
    "site": "wrexham",
    "leagueId": "wrexham",
    "seasonId": "2526",
    "leagueName": "Wrexham & District Pool League",
    "shortName": "Wrexham",
    "primaryColor": "#C8102E",
    "lat": 53.046,
    "lng": -2.993,
    "dataDir": "data",
    "divisions": [
      { "code": "SD1", "siteGroup": "Sunday Division 1" }
    ],
    "knockouts": [
      { "code": "WCUP", "name": "Wed Cup", "competitionId": "246" }
    ],
    "teamNameMap": {}
  }
}
```

**Supported data sources:**
- `"site": "wrexham"` — LeagueAppLive scraper
- `"site": "rackemapp"` — RackEmApp scraper (requires `rackemappLeague` field)

---

## File Reference

| File | Purpose |
|------|---------|
| `src/lib/types.ts` | Core TypeScript type definitions |
| `src/lib/data-provider.tsx` | Data fetching with multi-layer fallback |
| `src/lib/active-data-provider.tsx` | Time Machine filtering layer |
| `src/lib/league-context.tsx` | Multi-league selection context |
| `src/lib/time-machine.ts` | Historical date filtering |
| `src/lib/cache-strategies.ts` | Service Worker cache patterns |
| `src/lib/firebase.ts` | Firebase client initialization |
| `src/lib/sync-pipeline.ts` | Data ingestion from LeagueAppLive |
| `src/lib/rackemapp-scraper.ts` | Data ingestion from RackEmApp |
| `src/lib/player-identity.ts` | Cross-league player linking |
| `src/lib/unified-history.ts` | Combined league + chalk match history |
| `src/lib/dashboard-config.ts` | Configurable dashboard widgets (15 types) |
| `league-config.json` | Multi-league configuration |
