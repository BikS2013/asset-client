import { AssetClient } from './AssetClient';
import { AssetClientConfig, DatabaseConnectionError } from '../types';

interface FallbackEntry {
  data: string;
  lastUpdated: Date;
}

export class ResilientAssetClient extends AssetClient {
  private fallbackCache: Map<string, FallbackEntry> = new Map();
  private isOfflineMode: boolean = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private healthCheckIntervalMs: number;

  constructor(config: AssetClientConfig, healthCheckIntervalMs: number = 30000) {
    super(config);
    this.healthCheckIntervalMs = healthCheckIntervalMs;
    this.startHealthCheck();
  }

  /**
   * Get asset with automatic fallback to cached version
   */
  async getAssetWithFallback(assetRegistry: string, assetKey: string): Promise<string> {
    const cacheKey = `${assetRegistry}/${assetKey}`;
    
    try {
      const data = await this.getAsset(assetRegistry, assetKey);
      
      // Update fallback cache on success
      this.fallbackCache.set(cacheKey, {
        data,
        lastUpdated: new Date()
      });
      
      // Mark as online if we were offline
      if (this.isOfflineMode) {
        this.isOfflineMode = false;
        console.warn('Asset client is back online');
      }
      
      return data;
    } catch (error) {
      // Use cached version if available
      const cached = this.fallbackCache.get(cacheKey);
      
      if (cached) {
        console.warn(
          `Using cached fallback for ${assetRegistry}/${assetKey}`,
          `(last updated: ${cached.lastUpdated.toISOString()})`
        );
        
        // Mark as offline if database connection failed
        if (error instanceof DatabaseConnectionError) {
          this.isOfflineMode = true;
        }
        
        return cached.data;
      }
      
      // No fallback available
      throw error;
    }
  }

  /**
   * Preload assets for offline capability
   */
  async preloadAssets(assets: Array<{ registry: string; key: string }>): Promise<void> {
    const results = await Promise.allSettled(
      assets.map(asset => this.getAssetWithFallback(asset.registry, asset.key))
    );
    
    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      console.warn(`Failed to preload ${failed.length} assets`);
    }
  }

  /**
   * Get fallback cache status
   */
  getFallbackStatus(): {
    isOffline: boolean;
    cachedAssets: number;
    cacheDetails: Array<{
      key: string;
      lastUpdated: Date;
    }>;
  } {
    const cacheDetails = Array.from(this.fallbackCache.entries()).map(([key, entry]) => ({
      key,
      lastUpdated: entry.lastUpdated
    }));
    
    return {
      isOffline: this.isOfflineMode,
      cachedAssets: this.fallbackCache.size,
      cacheDetails
    };
  }

  /**
   * Clear fallback cache
   */
  clearFallbackCache(assetKey?: string): void {
    if (assetKey) {
      this.fallbackCache.delete(assetKey);
    } else {
      this.fallbackCache.clear();
    }
  }

  /**
   * Export fallback cache for persistence
   */
  exportFallbackCache(): string {
    const cache = Array.from(this.fallbackCache.entries()).map(([key, entry]) => ({
      key,
      data: entry.data,
      lastUpdated: entry.lastUpdated.toISOString()
    }));
    
    return JSON.stringify(cache, null, 2);
  }

  /**
   * Import fallback cache from persistence
   */
  importFallbackCache(data: string): void {
    try {
      const cache = JSON.parse(data) as Array<{
        key: string;
        data: string;
        lastUpdated: string;
      }>;
      
      this.fallbackCache.clear();
      
      for (const entry of cache) {
        this.fallbackCache.set(entry.key, {
          data: entry.data,
          lastUpdated: new Date(entry.lastUpdated)
        });
      }
    } catch (error) {
      throw new Error(`Failed to import fallback cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Start health check for automatic offline detection
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      if (this.isOfflineMode) {
        try {
          // Try a simple query to check connection
          await super.getAsset('health-check', 'test');
          this.isOfflineMode = false;
          console.warn('Database connection restored');
        } catch {
          // Still offline
        }
      }
    }, this.healthCheckIntervalMs);
  }

  /**
   * Stop health check and close connection
   */
  async close(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    await super.close();
  }
}