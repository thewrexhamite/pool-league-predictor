import { Resend } from 'resend';
import { render } from '@react-email/components';
import React from 'react';
import { MatchResultsEmail } from './email-templates/MatchResultsEmail';
import { UpcomingFixturesEmail } from './email-templates/UpcomingFixturesEmail';
import { WeeklyDigestEmail } from './email-templates/WeeklyDigestEmail';

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  throw new Error('RESEND_API_KEY environment variable is not set');
}

/**
 * Resend client instance for sending emails
 * Initialized with API key from environment variables
 */
export const resend = new Resend(resendApiKey);

/**
 * Check if email service is configured
 * @returns true if Resend API key is set
 */
export function isEmailConfigured(): boolean {
  return !!resendApiKey;
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
  const response = await resend.emails.send({
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
