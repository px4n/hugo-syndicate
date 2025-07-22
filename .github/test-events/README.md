# Test Event Files

I'm using these JSON files to simulate GitHub webhook events for local testing of GitHub Actions workflows using tools like `act`.

## Files

### push.json

Currently simulates a push event to a branch and is used for testing workflows triggered by `on: push`.

- Tests release workflow behavior
- Can simulate pushes to different branches
- Useful for testing branch-specific logic

### pull_request.json

Currently simulates a pull request event and is used for testing workflows triggered by `on: pull_request`.

- Tests PR validation workflows
- Can simulate different PR actions (opened, synchronize, closed)
- Useful for testing PR checks and validations

### release.json

Currently simulates a release/tag push event and is used for testing workflows triggered by tags.

- Tests release automation
- Simulates version tags (e.g., v1.0.0)

## Usage with act

```bash
# Test push event
act push --eventpath .github/test-events/push.json

# Test pull request
act pull_request --eventpath .github/test-events/pull_request.json

# Test release
act push --eventpath .github/test-events/release.json
```
