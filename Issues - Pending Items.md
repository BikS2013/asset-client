# Issues - Pending Items

This document tracks issues, pending items, inconsistencies, and discrepancies detected in the asset-client project.

## Pending Items

None at this time.

## Completed Items

### PostgreSQL Parameter Type Casting Issue - RESOLVED (2025-07-27)
- **Issue**: PostgreSQL could not determine data types for parameters in queries, resulting in errors
- **Resolution**: Added explicit type casting to all PostgreSQL query parameters using the `::type` syntax
- **Files Modified**: 
  - `/src/core/AssetClient.ts` - Added type casting to all queries
  - `package.json` - Bumped version to 1.0.1
  - `CHANGELOG.md` - Documented changes in version 1.0.1
- **Status**: Fixed and tested