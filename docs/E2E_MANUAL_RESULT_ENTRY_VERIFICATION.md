# End-to-End Manual Result Entry Verification

This document provides comprehensive verification procedures for the manual result entry workflow.

## Overview

The manual result entry workflow allows league administrators to manually add match results when sync fails or for historical data entry. The complete flow includes:

1. Admin opens manual entry form
2. Fills in match details and scores
3. Submits result
4. Result saves to Firestore
5. Result appears in results list and standings

## Verification Checklist

### ✅ Step 1: Admin Opens Manual Entry Form

**Expected Behavior:**
- Manual entry form renders on admin dashboard
- Form displays all required fields: date, home team, away team, scores
- Team dropdowns populate with teams from league divisions
- Initial scores default to 5-5
- Form is clean and user-friendly

**Manual Test Procedure:**
1. Navigate to http://localhost:3000/admin (requires admin authentication)
2. Scroll to "Manual Result Entry" section
3. Verify form is visible and all fields are present

**Automated Tests:**
- `should render the manual entry form`
- `should display teams from league divisions`
- `should filter teams by selected division`

---

### ✅ Step 2: Fills in Match Details and Scores

**Expected Behavior:**
- Date picker allows selecting match date
- Home team dropdown shows available teams
- Away team dropdown shows available teams (excluding home team ideally)
- Score adjustment buttons (+/-) work correctly
- Scores always sum to 10
- Form validates input before submission

**Manual Test Procedure:**
1. Click on date input and select a date (e.g., 2026-02-15)
2. Select a home team from the dropdown (e.g., "Team A")
3. Select a different away team from the dropdown (e.g., "Team B")
4. Click the "+" button next to home score to increase it
5. Verify away score decreases automatically
6. Verify scores always sum to 10
7. Try to select the same team for both home and away
8. Verify validation error appears

**Validation Rules:**
- Date is required
- Home team is required
- Away team is required
- Home and away teams must be different
- Scores must sum to 10 (enforced automatically)

**Automated Tests:**
- `should allow filling in date, teams, and scores`
- `should allow adjusting scores with +/- buttons`
- `should maintain score sum of 10`
- `should validate that teams are different`
- `should validate required fields`

---

### ✅ Step 3: Submits Result

**Expected Behavior:**
- Clicking "Save Result" triggers submission
- Form shows loading state ("Saving...")
- Validation runs before submission
- Error messages display if validation fails
- Success triggers form reset and page reload

**Manual Test Procedure:**
1. Fill in all form fields with valid data
2. Click "Save Result" button
3. Verify button shows "Saving..." during submission
4. Verify no console errors appear
5. Verify page reloads after successful submission

**Error Handling:**
- Network errors display user-friendly message
- Validation errors prevent submission
- API errors are caught and displayed

**Automated Tests:**
- `should call onSubmit with correct result data`
- `should show loading state while submitting`
- `should display error if submission fails`

---

### ✅ Step 4: Result Saves to Firestore

**Expected Behavior:**
- POST request sent to `/api/admin/results`
- Request includes Authorization header with Firebase ID token
- Request body contains: seasonId, result (date, home, away, home_score, away_score, division)
- Division is automatically determined from team selection
- API validates request and saves to Firestore
- Firestore `seasons/2025-26` document updated with new result in `results` array

**API Endpoint:**
```
POST /api/admin/results
```

**Request Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <firebase-id-token>"
}
```

**Request Body:**
```json
{
  "seasonId": "2025-26",
  "result": {
    "date": "2026-02-15",
    "home": "Team A",
    "away": "Team B",
    "home_score": 7,
    "away_score": 3,
    "division": "Premier"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Result created successfully",
  "result": {
    "date": "2026-02-15",
    "home": "Team A",
    "away": "Team B",
    "home_score": 7,
    "away_score": 3,
    "division": "Premier",
    "frames": 10
  }
}
```

**Response (Error):**
```json
{
  "error": "Invalid or missing home team field"
}
```

**Status Codes:**
- 200: Success
- 400: Bad request (validation error)
- 401: Unauthorized (missing or invalid auth token)
- 403: Forbidden (user is not admin)
- 404: Season not found
- 500: Server error

**Manual Test Procedure:**
1. Open browser DevTools Network tab
2. Submit a new result through the form
3. Find the POST request to `/api/admin/results`
4. Verify request payload is correct
5. Verify response status is 200
6. Verify response contains success message

**Automated Tests:**
- `should make API request with correct payload`

---

### ✅ Step 5: Result Appears in Results List and Standings

**Expected Behavior:**
- Page reloads after successful submission
- New result appears in results list
- Standings recalculate to include new result
- Team records update correctly
- New result is visible throughout the app

**Manual Test Procedure:**
1. After submitting a new result, verify page reloads
2. Navigate to "Results" tab
3. Verify new result appears in the list
4. Navigate to "Standings" tab
5. Verify team standings reflect the new result
6. Check team records (wins/losses/points) are updated
7. Verify result appears in both teams' match history

**Data Flow:**
1. User fills form and clicks "Save Result"
2. Component validates input
3. Component determines division from team selection
4. Component gets Firebase auth token
5. Component sends POST request to `/api/admin/results`
6. API middleware verifies admin authorization
7. API validates result data
8. API adds result to Firestore `seasons/2025-26` document
9. API returns success response
10. Component triggers page reload
11. LeagueDataProvider fetches fresh data
12. Updated results and standings appear throughout app

**Automated Tests:**
- `should reset form after successful submission`

---

## Integration Test Coverage

### Test File
`src/__tests__/integration/manual-result-entry.test.tsx`

### Test Suites

1. **Step 1: Admin opens manual entry form** (3 tests)
   - Form rendering
   - Team population
   - Division filtering

2. **Step 2: Fills in match details and scores** (5 tests)
   - Date/team/score input
   - Score adjustment logic
   - Score sum validation
   - Team difference validation
   - Required field validation

3. **Step 3: Submits result** (3 tests)
   - onSubmit callback
   - Loading state
   - Error display

4. **Step 4-5: Result saves and appears** (2 tests)
   - API request payload
   - Form reset

5. **Cancel functionality** (1 test)
   - Cancel and reset

**Total Tests:** 14 integration tests

### Running Tests

```bash
# Run all manual result entry tests
npm test -- --testPathPattern=manual-result-entry

# Run with coverage
npm test -- --testPathPattern=manual-result-entry --coverage

# Watch mode
npm test -- --testPathPattern=manual-result-entry --watch
```

---

## Manual Verification Procedure

### Prerequisites
1. Development server running: `npm run dev`
2. Admin user authenticated
3. Browser DevTools open (Network and Console tabs)

### Step-by-Step Manual Test

1. **Access Form**
   - Navigate to http://localhost:3000/admin
   - Scroll to "Manual Result Entry" section
   - ✅ Form is visible

2. **Fill Valid Data**
   - Select date: 2026-02-15
   - Select home team: Any valid team
   - Select away team: Different valid team
   - Adjust scores using +/- buttons
   - ✅ All inputs work correctly

3. **Test Validation**
   - Try to select same team for home and away
   - ✅ Error message appears: "Home and away teams must be different"
   - Try to submit with empty fields
   - ✅ Error message appears: "Please select a home team"

4. **Submit Result**
   - Fill all fields with valid data
   - Click "Save Result"
   - ✅ Button shows "Saving..."
   - ✅ No console errors
   - ✅ Network request to `/api/admin/results` appears
   - ✅ Request has Authorization header
   - ✅ Response status 200
   - ✅ Page reloads

5. **Verify Persistence**
   - After reload, navigate to Results tab
   - ✅ New result appears in list
   - Navigate to Standings tab
   - ✅ Team records updated correctly

### Common Issues

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| "Not authenticated" error | Auth token expired | Re-login as admin |
| "Could not determine division" error | Teams from different divisions | Select teams from same division |
| "401 Unauthorized" response | Missing auth header | Check Firebase auth initialization |
| "403 Forbidden" response | User not admin | Verify admin role in Firestore |
| Form doesn't reset | JavaScript error | Check browser console |
| Result doesn't appear | Firestore write failed | Check API logs and Firestore rules |

---

## Success Criteria

All of the following must be true:

- ✅ Admin can open manual entry form
- ✅ Form displays all required fields
- ✅ Team dropdowns populate correctly
- ✅ Date picker works
- ✅ Score adjustment buttons work
- ✅ Scores always sum to 10
- ✅ Form validates required fields
- ✅ Form prevents same team selection
- ✅ Submit button shows loading state
- ✅ API request includes auth header
- ✅ API request has correct payload structure
- ✅ Division is determined automatically
- ✅ Result saves to Firestore
- ✅ Page reloads after success
- ✅ New result appears in results list
- ✅ Standings update correctly
- ✅ No console errors during flow
- ✅ Error messages display for failures
- ✅ Form resets after successful submission
- ✅ All 14 integration tests pass

---

## Future Enhancements

Potential improvements for the manual result entry workflow:

1. **Frame-by-frame entry**: Allow entering individual frame scores (currently defaults to total)
2. **Bulk import**: Upload CSV file with multiple results
3. **Duplicate detection**: Warn if similar result already exists
4. **Auto-save drafts**: Save partial entries to local storage
5. **Division auto-detection**: Auto-select division when teams chosen
6. **Team search**: Search/filter teams instead of dropdown
7. **Recent teams**: Show recently used teams for quick entry
8. **Validation preview**: Show what will be saved before submitting
9. **Undo last entry**: Allow reverting the most recent submission
10. **Batch entry mode**: Stay on form after save for multiple entries

---

## Related Documentation

- API Route: `src/app/api/admin/results/route.ts`
- Component: `src/components/admin/ManualResultEntry.tsx`
- Integration: `src/components/admin/AdminDashboard.tsx`
- Tests: `src/__tests__/integration/manual-result-entry.test.tsx`
- Data Types: `src/lib/types.ts` (MatchResult interface)

---

## Verification Sign-Off

**Date:** _________________

**Verified By:** _________________

**Test Results:**
- [ ] All automated tests pass
- [ ] Manual verification complete
- [ ] No console errors
- [ ] Results persist correctly
- [ ] Standings update correctly

**Notes:**

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________
