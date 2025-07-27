export interface Asset {
  id: string;
  created_at: Date;
  user_key: string | null;
  asset_registry: string;
  asset_key: string;
  asset_class: string;
  asset_type: string;
  description: string | null;
  data: string;
  data_hash: string;
  registry_commit: string;
  registry_commit_url: string;
}

export interface AssetClientConfig {
  connectionString: string;
  userKey: string;
  maxRetries?: number;
  retryDelay?: number;
  connectionTimeout?: number;
}

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
}

export interface AssetRetrievalLog {
  user_key: string;
  asset_id: string;
  asset_registry: string;
  asset_key: string;
}

export class AssetNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssetNotFoundError';
  }
}

export class AssetUpdateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssetUpdateError';
  }
}

export class DatabaseConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseConnectionError';
  }
}