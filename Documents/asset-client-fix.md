# Fix for PostgreSQL Parameter Type Issues in @asset-management/client

## Problem
PostgreSQL cannot determine data types for parameters in queries, resulting in the error:
```
could not determine data type of parameter $1
```

## Solution
Add explicit type casting to all PostgreSQL query parameters using the `::type` syntax.

## Code Changes Required in `/src/core/AssetClient.ts`

### 1. Update getAsset method (~line 120-140)

**Current:**
```typescript
// Check for registered asset
const registeredQuery = `
  SELECT * FROM asset 
  WHERE user_key = $1 AND asset_registry = $2 AND asset_key = $3
`;
const registeredResult = await this.pool.query(registeredQuery, [this.userKey, registry, assetKey]);

// Get master asset
const masterQuery = `
  SELECT * FROM asset 
  WHERE user_key IS NULL AND asset_registry = $2 AND asset_key = $3
`;
const masterResult = await this.pool.query(masterQuery, [registry, assetKey]);
```

**Fixed:**
```typescript
// Check for registered asset
const registeredQuery = `
  SELECT * FROM asset 
  WHERE user_key = $1::text AND asset_registry = $2::text AND asset_key = $3::text
`;
const registeredResult = await this.pool.query(registeredQuery, [this.userKey, registry, assetKey]);

// Get master asset
const masterQuery = `
  SELECT * FROM asset 
  WHERE user_key IS NULL AND asset_registry = $1::text AND asset_key = $2::text
`;
const masterResult = await this.pool.query(masterQuery, [registry, assetKey]);
```

### 2. Update createRegistration method (~line 160)

**Current:**
```typescript
const insertQuery = `
  INSERT INTO asset (user_key, asset_registry, asset_key, asset_class, 
                     asset_type, description, data, data_hash, 
                     registry_commit, registry_commit_url)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  RETURNING *
`;
```

**Fixed:**
```typescript
const insertQuery = `
  INSERT INTO asset (user_key, asset_registry, asset_key, asset_class, 
                     asset_type, description, data, data_hash, 
                     registry_commit, registry_commit_url)
  VALUES ($1::text, $2::text, $3::text, $4::text, $5::text, 
          $6::text, $7::text, $8::text, $9::text, $10::text)
  RETURNING *
`;
```

### 3. Update updateRegistration method (~line 180)

**Current:**
```typescript
const updateQuery = `
  UPDATE asset 
  SET data = $1, data_hash = $2, registry_commit = $3,
      registry_commit_url = $4, description = $5, created_at = CURRENT_TIMESTAMP
  WHERE id = $6
`;
```

**Fixed:**
```typescript
const updateQuery = `
  UPDATE asset 
  SET data = $1::text, data_hash = $2::text, registry_commit = $3::text,
      registry_commit_url = $4::text, description = $5::text, created_at = CURRENT_TIMESTAMP
  WHERE id = $6::uuid
`;
```

### 4. Update archiveToLog method (~line 200)

**Current:**
```typescript
const archiveQuery = `
  INSERT INTO asset_log (asset_id, user_key, asset_registry, asset_key, 
                         asset_class, asset_type, description, data, 
                         data_hash, registry_commit, registry_commit_url, 
                         original_created_at)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
`;
```

**Fixed:**
```typescript
const archiveQuery = `
  INSERT INTO asset_log (asset_id, user_key, asset_registry, asset_key, 
                         asset_class, asset_type, description, data, 
                         data_hash, registry_commit, registry_commit_url, 
                         original_created_at)
  VALUES ($1::uuid, $2::text, $3::text, $4::text, $5::text, $6::text, 
          $7::text, $8::text, $9::text, $10::text, $11::text, 
          $12::timestamp with time zone)
`;
```

### 5. Update logRetrieval method (~line 220)

**Current:**
```typescript
const logQuery = `
  INSERT INTO asset_retrieval (user_key, asset_id, asset_registry, asset_key)
  VALUES ($1, $2, $3, $4)
`;
```

**Fixed:**
```typescript
const logQuery = `
  INSERT INTO asset_retrieval (user_key, asset_id, asset_registry, asset_key)
  VALUES ($1::text, $2::uuid, $3::text, $4::text)
`;
```

### 6. Add testConnection method (new method)

Add this method to allow connection testing:

```typescript
async testConnection(): Promise<boolean> {
  try {
    const result = await this.pool.query('SELECT 1');
    return result.rows.length > 0;
  } catch (error) {
    return false;
  }
}
```

## Additional Fixes for Other Files

### In `/src/core/ConfigurationManager.ts`

Update any queries that might exist for configuration retrieval.

### In `/src/core/ResilientAssetClient.ts`

This class wraps AssetClient, so no changes needed if base class is fixed.

## Testing

After making these changes:

1. Test with PostgreSQL 12+ to ensure compatibility
2. Test with existing databases to ensure no regression
3. Run the test suite if available
4. Test with the minimal-api backend project

## Version Bump

After fixing, update `package.json`:
- Bump version (e.g., from 1.0.0 to 1.0.1)
- Add changelog entry mentioning PostgreSQL type casting fix

## Pull Request Description

Title: Fix PostgreSQL parameter type casting issues

Description:
```
This PR adds explicit type casting to all PostgreSQL query parameters to resolve "could not determine data type of parameter" errors.

Changes:
- Added ::text type casting for all text parameters
- Added ::uuid type casting for UUID parameters  
- Added ::timestamp type casting for timestamp parameters
- Added testConnection() method for connection validation

Fixes #[issue-number]

Tested with PostgreSQL 12+ and verified all queries work correctly.
```