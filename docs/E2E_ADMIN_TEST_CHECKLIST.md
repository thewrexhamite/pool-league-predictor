# End-to-End Admin Access Test Checklist

This checklist verifies the complete admin role assignment and access control workflow.

## Prerequisites

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open your browser to: http://localhost:3000

## Test 1: Regular User Cannot Access Admin Dashboard

### Steps:
1. **Navigate to admin page**: Go to http://localhost:3000/admin
2. **Verify login prompt**:
   - [ ] "Sign in to continue" message is displayed
   - [ ] OAuth login buttons are visible
   - [ ] Admin dashboard is NOT visible

3. **Sign in as regular user** (without admin role):
   - [ ] Click "Sign in with Google"
   - [ ] Complete OAuth flow
   - [ ] You're redirected back to the page

4. **Verify access denied**:
   - [ ] "Access Denied" message is displayed
   - [ ] "Admin access required" message is shown
   - [ ] Admin dashboard is NOT visible
   - [ ] No admin tools are accessible

5. **Verify main app navigation**:
   - [ ] Go to home page: http://localhost:3000
   - [ ] Admin link is NOT visible in navigation (no shield icon)
   - [ ] Regular tabs work normally (Dashboard, Standings, etc.)

### Expected Result: ✅ Regular users are blocked from admin access

---

## Test 2: Admin User Can Access Admin Dashboard

### Steps:
1. **Grant admin access to your account**:
   - Open browser console (F12)
   - Run this script (replace YOUR_USER_ID with your Firebase user ID):
   ```javascript
   // Get your user ID from auth context
   const userId = 'YOUR_USER_ID';

   // Import admin utilities
   const { setAdminStatus } = await import('./src/lib/auth/admin-utils');

   // Grant admin access
   await setAdminStatus(userId, true);
   console.log('✅ Admin access granted');
   ```

2. **Alternative: Use Firebase Console**:
   - Go to Firebase Console → Firestore Database
   - Navigate to `users` collection
   - Find your user document
   - Add field: `isAdmin: true`

3. **Refresh the page**: Reload http://localhost:3000/admin

4. **Verify admin access granted**:
   - [ ] Admin dashboard loads successfully
   - [ ] Welcome message displays your name
   - [ ] No "Access Denied" message
   - [ ] All admin panels are visible

### Expected Result: ✅ Admin users can access the admin dashboard

---

## Test 3: Admin Dashboard Loads All Panels

### Steps (as admin user):

1. **Verify overview section**:
   - [ ] "Admin Dashboard" heading is visible
   - [ ] Welcome message shows: "Welcome, [Your Name]"
   - [ ] Stats cards display (Divisions, Teams, Results, Frames)
   - [ ] Numbers in stats cards are accurate

2. **Verify admin tool cards**:
   - [ ] "Manage Users" card is present
   - [ ] "Manage Results" card is present
   - [ ] "League Analytics" card is present
   - [ ] "League Settings" card is present
   - [ ] "Data Correction" card is present
   - [ ] "Merge Players" card is present
   - [ ] "Reports" card is present (if implemented)
   - [ ] "Notifications" card is present (if implemented)

3. **Verify quick actions section**:
   - [ ] "Quick Actions" heading is visible
   - [ ] Action buttons are present
   - [ ] Buttons are clickable

4. **Verify responsive design**:
   - [ ] Desktop view: Grid layout displays properly
   - [ ] Mobile view: Cards stack vertically
   - [ ] No horizontal scrolling issues
   - [ ] All text is readable

### Expected Result: ✅ All admin panels load correctly

---

## Test 4: Navigation Works Between Admin Sections

### Steps (as admin user):

1. **Test navigation from main app**:
   - [ ] Go to home page: http://localhost:3000
   - [ ] Shield icon is visible in top navigation (desktop)
   - [ ] Click shield icon → navigates to /admin
   - [ ] Admin dashboard loads

2. **Test direct URL access**:
   - [ ] Navigate directly to http://localhost:3000/admin
   - [ ] Page loads without errors
   - [ ] Dashboard renders correctly

3. **Test browser back/forward**:
   - [ ] Navigate to admin dashboard
   - [ ] Click browser back button
   - [ ] Go back to previous page successfully
   - [ ] Click browser forward button
   - [ ] Return to admin dashboard successfully

4. **Test scroll behavior**:
   - [ ] Scroll down on admin dashboard
   - [ ] All sections are visible
   - [ ] No layout issues when scrolling

5. **Test component interactions**:
   - [ ] Data Correction panel expands/collapses
   - [ ] Manual Result Entry form displays
   - [ ] Player Merge search works
   - [ ] League Settings form loads
   - [ ] League Health Metrics displays (or shows loading state)

### Expected Result: ✅ Navigation works seamlessly

---

## Test 5: Admin Tool Functionality (Quick Smoke Test)

### Data Correction Panel:
- [ ] Panel is visible
- [ ] Results list displays (if data exists)
- [ ] Edit button works
- [ ] Form validation works

### Manual Result Entry:
- [ ] Form is visible
- [ ] Date picker works
- [ ] Team dropdowns populate
- [ ] Score adjustment buttons (+/-) work
- [ ] Save button is clickable

### Player Merge Panel:
- [ ] Search input is visible
- [ ] Search functionality works (min 2 characters)
- [ ] Player selection works
- [ ] Merge preview displays statistics

### League Health Metrics:
- [ ] Metrics panel loads
- [ ] Shows loading state or data
- [ ] No console errors

### League Settings Panel:
- [ ] Settings form displays
- [ ] Color picker inputs work
- [ ] Toggle switches work
- [ ] Save button is clickable

### Expected Result: ✅ All admin tools are functional

---

## Test 6: Security Verification

### Steps:

1. **Test API endpoint protection** (as regular user):
   - Open browser console (F12)
   - Run these fetch requests:
   ```javascript
   // Test admin users endpoint (should return 401 or 403)
   fetch('/api/admin/users')
     .then(r => r.json())
     .then(console.log);

   // Test admin analytics endpoint (should return 401 or 403)
   fetch('/api/admin/analytics')
     .then(r => r.json())
     .then(console.log);
   ```
   - [ ] Both requests return 401 (Unauthorized) or 403 (Forbidden)
   - [ ] No admin data is exposed

2. **Test as admin user**:
   - Sign in as admin
   - Run the same fetch requests
   - [ ] Requests return 200 (OK) with data

### Expected Result: ✅ API endpoints are properly secured

---

## Test 7: Console Errors Check

### Steps:

1. **Open browser console**: Press F12

2. **Navigate through admin sections**:
   - [ ] No console errors on initial load
   - [ ] No console errors when switching sections
   - [ ] No console errors when interacting with forms

3. **Check for warnings**:
   - [ ] No React warnings about keys
   - [ ] No prop type warnings
   - [ ] No accessibility warnings

### Expected Result: ✅ No console errors or warnings

---

## Summary Checklist

- [ ] Test 1: Regular users blocked from /admin ✅
- [ ] Test 2: Admin users can access /admin ✅
- [ ] Test 3: All panels load correctly ✅
- [ ] Test 4: Navigation works properly ✅
- [ ] Test 5: Admin tools are functional ✅
- [ ] Test 6: API endpoints are secured ✅
- [ ] Test 7: No console errors ✅

---

## Notes

**Issues Found:**
- (Record any issues here)

**Additional Observations:**
- (Record any additional notes)

**Test Date:** _______________
**Tester:** _______________
**Result:** PASS / FAIL
