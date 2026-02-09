import { Resend } from 'resend';
import { render } from '@react-email/components';
import React from 'react';
import { MatchResultsEmail } from './email-templates/MatchResultsEmail';
import { UpcomingFixturesEmail } from './email-templates/UpcomingFixturesEmail';
import { WeeklyDigestEmail } from './email-templates/WeeklyDigestEmail';

/**
 * Get the Resend API key, throwing if not set (lazy initialization)
 */
function getResendApiKey(): string {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error('RESEND_API_KEY environment variable is not set');
  }
  return key;
}

let _resend: Resend | null = null;

/**
 * Resend client instance for sending emails
 * Lazily initialized with API key from environment variables
 */
export function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(getResendApiKey());
  }
  return _resend;
}

/** @deprecated Use getResend() instead */
export const resend = { get instance() { return getResend(); } };

/**
 * Check if email service is configured
 * @returns true if Resend API key is set
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Generate an unsubscribe URL for a user
 * @param userId The user ID to unsubscribe
 * @param baseUrl The base URL of the application (defaults to production URL)
 * @returns The complete unsubscribe URL
 */
export function generateUnsubscribeUrl(userId: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://poolleaguepredictor.com';
  return `${base}/unsubscribe?userId=${encodeURIComponent(userId)}`;
}

/**
 * Email template types and their corresponding props
 */
export type EmailTemplate =
  | { type: 'match-results'; props: React.ComponentProps<typeof MatchResultsEmail> }
  | { type: 'upcoming-fixtures'; props: React.ComponentProps<typeof UpcomingFixturesEmail> }
  | { type: 'weekly-digest'; props: React.ComponentProps<typeof WeeklyDigestEmail> };

/**
 * Send an email using a specific template
 * @param to Recipient email address
 * @param subject Email subject line
 * @param template Email template configuration with type and props
 * @returns Promise that resolves to the Resend API response
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  template: EmailTemplate
) {
  // Render the appropriate template to HTML
  let html: string;

  switch (template.type) {
    case 'match-results':
      html = await render(React.createElement(MatchResultsEmail, template.props));
      break;
    case 'upcoming-fixtures':
      html = await render(React.createElement(UpcomingFixturesEmail, template.props));
      break;
    case 'weekly-digest':
      html = await render(React.createElement(WeeklyDigestEmail, template.props));
      break;
    default:
      throw new Error(`Unknown email template type: ${(template as any).type}`);
  }

  // Send email using Resend
  const response = await getResend().emails.send({
    from: 'Pool League Predictor <notifications@poolleaguepredictor.com>',
    to,
    subject,
    html,
  });

  return response;
}

/**
 * Send a match results email notification
 */
export async function sendMatchResultsEmail(
  to: string | string[],
  props: Omit<React.ComponentProps<typeof MatchResultsEmail>, 'unsubscribeUrl'> & { unsubscribeUrl?: string }
) {
  return sendEmail(
    to,
    `Match Result: ${props.homeTeam} vs ${props.awayTeam}`,
    { type: 'match-results', props }
  );
}

/**
 * Send an upcoming fixtures email notification
 */
export async function sendUpcomingFixturesEmail(
  to: string | string[],
  props: Omit<React.ComponentProps<typeof UpcomingFixturesEmail>, 'unsubscribeUrl'> & { unsubscribeUrl?: string }
) {
  const fixtureCount = props.fixtures.length;
  const subject = fixtureCount === 1
    ? `Upcoming Match: ${props.fixtures[0].homeTeam} vs ${props.fixtures[0].awayTeam}`
    : `${fixtureCount} Upcoming Fixtures`;

  return sendEmail(to, subject, { type: 'upcoming-fixtures', props });
}

/**
 * Send a weekly digest email
 */
export async function sendWeeklyDigestEmail(
  to: string | string[],
  props: Omit<React.ComponentProps<typeof WeeklyDigestEmail>, 'unsubscribeUrl'> & { unsubscribeUrl?: string }
) {
  return sendEmail(
    to,
    `Your Weekly Pool League Digest`,
    { type: 'weekly-digest', props }
  );
}
