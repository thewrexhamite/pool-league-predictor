/**
 * localStorage Migration Utility
 *
 * Migrates existing localStorage data to Firestore on first sign-in.
 * Ensures users don't lose their My Team selection and What-If scenarios
 * when they authenticate for the first time.
 */

import type { DivisionCode, WhatIfResult, SquadOverrides } from '@/lib/types';
import { saveUserData } from './user-data-sync';
import type { UserData, MyTeamData, UserSessionData } from './user-data-sync';

// localStorage keys (must match existing app storage keys)
const MY_TEAM_KEY = 'pool-league-pro-my-team';
const SESSION_KEY = 'pool-league-session';

/**
 * My Team value as stored in localStorage
 */
interface LocalMyTeamValue {
  team: string;
  div: DivisionCode;
}

/**
 * Session value as stored in localStorage
 */
interface LocalSessionValue {
  whatIfResults: WhatIfResult[];
  squadOverrides: SquadOverrides;
  selectedDiv: DivisionCode;
  lastActive: number;
}

/**
 * Read My Team data from localStorage
 */
function getLocalMyTeam(): MyTeamData | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(MY_TEAM_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as LocalMyTeamValue;
    if (parsed.team && parsed.div) {
      return { team: parsed.team, div: parsed.div };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Read session data from localStorage
 */
function getLocalSession(): UserSessionData | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as LocalSessionValue;
    return {
      whatIfResults: parsed.whatIfResults || [],
      squadOverrides: parsed.squadOverrides || {},
      selectedDiv: parsed.selectedDiv || '',
    };
  } catch {
    return null;
  }
}

/**
 * Migrate localStorage data to Firestore on first sign-in.
 *
 * Reads My Team selection and user session from localStorage,
 * then saves to Firestore. Safe to call multiple times - only
 * migrates if localStorage data exists.
 *
 * @param userId - The authenticated user's Firebase UID
 * @returns Promise that resolves when migration completes (or no data to migrate)
 */
export async function migrateLocalDataToFirestore(userId: string): Promise<void> {
  try {
    const myTeam = getLocalMyTeam();
    const session = getLocalSession();

    // Only migrate if we have data
    if (!myTeam && (!session || (session.whatIfResults.length === 0 && Object.keys(session.squadOverrides).length === 0))) {
      return;
    }

    // Build user data to migrate
    const userData: UserData = {
      myTeam: myTeam || null,
      session: session || {
        whatIfResults: [],
        squadOverrides: {},
        selectedDiv: '',
      },
      lastActive: Date.now(),
    };

    // Save to Firestore
    await saveUserData(userId, userData);
  } catch {
    // Migration failed - user can always manually re-select their team
    // and re-create What-If scenarios if needed
  }
}
