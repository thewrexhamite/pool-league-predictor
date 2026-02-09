# Vercel Deployment Verification Guide - Subtask 5-2

This guide provides step-by-step instructions for deploying the automated data sync pipeline to Vercel and verifying cron job execution.

## Overview

This verification ensures:
- ✅ Application deploys successfully to Vercel
- ✅ CRON_SECRET environment variable is configured
- ✅ Cron jobs appear in Vercel dashboard
- ✅ Cron jobs can be manually triggered
- ✅ Sync executes successfully in production
- ✅ Logs are visible and show proper execution
- ✅ Firestore is updated with synced data

## Prerequisites

Before starting, ensure you have:
- [ ] Vercel CLI installed: `npm install -g vercel`
- [ ] Vercel account with access to the project
- [ ] Firebase Console access to verify Firestore updates
- [ ] All Firebase environment variables ready (see `.env.local.example`)

## Step 1: Pre-Deployment Checklist

Verify all code is ready for deployment:

### 1.1 Verify vercel.json Configuration

```bash
cat vercel.json
```

**Expected Output:**
```json
{
  "crons": [
    {
      "path": "/api/sync",
      "schedule": "0 23 * * 0"
    },
    {
      "path": "/api/sync",
      "schedule": "0 23 * * 3"
    }
  ]
}
```

✅ **Verify**: Two cron jobs configured for Sunday and Wednesday at 23:00 UTC

### 1.2 Verify API Route Exists

```bash
ls -la ./src/app/api/sync/route.ts
```

✅ **Verify**: File exists and is not empty

### 1.3 Verify Sync Pipeline Library

```bash
ls -la ./src/lib/sync-pipeline.ts
```

✅ **Verify**: File exists and exports sync functions

### 1.4 Check Current Git Status

```bash
git status
```

✅ **Verify**: All changes are committed (working directory clean)

If there are uncommitted changes, commit them:
```bash
git add .
git commit -m "auto-claude: subtask-5-2 - ready for Vercel deployment"
```

## Step 2: Deploy to Vercel

### 2.1 Login to Vercel

```bash
vercel login
```

Follow the prompts to authenticate.

### 2.2 Deploy to Production

```bash
vercel --prod
```

**Expected Output:**
```
Vercel CLI 33.x.x
🔍 Inspect: https://vercel.com/your-org/your-app/xxxxxxx [1s]
✅ Production: https://your-app.vercel.app [copied to clipboard] [2m]
```

✅ **Verify**: Deployment completes successfully with a production URL

### 2.3 Verify Deployment Status

Open the Vercel dashboard:
1. Go to https://vercel.com/dashboard
2. Select your project
3. Navigate to **Deployments** tab
4. Verify latest deployment shows "Ready" status

✅ **Verify**: Latest deployment is marked as "Ready" (not "Building" or "Error")

## Step 3: Configure CRON_SECRET Environment Variable

### 3.1 Generate a Secure Secret

```bash
# Generate a cryptographically secure random string
openssl rand -base64 32
```

**Example Output:**
```
dGhpc2lzYXNlY3JldGtleWZvcnRlc3Rpbmdwcm9kdWN0aW9u
```

💾 **IMPORTANT**: Save this value securely - you'll need it for manual testing

### 3.2 Add Environment Variable in Vercel Dashboard

1. Navigate to your project in Vercel dashboard
2. Go to **Settings** → **Environment Variables**
3. Click **Add** or **New Variable**
4. Configure:
   - **Name**: `CRON_SECRET`
   - **Value**: Paste the generated secret from Step 3.1
   - **Environment**: Select **Production**, **Preview**, and **Development**
5. Click **Save**

✅ **Verify**: Environment variable appears in the list

### 3.3 Redeploy (Optional but Recommended)

After adding environment variables, redeploy to ensure they're loaded:

```bash
vercel --prod --force
```

## Step 4: Verify Cron Jobs Configuration

### 4.1 Check Cron Jobs in Dashboard

1. In Vercel dashboard, go to your project
2. Navigate to **Settings** → **Cron Jobs**
3. Verify two cron jobs are listed:

✅ **Expected Configuration:**

| Path | Schedule | Description |
|------|----------|-------------|
| `/api/sync` | `0 23 * * 0` | Sunday Night Sync (23:00 UTC) |
| `/api/sync` | `0 23 * * 3` | Wednesday Night Sync (23:00 UTC) |

### 4.2 Verify Cron Job Details

Click on each cron job to view details:
- **Status**: Active
- **Next Run**: Shows upcoming Sunday or Wednesday at 23:00 UTC
- **Last Run**: May show "Never" if newly deployed

✅ **Verify**: Both cron jobs show "Active" status

## Step 5: Manually Trigger Cron Job

### 5.1 Test via Vercel Dashboard (Recommended)

1. In **Settings** → **Cron Jobs**, select a cron job
2. Click the **Run** or **Trigger** button
3. Observe the execution status

✅ **Expected**: Execution starts immediately

### 5.2 Test via cURL (Alternative Method)

If manual trigger isn't available or you prefer command-line testing:

```bash
# Replace YOUR_APP_URL and YOUR_CRON_SECRET with actual values
curl -X POST https://your-app.vercel.app/api/sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}'
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "message": "Sync completed successfully",
  "dryRun": false,
  "leagues": 3,
  "totals": {
    "results": 156,
    "fixtures": 89,
    "frames": 1248,
    "players": 312
  },
  "details": [
    {
      "league": "wrexham",
      "success": true,
      "results": 52,
      "fixtures": 30,
      "frames": 416,
      "players": 104
    },
    {
      "league": "nwpa",
      "success": true,
      "results": 54,
      "fixtures": 31,
      "frames": 432,
      "players": 108
    },
    {
      "league": "chester",
      "success": true,
      "results": 50,
      "fixtures": 28,
      "frames": 400,
      "players": 100
    }
  ]
}
```

✅ **Verify**:
- HTTP status is 200
- `success` is `true`
- `leagues` shows count of synced leagues (3)
- `totals` shows aggregated record counts
- Each league in `details` has `success: true`

### 5.3 Test with Dry-Run Mode

For safer initial testing, use dry-run mode:

```bash
curl -X POST https://your-app.vercel.app/api/sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

✅ **Verify**: Response shows `"dryRun": true` and completes successfully

## Step 6: Check Logs for Successful Execution

### 6.1 View Function Logs in Vercel Dashboard

1. Navigate to **Deployments** → Select latest deployment
2. Click **Functions** tab
3. Find and click on `/api/sync` function
4. Review **Runtime Logs**

### 6.2 Verify Log Entries

Look for these structured log entries with `[SYNC]` prefix:

✅ **Expected Log Patterns:**

```
[2026-02-08T23:00:01.234Z] [SYNC] [INFO] Starting sync for league: wrexham
[2026-02-08T23:00:02.456Z] [SYNC] [INFO] Scraping results for division: Premier
[2026-02-08T23:00:05.789Z] [SYNC] [INFO] Scraped 52 results
[2026-02-08T23:00:08.012Z] [SYNC] [INFO] Scraping fixtures for division: Premier
[2026-02-08T23:00:10.345Z] [SYNC] [INFO] Scraped 30 fixtures
[2026-02-08T23:00:12.678Z] [SYNC] [INFO] Scraping frame data...
[2026-02-08T23:00:25.901Z] [SYNC] [INFO] Scraped 416 frames
[2026-02-08T23:00:28.234Z] [SYNC] [INFO] Aggregating player stats...
[2026-02-08T23:00:30.567Z] [SYNC] [INFO] Aggregated stats for 104 players
[2026-02-08T23:00:32.890Z] [SYNC] [INFO] Writing to Firestore...
[2026-02-08T23:00:38.123Z] [SYNC] [INFO] Successfully wrote to Firestore
[2026-02-08T23:00:38.456Z] [SYNC] [INFO] Sync completed for league: wrexham
[2026-02-08T23:00:40.789Z] [SYNC] [INFO] Starting sync for league: nwpa
... (similar logs for other leagues)
```

### 6.3 Check for Errors

✅ **Verify NO error logs like:**
- `[SYNC] [ERROR] Failed to scrape ...`
- `[SYNC] [ERROR] Firestore write failed`
- `[SYNC] [ERROR] Sync failed for league: ...`

If errors appear, see **Troubleshooting** section below.

### 6.4 View Cron Execution History

1. Go to **Settings** → **Cron Jobs**
2. Select a cron job
3. View **Execution History**

✅ **Expected**:
- Most recent execution shows **200** status code
- Execution duration is reasonable (typically 30-120 seconds)
- No failed executions

## Step 7: Verify Firestore Updates

### 7.1 Check League Documents

1. Open Firebase Console: https://console.firebase.google.com/
2. Navigate to **Firestore Database**
3. Check these collections:

#### Verify `leagues` Collection:
```
leagues/
  ├─ wrexham/
  │   └─ lastUpdated: (should be recent timestamp)
  ├─ nwpa/
  │   └─ lastUpdated: (should be recent timestamp)
  └─ chester/
      └─ lastUpdated: (should be recent timestamp)
```

✅ **Verify**: `lastUpdated` timestamps are recent (within last few minutes)

### 7.2 Check Data Collections

Verify records were written to these collections:

```bash
# Open Firestore Console and check:
- results/{league}-{division}/
  └─ Document count matches API response

- fixtures/{league}-{division}/
  └─ Document count matches API response

- frames/
  └─ Contains frame documents for each match

- players/{league}-{division}/
  └─ Document count matches API response
```

✅ **Verify**:
- Document counts approximately match the API response totals
- Documents contain expected fields (names, scores, dates, etc.)
- No duplicate documents (re-run sync should update, not duplicate)

### 7.3 Test Idempotency

Run the sync again (manually or wait for scheduled run):

```bash
curl -X POST https://your-app.vercel.app/api/sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}'
```

✅ **Verify**:
- Same record counts returned
- Firestore document counts remain stable (no duplicates created)
- `lastUpdated` timestamps update to new sync time

## Step 8: Final Verification Checklist

Complete this checklist to confirm successful deployment:

### Deployment
- [ ] Application deployed to Vercel production
- [ ] Deployment status shows "Ready"
- [ ] Production URL is accessible

### Environment Configuration
- [ ] CRON_SECRET environment variable set in Vercel
- [ ] All Firebase environment variables configured
- [ ] Application redeployed after adding environment variables

### Cron Configuration
- [ ] Two cron jobs visible in Vercel dashboard
- [ ] Sunday 23:00 UTC cron job is active
- [ ] Wednesday 23:00 UTC cron job is active
- [ ] Next scheduled run times are correct

### Manual Testing
- [ ] Manual cron trigger executed successfully
- [ ] API returned 200 status code
- [ ] Response shows `success: true`
- [ ] All leagues synced successfully (3 leagues)
- [ ] Record counts are reasonable (results, fixtures, frames, players)

### Logging
- [ ] Logs visible in Vercel dashboard
- [ ] `[SYNC]` prefix appears in all sync-related logs
- [ ] Log levels correct (INFO, WARN, ERROR)
- [ ] No error logs during successful sync
- [ ] Execution duration is acceptable (< 2 minutes)

### Firestore Verification
- [ ] League documents updated with recent `lastUpdated` timestamps
- [ ] Results collection contains expected documents
- [ ] Fixtures collection contains expected documents
- [ ] Frames collection contains expected documents
- [ ] Players collection contains expected documents
- [ ] Re-running sync does NOT create duplicates (idempotent)

### Scheduled Execution
- [ ] Cron execution history shows successful runs
- [ ] Next scheduled run is within 1-3 days
- [ ] Execution history shows 200 status codes

## Troubleshooting

### Issue: 401 Unauthorized Error

**Symptoms:**
```json
{
  "error": "Unauthorized. Valid Authorization header required."
}
```

**Solutions:**
1. Verify `CRON_SECRET` is set in Vercel environment variables
2. Check for typos in the secret value
3. Ensure Authorization header format: `Bearer YOUR_SECRET` (note the space)
4. Redeploy after adding environment variable
5. Try regenerating the secret and updating both Vercel and your test command

### Issue: Cron Jobs Not Appearing

**Symptoms:**
- Settings → Cron Jobs shows empty list
- No scheduled runs visible

**Solutions:**
1. Verify `vercel.json` contains `crons` array
2. Ensure deployment is to **Production** (not Preview)
3. Check deployment logs for configuration errors
4. Try force redeployment: `vercel --prod --force`
5. Wait 1-2 minutes after deployment for cron jobs to register

### Issue: Sync Times Out

**Symptoms:**
- 504 Gateway Timeout error
- Function execution exceeds time limit
- Partial logs showing incomplete sync

**Solutions:**
1. Check Vercel function timeout limits:
   - Hobby plan: 10 seconds
   - Pro plan: 60 seconds
   - Enterprise plan: 900 seconds
2. If on Hobby plan, upgrade to Pro for longer timeouts
3. Optimize sync pipeline to reduce execution time
4. Consider syncing leagues individually instead of all at once
5. Test with single league first: `{"league": "wrexham"}`

### Issue: Firestore Not Updating

**Symptoms:**
- API returns success
- Logs show no errors
- Firestore `lastUpdated` timestamp unchanged

**Solutions:**
1. Verify Firebase environment variables are correct
2. Check Firestore security rules allow writes
3. Review logs for "DRY RUN" messages (ensure `dryRun: false`)
4. Verify Firebase project ID matches production database
5. Test with `dryRun: true` first to isolate Firestore issues

### Issue: Partial Sync Failures

**Symptoms:**
- Some leagues sync successfully
- Others fail with errors
- Response shows mixed success/failure

**Solutions:**
1. Check specific league failure in response `details` array
2. Verify LeagueAppLive website is accessible for failed league
3. Test failed league individually: `{"league": "nwpa"}`
4. Check league-specific configuration files exist
5. Review error context in logs for specific failure reason

### Issue: Error Notifications Not Working

**Symptoms:**
- Sync fails but no notifications sent
- Error logs present but no alerts

**Solutions:**
1. Current implementation logs errors to console (MVP)
2. Email notifications are stubbed (TODO in code)
3. Monitor Vercel logs manually for now
4. Future enhancement: Implement email via Resend/SendGrid

## Testing Checklist Summary

After completing all steps, verify:

✅ **All systems operational:**
- Vercel deployment successful
- CRON_SECRET configured
- Cron jobs scheduled and active
- Manual trigger works
- Logs show successful execution
- Firestore data updated
- Idempotency verified

🎉 **Deployment Verification Complete!**

## Next Steps

After successful verification:

1. **Document Results**: Update `build-progress.txt` with verification outcomes
2. **Mark Complete**: Update `implementation_plan.json` to mark subtask-5-2 as completed
3. **Commit Changes**:
   ```bash
   git add .
   git commit -m "auto-claude: subtask-5-2 - Vercel deployment verified"
   ```
4. **Monitor**: Check cron execution after next scheduled run (Sunday or Wednesday)
5. **Acceptance Testing**: User should verify data freshness meets requirements

## References

- [Vercel Cron Setup Guide](./vercel-cron-setup.md)
- [Manual Testing Guide](./manual-testing-guide.md)
- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

## Support

If you encounter issues not covered here:
1. Check Vercel deployment logs for detailed errors
2. Review API route source: `src/app/api/sync/route.ts`
3. Check sync pipeline: `src/lib/sync-pipeline.ts`
4. Verify Firebase configuration and security rules
5. Test locally first: `npm run dev` + manual API call
