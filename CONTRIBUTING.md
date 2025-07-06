# Contributing to Hugo Syndicate

Thank you for your interest in contributing to Hugo Syndicate. This guide will help you get started.

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Make your changes
5. Ensure tests pass: `npm test`
6. Submit a pull request

## Commit Message Guidelines

We use conventional commits for clear communication and automated changelog generation.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect code meaning (formatting, missing semicolons, etc)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to build process or auxiliary tools

### Examples

```bash
feat: add support for Medium platform

fix: correct tag sanitization for special characters

docs: update README with new configuration options

refactor: extract API client to separate module

test: add coverage for error handling
```

### Subject Rules

- Use imperative mood ("add" not "adds" or "added")
- Don't capitalize first letter
- No period at the end
- Limit to 50 characters

### Body Rules

- Use imperative mood
- Explain what and why, not how
- Wrap at 72 characters

### Breaking Changes

Add `BREAKING CHANGE:` in the footer with description:

```
feat: change default content directory

BREAKING CHANGE: Default content directory changed from 'posts/' to 'content/'
```

## Pull Request Process

1. Update documentation for any new features
2. Add tests for new functionality
3. Ensure all tests pass
4. Update CHANGELOG.md if needed (or let automation handle it)
5. Request review from maintainers

## Code Style

- Use 2 spaces for indentation
- Follow existing patterns in the codebase
- Keep functions focused and small
- Add comments only when necessary
- Use descriptive variable names

## Testing

- Write tests for new features
- Maintain or improve code coverage
- Run `npm test` before committing
- Run `npm run test:coverage` to check coverage

## Release Process

Releases are automated. Maintainers will:

1. Run version bump workflow
2. Review and merge the PR
3. Create and push version tag
4. Monitor automated release

## Questions?

Open an issue for questions or clarification about contributing.
