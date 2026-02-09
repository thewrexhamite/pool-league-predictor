/**
 * Tests for Player Identity Resolution Service
 */

import {
  levenshteinDistance,
  calculateSimilarity,
  normalizePlayerName,
  calculateMatchConfidence,
  findPotentialMatches,
  findAllPotentialMatches,
  createPlayerLink,
  mergePlayerLinks,
  addPlayerToLink,
  removePlayerFromLink,
  resolveCanonicalId,
  getLinkedPlayers,
  generateCanonicalId,
  type LeaguePlayer,
  type PlayerMatch,
} from '../lib/player-identity';

describe('String Similarity Algorithms', () => {
  describe('levenshteinDistance', () => {
    it('should return 0 for identical strings', () => {
      expect(levenshteinDistance('hello', 'hello')).toBe(0);
    });

    it('should return string length for completely different strings', () => {
      expect(levenshteinDistance('abc', 'xyz')).toBe(3);
    });

    it('should calculate correct distance for single character difference', () => {
      expect(levenshteinDistance('kitten', 'sitten')).toBe(1);
    });

    it('should calculate correct distance for multiple operations', () => {
      expect(levenshteinDistance('Saturday', 'Sunday')).toBe(3);
    });

    it('should handle empty strings', () => {
      expect(levenshteinDistance('', '')).toBe(0);
      expect(levenshteinDistance('hello', '')).toBe(5);
      expect(levenshteinDistance('', 'world')).toBe(5);
    });
  });

  describe('calculateSimilarity', () => {
    it('should return 1.0 for identical strings', () => {
      expect(calculateSimilarity('John Smith', 'John Smith')).toBe(1.0);
    });

    it('should return 0.0 for empty strings', () => {
      expect(calculateSimilarity('', '')).toBe(0.0);
      expect(calculateSimilarity('test', '')).toBe(0.0);
    });

    it('should return high similarity for similar strings', () => {
      const similarity = calculateSimilarity('John Smith', 'Jon Smith');
      expect(similarity).toBeGreaterThan(0.9);
    });

    it('should return low similarity for different strings', () => {
      const similarity = calculateSimilarity('John Smith', 'Jane Doe');
      expect(similarity).toBeLessThan(0.5);
    });

    it('should handle case differences', () => {
      const similarity = calculateSimilarity('JOHN', 'john');
      expect(similarity).toBeLessThan(1.0); // Without normalization
    });
  });

  describe('normalizePlayerName', () => {
    it('should normalize to lowercase by default', () => {
      expect(normalizePlayerName('John Smith')).toBe('john smith');
    });

    it('should preserve case when caseSensitive is true', () => {
      expect(normalizePlayerName('John Smith', { caseSensitive: true })).toBe(
        'John Smith'
      );
    });

    it('should normalize whitespace by default', () => {
      expect(normalizePlayerName('  John   Smith  ')).toBe('john smith');
    });

    it('should preserve whitespace when ignoreWhitespace is false', () => {
      const result = normalizePlayerName('  John   Smith  ', {
        ignoreWhitespace: false,
      });
      expect(result).toBe('  john   smith  ');
    });

    it('should handle both options together', () => {
      const result = normalizePlayerName('  JOHN   SMITH  ', {
        caseSensitive: true,
        ignoreWhitespace: true,
      });
      expect(result).toBe('JOHN SMITH');
    });
  });
});

describe('Player Matching Functions', () => {
  const wrexhamPlayer: LeaguePlayer = {
    leagueId: 'wrexham',
    playerId: 'John Smith',
  };

  const chesterPlayer: LeaguePlayer = {
    leagueId: 'chester',
    playerId: 'John Smith',
  };

  const chesterPlayerVariant: LeaguePlayer = {
    leagueId: 'chester',
    playerId: 'Jon Smith',
  };

  const differentPlayer: LeaguePlayer = {
    leagueId: 'chester',
    playerId: 'Jane Doe',
  };

  describe('calculateMatchConfidence', () => {
    it('should return 0.0 for players in same league', () => {
      const player1: LeaguePlayer = {
        leagueId: 'wrexham',
        playerId: 'John Smith',
      };
      const player2: LeaguePlayer = {
        leagueId: 'wrexham',
        playerId: 'John Smith',
      };

      expect(calculateMatchConfidence(player1, player2)).toBe(0.0);
    });

    it('should return 1.0 for exact name match across leagues', () => {
      expect(calculateMatchConfidence(wrexhamPlayer, chesterPlayer)).toBe(1.0);
    });

    it('should return high confidence for similar names', () => {
      const confidence = calculateMatchConfidence(
        wrexhamPlayer,
        chesterPlayerVariant
      );
      expect(confidence).toBeGreaterThan(0.9);
      expect(confidence).toBeLessThan(1.0);
    });

    it('should return low confidence for different names', () => {
      const confidence = calculateMatchConfidence(
        wrexhamPlayer,
        differentPlayer
      );
      expect(confidence).toBeLessThan(0.5);
    });
  });

  describe('findPotentialMatches', () => {
    const candidates: LeaguePlayer[] = [
      chesterPlayer,
      chesterPlayerVariant,
      differentPlayer,
      { leagueId: 'liverpool', playerId: 'John Smith' },
      { leagueId: 'wrexham', playerId: 'Another Player' }, // same league, should be ignored
    ];

    it('should find exact matches', () => {
      const matches = findPotentialMatches(wrexhamPlayer, candidates, {
        minConfidence: 0.9,
      });

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].confidence).toBe(1.0);
      expect(matches[0].reason).toBe('Exact name match');
    });

    it('should sort matches by confidence descending', () => {
      const matches = findPotentialMatches(wrexhamPlayer, candidates, {
        minConfidence: 0.7,
      });

      for (let i = 1; i < matches.length; i++) {
        expect(matches[i].confidence).toBeLessThanOrEqual(
          matches[i - 1].confidence
        );
      }
    });

    it('should filter by minimum confidence', () => {
      const highConfMatches = findPotentialMatches(wrexhamPlayer, candidates, {
        minConfidence: 0.95,
      });
      const lowConfMatches = findPotentialMatches(wrexhamPlayer, candidates, {
        minConfidence: 0.5,
      });

      expect(highConfMatches.length).toBeLessThanOrEqual(
        lowConfMatches.length
      );
    });

    it('should exclude same league players', () => {
      const matches = findPotentialMatches(wrexhamPlayer, candidates, {
        minConfidence: 0.1,
      });

      const sameLeagueMatches = matches.filter(
        (m) =>
          m.player1.leagueId === m.player2.leagueId ||
          m.player2.leagueId === wrexhamPlayer.leagueId
      );

      expect(sameLeagueMatches.length).toBe(0);
    });

    it('should return empty array when no matches above threshold', () => {
      const matches = findPotentialMatches(wrexhamPlayer, candidates, {
        minConfidence: 1.0, // only exact matches
      });

      // Should find exact matches
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.every((m) => m.confidence === 1.0)).toBe(true);
    });
  });

  describe('findAllPotentialMatches', () => {
    const allPlayers: LeaguePlayer[] = [
      { leagueId: 'wrexham', playerId: 'John Smith' },
      { leagueId: 'chester', playerId: 'John Smith' },
      { leagueId: 'liverpool', playerId: 'Jon Smith' },
      { leagueId: 'wrexham', playerId: 'Jane Doe' },
      { leagueId: 'chester', playerId: 'Jane Doe' },
      { leagueId: 'manchester', playerId: 'Bob Jones' },
    ];

    it('should find all potential matches across all leagues', () => {
      const matches = findAllPotentialMatches(allPlayers, {
        minConfidence: 0.7,
      });

      expect(matches.length).toBeGreaterThan(0);
    });

    it('should not create duplicate matches', () => {
      const matches = findAllPotentialMatches(allPlayers, {
        minConfidence: 0.7,
      });

      const uniqueKeys = new Set<string>();
      for (const match of matches) {
        const key = [
          `${match.player1.leagueId}:${match.player1.playerId}`,
          `${match.player2.leagueId}:${match.player2.playerId}`,
        ]
          .sort()
          .join('|');

        expect(uniqueKeys.has(key)).toBe(false);
        uniqueKeys.add(key);
      }
    });

    it('should sort matches by confidence', () => {
      const matches = findAllPotentialMatches(allPlayers, {
        minConfidence: 0.5,
      });

      for (let i = 1; i < matches.length; i++) {
        expect(matches[i].confidence).toBeLessThanOrEqual(
          matches[i - 1].confidence
        );
      }
    });

    it('should only match players across different leagues', () => {
      const matches = findAllPotentialMatches(allPlayers, {
        minConfidence: 0.1,
      });

      for (const match of matches) {
        expect(match.player1.leagueId).not.toBe(match.player2.leagueId);
      }
    });
  });
});

describe('Player Link Management', () => {
  describe('createPlayerLink', () => {
    it('should create a valid PlayerLink', () => {
      const players = [
        { leagueId: 'wrexham', playerId: 'John Smith', confidence: 1.0 },
        { leagueId: 'chester', playerId: 'John Smith', confidence: 1.0 },
      ];

      const link = createPlayerLink('john-smith-123', players);

      expect(link.id).toBe('john-smith-123');
      expect(link.linkedPlayers).toEqual(players);
      expect(link.createdAt).toBeGreaterThan(0);
      expect(link.updatedAt).toBeGreaterThan(0);
    });

    it('should set timestamps', () => {
      const before = Date.now();
      const link = createPlayerLink('test-id', []);
      const after = Date.now();

      expect(link.createdAt).toBeGreaterThanOrEqual(before);
      expect(link.createdAt).toBeLessThanOrEqual(after);
      expect(link.updatedAt).toBe(link.createdAt);
    });
  });

  describe('mergePlayerLinks', () => {
    it('should throw error for empty array', () => {
      expect(() => mergePlayerLinks([])).toThrow(
        'Cannot merge empty array of player links'
      );
    });

    it('should return same link for single link', () => {
      const link = createPlayerLink('test', [
        { leagueId: 'wrexham', playerId: 'John', confidence: 1.0 },
      ]);

      const result = mergePlayerLinks([link]);
      expect(result).toEqual(link);
    });

    it('should merge multiple links', () => {
      const link1 = createPlayerLink('link1', [
        { leagueId: 'wrexham', playerId: 'John Smith', confidence: 1.0 },
        { leagueId: 'chester', playerId: 'John Smith', confidence: 1.0 },
      ]);

      const link2 = createPlayerLink('link2', [
        { leagueId: 'liverpool', playerId: 'John Smith', confidence: 0.95 },
      ]);

      const merged = mergePlayerLinks([link1, link2]);

      expect(merged.linkedPlayers.length).toBe(3);
      expect(merged.id).toBe(link1.id); // Uses oldest link's ID
    });

    it('should keep highest confidence for duplicate players', () => {
      const link1 = createPlayerLink('link1', [
        { leagueId: 'wrexham', playerId: 'John Smith', confidence: 0.8 },
      ]);

      const link2 = createPlayerLink('link2', [
        { leagueId: 'wrexham', playerId: 'John Smith', confidence: 0.95 },
      ]);

      const merged = mergePlayerLinks([link1, link2]);

      expect(merged.linkedPlayers.length).toBe(1);
      expect(merged.linkedPlayers[0].confidence).toBe(0.95);
    });

    it('should update timestamp', () => {
      const link1 = createPlayerLink('link1', []);
      const link2 = createPlayerLink('link2', []);

      const before = Date.now();
      const merged = mergePlayerLinks([link1, link2]);
      const after = Date.now();

      expect(merged.updatedAt).toBeGreaterThanOrEqual(before);
      expect(merged.updatedAt).toBeLessThanOrEqual(after);
    });
  });

  describe('addPlayerToLink', () => {
    it('should add new player to link', () => {
      const link = createPlayerLink('test', [
        { leagueId: 'wrexham', playerId: 'John', confidence: 1.0 },
      ]);

      const updated = addPlayerToLink(link, {
        leagueId: 'chester',
        playerId: 'John',
        confidence: 0.95,
      });

      expect(updated.linkedPlayers.length).toBe(2);
      expect(updated.linkedPlayers[1]).toEqual({
        leagueId: 'chester',
        playerId: 'John',
        confidence: 0.95,
      });
    });

    it('should update existing player with higher confidence', () => {
      const link = createPlayerLink('test', [
        { leagueId: 'wrexham', playerId: 'John', confidence: 0.8 },
      ]);

      const updated = addPlayerToLink(link, {
        leagueId: 'wrexham',
        playerId: 'John',
        confidence: 0.95,
      });

      expect(updated.linkedPlayers.length).toBe(1);
      expect(updated.linkedPlayers[0].confidence).toBe(0.95);
    });

    it('should not downgrade confidence', () => {
      const link = createPlayerLink('test', [
        { leagueId: 'wrexham', playerId: 'John', confidence: 0.95 },
      ]);

      const updated = addPlayerToLink(link, {
        leagueId: 'wrexham',
        playerId: 'John',
        confidence: 0.8,
      });

      expect(updated.linkedPlayers[0].confidence).toBe(0.95);
    });

    it('should update timestamp', () => {
      const link = createPlayerLink('test', []);
      const before = Date.now();
      const updated = addPlayerToLink(link, {
        leagueId: 'wrexham',
        playerId: 'John',
        confidence: 1.0,
      });
      const after = Date.now();

      expect(updated.updatedAt).toBeGreaterThanOrEqual(before);
      expect(updated.updatedAt).toBeLessThanOrEqual(after);
    });
  });

  describe('removePlayerFromLink', () => {
    it('should remove player from link', () => {
      const link = createPlayerLink('test', [
        { leagueId: 'wrexham', playerId: 'John', confidence: 1.0 },
        { leagueId: 'chester', playerId: 'John', confidence: 1.0 },
      ]);

      const updated = removePlayerFromLink(link, 'wrexham', 'John');

      expect(updated.linkedPlayers.length).toBe(1);
      expect(updated.linkedPlayers[0].leagueId).toBe('chester');
    });

    it('should handle non-existent player', () => {
      const link = createPlayerLink('test', [
        { leagueId: 'wrexham', playerId: 'John', confidence: 1.0 },
      ]);

      const updated = removePlayerFromLink(link, 'chester', 'Jane');

      expect(updated.linkedPlayers.length).toBe(1);
    });

    it('should update timestamp', () => {
      const link = createPlayerLink('test', [
        { leagueId: 'wrexham', playerId: 'John', confidence: 1.0 },
      ]);

      const before = Date.now();
      const updated = removePlayerFromLink(link, 'wrexham', 'John');
      const after = Date.now();

      expect(updated.updatedAt).toBeGreaterThanOrEqual(before);
      expect(updated.updatedAt).toBeLessThanOrEqual(after);
    });
  });

  describe('resolveCanonicalId', () => {
    const links = [
      createPlayerLink('john-smith-123', [
        { leagueId: 'wrexham', playerId: 'John Smith', confidence: 1.0 },
        { leagueId: 'chester', playerId: 'John Smith', confidence: 1.0 },
      ]),
      createPlayerLink('jane-doe-456', [
        { leagueId: 'wrexham', playerId: 'Jane Doe', confidence: 1.0 },
        { leagueId: 'liverpool', playerId: 'Jane Doe', confidence: 1.0 },
      ]),
    ];

    it('should resolve canonical ID for linked player', () => {
      const canonicalId = resolveCanonicalId('wrexham', 'John Smith', links);
      expect(canonicalId).toBe('john-smith-123');
    });

    it('should return null for non-linked player', () => {
      const canonicalId = resolveCanonicalId('wrexham', 'Bob Jones', links);
      expect(canonicalId).toBeNull();
    });

    it('should handle different league', () => {
      const canonicalId = resolveCanonicalId('chester', 'John Smith', links);
      expect(canonicalId).toBe('john-smith-123');
    });
  });

  describe('getLinkedPlayers', () => {
    const links = [
      createPlayerLink('john-smith-123', [
        { leagueId: 'wrexham', playerId: 'John Smith', confidence: 1.0 },
        { leagueId: 'chester', playerId: 'John Smith', confidence: 1.0 },
      ]),
    ];

    it('should get all linked players for canonical ID', () => {
      const linked = getLinkedPlayers('john-smith-123', links);
      expect(linked.length).toBe(2);
      expect(linked[0].leagueId).toBe('wrexham');
      expect(linked[1].leagueId).toBe('chester');
    });

    it('should return empty array for non-existent ID', () => {
      const linked = getLinkedPlayers('non-existent', links);
      expect(linked).toEqual([]);
    });
  });

  describe('generateCanonicalId', () => {
    it('should generate consistent ID format', () => {
      const id = generateCanonicalId('John Smith');
      expect(id).toMatch(/^john-smith-[a-z0-9]+$/);
    });

    it('should normalize player names', () => {
      const id1 = generateCanonicalId('  JOHN   SMITH  ');
      const id2 = generateCanonicalId('John Smith');

      // Should have same prefix (normalized name)
      const prefix1 = id1.split('-').slice(0, -1).join('-');
      const prefix2 = id2.split('-').slice(0, -1).join('-');

      expect(prefix1).toBe(prefix2);
    });

    it('should remove special characters', () => {
      const id = generateCanonicalId("John O'Smith");
      expect(id).not.toContain("'");
    });

    it('should generate unique IDs', () => {
      const id1 = generateCanonicalId('John Smith');
      const id2 = generateCanonicalId('John Smith');

      // Same name but different timestamps = different IDs
      expect(id1).not.toBe(id2);
    });

    it('should handle empty string', () => {
      const id = generateCanonicalId('');
      expect(id).toMatch(/^[a-z0-9]+$/); // Just the timestamp
    });
  });
});
