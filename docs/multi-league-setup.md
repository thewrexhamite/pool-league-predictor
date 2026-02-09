# Multi-League Setup Guide

This guide provides step-by-step instructions for adding and configuring new leagues in Pool League Pro. The platform supports unlimited independent leagues, each with isolated data, custom branding, and configurable data sources.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Step 1: Create a New League](#step-1-create-a-new-league)
- [Step 2: Configure Data Source](#step-2-configure-data-source)
- [Step 3: Sync League Data](#step-3-sync-league-data)
- [Step 4: Verify League Display](#step-4-verify-league-display)
- [Step 5: Link Players (Optional)](#step-5-link-players-optional)
- [Advanced Configuration](#advanced-configuration)
- [Troubleshooting](#troubleshooting)
- [API Reference](#api-reference)

## Overview

Pool League Pro's multi-league infrastructure allows you to:

- **Add unlimited leagues** without code changes
- **Isolate league data** - each league has separate teams, players, and results
- **Custom branding** - league-specific colors and logos
- **Flexible data sources** - LeagueAppLive, manual upload, or API integration
- **Cross-league player tracking** - link players who appear in multiple leagues
- **Unified analytics** - players see combined stats across all their leagues

### Architecture

```
League A (Wrexham)         League B (NWPA)           League C (Custom)
    ↓                          ↓                          ↓
Data Source:               Data Source:               Data Source:
LeagueAppLive             LeagueAppLive              Manual Upload
    ↓                          ↓                          ↓
    └──────────────────────────┴──────────────────────────┘
                               ↓
                    Player Identity Linking
                               ↓
                    Unified Player Profiles
```

## Prerequisites

Before adding a new league, ensure you have:

- [ ] **Admin access** to the Pool League Pro admin dashboard
- [ ] **League information**:
  - Full league name (e.g., "North Wales Pool Association")
  - Short name for display (max 10 characters, e.g., "NWPA")
  - League brand color (hex format, e.g., "#FF5733")
  - League logo URL (optional)
- [ ] **Data source details**:
  - LeagueAppLive: league page URL
  - API: endpoint URL and API key
  - Manual: prepared data files
- [ ] **Firebase credentials** configured (for production)
- [ ] **Development environment** running (for testing)

## Quick Start

For experienced users, here's the TL;DR:

```bash
# 1. Start the admin dashboard
npm run dev
# Navigate to http://localhost:3000/admin

# 2. Create league via UI
# Click "Add League" → Fill form → Save

# 3. Configure data source
# Click league → "Configure Data Source" → Select type → Save

# 4. Sync data
npx tsx scripts/sync-data.ts --league <league-id>

# 5. Link players (if applicable)
npx tsx scripts/link-players.ts --dry-run
npx tsx scripts/link-players.ts  # Apply links
```

## Step 1: Create a New League

### Via Admin Dashboard (Recommended)

1. **Navigate to Admin Dashboard**
   ```
   http://localhost:3000/admin
   ```

2. **Click "Add League" Button**
   - Located in the header or empty state card

3. **Fill in League Details**

   | Field | Required | Format | Example |
   |-------|----------|--------|---------|
   | League Name | ✅ Yes | Full name | "North Wales Pool Association" |
   | Short Name | ✅ Yes | Max 10 chars | "NWPA" |
   | Primary Color | ✅ Yes | Hex code | "#1E88E5" |
   | Logo URL | ❌ No | Valid image URL | "https://example.com/logo.png" |
   | Seasons | ❌ No | Array of strings | ["2425", "2526"] |

4. **Validate and Save**
   - The form validates:
     - League name is not empty
     - Short name ≤ 10 characters
     - Primary color is valid hex (#RGB or #RRGGBB)
     - Logo URL (if provided) is a valid URL
   - Click **"Save League"**
   - Success message appears and dashboard refreshes

5. **Verify League Created**
   - New league appears in the league list
   - League ID is auto-generated from the name (e.g., `north-wales-pool-association`)

### Via API (Advanced)

For programmatic league creation:

```bash
curl -X POST http://localhost:3000/api/admin/leagues \
  -H "Content-Type: application/json" \
  -d '{
    "name": "North Wales Pool Association",
    "shortName": "NWPA",
    "primaryColor": "#1E88E5",
    "logo": "https://example.com/logo.png",
    "seasons": ["2425", "2526"]
  }'
```

Response:
```json
{
  "success": true,
  "message": "League created successfully",
  "leagueId": "north-wales-pool-association"
}
```

## Step 2: Configure Data Source

Each league requires a data source configuration to populate player, team, and results data.

### Available Data Source Types

| Type | Use Case | Configuration |
|------|----------|---------------|
| **LeagueAppLive** | Leagues hosted on LeagueAppLive platform | League page URL |
| **API Integration** | Custom API endpoints | API endpoint URL + API key |
| **Manual Upload** | Manual data entry or file import | No configuration needed |

### Via Admin Dashboard (Recommended)

1. **Navigate to League Detail Page**
   ```
   http://localhost:3000/admin/leagues/<league-id>
   ```
   Or click **"Edit"** button next to the league in the dashboard

2. **Click "Configure Data Source"**
   - Located in the "Data Sources" section

3. **Select Data Source Type**
   - Choose from dropdown: LeagueAppLive, API Integration, or Manual Upload

4. **Configure Source-Specific Settings**

   **For LeagueAppLive:**
   - Enter the league's LeagueAppLive URL
   - Example: `https://leagueapplive.com/leagues/north-wales-pool`
   - The scraper will automatically extract divisions, teams, and results

   **For API Integration:**
   - Enter API endpoint URL (e.g., `https://api.example.com/leagues/nwpa`)
   - Enter API key (stored securely, hidden in UI)
   - Ensure API follows Pool League Pro data format

   **For Manual Upload:**
   - No configuration required
   - Upload data files using admin tools or scripts

5. **Enable Data Source**
   - Toggle "Enable this data source" to active
   - This controls whether the source is used during sync

6. **Save Configuration**
   - Click **"Save Configuration"**
   - Success message appears
   - Data source appears in the league's data source table

### Via API (Advanced)

```bash
curl -X POST http://localhost:3000/api/admin/data-sources \
  -H "Content-Type: application/json" \
  -d '{
    "leagueId": "north-wales-pool-association",
    "sourceType": "leagueapplive",
    "config": {
      "url": "https://leagueapplive.com/leagues/north-wales-pool",
      "enabled": true
    }
  }'
```

Response:
```json
{
  "success": true,
  "message": "Data source configured successfully",
  "dataSourceId": "north-wales-pool-association-leagueapplive"
}
```

## Step 3: Sync League Data

After configuring the data source, sync data to populate the league with teams, players, and results.

### Using the Sync Script

The `sync-data.ts` script fetches data from the configured data source and writes it to Firestore.

1. **Run Sync with Dry Run (Recommended First)**
   ```bash
   npx tsx scripts/sync-data.ts --league <league-id> --dry-run
   ```

   Example:
   ```bash
   npx tsx scripts/sync-data.ts --league north-wales-pool-association --dry-run
   ```

   This will:
   - Validate the data source configuration
   - Fetch data from the source
   - Display what would be synced
   - **Not write to Firestore**

2. **Review Dry Run Output**
   ```
   === Multi-Source League Data Sync ===
     League: North Wales Pool Association (north-wales-pool-association)
     Season: 2526
     Source: leagueapplive
     Mode: DRY RUN (Firestore writes skipped)

   [12:34:56] Using data source factory: leagueapplive
   [12:34:56] Data source created: LeagueAppLive
   [12:34:57] Fetching divisions...
   [12:34:58] Fetching results...
   [12:34:59] Fetching fixtures...
   [12:35:00] Fetching players...
   [12:35:01] Fetching frames...

   ✅ Data fetched successfully
      Divisions: 4
      Results: 156
      Fixtures: 48
      Players: 128
      Frames: 1872
   ```

3. **Run Actual Sync**
   ```bash
   npx tsx scripts/sync-data.ts --league north-wales-pool-association
   ```

   This will:
   - Fetch data from the configured source
   - Write teams, players, results to Firestore
   - Create league-specific collections

4. **Verify Data in Firestore**
   - Open Firebase Console
   - Navigate to Firestore Database
   - Check collections:
     - `leagues/<league-id>/teams/2526/<team-id>`
     - `leagues/<league-id>/players/2526/<player-id>`
     - `leagues/<league-id>/results/2526/<result-id>`

### CLI Options

| Option | Description | Example |
|--------|-------------|---------|
| `--league <id>` | League ID to sync | `--league nwpa` |
| `--season <id>` | Season to sync (optional) | `--season 2526` |
| `--dry-run` | Preview without writing | `--dry-run` |
| `--source-type <type>` | Override data source type | `--source-type manual` |

### Scheduled Sync (Production)

For production environments, schedule regular syncs:

```bash
# Add to cron (daily at 2 AM)
0 2 * * * cd /path/to/app && npx tsx scripts/sync-data.ts --league nwpa

# Or use GitHub Actions workflow
# See .github/workflows/sync-data.yml
```

## Step 4: Verify League Display

After syncing data, verify the league displays correctly in the app.

### 1. Check League Selector

1. **Navigate to Home Page**
   ```
   http://localhost:3000/
   ```

2. **Open League Selector**
   - Click the league dropdown in the header
   - Should show all configured leagues

3. **Verify New League Appears**
   - League name and logo display correctly
   - League uses the configured primary color
   - Season dropdown shows available seasons

4. **Select New League**
   - Click on the new league
   - URL updates: `/?league=<league-id>&season=<season-id>`
   - Page refreshes with league data

### 2. Verify League Data

1. **Check Standings Table**
   - Teams display with correct stats (P, W, D, L, Pts)
   - Teams are grouped by division (if multi-division)
   - Table sorting works correctly

2. **Check Player Stats**
   - Click on a player name
   - Player detail modal shows:
     - Player name and team(s)
     - Win percentage and break dish stats
     - Match history
     - AI insights (if enabled)

3. **Check Recent Results**
   - Results feed shows recent matches
   - Scores display correctly (e.g., "10-6")
   - Team names and divisions are accurate

4. **Test Fixtures**
   - Navigate to fixtures section
   - Upcoming matches display with dates
   - Week numbers are correct

### 3. Visual Verification Checklist

- [ ] League selector shows new league
- [ ] League logo displays (if configured)
- [ ] Primary color applies to UI elements
- [ ] Standings table populated
- [ ] Player names clickable and show details
- [ ] Recent results display
- [ ] Fixtures show upcoming matches
- [ ] No console errors in browser DevTools
- [ ] Mobile responsive layout works

### 4. Cross-Browser Testing

Test in multiple browsers:
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers (iOS Safari, Chrome Android)

## Step 5: Link Players (Optional)

If you have players who appear in multiple leagues, link their identities for unified profiles.

### Why Link Players?

Linking players across leagues enables:
- **Unified player profiles** showing stats from all leagues
- **Cross-league analytics** and comparisons
- **Better AI insights** with more data
- **Player history tracking** across league changes

### Automatic Player Matching

The `link-players.ts` script uses fuzzy matching to suggest player links.

1. **Run Player Linking in Dry Run Mode**
   ```bash
   npx tsx scripts/link-players.ts --dry-run
   ```

2. **Review Suggested Links**
   ```
   === Player Identity Linking ===

   Found 256 players across 2 leagues

   Potential player matches:

   Group 1: john-smith (3 players)
     • john-smith [Wrexham] - "John Smith" @ Team A (Confidence: 1.00)
     • john-smith [NWPA] - "John Smith" @ Team B (Confidence: 0.95)
     • j-smith [NWPA] - "J. Smith" @ Team C (Confidence: 0.85)

   Group 2: sarah-jones (2 players)
     • sarah-jones [Wrexham] - "Sarah Jones" @ Team D (Confidence: 1.00)
     • s-jones [NWPA] - "S. Jones" @ Team E (Confidence: 0.82)

   Summary:
   • Total player groups: 2
   • Unique player identities: 5
   • Confidence threshold: 0.70 (default)
   ```

3. **Adjust Confidence Threshold (Optional)**
   ```bash
   # Higher threshold = fewer, more confident matches
   npx tsx scripts/link-players.ts --dry-run --min-confidence 0.85

   # Lower threshold = more matches, less confident
   npx tsx scripts/link-players.ts --dry-run --min-confidence 0.60
   ```

4. **Apply Player Links**
   ```bash
   npx tsx scripts/link-players.ts
   ```

   This creates `PlayerLink` documents in the `playerIdentities` collection.

5. **Verify Links in Firestore**
   - Open Firebase Console
   - Navigate to `playerIdentities` collection
   - Check that links were created correctly

### Manual Player Linking

For manual control or one-off links, use the admin UI:

1. **Navigate to Player Management**
   ```
   http://localhost:3000/admin/players
   ```

2. **Search for Players**
   - Use the search box to filter by name, league, or team
   - Player list shows all players across all leagues

3. **Select Players to Link**
   - Check the boxes next to players who are the same person
   - Must select at least 2 players

4. **Review Potential Duplicates**
   - The UI highlights potential duplicates (same name, different leagues)
   - Click "Select All" to quickly select suggested duplicates

5. **Link Players**
   - Click **"Link Selected Players"**
   - Success message confirms link creation
   - Linked players now share a canonical identity

### Verify Cross-League Stats

After linking players:

1. **View Player Detail**
   ```
   http://localhost:3000/?league=wrexham&season=2526
   ```
   - Click on a linked player

2. **Check Cross-League Stats Section**
   - Should appear if player is in 2+ leagues
   - Shows aggregated stats across all leagues:
     - Total games played (P)
     - Total wins (W)
     - Combined win percentage
     - Break dishes (BD+, BD-)
   - Shows per-league breakdown table

3. **Verify Stats Accuracy**
   - Total stats = sum of individual league stats
   - Win percentage calculated correctly
   - All leagues where player appears are listed

## Advanced Configuration

### Multi-Season Management

Add multiple seasons to a league:

1. **Edit League**
   - Navigate to league detail page
   - Click **"Edit League"**

2. **Add Seasons**
   - In the "Seasons" section, click **"Add Season"**
   - Enter season ID (e.g., "2627" for 2026-27)
   - Repeat for each season

3. **Sync Each Season**
   ```bash
   npx tsx scripts/sync-data.ts --league <league-id> --season 2526
   npx tsx scripts/sync-data.ts --league <league-id> --season 2627
   ```

### Custom League Branding

Customize league appearance:

1. **Primary Color**
   - Used for league badge, buttons, and accents
   - Format: `#RRGGBB` or `#RGB`
   - Examples:
     - Blue: `#1E88E5`
     - Green: `#4CAF50`
     - Red: `#F44336`

2. **Logo**
   - Upload logo to a CDN or use a public URL
   - Recommended size: 200x200px (square)
   - Formats: PNG, SVG, JPG
   - Example: `https://example.com/logos/nwpa.png`

3. **Short Name**
   - Displayed in compact UI (mobile, tabs)
   - Max 10 characters
   - Should be recognizable abbreviation

### Data Source Priorities

If multiple data sources are configured for a league:

1. **LeagueAppLive** (highest priority)
   - Automatically scrapes latest data
   - Use for leagues on the LeagueAppLive platform

2. **API Integration** (medium priority)
   - For custom integrations
   - Requires API endpoint that returns data in Pool League Pro format

3. **Manual Upload** (lowest priority)
   - For one-off imports or leagues without automated sources
   - Upload CSV or JSON files via admin tools

### Removing a League

To remove a league:

1. **Navigate to League Detail**
   ```
   http://localhost:3000/admin/leagues/<league-id>
   ```

2. **Click "Delete League"**
   - Confirmation dialog appears
   - Warning: This action cannot be undone

3. **Confirm Deletion**
   - League and all associated data are deleted:
     - League document
     - Data sources
     - Teams, players, results (in all seasons)
   - Player identities are preserved (for players in other leagues)

**Warning:** Always backup Firestore before deleting leagues in production.

## Troubleshooting

### League Not Appearing in Selector

**Problem:** New league doesn't show in the league selector dropdown

**Solutions:**
- Verify league was saved in Firestore (`leagues` collection)
- Check browser console for errors
- Hard refresh the page (Cmd+Shift+R / Ctrl+Shift+R)
- Verify league has at least one season configured
- Check that `useLeague()` hook is fetching all leagues

### Data Sync Fails

**Problem:** `sync-data.ts` script fails or returns empty data

**Solutions:**
- Verify data source configuration exists in Firestore
- Check data source URL is accessible (for LeagueAppLive)
- Validate API key (for API integrations)
- Run with `--dry-run` to see detailed error messages
- Check Firebase credentials are configured:
  ```bash
  export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
  ```
- Verify network connectivity to data source

### Player Linking Not Working

**Problem:** Linked players don't show cross-league stats

**Solutions:**
- Verify `PlayerLink` documents exist in `playerIdentities` collection
- Check that linked player IDs match actual player IDs in data
- Clear browser cache and refresh
- Run `link-players.ts` with `--dry-run` to verify matches
- Check browser console for errors in PlayerDetail component

### Colors Not Applying

**Problem:** League primary color doesn't apply to UI elements

**Solutions:**
- Verify color format is valid hex (`#RRGGBB` or `#RGB`)
- Check that league document has `primaryColor` field
- Refresh the page to reload league data
- Inspect CSS variables in browser DevTools:
  ```javascript
  getComputedStyle(document.documentElement).getPropertyValue('--primary')
  ```
- Verify `ThemeProvider` is wrapping the app with league color

### Logo Not Displaying

**Problem:** League logo doesn't appear in selector or header

**Solutions:**
- Verify logo URL is publicly accessible (not behind auth)
- Check image format (PNG, SVG, JPG supported)
- Inspect browser Network tab for 404 errors
- Try a different image URL
- Ensure CORS headers allow loading from your domain
- Use `<img>` with `onError` handler to catch load failures

### Duplicate Players After Sync

**Problem:** Same player appears multiple times in league data

**Solutions:**
- Run player linking script to merge duplicates:
  ```bash
  npx tsx scripts/link-players.ts --dry-run
  ```
- Manually link players in admin UI
- Check data source for inconsistent player names (e.g., "John Smith" vs "J. Smith")
- Normalize player names before syncing

### Performance Issues with Many Leagues

**Problem:** App slows down with 10+ leagues

**Solutions:**
- Implement pagination in league selector
- Use React.memo() for league components
- Add virtual scrolling for long league lists
- Optimize Firestore queries with indexes
- Cache league data in localStorage
- Consider league archiving for inactive leagues

## API Reference

### League Endpoints

#### GET /api/admin/leagues
Retrieve all leagues.

**Response:**
```json
{
  "leagues": [
    {
      "id": "wrexham",
      "name": "Wrexham & District Pool League",
      "shortName": "Wrexham",
      "primaryColor": "#00A86B",
      "logo": "https://example.com/wrexham.png",
      "seasons": ["2425", "2526"],
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-06-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/admin/leagues
Create a new league.

**Request:**
```json
{
  "name": "North Wales Pool Association",
  "shortName": "NWPA",
  "primaryColor": "#1E88E5",
  "logo": "https://example.com/nwpa.png",
  "seasons": ["2526"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "League created successfully",
  "leagueId": "north-wales-pool-association"
}
```

#### GET /api/admin/leagues/[leagueId]
Get a specific league.

**Response:**
```json
{
  "id": "wrexham",
  "name": "Wrexham & District Pool League",
  "shortName": "Wrexham",
  "primaryColor": "#00A86B",
  "logo": "https://example.com/wrexham.png",
  "seasons": ["2425", "2526"]
}
```

#### PUT /api/admin/leagues/[leagueId]
Update a league.

**Request:**
```json
{
  "name": "Wrexham Pool League",
  "shortName": "WPL",
  "primaryColor": "#00B86B",
  "seasons": ["2425", "2526", "2627"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "League updated successfully"
}
```

#### DELETE /api/admin/leagues/[leagueId]
Delete a league and all associated data.

**Response:**
```json
{
  "success": true,
  "message": "League deleted successfully"
}
```

### Data Source Endpoints

#### GET /api/admin/data-sources
Get all data sources (optional league filter).

**Query Parameters:**
- `leagueId` (optional): Filter by league

**Response:**
```json
{
  "dataSources": [
    {
      "id": "wrexham-leagueapplive",
      "leagueId": "wrexham",
      "sourceType": "leagueapplive",
      "config": {
        "url": "https://leagueapplive.com/leagues/wrexham",
        "enabled": true
      },
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-06-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/admin/data-sources
Create a data source configuration.

**Request:**
```json
{
  "leagueId": "nwpa",
  "sourceType": "leagueapplive",
  "config": {
    "url": "https://leagueapplive.com/leagues/nwpa",
    "enabled": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Data source configured successfully",
  "dataSourceId": "nwpa-leagueapplive"
}
```

### Player Linking Endpoints

#### POST /api/admin/players/link
Link multiple player identities.

**Request:**
```json
{
  "playerId": "john-smith",
  "linkedPlayers": [
    "j-smith",
    "john-s"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Players linked successfully"
}
```

## Best Practices

### 1. Test in Dev First

Always test new leagues in development before production:

```bash
# Development
npm run dev
# Test at http://localhost:3000/admin

# Production
# Only deploy after full testing
```

### 2. Use Dry Run Mode

Always use `--dry-run` flag first when syncing data:

```bash
# Preview what will be synced
npx tsx scripts/sync-data.ts --league nwpa --dry-run

# Then run actual sync
npx tsx scripts/sync-data.ts --league nwpa
```

### 3. Backup Before Deletions

Before deleting leagues in production:

```bash
# Export Firestore data
gcloud firestore export gs://bucket-name/backup-$(date +%Y%m%d)

# Then delete league via admin UI
```

### 4. Monitor Data Quality

Regularly check data accuracy:
- Verify player stats match source data
- Check for duplicate players
- Validate team standings calculations
- Review AI insights for anomalies

### 5. Schedule Regular Syncs

Keep data up-to-date with scheduled syncs:

```bash
# Daily sync at 2 AM
0 2 * * * cd /path/to/app && npx tsx scripts/sync-data.ts --league nwpa
```

### 6. Use Consistent Naming

Follow naming conventions:
- **League IDs**: lowercase, hyphenated (e.g., `north-wales-pool`)
- **Season IDs**: 4-digit year codes (e.g., `2526` for 2025-26)
- **Player IDs**: canonical form from name (e.g., `john-smith`)

### 7. Document Custom Configurations

If using API integration or custom data sources, document:
- API endpoint URLs
- Authentication methods
- Data format specifications
- Error handling procedures

## Support

For issues or questions:

- **Documentation**: Check this guide and other docs in `/docs`
- **Code Examples**: See `src/__tests__/league-onboarding.test.ts`
- **API Reference**: Review endpoint documentation above
- **Community**: Join the Pool League Pro community forum
- **Issues**: Report bugs on the GitHub repository

## Additional Resources

- [Data Source Integration Guide](../DATA-SOURCE-INTEGRATION.md)
- [Player Identity Resolution](../src/lib/player-identity.ts)
- [Admin API Documentation](#api-reference)
- [Deployment Guide](../.github/DEPLOYMENT.md)
- [E2E Testing Guide](../src/__tests__/league-onboarding.test.ts)

---

**Last Updated:** February 2026
**Version:** 1.0.0
