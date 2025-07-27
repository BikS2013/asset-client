# Publishing asset-client as an npm Package

This guide explains how to publish the `@asset-management/client` package to npm.

## Prerequisites

1. **npm Account**: Create an account at [npmjs.com](https://www.npmjs.com/)
2. **Organization** (optional): Create an organization for scoped packages
3. **Node.js**: Version 16.0.0 or higher

## Setup Steps

### 1. Choose Package Name

You have three options:

#### Option A: Scoped Package (Recommended)
```bash
# Format: @organization/package-name
@asset-management/client
@yourcompany/asset-client
@myorg/asset-management-client
```

#### Option B: Unscoped Package
```bash
# Must be unique on npm
asset-management-client
company-asset-client
```

#### Option C: Private Registry
```bash
# For enterprise use
@internal/asset-client
```

### 2. Update package.json

Update the package name and metadata:

```json
{
  "name": "@yourorg/asset-client",
  "version": "1.0.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourorg/asset-client.git"
  }
}
```

### 3. Login to npm

```bash
# Login to npm
npm login

# Verify login
npm whoami
```

### 4. Create Organization (if using scoped package)

```bash
# Create organization (one-time setup)
# Do this on npmjs.com website or via CLI
npm org create yourorg
```

## Publishing Process

### Manual Publishing

1. **Build the package**:
   ```bash
   npm run build
   npm run test
   npm run lint
   ```

2. **Check package contents**:
   ```bash
   # See what will be published
   npm pack --dry-run
   
   # Check package size
   npm pack
   ls -lh *.tgz
   ```

3. **Publish to npm**:
   ```bash
   # First time publish
   npm publish
   
   # If scoped package, make it public
   npm publish --access public
   ```

### Version Management

```bash
# Bump patch version (1.0.0 -> 1.0.1)
npm version patch

# Bump minor version (1.0.0 -> 1.1.0)
npm version minor

# Bump major version (1.0.0 -> 2.0.0)
npm version major

# Custom version
npm version 1.2.3

# Prerelease versions
npm version prepatch --preid=beta
# Results in: 1.0.1-beta.0
```

### Publishing Workflow

```bash
# 1. Make changes and commit
git add .
git commit -m "Add new feature"

# 2. Run tests
npm test

# 3. Bump version
npm version patch

# 4. Push changes and tags
git push && git push --tags

# 5. Publish to npm
npm publish
```

## Automated Publishing with GitHub Actions

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Publish
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{secrets.NPM_TOKEN}}
```

### Setting up NPM_TOKEN

1. Go to npmjs.com → Account Settings → Access Tokens
2. Generate new token (Automation type)
3. Add to GitHub repository secrets as `NPM_TOKEN`

## Using the Published Package

### Installation

```bash
# Install in your project
npm install @asset-management/client

# Or with yarn
yarn add @asset-management/client

# Or with pnpm
pnpm add @asset-management/client
```

### Basic Usage

```typescript
import { AssetClient, ConfigurationManager } from '@asset-management/client';

const client = new AssetClient({
  connectionString: process.env.DATABASE_URL!,
  userKey: 'my-app'
});

const config = await client.getAsset('github.com/org/repo', 'config.json');
```

## Package Configuration Best Practices

### 1. Set Proper npm Scripts

```json
{
  "scripts": {
    "prepublishOnly": "npm run test && npm run build",
    "version": "npm run build && git add -A dist",
    "postversion": "git push && git push --tags"
  }
}
```

### 2. Use .npmignore

Create `.npmignore`:
```
# Source files
src/
tests/
examples/

# Config files
.eslintrc.json
jest.config.js
tsconfig.json

# CI/CD
.github/
.gitlab-ci.yml

# Development
.env
.env.*
*.log

# Misc
.DS_Store
coverage/
```

### 3. Package.json Fields

Essential fields for npm:
```json
{
  "name": "@org/package",
  "version": "1.0.0",
  "description": "Clear description",
  "keywords": ["asset", "management", "config"],
  "author": "Your Name <email@example.com>",
  "license": "MIT",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist", "README.md", "LICENSE"],
  "engines": {
    "node": ">=16.0.0"
  },
  "peerDependencies": {
    "pg": "^8.0.0"
  }
}
```

## Troubleshooting

### Common Issues

1. **403 Forbidden Error**
   ```bash
   # Make scoped package public
   npm publish --access public
   ```

2. **Package Name Taken**
   ```bash
   # Check if name is available
   npm view @yourorg/asset-client
   ```

3. **Authentication Issues**
   ```bash
   # Re-login
   npm logout
   npm login
   ```

4. **Build Issues**
   ```bash
   # Clean and rebuild
   rm -rf dist node_modules
   npm install
   npm run build
   ```

## Version Tags

```bash
# Publish with tag
npm publish --tag beta

# Install specific tag
npm install @asset-management/client@beta

# View all tags
npm view @asset-management/client dist-tags

# Update latest tag
npm dist-tag add @asset-management/client@1.0.0 latest
```

## Private Registry Setup

For enterprise use:

### 1. Configure .npmrc
```
# Corporate registry
registry=https://npm.company.com/

# Scoped packages to corporate registry
@company:registry=https://npm.company.com/

# Auth token
//npm.company.com/:_authToken=${NPM_TOKEN}
```

### 2. Publish to Private Registry
```bash
npm publish --registry https://npm.company.com/
```

## Maintenance

### Deprecating Versions
```bash
npm deprecate @asset-management/client@1.0.0 "Use version 2.0.0"
```

### Unpublishing (within 72 hours)
```bash
npm unpublish @asset-management/client@1.0.0
```

### View Package Info
```bash
# View all versions
npm view @asset-management/client versions

# View specific version
npm view @asset-management/client@1.0.0

# View dependencies
npm view @asset-management/client dependencies
```

## Security Considerations

1. **Never commit .npmrc with tokens**
2. **Use npm audit regularly**
3. **Enable 2FA on npm account**
4. **Use automation tokens for CI/CD**
5. **Review package contents before publishing**

## Release Checklist

- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped appropriately
- [ ] Build successful
- [ ] Package size reasonable
- [ ] Dependencies up to date
- [ ] Security vulnerabilities checked
- [ ] Git tag created
- [ ] Published to npm