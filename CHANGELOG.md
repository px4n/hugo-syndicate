# Changelog

All notable changes to Hugo Syndicate will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-alpha.1] - 2025-01-04

### Added

- Initial release of Hugo Syndicate
- Completed dev.to API integration with create/update/delete operations
- Smart sync control with `devto = true` frontmatter flag
- Hugo shortcode transformation to dev.to liquid tags
- Automatic canonical URL generation based on Hugo site structure
- Orphaned article cleanup detection
- Comprehensive logging with multiple debug levels
- Support for both YAML and TOML front matter
- Git-based change detection for efficient syncing
- Force sync mode for processing all posts
- Tag sanitization for dev.to compatibility (max 4 tags)
- CLI support with global installation
- Comprehensive test suite (28 tests)
- GitHub Actions workflow examples
- Multi-language URL support
- Hugo permalink pattern support

### Features

- Environment-based configuration
- Robust error handling and recovery
- File permissions validation
- Automatic retry on failures
- Progress tracking and reporting

### Technical

- Node.js 14+ compatibility
- Zero runtime dependencies (only build-time)
- NPM package ready

### Alpha Notice

This is an alpha release. While functional, it may contain bugs and the API may change in future versions. Use in production at your own risk.

[0.1.0-alpha.1]: https://github.com/px4n/hugo-syndicate/releases/tag/v0.1.0-alpha.1
