# Contributing

## Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`

## Commit Messages

We use conventional commits for automated versioning. Format: `type(scope): subject`

**Types:**

- `feat`: New feature (minor version)
- `fix`: Bug fix (patch version)
- `perf`: Performance improvement (patch version)
- `feat!` or `BREAKING CHANGE`: Breaking change (major version)
- `docs`, `style`, `refactor`, `test`, `build`, `ci`: No version bump
- `chore`: Maintenance (hidden from changelog)
- `revert`: Revert a previous commit

**Examples:**

```bash
feat: add Medium provider support
fix: handle empty API responses
docs: update installation guide
feat(providers): add Hashnode integration
feat!: change config format to YAML
```

**Breaking Changes:**

```bash
# Using ! after type
git commit -m "feat!: change provider interface"

# Using BREAKING CHANGE in footer
git commit -m "feat: update API

BREAKING CHANGE: sync() now returns Promise"
```

Commits are validated by a pre-commit hook. Invalid commits will be rejected with helpful error messages.

## Pull Requests

1. Write tests for new features
2. Ensure all tests pass
3. Follow existing code patterns
4. Keep changes focused

## Code Style

- 2 spaces indentation
- Descriptive variable names
- Minimal comments
- Small, focused functions

## Testing

Run tests before committing:

```bash
npm test              # Run all tests
npm test:coverage     # Check coverage
```

## Release Process

Releases are automated via semantic-release. Your commit messages determine version bumps:

- `fix:` → Patch (1.0.0 → 1.0.1)
- `feat:` → Minor (1.0.0 → 1.1.0)
- `feat!:` → Major (1.0.0 → 2.0.0)

Never manually bump versions. Push to `develop` branch triggers automatic release if needed.

## Questions

Open an issue for clarification.
