import { ConfigurationManager } from '../src/managers/ConfigurationManager';
import { AssetClient } from '../src/core/AssetClient';

jest.mock('../src/core/AssetClient');

describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager;
  let mockAssetClient: jest.Mocked<AssetClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAssetClient = {
      getAsset: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    } as any;
    
    (AssetClient as jest.MockedClass<typeof AssetClient>).mockImplementation(() => mockAssetClient);
    
    configManager = new ConfigurationManager({
      connectionString: 'postgresql://test:test@localhost:5432/test',
      userKey: 'test-app',
    }, 100); // Short TTL for testing
  });

  afterEach(async () => {
    await configManager.close();
  });

  describe('getConfig', () => {
    it('should parse JSON configuration', async () => {
      const jsonData = '{"database": {"host": "localhost", "port": 5432}}';
      mockAssetClient.getAsset.mockResolvedValue(jsonData);

      const config = await configManager.getConfig('myorg/configs/app/config.json');

      expect(mockAssetClient.getAsset).toHaveBeenCalledWith(
        'github.com/myorg',
        'configs/app/config.json'
      );
      expect(config).toEqual({
        database: { host: 'localhost', port: 5432 }
      });
    });

    it('should parse YAML configuration', async () => {
      const yamlData = `
database:
  host: localhost
  port: 5432
features:
  newUI: true
  darkMode: false`;
      
      mockAssetClient.getAsset.mockResolvedValue(yamlData);

      const config = await configManager.getConfig('myorg/configs/app/config.yaml');

      expect(config).toEqual({
        database: { host: 'localhost', port: 5432 },
        features: { newUI: true, darkMode: false }
      });
    });

    it('should parse properties files', async () => {
      const propertiesData = `
# Database configuration
database.host=localhost
database.port=5432
database.name=myapp

# Feature flags
feature.newUI=true
feature.darkMode=false`;

      mockAssetClient.getAsset.mockResolvedValue(propertiesData);

      const config = await configManager.getConfig('myorg/configs/app/config.properties');

      expect(config).toEqual({
        'database.host': 'localhost',
        'database.port': '5432',
        'database.name': 'myapp',
        'feature.newUI': 'true',
        'feature.darkMode': 'false'
      });
    });

    it('should cache configurations', async () => {
      const jsonData = '{"cached": true}';
      mockAssetClient.getAsset.mockResolvedValue(jsonData);

      // First call
      await configManager.getConfig('myorg/configs/cached.json');
      expect(mockAssetClient.getAsset).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await configManager.getConfig('myorg/configs/cached.json');
      expect(mockAssetClient.getAsset).toHaveBeenCalledTimes(1);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Third call should fetch again
      await configManager.getConfig('myorg/configs/cached.json');
      expect(mockAssetClient.getAsset).toHaveBeenCalledTimes(2);
    });

    it('should throw error for invalid config path', async () => {
      await expect(
        configManager.getConfig('invalid-path')
      ).rejects.toThrow('Invalid config path');
    });
  });

  describe('getFeatureFlags', () => {
    it('should extract feature flags from config', async () => {
      const jsonData = '{"features": {"newUI": true, "darkMode": false, "betaFeature": true}}';
      mockAssetClient.getAsset.mockResolvedValue(jsonData);

      const flags = await configManager.getFeatureFlags('myorg/configs/features.json');

      expect(flags).toEqual({
        newUI: true,
        darkMode: false,
        betaFeature: true
      });
    });

    it('should return empty object when features not present', async () => {
      const jsonData = '{"other": "data"}';
      mockAssetClient.getAsset.mockResolvedValue(jsonData);

      const flags = await configManager.getFeatureFlags('myorg/configs/features.json');

      expect(flags).toEqual({});
    });
  });

  describe('getFeatureFlag', () => {
    it('should return specific feature flag value', async () => {
      const jsonData = '{"features": {"newUI": true, "darkMode": false}}';
      mockAssetClient.getAsset.mockResolvedValue(jsonData);

      const flag = await configManager.getFeatureFlag(
        'myorg/configs/features.json',
        'newUI'
      );

      expect(flag).toBe(true);
    });

    it('should return default value when flag not found', async () => {
      const jsonData = '{"features": {"newUI": true}}';
      mockAssetClient.getAsset.mockResolvedValue(jsonData);

      const flag = await configManager.getFeatureFlag(
        'myorg/configs/features.json',
        'missingFlag',
        false
      );

      expect(flag).toBe(false);
    });

    it('should return default value on error', async () => {
      mockAssetClient.getAsset.mockRejectedValue(new Error('Network error'));

      const flag = await configManager.getFeatureFlag(
        'myorg/configs/features.json',
        'anyFlag',
        true
      );

      expect(flag).toBe(true);
    });
  });

  describe('cache management', () => {
    it('should clear specific cache entry', async () => {
      const jsonData = '{"test": true}';
      mockAssetClient.getAsset.mockResolvedValue(jsonData);

      // Load into cache
      await configManager.getConfig('myorg/configs/test.json');
      expect(mockAssetClient.getAsset).toHaveBeenCalledTimes(1);

      // Clear specific cache
      configManager.clearCache('myorg/configs/test.json');

      // Should fetch again
      await configManager.getConfig('myorg/configs/test.json');
      expect(mockAssetClient.getAsset).toHaveBeenCalledTimes(2);
    });

    it('should clear all cache entries', async () => {
      const jsonData = '{"test": true}';
      mockAssetClient.getAsset.mockResolvedValue(jsonData);

      // Load multiple configs into cache
      await configManager.getConfig('myorg/configs/test1.json');
      await configManager.getConfig('myorg/configs/test2.json');
      expect(mockAssetClient.getAsset).toHaveBeenCalledTimes(2);

      // Clear all cache
      configManager.clearCache();

      // Should fetch both again
      await configManager.getConfig('myorg/configs/test1.json');
      await configManager.getConfig('myorg/configs/test2.json');
      expect(mockAssetClient.getAsset).toHaveBeenCalledTimes(4);
    });
  });
});