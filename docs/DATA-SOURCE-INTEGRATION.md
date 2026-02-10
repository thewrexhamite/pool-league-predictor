# Data Source Factory Integration

## Overview

The `sync-data.ts` script has been updated to use the data source factory pattern. This allows the script to work with multiple data source types (LeagueAppLive, RackEmApp, Manual, API) through a unified interface.

## Changes Made

### 1. Imports
Added imports for the data source factory:
```typescript
import { DataSourceFactory } from './data-sources/factory';
import { DataSourceConfig } from './data-sources/base';
```

### 2. New CLI Arguments
- `--source-type <type>`: Specify data source type (default: `leagueapplive`)
- `--use-data-source`: Force use of data source factory

### 3. Data Source Integration Function
Added `fetchViaDataSource()` function that:
1. Creates a DataSourceConfig from the league configuration
2. Uses DataSourceFactory to instantiate the appropriate data source
3. Calls data source fetch methods (divisions, results, fixtures, players, frames)
4. Returns the fetched data

### 4. Main Flow Update
The `main()` function now:
1. Attempts to use the data source factory first
2. Logs the results (validates factory works)
3. Falls through to legacy scraping (since LeagueAppLiveDataSource is currently a stub)
4. Will fully replace legacy scraping once data source implementations are complete

## Usage

### Default (uses data source factory + legacy scraping)
```bash
npx tsx scripts/sync-data.ts --league wrexham --dry-run
```

### Specify data source type
```bash
npx tsx scripts/sync-data.ts --league wrexham --source-type leagueapplive --dry-run
```

### Test different league
```bash
npx tsx scripts/sync-data.ts --league nwpa --dry-run
```

## Expected Output

```
=== Multi-Source League Data Sync ===
  League: Wrexham & District Pool League (wrexham)
  Season: 2526
  Source: leagueapplive
  Output: /path/to/data
  Mode: DRY RUN (Firestore writes skipped)

[HH:MM:SS] Using data source factory: leagueapplive
[HH:MM:SS] Data source created: LeagueAppLive
[HH:MM:SS] Fetching divisions...
[HH:MM:SS] Fetching results...
[HH:MM:SS] Fetching fixtures...
[HH:MM:SS] Fetching players...
[HH:MM:SS] Fetching frames...
[HH:MM:SS] Data fetched successfully via data source
[HH:MM:SS]   Divisions: 0
[HH:MM:SS]   Results: 0
[HH:MM:SS]   Fixtures: 0
[HH:MM:SS]   Players: 0
[HH:MM:SS]   Frames: 0

✅ Data source fetch complete
   Source: leagueapplive
   Note: LeagueAppLive data source is currently a stub.
   Full scraping implementation will be migrated in future subtasks.
   For now, using legacy direct scraping for actual data...

Using direct LeagueAppLive scraping...
[continues with existing scraping logic]
```

## Current Status

- ✅ Data source factory infrastructure integrated
- ✅ sync-data.ts can create and use data sources
- ⏳ LeagueAppLive data source is a stub (returns empty data)
- ⏳ Full scraping logic migration pending

## Next Steps

1. Migrate scraping logic from sync-data.ts to LeagueAppLiveDataSource
2. Remove legacy scraping code from sync-data.ts
3. Add support for other data source types (RackEmApp, Manual, API)
4. Add Firestore data source configuration loading

## Verification

The integration can be verified by running:
```bash
npx tsx scripts/sync-data.ts --league wrexham --dry-run
```

Expected outcome:
- Data source factory creates a LeagueAppLive data source instance
- Configuration is validated
- Fetch methods are called (return empty data for now)
- Legacy scraping continues to work for actual data

This validates that the factory pattern works correctly and can be extended with full implementations.
