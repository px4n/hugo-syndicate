#!/bin/bash

echo "Setting up development environment for Hugo Syndicate"

# Configure git commit template for this repository
git config --local commit.template .gitmessage

echo "Git commit template configured"
echo ""
echo "When committing, use conventional commit format:"
echo "  feat: add new feature"
echo "  fix: resolve bug"
echo "  docs: update documentation"
echo "  chore: update dependencies"
echo ""
echo "See CONTRIBUTING.md for full guidelines"
