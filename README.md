# Asset Management Client

A TypeScript client library for the Asset Management System that enables applications to consume version-controlled assets (configuration files, prompts, content files) from a PostgreSQL database.

## Features

- **Automatic Asset Registration**: Applications automatically register their usage of assets
- **Version Management**: Automatic updates when master assets change
- **Multiple Format Support**: JSON, YAML, Properties files, and raw text
- **Caching**: Built-in caching with configurable TTL
- **Resilience**: Fallback support for offline scenarios
- **Retry Logic**: Automatic retry on transient failures
- **Type Safety**: Full TypeScript support with type definitions

## Installation

```bash
npm install @asset-management/client
```

## Quick Start

### Basic Usage

```typescript
import { AssetClient } from '@asset-management/client';

const client = new AssetClient({
  connectionString: process.env.DATABASE_URL!,
  userKey: 'my-application',
});

// Get an asset
const configData = await client.getAsset(
  'github.com/myorg/configs',
  'apps/myapp/config.json'
);

// Parse the JSON
const config = JSON.parse(configData);
console.log(config);

// Close when done
await client.close();
```

### Configuration Manager

For working with configuration files:

```typescript
import { ConfigurationManager } from '@asset-management/client';

const configManager = new ConfigurationManager({
  connectionString: process.env.DATABASE_URL!,
  userKey: 'my-application',
});

// Get typed configuration
interface AppConfig {
  database: {
    host: string;
    port: number;
  };
  features: {
    [key: string]: boolean;
  };
}

const config = await configManager.getConfig<AppConfig>(
  'myorg/configs/apps/myapp/config.json'
);

console.log(config.database.host);

// Get feature flags
const flags = await configManager.getFeatureFlags(
  'myorg/configs/features/flags.json'
);

if (flags.newCheckoutFlow) {
  // Use new checkout flow
}
```

### Prompt Manager

For AI/LLM applications:

```typescript
import { PromptManager } from '@asset-management/client';

const promptManager = new PromptManager(
  {
    connectionString: process.env.DATABASE_URL!,
    userKey: 'chatbot-service',
  },
  'github.com/myorg/prompts' // default registry
);

// Get a prompt with variables
const systemPrompt = await promptManager.getSystemPrompt('chat-assistant', {
  company: 'ACME Corp',
  supportEmail: 'support@acme.com',
});

// Get a specific prompt
const welcomeMessage = await promptManager.getPrompt('welcome-message', {
  userName: 'John',
  date: new Date().toLocaleDateString(),
});

// Get a chain of prompts
const analysisChain = await promptManager.getPromptChain('data-analysis');
```

### Resilient Client with Fallback

For mission-critical applications:

```typescript
import { ResilientAssetClient } from '@asset-management/client';

const resilientClient = new ResilientAssetClient({
  connectionString: process.env.DATABASE_URL!,
  userKey: 'critical-service',
});

// Preload critical assets
await resilientClient.preloadAssets([
  { registry: 'github.com/myorg/configs', key: 'critical/config.json' },
  { registry: 'github.com/myorg/configs', key: 'critical/fallback.json' },
]);

// Get asset with automatic fallback
const config = await resilientClient.getAssetWithFallback(
  'github.com/myorg/configs',
  'critical/config.json'
);

// Check status
const status = resilientClient.getFallbackStatus();
console.log(`Offline mode: ${status.isOffline}`);
console.log(`Cached assets: ${status.cachedAssets}`);
```

## API Reference

### AssetClient

The core client for retrieving assets from the database.

```typescript
class AssetClient {
  constructor(config: AssetClientConfig);
  getAsset(assetRegistry: string, assetKey: string): Promise<string>;
  testConnection(): Promise<boolean>;
  close(): Promise<void>;
}
```

**Configuration Options:**
- `connectionString`: PostgreSQL connection string
- `userKey`: Unique identifier for your application
- `maxRetries`: Maximum retry attempts (default: 3)
- `retryDelay`: Base delay between retries in ms (default: 1000)
- `connectionTimeout`: Database connection timeout in ms (default: 10000)

### ConfigurationManager

Specialized client for configuration files with automatic parsing and caching.

```typescript
class ConfigurationManager {
  constructor(config: AssetClientConfig, cacheTTL?: number);
  getConfig<T>(configPath: string): Promise<T>;
  getConfigNoCache<T>(configPath: string): Promise<T>;
  getFeatureFlags(flagsPath: string): Promise<Record<string, boolean>>;
  getFeatureFlag(flagsPath: string, flagName: string, defaultValue?: boolean): Promise<boolean>;
  clearCache(configPath?: string): void;
  setCacheTTL(ttl: number): void;
  close(): Promise<void>;
}
```

### PromptManager

Specialized client for managing prompts with variable substitution.

```typescript
class PromptManager {
  constructor(config: AssetClientConfig, defaultRegistry?: string, cacheTTL?: number);
  getPrompt(promptName: string, variables?: Record<string, string>, registry?: string): Promise<string>;
  getSystemPrompt(promptName?: string, context?: Record<string, string>, registry?: string): Promise<string>;
  getPromptChain(chainName: string, globalVariables?: Record<string, string>, registry?: string): Promise<string[]>;
  getPrompts(promptNames: string[], variables?: Record<string, string>, registry?: string): Promise<Map<string, string>>;
  clearCache(promptName?: string, registry?: string): void;
  close(): Promise<void>;
}
```

### ResilientAssetClient

Enhanced client with offline fallback capabilities.

```typescript
class ResilientAssetClient extends AssetClient {
  constructor(config: AssetClientConfig, healthCheckIntervalMs?: number);
  getAssetWithFallback(assetRegistry: string, assetKey: string): Promise<string>;
  preloadAssets(assets: Array<{ registry: string; key: string }>): Promise<void>;
  getFallbackStatus(): FallbackStatus;
  clearFallbackCache(assetKey?: string): void;
  exportFallbackCache(): string;
  importFallbackCache(data: string): void;
}
```

## PostgreSQL Compatibility

The library includes built-in PostgreSQL type safety with explicit parameter type casting to ensure compatibility across all PostgreSQL versions (12+). All queries use proper type annotations to prevent parameter type inference errors.

### Testing Database Connection

```typescript
const client = new AssetClient({
  connectionString: process.env.DATABASE_URL!,
  userKey: 'my-app',
});

// Test connection and parameter handling
const isConnected = await client.testConnection();
if (!isConnected) {
  console.error('Database connection failed');
}
```

### Advanced Query Building (Optional)

For advanced users who need custom queries, the library exports utility classes:

```typescript
import { QueryBuilder, PreparedStatements } from '@asset-management/client';

// Use QueryBuilder for type-safe parameter casting
const query = QueryBuilder.buildAssetQuery({ includeUserKey: true });
// Result: SELECT ... WHERE asset_registry = $1::text AND asset_key = $2::text ...

// Access pre-defined queries with proper type casting
const statements = new PreparedStatements();
const updateQuery = statements.get('updateRegistration');
```

## Error Handling

The library provides specific error types for different scenarios:

```typescript
import { AssetNotFoundError, DatabaseConnectionError } from '@asset-management/client';

try {
  const asset = await client.getAsset('github.com/org/repo', 'missing.json');
} catch (error) {
  if (error instanceof AssetNotFoundError) {
    console.error('Asset does not exist in the system');
  } else if (error instanceof DatabaseConnectionError) {
    console.error('Failed to connect to database');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Best Practices

### 1. Application Identification

Use meaningful, unique `userKey` values:

```typescript
// Good
const client = new AssetClient({
  connectionString: DATABASE_URL,
  userKey: 'payment-service-prod',
});

// Better - include environment
const client = new AssetClient({
  connectionString: DATABASE_URL,
  userKey: `payment-service-${process.env.NODE_ENV}`,
});
```

### 2. Connection Pooling

The library uses pg's connection pooling internally. For high-traffic applications, consider the connection limits:

```typescript
// The library manages the pool internally
const client = new AssetClient({
  connectionString: DATABASE_URL,
  userKey: 'high-traffic-app',
});

// Make sure to close when shutting down
process.on('SIGTERM', async () => {
  await client.close();
  process.exit(0);
});
```

### 3. Caching Strategy

Configure cache TTL based on your update frequency:

```typescript
// For frequently changing configs - 1 minute TTL
const configManager = new ConfigurationManager(config, 60000);

// For stable configs - 1 hour TTL
const stableConfigManager = new ConfigurationManager(config, 3600000);

// For prompts - 5 minutes default is usually good
const promptManager = new PromptManager(config);
```

### 4. Error Recovery

Implement proper error handling and fallback strategies:

```typescript
async function getConfigWithFallback(path: string, defaultConfig: any) {
  try {
    return await configManager.getConfig(path);
  } catch (error) {
    console.error(`Failed to load config from ${path}:`, error);
    
    // Use local fallback
    return defaultConfig;
  }
}
```

## Environment Variables

Required environment variables for your application:

```bash
DATABASE_URL=postgresql://user:password@host:5432/asset_db
NODE_ENV=production
```

## Testing

The library includes comprehensive test coverage. To run tests:

```bash
npm test
```

For test coverage:

```bash
npm run test:coverage
```

## Migration Guide

### From File-Based Configuration

Before:
```typescript
import fs from 'fs';
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
```

After:
```typescript
const config = await configManager.getConfig<AppConfig>('myorg/configs/app/config.json');
```

### From Environment Variables

Before:
```typescript
const apiKey = process.env.API_KEY || 'default-key';
const apiUrl = process.env.API_URL || 'https://api.example.com';
```

After:
```typescript
interface ApiConfig {
  apiKey: string;
  apiUrl: string;
}

const config = await configManager.getConfig<ApiConfig>('myorg/configs/api/config.json');
```

## License

MIT