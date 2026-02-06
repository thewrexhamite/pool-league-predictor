/**
 * Player Name Normalization Module
 *
 * Provides shared logic for normalizing player names across scraping and sync scripts.
 * Handles:
 * - HTML entity decoding (&#x27; → ')
 * - Whitespace normalization (double spaces, leading/trailing)
 * - Alias resolution (nickname → canonical name)
 * - Team-specific disambiguation (same name, different teams → bracketed names)
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

export interface PlayerCorrections {
  /** Team-specific disambiguations: "Name|Team" → "Name (Location)" */
  disambiguations: Record<string, string>;
  /** Aliases: variant spelling → canonical name */
  aliases: Record<string, string>;
}

// ============================================================================
// Corrections Loading
// ============================================================================

let cachedCorrections: PlayerCorrections | null = null;

/**
 * Load player corrections from data/player-corrections.json.
 * Results are cached for performance.
 */
export function loadCorrections(dataDir?: string): PlayerCorrections {
  if (cachedCorrections) {
    return cachedCorrections;
  }

  const dir = dataDir || path.join(__dirname, '..', 'data');
  const filePath = path.join(dir, 'player-corrections.json');

  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      cachedCorrections = JSON.parse(content) as PlayerCorrections;
    } else {
      // Return empty corrections if file doesn't exist
      cachedCorrections = { disambiguations: {}, aliases: {} };
    }
  } catch (error) {
    console.warn(`Warning: Failed to load player corrections from ${filePath}:`, error);
    cachedCorrections = { disambiguations: {}, aliases: {} };
  }

  return cachedCorrections;
}

/**
 * Clear the cached corrections (useful for testing or after file updates).
 */
export function clearCorrectionsCache(): void {
  cachedCorrections = null;
}

// ============================================================================
// Normalization Functions
// ============================================================================

/**
 * Decode common HTML entities found in scraped data.
 */
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

/**
 * Normalize whitespace in a name:
 * - Collapse multiple spaces to single space
 * - Trim leading/trailing whitespace
 */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Apply alias corrections to a name.
 * Returns the canonical name if an alias exists, otherwise the original.
 */
export function applyAlias(name: string, corrections: PlayerCorrections): string {
  return corrections.aliases[name] || name;
}

/**
 * Apply team-specific disambiguation.
 * If the player name + team combination has a disambiguation entry,
 * returns the disambiguated name (e.g., "Rich Williams (Gresford)").
 */
export function applyDisambiguation(
  name: string,
  team: string,
  corrections: PlayerCorrections
): string {
  const key = `${name}|${team}`;
  return corrections.disambiguations[key] || name;
}

/**
 * Normalize a player name with optional team context.
 *
 * Processing order:
 * 1. Decode HTML entities
 * 2. Normalize whitespace
 * 3. Apply alias (if any)
 * 4. Apply team disambiguation (if team provided and entry exists)
 *
 * @param rawName - The raw player name from scraping
 * @param team - Optional team name for disambiguation
 * @param dataDir - Optional path to data directory containing corrections file
 */
export function normalizePlayerName(
  rawName: string,
  team?: string,
  dataDir?: string
): string {
  if (!rawName || rawName === 'Unknown') {
    return rawName;
  }

  const corrections = loadCorrections(dataDir);

  // Step 1: Decode HTML entities
  let name = decodeHtmlEntities(rawName);

  // Step 2: Normalize whitespace
  name = normalizeWhitespace(name);

  // Step 3: Apply alias
  name = applyAlias(name, corrections);

  // Step 4: Apply team disambiguation (if team provided)
  if (team) {
    name = applyDisambiguation(name, team, corrections);
  }

  return name;
}

/**
 * Split a player field (which may contain doubles pairs) and normalize each name.
 *
 * @param playerField - Raw player field (e.g., "James Collier & Shaun Jones")
 * @param team - Team name for disambiguation
 * @param dataDir - Optional path to data directory
 * @returns Array of normalized player names
 */
export function splitAndNormalizePlayerNames(
  playerField: string,
  team?: string,
  dataDir?: string
): string[] {
  if (!playerField || playerField === 'Unknown') {
    return [];
  }

  // Split on " & " for doubles pairs
  const rawNames = playerField.split(/\s*&\s*/).map(n => n.trim());

  // Normalize each name
  return rawNames
    .filter(n => n.length > 0 && n !== 'Unknown')
    .map(n => normalizePlayerName(n, team, dataDir));
}
