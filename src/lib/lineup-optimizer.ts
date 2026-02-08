import type {
  DivisionCode,
  PlayerAvailability,
  LockedPosition,
  LineupWinProbability,
  OptimizedLineup,
  LineupAlternative,
  TeamPlayer,
  FrameData,
  Players2526Map,
  PlayerFormData,
  H2HRecord,
  HomeAwaySplit,
} from './types';
import {
  calcBayesianPct,
  calcPlayerForm,
  calcPlayerHomeAway,
  getH2HRecord,
  predictLineup,
  predictFrame,
  runPredSim,
  calcTeamStrength,
  getDiv,
  type DataSources,
} from './predictions';

// Player with score used for lineup optimization
interface ScoredPlayer {
  name: string;
  score: number;
  adjPct: number;
  formPct: number | null;
  h2hAdvantage: number;
  homeAwayPct: number | null;
}

/**
 * Filter team players by availability
 * Returns only players marked as available
 */
export function filterAvailablePlayers(
  teamPlayers: TeamPlayer[],
  availability: PlayerAvailability[]
): TeamPlayer[] {
  const availableSet = new Set(
    availability.filter(a => a.available).map(a => a.name)
  );
  return teamPlayers.filter(p => availableSet.has(p.name));
}

/**
 * Score players for lineup optimization
 * Uses form, H2H records, home/away splits, and adjusted win percentage
 */
function scorePlayers(
  teamPlayers: TeamPlayer[],
  opponent: string,
  isHome: boolean,
  frames: FrameData[],
  players2526: Players2526Map
): ScoredPlayer[] {
  const scored: ScoredPlayer[] = [];

  // Predict opponent lineup to get likely opponents for H2H calculation
  const oppLineup = frames.length > 0 ? predictLineup(opponent, frames) : null;
  const likelyOpponents = oppLineup?.recentPlayers || [];

  for (const player of teamPlayers) {
    // Find player's 25/26 stats
    const playerData = players2526[player.name];
    if (!playerData || playerData.total.p < 3) {
      // Skip players with insufficient games
      continue;
    }

    const adjPct = calcBayesianPct(playerData.total.w, playerData.total.p);

    // Form component
    const form = frames.length > 0 ? calcPlayerForm(player.name, frames) : null;
    const formPct = form
      ? form.last8 && form.last8.p >= 6
        ? form.last8.pct
        : form.last5.pct
      : null;

    // H2H advantage against likely opponents
    let h2hAdvantage = 0;
    if (frames.length > 0 && likelyOpponents.length > 0) {
      for (const opp of likelyOpponents) {
        const record = getH2HRecord(player.name, opp, frames);
        h2hAdvantage += record.wins - record.losses;
      }
    }

    // Home/away performance
    const ha = frames.length > 0 ? calcPlayerHomeAway(player.name, frames) : null;
    const homeAwayPct = ha ? (isHome ? ha.home.pct : ha.away.pct) : null;

    // Composite score: weighted blend using adjusted pct as base
    let score = adjPct; // base: confidence-adjusted win%
    if (formPct !== null) score += (formPct - adjPct) * 0.3; // form adjustment
    if (h2hAdvantage !== 0) score += h2hAdvantage * 5; // H2H bonus/penalty
    if (homeAwayPct !== null && ha) {
      const venue = isHome ? ha.home : ha.away;
      if (venue.p >= 3) score += (homeAwayPct - adjPct) * 0.2; // venue adjustment
    }

    scored.push({
      name: player.name,
      score,
      adjPct,
      formPct,
      h2hAdvantage,
      homeAwayPct,
    });
  }

  return scored.sort((a, b) => b.score - a.score);
}

/**
 * Build a lineup respecting locked positions
 * Returns optimized lineup with locked positions fixed
 */
export function optimizeLineupWithLocks(
  teamPlayers: TeamPlayer[],
  availability: PlayerAvailability[],
  locks: LockedPosition[],
  myTeam: string,
  opponent: string,
  isHome: boolean,
  frames: FrameData[],
  players2526: Players2526Map,
  ds: DataSources
): OptimizedLineup | null {
  // Filter by availability
  const available = filterAvailablePlayers(teamPlayers, availability);

  // Need at least 10 players for a full lineup
  if (available.length < 10) {
    return null;
  }

  // Score all available players
  const scored = scorePlayers(available, opponent, isHome, frames, players2526);

  // Initialize lineup arrays (5 players per set)
  const set1: (string | null)[] = [null, null, null, null, null];
  const set2: (string | null)[] = [null, null, null, null, null];

  // Track which players are locked
  const lockedPlayers = new Set<string>();

  // Apply locked positions
  for (const lock of locks) {
    const posIndex = lock.position - 1; // Convert 1-indexed to 0-indexed
    if (posIndex < 0 || posIndex > 4) continue; // Invalid position

    if (lock.set === 1) {
      set1[posIndex] = lock.playerName;
    } else if (lock.set === 2) {
      set2[posIndex] = lock.playerName;
    }
    lockedPlayers.add(lock.playerName);
  }

  // Fill remaining positions with best available players
  const unlockedScored = scored.filter(p => !lockedPlayers.has(p.name));
  let playerIndex = 0;

  // Fill Set 1 remaining positions
  for (let i = 0; i < 5; i++) {
    if (set1[i] === null && playerIndex < unlockedScored.length) {
      set1[i] = unlockedScored[playerIndex].name;
      playerIndex++;
    }
  }

  // Fill Set 2 remaining positions
  for (let i = 0; i < 5; i++) {
    if (set2[i] === null && playerIndex < unlockedScored.length) {
      set2[i] = unlockedScored[playerIndex].name;
      playerIndex++;
    }
  }

  // Verify lineup is complete
  if (set1.some(p => p === null) || set2.some(p => p === null)) {
    return null;
  }

  // Calculate win probability for this lineup
  const winProbability = calculateLineupWinProbability(
    set1 as string[],
    set2 as string[],
    myTeam,
    opponent,
    isHome,
    frames,
    players2526,
    ds
  );

  return {
    set1: set1 as string[],
    set2: set2 as string[],
    winProbability,
  };
}

/**
 * Calculate win probability for a specific lineup
 * Estimates frame win probability based on player matchups and runs simulation
 */
export function calculateLineupWinProbability(
  set1: string[],
  set2: string[],
  myTeam: string,
  opponent: string,
  isHome: boolean,
  frames: FrameData[],
  players2526: Players2526Map,
  ds: DataSources
): LineupWinProbability {
  // Calculate average adjusted win percentage for the lineup
  const allPlayers = [...set1, ...set2];
  let totalAdjPct = 0;
  let validPlayers = 0;

  for (const playerName of allPlayers) {
    const playerData = players2526[playerName];
    if (playerData && playerData.total.p > 0) {
      const adjPct = calcBayesianPct(playerData.total.w, playerData.total.p);
      totalAdjPct += adjPct;
      validPlayers++;
    }
  }

  // Fallback to team strength if insufficient player data
  if (validPlayers < 5) {
    const div = getDiv(myTeam, ds);
    if (!div) {
      return {
        pWin: 0,
        pDraw: 0,
        pLoss: 1,
        expectedHome: 0,
        expectedAway: 10,
        confidence: 1,
      };
    }

    const strengths = calcTeamStrength(div, ds);
    const frameWinProb = predictFrame(
      isHome ? strengths[myTeam] || 0 : strengths[opponent] || 0,
      isHome ? strengths[opponent] || 0 : strengths[myTeam] || 0
    );
    const prediction = runPredSim(frameWinProb);

    return {
      pWin: parseFloat(prediction.pHomeWin) / 100,
      pDraw: parseFloat(prediction.pDraw) / 100,
      pLoss: parseFloat(prediction.pAwayWin) / 100,
      expectedHome: parseFloat(prediction.expectedHome),
      expectedAway: parseFloat(prediction.expectedAway),
      confidence: Math.max(
        parseFloat(prediction.pHomeWin),
        parseFloat(prediction.pDraw),
        parseFloat(prediction.pAwayWin)
      ) / 100,
    };
  }

  // Calculate average lineup strength
  const avgLineupPct = totalAdjPct / validPlayers;

  // Get opponent's average strength
  const oppDiv = getDiv(opponent, ds);
  const oppStrengths = oppDiv ? calcTeamStrength(oppDiv, ds) : {};
  const oppStrength = oppStrengths[opponent] || 0;

  // Convert win percentage to strength scale (centered at 50%)
  const lineupStrength = (avgLineupPct / 100 - 0.5) * 4;

  // Calculate frame win probability
  const frameWinProb = isHome
    ? predictFrame(lineupStrength, oppStrength)
    : predictFrame(oppStrength, lineupStrength);

  // Run simulation to get match-level probabilities
  const prediction = runPredSim(frameWinProb);

  // Parse and return probabilities
  const pWin = parseFloat(prediction.pHomeWin) / 100;
  const pDraw = parseFloat(prediction.pDraw) / 100;
  const pLoss = parseFloat(prediction.pAwayWin) / 100;

  return {
    pWin: isHome ? pWin : pLoss,
    pDraw,
    pLoss: isHome ? pLoss : pWin,
    expectedHome: isHome
      ? parseFloat(prediction.expectedHome)
      : parseFloat(prediction.expectedAway),
    expectedAway: isHome
      ? parseFloat(prediction.expectedAway)
      : parseFloat(prediction.expectedHome),
    confidence: Math.max(pWin, pDraw, pLoss),
  };
}

/**
 * Generate alternative lineup options
 * Returns top N alternative lineups with probability comparisons
 */
export function generateAlternativeLineups(
  optimal: OptimizedLineup,
  teamPlayers: TeamPlayer[],
  availability: PlayerAvailability[],
  locks: LockedPosition[],
  myTeam: string,
  opponent: string,
  isHome: boolean,
  frames: FrameData[],
  players2526: Players2526Map,
  ds: DataSources,
  numAlternatives = 3
): LineupAlternative[] {
  const alternatives: LineupAlternative[] = [];
  const available = filterAvailablePlayers(teamPlayers, availability);
  const scored = scorePlayers(available, opponent, isHome, frames, players2526);

  // Get locked player names
  const lockedPlayers = new Set(locks.map(l => l.playerName));

  // Get players in optimal lineup
  const optimalPlayers = new Set([...optimal.set1, ...optimal.set2]);

  // Get unlocked players not in optimal lineup (bench players)
  const benchPlayers = scored.filter(
    p => !optimalPlayers.has(p.name) && !lockedPlayers.has(p.name)
  );

  // Get unlocked players in optimal lineup
  const unlockedOptimalPlayers = scored.filter(
    p => optimalPlayers.has(p.name) && !lockedPlayers.has(p.name)
  );

  // Generate alternatives by swapping unlocked players
  const maxAttempts = Math.min(numAlternatives * 3, 20); // Try up to 20 swaps
  let attempts = 0;

  while (alternatives.length < numAlternatives && attempts < maxAttempts) {
    attempts++;

    // Try swapping a bench player with an unlocked optimal player
    if (benchPlayers.length === 0 || unlockedOptimalPlayers.length === 0) break;

    const benchIdx = attempts % benchPlayers.length;
    const optimalIdx = attempts % unlockedOptimalPlayers.length;

    const benchPlayer = benchPlayers[benchIdx];
    const optimalPlayer = unlockedOptimalPlayers[optimalIdx];

    // Create alternative lineup by swapping
    const altSet1 = [...optimal.set1];
    const altSet2 = [...optimal.set2];

    // Find and replace the optimal player with bench player
    let swapped = false;
    for (let i = 0; i < 5; i++) {
      if (altSet1[i] === optimalPlayer.name) {
        // Check if this position is locked
        const isLocked = locks.some(l => l.set === 1 && l.position === i + 1);
        if (!isLocked) {
          altSet1[i] = benchPlayer.name;
          swapped = true;
          break;
        }
      }
    }

    if (!swapped) {
      for (let i = 0; i < 5; i++) {
        if (altSet2[i] === optimalPlayer.name) {
          const isLocked = locks.some(l => l.set === 2 && l.position === i + 1);
          if (!isLocked) {
            altSet2[i] = benchPlayer.name;
            swapped = true;
            break;
          }
        }
      }
    }

    if (!swapped) continue;

    // Calculate win probability for alternative
    const altWinProbability = calculateLineupWinProbability(
      altSet1,
      altSet2,
      myTeam,
      opponent,
      isHome,
      frames,
      players2526,
      ds
    );

    // Check if this alternative is unique
    const altKey = [...altSet1, ...altSet2].sort().join(',');
    const isDuplicate = alternatives.some(a => {
      const key = [...a.lineup.set1, ...a.lineup.set2].sort().join(',');
      return key === altKey;
    });

    if (!isDuplicate) {
      alternatives.push({
        lineup: {
          set1: altSet1,
          set2: altSet2,
          winProbability: altWinProbability,
        },
        rank: alternatives.length + 1,
        probabilityDiff: optimal.winProbability.pWin - altWinProbability.pWin,
      });
    }
  }

  // Sort alternatives by win probability (best first)
  alternatives.sort((a, b) => b.lineup.winProbability.pWin - a.lineup.winProbability.pWin);

  // Update ranks
  alternatives.forEach((alt, idx) => {
    alt.rank = idx + 1;
    alt.probabilityDiff = optimal.winProbability.pWin - alt.lineup.winProbability.pWin;
  });

  return alternatives.slice(0, numAlternatives);
}
