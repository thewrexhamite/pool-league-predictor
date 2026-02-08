/**
 * Sync error notification functions
 *
 * Sends alerts when sync operations fail, enabling monitoring and quick response
 * to data freshness issues.
 */

/**
 * Format sync error information for notifications
 */
export interface SyncErrorInfo {
  league: string;
  error: string;
  timestamp: string;
  context?: {
    results?: number;
    fixtures?: number;
    frames?: number;
    players?: number;
  };
}

/**
 * Send notification when sync operation fails
 *
 * @param error - The error that occurred during sync (Error object or string message)
 * @param league - The league identifier that failed to sync
 * @param context - Optional additional context about the sync operation
 *
 * @remarks
 * MVP implementation: Logs errors to console for visibility in Vercel logs.
 * Future enhancement: Integrate with email service (Resend, SendGrid, etc.)
 * to send alerts to developer email address.
 */
export async function sendSyncErrorNotification(
  error: Error | string,
  league: string,
  context?: SyncErrorInfo['context']
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : error;
  const timestamp = new Date().toISOString();

  const errorInfo: SyncErrorInfo = {
    league,
    error: errorMessage,
    timestamp,
    context,
  };

  // Log structured error for Vercel logs visibility
  const logTimestamp = timestamp.substring(11, 19);
  console.error(
    `[${logTimestamp}] [SYNC] [ERROR] Sync failed for league "${league}": ${errorMessage}`
  );

  if (context) {
    console.error(
      `[${logTimestamp}] [SYNC] [ERROR] Context: ${JSON.stringify(context)}`
    );
  }

  // TODO: Integrate email notifications for production monitoring
  // Example implementation with Resend:
  // const emailService = process.env.RESEND_API_KEY;
  // if (emailService) {
  //   const resend = new Resend(process.env.RESEND_API_KEY);
  //   await resend.emails.send({
  //     from: 'sync-alerts@pool-league-predictor.com',
  //     to: process.env.ADMIN_EMAIL || 'developer@example.com',
  //     subject: `[ALERT] Pool League Sync Failed - ${league}`,
  //     html: `
  //       <h2>Sync Error Alert</h2>
  //       <p><strong>League:</strong> ${errorInfo.league}</p>
  //       <p><strong>Time:</strong> ${errorInfo.timestamp}</p>
  //       <p><strong>Error:</strong> ${errorInfo.error}</p>
  //       ${context ? `<p><strong>Context:</strong> ${JSON.stringify(context, null, 2)}</p>` : ''}
  //       <p>Check Vercel logs for full details.</p>
  //     `,
  //   });
  // }

  // For now, just ensure the error is logged
  return Promise.resolve();
}

/**
 * Send notification when sync completes with partial failures
 *
 * @param failures - Array of leagues that failed to sync
 * @param successes - Array of leagues that synced successfully
 *
 * @remarks
 * Useful for scheduled cron jobs that sync multiple leagues, where some
 * may succeed and others fail. Alerts developer to partial outages.
 */
export async function sendPartialSyncFailureNotification(
  failures: Array<{ league: string; error: string }>,
  successes: string[]
): Promise<void> {
  const timestamp = new Date().toISOString().substring(11, 19);

  console.error(
    `[${timestamp}] [SYNC] [WARN] Partial sync failure: ${failures.length} failed, ${successes.length} succeeded`
  );

  failures.forEach(({ league, error }) => {
    console.error(`[${timestamp}] [SYNC] [WARN] - ${league}: ${error}`);
  });

  // TODO: Send email with summary of partial failures
  // Similar to sendSyncErrorNotification but with aggregated failure information

  return Promise.resolve();
}
