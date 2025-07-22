<div align="center">
  <img src="logo.svg" alt="Hugo Syndicate Logo" width="120" height="120">

# Hugo Syndicate

**Multi-provider content syndication for Hugo static sites**

_Sync your hugo blog posts to dev.to, Qiita and more (coming soon)_

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js](https://img.shields.io/badge/Node.js->=16.0.0-green.svg)](https://nodejs.org/)
[![Hugo](https://img.shields.io/badge/Hugo-Compatible-orange.svg)](https://gohugo.io/)

</div>

---

Hugo Syndicate automatically distributes your Hugo blog posts across multiple platforms.

> **⚠️ This is Alpha Software**: While functional, it may contain bugs and the API may change in future versions. Currently supports dev.to and Qiita. Use in production at your own risk.

## Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Hugo Front Matter](#hugo-front-matter)
- [GitHub Actions](#github-actions)
- [Provider Details](#provider-details)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Support](#support)

## Quick Start

1. Install globally:

   ```bash
   npm install -g hugo-syndicate
   ```

2. Set environment variables:

   ```bash
   export DEVTO_API_KEY=your_devto_key
   export QIITA_ACCESS_TOKEN=your_qiita_token
   ```

3. Mark posts for syndication:

   ```yaml
   ---
   title: "My Blog Post"
   devto: true
   qiita: true
   ---
   ```

4. Run from your Hugo project root:
   ```bash
   hugo-syndicate
   ```

## Features

### Current

- **Multi-Provider Architecture**: Extensible provider system supporting multiple platforms
- **Smart Sync Control**: Only syncs posts explicitly marked with provider flags
- **Hugo Shortcode Transformation**: Converts Hugo shortcodes to provider-compatible formats
- **Canonical URL Support**: Generates canonical URLs based on Hugo site structure
- **Git Integration**: Detects changed files to sync only updates
- **Orphaned Article Detection**: Finds and manages articles deleted from Hugo
- **Flexible Configuration**: Environment variables and CLI options
- **Debug Logging**: Multiple levels for detailed operation tracking

### Planned

- Medium, Hashnode, Ghost, WordPress integration
- Official GitHub Action
- Bi-directional sync (import comments/metrics)
- Content scheduling

## Requirements

- **Node.js**: Version 16.0.0 or higher
- **Git**: Required for change detection
- **Hugo Source Files**: Works with markdown + front matter (not published HTML)
- **API Keys**: For the providers you want to use

### Platform Compatibility

- **macOS/Linux**: Full support out of the box
- **Windows**: Requires Git for Windows (Git Bash) or WSL
- **CI/CD**: Compatible with GitHub Actions, GitLab CI, etc.

## Installation

### Global Installation (Recommended)

```bash
npm install -g hugo-syndicate
```

### Local Installation

```bash
npm install hugo-syndicate
```

### Quick Setup Script

```bash
curl -sSL https://raw.githubusercontent.com/px4n/hugo-syndicate/develop/scripts/install.sh | bash
```

## Configuration

### Environment Variables

Create a `.env` file in your Hugo project root:

```bash
# Required: Provider API Keys
DEVTO_API_KEY=your_dev_to_api_key
QIITA_ACCESS_TOKEN=your_qiita_token

# Optional: Configuration
HUGO_BASE_URL=https://yoursite.com
CONTENT_DIR=content/
DEBUG_LEVEL=2
PROVIDERS=devto,qiita
AUTO_DELETE=false
```

### Getting API Keys

- **dev.to**: Settings → Account → [API Keys](https://dev.to/settings/account)
- **Qiita**: Settings → [Applications](https://qiita.com/settings/applications)

## Usage

Run from your Hugo project root directory where your content folder is located.

### Basic Commands

```bash
# Sync changed posts to all configured providers
hugo-syndicate

# Sync to specific provider
hugo-syndicate --provider qiita

# Force sync all posts
hugo-syndicate --force-all

# Auto-delete orphaned articles
hugo-syndicate --auto-delete

# Show help
hugo-syndicate --help
```

### Debug Modes

```bash
# Basic info (default)
DEBUG_LEVEL=2 hugo-syndicate

# Detailed debugging
DEBUG_LEVEL=3 hugo-syndicate

# Verbose (includes API payloads)
DEBUG_LEVEL=4 hugo-syndicate
```

## Hugo Front Matter

Mark posts for syndication in your markdown front matter:

### YAML Format

```yaml
---
title: "My Blog Post"
date: 2025-01-15
tags: ["javascript", "webdev"]
devto: true # Sync to dev.to
qiita: true # Sync to Qiita
syndicate: true # Sync to all providers
draft: false # Must not be draft
---
```

### TOML Format

```toml
+++
title = "My Blog Post"
date = 2025-01-15
tags = ["javascript", "webdev"]
devto = true
qiita = true
draft = false
+++
```

### Sync Rules

Posts are synced when they meet ALL criteria:

1. **Provider flag**: `devto = true`, `qiita = true`, or `syndicate = true`
2. **Not a draft**: `draft = false` (or not set)
3. **Not private**: `visibility != "private"`
4. **Allowed directory**: In blog/, articles/, posts/, tech/, or tutorials/
5. **Post type**: Has type "post" (default)

## GitHub Actions

Example workflow for automatic syncing:

```yaml
name: Sync to Providers

on:
  push:
    branches: [main]
    paths: ["content/**/*.md"]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - uses: actions/setup-node@v4
        with:
          node-version: "20"

      - run: npm install -g hugo-syndicate

      - name: Sync to providers
        env:
          DEVTO_API_KEY: ${{ secrets.DEVTO_API_KEY }}
          QIITA_ACCESS_TOKEN: ${{ secrets.QIITA_ACCESS_TOKEN }}
          HUGO_BASE_URL: ${{ vars.HUGO_BASE_URL }}
        run: hugo-syndicate
```

See `examples/github-workflows/` for more workflow templates.

## Provider Details

### dev.to

**Limitations:**

- Maximum 4 tags per post
- Only alphanumeric tags (a-z, 0-9)
- 150,000 character limit
- Rate limit: 30 requests per 30 seconds

**Tag Examples:**

- ✅ `javascript`, `react`, `webdev`
- ❌ `日本語`, `c++`, `node.js`

### Qiita

**Limitations:**

- Maximum 5 tags per article
- Alphanumeric + hyphens (a-z, 0-9, -)
- Tags converted to lowercase
- 40 character tag limit

**Tag Examples:**

- ✅ `javascript`, `react-hooks`, `web-dev`
- ❌ `日本語`, `c++`, `node.js`

### Internationalization

Hugo Syndicate fully supports international content:

- **Content**: Any language (Japanese, Chinese, Korean, etc.)
- **Titles**: Full Unicode support
- **URLs**: Handles language prefixes (`/ja/blog/...`)
- **Tags**: Limited to ASCII due to API restrictions

## Supported Hugo Shortcodes

Hugo shortcodes are automatically transformed:

```hugo
{{< image src="/images/pic.jpg" alt="Picture" >}}
→ ![Picture](https://yoursite.com/images/pic.jpg)

{{< youtube dQw4w9WgXcQ >}}
→ {% youtube dQw4w9WgXcQ %}

{{< twitter 1234567890 >}}
→ {% twitter 1234567890 %}

{{< gist username abc123 >}}
→ {% gist abc123 %}
```

## Troubleshooting

### Common Issues

**"Failed to parse front matter"**

- Check YAML syntax (needs `---` delimiters)
- Verify proper indentation
- For TOML use `+++` delimiters

**"No markdown files to process"**

- Ensure posts have provider flags
- Posts must not be drafts
- Use `--force-all` to process all

**"Warning: Tags were removed"**

- dev.to: Only alphanumeric allowed
- Qiita: Alphanumeric + hyphens
- Add ASCII alternatives

**API Authentication Failed**

- Verify API keys are set correctly
- Check token permissions/scopes
- Regenerate if expired

### Recovery from Failed Syncs

```bash
# Re-sync all posts
hugo-syndicate --force-all

# Debug the issue
DEBUG_LEVEL=3 hugo-syndicate

# Check provider dashboards for orphaned drafts
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

For provider development, see [Provider Development Guide](docs/PROVIDERS.md).

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: add Medium provider      # Minor version
fix: handle empty responses    # Patch version
feat!: change config format    # Major version
docs: update installation      # No version bump
```

## Release Process

Releases are automated via semantic-release:

1. Commit with conventional format
2. Push to `develop` branch
3. Automatic version bump, changelog, and NPM publish

## License

Apache License 2.0 - see [LICENSE](LICENSE) file

## Support

For issues and questions:

- Check [Troubleshooting](#troubleshooting) section
- Run with `DEBUG_LEVEL=3` for detailed logs
- [Open an issue](https://github.com/px4n/hugo-syndicate/issues) with details
