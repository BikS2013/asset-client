import { Pool, PoolClient } from 'pg';
import { 
  Asset, 
  AssetClientConfig, 
  AssetNotFoundError, 
  AssetUpdateError,
  DatabaseConnectionError
} from '../types';

export class AssetClient {
  private pool: Pool;
  private userKey: string;
  private maxRetries: number;
  private retryDelay: number;

  constructor(config: AssetClientConfig) {
    this.userKey = config.userKey;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;
    
    this.pool = new Pool({
      connectionString: config.connectionString,
      connectionTimeoutMillis: config.connectionTimeout ?? 10000,
    });
  }

  /**
   * Get an asset and automatically handle registration/updates
   */
  async getAsset(assetRegistry: string, assetKey: string): Promise<string> {
    let retries = 0;
    
    while (retries < this.maxRetries) {
      try {
        return await this.getAssetWithTransaction(assetRegistry, assetKey);
      } catch (error) {
        retries++;
        if (retries >= this.maxRetries) {
          throw error;
        }
        await this.delay(this.retryDelay * retries);
      }
    }
    
    throw new AssetUpdateError('Max retries exceeded');
  }

  private async getAssetWithTransaction(assetRegistry: string, assetKey: string): Promise<string> {
    const client = await this.getConnection();
    
    try {
      await client.query('BEGIN');

      // 1. Check if asset is already registered to this application
      const registeredQuery = `
        SELECT * FROM asset 
        WHERE user_key = $1 AND asset_registry = $2 AND asset_key = $3
      `;
      const registered = await client.query<Asset>(registeredQuery, [
        this.userKey, assetRegistry, assetKey
      ]);

      // 2. Get the master (unregistered) version
      const masterQuery = `
        SELECT * FROM asset 
        WHERE user_key IS NULL AND asset_registry = $2 AND asset_key = $3
      `;
      const master = await client.query<Asset>(masterQuery, [
        null, assetRegistry, assetKey
      ]);

      if (master.rows.length === 0) {
        throw new AssetNotFoundError(`Asset ${assetRegistry}/${assetKey} not found`);
      }

      const masterAsset = master.rows[0];
      let resultAsset: Asset;

      if (registered.rows.length === 0) {
        // First time using this asset - create registration
        resultAsset = await this.createRegistration(client, masterAsset);
      } else {
        const registeredAsset = registered.rows[0];
        
        // Check if update needed
        if (registeredAsset.data_hash !== masterAsset.data_hash) {
          // Archive old version and update
          await this.archiveToLog(client, registeredAsset);
          resultAsset = await this.updateRegistration(client, registeredAsset, masterAsset);
        } else {
          resultAsset = registeredAsset;
        }
      }

      // Log the retrieval
      await this.logRetrieval(client, resultAsset.id, assetRegistry, assetKey);
      
      await client.query('COMMIT');
      return resultAsset.data;
      
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AssetNotFoundError) {
        throw error;
      }
      throw new AssetUpdateError(`Failed to get asset: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  private async createRegistration(client: PoolClient, masterAsset: Asset): Promise<Asset> {
    const insertQuery = `
      INSERT INTO asset (
        user_key, asset_registry, asset_key, asset_class, asset_type,
        description, data, data_hash, registry_commit, registry_commit_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const result = await client.query<Asset>(insertQuery, [
      this.userKey,
      masterAsset.asset_registry,
      masterAsset.asset_key,
      masterAsset.asset_class,
      masterAsset.asset_type,
      masterAsset.description,
      masterAsset.data,
      masterAsset.data_hash,
      masterAsset.registry_commit,
      masterAsset.registry_commit_url
    ]);
    return result.rows[0];
  }

  private async updateRegistration(
    client: PoolClient, 
    registeredAsset: Asset, 
    masterAsset: Asset
  ): Promise<Asset> {
    const updateQuery = `
      UPDATE asset 
      SET data = $1, data_hash = $2, registry_commit = $3,
          registry_commit_url = $4, description = $5, created_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `;
    const result = await client.query<Asset>(updateQuery, [
      masterAsset.data,
      masterAsset.data_hash,
      masterAsset.registry_commit,
      masterAsset.registry_commit_url,
      masterAsset.description,
      registeredAsset.id
    ]);
    return result.rows[0];
  }

  private async archiveToLog(client: PoolClient, asset: Asset): Promise<void> {
    const query = `
      INSERT INTO asset_log (
        created_at, asset_id, user_key, asset_registry, asset_key,
        asset_class, asset_type, description, data, data_hash,
        registry_commit, registry_commit_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `;
    await client.query(query, [
      asset.created_at, asset.id, asset.user_key, asset.asset_registry,
      asset.asset_key, asset.asset_class, asset.asset_type, asset.description,
      asset.data, asset.data_hash, asset.registry_commit, asset.registry_commit_url
    ]);
  }

  private async logRetrieval(
    client: PoolClient, 
    assetId: string, 
    assetRegistry: string, 
    assetKey: string
  ): Promise<void> {
    const query = `
      INSERT INTO asset_retrieval (user_key, asset_id, asset_registry, asset_key)
      VALUES ($1, $2, $3, $4)
    `;
    await client.query(query, [this.userKey, assetId, assetRegistry, assetKey]);
  }

  private async getConnection(): Promise<PoolClient> {
    try {
      return await this.pool.connect();
    } catch (error) {
      throw new DatabaseConnectionError(
        `Failed to connect to database: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}