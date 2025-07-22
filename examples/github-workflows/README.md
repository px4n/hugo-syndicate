# GitHub Actions Workflows for Hugo Syndicate

Minimal example workflows for automating content syndication from your Hugo blog to dev.to and Qiita.

## Available Workflows

### 1. `sync-providers.yml` - Automatic Sync

**Automatically sync when you push changes**

```yaml
# Syncs on push to main branch
# Triggers when content/*.md files change
# Manual trigger available
```

### 2. `sync-manual.yml` - Manual Sync

**Manually trigger syndication**

```yaml
# Manual trigger only
# Option to force sync all posts
```

## Quick Setup

### 1. Install hugo-syndicate

```bash
npm install -g hugo-syndicate
```

### 2. Copy a workflow

```bash
mkdir -p .github/workflows
cp sync-providers.yml .github/workflows/
```

### 3. Add secrets

In your repository settings → Secrets:

- `DEVTO_API_KEY` - Get from [dev.to/settings/account](https://dev.to/settings/account)
- `QIITA_ACCESS_TOKEN` - Get from [qiita.com/settings/applications](https://qiita.com/settings/applications)

### 4. Add variables

In your repository settings → Variables:

- `HUGO_BASE_URL` - Your site URL (e.g., `https://myblog.com`)

## Usage

### Mark posts for syndication

In your Hugo post front matter:

```yaml
---
title: "My Blog Post"
devto: true # Sync to dev.to
qiita: true # Sync to Qiita
# OR
syndicate: true # Sync to all configured providers
---
```

### Supported directories

Posts must be in one of:

- `content/blog/`
- `content/posts/`
- `content/articles/`
- `content/tech/`
- `content/tutorials/`

## Troubleshooting

**Workflow not running?**

- Check secrets are set correctly
- Ensure post has `devto: true` or `qiita: true`
- Verify post is in a supported directory

**Sync failed?**

- Check API keys are valid
- Ensure `HUGO_BASE_URL` is correct
- Run `hugo-syndicate` locally to debug
