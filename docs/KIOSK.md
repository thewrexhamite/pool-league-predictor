# Chalk Kiosk App Documentation

The Chalk kiosk is a real-time pool table queue management system designed for pub/venue kiosk tablets and TVs. It manages player queues, tracks games, runs tournaments, and displays attract-mode screens — all synced in real time across devices via Firestore.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Routing](#routing)
- [Component Hierarchy](#component-hierarchy)
- [Core Components](#core-components)
- [Shared Components](#shared-components)
- [Hooks](#hooks)
- [Game Engines](#game-engines)
- [Data Model](#data-model)
- [Real-Time Sync](#real-time-sync)
- [Theming & Styling](#theming--styling)
- [Attract Mode](#attract-mode)
- [Game Modes](#game-modes)
- [Queue System](#queue-system)
- [Tournament System](#tournament-system)
- [QR Code & Short Code System](#qr-code--short-code-system)
- [Sound System](#sound-system)
- [Security](#security)
- [File Reference](#file-reference)

---

## Architecture Overview

```
                            Firestore
                               |
                          onSnapshot()
                               |
                    ChalkTableProvider (context)
                        |            |
                   KioskView      JoinView
                   (tablet)       (phone)
```

- **No backend API** — all operations are client-side Firestore transactions
- **Atomic updates** via `transactTable()` prevent race conditions across concurrent devices
- **Real-time subscriptions** push updates to all connected devices instantly
- **Offline-capable** with IndexedDB persistence via Firestore SDK
- **Context-based state** — `ChalkTableProvider` wraps all chalk routes and exposes state + actions via `useChalkTable()`

---

## Routing

All routes live under the `(chalk)` route group with its own layout that applies chalk-specific CSS.

| Route | Purpose |
|---|---|
| `/kiosk` | Setup page — join existing table by short code or create new |
| `/kiosk/create` | Create a new table with PIN and venue name |
| `/kiosk/[tableId]` | **Main kiosk display** — queue, game panel, attract mode |
| `/kiosk/[tableId]/settings` | Table settings (PIN-gated) |
| `/join/[tableId]` | Mobile player join interface (QR code destination) |
| `/tv/[tableId]` | Large TV display view |
| `/manage` | Venue management dashboard (auth required) |
| `/manage/venue/new` | Create a new venue |
| `/manage/venue/[venueId]` | Edit venue and manage linked tables |

**Layout**: `src/app/(chalk)/layout.tsx` imports `chalk-globals.css` and wraps children in a `.chalk-root` div.

**Provider**: Each `[tableId]` page wraps its content in `<ChalkTableProvider tableId={tableId}>` which sets up the Firestore subscription and exposes the table context.

---

## Component Hierarchy

```
KioskPage (src/app/(chalk)/kiosk/[tableId]/page.tsx)
└── ChalkTableProvider
    └── KioskView (main orchestrator)
        ├── ConnectionStatus
        ├── KioskHeader
        │   ├── Venue logo
        │   ├── Table name
        │   ├── King of Table badge
        │   └── Settings link
        ├── QueuePanel (left sidebar, 2fr)
        │   ├── Queue header with counts
        │   ├── QueueEntry[] (per player/team)
        │   └── QRCodeDisplay (bottom of queue)
        ├── GamePanel (right panel, 3fr)
        │   ├── KingCrownAnimation (on new king)
        │   ├── NoShowOverlay (countdown + resolution)
        │   ├── CoinTossOverlay (break decision)
        │   ├── Active game display (players, timer, streaks)
        │   │   ├── ResultReporter (select → confirm → celebrate)
        │   │   └── WinLimitNotice
        │   ├── OR: Waiting for players (QR + "Scan to join")
        │   └── Leaderboard + Recent Games (bottom)
        ├── KillerGamePanel (replaces GamePanel in killer mode)
        ├── TournamentPanel (replaces GamePanel in tournament mode)
        ├── Bottom Sheets (modals):
        │   ├── AddToQueueSheet
        │   ├── RegisterGameSheet
        │   ├── KillerSetupSheet
        │   └── TournamentSetupSheet
        ├── Claim prompt overlay ("Already playing?")
        ├── Queue interstitial overlay ("Someone joined!")
        └── AttractMode (full-screen when idle)
            ├── Rotating slides (QR, stats, king, live game, etc.)
            ├── Chalk dust particles
            ├── Ripple tap feedback
            ├── Slide indicator dots
            └── Rotating status bar
```

---

## Core Components

### KioskView (`kiosk/KioskView.tsx`)

The main orchestrator. Manages:
- **Idle detection** → attract mode transitions via `useIdleDetector()`
- **Wake lock** → keeps screen on via `useWakeLock()`
- **Theme application** → adds/removes `.chalk-light` on `.chalk-root`
- **Sheet visibility** → `showAddSheet`, `showKillerSetup`, `showTournamentSetup`, etc.
- **Claim prompt** → "Already playing?" overlay when waking from attract mode
- **Queue interstitial** → notification when someone joins while idle

### GamePanel (`kiosk/GamePanel.tsx`)

Displays the current game state or waiting-for-players screen.

**When a game is active:**
- Player names (holder vs challenger), game mode label, elapsed timer
- Win streak badge, break indicator, coin toss button
- `ResultReporter` for reporting who won
- Win limit warning when approaching threshold
- "Up Next" preview from queue

**When no game is active:**
- Next matchup preview with "Start Game" button
- Or QR code + "Waiting for players" if queue is empty

**Bottom section** (always visible): daily stats summary, leaderboard, recent games.

Delegates to `KillerGamePanel` when `currentGame.mode === 'killer'` and to `TournamentPanel` when `currentGame.mode === 'tournament'`.

### QueuePanel (`kiosk/QueuePanel.tsx`)

Left sidebar showing the player queue. Displays `QueueEntry` components for each player/team with:
- Position number
- Player names + game mode tag (singles, doubles, challenge)
- Hold/unhold toggle buttons
- Status indicators (hold countdown, called, expired)

Includes buttons to add players, start killer games, and start tournaments.

### QueueEntry (`kiosk/QueueEntry.tsx`)

Individual queue row. Shows player names, position, game mode badge, and provides hold/unhold actions via `useChalkTable()`. Uses `useHoldTimer()` to show remaining hold time.

### ResultReporter (`kiosk/ResultReporter.tsx`)

Three-phase game result UI:
1. **Select** — two large buttons for holder/challenger
2. **Confirm** — confirm or cancel the selection
3. **Celebration** — winner announcement with auto-dismiss after 3 seconds

### NoShowOverlay (`kiosk/NoShowOverlay.tsx`)

Full-screen overlay triggered when players are called to the table. Two phases:
1. **Countdown** — urgency-colored progress ring (green → amber → red), "Players to the table!" message
2. **Expired** — checkboxes to mark no-shows, "Move to back of queue" button, auto-resolves after 15 seconds

### TournamentPanel (`kiosk/TournamentPanel.tsx`)

Tournament-specific display replacing GamePanel during tournaments. Shows:
- Current match with frame-by-frame scoring
- Bracket visualization (knockout) or standings table (round-robin/group)
- Match progression and tournament completion celebration

### KillerGamePanel (`kiosk/KillerGamePanel.tsx`)

Killer mode display. Shows all players with remaining lives, elimination buttons, and round tracking.

### CoinTossOverlay (`kiosk/CoinTossOverlay.tsx`)

3D animated coin flip for deciding who breaks. Three phases: ready → spinning (2.5s) → result (auto-dismiss 3s). Uses CSS 3D transforms for realistic coin rotation.

### KingCrownAnimation (`kiosk/KingCrownAnimation.tsx`)

Celebratory animation when a player reaches 3+ consecutive wins and becomes King of the Table.

### Leaderboard (`kiosk/Leaderboard.tsx`)

Displays player rankings sorted by wins, with win rate, loss count, current streak badges, and crown icons for the king.

### LeagueStandingsSlide (`kiosk/LeagueStandingsSlide.tsx`)

Attract mode slide showing linked league team standings, next fixture, and last result. Used when `settings.linkedTeams` is configured.

### Setup Sheets

| Component | Purpose |
|---|---|
| `AddToQueueSheet` | Manually add players to queue with name input and game mode selector |
| `RegisterGameSheet` | Register an already-in-progress game (e.g., players started without the kiosk) |
| `KillerSetupSheet` | Configure killer game: select players, set lives (1-5) |
| `TournamentSetupSheet` | Configure tournament: format, race-to, add players, randomize seeding |

All sheets use the `.chalk-bottom-sheet` pattern — slide up from bottom with backdrop.

---

## Shared Components

Located in `src/components/chalk/shared/`:

| Component | Purpose |
|---|---|
| `ChalkButton` | Styled button with variants (primary, secondary, danger, ghost) and sizes (sm, md, lg) |
| `ChalkCard` | Card wrapper (default, elevated, outline variants) |
| `ChalkModal` | Modal dialog with overlay |
| `ChalkPinPad` | PIN input for authentication |
| `PlayerNameInput` | Text input with recent-names autocomplete |
| `ConnectionStatus` | Online/offline badge |
| `CrownIcon` | Crown SVG with optional animation |
| `AnimatedChalkTitle` | Animated chalk-effect title text |
| `AnimatedPoolLeagueProLogo` | Animated branding logo for attract mode |
| `GameHistoryRow` | Row component for game result display |
| `LeagueMatchRow` | Row component for league match details |

---

## Hooks

All hooks are in `src/hooks/chalk/`.

### State & Data

| Hook | Purpose | Returns |
|---|---|---|
| `useChalkTable()` | Access the table context (state + all actions) | `ChalkTableContextValue` |
| `useTablePeriodStats(tableId)` | Aggregate game history into daily/weekly/monthly stats | `{ daily, weekly, monthly, loading, refresh }` |
| `useLeagueStandings(linkedTeams)` | Fetch and cache linked league standings (1hr TTL) | `{ teams, loading }` |
| `useQueueIdentity()` | Resolve current user's display name and Firebase UID | `{ displayName, userId, isResolved }` |
| `useMatchHistory` | Load game history for a table or user (paginated) | `{ games, loading, hasMore, loadMore }` |

### Timers

| Hook | Purpose | Returns |
|---|---|---|
| `useGameTimer(startedAt)` | Elapsed game time, updates every second | `{ elapsed, minutes, seconds, display }` |
| `useNoShowTimer(deadline)` | Countdown to no-show deadline | `{ secondsLeft, isExpired }` |
| `useHoldTimer(holdUntil)` | Minutes remaining on hold (updates every 10s) | `{ minutesLeft, isExpired }` |
| `useIdleDetector(timeoutMinutes)` | Detect user inactivity | `{ isIdle, wake }` |

### UI & Device

| Hook | Purpose | Returns |
|---|---|---|
| `useVmin()` | Get viewport vmin value in pixels, updates on resize | `number` |
| `useWakeLock()` | Keep device screen awake (Screen Wake Lock API) | `void` |
| `useChalkSound(enabled, volume)` | Synthesized sound effects via Web Audio API | `{ play }` |
| `useDebouncedSetting(serverValue, onSave, delay)` | Debounce settings changes before writing to Firestore | `[localValue, setValue]` |

### Persistence

| Hook/Utility | Purpose |
|---|---|
| `saveKioskConfig(config)` | Save table ID to localStorage for tablet auto-resume |
| `loadKioskConfig()` | Load saved config (expires after 90 days) |
| `clearKioskConfig()` | Clear saved config |

---

## Game Engines

All game logic is pure functions (no side effects) in `src/lib/chalk/`.

### Queue Engine (`queue-engine.ts`)

Manages the player queue as an array of `QueueEntry` objects.

| Function | Purpose |
|---|---|
| `addToQueue(queue, payload, recentNames, session)` | Add player(s) with validation (max 30, no duplicates, private mode check) |
| `removeFromQueue(queue, entryId)` | Remove by entry ID |
| `reorderQueue(queue, entryId, newIndex)` | Move entry to new position |
| `holdEntry(queue, entryId, holdMaxMinutes)` | Put on hold (status → `on_hold`, sets `holdUntil`) |
| `unholdEntry(queue, entryId)` | Release from hold |
| `moveToBack(queue, entryId)` | Move to end of queue |
| `expireHeldEntries(queue)` | Remove entries whose hold has expired |

### Game Engine (`game-engine.ts`)

Manages game lifecycle — starting, result processing, and cancellation.

| Function | Purpose |
|---|---|
| `startNextGame(queue, currentGame, settings, sessionStats)` | Pairs next two waiting entries, applies break rules, sets no-show deadlines |
| `processResult(currentGame, queue, result, settings)` | Handles game outcome — loser removed, winner queued, win limit checks |
| `startKillerDirect(payload)` | Creates a killer game with specified players and lives |
| `eliminateKillerPlayer(currentGame, playerName)` | Decrements lives, marks eliminated |
| `cancelCurrentGame(currentGame, queue)` | Resets called entries back to waiting |
| `resolveNoShows(currentGame, queue, noShowIds)` | Moves no-show entries to back of queue |
| `findCompatibleChallenger(queue, holder)` | Finds matching game mode or challenge entry |

**Challenge mode**: A player in the queue with `gameMode: 'challenge'` skips to the front to play the current holder.

**Win limit**: When enabled, a player who reaches `winLimitCount` consecutive wins is automatically moved to the back of the queue.

**Break rules**: Determined by house rules — winner breaks, loser breaks, or alternate.

### Stats Engine (`stats-engine.ts`)

Updates player statistics after each game.

| Function | Purpose |
|---|---|
| `updateStatsAfterGame(stats, game, result)` | Updates wins/losses/streaks, crowns king if 3+ consecutive |
| `updateStatsAfterKillerGame(stats, game, winnerName)` | Winner gets win, all others get loss |
| `updateStatsAfterTournamentMatch(stats, match)` | Updates per-match (no king tracking) |
| `getLeaderboard(stats)` | Returns players sorted by wins → win rate → games played |

**King of the Table**: A player is crowned king when they reach 3+ consecutive wins. The crown transfers when someone else achieves a higher streak.

### Tournament Engine (`tournament-engine.ts`)

Generates brackets, manages frame scoring, and advances tournament state.

| Function | Purpose |
|---|---|
| `generateTournamentState(payload)` | Creates full tournament state from format/players/raceTo |
| `generateKnockoutBracket(players, raceTo)` | Single-elimination bracket with seeded byes |
| `generateRoundRobinSchedule(players, groupIndex, raceTo)` | Everyone plays everyone once (circle method) |
| `generateGroupKnockoutBracket(players, raceTo)` | Groups then knockout with snake seeding |
| `reportTournamentFrame(state, winnerName)` | Records frame, checks match completion, propagates winners |
| `advanceTournament(state)` | Sets `currentMatchId` to next playable match |
| `transitionToKnockout(state)` | Fills knockout bracket from group winners |

**Seeding**: Standard (1 vs N, 2 vs N-1) for knockout; snake method for groups.

**Group sizes**: 1 group (<=4), 2 groups (<=8), 3 groups (<=10), 4 groups (12+). Top 2 per group advance with crossover seeding.

---

## Data Model

### Firestore Collections

**`chalkTables`** — Main table documents

```typescript
ChalkTable {
  id: string;                  // Document ID (UUID)
  shortCode: string;           // "CHALK-A7Z9" (for lookup)
  name: string;                // Display name
  venueName: string;
  venueId: string | null;
  status: 'idle' | 'active' | 'private';
  createdAt: number;
  lastActiveAt: number;
  idleSince: number | null;
  settings: ChalkSettings;
  queue: QueueEntry[];
  currentGame: CurrentGame | null;
  sessionStats: SessionStats;
  recentNames: string[];       // Last 50 names for autocomplete
  session: ChalkSession;
}
```

**`chalkTables/{tableId}/history`** — Game history sub-collection

```typescript
GameHistoryRecord {
  id: string;
  tableId: string;
  mode: GameMode;
  players: GamePlayer[];
  winner: string | null;
  winnerSide: 'holder' | 'challenger' | null;
  startedAt: number;
  endedAt: number;
  duration: number;            // Milliseconds
  consecutiveWins: number;
  playerUids?: Record<string, string>;  // For user profile stats
  playerUidList?: string[];             // For collection group queries
}
```

**`chalkTableIndex`** — Short code → table ID lookup

```typescript
{ tableId: string; shortCode: string; createdAt: number; }
```

**`chalkVenues`** — Venue management

```typescript
ChalkVenue {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  tableIds: string[];
  logoUrl: string | null;
}
```

### Key Types

```typescript
// Queue
QueueEntry {
  id: string;
  playerNames: string[];       // 1 for singles, 2 for doubles
  joinedAt: number;
  status: 'waiting' | 'on_hold' | 'called' | 'no_show_warning';
  holdUntil: number | null;
  noShowDeadline: number | null;
  gameMode: GameMode;
  userId?: string;
  userIds?: Record<string, string>;
}

// Active Game
CurrentGame {
  id: string;
  mode: GameMode;
  startedAt: number;
  players: GamePlayer[];
  killerState: KillerState | null;
  tournamentState: TournamentState | null;
  consecutiveWins: number;
  breakingPlayer: string | null;
}

// Settings
ChalkSettings {
  pinHash: string;
  tableName: string;
  noShowTimeoutSeconds: number;    // Default: 120
  holdMaxMinutes: number;          // Default: 15
  winLimitEnabled: boolean;
  winLimitCount: number;           // Default: 3
  attractModeTimeoutMinutes: number; // Default: 1
  soundEnabled: boolean;
  soundVolume: number;             // Default: 0.7
  houseRules: HouseRules;
  theme: 'dark' | 'light';
  linkedTeams?: LinkedTeam[];
  attractSlideDurations?: Partial<Record<string, number>>;
}

// Game Modes
GameMode = 'singles' | 'doubles' | 'killer' | 'challenge' | 'tournament';

// Tournament Formats
TournamentFormat = 'knockout' | 'round_robin' | 'group_knockout';
```

### Defaults (`CHALK_DEFAULTS`)

| Constant | Value |
|---|---|
| `NO_SHOW_TIMEOUT_SECONDS` | 120 |
| `HOLD_MAX_MINUTES` | 15 |
| `WIN_LIMIT_COUNT` | 3 |
| `ATTRACT_MODE_TIMEOUT_MINUTES` | 1 |
| `SOUND_VOLUME` | 0.7 |
| `MAX_QUEUE_SIZE` | 30 |
| `MAX_RECENT_NAMES` | 50 |
| `KILLER_MIN/MAX_PLAYERS` | 3 / 8 |
| `TOURNAMENT_MIN/MAX_PLAYERS` | 3 / 16 |
| `SHORT_CODE_LENGTH` | 4 |
| `PIN_LENGTH` | 4 |
| `ATTRACT_SLIDE_DURATION_SECONDS` | 12 |

---

## Real-Time Sync

### How It Works

1. **ChalkTableProvider** calls `subscribeToTable(tableId, onData, onError)` on mount
2. Firestore's `onSnapshot()` listener fires on any document change
3. New `ChalkTable` data flows into React context
4. All components consuming `useChalkTable()` re-render

### Mutation Pattern

All state changes use atomic transactions:

```typescript
// Inside ChalkTableProvider
await transactTable(tableId, (currentTable) => {
  // Read current state → compute new state → return partial update
  const result = processResult(currentTable.currentGame, currentTable.queue, payload);
  return {
    queue: result.queue,
    currentGame: result.currentGame,
    sessionStats: updatedStats,
    lastActiveAt: Date.now(),
  };
});
```

This ensures consistency when multiple devices (kiosk tablet + player phones) mutate simultaneously.

### Connection Status

The provider tracks connection status (`'connected' | 'disconnected' | 'reconnecting'`) and surfaces it via context. The `ConnectionStatus` component displays an indicator in the UI.

### Offline Support

`enableChalkPersistence()` enables Firestore's IndexedDB cache, allowing the kiosk to function during brief network outages. Pending writes are synced when connectivity resumes.

---

## Theming & Styling

### Design Approach

- **Dark-first**: Optimized for pub/venue lighting conditions
- **Viewport-relative sizing**: All dimensions use `vmin` units for consistent scaling across TV and tablet displays
- **CSS custom properties**: Colors defined as RGB triplets, enabling Tailwind opacity modifiers (`text-white/70`)
- **Touch-first**: 48px minimum touch targets, no hover-dependent UI
- **Kiosk-optimized**: Prevents zoom, text selection, and pull-to-refresh

### Theme System

The chalk root element applies CSS custom properties:

- `.chalk-root` — Dark mode (default): dark surfaces, white text
- `.chalk-root.chalk-light` — Light mode override: cream surfaces, dark text

Theme switching is controlled by `table.settings.theme` and applied in `KioskView` by toggling the `.chalk-light` class.

All color utilities (`text-white`, `bg-surface-card`, `border-surface-border`) resolve through CSS variables, so changing the class instantly themes everything.

### Color Tokens

| Token | Dark Value | Purpose |
|---|---|---|
| `surface` | `8 12 24` | Base background |
| `surface-card` | `16 22 38` | Card backgrounds |
| `surface-elevated` | `30 40 58` | Modals, sheets |
| `surface-border` | `48 60 78` | Borders, dividers |
| `baize` | `16 185 129` | Primary green (pool table felt) |
| `baize-light` | `52 211 153` | Hover states |
| `baize-dark` | `10 130 90` | Active states |
| `accent` | `212 168 85` | Gold (crowns, highlights) |
| `win` | `34 197 94` | Win indicators |
| `loss` | `239 68 68` | Loss indicators, errors |
| `info` | `74 173 232` | Informational blue |

### Typography Scale

All text uses vmin-based sizing for display scaling:

| Size | Usage |
|---|---|
| `6vmin` | Countdown timer number |
| `4.5vmin` | Player names in overlays |
| `3.7vmin` | "vs" separator |
| `2.8vmin` | Active game player names |
| `2.2vmin` | Section headings |
| `1.9vmin` | Sub-headings |
| `1.7vmin` | Stat values |
| `1.5vmin` | Body text, queue names |
| `1.3vmin` | Labels, captions |
| `1.1vmin` | Small text, hints |
| `1vmin` | Micro labels |

### Layout Grid

```css
.chalk-kiosk-grid {
  display: grid;
  grid-template-columns: 2fr 3fr;  /* Queue | Game */
  grid-template-rows: auto 1fr;    /* Header | Content */
  height: 100dvh;
}
```

### Key Animations

| Animation | Duration | Purpose |
|---|---|---|
| `chalk-slide-up` | 0.3s | Entry animation for components |
| `chalk-fade-in` | 0.3s | Fade-in transitions |
| `chalk-crown-bounce` | 0.6s | King of table crown appearance |
| `chalk-shake` | 0.5s | Error feedback |
| `chalk-glow-pulse` | 3s | Green glow on attract mode QR |
| `chalk-attract-drift` | 120s | Subtle movement to prevent OLED burn-in |
| `chalk-dust-float` | 14-24s | Floating chalk particle effects |
| `chalk-tap-ripple` | 0.5s | Touch feedback ripple |

### Accessibility

- `prefers-reduced-motion` media query disables all animations
- WCAG AA compliant contrast ratios (minimum 4.5:1 for normal text)
- `aria-label`, `aria-live`, `role="alertdialog"` on interactive elements
- Custom thin scrollbar styling

---

## Attract Mode

`AttractMode` activates after `attractModeTimeoutMinutes` of inactivity (default: 1 minute). It displays a full-screen slideshow with these slides:

| Slide | Content | When Shown |
|---|---|---|
| `qr` | QR code, venue logo, "Scan to play" CTA | Always (primary) |
| `king` | "Can you dethrone [name]?" challenge | When king exists |
| `live_game` | Current game in progress with timer | When game is active |
| `table_free` | "Table is free — come play!" CTA | When no game and queue empty |
| `stats` | Daily champion + top 5 leaderboard | When daily games > 0 |
| `fun_stats` | Animated counters (games, players, streaks) | When daily games >= 3 |
| `league_standings` | Linked team standings and fixtures | When linkedTeams configured |
| `hero` | Animated Pool League Pro branding | Always (filler) |

Slides rotate with per-slide configurable durations (default 12 seconds each) and smooth crossfade transitions. The visible slide set is dynamically filtered based on current table state.

**Visual effects**: Floating chalk dust particles, subtle drift animation (burn-in prevention), green glow pulses, and a rotating status bar at the bottom.

**Interaction**: Any touch/click wakes from attract mode. The `onWake` callback shows the main UI; `onClaim` opens the register-game sheet for games already in progress.

---

## Game Modes

### Singles

Standard 1v1 game. The holder (table winner) stays on; the challenger comes from the queue.

### Doubles

2v2 game. Each queue entry must have exactly 2 player names. Matched by compatible game mode.

### Challenge

A player challenges the current holder directly, skipping to the front of the queue. The challenger's queue entry has `gameMode: 'challenge'`.

### Killer

Free-for-all with 3-8 players and configurable lives (1-5). Players are eliminated when their lives reach zero. Last player standing wins. Uses `KillerGamePanel` and `KillerSetupSheet`.

### Tournament

Structured competition with 3-16 players. Three formats:

| Format | Description | Min Players |
|---|---|---|
| **Knockout** | Single elimination bracket | 3 |
| **Round Robin** | Everyone plays everyone once | 3 |
| **Group + Knockout** | Group stage then knockout bracket | 5 |

Tournaments support configurable "race to" (frames to win per match, 1-13) and frame-by-frame scoring. Uses `TournamentPanel` and `TournamentSetupSheet`.

---

## Queue System

### Player Flow

```
Join (QR/manual) → Waiting → Called (no-show timer starts)
                      ↓                    ↓
                   On Hold          Game starts or no-show
                      ↓                    ↓
              Released/Expired      Win → front / Lose → removed
```

### Key Behaviors

- **Max queue size**: 30 entries
- **Hold**: Players can go on hold for up to 15 minutes (configurable). Expired holds are auto-removed.
- **No-show**: When called to the table, players have 120 seconds (configurable) to show up. If they don't, they're moved to the back of the queue. Auto-resolution after 15 additional seconds.
- **Win limit**: When enabled, a player with N consecutive wins is automatically moved to the back.
- **Reordering**: Queue entries can be dragged to new positions.
- **Recent names**: Last 50 player names are cached for quick autocomplete on the add-player input.

### Private Mode

When enabled, only players on the `privatePlayerNames` allowlist can join the queue. Useful for reserved table sessions.

---

## QR Code & Short Code System

### Short Codes

Format: `CHALK-XXXX` (4 alphanumeric characters, excluding I, O, 0, 1 to avoid confusion).

- Generated on table creation via `generateShortCode()`
- Indexed in `chalkTableIndex` collection for fast lookup
- ~1.3M possible combinations (32^4)

### QR Codes

Generated using the qrserver.com API (no server-side rendering needed). Points to `/join/{tableId}`. Displayed on:
- Kiosk attract mode (primary slide)
- Queue panel (bottom)
- Waiting-for-players screen

### Join Flow

1. Player scans QR code or enters short code on `/kiosk` page
2. Navigated to `/join/{tableId}`
3. `JoinView` renders with live table data
4. Player enters name, selects game mode, taps "Join"
5. `addToQueue()` validates and creates queue entry via Firestore transaction
6. All connected devices (kiosk + other phones) see the update instantly

---

## Sound System

`useChalkSound(enabled, volume)` generates synthesized sound effects using the Web Audio API — no audio files needed.

| Effect | Frequencies | Usage |
|---|---|---|
| `queue_add` | 440, 554, 659 Hz | Player added to queue |
| `game_start` | 330, 440, 554, 659 Hz | Game begins |
| `game_end` | 659, 554, 440 Hz | Game ends (descending) |
| `no_show` | 220, 220, 220 Hz | No-show alarm |
| `crown` | 523, 659, 784, 1047 Hz | New king crowned (fanfare) |
| `hold` | 330, 262 Hz | Player put on hold (descending) |
| `error` | 220, 165 Hz | Error/warning |

Sounds use oscillator nodes with exponential gain ramps. Master volume is `volume * 0.3` to prevent being too loud in pub environments.

---

## Security

### PIN System

- Table settings are protected by a 4-digit PIN
- PIN is hashed client-side with SHA-256 via `crypto.subtle.digest()`
- Only the hash is stored in Firestore (`settings.pinHash`)
- Verification: hash the input PIN and compare with stored hash
- No plaintext PIN is ever transmitted or stored

### Data Access

- All operations are client-side Firestore transactions
- Firestore Security Rules control read/write access
- Venue operations require Firebase Authentication
- Player identity resolution links queue entries to Firebase UIDs when authenticated

---

## File Reference

### Core Library (`src/lib/chalk/`)

| File | Lines | Purpose |
|---|---|---|
| `types.ts` | ~330 | All TypeScript type definitions |
| `constants.ts` | ~85 | Default values, label maps, collection names |
| `game-engine.ts` | ~350 | Game start, result, killer, cancellation logic |
| `queue-engine.ts` | ~140 | Queue add, remove, hold, reorder |
| `tournament-engine.ts` | ~730 | Bracket generation, frame scoring, advancement |
| `stats-engine.ts` | ~175 | Player stats, king tracking, leaderboard |
| `table-provider.tsx` | ~630 | React context, Firestore subscription, all actions |
| `firestore.ts` | ~465 | CRUD operations, real-time subscriptions |
| `user-stats.ts` | ~60 | Lifetime player stats updates |
| `short-code.ts` | ~30 | Short code generation and validation |
| `qr-utils.ts` | ~15 | QR code URL generation |
| `pin-utils.ts` | ~15 | SHA-256 PIN hashing |

### Hooks (`src/hooks/chalk/`)

| File | Purpose |
|---|---|
| `use-chalk-table.ts` | Context accessor |
| `use-game-timer.ts` | Elapsed game time |
| `use-no-show-timer.ts` | No-show countdown |
| `use-hold-timer.ts` | Hold expiry countdown |
| `use-idle-detector.ts` | Inactivity detection |
| `use-wake-lock.ts` | Screen wake lock |
| `use-chalk-sound.ts` | Web Audio sound effects |
| `use-vmin.ts` | Viewport vmin in pixels |
| `use-table-period-stats.ts` | Daily/weekly/monthly aggregated stats |
| `use-league-standings.ts` | League integration (1hr cache) |
| `use-queue-identity.ts` | User identity resolution |
| `use-match-history.ts` | Game history with pagination |
| `use-debounced-setting.ts` | Debounced Firestore writes |
| `use-kiosk-persistence.ts` | localStorage for auto-resume |

### Kiosk Components (`src/components/chalk/kiosk/`)

| File | Purpose |
|---|---|
| `KioskView.tsx` | Main orchestrator |
| `KioskHeader.tsx` | Top bar with table name and king badge |
| `GamePanel.tsx` | Active game or waiting display |
| `QueuePanel.tsx` | Queue sidebar |
| `QueueEntry.tsx` | Individual queue row |
| `AttractMode.tsx` | Idle-state slideshow |
| `ResultReporter.tsx` | Game result entry UI |
| `NoShowOverlay.tsx` | No-show countdown and resolution |
| `TournamentPanel.tsx` | Tournament game display |
| `TournamentSetupSheet.tsx` | Tournament configuration |
| `KillerGamePanel.tsx` | Killer mode display |
| `KillerSetupSheet.tsx` | Killer game configuration |
| `CoinTossOverlay.tsx` | Break decision coin flip |
| `KingCrownAnimation.tsx` | King ceremony animation |
| `Leaderboard.tsx` | Player rankings |
| `LeagueStandingsSlide.tsx` | League standings for attract mode |
| `AddToQueueSheet.tsx` | Manual queue addition |
| `RegisterGameSheet.tsx` | Register in-progress game |
| `GameModeSelector.tsx` | Game mode picker |
| `QRCodeDisplay.tsx` | QR code with short code |
| `PrivateModeToggle.tsx` | Private/restricted mode switch |
| `WinLimitNotice.tsx` | Win limit warning badge |

### Styling

| File | Purpose |
|---|---|
| `src/app/(chalk)/chalk-globals.css` | Chalk CSS variables, animations, layout |
| `tailwind.config.ts` | Custom color tokens, shadows, animation keyframes |
| `src/app/globals.css` | Base CSS variables (overridden by chalk) |
