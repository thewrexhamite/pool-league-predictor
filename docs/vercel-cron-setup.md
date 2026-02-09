# Vercel Cron Job Setup Guide

This guide explains how to configure and manage the automated data sync pipeline using Vercel Cron Jobs.

## Overview

The automated data sync pipeline scrapes league data from LeagueAppLive and updates Firestore automatically on a schedule. It runs:
- **Sunday nights** at 23:00 UTC (after weekend matches)
- **Wednesday nights** at 23:00 UTC (after midweek matches)

The sync pipeline processes:
- Match results
- Upcoming fixtures
- Frame-by-frame data
- Player statistics

## Architecture

```
Vercel Cron Job
    ↓
POST /api/sync
    ↓ (with Authorization header)
Sync Pipeline Library
    ↓
LeagueAppLive Scraper
    ↓
Firestore Database
```

## Configuration Steps

### 1. Set CRON_SECRET in Vercel Dashboard

The API endpoint requires authentication via a secret token to prevent unauthorized access.

#### Steps:
1. Navigate to your Vercel project dashboard
2. Go to **Settings** → **Environment Variables**
3. Add a new environment variable:
   - **Name**: `CRON_SECRET`
   - **Value**: Generate a secure random string (minimum 32 characters)
     ```bash
     # Generate a secure secret:
     openssl rand -base64 32
     ```
   - **Environment**: Select all environments (Production, Preview, Development)
4. Click **Save**
5. Redeploy your application for the changes to take effect

#### Important Notes:
- **Keep this secret secure** - anyone with this token can trigger data syncs
- Use a cryptographically secure random value (not a simple password)
- Store this value securely (e.g., password manager) if you need to trigger manual syncs
- In local development, add `CRON_SECRET` to your `.env.local` file

### 2. Verify Cron Jobs Are Scheduled

After deploying your application with the cron configuration in `vercel.json`, verify the cron jobs are registered.

#### Steps:
1. Navigate to your Vercel project dashboard
2. Go to **Settings** → **Cron Jobs**
3. Verify you see two cron jobs:
   - **Path**: `/api/sync`
   - **Schedule**: `0 23 * * 0` (Sunday at 23:00 UTC)
   - **Path**: `/api/sync`
   - **Schedule**: `0 23 * * 3` (Wednesday at 23:00 UTC)

#### Cron Schedule Format:
```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
│ │ │ │ │
0 23 * * 0  → Sunday at 23:00 UTC
0 23 * * 3  → Wednesday at 23:00 UTC
```

### 3. Manually Trigger a Test Sync

You can manually trigger a sync to test the pipeline without waiting for the scheduled time.

#### Option A: Using Vercel Dashboard (Recommended)
1. Navigate to **Deployments** → Select your latest deployment
2. Go to **Functions** → Find `/api/sync`
3. Click **Trigger** to manually invoke the cron job

#### Option B: Using cURL
```bash
curl -X POST https://your-app.vercel.app/api/sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

**Request Parameters:**
- `league` (optional): Sync a specific league (`wrexham`, `nwpa`, or `chester`). Omit to sync all leagues.
- `dryRun` (optional): Set to `true` to preview changes without writing to Firestore. Default: `false`.

**Example: Sync only Wrexham league (dry run)**
```bash
curl -X POST https://your-app.vercel.app/api/sync \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"league": "wrexham", "dryRun": true}'
```

**Example Response:**
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
    // ... other leagues
  ]
}
```

### 4. Monitor Cron Execution

#### View Logs in Vercel Dashboard
1. Navigate to your project dashboard
2. Go to **Deployments** → Select your deployment
3. Click **Functions** → **Runtime Logs**
4. Filter by `/api/sync` to see cron execution logs

#### Expected Log Output
Look for these indicators of successful execution:
- `POST /api/sync 200` - Successful request
- Record counts in the response body
- No error messages or stack traces

#### Vercel Cron Logs
Vercel also provides specific cron execution logs:
1. Go to **Settings** → **Cron Jobs**
2. Click on a specific cron job
3. View **Execution History** with timestamps and status codes

## Troubleshooting

### Issue: Cron Job Not Appearing in Dashboard

**Symptoms:**
- No cron jobs listed in Settings → Cron Jobs
- Scheduled syncs are not running

**Solutions:**
1. Verify `vercel.json` includes the `crons` configuration:
   ```json
   {
     "crons": [
       {
         "path": "/api/sync",
         "schedule": "0 23 * * 0"
       }
     ]
   }
   ```
2. Ensure you've deployed to production (not just preview)
3. Check Vercel's deployment logs for configuration errors
4. Re-deploy after making changes to `vercel.json`

### Issue: 401 Unauthorized Error

**Symptoms:**
- API returns `{"error": "Unauthorized. Valid Authorization header required."}`
- Cron jobs fail with 401 status

**Solutions:**
1. Verify `CRON_SECRET` is set in Vercel environment variables
2. Ensure the secret matches exactly (no extra spaces or quotes)
3. Redeploy after adding environment variables
4. For manual triggers, check the Authorization header format:
   ```
   Authorization: Bearer YOUR_SECRET_HERE
   ```

### Issue: 400 Invalid League Error

**Symptoms:**
- API returns `{"error": "Invalid league: \"xyz\". Available leagues: wrexham, nwpa, chester"}`

**Solutions:**
1. Check the league name in your request body
2. Valid league keys are: `wrexham`, `nwpa`, `chester`
3. League keys are case-sensitive and must match exactly
4. Omit the `league` parameter to sync all leagues

### Issue: Sync Times Out or Fails Partially

**Symptoms:**
- 500 Internal Server Error
- Some leagues sync successfully, others fail
- Timeout errors in logs

**Solutions:**
1. Check LeagueAppLive website availability
2. Verify network connectivity from Vercel
3. Review error details in the response:
   ```json
   {
     "success": false,
     "message": "Sync completed with errors",
     "details": [
       {
         "league": "wrexham",
         "success": true,
         "results": 52
       },
       {
         "league": "nwpa",
         "success": false,
         "error": "Timeout fetching results page"
       }
     ]
   }
   ```
4. Try syncing individual leagues to isolate the issue:
   ```bash
   curl -X POST https://your-app.vercel.app/api/sync \
     -H "Authorization: Bearer YOUR_CRON_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"league": "nwpa"}'
   ```
5. Check Vercel function timeout limits (default 10s for Hobby, 60s for Pro)

### Issue: Duplicate Data in Firestore

**Symptoms:**
- Multiple identical records appear in Firestore
- Data counts increase on each sync even without new matches

**Solutions:**
1. The sync pipeline is designed to be idempotent (safe to run multiple times)
2. Check the `lastUpdated` timestamp in Firestore to verify updates
3. Ensure Firestore write logic uses document IDs based on unique match identifiers
4. Run a sync with `dryRun: true` to preview changes:
   ```bash
   curl -X POST https://your-app.vercel.app/api/sync \
     -H "Authorization: Bearer YOUR_CRON_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"dryRun": true}'
   ```

### Issue: Cron Job Runs But Firestore Not Updated

**Symptoms:**
- Cron logs show successful execution (200 status)
- Firestore data remains unchanged
- No error messages in logs

**Solutions:**
1. Check if `dryRun` is accidentally set to `true` in production
2. Verify Firestore credentials are configured in Vercel environment variables:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - Other Firebase configuration variables (see `.env.local.example`)
3. Review Firestore security rules to ensure write access
4. Check response body in logs for actual record counts
5. Verify the sync isn't failing silently - check for errors in the `details` array

## Monitoring Best Practices

### Regular Checks
- **Weekly**: Review cron execution history for failures
- **Monthly**: Verify data freshness in Firestore (check `lastUpdated` timestamps)
- **After LeagueAppLive Updates**: Test sync manually if the source website changes structure

### Set Up Alerts (Future Enhancement)
The current implementation logs errors to console. Future improvements include:
- Email notifications on sync failures (via `sendSyncErrorEmail()`)
- Slack/Discord webhooks for real-time alerts
- Monitoring dashboard for sync history and success rates

### Performance Monitoring
- Monitor function execution time in Vercel logs
- Track record counts over time to detect anomalies
- Set up Vercel Analytics to track API endpoint performance

## Local Development

### Running Sync Locally
```bash
# Using the CLI script (original method)
npm run sync -- --league wrexham

# Using the API endpoint (new method)
npm run dev

# In another terminal:
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"league": "wrexham", "dryRun": true}'
```

### Testing Cron Configuration Locally
Vercel doesn't execute cron jobs in local development. To test:
1. Use `npm run dev` to start the development server
2. Manually trigger the API endpoint with cURL (no auth required in development)
3. Verify the response matches production behavior

## Security Considerations

### CRON_SECRET Best Practices
- ✅ Use a cryptographically secure random string (32+ characters)
- ✅ Rotate the secret periodically (e.g., quarterly)
- ✅ Store securely (password manager, encrypted vault)
- ❌ Don't commit the secret to version control
- ❌ Don't share the secret in chat or email
- ❌ Don't use simple passwords or predictable values

### Environment Variable Security
- Vercel encrypts environment variables at rest
- Environment variables are only accessible during build and runtime
- Use Vercel's built-in secret management - don't store secrets in code

### API Endpoint Protection
- The `/api/sync` endpoint is protected by token authentication
- Vercel automatically injects the `Authorization` header for cron jobs
- Manual triggers must include the `Authorization: Bearer <secret>` header
- Consider implementing rate limiting for additional protection (future enhancement)

## Additional Resources

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Vercel Environment Variables Guide](https://vercel.com/docs/concepts/projects/environment-variables)
- [Cron Expression Generator](https://crontab.guru/)
- [Next.js API Routes Documentation](https://nextjs.org/docs/api-routes/introduction)

## Support

If you encounter issues not covered in this guide:
1. Check Vercel deployment logs for detailed error messages
2. Review the source code in `src/app/api/sync/route.ts`
3. Test with `dryRun: true` to isolate issues
4. Verify all environment variables are correctly configured
