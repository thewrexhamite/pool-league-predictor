# Manual Verification Checklist: Standings Tab

**Task:** subtask-6-4
**Date:** 2026-02-08
**Status:** Ready for Manual Testing

## Pre-Verification Status

✅ **Code Quality Checks Passed:**
- Type checking: PASSED (subtask-6-1)
- Linting: PASSED (subtask-6-1)
- Unit tests: PASSED (subtask-6-2)
- Production build: PASSED (subtask-6-3)

✅ **Component Analysis:**
- StandingsTab.tsx exists at: `src/components/StandingsTab.tsx`
- Component is 90 lines (well under 300 line target)
- Uses proper TypeScript types and interfaces
- Follows established patterns from codebase
- Imports work correctly with new modular structure

## How to Start Manual Testing

1. **Start the development server:**
   ```bash
   cd "/Users/michael/Projects/Pool App/pool-league-predictor"
   npm run dev
   ```

2. **Open browser:**
   - Navigate to: `http://localhost:3000`
   - The app should load on the Standings tab by default

## Manual Verification Steps

### ✅ Test 1: Standings Table Renders Correctly

**Steps:**
1. Verify the standings table displays with all columns:
   - Position (#)
   - Team name
   - P (Played), W (Wins), D (Draws), L (Losses)
   - F (For), A (Against), +/- (Goal difference)
   - Pts (Points)

2. Check visual indicators:
   - ✅ Top 2 teams have green border (promotion zone)
   - ✅ Bottom 2 teams have red border (relegation zone)
   - ✅ If "My Team" is set, that row has highlighted background

3. Check responsive design:
   - ✅ On mobile: Some columns hidden (D, L, F, A should be hidden)
   - ✅ On desktop: All columns visible

4. Check data accuracy:
   - ✅ Teams sorted by points correctly
   - ✅ Goal difference calculated correctly (+/- column)
   - ✅ Points calculated correctly (3 for W, 1 for D, 0 for L)

**Expected Result:**
- Table renders without layout issues
- Data displays correctly with proper styling
- Responsive breakpoints work as expected

---

### ✅ Test 2: Click Team to View Details

**Steps:**
1. Click any team name in the standings table
2. Verify that TeamDetail view opens
3. Check that team details include:
   - Team stats and record
   - Player roster
   - Recent results
   - Upcoming fixtures

4. Click "Back" or navigate away
5. Return to standings and click a different team

**Expected Result:**
- Clicking team navigates to team detail view
- Team detail loads without errors
- Navigation works smoothly
- Can view multiple teams sequentially

---

### ✅ Test 3: Switch Divisions

**Steps:**
1. Note the current division (e.g., "Division 1")
2. Click the division selector in the header
3. Select a different division
4. Verify standings update to show new division's teams

5. Switch to each division:
   - Division 1
   - Division 2
   - Division 3
   - Division 4
   - Any other divisions if they exist

6. For each division verify:
   - Correct division name shown in header
   - Correct teams for that division
   - Standings recalculated correctly

**Expected Result:**
- Division selector responds to clicks
- Standings update immediately when division changes
- Each division shows correct teams and standings
- No lag or flickering during division switch

---

### ✅ Test 4: No Console Errors

**Steps:**
1. Open browser DevTools (F12 or Cmd+Option+I)
2. Go to Console tab
3. Perform all above tests while watching console
4. Check for:
   - ❌ No red error messages
   - ❌ No unhandled promise rejections
   - ⚠️  Warnings are acceptable if they're from libraries
   - ✅ Only info/debug logs should appear

5. Check Network tab:
   - ✅ All API calls succeed (200 status)
   - ✅ No failed resource loads (404/500 errors)

**Expected Result:**
- Console is clean with no errors
- No broken network requests
- App functions without runtime errors

---

## Additional Checks

### Visual Polish
- ✅ Hover states work (rows highlight on hover)
- ✅ Colors match design system (win=green, loss=red)
- ✅ Typography is consistent and readable
- ✅ Share button appears and functions

### Performance
- ✅ Table renders quickly (<100ms)
- ✅ Division switching is instant (<50ms)
- ✅ No layout shift or reflow issues

### Accessibility
- ✅ Table uses semantic HTML (`<table>`, `<thead>`, `<tbody>`)
- ✅ Clickable rows have cursor pointer
- ✅ Color contrast meets WCAG standards

---

## Sign-Off

**Verification completed by:** _________________
**Date:** _________________
**Result:** ☐ PASS  ☐ FAIL

**Issues found (if any):**
_________________________________________
_________________________________________
_________________________________________

**Notes:**
_________________________________________
_________________________________________
_________________________________________

---

## Component Technical Details

**File:** `src/components/StandingsTab.tsx`
**Lines of code:** 90
**Dependencies:**
- `clsx` - Class name utility
- `@/lib/types` - Type definitions
- `@/lib/active-data-provider` - Data source hook
- `ShareButton` - Share functionality component
- `@/lib/share-utils` - Share data generation

**Props Interface:**
```typescript
interface StandingsTabProps {
  selectedDiv: DivisionCode;
  standings: StandingEntry[];
  myTeam: { team: string; div: DivisionCode } | null;
  onTeamClick: (team: string) => void;
}
```

**Key Features:**
1. Responsive table with mobile-optimized columns
2. Visual indicators for promotion/relegation zones
3. Click handlers for team details navigation
4. Share functionality integration
5. MyTeam highlighting
6. Clean, accessible HTML structure
