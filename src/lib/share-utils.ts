'use client';

import type { DivisionCode } from './types';

export interface ShareData {
  title: string;
  text: string;
  url: string;
}

export interface PredictionShareParams {
  div: DivisionCode;
  home: string;
  away: string;
  homeWinPct?: number;
}

export interface TeamShareParams {
  div: DivisionCode;
  team: string;
  position?: number;
  points?: number;
}

export interface StandingsShareParams {
  div: DivisionCode;
  topTeam?: string;
}

export interface SimulationShareParams {
  div: DivisionCode;
  winner?: string;
  titlePct?: number;
}

/**
 * Get the base URL for the application
 * Uses window.location in browser, falls back to localhost in SSR
 */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}`;
  }
  return 'http://localhost:3000';
}

/**
 * Generate shareable URL for a match prediction
 * Format: /share/predict/[div]/[home]/vs/[away]
 */
export function generatePredictionShareUrl(params: PredictionShareParams): string {
  const { div, home, away } = params;
  const encodedHome = encodeURIComponent(home);
  const encodedAway = encodeURIComponent(away);
  return `${getBaseUrl()}/share/predict/${div}/${encodedHome}/vs/${encodedAway}`;
}

/**
 * Generate share data for a match prediction
 */
export function generatePredictionShareData(params: PredictionShareParams): ShareData {
  const { home, away, homeWinPct } = params;
  const url = generatePredictionShareUrl(params);

  let title = `${home} vs ${away} - Pool League Pro`;
  let text = `Check out the prediction for ${home} vs ${away}`;

  if (homeWinPct !== undefined) {
    title = `${home} ${homeWinPct}% to beat ${away}`;
    text = `Pool League Pro predicts ${home} has a ${homeWinPct}% chance to beat ${away}`;
  }

  return { title, text, url };
}

/**
 * Generate shareable URL for a team page
 * Format: /share/team/[div]/[team]
 */
export function generateTeamShareUrl(params: TeamShareParams): string {
  const { div, team } = params;
  const encodedTeam = encodeURIComponent(team);
  return `${getBaseUrl()}/share/team/${div}/${encodedTeam}`;
}

/**
 * Generate share data for a team page
 */
export function generateTeamShareData(params: TeamShareParams): ShareData {
  const { team, position, points } = params;
  const url = generateTeamShareUrl(params);

  let title = `${team} - Pool League Pro`;
  let text = `Check out ${team}'s stats and performance`;

  if (position !== undefined && points !== undefined) {
    title = `${team} - ${position}${getOrdinalSuffix(position)} with ${points} pts`;
    text = `${team} is in ${position}${getOrdinalSuffix(position)} place with ${points} points`;
  } else if (position !== undefined) {
    title = `${team} - ${position}${getOrdinalSuffix(position)} place`;
    text = `${team} is in ${position}${getOrdinalSuffix(position)} place`;
  }

  return { title, text, url };
}

/**
 * Generate shareable URL for standings
 * Format: /share/standings/[div]
 */
export function generateStandingsShareUrl(params: StandingsShareParams): string {
  const { div } = params;
  return `${getBaseUrl()}/share/standings/${div}`;
}

/**
 * Generate share data for standings
 */
export function generateStandingsShareData(params: StandingsShareParams): ShareData {
  const { div, topTeam } = params;
  const url = generateStandingsShareUrl(params);

  let title = `${div} Standings - Pool League Pro`;
  let text = `Check out the latest ${div} standings`;

  if (topTeam) {
    title = `${div} Standings - ${topTeam} leads`;
    text = `${topTeam} leads the ${div} standings`;
  }

  return { title, text, url };
}

/**
 * Generate shareable URL for simulation results
 * Format: /share/simulation/[div]
 */
export function generateSimulationShareUrl(params: SimulationShareParams): string {
  const { div } = params;
  return `${getBaseUrl()}/share/simulation/${div}`;
}

/**
 * Generate share data for simulation results
 */
export function generateSimulationShareData(params: SimulationShareParams): ShareData {
  const { div, winner, titlePct } = params;
  const url = generateSimulationShareUrl(params);

  let title = `${div} Season Simulation - Pool League Pro`;
  let text = `Check out the ${div} season simulation results`;

  if (winner && titlePct !== undefined) {
    title = `${winner} ${titlePct}% to win ${div}`;
    text = `Season simulation predicts ${winner} has a ${titlePct}% chance to win ${div}`;
  } else if (winner) {
    title = `${winner} favored to win ${div}`;
    text = `Season simulation predicts ${winner} to win ${div}`;
  }

  return { title, text, url };
}

/**
 * Helper function to get ordinal suffix for numbers (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/**
 * Check if Web Share API is available
 */
export function canUseWebShare(): boolean {
  if (typeof navigator === 'undefined') return false;
  return 'share' in navigator && 'canShare' in navigator;
}

/**
 * Share using Web Share API (fallback to clipboard if not available)
 */
export async function shareContent(data: ShareData): Promise<'shared' | 'copied' | 'failed'> {
  // Try Web Share API first (mobile browsers)
  if (canUseWebShare() && navigator.canShare(data)) {
    try {
      await navigator.share(data);
      return 'shared';
    } catch (err) {
      // User cancelled or error occurred, fall through to clipboard
      if ((err as Error).name === 'AbortError') {
        return 'failed';
      }
    }
  }

  // Fallback: copy URL to clipboard
  try {
    await navigator.clipboard.writeText(data.url);
    return 'copied';
  } catch (err) {
    return 'failed';
  }
}
