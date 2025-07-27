import { 
  AssetClient, 
  ConfigurationManager, 
  PromptManager,
  ResilientAssetClient 
} from '../src';

// Example 1: Basic Asset Client Usage
async function basicExample() {
  const client = new AssetClient({
    connectionString: process.env.DATABASE_URL!,
    userKey: 'example-app',
  });

  try {
    // Get a configuration file
    const configData = await client.getAsset(
      'github.com/myorg/configs',
      'apps/example/config.json'
    );
    
    const config = JSON.parse(configData);
    console.log('Configuration loaded:', config);
  } finally {
    await client.close();
  }
}

// Example 2: Configuration Manager
async function configExample() {
  const configManager = new ConfigurationManager({
    connectionString: process.env.DATABASE_URL!,
    userKey: 'example-app',
  });

  try {
    // Get typed configuration
    interface AppConfig {
      apiUrl: string;
      timeout: number;
      features: {
        darkMode: boolean;
        beta: boolean;
      };
    }

    const config = await configManager.getConfig<AppConfig>(
      'myorg/configs/apps/example/config.json'
    );

    console.log('API URL:', config.apiUrl);
    console.log('Dark mode enabled:', config.features.darkMode);

    // Get feature flags
    const flags = await configManager.getFeatureFlags('myorg/configs/features.json');
    console.log('Feature flags:', flags);
  } finally {
    await configManager.close();
  }
}

// Example 3: Prompt Manager for AI Applications
async function promptExample() {
  const promptManager = new PromptManager(
    {
      connectionString: process.env.DATABASE_URL!,
      userKey: 'ai-assistant',
    },
    'github.com/myorg/prompts'
  );

  try {
    // Get system prompt with variables
    const systemPrompt = await promptManager.getSystemPrompt('assistant', {
      company: 'ACME Corp',
      role: 'Customer Support',
    });

    console.log('System prompt:', systemPrompt);

    // Get a specific prompt template
    const emailTemplate = await promptManager.getPrompt('email-response', {
      customerName: 'John Doe',
      issueType: 'billing',
    });

    console.log('Email template:', emailTemplate);
  } finally {
    await promptManager.close();
  }
}

// Example 4: Resilient Client with Fallback
async function resilientExample() {
  const resilientClient = new ResilientAssetClient({
    connectionString: process.env.DATABASE_URL!,
    userKey: 'critical-service',
  });

  try {
    // Preload critical assets for offline capability
    await resilientClient.preloadAssets([
      { registry: 'github.com/myorg/configs', key: 'critical/api-config.json' },
      { registry: 'github.com/myorg/configs', key: 'critical/fallback-config.json' },
    ]);

    // Get asset with automatic fallback
    const config = await resilientClient.getAssetWithFallback(
      'github.com/myorg/configs',
      'critical/api-config.json'
    );

    console.log('Configuration:', JSON.parse(config));

    // Check offline status
    const status = resilientClient.getFallbackStatus();
    console.log('System status:', {
      offline: status.isOffline,
      cachedAssets: status.cachedAssets,
    });
  } finally {
    await resilientClient.close();
  }
}

// Run examples
if (require.main === module) {
  (async () => {
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL environment variable is required');
      process.exit(1);
    }

    console.log('=== Basic Asset Client Example ===');
    await basicExample();

    console.log('\n=== Configuration Manager Example ===');
    await configExample();

    console.log('\n=== Prompt Manager Example ===');
    await promptExample();

    console.log('\n=== Resilient Client Example ===');
    await resilientExample();
  })().catch(console.error);
}