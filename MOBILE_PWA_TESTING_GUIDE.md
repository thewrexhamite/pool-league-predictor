# Mobile PWA Testing Guide

This guide provides step-by-step instructions for testing PWA installability and offline functionality on mobile devices.

## Prerequisites

- iOS device with Safari (iOS 16.4+ recommended)
- Android device with Chrome (version 80+ recommended)
- Vercel account with deployment access
- The app must be served over HTTPS (Vercel preview provides this)

## Part 1: Deploy to Vercel Preview

### Option A: Deploy via Git Push

1. **Commit and push changes to your repository**
   ```bash
   git add .
   git commit -m "Ready for mobile PWA testing"
   git push origin your-branch-name
   ```

2. **Get Vercel preview URL**
   - Go to your Vercel dashboard
   - Find the deployment for your branch
   - Copy the preview URL (e.g., `https://pool-league-predictor-abc123.vercel.app`)

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI (if not already installed)**
   ```bash
   npm i -g vercel
   ```

2. **Deploy to preview**
   ```bash
   vercel
   ```

3. **Copy the preview URL from the output**

## Part 2: Test on iOS Safari

### Step 1: Open the App

1. Open Safari on your iOS device
2. Navigate to the Vercel preview URL
3. Wait for the app to fully load

### Step 2: Verify PWA Readiness

Before testing installation, verify these items:

1. **Check the URL bar** - should show `https://` (secure connection required)
2. **Load some data** - Navigate to Standings and Players tabs while online
3. **Check console** (optional) - Connect device to Mac, use Safari Developer tools:
   - Mac Safari > Develop > [Your iPhone] > [Your Tab]
   - Check for service worker registration messages
   - Should see "Service worker registered successfully"

### Step 3: Install the App

1. **Tap the Share button** (square with up arrow at bottom of Safari)
2. **Scroll down** and tap **"Add to Home Screen"**
3. **Verify the app icon** is displayed in the preview
4. **Verify the app name** shows "Pool League Pro"
5. **Tap "Add"** in the top right corner

Expected result: ✅ App icon appears on your home screen

### Step 4: Launch and Verify Standalone Mode

1. **Tap the app icon** on your home screen
2. **Verify standalone mode**:
   - ❌ NO Safari UI (no address bar, no back/forward buttons)
   - ✅ App runs in full screen
   - ✅ Status bar matches app theme (green theme color)
3. **Check splash screen** - should show app icon and name briefly on launch

### Step 5: Test Offline Functionality

1. **While app is open and online:**
   - Navigate to Standings tab (load data)
   - Navigate to Players tab (load data)
   - View a few player profiles

2. **Enable Airplane Mode:**
   - Open Control Center
   - Tap Airplane Mode icon
   - ✅ Verify offline indicator appears at top: "You are offline - viewing cached data"

3. **Test navigation while offline:**
   - Navigate between Standings and Players tabs
   - ✅ Data should load from cache
   - ✅ Cached data badges should show: "🔌 Offline" or "💾 Cached • Xm ago"
   - Try refreshing by pulling down (may not work offline - expected)

4. **Restore connection:**
   - Disable Airplane Mode
   - ✅ Offline indicator should disappear automatically
   - ✅ Data should sync in background
   - ✅ Cached badges should update or disappear

### Step 6: Test App Persistence

1. **Close the app** (swipe up from bottom)
2. **Wait 10 seconds**
3. **Reopen the app** from home screen
   - ✅ App should open quickly (no need to reload from server)
   - ✅ Cached data should be available immediately
   - ✅ Service worker should remain active

## Part 3: Test on Android Chrome

### Step 1: Open the App

1. Open Chrome browser on your Android device
2. Navigate to the Vercel preview URL
3. Wait for the app to fully load

### Step 2: Verify PWA Readiness

1. **Check for install prompt** - Chrome may show a banner or prompt automatically:
   - "Add Pool League Pro to Home screen"
   - If you see this prompt, note it but don't install yet

2. **Load some data** while online:
   - Navigate to Standings and Players tabs
   - View a few player profiles

### Step 3: Install the App

**Method 1: Via Install Banner (if available)**
- Tap the banner that says "Add Pool League Pro to Home screen"
- Tap "Install" or "Add"

**Method 2: Via Chrome Menu**
1. Tap the **three dots menu** (⋮) in the top right
2. Tap **"Install app"** or **"Add to Home screen"**
3. Confirm the installation

Expected result: ✅ Install dialog appears with app name and icon

### Step 4: Launch and Verify Standalone Mode

1. **Tap the app icon** on your home screen (or app drawer)
2. **Verify standalone mode**:
   - ❌ NO Chrome UI (no address bar, no tabs)
   - ✅ App runs in full screen
   - ✅ Android system status bar remains visible
   - ✅ Theme color applied to status bar (green)

### Step 5: Test Offline Functionality

1. **While app is open and online:**
   - Ensure Standings and Players data is loaded
   - Navigate between tabs

2. **Enable Airplane Mode:**
   - Open Quick Settings
   - Tap Airplane Mode
   - ✅ Verify offline indicator appears: "You are offline - viewing cached data"

3. **Test navigation while offline:**
   - Navigate between tabs
   - ✅ Cached data should load
   - ✅ Cached data badges should show
   - Pull down to refresh (will fail - expected)

4. **Restore connection:**
   - Disable Airplane Mode
   - ✅ Offline indicator disappears
   - ✅ Data syncs automatically

### Step 6: Test Install Persistence

1. **Close the app** (swipe away from recents)
2. **Wait 10 seconds**
3. **Reopen the app**
   - ✅ Fast launch
   - ✅ Cached data available immediately

## Part 4: Additional Verification

### Verify Service Worker Registration

**On iOS (using Safari Developer on Mac):**
1. Connect iPhone to Mac via USB
2. Mac Safari > Develop > [Your iPhone] > [Your Tab]
3. Console tab > Look for:
   ```
   Service worker registered successfully
   ```

**On Android (using Chrome DevTools):**
1. Connect Android device to computer via USB
2. Enable USB debugging on Android
3. Chrome on computer > `chrome://inspect`
4. Find your device and tap "Inspect"
5. Application tab > Service Workers
6. ✅ Verify status: "activated and is running"

### Verify Cache Storage

**Check cache entries:**
1. Follow steps above to open DevTools
2. Application tab > Cache Storage
3. ✅ Should see caches:
   - `app-shell-v1`
   - `dynamic-v1`
   - `images-v1`
4. Expand each cache and verify entries

### Test Update Flow

1. **Make a small change** to the app (e.g., change a text label)
2. **Deploy the update** to Vercel
3. **Open the installed app** on mobile
4. ✅ App should detect update and prompt to reload (if implemented)
5. Or manually refresh to get new version

## Troubleshooting

### Install Prompt Not Appearing

**iOS Safari:**
- iOS doesn't show an automatic prompt
- Installation is always manual via Share > Add to Home Screen
- Make sure you're using Safari (not Chrome or other browsers on iOS)

**Android Chrome:**
- Install criteria must be met:
  - Served over HTTPS ✅ (Vercel provides this)
  - Has valid manifest.json ✅
  - Has service worker ✅
  - User has engaged with the site (visit at least twice)
- Try visiting the site, waiting 5 minutes, then visiting again
- Or use the manual method via Chrome menu

### App Not Running in Standalone Mode

**iOS:**
- Verify you installed via "Add to Home Screen" (not just bookmarked)
- Check that `apple-mobile-web-app-capable` meta tag is present
- May need to delete and reinstall

**Android:**
- Verify manifest.json has `"display": "standalone"`
- Check that service worker is registered
- Try reinstalling the app

### Offline Mode Not Working

**Common issues:**
1. **Data not cached** - Must load data while online first
2. **Service worker not registered** - Check DevTools
3. **Cache cleared** - iOS may clear caches if storage is low
4. **Wrong cache strategy** - Verify service worker code

**Verification steps:**
1. Open DevTools (remote debugging)
2. Check Cache Storage - should have entries
3. Check Service Workers - should be "activated"
4. Check Console - look for cache errors

### Offline Indicator Not Appearing

1. **Check network state** - Indicator only shows when `navigator.onLine === false`
2. **Verify component** - OfflineIndicator should be in layout
3. **Check browser** - Some browsers don't properly detect offline state
4. **Try toggling** - Disable/enable airplane mode a few times

### Data Not Syncing When Back Online

1. **Check console** for errors
2. **Verify online event listener** - Should trigger background sync
3. **Try manual refresh** - Pull down to refresh or reload app
4. **Check cache age** - Old caches may not trigger sync

## Expected Results Summary

### iOS Safari
- ✅ Manual installation via Share > Add to Home Screen
- ✅ App runs in standalone mode (no Safari UI)
- ✅ Green status bar
- ✅ Offline functionality works
- ✅ Cached data available after closing/reopening
- ✅ Splash screen on launch

### Android Chrome
- ✅ Automatic install prompt (or manual via menu)
- ✅ App runs in standalone mode (no Chrome UI)
- ✅ Green system status bar
- ✅ Offline functionality works
- ✅ Cached data persists
- ✅ Fast launch from home screen

## Success Criteria

Mark this subtask as complete when:

- [ ] App successfully installed on iOS via "Add to Home Screen"
- [ ] App successfully installed on Android via install prompt or menu
- [ ] Both versions launch in standalone mode (no browser UI)
- [ ] Offline indicator appears when connection is lost
- [ ] Previously loaded data is accessible offline
- [ ] Cached data badges show on Standings and Players tabs
- [ ] Data syncs automatically when connection is restored
- [ ] App persists and loads quickly after being closed
- [ ] Service worker is registered and active on both platforms

## Next Steps

After successful mobile testing:
1. Document any issues in build-progress.txt
2. Move to subtask-5-3: Verify cache strategies with Lighthouse PWA audit
3. Perform final QA sign-off

---

**Note:** Mobile device behavior may vary by OS version and browser version. Test on the latest stable versions for best results.
