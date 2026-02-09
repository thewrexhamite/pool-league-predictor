# Lighthouse PWA Audit Guide

This guide will walk you through running a Lighthouse PWA audit to verify that the offline caching strategies and PWA implementation meet the required standards.

## Prerequisites

- Production build completed: `npm run build`
- Production server running: `npm start`
- Chrome or Edge browser (Lighthouse is built-in to DevTools)

## Part 1: Start Production Server

1. **Ensure no other servers are running on port 3000:**
   ```bash
   # Check if port 3000 is in use
   lsof -i :3000

   # If needed, stop any running Next.js server
   pkill -f "next start"
   ```

2. **Build and start the production server:**
   ```bash
   # Build the production bundle (includes service worker generation)
   npm run build

   # Start the production server
   npm start
   ```

3. **Verify server is running:**
   - Server should start on http://localhost:3000
   - You should see: `✓ Ready on http://localhost:3000`

## Part 2: Run Lighthouse PWA Audit in Chrome DevTools

### Method A: Using Chrome DevTools (Recommended)

1. **Open the app in Chrome:**
   - Navigate to http://localhost:3000 in Chrome
   - Make sure you're using an Incognito window for the most accurate results

2. **Open DevTools:**
   - Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows/Linux)
   - Go to the "Lighthouse" tab (may be under the >> menu)

3. **Configure Lighthouse:**
   - Categories: **Only check "Progressive Web App"** (uncheck others for faster audit)
   - Device: Select "Mobile" or "Desktop" (Mobile is recommended for PWA testing)
   - Throttling: Use "Simulated throttling" (default)

4. **Run the audit:**
   - Click "Analyze page load"
   - Wait 30-60 seconds for the audit to complete
   - Do not interact with the page or switch tabs during the audit

5. **Review the results:**
   - **Target Score: ≥ 90/100**
   - The report will show passed and failed audits

### Method B: Using Lighthouse CLI

```bash
# Install Lighthouse globally (if not already installed)
npm install -g lighthouse

# Run PWA audit
lighthouse http://localhost:3000 \
  --only-categories=pwa \
  --view \
  --chrome-flags="--no-sandbox"
```

This will:
- Run the PWA audit
- Generate an HTML report
- Automatically open the report in your browser

## Part 3: Verify PWA Criteria

The Lighthouse audit should show **passing scores** for these key PWA criteria:

### ✅ Installable

- [ ] **Web app manifest meets requirements**
  - manifest.json exists at `/manifest.json`
  - Contains name, short_name, start_url, display, icons

- [ ] **Has appropriate icons**
  - At least one icon ≥ 192x192px (icon-192.png)
  - At least one icon ≥ 512x512px (icon-512.png)
  - Apple touch icon for iOS (apple-touch-icon.png)

### ✅ PWA Optimized

- [ ] **Service worker registered**
  - Service worker file: `/firebase-messaging-sw.js`
  - Successfully registered and activated

- [ ] **Works offline**
  - Service worker responds with 200 when offline
  - App shell cached for offline access

- [ ] **Page load is fast enough on mobile networks**
  - Should pass or have acceptable performance

### ✅ Additional Checks

- [ ] **HTTPS** (localhost is acceptable for testing)
- [ ] **Viewport meta tag** configured for mobile
- [ ] **Status bar theme color** set (apple-mobile-web-app-status-bar-style)

## Part 4: Inspect Service Worker Details

While DevTools is open:

1. **Go to Application tab > Service Workers:**
   - Verify status: "activated and is running"
   - Verify scope: "/"
   - Check registration time

2. **Go to Application tab > Cache Storage:**
   - Should see three caches:
     - `app-shell-v1` - Core app files
     - `dynamic-v1` - API responses and pages
     - `images-v1` - Image assets

3. **Test offline functionality:**
   - In DevTools, go to Network tab
   - Check "Offline" checkbox
   - Refresh the page
   - Verify: Page loads with cached data
   - Verify: Offline indicator appears at top

## Part 5: Interpret Results

### Score Interpretation

| Score Range | Status | Action Required |
|-------------|--------|-----------------|
| 90-100 | ✅ Excellent | PWA ready! Proceed with deployment |
| 80-89 | ⚠️ Good | Review warnings, consider improvements |
| <80 | ❌ Needs Work | Fix failing audits before marking complete |

### Common Issues and Fixes

#### Issue: "Web app manifest does not meet installability requirements"

**Fix:** Check manifest.json includes:
```json
{
  "name": "Pool League Pro",
  "short_name": "Pool Pro",
  "start_url": "/",
  "display": "standalone",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

#### Issue: "Service worker not registered"

**Check:**
1. Service worker file exists: `ls public/firebase-messaging-sw.js`
2. Service worker is registered in browser console:
   ```javascript
   navigator.serviceWorker.getRegistrations().then(console.log)
   ```
3. No console errors preventing registration

**Fix:** Rebuild the app to regenerate service worker:
```bash
npm run build
npm start
```

#### Issue: "Does not respond with 200 when offline"

**Check:**
1. Service worker fetch handler is working
2. App shell assets are cached
3. Test in DevTools offline mode

**Fix:** Verify service worker includes offline caching strategies in `public/firebase-messaging-sw.js`

#### Issue: "Manifest doesn't have maskable icon"

**Optional improvement** (not required for passing):
- Our icons are marked as "any" purpose which is acceptable
- For higher scores, you could create dedicated maskable icons with safe zones

## Part 6: Record Results

After running the audit, record the following:

1. **PWA Score:** ______/100

2. **Installable:** ☐ Pass / ☐ Fail
   - Manifest requirements: ☐ Pass / ☐ Fail
   - Service worker registered: ☐ Pass / ☐ Fail

3. **PWA Optimized:** ☐ Pass / ☐ Fail
   - Works offline: ☐ Pass / ☐ Fail
   - Page load performance: ☐ Pass / ☐ Fail

4. **Failed Audits (if any):**
   - List any failing audits and their messages

5. **Screenshots:**
   - Take a screenshot of the Lighthouse score
   - Take a screenshot of any failing audits

## Success Criteria

To mark this subtask as complete, you must have:

- ✅ PWA score ≥ 90/100
- ✅ "Installable" category passing
- ✅ Service worker registered and working
- ✅ App works offline (verified in DevTools)
- ✅ No critical PWA audit failures

## Troubleshooting

### Port 3000 already in use

```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or start on a different port
PORT=3001 npm start
```

### Service worker not updating

```bash
# Hard refresh in browser
Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)

# Or clear service workers in DevTools
# Application > Service Workers > Unregister
```

### Lighthouse times out

- Ensure you're not running other heavy processes
- Close other browser tabs
- Try the CLI method instead of DevTools
- Disable browser extensions in Incognito mode

## Next Steps

Once the Lighthouse audit passes with a score ≥ 90:

1. ✅ Mark subtask-5-3 as completed
2. ✅ Commit the verification results
3. ✅ Update implementation_plan.json
4. ✅ Proceed to final QA sign-off

---

**Note:** Lighthouse audits can vary slightly between runs due to network conditions and system load. If you score between 88-90, run the audit 2-3 times to ensure consistency.
