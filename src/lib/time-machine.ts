import type {
  MatchResult,
  FrameData,
  Players2526Map,
  PlayerTeamStats2526,
  PlayerData2526,
} from './types';
import { parseDate, type DataSources } from './predictions';
import type { LeagueData } from './data-provider';

/**
 * Reconstruct Players2526Map from frame data up to a cutoff date.
 * Since cumulative player stats aren't date-stamped, we rebuild them
 * from individual frame results.
 */
export function reconstructPlayerStats(
  frames: FrameData[],
  cutoffDate: string // YYYY-MM-DD normalised
): Players2526Map {
  const filtered = frames.filter(f => parseDate(f.date) <= cutoffDate);

  // Track per-player per-team stats
  const playerTeamStats: Record<string, Record<string, {
    team: string;
    div: string;
    p: number;
    w: number;
    bdF: number;
    bdA: number;
    forf: number;
    lag: number;
    cup: boolean;
  }>> = {};

  // Track which teams each player is on from the frames
  for (const match of filtered) {
    for (const f of match.frames) {
      // Home player
      const homeKey = f.homePlayer + '|' + match.home;
      if (!playerTeamStats[f.homePlayer]) playerTeamStats[f.homePlayer] = {};
      if (!playerTeamStats[f.homePlayer][homeKey]) {
        playerTeamStats[f.homePlayer][homeKey] = {
          team: match.home,
          div: match.division,
          p: 0, w: 0, bdF: 0, bdA: 0, forf: 0, lag: 0, cup: false,
        };
      }
      const hStats = playerTeamStats[f.homePlayer][homeKey];
      hStats.p++;
      if (f.winner === 'home') hStats.w++;
      if (f.breakDish && f.winner === 'home') hStats.bdF++;
      if (f.breakDish && f.winner === 'away') hStats.bdA++;
      if (f.forfeit) hStats.forf++;

      // Away player
      const awayKey = f.awayPlayer + '|' + match.away;
      if (!playerTeamStats[f.awayPlayer]) playerTeamStats[f.awayPlayer] = {};
      if (!playerTeamStats[f.awayPlayer][awayKey]) {
        playerTeamStats[f.awayPlayer][awayKey] = {
          team: match.away,
          div: match.division,
          p: 0, w: 0, bdF: 0, bdA: 0, forf: 0, lag: 0, cup: false,
        };
      }
      const aStats = playerTeamStats[f.awayPlayer][awayKey];
      aStats.p++;
      if (f.winner === 'away') aStats.w++;
      if (f.breakDish && f.winner === 'away') aStats.bdF++;
      if (f.breakDish && f.winner === 'home') aStats.bdA++;
      if (f.forfeit) aStats.forf++;
    }
  }

  // Build Players2526Map
  const result: Players2526Map = {};

  for (const [name, teamEntries] of Object.entries(playerTeamStats)) {
    const teams: PlayerTeamStats2526[] = [];
    let totalP = 0;
    let totalW = 0;

    for (const entry of Object.values(teamEntries)) {
      const pct = entry.p > 0 ? (entry.w / entry.p) * 100 : 0;
      teams.push({
        team: entry.team,
        div: entry.div,
        p: entry.p,
        w: entry.w,
        pct,
        lag: entry.lag,
        bdF: entry.bdF,
        bdA: entry.bdA,
        forf: entry.forf,
        cup: entry.cup,
      });
      totalP += entry.p;
      totalW += entry.w;
    }

    const data: PlayerData2526 = {
      teams,
      total: {
        p: totalP,
        w: totalW,
        pct: totalP > 0 ? (totalW / totalP) * 100 : 0,
      },
    };

    result[name] = data;
  }

  return result;
}

/**
 * Create a filtered DataSources + frames array for the time machine.
 * All data is filtered to reflect the league as of the given cutoff date.
 */
export function createTimeMachineData(
  leagueData: LeagueData,
  cutoffDate: string // DD-MM-YYYY format
): { ds: DataSources; frames: FrameData[] } {
  const normCutoff = parseDate(cutoffDate);

  // Filter results to those on or before the cutoff
  const filteredResults = leagueData.results.filter(
    r => parseDate(r.date) <= normCutoff
  );

  // Filter frames to those on or before the cutoff
  const filteredFrames = leagueData.frames.filter(
    f => parseDate(f.date) <= normCutoff
  );

  // Reconstruct player stats from filtered frames
  const players2526 = reconstructPlayerStats(filteredFrames, normCutoff);

  return {
    ds: {
      divisions: leagueData.divisions,
      results: filteredResults,
      fixtures: leagueData.fixtures, // all fixtures — getRemainingFixtures uses latest result date
      players: leagueData.players, // previous season — static
      rosters: leagueData.rosters, // static
      players2526,
    },
    frames: filteredFrames,
  };
}

/**
 * Extract sorted unique match dates from results for the date picker.
 */
export function getAvailableMatchDates(results: MatchResult[]): string[] {
  const dates = new Set<string>();
  for (const r of results) {
    dates.add(r.date);
  }
  return [...dates].sort((a, b) => parseDate(a).localeCompare(parseDate(b)));
}
