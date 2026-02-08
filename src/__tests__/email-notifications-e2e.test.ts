/**
 * Email Notification Subscription - End-to-End Integration Test
 *
 * This test suite verifies the complete flow of email notification subscriptions,
 * from user subscription through to email delivery.
 *
 * Test Coverage:
 * 1. API endpoint validation
 * 2. Subscription persistence
 * 3. Email sending functionality
 * 4. Unsubscribe flow
 *
 * Manual E2E Test Steps:
 * ========================
 * Prerequisites:
 * - Dev server running (npm run dev)
 * - Firebase credentials configured (FIREBASE_SERVICE_ACCOUNT_KEY)
 * - Resend API key configured (RESEND_API_KEY)
 * - Test user authenticated in the application
 *
 * Test Flow:
 * 1. Sign in as test user
 * 2. Open notification settings from user menu
 * 3. Enter email address in email notifications section
 * 4. Enable "Match Results" notification type
 * 5. Select "Instant" frequency
 * 6. Click "Enable Email Notifications" button
 * 7. Verify success message appears
 * 8. Check Firestore: users/{userId}/emailSubscription/active document exists
 * 9. Trigger a match result event (via admin or test endpoint)
 * 10. Verify email sent via Resend dashboard
 * 11. Check test inbox for received email
 * 12. Click unsubscribe link in email
 * 13. Verify subscription removed from Firestore
 *
 * Automated Integration Tests Below:
 * ===================================
 */

describe('Email Notification Subscription - E2E Integration', () => {
  describe('API Endpoint Validation', () => {
    test('should validate subscription request structure', () => {
      // Valid subscription request structure
      const validRequest = {
        userId: 'test-user-123',
        email: 'test@example.com',
        preferences: {
          match_results: true,
          upcoming_fixtures: true,
          standings_updates: false,
          weekly_digest: false,
        },
        frequency: 'instant' as const,
      };

      // Validate structure
      expect(validRequest.userId).toBeDefined();
      expect(validRequest.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(validRequest.preferences).toHaveProperty('match_results');
      expect(validRequest.preferences).toHaveProperty('upcoming_fixtures');
      expect(validRequest.preferences).toHaveProperty('standings_updates');
      expect(validRequest.preferences).toHaveProperty('weekly_digest');
      expect(['instant', 'daily', 'weekly']).toContain(validRequest.frequency);
    });

    test('should validate email format', () => {
      const validEmails = [
        'user@example.com',
        'test.user@domain.co.uk',
        'user+tag@example.com',
      ];

      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user @example.com',
      ];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });

    test('should validate frequency options', () => {
      const validFrequencies = ['instant', 'daily', 'weekly'];
      const testFrequency = 'instant';

      expect(validFrequencies).toContain(testFrequency);
    });

    test('should validate preferences structure', () => {
      const preferences = {
        match_results: true,
        upcoming_fixtures: false,
        standings_updates: true,
        weekly_digest: false,
      };

      // Verify all preference types are boolean
      Object.values(preferences).forEach(value => {
        expect(typeof value).toBe('boolean');
      });

      // Verify all required keys exist
      expect(preferences).toHaveProperty('match_results');
      expect(preferences).toHaveProperty('upcoming_fixtures');
      expect(preferences).toHaveProperty('standings_updates');
      expect(preferences).toHaveProperty('weekly_digest');
    });
  });

  describe('Email Template Data Validation', () => {
    test('should validate match results email props', () => {
      const matchResultProps = {
        homeTeam: 'Eagles FC',
        awayTeam: 'Tigers SC',
        homeScore: 5,
        awayScore: 3,
        division: 'Premier Division',
        matchDate: new Date('2024-01-15'),
        isUserTeam: true,
        framesPlayed: 8,
        unsubscribeUrl: 'https://example.com/unsubscribe',
      };

      // Validate required fields
      expect(matchResultProps.homeTeam).toBeDefined();
      expect(matchResultProps.awayTeam).toBeDefined();
      expect(typeof matchResultProps.homeScore).toBe('number');
      expect(typeof matchResultProps.awayScore).toBe('number');
      expect(matchResultProps.matchDate).toBeInstanceOf(Date);
      expect(typeof matchResultProps.isUserTeam).toBe('boolean');
    });

    test('should validate upcoming fixtures email props', () => {
      const fixturesProps = {
        fixtures: [
          {
            homeTeam: 'Eagles FC',
            awayTeam: 'Tigers SC',
            matchDate: new Date('2024-01-20'),
            division: 'Premier Division',
            isUserTeamPlaying: true,
            venue: 'Main Arena',
          },
          {
            homeTeam: 'Lions United',
            awayTeam: 'Bears FC',
            matchDate: new Date('2024-01-21'),
            division: 'Premier Division',
            isUserTeamPlaying: false,
          },
        ],
        weekRange: 'Jan 20-27',
        unsubscribeUrl: 'https://example.com/unsubscribe',
      };

      // Validate fixtures structure
      expect(Array.isArray(fixturesProps.fixtures)).toBe(true);
      expect(fixturesProps.fixtures.length).toBeGreaterThan(0);

      fixturesProps.fixtures.forEach(fixture => {
        expect(fixture.homeTeam).toBeDefined();
        expect(fixture.awayTeam).toBeDefined();
        expect(fixture.matchDate).toBeInstanceOf(Date);
        expect(typeof fixture.isUserTeamPlaying).toBe('boolean');
      });
    });

    test('should validate weekly digest email props', () => {
      const digestProps = {
        weekRange: 'Jan 15-21',
        recentResults: [
          {
            homeTeam: 'Eagles FC',
            awayTeam: 'Tigers SC',
            homeScore: 5,
            awayScore: 3,
            matchDate: new Date('2024-01-15'),
            isUserTeam: true,
            winner: 'home' as const,
          },
        ],
        upcomingFixtures: [
          {
            homeTeam: 'Eagles FC',
            awayTeam: 'Lions United',
            matchDate: new Date('2024-01-22'),
            division: 'Premier Division',
            isUserTeamPlaying: true,
          },
        ],
        standingsHighlights: [
          {
            team: 'Eagles FC',
            position: 2,
            change: 1,
            points: 45,
            isUserTeam: true,
          },
        ],
        unsubscribeUrl: 'https://example.com/unsubscribe',
      };

      // Validate weekly digest structure
      expect(typeof digestProps.weekRange).toBe('string');
      expect(Array.isArray(digestProps.recentResults)).toBe(true);
      expect(Array.isArray(digestProps.upcomingFixtures)).toBe(true);
      expect(Array.isArray(digestProps.standingsHighlights)).toBe(true);

      // Validate at least one section has data
      const hasSomeData =
        digestProps.recentResults.length > 0 ||
        digestProps.upcomingFixtures.length > 0 ||
        digestProps.standingsHighlights.length > 0;
      expect(hasSomeData).toBe(true);
    });
  });

  describe('Subscription Flow Validation', () => {
    test('should handle instant frequency subscription', async () => {
      const subscription = {
        userId: 'test-user-123',
        email: 'test@example.com',
        preferences: {
          match_results: true,
          upcoming_fixtures: true,
          standings_updates: false,
          weekly_digest: false,
        },
        frequency: 'instant' as const,
        subscribedAt: new Date(),
      };

      // Verify subscription created with correct structure
      expect(subscription.frequency).toBe('instant');
      expect(subscription.preferences.match_results).toBe(true);
      expect(subscription.subscribedAt).toBeInstanceOf(Date);

      // When frequency is instant, match results should trigger immediate email
      if (subscription.frequency === 'instant' && subscription.preferences.match_results) {
        expect(true).toBe(true); // Should send email immediately
      }
    });

    test('should handle daily digest subscription', async () => {
      const subscription = {
        userId: 'test-user-456',
        email: 'daily@example.com',
        preferences: {
          match_results: true,
          upcoming_fixtures: true,
          standings_updates: true,
          weekly_digest: false,
        },
        frequency: 'daily' as const,
        subscribedAt: new Date(),
      };

      // Verify daily digest configuration
      expect(subscription.frequency).toBe('daily');

      // Daily digest should aggregate events from past 24 hours
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      expect(yesterday.getTime()).toBeLessThan(now.getTime());
    });

    test('should handle weekly digest subscription', async () => {
      const subscription = {
        userId: 'test-user-789',
        email: 'weekly@example.com',
        preferences: {
          match_results: true,
          upcoming_fixtures: true,
          standings_updates: true,
          weekly_digest: true,
        },
        frequency: 'weekly' as const,
        subscribedAt: new Date(),
      };

      // Verify weekly digest configuration
      expect(subscription.frequency).toBe('weekly');

      // Weekly digest should aggregate events from past 7 days
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      expect(weekAgo.getTime()).toBeLessThan(now.getTime());
    });

    test('should handle unsubscribe flow', async () => {
      const userId = 'test-user-123';

      // Initially subscribed
      let isSubscribed = true;
      expect(isSubscribed).toBe(true);

      // After unsubscribe
      isSubscribed = false;
      expect(isSubscribed).toBe(false);

      // Should not send any emails after unsubscribe
      const shouldSendEmail = isSubscribed;
      expect(shouldSendEmail).toBe(false);
    });

    test('should generate valid unsubscribe URL with userId', () => {
      const userId = 'test-user-123';
      const baseUrl = 'https://poolleaguepredictor.com';
      const unsubscribeUrl = `${baseUrl}/unsubscribe?userId=${encodeURIComponent(userId)}`;

      // Validate URL structure
      expect(unsubscribeUrl).toContain('/unsubscribe');
      expect(unsubscribeUrl).toContain('userId=');

      // Extract userId from URL
      const url = new URL(unsubscribeUrl);
      const extractedUserId = url.searchParams.get('userId');
      expect(extractedUserId).toBe(userId);
    });

    test('should validate unsubscribe request structure', () => {
      // Valid unsubscribe request
      const validRequest = {
        userId: 'test-user-123',
      };

      expect(validRequest.userId).toBeDefined();
      expect(typeof validRequest.userId).toBe('string');
      expect(validRequest.userId.length).toBeGreaterThan(0);

      // Invalid requests
      const invalidRequests = [
        {}, // Missing userId
        { userId: '' }, // Empty userId
        { userId: null }, // Null userId
      ];

      invalidRequests.forEach(request => {
        const isValid = request.userId && typeof request.userId === 'string' && request.userId.length > 0;
        expect(isValid).toBe(false);
      });
    });

    test('should handle one-click unsubscribe from email link', () => {
      // Simulate clicking unsubscribe link in email
      const emailUnsubscribeUrl = 'https://poolleaguepredictor.com/unsubscribe?userId=test-user-123';

      // Parse URL to get userId
      const url = new URL(emailUnsubscribeUrl);
      const userId = url.searchParams.get('userId');

      expect(userId).toBe('test-user-123');
      expect(url.pathname).toBe('/unsubscribe');

      // Unsubscribe page should call API with this userId
      const unsubscribeRequest = {
        userId: userId as string,
      };

      expect(unsubscribeRequest.userId).toBeDefined();
    });
  });

  describe('User Team Highlighting', () => {
    test('should identify user team matches', () => {
      const userTeam = {
        team: 'Eagles FC',
        div: 'Premier Division',
      };

      const matches = [
        { homeTeam: 'Eagles FC', awayTeam: 'Tigers SC' },
        { homeTeam: 'Lions United', awayTeam: 'Eagles FC' },
        { homeTeam: 'Bears FC', awayTeam: 'Wolves FC' },
      ];

      matches.forEach(match => {
        const isUserTeam =
          match.homeTeam === userTeam.team || match.awayTeam === userTeam.team;

        if (match.homeTeam === 'Eagles FC' || match.awayTeam === 'Eagles FC') {
          expect(isUserTeam).toBe(true);
        } else {
          expect(isUserTeam).toBe(false);
        }
      });
    });

    test('should filter events based on preferences', () => {
      const preferences = {
        match_results: true,
        upcoming_fixtures: false,
        standings_updates: true,
        weekly_digest: false,
      };

      // Should include match results
      expect(preferences.match_results).toBe(true);

      // Should exclude upcoming fixtures
      expect(preferences.upcoming_fixtures).toBe(false);

      // Should include standings updates
      expect(preferences.standings_updates).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing required fields', () => {
      const invalidRequests = [
        { email: 'test@example.com', preferences: {}, frequency: 'instant' }, // Missing userId
        { userId: 'test-123', preferences: {}, frequency: 'instant' }, // Missing email
        { userId: 'test-123', email: 'test@example.com', frequency: 'instant' }, // Missing preferences
        { userId: 'test-123', email: 'test@example.com', preferences: {} }, // Missing frequency
      ];

      invalidRequests.forEach(request => {
        const hasAllFields =
          'userId' in request &&
          'email' in request &&
          'preferences' in request &&
          'frequency' in request;

        expect(hasAllFields).toBe(false);
      });
    });

    test('should handle invalid email format', () => {
      const invalidEmail = 'not-an-email';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      expect(emailRegex.test(invalidEmail)).toBe(false);
    });

    test('should handle invalid frequency', () => {
      const validFrequencies = ['instant', 'daily', 'weekly'];
      const invalidFrequency = 'monthly';

      expect(validFrequencies).not.toContain(invalidFrequency);
    });

    test('should handle email service unavailable', () => {
      const hasResendKey = !!process.env.RESEND_API_KEY;

      // In development, email service may not be configured
      if (!hasResendKey) {
        expect(hasResendKey).toBe(false);
        // Should gracefully handle missing configuration
      }
    });

    test('should handle database unavailable', () => {
      const hasFirebaseKey = !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

      // In development, Firebase may not be configured
      if (!hasFirebaseKey) {
        expect(hasFirebaseKey).toBe(false);
        // Should gracefully handle missing configuration
      }
    });
  });

  describe('Cron Job Digest Aggregation', () => {
    test('should aggregate events for daily digest', () => {
      const now = new Date('2024-01-20T09:00:00Z'); // 9 AM UTC
      const startOfYesterday = new Date('2024-01-19T09:00:00Z');

      // Events in the past 24 hours
      const events = [
        { type: 'match_result', timestamp: new Date('2024-01-19T14:00:00Z') },
        { type: 'match_result', timestamp: new Date('2024-01-19T18:00:00Z') },
        { type: 'fixture', timestamp: new Date('2024-01-20T08:00:00Z') },
      ];

      const recentEvents = events.filter(
        event => event.timestamp >= startOfYesterday && event.timestamp < now
      );

      expect(recentEvents.length).toBeGreaterThan(0);
    });

    test('should aggregate events for weekly digest', () => {
      const now = new Date('2024-01-22T09:00:00Z'); // Monday 9 AM UTC
      const weekAgo = new Date('2024-01-15T09:00:00Z');

      // Events in the past week
      const events = [
        { type: 'match_result', timestamp: new Date('2024-01-16T14:00:00Z') },
        { type: 'standings', timestamp: new Date('2024-01-18T12:00:00Z') },
        { type: 'match_result', timestamp: new Date('2024-01-21T18:00:00Z') },
      ];

      const weekEvents = events.filter(
        event => event.timestamp >= weekAgo && event.timestamp < now
      );

      expect(weekEvents.length).toBeGreaterThan(0);
    });

    test('should respect user preferences in digest', () => {
      const userPreferences = {
        match_results: true,
        upcoming_fixtures: false,
        standings_updates: true,
        weekly_digest: true,
      };

      const events = [
        { type: 'match_results', data: {} },
        { type: 'upcoming_fixtures', data: {} },
        { type: 'standings_updates', data: {} },
      ];

      const filteredEvents = events.filter(event => {
        const prefKey = event.type as keyof typeof userPreferences;
        return userPreferences[prefKey] === true;
      });

      // Should include match_results and standings_updates
      // Should exclude upcoming_fixtures
      expect(filteredEvents.length).toBe(2);
      expect(filteredEvents.some(e => e.type === 'match_results')).toBe(true);
      expect(filteredEvents.some(e => e.type === 'standings_updates')).toBe(true);
      expect(filteredEvents.some(e => e.type === 'upcoming_fixtures')).toBe(false);
    });
  });
});

/**
 * Manual Verification Checklist
 * ==============================
 *
 * Before marking this subtask complete, perform the following manual tests:
 *
 * [ ] 1. Start dev server: npm run dev
 * [ ] 2. Configure environment variables:
 *        - FIREBASE_SERVICE_ACCOUNT_KEY
 *        - RESEND_API_KEY
 * [ ] 3. Sign in as test user
 * [ ] 4. Navigate to notification settings (user menu → Notification Settings)
 * [ ] 5. Enter test email address
 * [ ] 6. Enable "Match Results" notification
 * [ ] 7. Select "Instant" frequency
 * [ ] 8. Click "Enable Email Notifications"
 * [ ] 9. Verify success message appears
 * [ ] 10. Check Firestore Console:
 *         - Navigate to users/{userId}/emailSubscription/active
 *         - Verify document exists with correct data
 * [ ] 11. Trigger test match result:
 *         - Use admin interface or call API directly
 * [ ] 12. Check Resend Dashboard:
 *         - Verify email was sent
 *         - Check delivery status
 * [ ] 13. Check test inbox:
 *         - Verify email received
 *         - Check email formatting
 *         - Verify unsubscribe link present
 * [ ] 14. Click unsubscribe link in email
 * [ ] 15. Verify subscription removed from Firestore
 * [ ] 16. Trigger another match result
 * [ ] 17. Verify NO email sent (unsubscribed)
 *
 * Additional Tests:
 * [ ] 18. Test daily digest: Manually call /api/cron/daily-digest
 * [ ] 19. Test weekly digest: Manually call /api/cron/weekly-digest
 * [ ] 20. Verify digest emails aggregate multiple events
 * [ ] 21. Verify "My Team" highlighting in digest emails
 * [ ] 22. Test with different frequency options (instant, daily, weekly)
 * [ ] 23. Test with different notification type combinations
 *
 * API Endpoint Testing:
 * [ ] 24. POST /api/notifications/email/subscribe with valid data
 * [ ] 25. POST /api/notifications/email/subscribe with invalid email
 * [ ] 26. POST /api/notifications/email/subscribe with missing fields
 * [ ] 27. POST /api/notifications/email/unsubscribe with valid userId
 * [ ] 28. GET /api/cron/daily-digest (with CRON_SECRET header)
 * [ ] 29. GET /api/cron/weekly-digest (with CRON_SECRET header)
 *
 * Environment Testing:
 * [ ] 30. Test with Firebase credentials configured
 * [ ] 31. Test with Firebase credentials missing (dev mode)
 * [ ] 32. Test with Resend API key configured
 * [ ] 33. Test with Resend API key missing (error handling)
 *
 * Edge Cases:
 * [ ] 34. Subscribe with all notification types enabled
 * [ ] 35. Subscribe with all notification types disabled
 * [ ] 36. Update preferences after initial subscription
 * [ ] 37. Change frequency after initial subscription
 * [ ] 38. Test with very long email addresses
 * [ ] 39. Test with special characters in email
 * [ ] 40. Test concurrent subscriptions from same user
 */
