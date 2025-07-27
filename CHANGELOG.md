# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2024-01-XX

### Added
- Initial release of @asset-management/client
- Core AssetClient for database operations
- ConfigurationManager for JSON/YAML configuration management
- PromptManager for AI/LLM prompt templates
- ResilientAssetClient with offline fallback support
- Full TypeScript support with type definitions
- Comprehensive test suite
- Retry logic for transient failures
- Connection pooling support
- Built-in caching mechanisms

### Features
- Automatic asset registration for applications
- Version tracking and automatic updates
- Support for multiple configuration formats (JSON, YAML, Properties)
- Variable substitution in prompts
- Fallback cache for offline scenarios
- Source tracking for configuration values

### Security
- Secure credential management practices
- No default values for sensitive configuration
- Connection string validation