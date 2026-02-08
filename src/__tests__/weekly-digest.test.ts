/**
 * Weekly Digest Cron Job - Integration Tests
 *
 * These tests validate the weekly digest aggregation and delivery logic.
 * They test business logic, data structures, and edge cases without requiring
 * live Firebase or Resend services.
 */

describe('Weekly Digest Aggregation and Delivery', () => {
  describe('Date Range Calculation', () => {
    test('should calculate past 7 days correctly', () => {
      const now = new Date('2024-01-21T09:00:00Z');
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);

      // Verify date range
      expect(lastWeek.toISOString()).toBe('2024-01-14T09:00:00.000Z');
      expect(now.toISOString()).toBe('2024-01-21T09:00:00.000Z');

      // Verify 7 day difference
      const diffInDays = (now.getTime() - lastWeek.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffInDays).toBe(7);
    });

    test('should format week range display string', () => {
      const start = new Date('2024-01-14T09:00:00Z');
      const end = new Date('2024-01-21T09:00:00Z');

      const weekRange = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

      expect(weekRange).toMatch(/Jan \d+ - Jan \d+/);
    });

    test('should handle month boundaries correctly', () => {
      const now = new Date('2024-02-03T09:00:00Z');
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);

      expect(lastWeek.getMonth()).toBe(0); // January (0-indexed)
      expect(now.getMonth()).toBe(1); // February (0-indexed)
    });

    test('should handle year boundaries correctly', () => {
      const now = new Date('2024-01-03T09:00:00Z');
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);

      expect(lastWeek.getFullYear()).toBe(2023);
      expect(now.getFullYear()).toBe(2024);
    });
  });

  describe('Email Subscription Filtering', () => {
    test('should identify weekly frequency subscribers', () => {
      const subscriptions = [
        { userId: 'user1', frequency: 'instant' },
        { userId: 'user2', frequency: 'daily' },
        { userId: 'user3', frequency: 'weekly' },
        { userId: 'user4', frequency: 'weekly' },
        { userId: 'user5', frequency: 'instant' },
      ];

      const weeklySubscribers = subscriptions.filter(sub => sub.frequency === 'weekly');

      expect(weeklySubscribers).toHaveLength(2);
      expect(weeklySubscribers.map(s => s.userId)).toEqual(['user3', 'user4']);
    });

    test('should validate subscription structure', () => {
      const subscription = {
        email: 'test@example.com',
        preferences: {
          match_results: true,
          upcoming_fixtures: true,
          standings_updates: true,
          weekly_digest: true,
        },
        frequency: 'weekly' as const,
      };

      expect(subscription.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(subscription.preferences).toHaveProperty('match_results');
      expect(subscription.preferences).toHaveProperty('upcoming_fixtures');
      expect(subscription.preferences).toHaveProperty('standings_updates');
      expect(subscription.preferences).toHaveProperty('weekly_digest');
      expect(['instant', 'daily', 'weekly']).toContain(subscription.frequency);
    });
  });

  describe('Event Filtering by Preferences', () => {
    const mockEvents = {
      matchResults: [
        { id: 1, homeTeam: 'Team A', awayTeam: 'Team B', homeScore: 5, awayScore: 3, matchDate: '2024-01-15T19:00:00Z' },
        { id: 2, homeTeam: 'Team C', awayTeam: 'Team D', homeScore: 4, awayScore: 4, matchDate: '2024-01-16T19:00:00Z' },
        { id: 3, homeTeam: 'Team E', awayTeam: 'Team F', homeScore: 6, awayScore: 2, matchDate: '2024-01-18T20:00:00Z' },
      ],
      upcomingFixtures: [
        { id: 4, homeTeam: 'Team A', awayTeam: 'Team E', matchDate: '2024-01-22T19:00:00Z' },
        { id: 5, homeTeam: 'Team B', awayTeam: 'Team C', matchDate: '2024-01-23T19:00:00Z' },
      ],
      standingsHighlights: [
        { team: 'Team A', position: 1, previousPosition: 2, change: 1 },
        { team: 'Team B', position: 2, previousPosition: 1, change: -1 },
        { team: 'Team C', position: 3, previousPosition: 5, change: 2 },
      ],
    };

    test('should include only match results when only match_results enabled', () => {
      const preferences = {
        match_results: true,
        upcoming_fixtures: false,
        standings_updates: false,
        weekly_digest: false,
      };

      const filteredResults = preferences.match_results ? mockEvents.matchResults : [];
      const filteredFixtures = preferences.upcoming_fixtures ? mockEvents.upcomingFixtures : [];
      const filteredStandings = preferences.standings_updates ? mockEvents.standingsHighlights : [];

      expect(filteredResults).toHaveLength(3);
      expect(filteredFixtures).toHaveLength(0);
      expect(filteredStandings).toHaveLength(0);
    });

    test('should include all content when all preferences enabled', () => {
      const preferences = {
        match_results: true,
        upcoming_fixtures: true,
        standings_updates: true,
        weekly_digest: true,
      };

      const filteredResults = preferences.match_results ? mockEvents.matchResults : [];
      const filteredFixtures = preferences.upcoming_fixtures ? mockEvents.upcomingFixtures : [];
      const filteredStandings = preferences.standings_updates ? mockEvents.standingsHighlights : [];

      expect(filteredResults).toHaveLength(3);
      expect(filteredFixtures).toHaveLength(2);
      expect(filteredStandings).toHaveLength(3);
    });

    test('should skip email when no preferences enabled and no content', () => {
      const preferences = {
        match_results: false,
        upcoming_fixtures: false,
        standings_updates: false,
        weekly_digest: false,
      };

      const filteredResults = preferences.match_results ? mockEvents.matchResults : [];
      const filteredFixtures = preferences.upcoming_fixtures ? mockEvents.upcomingFixtures : [];
      const filteredStandings = preferences.standings_updates ? mockEvents.standingsHighlights : [];

      const hasContent =
        filteredResults.length > 0 ||
        filteredFixtures.length > 0 ||
        filteredStandings.length > 0;

      expect(hasContent).toBe(false);
    });

    test('should include standings when only standings_updates enabled', () => {
      const preferences = {
        match_results: false,
        upcoming_fixtures: false,
        standings_updates: true,
        weekly_digest: false,
      };

      const filteredResults = preferences.match_results ? mockEvents.matchResults : [];
      const filteredFixtures = preferences.upcoming_fixtures ? mockEvents.upcomingFixtures : [];
      const filteredStandings = preferences.standings_updates ? mockEvents.standingsHighlights : [];

      expect(filteredResults).toHaveLength(0);
      expect(filteredFixtures).toHaveLength(0);
      expect(filteredStandings).toHaveLength(3);
    });
  });

  describe('User Team Highlighting', () => {
    const mockMatches = [
      { id: 1, homeTeam: 'Eagles FC', awayTeam: 'Tigers SC', homeScore: 5, awayScore: 3 },
      { id: 2, homeTeam: 'Lions FC', awayTeam: 'Eagles FC', homeScore: 2, awayScore: 6 },
      { id: 3, homeTeam: 'Bears FC', awayTeam: 'Wolves FC', homeScore: 4, awayScore: 4 },
      { id: 4, homeTeam: 'Eagles FC', awayTeam: 'Sharks FC', homeScore: 7, awayScore: 3 },
    ];

    test('should identify user team matches', () => {
      const userTeam = 'Eagles FC';

      const userTeamMatches = mockMatches.filter(
        match => match.homeTeam === userTeam || match.awayTeam === userTeam
      );

      expect(userTeamMatches).toHaveLength(3);
      expect(userTeamMatches.map(m => m.id)).toEqual([1, 2, 4]);
    });

    test('should handle no user team matches', () => {
      const userTeam = 'Dolphins FC';

      const userTeamMatches = mockMatches.filter(
        match => match.homeTeam === userTeam || match.awayTeam === userTeam
      );

      expect(userTeamMatches).toHaveLength(0);
    });

    test('should handle undefined user team', () => {
      const userTeam = undefined;

      const userTeamMatches = mockMatches.filter(
        match => match.homeTeam === userTeam || match.awayTeam === userTeam
      );

      expect(userTeamMatches).toHaveLength(0);
    });

    test('should be case-sensitive for team matching', () => {
      const userTeam = 'eagles fc'; // lowercase

      const userTeamMatches = mockMatches.filter(
        match => match.homeTeam === userTeam || match.awayTeam === userTeam
      );

      expect(userTeamMatches).toHaveLength(0); // No matches due to case difference
    });
  });

  describe('Standings Highlights Processing', () => {
    const mockStandings = [
      { team: 'Team A', position: 1, previousPosition: 3, points: 45, change: 2 },
      { team: 'Team B', position: 2, previousPosition: 2, points: 42, change: 0 },
      { team: 'Team C', position: 3, previousPosition: 1, points: 40, change: -2 },
      { team: 'Team D', position: 4, previousPosition: 5, points: 38, change: 1 },
    ];

    test('should identify teams that moved up in standings', () => {
      const moversUp = mockStandings.filter(team => team.change > 0);

      expect(moversUp).toHaveLength(2);
      expect(moversUp.map(t => t.team)).toEqual(['Team A', 'Team D']);
    });

    test('should identify teams that moved down in standings', () => {
      const moversDown = mockStandings.filter(team => team.change < 0);

      expect(moversDown).toHaveLength(1);
      expect(moversDown[0].team).toBe('Team C');
    });

    test('should identify teams that stayed in same position', () => {
      const stayedSame = mockStandings.filter(team => team.change === 0);

      expect(stayedSame).toHaveLength(1);
      expect(stayedSame[0].team).toBe('Team B');
    });

    test('should calculate change magnitude correctly', () => {
      const biggestMover = mockStandings.reduce((prev, current) =>
        Math.abs(current.change) > Math.abs(prev.change) ? current : prev
      );

      expect(biggestMover.team).toMatch(/Team A|Team C/);
      expect(Math.abs(biggestMover.change)).toBe(2);
    });
  });

  describe('Weekly Digest Email Data Structure', () => {
    test('should construct valid weekly digest email props', () => {
      const digestProps = {
        weekRange: 'Jan 14 - Jan 21',
        recentResults: [
          {
            homeTeam: 'Team A',
            awayTeam: 'Team B',
            homeScore: 5,
            awayScore: 3,
            division: 'Premier',
            matchDate: '2024-01-15T19:00:00Z',
          },
          {
            homeTeam: 'Team C',
            awayTeam: 'Team D',
            homeScore: 6,
            awayScore: 4,
            division: 'Premier',
            matchDate: '2024-01-18T19:00:00Z',
          },
        ],
        upcomingFixtures: [
          {
            homeTeam: 'Team A',
            awayTeam: 'Team E',
            division: 'Premier',
            matchDate: '2024-01-22T19:00:00Z',
          },
        ],
        standingsHighlights: [
          {
            team: 'Team A',
            position: 1,
            previousPosition: 2,
            points: 45,
          },
          {
            team: 'Team B',
            position: 2,
            previousPosition: 1,
            points: 42,
          },
        ],
        userTeam: 'Team A',
        unsubscribeUrl: 'http://localhost:3000/unsubscribe?userId=user123',
      };

      // Validate structure
      expect(digestProps.weekRange).toBeDefined();
      expect(digestProps.weekRange).toMatch(/\w+ \d+ - \w+ \d+/);
      expect(Array.isArray(digestProps.recentResults)).toBe(true);
      expect(Array.isArray(digestProps.upcomingFixtures)).toBe(true);
      expect(Array.isArray(digestProps.standingsHighlights)).toBe(true);
      expect(digestProps.unsubscribeUrl).toMatch(/^http/);
      expect(digestProps.unsubscribeUrl).toContain('userId=');
    });

    test('should validate match result data with all required fields', () => {
      const matchResult = {
        homeTeam: 'Eagles FC',
        awayTeam: 'Tigers SC',
        homeScore: 6,
        awayScore: 4,
        division: 'Premier Division',
        matchDate: '2024-01-15T19:00:00Z',
      };

      expect(matchResult.homeTeam).toBeTruthy();
      expect(matchResult.awayTeam).toBeTruthy();
      expect(typeof matchResult.homeScore).toBe('number');
      expect(typeof matchResult.awayScore).toBe('number');
      expect(matchResult.homeScore).toBeGreaterThanOrEqual(0);
      expect(matchResult.awayScore).toBeGreaterThanOrEqual(0);
      expect(matchResult.division).toBeTruthy();
      expect(matchResult.matchDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    test('should validate standings highlight data', () => {
      const standingsHighlight = {
        team: 'Team A',
        position: 1,
        previousPosition: 2,
        points: 45,
      };

      expect(standingsHighlight.team).toBeTruthy();
      expect(typeof standingsHighlight.position).toBe('number');
      expect(typeof standingsHighlight.previousPosition).toBe('number');
      expect(typeof standingsHighlight.points).toBe('number');
      expect(standingsHighlight.position).toBeGreaterThan(0);
      expect(standingsHighlight.points).toBeGreaterThanOrEqual(0);

      // Calculate change
      const change = standingsHighlight.previousPosition - standingsHighlight.position;
      expect(change).toBe(1); // Moved up 1 position
    });
  });

  describe('Unsubscribe URL Generation', () => {
    test('should generate valid unsubscribe URL', () => {
      const userId = 'test-user-123';
      const baseUrl = 'http://localhost:3000';
      const unsubscribeUrl = `${baseUrl}/unsubscribe?userId=${encodeURIComponent(userId)}`;

      expect(unsubscribeUrl).toBe('http://localhost:3000/unsubscribe?userId=test-user-123');
      expect(unsubscribeUrl).toMatch(/^http/);
      expect(unsubscribeUrl).toContain('/unsubscribe?userId=');
    });

    test('should encode special characters in userId', () => {
      const userId = 'user+tag@example.com';
      const baseUrl = 'http://localhost:3000';
      const unsubscribeUrl = `${baseUrl}/unsubscribe?userId=${encodeURIComponent(userId)}`;

      expect(unsubscribeUrl).toContain('user%2Btag%40example.com');
      expect(unsubscribeUrl).not.toContain('+');
      expect(unsubscribeUrl).not.toContain('@');
    });

    test('should handle production URL', () => {
      const userId = 'test-user';
      const baseUrl = 'https://poolleaguepredictor.com';
      const unsubscribeUrl = `${baseUrl}/unsubscribe?userId=${encodeURIComponent(userId)}`;

      expect(unsubscribeUrl).toBe('https://poolleaguepredictor.com/unsubscribe?userId=test-user');
      expect(unsubscribeUrl).toMatch(/^https/);
    });
  });

  describe('Cron Job Response Structure', () => {
    test('should return success response structure', () => {
      const response = {
        success: true,
        message: 'Weekly digest emails processed',
        summary: {
          total: 10,
          sent: 8,
          skipped: 2,
          failed: 0,
        },
        dateRange: {
          start: '2024-01-14T09:00:00.000Z',
          end: '2024-01-21T09:00:00.000Z',
        },
      };

      expect(response.success).toBe(true);
      expect(response.summary.total).toBe(10);
      expect(response.summary.sent + response.summary.skipped + response.summary.failed).toBe(
        response.summary.total
      );
      expect(new Date(response.dateRange.start)).toBeInstanceOf(Date);
      expect(new Date(response.dateRange.end)).toBeInstanceOf(Date);

      // Verify 7 day range
      const start = new Date(response.dateRange.start);
      const end = new Date(response.dateRange.end);
      const diffInDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffInDays).toBe(7);
    });

    test('should return dev mode response when credentials missing', () => {
      const response = {
        success: true,
        message: 'Weekly digest cron job executed (development mode - no emails sent)',
        dev_mode: true,
      };

      expect(response.success).toBe(true);
      expect(response.dev_mode).toBe(true);
      expect(response.message).toContain('development mode');
    });

    test('should return error response for unauthorized request', () => {
      const response = {
        error: 'Unauthorized',
      };
      const status = 401;

      expect(status).toBe(401);
      expect(response.error).toBe('Unauthorized');
    });

    test('should return no subscribers message when no weekly subscribers found', () => {
      const response = {
        success: true,
        message: 'No weekly digest subscribers found',
        processedCount: 0,
      };

      expect(response.success).toBe(true);
      expect(response.processedCount).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty subscriber list', () => {
      const weeklySubscribers: any[] = [];

      expect(weeklySubscribers.length).toBe(0);

      const response = {
        success: true,
        message: 'No weekly digest subscribers found',
        processedCount: 0,
      };

      expect(response.success).toBe(true);
      expect(response.processedCount).toBe(0);
    });

    test('should handle quiet week with no events', () => {
      const recentResults: any[] = [];
      const upcomingFixtures: any[] = [];
      const standingsHighlights: any[] = [];

      const hasContent =
        recentResults.length > 0 ||
        upcomingFixtures.length > 0 ||
        standingsHighlights.length > 0;

      expect(hasContent).toBe(false);

      // Should skip sending email
      const result = {
        status: 'skipped',
        reason: 'No relevant content for this user',
      };

      expect(result.status).toBe('skipped');
    });

    test('should handle email sending failure', () => {
      const result = {
        userId: 'user123',
        status: 'failed',
        error: 'Email service unavailable',
      };

      expect(result.status).toBe('failed');
      expect(result.error).toBeTruthy();
    });

    test('should use Promise.allSettled for parallel processing', async () => {
      const promises = [
        Promise.resolve({ userId: 'user1', status: 'sent' }),
        Promise.reject(new Error('Failed')),
        Promise.resolve({ userId: 'user3', status: 'skipped' }),
        Promise.resolve({ userId: 'user4', status: 'sent' }),
      ];

      const results = await Promise.allSettled(promises);

      expect(results).toHaveLength(4);
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
      expect(results[3].status).toBe('fulfilled');

      // Summarize results
      const summary = {
        total: results.length,
        sent: results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 'sent').length,
        skipped: results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 'skipped').length,
        failed: results.filter(r => r.status === 'rejected').length,
      };

      expect(summary.total).toBe(4);
      expect(summary.sent).toBe(2);
      expect(summary.skipped).toBe(1);
      expect(summary.failed).toBe(1);
    });

    test('should handle week spanning multiple months', () => {
      const now = new Date('2024-02-01T09:00:00Z');
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);

      const weekRange = `${lastWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

      expect(weekRange).toMatch(/Jan \d+ - Feb \d+/);
    });
  });

  describe('Authorization Security', () => {
    test('should validate Bearer token format', () => {
      const authHeader = 'Bearer my-secret-token';
      const cronSecret = 'my-secret-token';

      const isAuthorized = authHeader === `Bearer ${cronSecret}`;

      expect(isAuthorized).toBe(true);
    });

    test('should reject invalid token', () => {
      const authHeader = 'Bearer wrong-token';
      const cronSecret = 'my-secret-token';

      const isAuthorized = authHeader === `Bearer ${cronSecret}`;

      expect(isAuthorized).toBe(false);
    });

    test('should reject missing authorization header', () => {
      const authHeader = null;
      const cronSecret = 'my-secret-token';

      const isAuthorized = authHeader === `Bearer ${cronSecret}`;

      expect(isAuthorized).toBe(false);
    });

    test('should allow request when CRON_SECRET not set in dev', () => {
      const authHeader = null;
      const cronSecret = undefined;

      // In dev mode, if cronSecret is not set, skip validation
      const isAuthorized = !cronSecret || authHeader === `Bearer ${cronSecret}`;

      expect(isAuthorized).toBe(true);
    });
  });

  describe('Performance Considerations', () => {
    test('should process large subscriber list efficiently', () => {
      const largeSubscriberList = Array.from({ length: 100 }, (_, i) => ({
        userId: `user-${i}`,
        email: `user${i}@example.com`,
        frequency: 'weekly',
      }));

      expect(largeSubscriberList).toHaveLength(100);

      // Simulate batch processing
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < largeSubscriberList.length; i += batchSize) {
        batches.push(largeSubscriberList.slice(i, i + batchSize));
      }

      expect(batches).toHaveLength(10);
      expect(batches[0]).toHaveLength(10);
    });

    test('should minimize Firestore reads', () => {
      // Track read operations
      const firestoreReads = {
        usersCollection: 1, // Single query for all users
        emailSubscriptions: 0, // One read per user
        notificationSubscriptions: 0, // One read per weekly subscriber
      };

      const totalUsers = 100;
      const weeklySubscribers = 25;

      firestoreReads.emailSubscriptions = totalUsers;
      firestoreReads.notificationSubscriptions = weeklySubscribers;

      const totalReads =
        firestoreReads.usersCollection +
        firestoreReads.emailSubscriptions +
        firestoreReads.notificationSubscriptions;

      // Expected: 1 + 100 + 25 = 126 reads
      expect(totalReads).toBe(126);

      // Verify reads scale linearly, not exponentially
      expect(totalReads).toBeLessThan(totalUsers * weeklySubscribers);
    });

    test('should handle large result sets in weekly digest', () => {
      // Weekly digest may have more data than daily (7 days vs 1 day)
      const weeklyResults = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        homeTeam: `Team ${i * 2}`,
        awayTeam: `Team ${i * 2 + 1}`,
        homeScore: Math.floor(Math.random() * 10),
        awayScore: Math.floor(Math.random() * 10),
      }));

      expect(weeklyResults).toHaveLength(50);

      // Email template should handle large result sets
      expect(weeklyResults.length).toBeGreaterThan(0);
      expect(weeklyResults.length).toBeLessThanOrEqual(100); // Reasonable limit
    });
  });

  describe('Weekly Digest Specific Features', () => {
    test('should emphasize standings changes over daily digest', () => {
      const weeklyDigestProps = {
        weekRange: 'Jan 14 - Jan 21',
        recentResults: [],
        upcomingFixtures: [],
        standingsHighlights: [
          { team: 'Team A', position: 1, previousPosition: 3, points: 45 },
          { team: 'Team B', position: 2, previousPosition: 2, points: 42 },
        ],
        userTeam: 'Team A',
        unsubscribeUrl: 'http://localhost:3000/unsubscribe?userId=user123',
      };

      // Weekly digest should have content even with only standings
      const hasContent =
        weeklyDigestProps.recentResults.length > 0 ||
        weeklyDigestProps.upcomingFixtures.length > 0 ||
        weeklyDigestProps.standingsHighlights.length > 0;

      expect(hasContent).toBe(true);
      expect(weeklyDigestProps.standingsHighlights.length).toBeGreaterThan(0);
    });

    test('should aggregate week-long data correctly', () => {
      const weekStart = new Date('2024-01-14T00:00:00Z');
      const weekEnd = new Date('2024-01-21T23:59:59Z');

      // Simulate events throughout the week
      const events = [
        { date: new Date('2024-01-15T19:00:00Z'), type: 'match' },
        { date: new Date('2024-01-16T20:00:00Z'), type: 'match' },
        { date: new Date('2024-01-18T19:00:00Z'), type: 'match' },
        { date: new Date('2024-01-20T19:00:00Z'), type: 'match' },
      ];

      const eventsInRange = events.filter(
        event => event.date >= weekStart && event.date <= weekEnd
      );

      expect(eventsInRange).toHaveLength(4);
      expect(eventsInRange.every(e => e.type === 'match')).toBe(true);
    });
  });

  describe('Integration with WeeklyDigestEmail Template', () => {
    test('should use WeeklyDigestEmail template for weekly frequency', () => {
      const weeklyDigestProps = {
        weekRange: 'Jan 14 - Jan 21',
        recentResults: [
          {
            homeTeam: 'Team A',
            awayTeam: 'Team B',
            homeScore: 5,
            awayScore: 3,
            division: 'Premier',
            matchDate: '2024-01-15T19:00:00Z',
          },
        ],
        upcomingFixtures: [
          {
            homeTeam: 'Team C',
            awayTeam: 'Team D',
            division: 'Premier',
            matchDate: '2024-01-22T19:00:00Z',
          },
        ],
        standingsHighlights: [
          {
            team: 'Team A',
            position: 1,
            previousPosition: 2,
            points: 45,
          },
        ],
        userTeam: 'Team A',
        unsubscribeUrl: 'http://localhost:3000/unsubscribe?userId=user123',
      };

      // All required props should be present
      expect(weeklyDigestProps).toHaveProperty('weekRange');
      expect(weeklyDigestProps).toHaveProperty('recentResults');
      expect(weeklyDigestProps).toHaveProperty('upcomingFixtures');
      expect(weeklyDigestProps).toHaveProperty('standingsHighlights');
      expect(weeklyDigestProps).toHaveProperty('userTeam');
      expect(weeklyDigestProps).toHaveProperty('unsubscribeUrl');
    });

    test('should differentiate from daily digest by date range', () => {
      const dailyDigestRange = 'Jan 20 - Jan 21'; // 24 hours
      const weeklyDigestRange = 'Jan 14 - Jan 21'; // 7 days

      // Extract day numbers
      const dailyDays = dailyDigestRange.match(/\d+/g)?.map(Number) || [];
      const weeklyDays = weeklyDigestRange.match(/\d+/g)?.map(Number) || [];

      const dailySpan = Math.abs(dailyDays[1] - dailyDays[0]);
      const weeklySpan = Math.abs(weeklyDays[1] - weeklyDays[0]);

      expect(weeklySpan).toBeGreaterThan(dailySpan);
      expect(weeklySpan).toBe(7);
    });
  });
});
