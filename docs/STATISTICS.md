# Statistics & Analytics

Advanced statistical analysis for player performance tracking, team comparisons, cross-league strength calculations, and league health metrics.

**Location:** `src/lib/stats/`

---

## Table of Contents

- [Overview](#overview)
- [Power Rankings](#power-rankings)
- [Head-to-Head](#head-to-head)
- [Clutch Index](#clutch-index)
- [Home/Away Analytics](#homeaway-analytics)
- [Strength of Schedule](#strength-of-schedule)
- [League Health](#league-health)
- [Cross-League Comparison](#cross-league-comparison)
- [Career Stats](#career-stats)
- [League Stats](#league-stats)
- [File Reference](#file-reference)

---

## Overview

The stats module provides analytics beyond basic win/loss records. It powers leaderboards, player profiles, team analysis, and cross-league comparisons.

```
Frame Data + Results
    |
    v
Per-Player Metrics (form, H2H, clutch, BD stats)
    |
    v
Per-Team Metrics (power rankings, SOS, home/away)
    |
    v
Cross-Division/League (bridge players, adjusted ratings)
    |
    v
League Health (parity, competitiveness)
```

---

## Power Rankings

**File:** `power-rankings.ts`

Algorithmic team ranking that differs from the points-based standings table. Accounts for form, margin of victory, schedule difficulty, and momentum.

### Formula

```
Score = 0.30 * normalizedPoints
      + 0.25 * formScore
      + 0.20 * marginOfVictory
      + 0.15 * sosScore
      + 0.10 * trajectory
```

### Components

| Component | Calculation | Weight |
|-----------|-------------|--------|
| **Points** | `points / maxPointsInDivision` | 30% |
| **Form** | Weighted average of last 5 results (weights: 5,4,3,2,1). Win=1.0, Draw=0.4, Loss=0 | 25% |
| **Margin of Victory** | Avg frame difference, normalized to 0-1 via `(avgDiff + 10) / 20` | 20% |
| **Strength of Schedule** | Avg opponent strength faced, normalized from -1 to 1 | 15% |
| **Trajectory** | Recent 5-game win% minus season win%, normalized | 10% |

Returns `PowerRanking[]` with rank, score, component breakdown, and optional rank change from previous calculation.

---

## Head-to-Head

**File:** `head-to-head.ts`

Calculates and analyzes H2H records between players from frame-level data.

### Key Functions

| Function | Purpose |
|----------|---------|
| `calculateH2HRecords(player, frames)` | Complete H2H records against all opponents |
| `getH2HSummary(records)` | Nemesis, victim, most-played, best/worst records |
| `getH2HBetween(player1, player2, frames)` | Direct H2H between two players |
| `findDominatedOpponents(player, frames)` | Opponents with 70%+ win rate against |
| `findRecentOpponents(player, frames)` | Most recently faced opponents |

### H2H Record Structure

```typescript
{
  opponent: string,
  played: number,
  won: number,
  lost: number,
  winPct: number,           // 0-100
  matches: H2HMatch[],     // chronological match list
  lastMet: string | null,
  streak: { type: 'win' | 'loss' | 'none', count: number }
}
```

**Streak detection:** Iterates from most recent match, counts consecutive matching results.

---

## Clutch Index

**File:** `clutch-index.ts`

Measures player performance in pressure situations — close matches decided by 1-2 frames.

### Algorithm

```
clutchRating = closeComponent * 0.6 + lateComponent * 0.4

closeComponent = (closeMatchWinPct - overallWinPct)   // if 3+ close games
lateComponent  = (lateFrameWinPct - overallWinPct)    // if 2+ late frames (8-10)
rawRating      = closeComponent + lateComponent
clutchRating   = clamp(rawRating * 3, -1, 1)          // scaled for visibility
```

### Labels

| Label | Threshold | Meaning |
|-------|-----------|---------|
| `clutch` | rating > 0.15 | Performs better under pressure |
| `neutral` | -0.15 to 0.15 | No significant pressure effect |
| `choke` | rating < -0.15 | Performs worse under pressure |

### Leaderboard

`getClutchLeaderboard(div, ds, frames, players2526, limit)` — minimum 5 games to qualify, sorted by clutch rating.

---

## Home/Away Analytics

**File:** `home-away-analytics.ts`

### Team Home Advantage

`calcHomeAdvantage(div, ds)` returns per-team:
- Home win%, away win%, advantage (difference)
- Full home/away records (P/W/D/L/F/A)

### Player Venue Bias

`calcPlayerVenueBias(player, frames)` tracks individual player home vs away performance and calculates bias (homePct - awayPct).

### Strongest Home Teams

`getStrongestHomeTeams(div, ds, limit)` — teams with highest home win%, minimum 3 home games.

---

## Strength of Schedule

**File:** `strength-of-schedule.ts`

Rates schedule difficulty based on opponent strength.

| Function | Purpose |
|----------|---------|
| `calcScheduleStrength(team, div, ds)` | SOS for a single team |
| `calcAllTeamsSOS(div, ds)` | All teams in division, ranked |

Returns three SOS values:
- `completedSOS` — average strength of opponents already faced
- `remainingSOS` — average strength of opponents still to play
- `combinedSOS` — weighted overall

Ranking is by `remainingSOS` (hardest remaining schedule = rank 1).

---

## League Health

**File:** `league-health.ts`

Measures competitive balance and parity within a division.

### Competitiveness Index

```
competitivenessIndex = parityIndex * 0.6 + closeMatchPct * 0.4
```

### Parity Index

```
coeffOfVariation = stdDev(points) / avgPoints
parityIndex = clamp((1 - coeffOfVariation) * 100, 0, 100)
```

Lower standard deviation relative to the mean = higher parity.

### Top Heavy Detection

Flags when the top 2 teams hold > 40% of all points in the division.

### Output

```typescript
{
  competitivenessIndex: number,  // 0-100, higher = more competitive
  parityIndex: number,           // 0-100, higher = more parity
  pointsSpread: number,          // 1st vs last place gap
  closeMatchPct: number,         // % of matches decided by <= 2 frames
  topHeavy: boolean
}
```

---

## Cross-League Comparison

Three modules work together to compare players and teams across different leagues.

### Bridge Players

**File:** `bridge-players.ts`

Detects players appearing in multiple divisions or leagues to calibrate strength differences.

| Function | Purpose |
|----------|---------|
| `findIntraLeagueBridgePlayers(leagueId, data)` | Players in 2+ divisions within same league |
| `findCrossLeagueBridgePlayers(multiLeagueData)` | Players across different leagues |
| `findAllBridgePlayers(multiLeagueData)` | Combined intra + cross-league |

**Matching strategy:**
- Intra-league: exact name match (100% confidence)
- Cross-league exact: normalized name match (100% confidence)
- Cross-league fuzzy: Levenshtein similarity (minimum 85% confidence threshold)

### Division Strength

**File:** `division-strength.ts`

Calculates relative division strength within a league using bridge player performance.

**Algorithm:**
1. Filter bridge players (2+ divisions, 3+ games each)
2. Collect pairwise observations (win% differences)
3. Iterative solver (20 iterations, 0.5 damping)
4. Blend with tier fallback when confidence is low

**Tier fallback multipliers:**
```
PREM: 1.0   SD1: 0.92   D1: 0.85   WD1: 0.88
SD2: 0.78   D2: 0.72    WD2: 0.75
D3: 0.62    D4: 0.55    D5: 0.48   D6: 0.42   D7: 0.38
```

### League Strength

**File:** `league-strength.ts`

Calculates relative league strength using cross-league bridge players.

**Algorithm:**
1. Calculate division strengths for each league
2. Find cross-league bridge players
3. Compute pairwise league differences using normalized ratings
4. Iterative solver (20 iterations, 0.5 damping, re-centered to mean=0)

**Confidence:** `min(bridgePlayerCount / 10, 1)` — max confidence at 10+ bridge players.

### Adjusted Ratings

**File:** `adjusted-ratings.ts`

Produces comparable ratings across leagues and divisions.

```typescript
{
  rawPct: number,           // raw win percentage
  bayesianPct: number,      // Bayesian-adjusted
  adjustedPct: number,      // after strength adjustment
  zScore: number,           // standard deviations from division mean
  leaguePercentile: number, // within league
  globalPercentile: number, // across all leagues
  confidence: number,       // 0-1
  adjustmentBreakdown: {
    divisionOffset: number,
    leagueOffset: number,
    totalAdjustment: number
  }
}
```

---

## Career Stats

**File:** `career-stats.ts`

Multi-season player tracking with career progression analysis.

### Functions

| Function | Purpose |
|----------|---------|
| `fetchPlayerCareerData(name, leagueId)` | Fetch career data from Firestore across seasons |
| `calculateImprovementRate(seasons)` | Compare current vs prior season |
| `calculateCareerTrend(seasons)` | Identify peak performance periods |
| `calculateConsistencyMetrics(seasons)` | Variance in performance across seasons |
| `calculateCurrentForm(name, frames)` | Last 5 and last 10 game form |
| `findMilestones(name, frames, season)` | First game, 50/100/200/500 milestones, notable streaks |

### Consistency Classification

| Label | Threshold | Meaning |
|-------|-----------|---------|
| `high` | stdDev <= 5% | Very consistent across seasons |
| `medium` | 5% < stdDev < 15% | Moderate variation |
| `low` | stdDev >= 15% | Highly variable |

---

## League Stats

**File:** `league-stats.ts`

Leaderboards and statistical rankings across a division.

| Function | Purpose |
|----------|---------|
| `getTopPlayers(players2526, division, minGames, limit)` | Top players by Bayesian win% |
| `getBDLeaders(players2526, division, minGames, limit)` | Break & dish rate leaders |
| `getMostImprovedPlayers(players2526, players, division)` | Biggest improvement from prior season |
| `getActiveWinStreaks(frames, players2526, division)` | Current active winning streaks |

### Rivalry Tracker

**File:** `rivalry-tracker.ts`

`identifyRivalries(div, ds)` identifies recurring matchups with significant history.

**Significance score:**
```
competitiveness = 1 + (1 - abs(winPctA - winPctB))
significance = matchesPlayed * competitiveness
```

Closer records + more meetings = higher significance.

---

## File Reference

| File | Purpose | Key Exports |
|------|---------|-------------|
| `index.ts` | Barrel exports | All public API |
| `power-rankings.ts` | Composite team rankings | `calcPowerRankings` |
| `head-to-head.ts` | Player H2H analysis | `calculateH2HRecords`, `getH2HSummary` |
| `clutch-index.ts` | Pressure performance | `calcClutchIndex`, `getClutchLeaderboard` |
| `home-away-analytics.ts` | Venue performance | `calcHomeAdvantage`, `calcPlayerVenueBias` |
| `strength-of-schedule.ts` | Schedule difficulty | `calcAllTeamsSOS` |
| `league-health.ts` | Competitive balance | `calcCompetitivenessIndex` |
| `bridge-players.ts` | Cross-league player matching | `findAllBridgePlayers` |
| `division-strength.ts` | Intra-league division strength | `calculateDivisionStrengths` |
| `league-strength.ts` | Cross-league strength | `calculateLeagueStrengths` |
| `adjusted-ratings.ts` | Normalized ratings | `getAdjustedPlayerRating`, `computeGlobalPercentiles` |
| `career-stats.ts` | Multi-season tracking | `fetchPlayerCareerData`, `calculateConsistencyMetrics` |
| `league-stats.ts` | Leaderboards | `getTopPlayers`, `getBDLeaders`, `getActiveWinStreaks` |
| `rivalry-tracker.ts` | Rivalry identification | `identifyRivalries` |
