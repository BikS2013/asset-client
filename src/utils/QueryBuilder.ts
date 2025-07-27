/**
 * QueryBuilder helper for constructing SQL queries with proper type casting
 */
export class QueryBuilder {
  /**
   * Cast a parameter with explicit PostgreSQL type
   */
  static castParam(index: number, type: 'text' | 'uuid' | 'timestamp' | 'boolean' | 'integer'): string {
    return `$${index}::${type}`;
  }

  /**
   * Build asset retrieval query with proper type casting
   */
  static buildAssetQuery(options: { includeUserKey?: boolean }): string {
    const base = `
      SELECT id, data, user_key, registry_commit, created_at
      FROM asset
      WHERE asset_registry = ${this.castParam(1, 'text')}
      AND asset_key = ${this.castParam(2, 'text')}
    `;
    
    if (options.includeUserKey) {
      return base + ` AND (user_key = ${this.castParam(3, 'text')} OR user_key IS NULL)
        ORDER BY user_key DESC NULLS LAST
        LIMIT 1`;
    }
    
    return base + ' AND user_key IS NULL LIMIT 1';
  }

  /**
   * Build insert query for asset registration
   */
  static buildInsertQuery(): string {
    return `
      INSERT INTO asset (
        user_key, asset_registry, asset_key, asset_class, asset_type,
        description, data, data_hash, registry_commit, registry_commit_url
      ) VALUES (
        ${this.castParam(1, 'text')}, ${this.castParam(2, 'text')}, ${this.castParam(3, 'text')}, 
        ${this.castParam(4, 'text')}, ${this.castParam(5, 'text')}, ${this.castParam(6, 'text')}, 
        ${this.castParam(7, 'text')}, ${this.castParam(8, 'text')}, ${this.castParam(9, 'text')}, 
        ${this.castParam(10, 'text')}
      )
      RETURNING *
    `;
  }

  /**
   * Build update query for asset updates
   */
  static buildUpdateQuery(): string {
    return `
      UPDATE asset 
      SET data = ${this.castParam(1, 'text')}, 
          data_hash = ${this.castParam(2, 'text')}, 
          registry_commit = ${this.castParam(3, 'text')},
          registry_commit_url = ${this.castParam(4, 'text')}, 
          description = ${this.castParam(5, 'text')}, 
          created_at = CURRENT_TIMESTAMP
      WHERE id = ${this.castParam(6, 'uuid')}
      RETURNING *
    `;
  }

  /**
   * Build query for archiving to log
   */
  static buildArchiveQuery(): string {
    return `
      INSERT INTO asset_log (
        created_at, asset_id, user_key, asset_registry, asset_key,
        asset_class, asset_type, description, data, data_hash,
        registry_commit, registry_commit_url
      ) VALUES (
        ${this.castParam(1, 'timestamp')}, ${this.castParam(2, 'uuid')}, ${this.castParam(3, 'text')}, 
        ${this.castParam(4, 'text')}, ${this.castParam(5, 'text')}, ${this.castParam(6, 'text')}, 
        ${this.castParam(7, 'text')}, ${this.castParam(8, 'text')}, ${this.castParam(9, 'text')}, 
        ${this.castParam(10, 'text')}, ${this.castParam(11, 'text')}, ${this.castParam(12, 'text')}
      )
    `;
  }

  /**
   * Build query for logging retrievals
   */
  static buildRetrievalLogQuery(): string {
    return `
      INSERT INTO asset_retrieval (user_key, asset_id, asset_registry, asset_key)
      VALUES (${this.castParam(1, 'text')}, ${this.castParam(2, 'uuid')}, ${this.castParam(3, 'text')}, ${this.castParam(4, 'text')})
    `;
  }
}