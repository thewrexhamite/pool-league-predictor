# Prediction Engine

The prediction engine powers match outcomes, season simulations, lineup optimization, and advanced analytics. Built on Bayesian statistics and Monte Carlo simulation.

**Location:** `src/lib/predictions/`

---

## Table of Contents

- [Overview](#overview)
- [Core Algorithm](#core-algorithm)
- [Frame-Level Prediction](#frame-level-prediction)
- [Monte Carlo Simulation](#monte-carlo-simulation)
- [Lineup Optimization](#lineup-optimization)
- [Analytics](#analytics)
- [Player Stats](#player-stats)
- [Fixture Analysis](#fixture-analysis)
- [Data Sources](#data-sources)
- [File Reference](#file-reference)

---

## Overview

The prediction pipeline flows through four stages:

```
Player Ratings (Bayesian)
    |
    v
Team Strength (weighted aggregate)
    |
    v
Frame Simulation (logistic model + Monte Carlo)
    |
    v
Season Projection (1000 iterations)
```

---

## Core Algorithm

**File:** `core.ts`

### Bayesian Win Percentage

Adjusts raw win% toward a neutral prior to reduce noise from small sample sizes.

```
bayesianPct = ((wins + K * PRIOR) / (games + K)) * 100
```

| Constant | Value | Purpose |
|----------|-------|---------|
| `BAYESIAN_PRIOR` | 0.5 | Neutral 50% prior |
| `BAYESIAN_K` | 6 | Prior strength (higher = more conservative) |
| `UNKNOWN_PLAYER_PRIOR` | 0.45 | Below-average default for unknown players |
| `PRIOR_BLEND_MATCHES` | 10 | Games needed before fully trusting current season data |

### Team Strength

`calcTeamStrength(div, ds)` blends current season performance with prior season player ratings:

- **Current strength:** `(point_differential / games / 10) * 2`
- **Prior strength:** Weighted average of player win percentages from 24/25 season
- **Blend weight:** `min(1, gamesPlayed / PRIOR_BLEND_MATCHES)` — more games = more trust in current data

### Standings Calculation

`calcStandings(div, ds)` computes the league table with the following points system:

| Result | Points |
|--------|--------|
| Home win | 2 pts |
| Away win | 3 pts |
| Draw | 1 pt each |
| Loss | 0 pts |

Teams are sorted by points (descending), then frame differential (descending).

---

## Frame-Level Prediction

**File:** `matchup.ts`

### `predictFrame(homeStr, awayStr)`

Uses a logistic model with home advantage:

```
p = 1 / (1 + exp(-(homeStrength + HOME_ADV - awayStrength)))
```

- `HOME_ADV = 0.2` — constant home advantage factor
- Returns probability (0-1) of the home player winning a single frame
- Input strengths are relative values on a continuous scale

---

## Monte Carlo Simulation

**File:** `simulation.ts`

### Match Simulation

`simulateMatch(home, away, strengths)` simulates a 10-frame match:
1. Gets frame win probability from `predictFrame()`
2. Runs 10 independent frame simulations (`Math.random() < p`)
3. Returns `[homeFrames, awayFrames]`

### Single Match Prediction

`runPredSim(p)` runs **5,000 iterations** for a single match prediction:

```typescript
{
  pHomeWin: "X.X",        // percentage (0-100)
  pDraw: "X.X",
  pAwayWin: "X.X",
  expectedHome: "X.X",    // expected frames (0-10)
  expectedAway: "X.X",
  topScores: [            // top 5 most likely scorelines
    { score: "7-3", pct: "XX.X" }
  ]
}
```

### Season Simulation

`runSeasonSimulation(div, squadOverrides, squadTopN, whatIfResults, ds)` runs **1,000 iterations** of the remaining season:

1. Copy current standings
2. Apply what-if results (user overrides)
3. Simulate all remaining fixtures using team strengths
4. Rank teams by final points and differential
5. Track finishing position probabilities

Returns per-team:
- `currentPts` — points before remaining fixtures
- `avgPts` — average final points across simulations
- `pTitle` — probability of finishing 1st (0-100)
- `pTop2` — probability of top 2 finish (0-100)
- `pBot2` — probability of bottom 2 finish (0-100)

---

## Lineup Optimization

**File:** `lineup.ts`

### Squad Strength

`calcSquadStrength(team, topN, ds)` — weighted average of player effective win percentages, weighted by games played. Can filter to top N players only.

`calcModifiedSquadStrength(team, overrides, topN, ds)` — same calculation but with player add/remove overrides applied.

`calcStrengthAdjustments(div, overrides, topN, ds)` — returns strength delta per team:
```
delta = (modifiedStrength - originalStrength) * SQUAD_STRENGTH_SCALING
```
Where `SQUAD_STRENGTH_SCALING = 4.0` to make lineup changes impact predictions meaningfully.

### Lineup Prediction

`predictLineup(team, frames, recentN=3)` predicts the likely lineup based on:
- Appearance rates (core >=80%, rotation 40-80%, fringe <40%)
- Most recent N matches

### Optimal Lineup Suggestion

`suggestLineup(myTeam, opponent, isHome, frames, players2526, rosters)` recommends the best lineup:

- **Composite score:** `base + formAdj + h2hAdj + venueAdj`
- Set 1 & 2 assigned based on opponent set bias analysis
- Returns top 5 players per set with tactical insights

---

## Analytics

**File:** `analytics.ts`

### Form Analysis

`calcPlayerForm(playerName, frames, seasonPct)` uses three rolling windows:

| Window | Size | Purpose |
|--------|------|---------|
| Small | 5 games | Recent form |
| Medium | 8 games | Short-term trend |
| Large | 10 games | Medium-term trend |

**Trend classification:**
- **Hot:** >= 65% in recent window
- **Cold:** < 40% in recent window
- **Steady:** Between thresholds

**Momentum:** Calculated on -1 to +1 scale from recent game trajectory.

### Head-to-Head Analysis

`analyzeH2H(playerA, playerB, frames)`:
- Finds all matchups between two players
- **Advantage levels:** strong | moderate | even | disadvantage
- **Confidence:** `min(1, totalGames / 10)` (maxes at 10+ games)

### Break & Dish Statistics

`calcBDStats(playerName, division?, players2526)`:
- Break/dish for rate, against rate, net BD
- Forfeit rate, BD efficiency (`bdFor / (bdFor + bdAgainst)`)

### Scouting Reports

`generateScoutingReport(team, results, frames, players, players2526, division)`:
- Team form (last 5), home/away split, set performance
- BD stats, predicted lineup, strongest/weakest 3 players
- Forfeit rate

---

## Player Stats

**File:** `player-stats.ts`

### Rating Lookup

`getPlayerEffectivePct(player)` resolves the best available win percentage:
1. Prefers 25/26 data if >= 3 games played
2. Falls back to 24/25 data
3. Returns Bayesian-adjusted percentage

### Team Players

`getTeamPlayers(team, ds)` combines 24/25 roster + 25/26 season players, sorted by effective win percentage (highest first).

`getAllLeaguePlayers(ds)` returns all players across the league with both seasons' stats.

---

## Fixture Analysis

**File:** `fixtures.ts`

- `getRemainingFixtures(div, ds)` — fixtures with dates after the latest completed result
- `getTeamResults(team, ds)` — match history sorted by date (most recent first), enriched with `isHome`, `opponent`, `result` ('W'/'L'/'D')

### Fixture Importance

`calcFixtureImportance(div, team, ...)` (in `compatibility.ts`):
- Simulates each remaining fixture as hypothetical win/loss
- Measures impact on top-2 probability
- Returns fixtures sorted by importance (highest first)

---

## Data Sources

All prediction functions accept a `DataSources` object:

```typescript
interface DataSources {
  divisions: Divisions;         // Division configs with team lists
  results: MatchResult[];       // Completed match results
  fixtures: Fixture[];          // Upcoming fixtures
  players: PlayersMap;          // 24/25 season player stats
  rosters: RostersMap;          // 24/25 team rosters
  players2526: Players2526Map;  // 25/26 season player stats
}
```

Data originates from the `ActiveDataProvider`, which may apply Time Machine filtering to show historical state.

---

## File Reference

| File | Purpose | Key Exports |
|------|---------|-------------|
| `index.ts` | Barrel exports | All public API |
| `core.ts` | Bayesian ratings, standings, team strength | `calcBayesianPct`, `calcTeamStrength`, `calcStandings` |
| `matchup.ts` | Frame-level prediction | `predictFrame` |
| `simulation.ts` | Monte Carlo season simulation | `simulateMatch`, `runSeasonSimulation`, `runPredSim` |
| `lineup.ts` | Squad strength, lineup optimization | `suggestLineup`, `calcSquadStrength`, `predictLineup` |
| `analytics.ts` | Form, H2H, BD stats, scouting | `calcPlayerForm`, `analyzeH2H`, `generateScoutingReport` |
| `player-stats.ts` | Player rating lookups | `getTeamPlayers`, `getPlayerEffectivePct`, `getAllLeaguePlayers` |
| `fixtures.ts` | Fixture management | `getRemainingFixtures`, `getTeamResults` |
| `compatibility.ts` | Legacy function wrappers | `getH2HRecord`, `calcFixtureImportance` |
