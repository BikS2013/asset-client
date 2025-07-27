# Installing asset-client from GitHub

You can use this package directly from GitHub without publishing to npm. Here are all the available methods:

## Method 1: Install from GitHub Repository

### Basic Installation

```bash
# Install from main branch
npm install git+https://github.com/yourusername/asset-client.git

# Or using shorthand
npm install github:yourusername/asset-client

# With yarn
yarn add github:yourusername/asset-client

# With pnpm
pnpm add github:yourusername/asset-client
```

### Install Specific Branch/Tag/Commit

```bash
# Install from specific branch
npm install github:yourusername/asset-client#develop
npm install github:yourusername/asset-client#feature/new-feature

# Install from specific tag
npm install github:yourusername/asset-client#v1.0.0

# Install from specific commit
npm install github:yourusername/asset-client#7d3b4f2

# Full URL syntax
npm install git+https://github.com/yourusername/asset-client.git#branch-name
```

### Private Repository Installation

```bash
# Using SSH (requires SSH key setup)
npm install git+ssh://git@github.com:yourusername/asset-client.git

# Using personal access token
npm install git+https://${GITHUB_TOKEN}@github.com/yourusername/asset-client.git

# Or configure .npmrc
echo "@yourusername:registry=https://npm.pkg.github.com" >> .npmrc
echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> .npmrc
```

## Method 2: Using GitHub Packages Registry

### 1. Configure Package for GitHub Packages

Update `package.json`:

```json
{
  "name": "@yourusername/asset-client",
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

### 2. Publish to GitHub Packages

```bash
# Login to GitHub registry
npm login --registry=https://npm.pkg.github.com
# Username: YOUR_GITHUB_USERNAME
# Password: YOUR_GITHUB_TOKEN
# Email: YOUR_EMAIL

# Publish
npm publish --registry=https://npm.pkg.github.com
```

### 3. Install from GitHub Packages

```bash
# Configure .npmrc in your project
echo "@yourusername:registry=https://npm.pkg.github.com" >> .npmrc
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" >> .npmrc

# Install
npm install @yourusername/asset-client
```

## Method 3: Local File Reference

### Using npm link (for development)

```bash
# In asset-client directory
npm link

# In your project directory
npm link @asset-management/client
```

### Using file path

```bash
# Install from local path
npm install ../path/to/asset-client

# Or in package.json
{
  "dependencies": {
    "@asset-management/client": "file:../asset-client"
  }
}
```

## Method 4: Using Git Submodules

```bash
# Add as submodule
git submodule add https://github.com/yourusername/asset-client.git packages/asset-client

# Install dependencies
cd packages/asset-client && npm install && npm run build

# Reference in package.json
{
  "dependencies": {
    "@asset-management/client": "file:./packages/asset-client"
  }
}
```

## Method 5: Direct GitHub URL in package.json

```json
{
  "dependencies": {
    "@asset-management/client": "github:yourusername/asset-client",
    // or specific version
    "@asset-management/client": "github:yourusername/asset-client#v1.0.0",
    // or specific commit
    "@asset-management/client": "github:yourusername/asset-client#7d3b4f2"
  }
}
```

## Important Considerations

### 1. Build Process

Since TypeScript needs to be compiled, you have two options:

#### Option A: Commit dist folder (Not Recommended)

```bash
# Build before committing
npm run build
git add dist
git commit -m "Build dist"
git push
```

#### Option B: Use prepare script (Recommended)

Ensure `package.json` has:

```json
{
  "scripts": {
    "prepare": "npm run build"
  }
}
```

This automatically builds when installing from git.

### 2. Dependencies

Make sure all dependencies are in `dependencies`, not `devDependencies`:

```json
{
  "dependencies": {
    "pg": "^8.11.3",
    "yaml": "^2.3.4"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    // ... other dev dependencies
  }
}
```

### 3. GitHub Actions for Automatic Builds

Create `.github/workflows/build-on-push.yml`:

```yaml
name: Build and Commit

on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'package.json'
      - 'tsconfig.json'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
      
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run build
      
      - name: Commit dist
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add dist
          git diff --staged --quiet || git commit -m "Auto-build dist [skip ci]"
          git push
```

## Usage Examples

### Example 1: Simple GitHub Installation

```bash
# In your project
npm install github:yourusername/asset-client

# Use in code
import { AssetClient } from '@asset-management/client';
```

### Example 2: Monorepo Setup

```json
// package.json in your app
{
  "name": "my-app",
  "dependencies": {
    "@asset-management/client": "github:myorg/asset-client#main"
  }
}
```

### Example 3: Development Setup

```bash
# Clone both repos
git clone https://github.com/yourusername/my-app.git
git clone https://github.com/yourusername/asset-client.git

# Link for development
cd asset-client
npm install
npm link

cd ../my-app
npm link @asset-management/client
```

## Troubleshooting

### "Cannot find module" Error

```bash
# Ensure the package is built
cd node_modules/@asset-management/client
npm run build
```

### "prepare script failed"

```bash
# Install with --ignore-scripts temporarily
npm install github:yourusername/asset-client --ignore-scripts

# Then build manually
cd node_modules/@asset-management/client
npm run build
```

### Authentication Issues

```bash
# For private repos, set up GitHub token
export GITHUB_TOKEN=your_personal_access_token
npm install git+https://${GITHUB_TOKEN}@github.com/yourusername/asset-client.git
```

### Caching Issues

```bash
# Clear npm cache
npm cache clean --force

# Remove and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Best Practices

1. **Use Tags for Versions**
   ```bash
   # Tag releases
   git tag -a v1.0.0 -m "Version 1.0.0"
   git push origin v1.0.0
   
   # Install specific version
   npm install github:yourusername/asset-client#v1.0.0
   ```

2. **Document Installation in README**
   ```markdown
   ## Installation
   
   ```bash
   npm install github:myorg/asset-client#v1.0.0
   ```
   ```

3. **Use GitHub Releases**
   - Create releases for stable versions
   - Users can reference specific releases

4. **Consider CI/CD**
   - Automate builds on push
   - Run tests before allowing installation

## Comparison of Methods

| Method | Pros | Cons | Best For |
|--------|------|------|----------|
| Direct GitHub | Simple, no registry needed | Requires build step | Open source projects |
| GitHub Packages | Integrated with GitHub | Requires authentication | Private org packages |
| npm link | Great for development | Not for production | Local development |
| Git submodules | Full control | More complex | Monorepos |
| Local path | Simple for monorepos | Not portable | Monorepo projects |

## Recommended Approach

For most use cases, we recommend:

1. **Development**: Use `npm link` or local paths
2. **Internal/Private**: Use GitHub Packages
3. **Open Source**: Use direct GitHub installation with tags
4. **Production**: Consider publishing to npm for stability

## Example Project Setup

```json
// package.json in a client app
{
  "name": "my-api-service",
  "version": "1.0.0",
  "dependencies": {
    // For development
    "@asset-management/client": "file:../asset-client",
    
    // For staging
    "@asset-management/client": "github:myorg/asset-client#develop",
    
    // For production
    "@asset-management/client": "github:myorg/asset-client#v1.0.0"
  }
}
```

This way, you can use the package immediately without waiting for npm publication!