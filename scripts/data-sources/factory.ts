#!/usr/bin/env npx tsx

/**
 * Data Source Factory
 *
 * Creates data source instances based on configuration.
 * Supports multiple data source types (LeagueAppLive, RackEmApp, Manual, API, etc.)
 *
 * Usage:
 *   npx tsx scripts/data-sources/factory.ts --help
 *   npx tsx scripts/data-sources/factory.ts --list
 *   npx tsx scripts/data-sources/factory.ts --test <sourceType>
 *
 * Options:
 *   --help              Show this help message
 *   --list              List available data source types
 *   --test <type>       Test a specific data source type
 *   --config <json>     Data source configuration as JSON
 *   --verbose           Enable verbose logging
 */

import {
  DataSource,
  DataSourceConfig,
  FetchOptions,
} from './base';
import { LeagueAppLiveDataSource } from './leagueapplive';

// ============================================================================
// Data Source Registry
// ============================================================================

/**
 * Registry of available data source types.
 * Each entry maps a source type to its implementation class.
 */
const DATA_SOURCE_REGISTRY: Map<string, {
  name: string;
  description: string;
  configSchema: Record<string, any>;
  // Constructor will be added when implementations exist
  create?: (config: DataSourceConfig) => DataSource;
}> = new Map([
  ['leagueapplive', {
    name: 'LeagueAppLive',
    description: 'Fetch data from LeagueAppLive platform (used by many UK pool leagues)',
    configSchema: {
      url: { type: 'string', required: true, description: 'League page URL on LeagueAppLive' },
      leagueId: { type: 'string', required: false, description: 'League ID on LeagueAppLive' },
    },
    create: (config: DataSourceConfig) => new LeagueAppLiveDataSource(config),
  }],
  ['rackemapp', {
    name: 'RackEmApp',
    description: 'Fetch data from RackEmApp platform',
    configSchema: {
      leagueId: { type: 'string', required: true, description: 'League ID on RackEmApp' },
      divisions: { type: 'array', required: false, description: 'Division URLs to scrape' },
    },
  }],
  ['manual', {
    name: 'Manual Upload',
    description: 'Manually uploaded data files (CSV, JSON, etc.)',
    configSchema: {
      dataDir: { type: 'string', required: false, description: 'Directory containing data files' },
    },
  }],
  ['api', {
    name: 'Custom API',
    description: 'Fetch data from a custom API endpoint',
    configSchema: {
      endpoint: { type: 'string', required: true, description: 'API endpoint URL' },
      apiKey: { type: 'string', required: false, description: 'API authentication key' },
    },
  }],
]);

// ============================================================================
// Factory Class
// ============================================================================

/**
 * Factory for creating data source instances
 */
export class DataSourceFactory {
  /**
   * Create a data source instance from configuration
   */
  static create(config: DataSourceConfig): DataSource {
    const sourceType = config.sourceType.toLowerCase();
    const registry = DATA_SOURCE_REGISTRY.get(sourceType);

    if (!registry) {
      throw new Error(
        `Unknown data source type: ${config.sourceType}\n` +
        `Available types: ${Array.from(DATA_SOURCE_REGISTRY.keys()).join(', ')}`
      );
    }

    if (!registry.create) {
      throw new Error(
        `Data source type '${config.sourceType}' is registered but not yet implemented.\n` +
        `Implementation pending in scripts/data-sources/${sourceType}.ts`
      );
    }

    return registry.create(config);
  }

  /**
   * List all available data source types
   */
  static listAvailable(): void {
    console.log('\n📊 Available Data Sources:\n');

    DATA_SOURCE_REGISTRY.forEach((info, type) => {
      console.log(`  ${type}`);
      console.log(`    Name: ${info.name}`);
      console.log(`    Description: ${info.description}`);
      console.log(`    Status: ${info.create ? '✅ Implemented' : '⏳ Pending'}`);
      console.log(`    Configuration:`);

      Object.entries(info.configSchema).forEach(([key, schema]: [string, any]) => {
        const required = schema.required ? '(required)' : '(optional)';
        console.log(`      - ${key}: ${schema.type} ${required}`);
        console.log(`        ${schema.description}`);
      });

      console.log('');
    });
  }

  /**
   * Validate a data source configuration
   */
  static validate(config: DataSourceConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const sourceType = config.sourceType.toLowerCase();
    const registry = DATA_SOURCE_REGISTRY.get(sourceType);

    if (!registry) {
      errors.push(`Unknown data source type: ${config.sourceType}`);
      return { valid: false, errors };
    }

    // Validate required fields
    Object.entries(registry.configSchema).forEach(([key, schema]: [string, any]) => {
      if (schema.required && !config.config[key]) {
        errors.push(`Missing required field: ${key}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get information about a data source type
   */
  static getInfo(sourceType: string): any {
    return DATA_SOURCE_REGISTRY.get(sourceType.toLowerCase());
  }

  /**
   * Check if a data source type is available
   */
  static isAvailable(sourceType: string): boolean {
    return DATA_SOURCE_REGISTRY.has(sourceType.toLowerCase());
  }

  /**
   * Check if a data source type is implemented
   */
  static isImplemented(sourceType: string): boolean {
    const registry = DATA_SOURCE_REGISTRY.get(sourceType.toLowerCase());
    return registry ? !!registry.create : false;
  }
}

// ============================================================================
// CLI Interface
// ============================================================================

/**
 * Parse command-line arguments
 */
function parseArgs(): Record<string, any> {
  const args = process.argv.slice(2);
  const parsed: Record<string, any> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help') {
      parsed.help = true;
    } else if (arg === '--list') {
      parsed.list = true;
    } else if (arg === '--verbose') {
      parsed.verbose = true;
    } else if (arg === '--test' && args[i + 1]) {
      parsed.test = args[i + 1];
      i++;
    } else if (arg === '--config' && args[i + 1]) {
      try {
        parsed.config = JSON.parse(args[i + 1]);
      } catch (e) {
        console.error('Error parsing --config JSON:', e);
        process.exit(1);
      }
      i++;
    }
  }

  return parsed;
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
📚 Data Source Factory - Help

Usage:
  npx tsx scripts/data-sources/factory.ts [options]

Options:
  --help              Show this help message
  --list              List available data source types with configuration details
  --test <type>       Test a specific data source type (validates it's available)
  --config <json>     Validate a data source configuration (JSON string)
  --verbose           Enable verbose logging

Data Source Types:
  - leagueapplive     LeagueAppLive platform (many UK pool leagues)
  - rackemapp         RackEmApp platform
  - manual            Manual data uploads (CSV, JSON)
  - api               Custom API integration

Examples:
  # List all available data sources
  npx tsx scripts/data-sources/factory.ts --list

  # Test if a data source type is available
  npx tsx scripts/data-sources/factory.ts --test leagueapplive

  # Validate a configuration
  npx tsx scripts/data-sources/factory.ts --config '{"leagueId":"wrexham","sourceType":"leagueapplive","config":{"url":"https://example.com"}}'

For more information, see docs/multi-league-setup.md
`);
}

/**
 * Test a data source type
 */
function testDataSource(sourceType: string, verbose: boolean): void {
  console.log(`\n🔍 Testing data source: ${sourceType}\n`);

  const available = DataSourceFactory.isAvailable(sourceType);
  const implemented = DataSourceFactory.isImplemented(sourceType);
  const info = DataSourceFactory.getInfo(sourceType);

  if (!available) {
    console.log(`❌ Data source '${sourceType}' is not available`);
    console.log(`\nAvailable types: ${Array.from(DATA_SOURCE_REGISTRY.keys()).join(', ')}`);
    process.exit(1);
  }

  console.log(`✅ Data source '${sourceType}' is available`);
  console.log(`   Name: ${info.name}`);
  console.log(`   Description: ${info.description}`);
  console.log(`   Status: ${implemented ? '✅ Implemented' : '⏳ Pending implementation'}`);

  console.log(`\n📋 Configuration Schema:`);
  Object.entries(info.configSchema).forEach(([key, schema]: [string, any]) => {
    const required = schema.required ? '(required)' : '(optional)';
    console.log(`   ${key}: ${schema.type} ${required}`);
    console.log(`      ${schema.description}`);
  });

  if (!implemented) {
    console.log(`\n⚠️  Implementation pending in scripts/data-sources/${sourceType}.ts`);
    console.log(`   The data source is registered but not yet implemented.`);
  }

  console.log('');
}

/**
 * Validate a configuration
 */
function validateConfig(config: DataSourceConfig, verbose: boolean): void {
  console.log(`\n🔍 Validating configuration:\n`);
  console.log(JSON.stringify(config, null, 2));

  const result = DataSourceFactory.validate(config);

  if (result.valid) {
    console.log(`\n✅ Configuration is valid`);

    if (DataSourceFactory.isImplemented(config.sourceType)) {
      console.log(`✅ Data source '${config.sourceType}' is implemented and ready to use`);
    } else {
      console.log(`⏳ Data source '${config.sourceType}' is valid but not yet implemented`);
    }
  } else {
    console.log(`\n❌ Configuration is invalid:`);
    result.errors.forEach(error => {
      console.log(`   - ${error}`);
    });
    process.exit(1);
  }

  console.log('');
}

// ============================================================================
// Main
// ============================================================================

if (require.main === module) {
  const args = parseArgs();

  if (args.help || Object.keys(args).length === 0) {
    showHelp();
  } else if (args.list) {
    DataSourceFactory.listAvailable();
  } else if (args.test) {
    testDataSource(args.test, args.verbose || false);
  } else if (args.config) {
    validateConfig(args.config, args.verbose || false);
  }
}
