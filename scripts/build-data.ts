import * as fs from 'fs';
import * as path from 'path';

/**
 * Build script: reads data files from /tmp/ and writes structured JSON to data/
 * Replaces the old build.js that embedded data directly into HTML.
 *
 * Usage: npx tsx scripts/build-data.ts
 */

const DATA_DIR = path.join(__dirname, '..', 'data');

function extractJSON(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf8').trim();
  const eqIdx = content.indexOf('=');
  let json = content.substring(eqIdx + 1).trim();
  if (json.endsWith(';')) json = json.slice(0, -1).trim();
  return json;
}

function main() {
  const files: [string, string][] = [
    ['/tmp/results_line.txt', 'results.json'],
    ['/tmp/fixtures_line.txt', 'fixtures.json'],
    ['/tmp/players_line.txt', 'players.json'],
    ['/tmp/rosters_line.txt', 'rosters.json'],
    ['/tmp/players2526_line.txt', 'players2526.json'],
  ];

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  for (const [src, dest] of files) {
    if (!fs.existsSync(src)) {
      console.error(`Source file not found: ${src}`);
      continue;
    }
    const json = extractJSON(src);
    const outPath = path.join(DATA_DIR, dest);
    fs.writeFileSync(outPath, json);
    const stat = fs.statSync(outPath);
    console.log(`  ${dest}: ${(stat.size / 1024).toFixed(1)} KB`);
  }

  console.log('Data files updated successfully.');
}

main();
