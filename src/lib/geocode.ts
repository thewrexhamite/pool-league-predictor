/**
 * Geocoding utility using Nominatim (OpenStreetMap)
 * Free, no API key required. Suitable for low-volume onboarding use.
 */

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

const SUFFIXES_TO_STRIP = [
  /\s+pool\s+league$/i,
  /\s+pool\s+association$/i,
  /\s+pool\s+club$/i,
  /\s+&\s+district$/i,
  /\s+and\s+district$/i,
];

/**
 * Extract city/town name from a league name by stripping common suffixes.
 * e.g. "Wrexham & District Pool League" → "Wrexham"
 */
export function extractLocationFromLeagueName(leagueName: string): string {
  let location = leagueName.trim();
  for (const suffix of SUFFIXES_TO_STRIP) {
    location = location.replace(suffix, '');
  }
  return location.trim();
}

/**
 * Geocode a league name to coordinates using Nominatim.
 * Extracts the city/town from the league name and searches for it in the UK.
 */
export async function geocodeLeagueName(leagueName: string): Promise<GeocodeResult | null> {
  const location = extractLocationFromLeagueName(leagueName);

  const params = new URLSearchParams({
    q: `${location}, UK`,
    format: 'json',
    limit: '1',
  });

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: {
        'User-Agent': 'PoolLeaguePredictor/1.0 (league onboarding geocoder)',
      },
    });

    if (!response.ok) {
      console.warn(`Nominatim returned ${response.status} for "${location}"`);
      return null;
    }

    const results: NominatimResult[] = await response.json();

    if (results.length === 0) {
      console.warn(`No geocode results for "${location}"`);
      return null;
    }

    const result = results[0];
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
    };
  } catch (error) {
    console.warn(`Geocoding failed for "${location}":`, error);
    return null;
  }
}
