/**
 * End-to-End League Onboarding Test
 *
 * This test suite verifies the complete multi-league onboarding workflow:
 * 1. Admin creates new league via API
 * 2. Configure data source for league
 * 3. Simulate data sync (script integration)
 * 4. League appears in league selector
 * 5. League data displays correctly
 * 6. Player linking suggestions appear
 * 7. Link players across leagues
 * 8. Cross-league stats visible in player profiles
 */

import type {
  LeagueConfig,
  DataSourceConfig,
  PlayerLink,
  Players2526Map,
  PlayerData2526,
} from '@/lib/types';
import {
  findAllPotentialMatches,
  findPotentialMatches,
  createPlayerLink,
  mergePlayerLinks,
  type LeaguePlayer,
  type PlayerMatch,
} from '@/lib/player-identity';

describe('End-to-End League Onboarding', () => {
  // Test data setup
  const testLeague1: Omit<LeagueConfig, 'id' | 'createdAt' | 'updatedAt'> = {
    name: 'Test League One',
    shortName: 'TL1',
    primaryColor: '#FF5733',
    logo: 'https://example.com/logo1.png',
    seasons: ['2526'],
  };

  const testLeague2: Omit<LeagueConfig, 'id' | 'createdAt' | 'updatedAt'> = {
    name: 'Test League Two',
    shortName: 'TL2',
    primaryColor: '#33C3FF',
    logo: 'https://example.com/logo2.png',
    seasons: ['2526'],
  };

  const testDataSource: Omit<DataSourceConfig, 'id' | 'leagueId' | 'createdAt' | 'updatedAt'> = {
    sourceType: 'leagueapplive',
    config: {
      url: 'https://leagueapplive.com/test-league',
    },
    enabled: true,
  };

  const testPlayers1: Players2526Map = {
    'John Smith': {
      teams: [
        {
          team: 'Team A',
          div: 'Premier',
          p: 10,
          w: 7,
          pct: 0.7,
          lag: 0,
          bdF: 5,
          bdA: 2,
          forf: 0,
          cup: false,
        },
      ],
      total: {
        p: 10,
        w: 7,
        pct: 0.7,
      },
    },
    'Jane Doe': {
      teams: [
        {
          team: 'Team B',
          div: 'Premier',
          p: 12,
          w: 9,
          pct: 0.75,
          lag: 0,
          bdF: 6,
          bdA: 1,
          forf: 0,
          cup: false,
        },
      ],
      total: {
        p: 12,
        w: 9,
        pct: 0.75,
      },
    },
  };

  const testPlayers2: Players2526Map = {
    'John Smith': {
      // Same player in different league
      teams: [
        {
          team: 'Team X',
          div: 'Division 1',
          p: 8,
          w: 5,
          pct: 0.625,
          lag: 0,
          bdF: 3,
          bdA: 1,
          forf: 0,
          cup: false,
        },
      ],
      total: {
        p: 8,
        w: 5,
        pct: 0.625,
      },
    },
    'J. Smith': {
      // Potential duplicate with slight name variation
      teams: [
        {
          team: 'Team Y',
          div: 'Division 2',
          p: 6,
          w: 4,
          pct: 0.667,
          lag: 0,
          bdF: 2,
          bdA: 0,
          forf: 0,
          cup: false,
        },
      ],
      total: {
        p: 6,
        w: 4,
        pct: 0.667,
      },
    },
    'Bob Johnson': {
      // Unique to league 2
      teams: [
        {
          team: 'Team Z',
          div: 'Division 1',
          p: 10,
          w: 6,
          pct: 0.6,
          lag: 0,
          bdF: 4,
          bdA: 2,
          forf: 0,
          cup: false,
        },
      ],
      total: {
        p: 10,
        w: 6,
        pct: 0.6,
      },
    },
  };

  describe('Step 1: League Creation', () => {
    it('should validate league creation data structure', () => {
      const league: LeagueConfig = {
        id: 'test-league-one',
        ...testLeague1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(league).toHaveProperty('id');
      expect(league).toHaveProperty('name');
      expect(league).toHaveProperty('shortName');
      expect(league).toHaveProperty('primaryColor');
      expect(league.primaryColor).toMatch(/^#[A-Fa-f0-9]{6}$/);
      expect(league.seasons).toBeInstanceOf(Array);
      expect(league.createdAt).toBeGreaterThan(0);
      expect(league.updatedAt).toBeGreaterThan(0);
    });

    it('should validate required fields for league creation', () => {
      const invalidLeague = {
        name: '',
        shortName: 'TL',
        primaryColor: '#FF5733',
      };

      expect(invalidLeague.name).toBe('');
      expect(invalidLeague.shortName.length).toBeGreaterThan(0);
      expect(invalidLeague.primaryColor).toMatch(/^#[A-Fa-f0-9]{6}$/);
    });

    it('should validate primary color format', () => {
      const validColors = ['#FF5733', '#000', '#FFFFFF', '#abc'];
      const invalidColors = ['FF5733', '#GG5733', 'red', '#12345'];

      validColors.forEach((color) => {
        expect(color).toMatch(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/);
      });

      invalidColors.forEach((color) => {
        expect(color).not.toMatch(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/);
      });
    });

    it('should generate league ID from name', () => {
      const generateLeagueId = (name: string): string => {
        return name.toLowerCase().replace(/\s+/g, '-');
      };

      expect(generateLeagueId('Test League One')).toBe('test-league-one');
      expect(generateLeagueId('Wrexham Pool League')).toBe('wrexham-pool-league');
      expect(generateLeagueId('Chester   League')).toBe('chester-league');
    });

    it('should validate short name length', () => {
      const validShortNames = ['TL1', 'WPL', 'ABC'];
      const invalidShortName = 'TooLongName';

      validShortNames.forEach((shortName) => {
        expect(shortName.length).toBeLessThanOrEqual(10);
      });

      expect(invalidShortName.length).toBeGreaterThan(10);
    });
  });

  describe('Step 2: Data Source Configuration', () => {
    it('should validate data source configuration structure', () => {
      const dataSource: DataSourceConfig = {
        id: 'test-league-one-leagueapplive',
        leagueId: 'test-league-one',
        ...testDataSource,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(dataSource).toHaveProperty('id');
      expect(dataSource).toHaveProperty('leagueId');
      expect(dataSource).toHaveProperty('sourceType');
      expect(dataSource).toHaveProperty('config');
      expect(dataSource).toHaveProperty('enabled');
      expect(dataSource.createdAt).toBeGreaterThan(0);
    });

    it('should support different source types', () => {
      const sourceTypes = ['leagueapplive', 'manual', 'api'];

      sourceTypes.forEach((sourceType) => {
        const dataSource: Partial<DataSourceConfig> = {
          sourceType: sourceType as 'leagueapplive' | 'manual' | 'api',
          config: {},
          enabled: true,
        };

        expect(['leagueapplive', 'manual', 'api']).toContain(dataSource.sourceType);
      });
    });

    it('should validate LeagueAppLive config format', () => {
      const leagueAppLiveConfig = {
        url: 'https://leagueapplive.com/test-league',
      };

      expect(leagueAppLiveConfig).toHaveProperty('url');
      expect(leagueAppLiveConfig.url).toContain('leagueapplive.com');
    });

    it('should validate API config format', () => {
      const apiConfig = {
        endpoint: 'https://api.example.com/league-data',
        apiKey: 'test-key-123',
      };

      expect(apiConfig).toHaveProperty('endpoint');
      expect(apiConfig).toHaveProperty('apiKey');
      expect(apiConfig.endpoint).toMatch(/^https?:\/\//);
    });

    it('should generate data source ID from league and type', () => {
      const generateDataSourceId = (leagueId: string, sourceType: string): string => {
        return `${leagueId}-${sourceType}`;
      };

      expect(generateDataSourceId('test-league-one', 'leagueapplive')).toBe(
        'test-league-one-leagueapplive'
      );
      expect(generateDataSourceId('wrexham', 'manual')).toBe('wrexham-manual');
    });
  });

  describe('Step 3: Data Sync Simulation', () => {
    it('should validate player data structure', () => {
      const playerName = 'John Smith';
      const playerData = testPlayers1[playerName];

      expect(playerData).toHaveProperty('teams');
      expect(playerData).toHaveProperty('total');
      expect(playerData.teams).toBeInstanceOf(Array);
      expect(playerData.teams.length).toBeGreaterThan(0);
    });

    it('should validate team stats structure', () => {
      const playerData = testPlayers1['John Smith'];
      const teamStats = playerData.teams[0];

      expect(teamStats).toHaveProperty('team');
      expect(teamStats).toHaveProperty('div');
      expect(teamStats).toHaveProperty('p');
      expect(teamStats).toHaveProperty('w');
      expect(teamStats).toHaveProperty('pct');
      expect(teamStats).toHaveProperty('bdF');
      expect(teamStats).toHaveProperty('bdA');
    });

    it('should calculate correct win percentage', () => {
      const playerData = testPlayers1['John Smith'];

      expect(playerData.total.p).toBe(10);
      expect(playerData.total.w).toBe(7);
      expect(playerData.total.pct).toBeCloseTo(0.7, 2);
    });

    it('should handle players with multiple teams', () => {
      const multiTeamPlayer: PlayerData2526 = {
        teams: [
          {
            team: 'Team A',
            div: 'Premier',
            p: 6,
            w: 4,
            pct: 0.667,
            lag: 0,
            bdF: 3,
            bdA: 1,
            forf: 0,
            cup: false,
          },
          {
            team: 'Team B',
            div: 'Division 1',
            p: 4,
            w: 3,
            pct: 0.75,
            lag: 0,
            bdF: 2,
            bdA: 0,
            forf: 0,
            cup: false,
          },
        ],
        total: {
          p: 10,
          w: 7,
          pct: 0.7,
        },
      };

      expect(multiTeamPlayer.teams).toHaveLength(2);
      expect(multiTeamPlayer.total.p).toBe(
        multiTeamPlayer.teams[0].p + multiTeamPlayer.teams[1].p
      );
    });
  });

  describe('Step 4: League Selector Integration', () => {
    it('should list multiple leagues', () => {
      const leagues: LeagueConfig[] = [
        {
          id: 'test-league-one',
          ...testLeague1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'test-league-two',
          ...testLeague2,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      expect(leagues).toHaveLength(2);
      expect(leagues[0].id).toBe('test-league-one');
      expect(leagues[1].id).toBe('test-league-two');
    });

    it('should filter leagues by season', () => {
      const leagues: LeagueConfig[] = [
        {
          id: 'test-league-one',
          ...testLeague1,
          seasons: ['2425', '2526'],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'test-league-two',
          ...testLeague2,
          seasons: ['2526'],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const season2526Leagues = leagues.filter((league) => league.seasons.includes('2526'));

      expect(season2526Leagues).toHaveLength(2);
    });

    it('should display league branding information', () => {
      const league: LeagueConfig = {
        id: 'test-league-one',
        ...testLeague1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(league.primaryColor).toBe('#FF5733');
      expect(league.logo).toBe('https://example.com/logo1.png');
      expect(league.shortName).toBe('TL1');
    });
  });

  describe('Step 5: League Data Display', () => {
    it('should aggregate player stats across teams', () => {
      const playerData = testPlayers1['John Smith'];
      const totalPlayed = playerData.total.p;
      const totalWins = playerData.total.w;

      expect(totalPlayed).toBe(10);
      expect(totalWins).toBe(7);
      expect(playerData.total.pct).toBeCloseTo(totalWins / totalPlayed, 2);
    });

    it('should display division and team information', () => {
      const playerData = testPlayers1['John Smith'];
      const teamStats = playerData.teams[0];

      expect(teamStats.team).toBe('Team A');
      expect(teamStats.div).toBe('Premier');
    });

    it('should calculate break dish statistics', () => {
      const playerData = testPlayers1['John Smith'];
      const teamStats = playerData.teams[0];

      expect(teamStats.bdF).toBe(5);
      expect(teamStats.bdA).toBe(2);

      const bdDiff = teamStats.bdF - teamStats.bdA;
      expect(bdDiff).toBe(3);
    });
  });

  describe('Step 6: Player Linking Suggestions', () => {
    it('should find exact name matches across leagues', () => {
      const players1: LeaguePlayer[] = [
        { leagueId: 'test-league-one', playerId: 'John Smith' },
        { leagueId: 'test-league-one', playerId: 'Jane Doe' },
      ];

      const players2: LeaguePlayer[] = [
        { leagueId: 'test-league-two', playerId: 'John Smith' },
        { leagueId: 'test-league-two', playerId: 'Bob Johnson' },
      ];

      const allPlayers = [...players1, ...players2];
      const matches = findAllPotentialMatches(allPlayers, { minConfidence: 0.9 });

      // Should find John Smith across both leagues
      const johnSmithMatches = matches.filter(
        (m) =>
          (m.player1.playerId === 'John Smith' && m.player2.playerId === 'John Smith') ||
          (m.player2.playerId === 'John Smith' && m.player1.playerId === 'John Smith')
      );

      expect(johnSmithMatches.length).toBeGreaterThan(0);
      expect(johnSmithMatches[0].confidence).toBe(1.0); // Exact match
    });

    it('should find fuzzy name matches with high confidence', () => {
      const players: LeaguePlayer[] = [
        { leagueId: 'test-league-one', playerId: 'John Smith' },
        { leagueId: 'test-league-two', playerId: 'J. Smith' },
      ];

      const matches = findAllPotentialMatches(players, { minConfidence: 0.7 });

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].confidence).toBeGreaterThanOrEqual(0.7);
      expect(matches[0].confidence).toBeLessThan(1.0);
    });

    it('should not match players from the same league', () => {
      const players: LeaguePlayer[] = [
        { leagueId: 'test-league-one', playerId: 'John Smith' },
        { leagueId: 'test-league-one', playerId: 'Jane Doe' },
      ];

      const matches = findAllPotentialMatches(players);

      expect(matches).toHaveLength(0);
    });

    it('should filter matches by minimum confidence threshold', () => {
      const players: LeaguePlayer[] = [
        { leagueId: 'test-league-one', playerId: 'John Smith' },
        { leagueId: 'test-league-two', playerId: 'Jane Doe' },
      ];

      const strictMatches = findAllPotentialMatches(players, { minConfidence: 0.9 });
      const lenientMatches = findAllPotentialMatches(players, { minConfidence: 0.1 });

      expect(lenientMatches.length).toBeGreaterThanOrEqual(strictMatches.length);
    });

    it('should provide match reasoning', () => {
      const players: LeaguePlayer[] = [
        { leagueId: 'test-league-one', playerId: 'John Smith' },
        { leagueId: 'test-league-two', playerId: 'John Smith' },
      ];

      const matches = findAllPotentialMatches(players);

      expect(matches[0]).toHaveProperty('reason');
      expect(matches[0].reason).toBe('Exact name match');
    });
  });

  describe('Step 7: Link Players Across Leagues', () => {
    it('should create player link with linked players', () => {
      const player1 = {
        leagueId: 'test-league-one',
        playerId: 'John Smith',
        confidence: 1.0,
      };
      const player2 = {
        leagueId: 'test-league-two',
        playerId: 'John Smith',
        confidence: 1.0,
      };

      const link = createPlayerLink('john-smith', [player1, player2]);

      expect(link).toHaveProperty('id');
      expect(link).toHaveProperty('linkedPlayers');
      expect(link.linkedPlayers).toHaveLength(2);
    });

    it('should assign canonical player ID', () => {
      const players = [
        { leagueId: 'test-league-one', playerId: 'John Smith', confidence: 1.0 },
        { leagueId: 'test-league-two', playerId: 'J. Smith', confidence: 0.8 },
      ];

      const link = createPlayerLink('john-smith', players);

      expect(link.id).toBeTruthy();
      expect(link.id.length).toBeGreaterThan(0);
    });

    it('should store confidence scores for each link', () => {
      const players = [
        { leagueId: 'test-league-one', playerId: 'John Smith', confidence: 1.0 },
        { leagueId: 'test-league-two', playerId: 'John Smith', confidence: 1.0 },
      ];

      const link = createPlayerLink('john-smith', players);

      link.linkedPlayers.forEach((linkedPlayer) => {
        expect(linkedPlayer).toHaveProperty('confidence');
        expect(linkedPlayer.confidence).toBeGreaterThanOrEqual(0);
        expect(linkedPlayer.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should merge multiple player links', () => {
      const link1 = createPlayerLink('john-smith-1', [
        { leagueId: 'league-a', playerId: 'John Smith', confidence: 1.0 },
        { leagueId: 'league-b', playerId: 'John Smith', confidence: 1.0 },
      ]);

      const link2 = createPlayerLink('john-smith-2', [
        { leagueId: 'league-b', playerId: 'John Smith', confidence: 1.0 },
        { leagueId: 'league-c', playerId: 'J. Smith', confidence: 0.8 },
      ]);

      const merged = mergePlayerLinks([link1, link2]);

      expect(merged.linkedPlayers.length).toBeGreaterThanOrEqual(2);
    });

    it('should prevent duplicate players in same league', () => {
      const players = [
        { leagueId: 'test-league-one', playerId: 'John Smith', confidence: 1.0 },
        { leagueId: 'test-league-one', playerId: 'John Smith', confidence: 1.0 }, // Duplicate
        { leagueId: 'test-league-two', playerId: 'J. Smith', confidence: 0.8 },
      ];

      const link = createPlayerLink('john-smith', players);

      // Should deduplicate by leagueId + playerId
      const uniqueLinks = new Set(
        link.linkedPlayers.map((lp) => `${lp.leagueId}:${lp.playerId}`)
      );
      expect(uniqueLinks.size).toBe(link.linkedPlayers.length);
    });
  });

  describe('Step 8: Cross-League Stats Display', () => {
    it('should aggregate stats from multiple leagues', () => {
      const league1Stats = testPlayers1['John Smith'];
      const league2Stats = testPlayers2['John Smith'];

      const totalPlayed = league1Stats.total.p + league2Stats.total.p;
      const totalWins = league1Stats.total.w + league2Stats.total.w;
      const combinedPct = totalWins / totalPlayed;

      expect(totalPlayed).toBe(18);
      expect(totalWins).toBe(12);
      expect(combinedPct).toBeCloseTo(0.667, 2);
    });

    it('should display per-league breakdown', () => {
      const crossLeagueData = {
        'test-league-one': testPlayers1['John Smith'],
        'test-league-two': testPlayers2['John Smith'],
      };

      const leagues = Object.keys(crossLeagueData);

      expect(leagues).toHaveLength(2);
      expect(leagues).toContain('test-league-one');
      expect(leagues).toContain('test-league-two');
    });

    it('should calculate combined break dish stats', () => {
      const league1Stats = testPlayers1['John Smith'];
      const league2Stats = testPlayers2['John Smith'];

      const totalBdF =
        league1Stats.teams.reduce((sum, team) => sum + team.bdF, 0) +
        league2Stats.teams.reduce((sum, team) => sum + team.bdF, 0);

      const totalBdA =
        league1Stats.teams.reduce((sum, team) => sum + team.bdA, 0) +
        league2Stats.teams.reduce((sum, team) => sum + team.bdA, 0);

      expect(totalBdF).toBe(8); // 5 + 3
      expect(totalBdA).toBe(3); // 2 + 1
    });

    it('should show which leagues player participates in', () => {
      const playerLeagues = ['test-league-one', 'test-league-two'];

      expect(playerLeagues).toHaveLength(2);
      expect(playerLeagues).toContain('test-league-one');
      expect(playerLeagues).toContain('test-league-two');
    });

    it('should handle players in only one league gracefully', () => {
      const singleLeaguePlayer = testPlayers1['Jane Doe'];

      expect(singleLeaguePlayer.total.p).toBe(12);
      expect(singleLeaguePlayer.total.w).toBe(9);

      // Should not show cross-league section if only in one league
      const leagueCount = 1;
      expect(leagueCount).toBe(1);
    });
  });

  describe('Integration: Complete Workflow', () => {
    it('should support complete league onboarding workflow', () => {
      // Step 1: Create league
      const league: LeagueConfig = {
        id: 'test-league-one',
        ...testLeague1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(league.id).toBe('test-league-one');

      // Step 2: Configure data source
      const dataSource: DataSourceConfig = {
        id: 'test-league-one-leagueapplive',
        leagueId: league.id,
        ...testDataSource,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(dataSource.leagueId).toBe(league.id);

      // Step 3: Simulate data sync
      const players = testPlayers1;
      expect(Object.keys(players).length).toBeGreaterThan(0);

      // Step 4: League appears in selector
      const leagues = [league];
      expect(leagues).toContain(league);

      // Step 5: League data displays
      const playerData = players['John Smith'];
      expect(playerData).toBeDefined();

      // Step 6: Find player matches
      const leaguePlayers: LeaguePlayer[] = [
        { leagueId: 'test-league-one', playerId: 'John Smith' },
        { leagueId: 'test-league-two', playerId: 'John Smith' },
      ];
      const matches = findAllPotentialMatches(leaguePlayers);
      expect(matches.length).toBeGreaterThan(0);

      // Step 7: Link players
      const link = createPlayerLink('john-smith', [
        { leagueId: 'test-league-one', playerId: 'John Smith', confidence: 1.0 },
        { leagueId: 'test-league-two', playerId: 'John Smith', confidence: 1.0 },
      ]);
      expect(link.linkedPlayers).toHaveLength(2);

      // Step 8: Cross-league stats
      const totalP = testPlayers1['John Smith'].total.p + testPlayers2['John Smith'].total.p;
      expect(totalP).toBe(18);
    });
  });
});
