/**
 * Manages prepared SQL statements with proper type casting
 */
export class PreparedStatements {
  private statements: Map<string, string> = new Map();
  
  constructor() {
    // Pre-define all queries with proper type casting
    this.statements.set('getAssetRegistered', `
      SELECT * FROM asset 
      WHERE user_key = $1::text 
      AND asset_registry = $2::text 
      AND asset_key = $3::text
    `);
    
    this.statements.set('getAssetMaster', `
      SELECT * FROM asset 
      WHERE user_key IS NULL 
      AND asset_registry = $1::text 
      AND asset_key = $2::text
    `);
    
    this.statements.set('createRegistration', `
      INSERT INTO asset (
        user_key, asset_registry, asset_key, asset_class, asset_type,
        description, data, data_hash, registry_commit, registry_commit_url
      ) VALUES ($1::text, $2::text, $3::text, $4::text, $5::text, 
               $6::text, $7::text, $8::text, $9::text, $10::text)
      RETURNING *
    `);
    
    this.statements.set('updateRegistration', `
      UPDATE asset 
      SET data = $1::text, 
          data_hash = $2::text, 
          registry_commit = $3::text,
          registry_commit_url = $4::text, 
          description = $5::text, 
          created_at = CURRENT_TIMESTAMP
      WHERE id = $6::uuid
      RETURNING *
    `);
    
    this.statements.set('archiveToLog', `
      INSERT INTO asset_log (
        created_at, asset_id, user_key, asset_registry, asset_key,
        asset_class, asset_type, description, data, data_hash,
        registry_commit, registry_commit_url
      ) VALUES ($1::timestamp, $2::uuid, $3::text, $4::text, $5::text, 
               $6::text, $7::text, $8::text, $9::text, $10::text, 
               $11::text, $12::text)
    `);
    
    this.statements.set('logRetrieval', `
      INSERT INTO asset_retrieval (
        user_key, asset_id, asset_registry, asset_key
      )
      VALUES ($1::text, $2::uuid, $3::text, $4::text)
    `);
    
    this.statements.set('createRegistrationFromMaster', `
      INSERT INTO asset (
        created_at, user_key, asset_registry, asset_key, 
        asset_class, asset_type, description, data, 
        data_hash, registry_commit, registry_commit_url
      )
      SELECT 
        CURRENT_TIMESTAMP, $1::text, asset_registry, asset_key,
        asset_class, asset_type, description, data,
        data_hash, registry_commit, registry_commit_url
      FROM asset
      WHERE id = $2::uuid
      RETURNING *
    `);
    
    this.statements.set('testConnection', `
      SELECT COUNT(*) 
      FROM asset 
      WHERE asset_registry = $1::text 
      LIMIT 1
    `);
  }
  
  /**
   * Get a prepared statement by name
   * @throws Error if statement not found
   */
  get(name: string): string {
    const query = this.statements.get(name);
    if (!query) {
      throw new Error(`Prepared statement '${name}' not found`);
    }
    return query;
  }
  
  /**
   * Get all statement names for documentation/testing
   */
  getStatementNames(): string[] {
    return Array.from(this.statements.keys());
  }
}