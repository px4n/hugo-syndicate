# Changelog

All notable changes to Hugo Syndicate will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- Semantic-release will auto-generate entries above this line -->

## Pre-release History

### [0.1.0-alpha] - 2025-07-07

#### Added

- Initial release of Hugo Syndicate
- Full API integration for dev.to and Qiita with create/update/delete operations
- Sync control with `devto = true` and `qiita = true` frontmatter flags
- Hugo shortcode transformation to provider-specific formats (liquid tags for dev.to, markdown for Qiita)
- Automatic canonical URL generation based on Hugo site structure
- Orphaned article cleanup detection
- Logging with debug levels
- Support for both YAML and TOML front matter
- Git-based change detection
- Force sync mode for processing all posts
- Tag sanitization for provider compatibility (max 4 tags for dev.to, max 5 for Qiita)
- CLI support
- GitHub Actions workflow examples
- Multi-language URL support
- Hugo permalink pattern support

#### Features

- Environment-based configuration
- Simple error handling and recovery
- File permission validation
- Automatic retry on failures

#### Technical

- Node.js 16+ compatibility
- Zero runtime dependencies (only build-time)
- NPM package ready

#### Alpha Notice

This is an alpha release. While functional, it may contain bugs and the API may change in future versions. Use in production at your own risk.

[0.1.0-alpha]: https://github.com/px4n/hugo-syndicate/releases/tag/v0.1.0-alpha