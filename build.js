const fs = require('fs');

// Read the data files
const resultsLine = fs.readFileSync('/tmp/results_line.txt', 'utf8').trim();
const fixturesLine = fs.readFileSync('/tmp/fixtures_line.txt', 'utf8').trim();
const playersLine = fs.readFileSync('/tmp/players_line.txt', 'utf8').trim();
const rostersLine = fs.readFileSync('/tmp/rosters_line.txt', 'utf8').trim();
const players2526Line = fs.readFileSync('/tmp/players2526_line.txt', 'utf8').trim();

// Read the app code template
const appCode = fs.readFileSync('app_code.html', 'utf8');

// Insert data into template
const output = appCode.replace('/* DATA_PLACEHOLDER */',
    resultsLine + '\n' + fixturesLine + '\n' + playersLine + '\n' + rostersLine + '\n' + players2526Line);

fs.writeFileSync('index.html', output);
console.log('Written index.html:', fs.statSync('index.html').size, 'bytes');
console.log('Lines:', output.split('\n').length);
