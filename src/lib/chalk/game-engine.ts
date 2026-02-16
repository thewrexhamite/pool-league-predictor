import type {
  QueueEntry,
  CurrentGame,
  ChalkSettings,
  ReportResultPayload,
  GamePlayer,
  KillerState,
  SessionStats,
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
    challenger = waiting[1];
  }

  // Handle killer mode — need 3+ players
  if (holder.gameMode === 'killer' || challenger.gameMode === 'killer') {
    return startKillerGame(queue, waiting, settings);
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

function startKillerGame(
  queue: QueueEntry[],
  waiting: QueueEntry[],
  settings: ChalkSettings
): StartGameResult {
  if (waiting.length < 3) {
    throw new Error('Killer requires at least 3 players');
  }

  // Take up to 8 players for killer
  const killerEntries = waiting.slice(0, 8);
  const killerPlayerNames = killerEntries.flatMap((e) => e.playerNames);

  const killerState: KillerState = {
    players: killerPlayerNames.map((name) => ({
      name,
      lives: CHALK_DEFAULTS.KILLER_DEFAULT_LIVES,
      isEliminated: false,
    })),
    round: 1,
  };

  const players: GamePlayer[] = killerEntries.flatMap((entry) =>
    entry.playerNames.map((name) => ({
      name,
      side: 'challenger' as const,
      queueEntryId: entry.id,
    }))
  );

  const game: CurrentGame = {
    id: crypto.randomUUID(),
    mode: 'killer',
    startedAt: Date.now(),
    players,
    killerState,
    consecutiveWins: 0,
    breakingPlayer: null,
  };

  const killerEntryIds = new Set(killerEntries.map((e) => e.id));
  const noShowDeadline = Date.now() + settings.noShowTimeoutSeconds * 1000;
  const updatedQueue = queue.map((e) =>
    killerEntryIds.has(e.id) ? { ...e, status: 'called' as const, noShowDeadline } : e
  );

  return { queue: updatedQueue, currentGame: game };
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

  // Winner stays at front — reset their status to waiting
  updatedQueue = updatedQueue.map((e) =>
    e.id === winnerPlayer.queueEntryId
      ? { ...e, status: 'waiting' as const, noShowDeadline: null }
      : e
  );

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
  // Reset all called entries back to waiting
  const calledIds = new Set(currentGame.players.map((p) => p.queueEntryId));
  const updatedQueue = queue.map((e) =>
    calledIds.has(e.id)
      ? { ...e, status: 'waiting' as const, noShowDeadline: null }
      : e
  );
  return { queue: updatedQueue };
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
  queue: QueueEntry[],
  winnerName: string
): StartGameResult {
  if (!currentGame.killerState) {
    throw new Error('Not a killer game');
  }

  const winnerPlayer = currentGame.players.find((p) => p.name === winnerName);
  if (!winnerPlayer) {
    throw new Error('Winner not found in game');
  }

  const killerEntryIds = new Set(currentGame.players.map((p) => p.queueEntryId));

  // Remove all killer entries from queue
  let updatedQueue = queue.filter((e) => !killerEntryIds.has(e.id));

  // Find the winner's original entry and place it at the front (winner stays on)
  const winnerEntry = queue.find((e) => e.id === winnerPlayer.queueEntryId);
  if (winnerEntry) {
    updatedQueue = [
      { ...winnerEntry, status: 'waiting' as const, noShowDeadline: null },
      ...updatedQueue,
    ];
  }

  return { queue: updatedQueue, currentGame: null };
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
