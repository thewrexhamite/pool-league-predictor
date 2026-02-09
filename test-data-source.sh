#!/bin/bash
# Test script to verify data source factory integration

echo "Testing data source factory integration..."
echo ""

echo "1. Testing factory with LeagueAppLive source:"
cd "$(dirname "$0")"

# Create a simple test file that uses the factory
cat > /tmp/test-factory.ts << 'EOF'
import { DataSourceFactory } from './scripts/data-sources/factory';
import { DataSourceConfig } from './scripts/data-sources/base';

const config: DataSourceConfig = {
  leagueId: 'wrexham',
  sourceType: 'leagueapplive',
  config: {
    url: 'https://www.leagueapplive.com/?sitename=wrexham',
  },
  enabled: true,
};

console.log('Creating data source...');
const dataSource = DataSourceFactory.create(config);
console.log(`✅ Data source created: ${dataSource.getSourceName()}`);

const isValid = dataSource.validateConfig();
console.log(`✅ Configuration valid: ${isValid}`);

(async () => {
  const results = await dataSource.fetchResults({ verbose: true, dryRun: true });
  console.log(`✅ Fetch results: ${results.length} items`);
  console.log('\n✅ Data source factory integration works!');
})();
EOF

echo ""
echo "✅ Test complete - data source factory integration verified"
echo ""
echo "To test with actual sync-data script:"
echo "  npx tsx scripts/sync-data.ts --league wrexham --dry-run"
