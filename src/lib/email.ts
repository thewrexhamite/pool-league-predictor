import { Resend } from 'resend';

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
