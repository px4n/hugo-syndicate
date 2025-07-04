<div align="center">
  <img src="logo.svg" alt="Hugo Syndicate Logo" width="120" height="120">

# Hugo Syndicate

**Multi-provider content syndication for Hugo static sites**

_Sync your blog posts to dev.to, Medium, Hashnode, and more_

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js->=14.0.0-green.svg)](https://nodejs.org/)
[![Hugo](https://img.shields.io/badge/Hugo-Compatible-orange.svg)](https://gohugo.io/)

</div>

---

Hugo Syndicate automatically distributes your Hugo blog posts across multiple platforms.

> **⚠️ Alpha Software**: This is version 0.1.0-alpha. While functional, it may contain bugs and the API may change in future versions. Currently only supports dev.to. Use in production at your own risk.

## Requirements

- **Hugo Source Files**: This tool works with your Hugo source files (markdown + front matter), **not** the published HTML site
- **Git Repository**: Requires a git repository to detect changed files
- **Node.js**: Version 14.0.0 or higher
- **dev.to API Key**: Required for syncing to dev.to

## How It Works

Hugo Syndicate works with your Hugo source files before or after site generation:

1. Reads your Hugo markdown files from configurable content directory (default: `content/`)
2. Parses YAML or TOML front matter
3. Transforms Hugo shortcodes to dev.to compatible format
4. Syncs to dev.to via their API (maximum 4 tags per post)

This tool does not work with published HTML sites. It needs access to your raw Hugo markdown files and front matter.

## Features

### Current (v0.1.0-alpha - dev.to Only)

- **dev.to Integration**: Complete dev.to API integration with create/update/delete operations
- **Smart Sync Control**: Only syncs posts explicitly marked with frontmatter `devto = true`
- **Hugo Shortcode Transformation**: Converts Hugo shortcodes to dev.to liquid tags
- **Automatic Canonical URLs**: Generates canonical URLs based on Hugo site structure
- **Orphaned Article Cleanup**: Detects and handles articles that no longer exist in Hugo
- **Comprehensive Logging**: Multiple debug levels for detailed operation tracking
- **Error Handling**: Robust error handling with detailed reporting
- **Dual Format Support**: Supports both YAML and TOML front matter

### Planned Features (Multi-Provider Roadmap)

- **Multiple Platforms**: dev.to, Medium, Hashnode, Ghost, WordPress, and more
- **GitHub Action**: Official GitHub Action for seamless CI/CD integration
- **Provider-Specific Configuration**: Customizable settings per platform
- **Content Transformation**: Platform-specific content optimization
- **Selective Syndication**: Choose which platforms to sync per post
- **Bi-directional Sync**: Import comments and engagement metrics back to Hugo

## Installation

### Global Installation (Recommended)

```bash
npm install -g hugo-syndicate
```

### Local Installation

Install in your Hugo project directory:

```bash
npm install hugo-syndicate
```

### From Source

```bash
git clone https://github.com/px4n/hugo-syndicate.git
cd hugo-syndicate
npm install
```

## Testing

Run the test suite to verify functionality:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Environment Variables

Create a `.env` file or set these environment variables:

```bash
# Required
DEVTO_API_KEY=your_dev_to_api_key_here

# Optional
HUGO_BASE_URL=https://yoursite.com
CONTENT_DIR=content/
DEBUG_LEVEL=2
FORCE_SYNC_ALL=false
AUTO_DELETE_DEVTO=false
```

### Environment Variable Details

- `DEVTO_API_KEY`: Your dev.to API key (required) - Get from https://dev.to/settings/account
- `HUGO_BASE_URL`: Your Hugo site's base URL for canonical URLs (default: https://yoursite.com)
- `CONTENT_DIR`: Your Hugo content directory (default: content/)
- `DEBUG_LEVEL`: Logging level 0-4 (0=ERROR, 1=WARN, 2=INFO, 3=DEBUG, 4=VERBOSE)
- `FORCE_SYNC_ALL`: Process all posts instead of just changed files (default: false)
- `AUTO_DELETE_DEVTO`: Automatically unpublish orphaned articles on dev.to (default: false)

## Usage

**Run from your Hugo project root directory** where your content folder is located.

### Basic Usage

If installed globally:

```bash
# Sync only changed files (requires git)
hugo-syndicate

# Sync all posts to dev.to
FORCE_SYNC_ALL=true hugo-syndicate

# Sync with debug logging
DEBUG_LEVEL=3 hugo-syndicate

# Sync with verbose logging
DEBUG_LEVEL=4 hugo-syndicate
```

If installed locally:

```bash
# Sync only changed files (requires git)
npm run sync

# Sync all posts to dev.to
npm run sync:all

# Sync with debug logging
npm run sync:debug

# Sync with verbose logging
npm run sync:verbose
```

### Direct Node.js Usage

```bash
# Basic sync
node sync-devto.js

# Force sync all posts
FORCE_SYNC_ALL=true node hugo-syndicate.js

# Enable debug logging
DEBUG_LEVEL=3 node hugo-syndicate.js
```

## Hugo Front Matter Configuration

To sync a Hugo post to dev.to, add `devto = true` to your Hugo markdown file's front matter:

### TOML Front Matter Example

```toml
+++
title = "My Blog Post"
description = "A description of my blog post"
date = "2025-01-01T10:00:00Z"
tags = ["javascript", "webdev"]
categories = ["dev.to"]
devto = true
draft = false
+++

Your post content here...
```

### YAML Front Matter Example

```yaml
---
title: "My Blog Post"
description: "A description of my blog post"
date: "2025-01-01T10:00:00Z"
tags: ["javascript", "webdev"]
categories: ["dev.to"]
devto: true
draft: false
---
Your post content here...
```

## Supported Hugo Shortcodes

The script automatically transforms these Hugo shortcodes to dev.to liquid tag format:

### Image Shortcode

```hugo
{{< image src="/images/example.jpg" alt="Example image" >}}
```

Becomes:

```markdown
![Example image](https://yoursite.com/images/example.jpg)
```

### Code Shortcode

```hugo
{{< code language="javascript" title="Example Code" >}}
console.log("Hello World!");
{{< /code >}}
```

Becomes:

````markdown
**Example Code**

```javascript
console.log("Hello World!");
```
````

### YouTube Shortcode

```hugo
{{< youtube dQw4w9WgXcQ >}}
```

Becomes:

```liquid
{% youtube dQw4w9WgXcQ %}
```

### Twitter Shortcode

```hugo
{{< twitter 1234567890 >}}
```

Becomes:

```liquid
{% twitter 1234567890 %}
```

### Gist Shortcode

```hugo
{{< gist username gist-id >}}
```

Becomes:

```liquid
{% gist gist-id %}
```

## Sync Rules

Posts are synced to dev.to only if they meet ALL of these criteria:

1. `devto = true` in front matter
2. `draft = false` (or not set)
3. `visibility != "private"`
4. Located in allowed directories (default: blog/, articles/, posts/, tech/, tutorials/)
5. Has allowed post type (default: "post")
6. Contains allowed categories/tags (default: "dev.to")

### dev.to Limitations

- **Maximum 4 tags**: dev.to only allows 4 tags per post. If your post has more than 4 tags, only the first 4 will be synced
- **Content directory**: Configurable via `CONTENT_DIR` environment variable (default: `content/`)

## Configuration

The script includes a `SYNC_CONFIG` object you can modify:

```javascript
const SYNC_CONFIG = {
  contentDir: process.env.CONTENT_DIR || "content/",
  allowedCategories: ["dev.to"],
  allowedTypes: ["post"],
  allowedDirectories: ["blog/", "articles/", "posts/", "tech/", "tutorials/"], // relative to contentDir
  requireExplicitSync: true,
  maxTags: 4, // dev.to API limitation
};
```

## Article Matching

The script matches Hugo posts to dev.to articles using:

1. **Canonical URL** (preferred method)
2. **Title** (fallback method)

## Orphaned Article Cleanup

When `FORCE_SYNC_ALL=true`, the script:

1. Scans all sync-eligible Hugo posts
2. Compares with existing dev.to articles
3. Identifies orphaned articles (exist on dev.to but not in Hugo)
4. Optionally unpublishes them if `AUTO_DELETE_DEVTO=true`

## GitHub Actions Integration

Hugo Syndicate includes **example workflow templates** in `examples/github-workflows/` that you can copy to your Hugo project.

### Example Workflows Included:

1. **`sync-devto.yml`** - Automatic sync when posts are pushed
2. **`sync-devto-manual.yml`** - Manual sync with options (all posts, cleanup, etc.)
3. **`validate-posts.yml`** - Validates post format on pull requests

### Setup Instructions:

1. Copy the desired workflow files from `examples/github-workflows/` to your Hugo project's `.github/workflows/` directory
2. Set up repository secrets: `DEVTO_API_KEY`
3. Set up repository variables: `HUGO_BASE_URL`

### Example: Automatic Sync Workflow

Copy `examples/github-workflows/sync-devto.yml` to your Hugo project:

```yaml
name: Sync to dev.to

on:
  push:
    branches: [main]
    paths: ["content/posts/**/*.md"]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci

      - name: Sync to dev.to
        env:
          DEVTO_API_KEY: ${{ secrets.DEVTO_API_KEY }}
          HUGO_BASE_URL: ${{ vars.HUGO_BASE_URL }}
        run: npm run sync
```

## Error Handling

The script includes basic error handling:

- **API Connection**: Tests dev.to API connectivity before syncing
- **File Parsing**: Handles invalid front matter gracefully
- **Rate Limiting**: Implements timeouts and proper error responses
- **Validation**: Checks all required fields before syncing

## Debug Levels

- `0` (ERROR): Only critical errors
- `1` (WARN): Warnings and errors
- `2` (INFO): General information (default)
- `3` (DEBUG): Detailed debugging information
- `4` (VERBOSE): All available information

## Troubleshooting

### Common Issues

1. **Invalid API Key**: Ensure your dev.to API key is correct and has write permissions
2. **Missing Dependencies**: Run `npm install` to install required packages
3. **Git Not Available**: Ensure git is installed and the directory is a git repository
4. **File Permissions**: Ensure the script has read access to your Hugo content directory
5. **Hugo Config Not Found**: Ensure `hugo.toml` exists in the root directory for canonical URL generation
6. **Tag Validation Errors**: Tags are automatically sanitized to alphanumeric characters only

### Sync Failures and Recovery

If a sync fails during the "delete and recreate" process, you may end up with an unpublished draft article on dev.to containing a placeholder message. This can happen when:

- The old article is successfully unpublished
- But creating the new article fails due to validation errors

**Recovery Steps:**

1. **Automatic Recovery (Recommended)**: Simply run the sync again. The script will detect the missing article and create a new one
2. **Manual Recovery**: Delete the unpublished draft from your dev.to dashboard and run the sync again
3. **Debug First**: Use debug mode to identify the specific issue before retrying

### Failed Article Creation

When article creation fails, check these common causes:

1. **Invalid Canonical URL**: Ensure your Hugo permalink configuration is valid
2. **Content Too Long**: dev.to has content length limits
3. **Invalid Characters**: Some special characters may cause issues
4. **API Rate Limiting**: Wait a few minutes between sync attempts

### Debug Mode

Run with different debug levels to see detailed operation information:

```bash
# Basic info (default)
DEBUG_LEVEL=2 node hugo-syndicate.js

# Detailed debugging
DEBUG_LEVEL=3 node hugo-syndicate.js

# Verbose logging (includes API payloads)
DEBUG_LEVEL=4 node hugo-syndicate.js
```

**Debug Output Includes:**

- Hugo config loading status
- Canonical URL generation details
- Tag sanitization transformations
- API request/response details
- Article matching logic

### Common Error Messages

**"Failed to delete and recreate article"**

- Check debug logs for specific API error details
- Verify canonical URL format is valid
- Ensure all required frontmatter fields are present

**"Tag contains non-alphanumeric characters"**

- Tags are automatically sanitized, but check debug logs for transformations
- Ensure original tags don't result in empty strings after sanitization

**"hugo.toml not found"**

- Script falls back to simple URL generation
- For proper canonical URLs, ensure Hugo config exists in root directory

## Roadmap / Ideas

### Version 2.0 - Multi-Provider Support

- Medium integration with custom publication support
- Hashnode integration with team blogs
- Ghost platform support for headless CMS
- WordPress.com REST API integration

### Version 3.0 - GitHub Action & Advanced Features

- **Official GitHub Action**: Publish as a GitHub Action for easy CI/CD integration
- **Web-based Configuration**: Optional web interface for managing syndication settings
- **Content Scheduling**: Schedule posts for optimal engagement times

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please see the contributing guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions:

- Check the troubleshooting section above
- Review the debug output with `DEBUG_LEVEL=3`
- Open an issue on GitHub with detailed information
