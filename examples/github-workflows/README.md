# GitHub Actions Workflows for Hugo Syndicate Users

This directory contains example GitHub Actions workflows that **users of Hugo Syndicate** can copy to their Hugo project's `.github/workflows/` directory.

> **Note**: The Hugo Syndicate repository itself has its own CI workflows in `.github/workflows/` for testing the package. These examples are for users who want to automate their Hugo blog syndication.

## Available Workflows

### 1. `sync-devto.yml` - Automatic Syndication

**For automatic content publishing**

- Automatically syncs posts when changes are pushed to main
- Only processes files in `content/posts/` directory
- Requires `DEVTO_API_KEY` secret and `HUGO_BASE_URL` variable

```yaml
# Copy to: .github/workflows/sync-devto.yml
```

### 2. `sync-devto-manual.yml` - Manual Syndication

**For controlled content publishing**

- Manual trigger with options:
  - Sync only changed files
  - Sync all posts
  - Cleanup orphaned articles
- Configurable debug levels
- Upload sync logs as artifacts

```yaml
# Copy to: .github/workflows/sync-devto-manual.yml
```

### 3. `validate-posts.yml` - Content Validation

**For content quality assurance**

- Validates markdown files on pull requests
- Checks front matter format (YAML/TOML)
- Ensures required fields for dev.to syndication
- Comments on PR if validation fails

```yaml
# Copy to: .github/workflows/validate-posts.yml
```

## Setup Instructions

### 1. Choose Your Workflows

Copy the desired workflow files from this directory to your project's `.github/workflows/` directory:

```bash
# Example: Copy CI workflow
mkdir -p .github/workflows
cp examples/github-workflows/ci.yml .github/workflows/
```

### 2. Configure Repository Secrets

For syndication workflows, add these secrets in your GitHub repository settings:

- `DEVTO_API_KEY`: Your dev.to API key from https://dev.to/settings/account

### 3. Configure Repository Variables

Add these variables in your GitHub repository settings:

- `HUGO_BASE_URL`: Your Hugo site's base URL (e.g., `https://myblog.com`)

### 4. Branch Protection (Optional)

Consider adding branch protection rules that require the CI workflow to pass before merging.

## Workflow Triggers

All test workflows are configured to run on **any branch except `develop`** using:

```yaml
on:
  push:
    branches-ignore:
      - develop
  pull_request:
    branches-ignore:
      - develop
```

This ensures that:

- Tests run on feature branches
- Tests run on main/master branch
- Tests run on pull requests
- The `develop` branch is excluded (useful for development/staging)

## Customization

### Changing Excluded Branches

To exclude different branches, modify the `branches-ignore` section:

```yaml
branches-ignore:
  - develop
  - staging
  - experimental
```

### Adding More Node.js Versions

In `test.yml`, modify the strategy matrix:

```yaml
strategy:
  matrix:
    node-version: [16, 18, 20, 22] # Add more versions
```

### Custom Content Directories

If your content is not in `content/posts/`, update the path filters in the syndication workflows.

## Troubleshooting

### Tests Failing

1. Ensure all dependencies are properly listed in `package.json`
2. Check that tests pass locally with `npm test`
3. Verify Node.js version compatibility

### Syndication Issues

1. Verify `DEVTO_API_KEY` is correctly set in repository secrets
2. Check that `HUGO_BASE_URL` matches your actual site URL
3. Ensure posts have proper front matter with `devto = true`

### Permission Issues

1. Ensure `hugo-syndicate.js` is executable in your repository
2. Check that the workflow has necessary permissions for your use case

## Contributing

If you improve these workflows, consider submitting a pull request to help other users!
