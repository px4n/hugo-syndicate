#!/bin/bash

# Script to test GitHub Actions workflows locally using act

echo "=== Hugo Syndicate Workflow Testing ==="
echo ""

# Check if act is installed
if ! command -v act &>/dev/null; then
    echo "Error: 'act' is not installed."
    echo "Install it with: brew install act (macOS) or see https://github.com/nektos/act"
    exit 1
fi

# Check if Docker is running
if ! docker info &>/dev/null; then
    echo "Error: Docker is not running."
    echo "Please start Docker and try again."
    exit 1
fi

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to run test
run_test() {
    local test_name=$1
    local test_command=$2

    echo "Running: $test_name"
    echo "Command: $test_command"

    if eval "$test_command"; then
        echo -e "${GREEN}✓ $test_name passed${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}✗ $test_name failed${NC}"
        echo ""
        return 1
    fi
}

# Track failures
FAILED=0

echo "1. Testing CI Workflow - Test Job"
echo "================================"
run_test "CI Test Job (Node 18)" "act -W .github/workflows/ci.yml -j test --matrix node-version:18" || ((FAILED++))

echo "2. Testing CI Workflow - Lint Job"
echo "================================="
run_test "CI Lint Job" "act -W .github/workflows/ci.yml -j lint" || ((FAILED++))

echo "3. Testing Push Event"
echo "===================="
run_test "Push Event" "act push -W .github/workflows/ci.yml -e .github/test-events/push.json --dryrun" || ((FAILED++))

echo "4. Testing Pull Request Event"
echo "============================"
run_test "PR Event" "act pull_request -W .github/workflows/ci.yml -e .github/test-events/pull_request.json --dryrun" || ((FAILED++))

echo "5. Testing Release Workflow (Dry Run)"
echo "===================================="
run_test "Release Workflow" "act push -W .github/workflows/release.yml -e .github/test-events/release.json --dryrun" || ((FAILED++))

echo "6. Testing Version Bump Workflow (Dry Run)"
echo "========================================"
run_test "Version Bump" "act workflow_dispatch -W .github/workflows/version-bump.yml -e .github/test-events/version-bump.json --dryrun" || ((FAILED++))

echo ""
echo "=== Test Summary ==="
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All workflow tests passed!${NC}"
    exit 0
else
    echo -e "${RED}$FAILED workflow test(s) failed${NC}"
    exit 1
fi
