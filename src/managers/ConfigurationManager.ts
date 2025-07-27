import { parse as parseYaml } from 'yaml';
import { AssetClient } from '../core/AssetClient';
import { AssetClientConfig, CacheEntry } from '../types';

export class ConfigurationManager {
  private assetClient: AssetClient;
  private cache: Map<string, CacheEntry> = new Map();
  private cacheTTL: number;

  constructor(config: AssetClientConfig, cacheTTL: number = 60000) {
    this.assetClient = new AssetClient(config);
    this.cacheTTL = cacheTTL;
  }

  /**
   * Get configuration with caching and automatic parsing
   */
  async getConfig<T = unknown>(configPath: string): Promise<T> {
    const cacheKey = configPath;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data as T;
    }

    const [registry, ...pathParts] = configPath.split('/');
    if (pathParts.length === 0) {
      throw new Error(`Invalid config path: ${configPath}`);
    }
    
    const assetKey = pathParts.join('/');
    const registryUrl = `github.com/${registry}`;
    
    const configData = await this.assetClient.getAsset(registryUrl, assetKey);
    
    const parsed = this.parseConfigData(assetKey, configData);
    this.cache.set(cacheKey, { data: parsed, timestamp: Date.now() });
    
    return parsed as T;
  }

  /**
   * Get configuration without caching
   */
  async getConfigNoCache<T = unknown>(configPath: string): Promise<T> {
    const [registry, ...pathParts] = configPath.split('/');
    if (pathParts.length === 0) {
      throw new Error(`Invalid config path: ${configPath}`);
    }
    
    const assetKey = pathParts.join('/');
    const registryUrl = `github.com/${registry}`;
    
    const configData = await this.assetClient.getAsset(registryUrl, assetKey);
    return this.parseConfigData(assetKey, configData) as T;
  }

  /**
   * Clear cache for a specific config or all configs
   */
  clearCache(configPath?: string): void {
    if (configPath) {
      this.cache.delete(configPath);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Set cache TTL
   */
  setCacheTTL(ttl: number): void {
    this.cacheTTL = ttl;
  }

  /**
   * Get feature flags from a JSON configuration
   */
  async getFeatureFlags(flagsPath: string): Promise<Record<string, boolean>> {
    const config = await this.getConfig<{ features?: Record<string, boolean> }>(flagsPath);
    return config.features ?? {};
  }

  /**
   * Get a specific feature flag value
   */
  async getFeatureFlag(flagsPath: string, flagName: string, defaultValue: boolean = false): Promise<boolean> {
    try {
      const flags = await this.getFeatureFlags(flagsPath);
      return flags[flagName] ?? defaultValue;
    } catch (error) {
      console.error(`Failed to get feature flag ${flagName}:`, error);
      return defaultValue;
    }
  }

  /**
   * Close the underlying database connection
   */
  async close(): Promise<void> {
    await this.assetClient.close();
  }

  private parseConfigData(assetKey: string, data: string): unknown {
    const lowerKey = assetKey.toLowerCase();
    
    if (lowerKey.endsWith('.json')) {
      return JSON.parse(data);
    } else if (lowerKey.endsWith('.yaml') || lowerKey.endsWith('.yml')) {
      return parseYaml(data);
    } else if (lowerKey.endsWith('.properties')) {
      return this.parseProperties(data);
    } else {
      // Return raw data for unknown types
      return data;
    }
  }

  private parseProperties(data: string): Record<string, string> {
    const properties: Record<string, string> = {};
    const lines = data.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('!')) {
        const index = trimmed.indexOf('=');
        if (index > 0) {
          const key = trimmed.substring(0, index).trim();
          const value = trimmed.substring(index + 1).trim();
          properties[key] = value;
        }
      }
    }
    
    return properties;
  }
}