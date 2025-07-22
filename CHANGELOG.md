## 1.0.0 (2025-07-22)


### Features

* add Qiita provider, more testing, linting, and documentation for alpha 2 release ([eaadbbd](https://github.com/px4n/hugo-syndicate/commit/eaadbbd78e9c1207d68260acd90f0600df566e5c))
* initial commit ([1a1955d](https://github.com/px4n/hugo-syndicate/commit/1a1955dcd12395dbd604026a47e1a9eaebcff7ea))


### Bug Fixes

* disable body-max-line-length in commitlint for semantic-release compatibility ([2409115](https://github.com/px4n/hugo-syndicate/commit/2409115dce3d0a2649c39262050fca59c973a54c))
* normalize file paths in tests for Windows compatibility ([3c2c5cb](https://github.com/px4n/hugo-syndicate/commit/3c2c5cb35fda31f68fb055df816b5a0c34df45df))
* resolve YAML syntax error in version-bump workflow heredoc ([8d6894d](https://github.com/px4n/hugo-syndicate/commit/8d6894db482b59dfeb1e84564cd8e13afff43269))
* update dependencies to resolve form-data security vulnerability ([d271a00](https://github.com/px4n/hugo-syndicate/commit/d271a00512bf6cd60990a56b5ac7103e1f9b51b8))
* update workflows with permissions, validation, and formatting fixes ([5006cfd](https://github.com/px4n/hugo-syndicate/commit/5006cfd9d5f3606afa1277eeb3c85c13dc202fe8))

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
