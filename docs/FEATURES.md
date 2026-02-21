# Gamification, AI, Auth & Notifications

Four cross-cutting systems that drive user engagement, intelligence, authentication, and communication.

---

## Table of Contents

- [Gamification System](#gamification-system)
- [AI Integration](#ai-integration)
- [Authentication](#authentication)
- [Notifications](#notifications)

---

## Gamification System

**Location:** `src/lib/gamification/`

A usage-based engagement system where features unlock through genuine app usage, and player labels are earned from real match data.

### Architecture

```
Usage Tracker (debounced writes)
    |
    v
Tool Unlock Conditions
    |
    v
Gamification Provider (real-time Firestore sync)
    |
    v
Player Labels + Form Indicators + Season Arc
```

### Player Labels

**File:** `labels.ts`

Dynamic badges earned from match data across 5 categories:

| Category | Labels | Examples |
|----------|--------|----------|
| **Performance** (4) | In Form, Hot Streak, Strong Away, Home Fortress | 65%+ win rate last 5 games |
| **Consistency** (3) | Reliable, Season Improver, Late Bloomer | Low variance, improving trend |
| **Clutch** (3) | Reliable Closer, Pressure Player, Comeback Specialist | Positive clutch rating |
| **Tactical** (2) | BD Specialist, Frame Winner | High BD efficiency |
| **Social** (2) | Team Builder, Scout | Captain status, usage patterns |

Labels auto-expire after 4 weeks if criteria are no longer met. Maximum 5 active labels per player.

`evaluateLabels()` re-evaluates weekly, refreshing valid labels and dropping expired ones.

### Tool Unlocks

**File:** `tool-unlocks.ts`

Progressive feature unlock based on genuine engagement:

| Tool | Requirement |
|------|-------------|
| Pressure Frame Analysis | View 10+ player profiles |
| Opponent Deep Dive | Run 3+ player comparisons |
| Season Trajectory | Use app for 4+ weeks |
| Captain's Toolkit | Claim captain + use lineup optimizer |
| Division Radar | View 20+ player profiles |

`getToolStatuses()` returns unlock status and progress for each tool.

### Season Arc

**File:** `season-arc.ts`

Narrative storytelling of a player's season:
- `getSeasonPhase()` — early/mid/late/complete based on completion %
- `getSeasonTrajectory()` — rolling 5-match win% for sparkline visualization
- `getKeyMoments()` — win streaks, form changes, milestones (10/25/50/100 games)
- `getSeasonSummary()` — generates narrative text describing the season

### Form Indicators

**File:** `form-indicators.ts`

`computeFormIndicators()` calculates 5 metrics for claimed players:

1. **Win Rate** — current trend + percentile in division
2. **Consistency** — career stability (if multi-season data)
3. **Match Impact** — clutch rating vs division
4. **BD Efficiency** — break & dish success rate percentile
5. **Home/Away Split** — venue bias analysis

Each returns a `FormIndicator` with trend direction (improving/stable/declining) and percentile ranking.

### Mini-Leagues

**File:** `mini-leagues.ts`

Competitive communities within the app:
- Create with 6-character invite code (A-Z, 2-9)
- Join by invite code, max 50 members
- Leaderboard sorted by XP, season-scoped
- Stored in `miniLeagues` Firestore collection

### Usage Tracker

**File:** `usage-tracker.ts`

Lightweight, debounced tracking with minimal Firestore writes:
- Batches updates every 30 seconds
- Tracks: player views, comparisons, scouting reports, simulations, features used
- Auto-flushes on page unload

### Provider

**File:** `GamificationProvider.tsx`

React context with real-time Firestore listener on `gamification/{userId}`:
- Syncs labels, usage, unlocked tools, predictions, mini-leagues
- Provides `useInsightsContext()` hook

---

## AI Integration

**Location:** `src/ai/`

Powered by Google Genkit with Gemini AI. Provides natural language analysis of matches, players, and teams.

### Configuration

**File:** `genkit.ts`

- Uses `googleai/gemini-2.0-flash` by default (configurable via `GEMINI_MODEL` env var)
- Conditionally loads plugin only if `GEMINI_API_KEY` is set
- Gracefully disabled in development without API key

### AI Flows

All flows use structured input/output schemas (Zod) for type safety.

#### Player Insights (`flows/player-insights.ts`)

**Input:** Comprehensive player stats (24/25 season, 25/26 season, career, team context)

**Output:**
- Scouting report (2-3 sentences)
- Form assessment
- Season comparison
- Strengths and weaknesses arrays

#### Team Report (`flows/team-report.ts`)

**Input:** Team standing, recent form, home/away split, player summaries, BD stats, next opponent

**Output:**
- Overall assessment (position, momentum, trajectory)
- Player performances (hot/cold, key contributors)
- Trends analysis
- Stats highlights
- Outlook and expectations

#### Match Analysis (`flows/match-analysis.ts`)

**Input:** H2H matchup with strength ratings, predictions, standings

**Output:**
- Preview narrative (2-3 sentences)
- Tactical insights
- Key factors
- Predicted outcome

#### Natural Language (`flows/natural-language.ts`)

**Input:** Free-form question + league context (standings, teams, players)

**Output:**
- Answer (2-4 sentences with specific numbers)
- Referenced teams and players
- 3 suggested follow-up questions

---

## Authentication

**Location:** `src/lib/auth/`

Firebase Auth with Google OAuth, Firestore user profiles, captain claiming, and admin roles.

### Auth Context

**File:** `auth-context.tsx`

React context managing authentication state:

```typescript
{
  user: FirebaseUser | null,
  profile: UserProfile | null,
  loading: boolean,
  error: Error | null,
  signIn: () => Promise<void>,
  signOut: () => Promise<void>,
  refreshProfile: () => Promise<void>
}
```

Real-time sync via `onAuthStateChanged()`.

**Hooks:**
| Hook | Returns |
|------|---------|
| `useAuth()` | Full context with all state + methods |
| `useUser()` | Firebase User only |
| `useUserProfile()` | UserProfile only |
| `useIsAuthenticated()` | Boolean |

### User Profile

**File:** `auth-utils.ts`

```typescript
UserProfile {
  email: string,
  displayName: string,
  photoURL: string,
  isAdmin: boolean,
  claimedProfiles: ClaimedProfile[],    // player claims
  captainClaims: CaptainClaim[],        // team captain claims
  onboarding: OnboardingProgress,       // tutorial tracking
  settings: UserSettings,               // notification + privacy prefs
  createdAt: Timestamp,
  lastActive: Timestamp
}
```

### Captain Claiming

Players can claim to be team captains:
1. User selects league, season, division, team
2. Creates unverified claim
3. Admin verifies or rejects via CaptainVerificationPanel
4. Verified captains unlock captain-only features

### Server-Side Auth

**File:** `server-auth.ts`

`verifyAdminAccess(request)` for API routes:
1. Extract Bearer token from Authorization header
2. Verify with Firebase Admin SDK
3. Check admin role in Firestore
4. Return `userId` or `null`

---

## Notifications

### Push Notifications

**File:** `src/lib/notifications.ts`

Firebase Cloud Messaging (FCM) integration:

| Function | Purpose |
|----------|---------|
| `isNotificationSupported()` | Check browser support |
| `requestPermission()` | Ask for notification permission |
| `getToken()` | Get FCM token |
| `subscribeToNotifications()` | Subscribe with preferences |
| `unsubscribeFromNotifications()` | Remove subscription |
| `updateNotificationPreferences()` | Update preferences |

**Notification preferences:**
- Match results, upcoming fixtures, standings updates, prediction updates
- Team and division filters
- Quiet hours (start/end time)
- Reminder timing

### Email Notifications

**File:** `src/lib/email.ts`

Resend API integration with React Email templates.

| Function | Template |
|----------|---------|
| `sendMatchResultsEmail()` | Score display, teams, "Your Team" badge |
| `sendUpcomingFixturesEmail()` | Fixture list with dates, venues |
| `sendWeeklyDigestEmail()` | Comprehensive weekly summary |

**Email from:** `notifications@poolleaguepredictor.com`

### Email Templates

**Location:** `src/lib/email-templates/`

| Template | Purpose |
|----------|---------|
| `BaseEmail.tsx` | Shared layout (header, footer, branding, unsubscribe) |
| `MatchResultsEmail.tsx` | Individual match result notification |
| `UpcomingFixturesEmail.tsx` | Weekly fixture preview |
| `WeeklyDigestEmail.tsx` | Full weekly digest (results, fixtures, standings changes) |

Templates use email-safe inline CSS (no flexbox), with color-coded sections:
- Gray background for results
- Blue tint for fixtures
- Yellow for standings changes

### Subscription Storage

```
users/{userId}/
  notificationSubscription/
    active     # FCM token + push preferences
  emailSubscription/
    active     # email + email preferences + frequency
```
