# Manual Testing Guide for Sync API Endpoint

This guide provides step-by-step instructions for manually testing the `/api/sync` endpoint to verify the automated data sync pipeline works correctly.

## Prerequisites

- Dev server running locally or deployed to Vercel
- `CRON_SECRET` configured in `.env.local` (for production testing)
- Access to Firebase Console to verify Firestore updates
- `curl` or similar HTTP client

## Test 1: Dry-Run Mode (All Leagues)

**Purpose**: Verify the API endpoint works without writing to Firestore.

### Steps

1. **Start the dev server**:
   ```bash
   npm run dev
   ```
   Wait for "Ready on http://localhost:3000" message.

2. **Call the API with dry-run mode**:
   ```bash
   curl -X POST http://localhost:3000/api/sync \
     -H 'Content-Type: application/json' \
     -d '{"dryRun": true}'
   ```

   *Note: In development without `CRON_SECRET`, authentication is skipped.*

3. **Expected Response** (200 OK):
   ```json
   {
     "success": true,
     "message": "Sync completed successfully",
     "dryRun": true,
     "leagues": 3,
     "totals": {
       "results": 150,
       "fixtures": 200,
       "frames": 1500,
       "players": 120
     },
     "details": [
       {
         "league": "wrexham",
         "success": true,
         "results": 50,
         "fixtures": 70,
         "frames": 500,
         "players": 40
       },
       {
         "league": "nwpa",
         "success": true,
         "results": 60,
         "fixtures": 80,
         "frames": 600,
         "players": 50
       },
       {
         "league": "chester",
         "success": true,
         "results": 40,
         "fixtures": 50,
         "frames": 400,
         "players": 30
       }
     ]
   }
   ```

4. **Verify Console Logs**:
   Check the terminal running `npm run dev` for structured log entries:
   ```
   [2026-02-08T17:30:00.000Z] [SYNC] [INFO] Starting sync for league: wrexham (dryRun: true)
   [2026-02-08T17:30:01.000Z] [SYNC] [INFO] Scraping results for division: Premier
   [2026-02-08T17:30:02.000Z] [SYNC] [INFO] Scraped 50 results
   [2026-02-08T17:30:03.000Z] [SYNC] [INFO] Scraping fixtures for division: Premier
   [2026-02-08T17:30:04.000Z] [SYNC] [INFO] Scraped 70 fixtures
   [2026-02-08T17:30:05.000Z] [SYNC] [INFO] Scraping frame data...
   [2026-02-08T17:30:06.000Z] [SYNC] [INFO] Scraped 500 frames
   [2026-02-08T17:30:07.000Z] [SYNC] [INFO] Aggregating player stats...
   [2026-02-08T17:30:08.000Z] [SYNC] [INFO] Aggregated stats for 40 players
   [2026-02-08T17:30:09.000Z] [SYNC] [INFO] DRY RUN: Would write to Firestore (skipping)
   [2026-02-08T17:30:10.000Z] [SYNC] [INFO] Sync completed for league: wrexham
   ```

5. **Verify Firestore NOT Updated**:
   - Open Firebase Console
   - Check that `lastUpdated` timestamp in league documents has NOT changed
   - This confirms dry-run mode is working correctly

## Test 2: Single League Sync (Live Mode)

**Purpose**: Verify the API can sync a specific league and write to Firestore.

### Steps

1. **Note the current timestamp** in Firebase Console:
   - Navigate to Firestore
   - Open `leagues/wrexham` document
   - Record the current `lastUpdated` value

2. **Call the API for a single league**:
   ```bash
   curl -X POST http://localhost:3000/api/sync \
     -H 'Content-Type: application/json' \
     -d '{"league": "wrexham", "dryRun": false}'
   ```

3. **Expected Response** (200 OK):
   ```json
   {
     "success": true,
     "message": "Sync completed successfully",
     "dryRun": false,
     "leagues": 1,
     "totals": {
       "results": 50,
       "fixtures": 70,
       "frames": 500,
       "players": 40
     },
     "details": [
       {
         "league": "wrexham",
         "success": true,
         "results": 50,
         "fixtures": 70,
         "frames": 500,
         "players": 40
       }
     ]
   }
   ```

4. **Verify Firestore Updated**:
   - Refresh Firebase Console
   - Confirm `leagues/wrexham` document has a NEW `lastUpdated` timestamp
   - Check that record counts match the API response:
     - `results/wrexham-premier` collection should have ~50 documents
     - `fixtures/wrexham-premier` collection should have ~70 documents
     - `frames` collection should have ~500 wrexham-related documents
     - `players/wrexham-premier` collection should have ~40 documents

5. **Verify Console Logs**:
   Similar to Test 1, but should show:
   ```
   [SYNC] [INFO] Writing to Firestore...
   [SYNC] [INFO] Successfully wrote 50 results to Firestore
   [SYNC] [INFO] Successfully wrote 70 fixtures to Firestore
   [SYNC] [INFO] Successfully wrote 500 frames to Firestore
   [SYNC] [INFO] Successfully wrote 40 player stats to Firestore
   ```

## Test 3: Idempotency Test

**Purpose**: Verify re-running the sync doesn't create duplicate data.

### Steps

1. **Run the sync twice** with the same parameters:
   ```bash
   # First run
   curl -X POST http://localhost:3000/api/sync \
     -H 'Content-Type: application/json' \
     -d '{"league": "wrexham", "dryRun": false}'

   # Wait 2 seconds
   sleep 2

   # Second run
   curl -X POST http://localhost:3000/api/sync \
     -H 'Content-Type: application/json' \
     -d '{"league": "wrexham", "dryRun": false}'
   ```

2. **Expected Results**:
   - Both API calls return 200 OK with identical record counts
   - Firestore document counts remain the same after second run
   - No duplicate documents created (sync is idempotent)

3. **Verify in Firestore**:
   - Check that document IDs are based on content (e.g., result ID from LeagueAppLive)
   - Second sync should have updated existing documents, not created duplicates
   - Total document count should match first sync's count

## Test 4: All Leagues Sync (Live Mode)

**Purpose**: Verify syncing all leagues at once works correctly.

### Steps

1. **Call the API without specifying a league**:
   ```bash
   curl -X POST http://localhost:3000/api/sync \
     -H 'Content-Type: application/json' \
     -d '{"dryRun": false}'
   ```

2. **Expected Response** (200 OK):
   ```json
   {
     "success": true,
     "message": "Sync completed successfully",
     "dryRun": false,
     "leagues": 3,
     "totals": {
       "results": 150,
       "fixtures": 200,
       "frames": 1500,
       "players": 120
     },
     "details": [
       // ... details for each league
     ]
   }
   ```

3. **Verify Firestore Updated for All Leagues**:
   - Check `lastUpdated` timestamp updated for all league documents:
     - `leagues/wrexham`
     - `leagues/nwpa`
     - `leagues/chester`
   - Verify record counts match totals in API response

4. **Verify Logs Show All Leagues**:
   ```
   [SYNC] [INFO] Starting sync for league: wrexham
   [SYNC] [INFO] Sync completed for league: wrexham
   [SYNC] [INFO] Starting sync for league: nwpa
   [SYNC] [INFO] Sync completed for league: nwpa
   [SYNC] [INFO] Starting sync for league: chester
   [SYNC] [INFO] Sync completed for league: chester
   ```

## Test 5: Authentication Test (Production)

**Purpose**: Verify authentication works when `CRON_SECRET` is set.

### Prerequisites
- `CRON_SECRET` environment variable set in `.env.local`
- Restart dev server after setting the env var

### Steps

1. **Test with missing auth header**:
   ```bash
   curl -X POST http://localhost:3000/api/sync \
     -H 'Content-Type: application/json' \
     -d '{"dryRun": true}'
   ```

   **Expected Response** (401 Unauthorized):
   ```json
   {
     "error": "Unauthorized. Valid Authorization header required."
   }
   ```

2. **Test with invalid token**:
   ```bash
   curl -X POST http://localhost:3000/api/sync \
     -H 'Authorization: Bearer wrong-token' \
     -H 'Content-Type: application/json' \
     -d '{"dryRun": true}'
   ```

   **Expected Response** (401 Unauthorized):
   ```json
   {
     "error": "Unauthorized. Valid Authorization header required."
   }
   ```

3. **Test with valid token**:
   ```bash
   curl -X POST http://localhost:3000/api/sync \
     -H 'Authorization: Bearer YOUR_ACTUAL_CRON_SECRET' \
     -H 'Content-Type: application/json' \
     -d '{"dryRun": true}'
   ```

   **Expected Response** (200 OK):
   Successfully syncs data as in previous tests.

## Test 6: Error Handling Test

**Purpose**: Verify error notifications work correctly.

### Steps

1. **Test with invalid league name**:
   ```bash
   curl -X POST http://localhost:3000/api/sync \
     -H 'Content-Type: application/json' \
     -d '{"league": "invalid-league", "dryRun": true}'
   ```

   **Expected Response** (400 Bad Request):
   ```json
   {
     "error": "Invalid league: \"invalid-league\". Available leagues: wrexham, nwpa, chester"
   }
   ```

2. **Test with malformed JSON**:
   ```bash
   curl -X POST http://localhost:3000/api/sync \
     -H 'Content-Type: application/json' \
     -d '{invalid json}'
   ```

   **Expected Response** (500 Internal Server Error):
   ```json
   {
     "error": "Failed to sync data",
     "details": "Unexpected token 'i', \"invalid json\" is not valid JSON"
   }
   ```

3. **Verify Error Logs**:
   Check console for error notification logs:
   ```
   [SYNC] [ERROR] Sync failed for league: invalid-league
   [SYNC] [ERROR] Error: Invalid league specified
   [SYNC] [ERROR] Context: {...}
   ```

## Test 7: Vercel Production Test

**Purpose**: Verify the sync works in Vercel production environment.

### Steps

1. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

2. **Set CRON_SECRET in Vercel Dashboard**:
   - Go to Project Settings → Environment Variables
   - Add `CRON_SECRET` with a secure random value
   - Redeploy if necessary

3. **Test the production API**:
   ```bash
   curl -X POST https://your-app.vercel.app/api/sync \
     -H 'Authorization: Bearer YOUR_CRON_SECRET' \
     -H 'Content-Type: application/json' \
     -d '{"dryRun": true}'
   ```

4. **Verify Logs in Vercel Dashboard**:
   - Navigate to Deployments → Latest → Functions → `/api/sync`
   - Check logs for [SYNC] entries
   - Verify no errors or warnings

5. **Manually Trigger Cron Job** (Optional):
   - Go to Project Settings → Cron Jobs
   - Find the "Sunday Night Sync" job
   - Click "Run" to manually trigger
   - Verify execution in logs

## Success Criteria

All tests should pass with the following outcomes:

✅ **Test 1**: Dry-run mode returns success, no Firestore writes
✅ **Test 2**: Single league syncs successfully, Firestore updated
✅ **Test 3**: Re-running sync is idempotent (no duplicates)
✅ **Test 4**: All leagues sync successfully in one request
✅ **Test 5**: Authentication blocks unauthorized requests
✅ **Test 6**: Invalid inputs return proper error responses
✅ **Test 7**: Production deployment works on Vercel

## Common Issues

### Issue: "No such file or directory: league-config.json"
**Solution**: Ensure league config files exist at `leagues/{league-name}/league-config.json`

### Issue: "Firebase Admin SDK not initialized"
**Solution**: Check that `FIREBASE_SERVICE_ACCOUNT_KEY` env var is set correctly

### Issue: 408 Timeout on Vercel
**Solution**: Sync is taking too long. Consider:
- Enabling streaming responses
- Breaking sync into smaller chunks
- Optimizing scraping logic

### Issue: Duplicate documents in Firestore
**Solution**: Verify document IDs are deterministic (based on upstream IDs)

## Next Steps

After completing all tests:

1. Document any issues found in `.auto-claude/specs/010-automated-data-sync-pipeline/build-progress.txt`
2. Update `implementation_plan.json` to mark subtask-5-1 as completed
3. Proceed to subtask-5-2: Deploy to Vercel and test cron execution

## References

- [Sync Pipeline Library](../../src/lib/sync-pipeline.ts)
- [Sync API Route](../../src/app/api/sync/route.ts)
- [Vercel Cron Setup Guide](./vercel-cron-setup.md)
- [Sync Notifications](../../src/lib/sync-notifications.ts)
