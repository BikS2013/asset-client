# Using asset-client Package via GitHub (No npm Required)

This guide explains how to use the `@asset-management/client` package directly from GitHub without publishing to npm. The asset-client is a subfolder within the configuration-management repository.

## Table of Contents

- [Quick Start](#quick-start)
- [Installation Methods](#installation-methods)
- [Private Repository Setup](#private-repository-setup)
- [Development Workflow](#development-workflow)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Quick Start

Since asset-client is a subfolder in the configuration-management repository, you need to specify the subdirectory:

```bash
# Install latest from main branch
npm install git+https://github.com/BikS2013/configuration-management.git#main:asset-client

# Use in your code exactly the same way
import { AssetClient } from '@asset-management/client';
```

That's it! The package will be built automatically during installation thanks to the `prepare` script in package.json.

## Installation Methods

### Method 1: Direct GitHub Subfolder Installation

#### Basic Installation

```bash
# Using full URL with subfolder
npm install git+https://github.com/BikS2013/configuration-management.git#main:asset-client

# With specific branch
npm install git+https://github.com/BikS2013/configuration-management.git#develop:asset-client

# With yarn (requires different syntax)
yarn add https://github.com/BikS2013/configuration-management.git#workspace=asset-client

# With pnpm
pnpm add git+https://github.com/BikS2013/configuration-management.git#main:asset-client
```

#### Installing Specific Versions

```bash
# Install from specific tag
npm install git+https://github.com/BikS2013/configuration-management.git#v1.0.0:asset-client

# Install from specific commit
npm install git+https://github.com/BikS2013/configuration-management.git#7d3b4f2:asset-client
```

### Method 2: Using Git Sparse Checkout

For more control, you can use git sparse checkout:

```bash
# Clone only the asset-client subdirectory
git clone --no-checkout https://github.com/BikS2013/configuration-management.git temp-repo
cd temp-repo
git sparse-checkout init --cone
git sparse-checkout set asset-client
git checkout main
cd asset-client
npm install
npm link

# In your project
npm link @asset-management/client
```

### Method 3: Package.json Dependency

Add directly to your `package.json`:

```json
{
  "dependencies": {
    // Latest from main branch
    "@asset-management/client": "git+https://github.com/BikS2013/configuration-management.git#main:asset-client",
    
    // Specific version tag (recommended for production)
    "@asset-management/client": "git+https://github.com/BikS2013/configuration-management.git#v1.0.0:asset-client",
    
    // Specific branch
    "@asset-management/client": "git+https://github.com/BikS2013/configuration-management.git#develop:asset-client"
  }
}
```

Then run:
```bash
npm install
```

### Method 4: Local Development Setup

For local development when you have the full repository:

```bash
# Clone the full repository
git clone https://github.com/BikS2013/configuration-management.git
cd configuration-management/asset-client

# Install and link
npm install
npm link

# In your application
npm link @asset-management/client
```

### Method 5: Using npm Workspaces (If Parent Repo Supports It)

If the configuration-management repo uses npm workspaces:

```json
// In your package.json
{
  "dependencies": {
    "@asset-management/client": "git+https://github.com/BikS2013/configuration-management.git#workspace=asset-client"
  }
}
```

## Private Repository Setup

### Using SSH Authentication

```bash
# For private repos with subfolder
npm install git+ssh://git@github.com:BikS2013/configuration-management.git#main:asset-client
```

### Using Personal Access Token

```bash
# Set token as environment variable
export GITHUB_TOKEN=your_personal_access_token

# Install using token
npm install git+https://${GITHUB_TOKEN}@github.com/BikS2013/configuration-management.git#main:asset-client
```

### GitHub Actions for Private Repos

```yaml
- name: Install dependencies
  run: |
    git config --global url."https://${{ secrets.GITHUB_TOKEN }}@github.com/".insteadOf "https://github.com/"
    npm install
```

## Development Workflow

### 1. Repository Structure

```
configuration-management/
├── backend/                    # Main backend code
├── asset-client/              # The npm package
│   ├── src/
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
├── Documents/
└── README.md
```

### 2. Working with the Subfolder Package

```bash
# Clone the main repository
git clone https://github.com/BikS2013/configuration-management.git
cd configuration-management

# Navigate to asset-client
cd asset-client

# Install dependencies
npm install

# Run tests
npm test

# Build the package
npm run build
```

### 3. Creating Version Tags

For subfolder packages, consider using prefixed tags:

```bash
# Create a tag specific to asset-client
git tag -a asset-client-v1.0.0 -m "Release asset-client version 1.0.0"
git push origin asset-client-v1.0.0

# Users can install this specific version
npm install git+https://github.com/BikS2013/configuration-management.git#asset-client-v1.0.0:asset-client
```

### 4. Publishing Workflow

```bash
# 1. Make changes in asset-client subfolder
cd configuration-management/asset-client

# 2. Update version in asset-client/package.json
npm version patch

# 3. Commit changes
cd ..  # Back to root
git add asset-client/
git commit -m "chore(asset-client): bump version to 1.0.1"

# 4. Create tag
git tag -a asset-client-v1.0.1 -m "Release asset-client v1.0.1"

# 5. Push
git push && git push --tags
```

## Best Practices

### 1. Use Subfolder-Specific Tags

```json
{
  "dependencies": {
    // ❌ Avoid - might include unrelated changes
    "@asset-management/client": "git+https://github.com/BikS2013/configuration-management.git#main:asset-client",
    
    // ✅ Good - locked to specific asset-client version
    "@asset-management/client": "git+https://github.com/BikS2013/configuration-management.git#asset-client-v1.2.3:asset-client"
  }
}
```

### 2. Document the Subfolder Structure

Add to your application's README:

```markdown
## Dependencies

This project uses the asset-client from the configuration-management repository:

\```bash
npm install
\```

The asset-client is installed from the configuration-management repository subfolder.
```

### 3. CI/CD Configuration

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      # Install from subfolder
      - name: Install dependencies
        run: |
          npm install
      
      - run: npm test
```

### 4. Alternative: Subtree Split

For frequent updates, consider splitting the subfolder into its own repo:

```bash
# Create a separate repo for asset-client
git subtree split --prefix=asset-client -b asset-client-only
git push git@github.com:BikS2013/asset-client.git asset-client-only:main
```

## Troubleshooting

### "Cannot find module" Error

The subfolder installation might not trigger the build:

```bash
# Navigate to the installed package
cd node_modules/@asset-management/client

# Check if it's properly installed
ls -la

# Build manually if needed
npm run build
```

### "No matching version found"

Ensure the syntax is correct for subfolder:

```bash
# Correct syntax
npm install git+https://github.com/user/repo.git#branch:subfolder

# NOT this
npm install github:user/repo/subfolder
```

### Package Not Installing from Subfolder

Try alternative approaches:

```bash
# Method 1: Use gitpkg (third-party service)
npm install https://gitpkg.now.sh/BikS2013/configuration-management/asset-client?main

# Method 2: Manual installation
git clone https://github.com/BikS2013/configuration-management.git temp-install
cd temp-install/asset-client
npm install
npm pack
cd ../..
npm install ./temp-install/asset-client/asset-management-client-*.tgz
rm -rf temp-install
```

### Build Script Not Running

Ensure the asset-client subfolder has its own package.json with:

```json
{
  "scripts": {
    "prepare": "npm run build",
    "build": "tsc"
  }
}
```

## Usage Examples

### Basic Usage

Once installed, use it normally:

```typescript
import { AssetClient, ConfigurationManager } from '@asset-management/client';

const client = new AssetClient({
  connectionString: process.env.DATABASE_URL!,
  userKey: 'my-app'
});

const config = await client.getAsset('github.com/org/configs', 'app.json');
```

### Environment-Specific Installation

```json
{
  "scripts": {
    "install:dev": "npm install git+https://github.com/BikS2013/configuration-management.git#develop:asset-client",
    "install:prod": "npm install git+https://github.com/BikS2013/configuration-management.git#asset-client-v1.0.0:asset-client"
  }
}
```

### Monorepo Integration

If your app is also in a monorepo:

```
my-app-monorepo/
├── packages/
│   ├── api/
│   │   └── package.json
│   └── frontend/
└── package.json
```

In `packages/api/package.json`:
```json
{
  "dependencies": {
    "@asset-management/client": "git+https://github.com/BikS2013/configuration-management.git#main:asset-client"
  }
}
```

## Alternative Solutions

### 1. Git Submodules

```bash
# Add as submodule
git submodule add https://github.com/BikS2013/configuration-management.git vendor/config-mgmt
git config submodule.vendor/config-mgmt.sparse-checkout true
echo "asset-client/*" > .git/modules/vendor/config-mgmt/sparse-checkout

# Reference in package.json
{
  "dependencies": {
    "@asset-management/client": "file:./vendor/config-mgmt/asset-client"
  }
}
```

### 2. Publish to GitHub Packages

Configure asset-client to publish to GitHub Packages instead of npm:

```json
// In asset-client/package.json
{
  "publishConfig": {
    "registry": "https://npm.pkg.github.com/@BikS2013"
  }
}
```

## Summary

Installing from a GitHub subfolder requires:
- ✅ Correct syntax: `#branch:subfolder`
- ✅ Proper build configuration in the subfolder
- ✅ Version tags for stability
- ✅ Clear documentation for your team

Start using it now:
```bash
npm install git+https://github.com/BikS2013/configuration-management.git#main:asset-client
```