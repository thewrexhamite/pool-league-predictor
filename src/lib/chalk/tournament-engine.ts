import type {
  TournamentMatch,
  TournamentState,
  TournamentGroup,
  TournamentGroupStanding,
  StartTournamentPayload,
  TournamentStage,
} from './types';

// ===== Bracket Generation =====

function nextPowerOf2(n: number): number {
  let v = 1;
  while (v < n) v <<= 1;
  return v;
}

function makeMatchId(prefix: string, round: number, match: number): string {
  return `${prefix}-R${round}-M${match}`;
}

export function generateKnockoutBracket(
  players: string[],
  raceTo: number,
  stage: TournamentStage = 'knockout',
  groupIndex: number | null = null,
  idPrefix = 'KO'
): TournamentMatch[] {
  const bracketSize = nextPowerOf2(players.length);
  const totalRounds = Math.log2(bracketSize);
  const matches: TournamentMatch[] = [];

  // Standard seeding: seed 1 vs seed N, seed 2 vs seed N-1, etc.
  // Build seed order for proper bracket placement
  function seedOrder(size: number): number[] {
    if (size === 1) return [0];
    const half = seedOrder(size / 2);
    return half.flatMap((s) => [s, size - 1 - s]);
  }

  const seeds = seedOrder(bracketSize);

  // Create first round matches
  const r0MatchCount = bracketSize / 2;
  for (let m = 0; m < r0MatchCount; m++) {
    const seed1 = seeds[m * 2];
    const seed2 = seeds[m * 2 + 1];
    const p1 = seed1 < players.length ? players[seed1] : null;
    const p2 = seed2 < players.length ? players[seed2] : null;
    const isBye = !p1 || !p2;
    const matchId = totalRounds === 1 && r0MatchCount === 1
      ? `${idPrefix}-FINAL`
      : makeMatchId(idPrefix, 0, m);

    const match: TournamentMatch = {
      id: matchId,
      player1: p1,
      player2: p2,
      isBye,
      frames: [],
      winner: isBye ? (p1 ?? p2) : null,
      raceTo,
      stage,
      groupIndex,
      roundIndex: 0,
      matchIndex: m,
      feedsInto: null,
      feedsSlot: null,
    };
    matches.push(match);
  }

  // Create subsequent rounds
  for (let r = 1; r < totalRounds; r++) {
    const matchCount = bracketSize / Math.pow(2, r + 1);
    for (let m = 0; m < matchCount; m++) {
      const isFinal = r === totalRounds - 1 && matchCount === 1;
      const matchId = isFinal
        ? `${idPrefix}-FINAL`
        : makeMatchId(idPrefix, r, m);

      const match: TournamentMatch = {
        id: matchId,
        player1: null,
        player2: null,
        isBye: false,
        frames: [],
        winner: null,
        raceTo,
        stage,
        groupIndex,
        roundIndex: r,
        matchIndex: m,
        feedsInto: null,
        feedsSlot: null,
      };
      matches.push(match);
    }
  }

  // Link matches via feedsInto/feedsSlot
  for (let r = 0; r < totalRounds - 1; r++) {
    const roundMatches = matches.filter((m) => m.roundIndex === r && m.id.startsWith(idPrefix));
    for (let m = 0; m < roundMatches.length; m++) {
      const nextRound = r + 1;
      const nextMatchIdx = Math.floor(m / 2);
      const slot: 1 | 2 = (m % 2 === 0) ? 1 : 2;
      const isFinal = nextRound === totalRounds - 1 && Math.ceil(roundMatches.length / 2) === 1;
      const targetId = isFinal
        ? `${idPrefix}-FINAL`
        : makeMatchId(idPrefix, nextRound, nextMatchIdx);

      roundMatches[m].feedsInto = targetId;
      roundMatches[m].feedsSlot = slot;
    }
  }

  // Auto-resolve byes: propagate winners into next matches
  const byeMatches = matches.filter((m) => m.isBye && m.winner);
  for (const bye of byeMatches) {
    if (bye.feedsInto && bye.feedsSlot && bye.winner) {
      const target = matches.find((m) => m.id === bye.feedsInto);
      if (target) {
        if (bye.feedsSlot === 1) target.player1 = bye.winner;
        else target.player2 = bye.winner;
      }
    }
  }

  // Check if any newly populated matches are now byes (both propagated from byes)
  resolveNewByes(matches);

  return matches;
}

function resolveNewByes(matches: TournamentMatch[]): void {
  let changed = true;
  while (changed) {
    changed = false;
    for (const match of matches) {
      if (match.winner) continue;
      if (match.isBye) continue;

      // A match where one player is known and the other is null from a bye
      const isNewBye =
        (match.player1 && !match.player2 && isSlotFromBye(matches, match, 2)) ||
        (!match.player1 && match.player2 && isSlotFromBye(matches, match, 1));

      if (isNewBye) {
        match.isBye = true;
        match.winner = match.player1 ?? match.player2;
        if (match.feedsInto && match.feedsSlot && match.winner) {
          const target = matches.find((m) => m.id === match.feedsInto);
          if (target) {
            if (match.feedsSlot === 1) target.player1 = match.winner;
            else target.player2 = match.winner;
          }
        }
        changed = true;
      }
    }
  }
}

function isSlotFromBye(matches: TournamentMatch[], match: TournamentMatch, slot: 1 | 2): boolean {
  // Check if the feeder for this slot is a completed bye
  const feeders = matches.filter((m) => m.feedsInto === match.id && m.feedsSlot === slot);
  return feeders.length > 0 && feeders.every((f) => f.isBye && f.winner !== null);
}

export function generateRoundRobinSchedule(
  players: string[],
  groupIndex: number | null,
  raceTo: number
): TournamentMatch[] {
  const matches: TournamentMatch[] = [];
  const n = players.length;
  const idPrefix = groupIndex !== null ? `G${groupIndex}` : 'RR';

  // Circle method: fix first player, rotate rest
  const list = [...players];
  const isOdd = n % 2 !== 0;
  if (isOdd) list.push('__BYE__');
  const total = list.length;
  const rounds = total - 1;

  for (let r = 0; r < rounds; r++) {
    const roundMatches: Array<[string, string]> = [];
    for (let m = 0; m < total / 2; m++) {
      const home = m === 0 ? list[0] : list[total - m];
      const away = list[m === 0 ? total - 1 : m];
      if (home === undefined || away === undefined) continue;
      if (home === '__BYE__' || away === '__BYE__') continue;
      roundMatches.push([home, away]);
    }

    for (let m = 0; m < roundMatches.length; m++) {
      const [p1, p2] = roundMatches[m];
      matches.push({
        id: makeMatchId(idPrefix, r, m),
        player1: p1,
        player2: p2,
        isBye: false,
        frames: [],
        winner: null,
        raceTo,
        stage: 'group',
        groupIndex,
        roundIndex: r,
        matchIndex: m,
        feedsInto: null,
        feedsSlot: null,
      });
    }

    // Rotate: keep list[0] fixed, rotate rest clockwise
    const last = list[total - 1];
    for (let i = total - 1; i > 1; i--) {
      list[i] = list[i - 1];
    }
    list[1] = last;
  }

  return matches;
}

interface GroupConfig {
  groupCount: number;
  advancePerGroup: number;
}

function getGroupConfig(playerCount: number): GroupConfig {
  if (playerCount <= 4) return { groupCount: 1, advancePerGroup: 2 };
  if (playerCount <= 6) return { groupCount: 2, advancePerGroup: 2 };
  if (playerCount <= 8) return { groupCount: 2, advancePerGroup: 2 };
  if (playerCount <= 10) return { groupCount: 3, advancePerGroup: 2 };
  if (playerCount <= 12) return { groupCount: 4, advancePerGroup: 2 };
  return { groupCount: 4, advancePerGroup: 2 };
}

export function generateGroupKnockoutBracket(
  players: string[],
  raceTo: number
): { matches: TournamentMatch[]; groups: TournamentGroup[] } {
  const { groupCount, advancePerGroup } = getGroupConfig(players.length);
  const matches: TournamentMatch[] = [];
  const groups: TournamentGroup[] = [];

  // Snake-seeding into groups
  const groupPlayers: string[][] = Array.from({ length: groupCount }, () => []);
  for (let i = 0; i < players.length; i++) {
    const round = Math.floor(i / groupCount);
    const idx = round % 2 === 0 ? i % groupCount : groupCount - 1 - (i % groupCount);
    groupPlayers[idx].push(players[i]);
  }

  // Create groups and round-robin schedules
  for (let g = 0; g < groupCount; g++) {
    const groupName = `Group ${String.fromCharCode(65 + g)}`;
    const standings: TournamentGroupStanding[] = groupPlayers[g].map((name) => ({
      playerName: name,
      played: 0,
      won: 0,
      lost: 0,
      framesWon: 0,
      framesLost: 0,
      points: 0,
    }));

    groups.push({ name: groupName, playerNames: groupPlayers[g], standings });

    const groupMatches = generateRoundRobinSchedule(groupPlayers[g], g, raceTo);
    matches.push(...groupMatches);
  }

  // Create knockout bracket with TBD slots
  const koPlayerCount = groupCount * advancePerGroup;
  const koPlaceholders = Array.from({ length: koPlayerCount }, () => null as string | null);

  // Generate knockout bracket with placeholder players
  const koMatches = generateKnockoutBracket(
    Array.from({ length: koPlayerCount }, (_, i) => `__TBD_${i}__`),
    raceTo,
    'knockout',
    null,
    'KO'
  );

  // Clear the TBD names from the bracket - these get filled when groups complete
  for (const m of koMatches) {
    if (m.player1?.startsWith('__TBD_')) m.player1 = null;
    if (m.player2?.startsWith('__TBD_')) m.player2 = null;
    m.isBye = false;
    m.winner = null;
  }

  matches.push(...koMatches);

  return { matches, groups };
}

// ===== State Generation =====

export function generateTournamentState(payload: StartTournamentPayload): TournamentState {
  const { playerNames, format, raceTo } = payload;

  let matches: TournamentMatch[] = [];
  let groups: TournamentGroup[] = [];
  let stage: TournamentStage;

  switch (format) {
    case 'knockout':
      matches = generateKnockoutBracket(playerNames, raceTo);
      stage = 'knockout';
      break;
    case 'round_robin':
      matches = generateRoundRobinSchedule(playerNames, null, raceTo);
      stage = 'group';
      break;
    case 'group_knockout': {
      const result = generateGroupKnockoutBracket(playerNames, raceTo);
      matches = result.matches;
      groups = result.groups;
      stage = 'group';
      break;
    }
  }

  const totalMatchCount = matches.filter((m) => !m.isBye).length;
  const completedMatchCount = 0;

  return {
    format,
    raceTo,
    playerNames,
    matches,
    groups,
    currentMatchId: null,
    stage,
    winner: null,
    completedMatchCount,
    totalMatchCount,
  };
}

// ===== State Transitions =====

export function reportTournamentFrame(
  state: TournamentState,
  winnerName: string
): TournamentState {
  const currentMatch = state.matches.find((m) => m.id === state.currentMatchId);
  if (!currentMatch) throw new Error('No current match');
  if (winnerName !== currentMatch.player1 && winnerName !== currentMatch.player2) {
    throw new Error('Winner must be one of the current match players');
  }

  const updatedMatches = state.matches.map((m) => {
    if (m.id !== state.currentMatchId) return m;
    return {
      ...m,
      frames: [...m.frames, { winner: winnerName, reportedAt: Date.now() }],
    };
  });

  const match = updatedMatches.find((m) => m.id === state.currentMatchId)!;
  const score = getMatchScore(match);
  const p1Won = score.player1Frames >= state.raceTo;
  const p2Won = score.player2Frames >= state.raceTo;

  let updatedState: TournamentState = { ...state, matches: updatedMatches };

  if (p1Won || p2Won) {
    const matchWinner = p1Won ? match.player1! : match.player2!;
    const matchLoser = p1Won ? match.player2! : match.player1!;

    // Set match winner
    updatedState = {
      ...updatedState,
      matches: updatedState.matches.map((m) => {
        if (m.id !== match.id) return m;
        return { ...m, winner: matchWinner };
      }),
      completedMatchCount: updatedState.completedMatchCount + 1,
      currentMatchId: null,
    };

    // Propagate winner in knockout matches
    if (match.feedsInto && match.feedsSlot) {
      updatedState = {
        ...updatedState,
        matches: updatedState.matches.map((m) => {
          if (m.id !== match.feedsInto) return m;
          return match.feedsSlot === 1
            ? { ...m, player1: matchWinner }
            : { ...m, player2: matchWinner };
        }),
      };
      // Resolve any new byes from propagation
      const mutableMatches = [...updatedState.matches];
      resolveNewByes(mutableMatches);
      // Count any auto-resolved byes
      const newByes = mutableMatches.filter(
        (m) => m.isBye && m.winner && !updatedState.matches.find((om) => om.id === m.id && om.winner)
      );
      updatedState = {
        ...updatedState,
        matches: mutableMatches,
        completedMatchCount: updatedState.completedMatchCount + newByes.length,
      };
    }

    // Update group standings if group match
    if (match.groupIndex !== null && updatedState.groups.length > 0) {
      updatedState = {
        ...updatedState,
        groups: updatedState.groups.map((g, gi) => {
          if (gi !== match.groupIndex) return g;
          return {
            ...g,
            standings: calculateGroupStandings(
              g,
              updatedState.matches.filter((m) => m.groupIndex === gi)
            ),
          };
        }),
      };
    }

    // Check if groups are done → transition to knockout for group_knockout
    if (
      updatedState.format === 'group_knockout' &&
      updatedState.stage === 'group'
    ) {
      const groupMatches = updatedState.matches.filter(
        (m) => m.stage === 'group' && !m.isBye
      );
      const allGroupsDone = groupMatches.every((m) => m.winner !== null);

      if (allGroupsDone) {
        updatedState = transitionToKnockout(updatedState);
      }
    }

    // Check if round robin is complete
    if (updatedState.format === 'round_robin') {
      const allDone = updatedState.matches.every((m) => m.isBye || m.winner !== null);
      if (allDone) {
        const rrWinner = getTournamentWinner(updatedState);
        updatedState = { ...updatedState, stage: 'complete', winner: rrWinner };
      }
    }

    // Check if tournament is over
    if (isTournamentOver(updatedState)) {
      const tourneyWinner = getTournamentWinner(updatedState);
      updatedState = { ...updatedState, stage: 'complete', winner: tourneyWinner };
    }
  }

  return updatedState;
}

function transitionToKnockout(state: TournamentState): TournamentState {
  const { groups } = state;
  const { advancePerGroup } = getGroupConfig(state.playerNames.length);

  // Collect advancing players from each group
  const advancing: Array<{ player: string; groupIdx: number; position: number }> = [];
  for (let g = 0; g < groups.length; g++) {
    const sorted = groups[g].standings;
    for (let p = 0; p < advancePerGroup && p < sorted.length; p++) {
      advancing.push({ player: sorted[p].playerName, groupIdx: g, position: p });
    }
  }

  // Crossover seeding: Group A 1st vs Group B 2nd, etc.
  // Build seed list for knockout bracket
  const koMatches = state.matches.filter((m) => m.stage === 'knockout');
  const koR0 = koMatches.filter((m) => m.roundIndex === 0).sort((a, b) => a.matchIndex - b.matchIndex);

  // Simple crossover: pair 1st of each group against 2nd of another
  const firsts = advancing.filter((a) => a.position === 0);
  const seconds = advancing.filter((a) => a.position === 1);

  // Reverse seconds for crossover
  const crossedSeconds = [...seconds].reverse();

  const seeded: string[] = [];
  for (let i = 0; i < Math.max(firsts.length, crossedSeconds.length); i++) {
    if (i < firsts.length) seeded.push(firsts[i].player);
    if (i < crossedSeconds.length) seeded.push(crossedSeconds[i].player);
  }

  // Fill knockout bracket R0 matches
  const updatedMatches = state.matches.map((m) => {
    if (m.stage !== 'knockout' || m.roundIndex !== 0) return m;
    const idx = m.matchIndex;
    const p1 = seeded[idx * 2] ?? null;
    const p2 = seeded[idx * 2 + 1] ?? null;
    const isBye = (p1 !== null && p2 === null) || (p1 === null && p2 !== null);
    return {
      ...m,
      player1: p1,
      player2: p2,
      isBye,
      winner: isBye ? (p1 ?? p2) : null,
    };
  });

  // Resolve byes and propagate
  const mutableMatches = [...updatedMatches];
  const koMutable = mutableMatches.filter((m) => m.stage === 'knockout');

  // Propagate byes from R0
  for (const match of koMutable) {
    if (match.isBye && match.winner && match.feedsInto && match.feedsSlot) {
      const target = mutableMatches.find((m) => m.id === match.feedsInto);
      if (target) {
        if (match.feedsSlot === 1) target.player1 = match.winner;
        else target.player2 = match.winner;
      }
    }
  }

  resolveNewByes(mutableMatches);

  const byeCount = mutableMatches.filter(
    (m) => m.stage === 'knockout' && m.isBye && m.winner
  ).length;

  return {
    ...state,
    matches: mutableMatches,
    stage: 'knockout',
    completedMatchCount: state.completedMatchCount + byeCount,
  };
}

export function advanceTournament(state: TournamentState): TournamentState {
  if (state.winner) return state;

  // Find next playable match
  const playable = state.matches
    .filter(
      (m) =>
        !m.winner &&
        !m.isBye &&
        m.player1 !== null &&
        m.player2 !== null
    )
    .sort((a, b) => {
      // Group before knockout
      const stageOrder = (s: TournamentStage) =>
        s === 'group' ? 0 : s === 'knockout' ? 1 : 2;
      const sa = stageOrder(a.stage);
      const sb = stageOrder(b.stage);
      if (sa !== sb) return sa - sb;
      // By group index
      if ((a.groupIndex ?? 0) !== (b.groupIndex ?? 0))
        return (a.groupIndex ?? 0) - (b.groupIndex ?? 0);
      // By round
      if (a.roundIndex !== b.roundIndex) return a.roundIndex - b.roundIndex;
      // By match
      return a.matchIndex - b.matchIndex;
    });

  if (playable.length === 0) return state;

  return { ...state, currentMatchId: playable[0].id };
}

export function isTournamentOver(state: TournamentState): boolean {
  switch (state.format) {
    case 'knockout':
    case 'group_knockout': {
      const final = state.matches.find((m) => m.id.endsWith('-FINAL'));
      return final?.winner !== null && final?.winner !== undefined;
    }
    case 'round_robin': {
      return state.matches.every((m) => m.isBye || m.winner !== null);
    }
  }
}

export function getTournamentWinner(state: TournamentState): string | null {
  switch (state.format) {
    case 'knockout':
    case 'group_knockout': {
      const final = state.matches.find((m) => m.id.endsWith('-FINAL'));
      return final?.winner ?? null;
    }
    case 'round_robin': {
      if (!state.matches.every((m) => m.isBye || m.winner !== null)) return null;
      // Build standings from all matches
      const playerMap = new Map<string, TournamentGroupStanding>();
      for (const name of state.playerNames) {
        playerMap.set(name, {
          playerName: name,
          played: 0,
          won: 0,
          lost: 0,
          framesWon: 0,
          framesLost: 0,
          points: 0,
        });
      }
      for (const match of state.matches) {
        if (match.isBye || !match.winner || !match.player1 || !match.player2) continue;
        const score = getMatchScore(match);
        const p1 = playerMap.get(match.player1)!;
        const p2 = playerMap.get(match.player2)!;
        p1.played++;
        p2.played++;
        p1.framesWon += score.player1Frames;
        p1.framesLost += score.player2Frames;
        p2.framesWon += score.player2Frames;
        p2.framesLost += score.player1Frames;
        if (match.winner === match.player1) {
          p1.won++;
          p1.points += 2;
          p2.lost++;
        } else {
          p2.won++;
          p2.points += 2;
          p1.lost++;
        }
      }
      const sorted = Array.from(playerMap.values()).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const aDiff = a.framesWon - a.framesLost;
        const bDiff = b.framesWon - b.framesLost;
        if (bDiff !== aDiff) return bDiff - aDiff;
        return b.framesWon - a.framesWon;
      });
      return sorted[0]?.playerName ?? null;
    }
  }
}

// ===== Helpers =====

export function getCurrentTournamentMatch(state: TournamentState): TournamentMatch | null {
  if (!state.currentMatchId) return null;
  return state.matches.find((m) => m.id === state.currentMatchId) ?? null;
}

export function getMatchScore(match: TournamentMatch): { player1Frames: number; player2Frames: number } {
  let player1Frames = 0;
  let player2Frames = 0;
  for (const frame of match.frames) {
    if (frame.winner === match.player1) player1Frames++;
    else if (frame.winner === match.player2) player2Frames++;
  }
  return { player1Frames, player2Frames };
}

export function getTournamentProgress(state: TournamentState): {
  completed: number;
  total: number;
  currentLabel: string;
} {
  const current = getCurrentTournamentMatch(state);
  let currentLabel = '';
  if (current) {
    currentLabel = `${current.player1 ?? 'TBD'} vs ${current.player2 ?? 'TBD'}`;
  } else if (state.winner) {
    currentLabel = `${state.winner} wins!`;
  }
  return {
    completed: state.completedMatchCount,
    total: state.totalMatchCount,
    currentLabel,
  };
}

export function calculateGroupStandings(
  group: TournamentGroup,
  matches: TournamentMatch[]
): TournamentGroupStanding[] {
  const playerMap = new Map<string, TournamentGroupStanding>();
  for (const name of group.playerNames) {
    playerMap.set(name, {
      playerName: name,
      played: 0,
      won: 0,
      lost: 0,
      framesWon: 0,
      framesLost: 0,
      points: 0,
    });
  }

  for (const match of matches) {
    if (!match.winner || !match.player1 || !match.player2) continue;
    if (match.isBye) continue;

    const score = getMatchScore(match);
    const p1 = playerMap.get(match.player1);
    const p2 = playerMap.get(match.player2);
    if (!p1 || !p2) continue;

    p1.played++;
    p2.played++;
    p1.framesWon += score.player1Frames;
    p1.framesLost += score.player2Frames;
    p2.framesWon += score.player2Frames;
    p2.framesLost += score.player1Frames;

    if (match.winner === match.player1) {
      p1.won++;
      p1.points += 2;
      p2.lost++;
    } else {
      p2.won++;
      p2.points += 2;
      p1.lost++;
    }
  }

  return Array.from(playerMap.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const aDiff = a.framesWon - a.framesLost;
    const bDiff = b.framesWon - b.framesLost;
    if (bDiff !== aDiff) return bDiff - aDiff;
    if (b.framesWon !== a.framesWon) return b.framesWon - a.framesWon;
    // Head-to-head tiebreak
    return 0;
  });
}
