# Manual Verification Checklist: Prediction Tab

**Subtask:** subtask-6-5
**Component:** PredictTab.tsx
**Date:** 2026-02-08
**Status:** Ready for Manual Testing

---

## Pre-Verification Status

✅ **Automated Checks Passed:**
- Type checking: PASSED (subtask-6-1)
- Linting: PASSED (subtask-6-1)
- Unit tests: PASSED (subtask-6-2)
- Production build: PASSED (subtask-6-3)

✅ **Component Analysis:**
- File: `src/components/PredictTab.tsx`
- Size: 574 lines (within acceptable range)
- Imports: Uses new modular predictions structure (`@/lib/predictions/index`)
- Props: Properly typed with TypeScript interface
- Key Features:
  - Team selection (home/away dropdowns)
  - Prediction calculation with probability gauges
  - Score distribution chart
  - Squad builder integration
  - H2H matrix display
  - Set performance tracking
  - Scouting reports
  - Lineup suggestions
  - AI insights panel
  - Prediction sharing functionality
  - Firestore persistence

---

## Test Environment Setup

1. **Start Development Server:**
   ```bash
   cd "/Users/michael/Projects/Pool App/pool-league-predictor"
   npm run dev
   ```

2. **Open Browser:**
   - Navigate to: `http://localhost:3000`
   - Open browser DevTools (F12 or Cmd+Option+I)
   - Keep Console tab visible to monitor for errors

3. **Navigate to Predict Tab:**
   - Click on "Predict" tab in the main navigation
   - Verify URL shows `#predict` hash

---

## Test Case 1: Basic Prediction Flow

### Steps:
1. **Select Home Team:**
   - Click the "Home Team" dropdown
   - Select a team (e.g., "Windmill Wanderers")
   - Verify dropdown shows selected team

2. **Select Away Team:**
   - Click the "Away Team" dropdown
   - Verify home team is not in the list
   - Select a different team (e.g., "The Lab")
   - Verify dropdown shows selected team

3. **Verify Prediction Appears:**
   - Wait for prediction calculation (should be immediate)
   - Verify three probability gauges appear:
     - Home Win (+2pts) - Green gauge
     - Draw (+1pt) - Gray gauge
     - Away Win (+3pts) - Red gauge
   - Verify each gauge shows a percentage
   - Verify percentages are reasonable (0-100%)
   - Verify all three percentages add up to 100%

4. **Verify Expected Score:**
   - Verify "Expected" score displays (e.g., "6.2 - 3.8")
   - Verify format is: `{home_score} - {away_score} Expected`
   - Verify scores are realistic (0-10 range)

### Expected Results:
✅ Home team selection works
✅ Away team selection works (excludes home team)
✅ Prediction appears immediately after both teams selected
✅ Three probability gauges display correctly
✅ Percentages are valid (0-100%, sum to 100%)
✅ Expected score displays correctly
✅ No console errors

---

## Test Case 2: Percentages Calculated Correctly

### Steps:
1. **Test Strong vs Weak Team:**
   - Select a strong team as home (e.g., top of standings)
   - Select a weak team as away (e.g., bottom of standings)
   - Verify home win percentage is significantly higher (e.g., >60%)

2. **Test Even Matchup:**
   - Select two teams with similar standings positions
   - Verify percentages are more balanced (e.g., 40-50% range)

3. **Test Away Advantage:**
   - Select a weak team as home
   - Select a strong team as away
   - Verify away win percentage is higher than home win

4. **Verify Score Distribution Chart:**
   - Scroll down to "Score Distribution" chart
   - Verify bar chart displays multiple possible scores
   - Verify most likely score matches or is close to expected score
   - Verify bars are colored correctly:
     - Green bars: home wins (e.g., "6-4")
     - Red bars: away wins (e.g., "3-7")
     - Gray bars: draws (e.g., "5-5")

### Expected Results:
✅ Strong team has higher win probability
✅ Even matchups show balanced percentages
✅ Weak team has lower win probability
✅ Score distribution chart displays correctly
✅ Chart colors match win/draw/loss outcomes
✅ Probabilities align with team strengths

---

## Test Case 3: Squad Builder Works

### Prerequisite:
- Ensure you're on Predict tab with both teams selected
- Prediction should already be displayed

### Steps:

#### 3A: Remove Player from Squad
1. **Locate Squad Display:**
   - Scroll down to bottom section showing both team squads
   - Verify both home and away squads display

2. **Open Squad Builder:**
   - Click hamburger menu (mobile) or find Squad Builder panel
   - Navigate to Squad Builder section

3. **Select Team:**
   - Select the home team in Squad Builder dropdown

4. **Remove a Player:**
   - Find a strong player (high win% or positive rating)
   - Click the "Remove" or "X" button next to their name
   - Note which player was removed

5. **Verify Squad Updated:**
   - Return to Predict tab (if not visible)
   - Scroll to squad display
   - Verify removed player shows:
     - Strikethrough text
     - Reduced opacity (40%)
     - Grayed out appearance

6. **Verify Prediction Updated:**
   - Check if prediction displays "(modified)" label
   - Check for "Squad changes active" banner at top
   - Verify banner shows:
     - "Original:" percentages (baseline)
     - Arrow (→)
     - New percentages (modified)
   - Verify removing strong player reduces home win percentage

#### 3B: Add Player to Squad
1. **Open Squad Builder:**
   - Navigate to Squad Builder panel

2. **Search for Player:**
   - Type player name in search box
   - Verify search results appear
   - Select a strong player from another team

3. **Add Player:**
   - Click "Add" button next to player name
   - Verify player is added to selected team

4. **Verify Squad Updated:**
   - Return to Predict tab
   - Scroll to squad display
   - Verify added player shows:
     - Green border on left (border-win)
     - "+" prefix before name
     - Green/tinted text color
     - Player stats display

5. **Verify Prediction Updated:**
   - Verify "(modified)" label appears
   - Verify "Squad changes active" banner shows
   - Verify adding strong player increases home win percentage

#### 3C: Reset Squad Changes
1. **Clear Squad Overrides:**
   - In Squad Builder, click "Reset" or "Clear All" button
   - Or manually remove added players and restore removed players

2. **Verify Baseline Restored:**
   - Return to Predict tab
   - Verify "(modified)" label disappears
   - Verify "Squad changes active" banner disappears
   - Verify prediction returns to original baseline percentages
   - Verify squad display shows original roster

### Expected Results:
✅ Squad display shows both team rosters
✅ Removed players show as strikethrough/grayed
✅ Added players show with green border and "+" prefix
✅ "(modified)" label appears when squad changed
✅ "Squad changes active" banner shows baseline vs modified
✅ Prediction updates when squad changes (percentages change)
✅ Strong player removal reduces win probability
✅ Strong player addition increases win probability
✅ Reset/clear returns to baseline prediction
✅ No console errors during squad modifications

---

## Test Case 4: Additional Features Verification

### 4A: Set Performance
1. **Locate Set Performance Table:**
   - Scroll down to "Set Performance" section
   - Verify table displays for both teams

2. **Verify Data:**
   - Check "Set 1" column shows percentage and (won/played)
   - Check "Set 2" column shows percentage and (won/played)
   - Check "Bias" column shows:
     - "Even" for balanced teams
     - "Early +Xpp" for Set 1 advantage
     - "Late +Xpp" for Set 2 advantage

### 4B: Head-to-Head Matrix
1. **Locate H2H Matrix:**
   - Scroll to "Head-to-Head" section
   - Verify matrix table displays

2. **Verify Matrix:**
   - Home team players on left (rows)
   - Away team players on top (columns)
   - Cells show W-L records (e.g., "2-1")
   - Favorable records (more wins) show green background
   - Unfavorable records (more losses) show red background
   - Records with 3+ frames show percentage below

3. **Test Player Click:**
   - Click on a player name in the matrix
   - Verify navigation to player detail page

### 4C: Scouting Reports
1. **Locate Scouting Reports:**
   - Scroll to scouting report cards (2 cards side by side)
   - Verify one for each team

2. **Verify Report Contents:**
   - "Recent Form" shows W/L/D results (colored boxes)
   - "Home Win%" and "Away Win%" display
   - "Set 1 Win%" and "Set 2 Win%" display
   - "Break & Dish" shows net BD stat (colored)
   - "Forfeits" shows percentage
   - "Strongest" players listed (clickable, green)
   - "Weakest" players listed (clickable, red)

3. **Test Player Click:**
   - Click on a player name in scouting report
   - Verify navigation to player detail page

### 4D: Lineup Suggestions
1. **Locate Lineup Suggestions:**
   - Scroll to "Suggested Lineups" section
   - Verify two columns (home and away)

2. **Verify Lineups:**
   - Each team shows "Set 1" and "Set 2" lineups
   - 5 players listed per set
   - Players numbered 1-5
   - Score/rating shown on right
   - H2H advantage shown (+X or -X)
   - Form percentage shown (F:XX)
   - Insights listed below (if any)

3. **Test Player Click:**
   - Click on a player name in lineup
   - Verify navigation to player detail page

### 4E: Share Functionality
1. **Locate Share Button:**
   - Look for Share button in top-right corner (only appears after prediction)

2. **Test Share:**
   - Click Share button
   - If native share available: Verify share sheet opens
   - If clipboard fallback: Verify toast notification "Copied to clipboard"
   - Verify shared text includes: home team, away team, percentages

### Expected Results:
✅ Set performance table displays correctly
✅ H2H matrix displays with proper formatting
✅ Scouting reports show all metrics
✅ Lineup suggestions display for both teams
✅ Player names are clickable and navigate correctly
✅ Share functionality works (native or clipboard)
✅ All sections responsive (mobile/desktop)
✅ No console errors

---

## Test Case 5: Responsive Design

### Steps:
1. **Test Desktop View (> 768px):**
   - Verify probability gauges display in single row (3 columns)
   - Verify H2H matrix is readable (not horizontally scrolled)
   - Verify scouting reports display side by side (2 columns)
   - Verify lineup suggestions display side by side (2 columns)

2. **Test Mobile View (< 768px):**
   - Resize browser window to mobile width (~375px)
   - Or use DevTools device emulation
   - Verify probability gauges stack properly
   - Verify tables have horizontal scroll if needed
   - Verify scouting reports stack vertically (1 column)
   - Verify lineup suggestions stack vertically (1 column)
   - Verify touch targets are large enough

3. **Test Tablet View (~768px):**
   - Test at breakpoint width
   - Verify layout transitions smoothly

### Expected Results:
✅ Desktop layout displays correctly (multi-column)
✅ Mobile layout stacks vertically where appropriate
✅ Tables scroll horizontally on small screens
✅ No layout breaks or overlapping elements
✅ Text remains readable at all sizes
✅ No console errors

---

## Test Case 6: Console Error Check

### Steps:
1. **Monitor Console Throughout Testing:**
   - Keep DevTools Console tab open
   - Watch for errors during all test cases

2. **Check Network Tab:**
   - Open Network tab in DevTools
   - Verify no failed requests (red)
   - Verify Firestore requests succeed (if configured)

3. **Check for Warnings:**
   - Note any warnings (yellow)
   - Acceptable warnings: React hooks dependencies (non-blocking)
   - Unacceptable errors: Runtime errors, type errors, failed requests

### Expected Results:
✅ No runtime errors in console
✅ No failed network requests
✅ No unexpected warnings
✅ Application runs smoothly

---

## Test Case 7: Integration with Other Features

### 7A: League Switcher
1. **Switch Division:**
   - Click league/division switcher
   - Select different division
   - Return to Predict tab
   - Verify team dropdowns update to show new division teams
   - Verify prediction recalculates if teams were selected

### 7B: Time Machine
1. **Activate Time Machine:**
   - Click Time Machine icon
   - Select a historical date
   - Return to Predict tab
   - Verify prediction uses historical data
   - Verify banner shows time machine is active

2. **Reset Time Machine:**
   - Click "Reset" in time machine banner
   - Verify prediction updates to current data
   - Verify banner disappears

### 7C: My Team Integration
1. **Set My Team:**
   - Open "My Team" modal
   - Select a team
   - Close modal
   - Navigate to Predict tab
   - Verify "My Team" indicator appears (if applicable)

### Expected Results:
✅ Division switcher updates available teams
✅ Time machine affects prediction data
✅ My team integration works correctly
✅ No console errors during integration tests

---

## Sign-Off Checklist

Once all test cases are completed, check off each item:

- [ ] **Test Case 1:** Basic prediction flow works
- [ ] **Test Case 2:** Percentages calculated correctly
- [ ] **Test Case 3:** Squad builder works (add/remove/update)
- [ ] **Test Case 4:** All additional features verified
- [ ] **Test Case 5:** Responsive design works
- [ ] **Test Case 6:** No console errors
- [ ] **Test Case 7:** Integration with other features works

**Issues Found:** (list any issues discovered during testing)
- _None_ or _[describe issues]_

**Tester Signature:** _________________________
**Date Completed:** _________________________

---

## Notes for Tester

- **Test Duration:** Estimate 15-20 minutes for complete verification
- **Focus Areas:** Squad builder interaction, prediction updates, percentage accuracy
- **Critical Path:** Test Cases 1, 2, and 3 are highest priority
- **Known Limitations:**
  - Squad builder UI may be in hamburger menu on mobile
  - Firestore persistence may not work in local dev (expected)
  - AI Insights panel may show loading state (API-dependent)

---

## Rollback Procedure (If Issues Found)

If critical issues are discovered during testing:

1. **Document the Issue:**
   - Describe the issue in detail
   - Note steps to reproduce
   - Include screenshots if possible
   - Log console errors

2. **Revert if Necessary:**
   ```bash
   cd "/Users/michael/Projects/Pool App/pool-league-predictor"
   git checkout src/components/App.tsx
   git restore --source=HEAD~X src/components/PredictTab.tsx
   ```

3. **Report to Development Team:**
   - File issue in tracking system
   - Include reproduction steps and error logs

---

**End of Manual Verification Checklist**
