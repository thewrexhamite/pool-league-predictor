import type {
  QueueEntry,
  CurrentGame,
  ChalkSettings,
  ReportResultPayload,
  GamePlayer,
  KillerState,
  SessionStats,
  StartKillerPayload,
} from './types';
import { moveToBack } from './queue-engine';
import { CHALK_DEFAULTS } from './constants';

interface StartGameResult {
  queue: QueueEntry[];
  currentGame: CurrentGame | null;
}

export function startNextGame(
  queue: QueueEntry[],
  currentGame: CurrentGame | null,
  settings: ChalkSettings,
  sessionStats?: SessionStats
): StartGameResult {
  if (currentGame) {
    throw new Error('Game already in progress');
  }

  // Find the first two waiting entries
  const waiting = queue.filter((e) => e.status === 'waiting');

  // Handle challenge mode — challenger skips to front
  const challengeEntry = queue.find((e) => e.status === 'waiting' && e.gameMode === 'challenge');
  let holder: QueueEntry;
  let challenger: QueueEntry;

  if (challengeEntry && waiting.length >= 2) {
    // Challenge mode: challenger plays against the holder (first non-challenge waiting entry)
    const holderEntry = waiting.find((e) => e.id !== challengeEntry.id);
    holder = holderEntry ?? waiting[0];
    challenger = challengeEntry;
  } else {
    if (waiting.length < 2) {
      throw new Error('Need at least 2 players in queue');
    }
    holder = waiting[0];
    // Find the first compatible challenger — skip entries with mismatched game modes
    const compatibleChallenger = findCompatibleChallenger(waiting, holder);
    if (!compatibleChallenger) {
      throw new Error('No compatible challenger in queue');
    }
    challenger = compatibleChallenger;
  }

  // Determine game mode — both must agree for doubles
  const isDoubles = holder.gameMode === 'doubles' && challenger.gameMode === 'doubles';
  if (isDoubles) {
    // Validate both entries have 2 players for doubles
    if (holder.playerNames.length !== 2 || challenger.playerNames.length !== 2) {
      throw new Error('Doubles requires exactly 2 players per team');
    }
  }

  // Standard singles/doubles game
  const players: GamePlayer[] = [
    ...holder.playerNames.map((name) => ({
      name,
      side: 'holder' as const,
      queueEntryId: holder.id,
    })),
    ...challenger.playerNames.map((name) => ({
      name,
      side: 'challenger' as const,
      queueEntryId: challenger.id,
    })),
  ];

  // Determine consecutive wins: if holder is position 0 in the original queue,
  // they were the previous winner — look up their streak from session stats
  let consecutiveWins = 0;
  if (sessionStats && queue[0]?.id === holder.id) {
    // Holder is at position 0, meaning they won the last game
    const holderName = holder.playerNames[0];
    const holderStats = sessionStats.playerStats[holderName];
    if (holderStats) {
      consecutiveWins = holderStats.currentStreak;
    }
  }

  const game: CurrentGame = {
    id: crypto.randomUUID(),
    mode: isDoubles ? 'doubles' : challenger.gameMode === 'challenge' ? 'challenge' : 'singles',
    startedAt: Date.now(),
    players,
    killerState: null,
    tournamentState: null,
    consecutiveWins,
    breakingPlayer: determineBreaker(settings, null, players),
  };

  // Mark both entries as called with no-show deadline
  const noShowDeadline = Date.now() + settings.noShowTimeoutSeconds * 1000;
  const updatedQueue = queue.map((e) => {
    if (e.id === holder.id || e.id === challenger.id) {
      return { ...e, status: 'called' as const, noShowDeadline };
    }
    return e;
  });

  return { queue: updatedQueue, currentGame: game };
}

export function startKillerDirect(payload: StartKillerPayload): CurrentGame {
  const { playerNames, lives } = payload;

  if (playerNames.length < CHALK_DEFAULTS.KILLER_MIN_PLAYERS) {
    throw new Error(`Killer requires at least ${CHALK_DEFAULTS.KILLER_MIN_PLAYERS} players`);
  }
  if (playerNames.length > CHALK_DEFAULTS.KILLER_MAX_PLAYERS) {
    throw new Error(`Killer allows at most ${CHALK_DEFAULTS.KILLER_MAX_PLAYERS} players`);
  }
  if (lives < 1 || lives > 5) {
    throw new Error('Lives must be between 1 and 5');
  }

  const killerState: KillerState = {
    players: playerNames.map((name) => ({
      name,
      lives,
      isEliminated: false,
    })),
    round: 1,
    maxLives: lives,
  };

  const players: GamePlayer[] = playerNames.map((name) => ({
    name,
    side: 'challenger' as const,
    queueEntryId: `killer-${name}`,
  }));

  return {
    id: crypto.randomUUID(),
    mode: 'killer',
    startedAt: Date.now(),
    players,
    killerState,
    tournamentState: null,
    consecutiveWins: 0,
    breakingPlayer: null,
  };
}

export function processResult(
  currentGame: CurrentGame,
  queue: QueueEntry[],
  result: ReportResultPayload,
  settings: ChalkSettings
): StartGameResult {
  const { winningSide } = result;

  // Find the winner and loser queue entries
  const winnerPlayer = currentGame.players.find((p) => p.side === winningSide);
  const loserSide = winningSide === 'holder' ? 'challenger' : 'holder';
  const loserPlayer = currentGame.players.find((p) => p.side === loserSide);

  if (!winnerPlayer || !loserPlayer) {
    throw new Error('Invalid game state');
  }

  let updatedQueue = [...queue];
  const newConsecutiveWins = winningSide === 'holder'
    ? currentGame.consecutiveWins + 1
    : 1;

  // Check win limit
  const winLimitReached = settings.winLimitEnabled && newConsecutiveWins >= settings.winLimitCount;

  // Remove loser from front of queue (they played)
  updatedQueue = updatedQueue.filter((e) => e.id !== loserPlayer.queueEntryId);

  if (winLimitReached) {
    // Winner has hit the limit — move to back of queue
    updatedQueue = moveToBack(updatedQueue, winnerPlayer.queueEntryId);

    return { queue: updatedQueue, currentGame: null };
  }

  // Winner stays at front — move to position 0 and reset status
  const winnerEntry = updatedQueue.find((e) => e.id === winnerPlayer.queueEntryId);
  if (winnerEntry) {
    updatedQueue = updatedQueue.filter((e) => e.id !== winnerPlayer.queueEntryId);
    updatedQueue = [
      { ...winnerEntry, status: 'waiting' as const, noShowDeadline: null },
      ...updatedQueue,
    ];
  }

  // No more game right now — wait for explicit start
  return { queue: updatedQueue, currentGame: null };
}

export function eliminateKillerPlayer(
  currentGame: CurrentGame,
  eliminatedPlayerName: string
): CurrentGame {
  if (!currentGame.killerState) {
    throw new Error('Not a killer game');
  }

  const updatedPlayers = currentGame.killerState.players.map((p) => {
    if (p.name === eliminatedPlayerName && !p.isEliminated) {
      const newLives = p.lives - 1;
      return {
        ...p,
        lives: newLives,
        isEliminated: newLives <= 0,
      };
    }
    return p;
  });

  return {
    ...currentGame,
    killerState: {
      ...currentGame.killerState,
      players: updatedPlayers,
      round: currentGame.killerState.round + 1,
    },
  };
}

export function cancelCurrentGame(
  currentGame: CurrentGame,
  queue: QueueEntry[]
): { queue: QueueEntry[] } {
  // Killer and tournament games are independent of the queue — no queue changes needed
  if (currentGame.mode === 'killer' || currentGame.mode === 'tournament') {
    return { queue };
  }

  // Reset all called entries back to waiting
  const calledIds = new Set(currentGame.players.map((p) => p.queueEntryId));
  const updatedQueue = queue.map((e) =>
    calledIds.has(e.id)
      ? { ...e, status: 'waiting' as const, noShowDeadline: null }
      : e
  );
  return { queue: updatedQueue };
}

export function resolveNoShows(
  currentGame: CurrentGame,
  queue: QueueEntry[],
  noShowEntryIds: Set<string>
): { queue: QueueEntry[] } {
  const calledIds = new Set(currentGame.players.map((p) => p.queueEntryId));
  let updatedQueue = queue.map((e) => {
    if (noShowEntryIds.has(e.id)) {
      // Move no-shows to back of queue as waiting
      return { ...e, status: 'waiting' as const, noShowDeadline: null, holdUntil: null };
    }
    if (calledIds.has(e.id)) {
      // Reset remaining called entries
      return { ...e, status: 'waiting' as const, noShowDeadline: null };
    }
    return e;
  });
  // Physically move no-show entries to the back
  for (const id of noShowEntryIds) {
    updatedQueue = moveToBack(updatedQueue, id);
  }
  return { queue: updatedQueue };
}

/**
 * Find the first queue entry compatible with the holder's game mode.
 * Singles matches singles, doubles matches doubles. Killer is handled separately.
 * Challenge is compatible with any mode (it inherits the holder's mode).
 */
export function findCompatibleChallenger(
  waiting: QueueEntry[],
  holder: QueueEntry
): QueueEntry | null {
  for (let i = 1; i < waiting.length; i++) {
    const entry = waiting[i];
    // Challenge is always compatible — the challenger accepts the holder's mode
    if (entry.gameMode === 'challenge') return entry;
    // Killer is handled by a separate path, skip here
    if (entry.gameMode === 'killer' || holder.gameMode === 'killer') continue;
    // Singles must match singles, doubles must match doubles
    if (entry.gameMode === holder.gameMode) return entry;
  }
  return null;
}

function determineBreaker(
  settings: ChalkSettings,
  previousGame: CurrentGame | null,
  players: GamePlayer[]
): string | null {
  if (players.length === 0) return null;

  switch (settings.houseRules.breakRule) {
    case 'winner_breaks':
      // Holder breaks (they won last game or are first in queue)
      return players.find((p) => p.side === 'holder')?.name ?? players[0].name;
    case 'loser_breaks':
      return players.find((p) => p.side === 'challenger')?.name ?? players[0].name;
    case 'alternate':
      // New challenger always breaks on alternate
      return players.find((p) => p.side === 'challenger')?.name ?? players[0].name;
    default:
      return players[0].name;
  }
}

export function processKillerResult(
  currentGame: CurrentGame,
  winnerName: string
): void {
  if (!currentGame.killerState) {
    throw new Error('Not a killer game');
  }

  const winnerPlayer = currentGame.players.find((p) => p.name === winnerName);
  if (!winnerPlayer) {
    throw new Error('Winner not found in game');
  }

  // Queue is untouched — killer is independent of the queue system
}

export function getKillerSurvivors(killerState: KillerState): string[] {
  return killerState.players
    .filter((p) => !p.isEliminated)
    .map((p) => p.name);
}

export function isKillerGameOver(killerState: KillerState): boolean {
  const survivors = killerState.players.filter((p) => !p.isEliminated);
  return survivors.length <= 1;
}

export function getKillerWinner(killerState: KillerState): string | null {
  const survivors = killerState.players.filter((p) => !p.isEliminated);
  return survivors.length === 1 ? survivors[0].name : null;
}
