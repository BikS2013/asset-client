# Quick Start: Publishing @asset-management/client

## Step-by-Step Instructions

### 1. First-Time Setup

```bash
# 1. Create npm account at https://www.npmjs.com/signup

# 2. Login to npm
npm login

# 3. Verify login
npm whoami
```

### 2. Choose Your Package Name

Update `package.json` with your chosen name:

```json
{
  "name": "@yourorg/asset-client"  // or "asset-management-client"
}
```

### 3. Build and Test

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build the package
npm run build

# Check what will be published
npm pack --dry-run
```

### 4. Publish Your First Version

```bash
# For scoped packages (@org/package)
npm publish --access public

# For unscoped packages
npm publish
```

### 5. Set Up Automated Publishing (Optional)

1. Generate npm token:
   - Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Create new token → "Automation" type
   - Copy the token

2. Add to GitHub secrets:
   - Go to your GitHub repo → Settings → Secrets
   - Add new secret: `NPM_TOKEN`
   - Paste your npm token

3. Use GitHub Actions:
   ```bash
   # Trigger automated release
   # Go to Actions → Publish to npm → Run workflow
   # Select version type (patch/minor/major)
   ```

## Common Commands

```bash
# Manual version and publish
npm run release:patch  # 1.0.0 → 1.0.1
npm run release:minor  # 1.0.0 → 1.1.0
npm run release:major  # 1.0.0 → 2.0.0

# Beta releases
npm run release:beta   # 1.0.0 → 1.0.1-beta.0

# Check published package
npm view @yourorg/asset-client

# Install in another project
npm install @yourorg/asset-client
```

## Troubleshooting

### "403 Forbidden" Error
```bash
npm publish --access public
```

### "Package name already exists"
Choose a different name in package.json

### "Not logged in"
```bash
npm login
```

## After Publishing

Your package will be available at:
- npm: `https://www.npmjs.com/package/@yourorg/asset-client`
- Install: `npm install @yourorg/asset-client`

## Using in Client Apps

```typescript
// Install
npm install @yourorg/asset-client

// Use in your app
import { AssetClient, ConfigurationManager } from '@yourorg/asset-client';

const client = new AssetClient({
  connectionString: process.env.DATABASE_URL!,
  userKey: 'my-app'
});
```