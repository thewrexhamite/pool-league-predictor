import type { Fixture } from './types';

/**
 * Calendar Export Utility
 *
 * Generates iCalendar (RFC 5545) format files for pool league fixtures.
 * Compatible with Google Calendar, Apple Calendar, and other iCal-compliant apps.
 */

/**
 * Format a date string (DD-MM-YYYY) to iCalendar format (YYYYMMDD)
 */
function formatDateForICal(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: ${dateStr}. Expected DD-MM-YYYY`);
  }
  const [day, month, year] = parts;
  return `${year}${month}${day}`;
}

/**
 * Generate a unique identifier for an event
 */
function generateEventUID(fixture: Fixture, index: number): string {
  const dateStr = formatDateForICal(fixture.date);
  const homeSlug = fixture.home.replace(/\s+/g, '-').toLowerCase();
  const awaySlug = fixture.away.replace(/\s+/g, '-').toLowerCase();
  return `${dateStr}-${homeSlug}-vs-${awaySlug}-${index}@pool-league-predictor`;
}

/**
 * Get current timestamp in iCalendar format (YYYYMMDDTHHMMSSZ)
 */
function getCurrentTimestamp(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Escape special characters in iCalendar text fields
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Fold lines longer than 75 octets as per RFC 5545 section 3.1
 */
function foldLine(line: string): string {
  if (line.length <= 75) {
    return line;
  }
  const result: string[] = [];
  let currentLine = line.substring(0, 75);
  let remaining = line.substring(75);
  result.push(currentLine);

  while (remaining.length > 0) {
    const chunk = remaining.substring(0, 74); // 74 because we add a space
    result.push(' ' + chunk);
    remaining = remaining.substring(74);
  }

  return result.join('\r\n');
}

/**
 * Generate iCalendar format string for pool league fixtures
 *
 * @param fixtures - Array of fixtures to include in the calendar
 * @param teamName - Optional team name to filter fixtures (only include matches with this team)
 * @returns iCalendar format string (RFC 5545 compliant)
 *
 * @example
 * ```ts
 * const fixtures = [
 *   { date: '15-01-2026', home: 'Team A', away: 'Team B', division: 'SD1' },
 *   { date: '22-01-2026', home: 'Team B', away: 'Team C', division: 'SD1' }
 * ];
 * const ical = generateICalendar(fixtures, 'Team A');
 * // Returns .ics file content that can be imported into any calendar app
 * ```
 */
export function generateICalendar(fixtures: Fixture[], teamName?: string): string {
  const timestamp = getCurrentTimestamp();

  // Filter fixtures by team if specified
  const filteredFixtures = teamName
    ? fixtures.filter(f => f.home === teamName || f.away === teamName)
    : fixtures;

  // Build iCalendar header
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pool League Predictor//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    foldLine(`X-WR-CALNAME:${escapeICalText(teamName ? `${teamName} Fixtures` : 'Pool League Fixtures')}`),
    'X-WR-TIMEZONE:Europe/London',
    foldLine(`X-WR-CALDESC:${escapeICalText(teamName ? `Fixtures for ${teamName}` : 'All pool league fixtures')}`),
  ];

  // Add each fixture as a VEVENT
  filteredFixtures.forEach((fixture, index) => {
    const eventDate = formatDateForICal(fixture.date);
    const uid = generateEventUID(fixture, index);
    const summary = `${fixture.home} vs ${fixture.away}`;
    const description = `Pool League Match\\nDivision: ${fixture.division}\\nHome: ${fixture.home}\\nAway: ${fixture.away}`;

    lines.push('BEGIN:VEVENT');
    lines.push(foldLine(`UID:${uid}`));
    lines.push(`DTSTAMP:${timestamp}`);
    lines.push(`DTSTART;VALUE=DATE:${eventDate}`);
    lines.push(foldLine(`SUMMARY:${escapeICalText(summary)}`));
    lines.push(foldLine(`DESCRIPTION:${description}`));
    lines.push(foldLine(`LOCATION:${escapeICalText(fixture.home)}`)); // Assume home team's venue
    lines.push('STATUS:CONFIRMED');
    lines.push('TRANSP:OPAQUE');
    lines.push('END:VEVENT');
  });

  // Close calendar
  lines.push('END:VCALENDAR');

  // Join with CRLF as per RFC 5545
  return lines.join('\r\n') + '\r\n';
}

/**
 * Trigger a browser download of the iCalendar file
 *
 * @param icalContent - iCalendar format string
 * @param filename - Name for the downloaded file (without .ics extension)
 */
export function downloadICalendar(icalContent: string, filename: string = 'fixtures'): void {
  const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
