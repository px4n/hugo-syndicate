# Testing GitHub Actions Workflows Locally

This guide shows how to test GitHub Actions workflows locally before pushing to GitHub.

## Using `act` - Run GitHub Actions Locally

[`act`](https://github.com/nektos/act) is a tool that allows you to run GitHub Actions workflows locally using Docker.

### Installation

#### macOS (Homebrew)

```bash
brew install act
```

#### Linux/Windows

```bash
# Install via script
curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Or download from releases
# https://github.com/nektos/act/releases
```

### Prerequisites

- Docker must be installed and running
- GitHub CLI (optional, for using GitHub tokens)

### Basic Usage

#### 1. List Available Workflows

```bash
# List all workflows
act -l

# Output:
# Stage  Job ID         Job name              Workflow name          Workflow file       Events
# 0      test           Test                  CI                     ci.yml              push,pull_request
# 0      lint           Code Quality          CI                     ci.yml              push,pull_request
# 0      integration    Integration Test      CI                     ci.yml              push,pull_request
```

#### 2. Run CI Workflow

```bash
# Run the default push event
act

# Run a specific workflow
act -W .github/workflows/ci.yml

# Run with specific Node.js version
act --matrix node-version:18
```

#### 3. Run Specific Jobs

```bash
# Run only the test job
act -j test

# Run only lint checks
act -j lint
```

#### 4. Test Pull Request Workflows

```bash
# Simulate a pull request event
act pull_request

# With specific branch
act pull_request --eventpath .github/test-events/pr.json
```

### Creating Test Events

Create test event files to simulate different scenarios:

#### .github/test-events/push.json

```json
{
  "ref": "refs/heads/feature/new-feature",
  "repository": {
    "name": "hugo-syndicate",
    "owner": {
      "login": "px4n"
    }
  }
}
```

#### .github/test-events/release.json

```json
{
  "ref": "refs/tags/v0.1.0-alpha.2"
}
```

#### .github/test-events/pr.json

```json
{
  "action": "opened",
  "number": 42,
  "pull_request": {
    "head": {
      "ref": "feature/test-branch"
    },
    "base": {
      "ref": "main"
    }
  }
}
```

### Running Release Workflow Locally

```bash
# Test release workflow with tag
act push -W .github/workflows/release.yml --eventpath .github/test-events/release.json

# Dry run (don't actually execute)
act -n push -W .github/workflows/release.yml
```

### Environment Variables and Secrets

#### 1. Create `.secrets` file (don't commit this!)

```bash
# .secrets
NPM_TOKEN=your_test_token_here
DEVTO_API_KEY=test_key_for_local_testing
```

#### 2. Create `.env` file for variables

```bash
# .env
HUGO_BASE_URL=https://test.local
DEBUG_LEVEL=3
```

#### 3. Run with secrets and env

```bash
act --secret-file .secrets --env-file .env
```

### Testing Specific Scenarios

#### Test Version Bump Workflow

```bash
# Create event for workflow_dispatch
echo '{"inputs":{"version_type":"patch"}}' > .github/test-events/version-bump.json

# Run version bump workflow
act workflow_dispatch -W .github/workflows/version-bump.yml -e .github/test-events/version-bump.json
```

#### Test Matrix Builds

```bash
# Test all matrix combinations
act -W .github/workflows/ci.yml

# Test specific matrix combination
act -W .github/workflows/ci.yml --matrix os:ubuntu-latest --matrix node-version:18
```

#### Test Conditional Steps

```bash
# Test with different event contexts
act push --env GITHUB_REF=refs/heads/main
act push --env GITHUB_REF=refs/heads/develop
```

### Common Issues and Solutions

#### 1. Docker Container Size

```bash
# Use medium sized image (default is large)
act -P ubuntu-latest=nektos/act-environments-ubuntu:18.04

# Use specific slim image
act -P ubuntu-latest=node:18-slim
```

#### 2. Path Issues

```bash
# Mount current directory properly
act -b # Bind working directory to container
```

#### 3. Missing Commands

Some GitHub Actions use commands not available in act containers:

```bash
# Install missing tools in workflow
- name: Install tools
  run: |
    apt-get update && apt-get install -y jq bc
```

### Advanced Configuration

Create `.actrc` file for default settings:

```bash
# .actrc
-P ubuntu-latest=nektos/act-environments-ubuntu:18.04
-P ubuntu-22.04=nektos/act-environments-ubuntu:22.04
-P ubuntu-20.04=nektos/act-environments-ubuntu:20.04
--container-architecture linux/amd64
```

### Debugging Workflows

```bash
# Verbose output
act -v

# Very verbose (debug)
act -vv

# Keep containers after run for inspection
act --rm=false

# Use specific Docker network
act --network host
```

### Example Test Script

Create `scripts/test-workflows.sh`:

```bash
#!/bin/bash

echo "Testing CI workflow..."
act -W .github/workflows/ci.yml -j test || exit 1

echo "Testing lint checks..."
act -W .github/workflows/ci.yml -j lint || exit 1

echo "Testing release workflow (dry run)..."
act -n push -W .github/workflows/release.yml -e .github/test-events/release.json || exit 1

echo "All workflow tests passed!"
```

### Alternative: GitHub Actions Locally with Docker

If `act` doesn't work for your use case, you can test manually:

```bash
# Test the main script
docker run --rm -v "$PWD":/workspace -w /workspace node:18 npm test

# Test with environment variables
docker run --rm \
  -e DEVTO_API_KEY=test \
  -e HUGO_BASE_URL=https://test.com \
  -v "$PWD":/workspace \
  -w /workspace \
  node:18 npm test
```

### CI-specific Testing

For hugo-syndicate specifically:

```bash
# Test the CI workflow
act -W .github/workflows/ci.yml

# Test only on Node 18
act -W .github/workflows/ci.yml --matrix node-version:18

# Test integration job with secrets
act -W .github/workflows/ci.yml -j integration --secret-file .secrets
```

### Best Practices

1. **Always test locally first**: Use `act` before pushing workflow changes
2. **Use dry run**: Test with `-n` flag first
3. **Test events**: Create realistic event JSON files
4. **Version control test files**: Keep test events in `.github/test-events/` directory
5. **Document secrets**: List required secrets in README (not values!)
6. **Use minimal images**: Faster testing with smaller Docker images

### Limitations of Local Testing

- Some GitHub-specific features won't work (e.g., `github` context)
- Container environment differs from GitHub runners
- Some actions may not be compatible with `act`
- Secrets and permissions work differently

For these cases, use a separate test branch and GitHub's workflow visualization.
