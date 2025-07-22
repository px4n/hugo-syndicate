#!/bin/bash

# Hugo Syndicate Quick Setup Script
# This script helps users quickly set up hugo-syndicate in their Hugo projects
#
# Usage: curl -sSL https://raw.githubusercontent.com/px4n/hugo-syndicate/develop/scripts/install.sh | bash

set -euo pipefail

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Script configuration
readonly SCRIPT_VERSION="1.0.0"
readonly NPM_PACKAGE="hugo-syndicate"

# Helper functions
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verify prerequisites
check_prerequisites() {
    local missing_deps=()

    if ! command_exists node; then
        missing_deps+=("Node.js")
    fi

    if ! command_exists npm; then
        missing_deps+=("npm")
    fi

    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing required dependencies: ${missing_deps[*]}"
        print_info "Please install Node.js from https://nodejs.org/"
        exit 1
    fi

    # Check Node.js version
    local node_version
    node_version=$(node -v | cut -d'v' -f2)
    local major_version
    major_version=$(echo "$node_version" | cut -d'.' -f1)

    if [ "$major_version" -lt 16 ]; then
        print_error "Node.js version 16 or higher is required (found: v$node_version)"
        exit 1
    fi
}

# Check if running in a Hugo project
check_hugo_project() {
    if [ ! -f "config.toml" ] && [ ! -f "config.yaml" ] && [ ! -f "config.json" ] && [ ! -f "hugo.toml" ] && [ ! -f "hugo.yaml" ] && [ ! -f "hugo.json" ]; then
        print_warning "No Hugo configuration file found."
        read -p "Are you in the root of your Hugo project? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_error "Please run this script from your Hugo project root directory."
            exit 1
        fi
    fi

    if [ ! -d "content" ]; then
        print_warning "No 'content' directory found."
        print_info "Creating content directory..."
        mkdir -p content
    fi
}

# Initialize npm if needed
init_npm() {
    if [ ! -f "package.json" ]; then
        print_info "Initializing npm package..."
        npm init -y >/dev/null 2>&1
        print_success "Created package.json"
    fi
}

# Install hugo-syndicate
install_package() {
    print_info "Installing hugo-syndicate..."

    # Check if already installed
    if npm list "$NPM_PACKAGE" >/dev/null 2>&1; then
        print_info "hugo-syndicate is already installed. Updating to latest version..."
        npm update "$NPM_PACKAGE"
    else
        npm install -g "$NPM_PACKAGE"
    fi

    print_success "hugo-syndicate installed successfully"
}

# Create .env.example
create_env_example() {
    if [ -f ".env.example" ]; then
        print_info ".env.example already exists, skipping..."
        return
    fi

    print_info "Creating .env.example..."
    cat > .env.example << 'EOF'
# Hugo Syndicate Configuration
# Copy this file to .env and add your API keys

# dev.to API Key
# Get yours at: https://dev.to/settings/account
DEVTO_API_KEY=your_devto_api_key_here

# Qiita Access Token
# Get yours at: https://qiita.com/settings/applications
QIITA_ACCESS_TOKEN=your_qiita_access_token_here

# Hugo Site Configuration
HUGO_BASE_URL=https://yoursite.com
CONTENT_DIR=content/

# Optional Settings
DEBUG_LEVEL=2
# PROVIDERS=devto,qiita
# FORCE_SYNC_ALL=false
# AUTO_DELETE=false
EOF

    print_success "Created .env.example"

    # Add .env to .gitignore if it exists
    if [ -f ".gitignore" ] && ! grep -q "^.env$" .gitignore; then
        echo -e "\n# Hugo Syndicate\n.env" >> .gitignore
        print_info "Added .env to .gitignore"
    fi
}

# Create example GitHub workflow
create_github_workflow() {
    if [ -d ".github/workflows" ] && [ -f ".github/workflows/sync-providers.yml" ]; then
        print_info "GitHub workflow already exists, skipping..."
        return
    fi

    read -p "Would you like to set up GitHub Actions for automatic syncing? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        return
    fi

    print_info "Creating GitHub Actions workflow..."
    mkdir -p .github/workflows

    cat > .github/workflows/sync-providers.yml << 'EOF'
name: Sync to Providers

on:
  push:
    branches: [main]
    paths: ["content/**/*.md"]
  workflow_dispatch:

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
EOF

    print_success "Created .github/workflows/sync-providers.yml"
    print_info "Remember to add your API keys as GitHub secrets!"
}

# Main installation flow
main() {
    echo "Hugo Syndicate Quick Setup v${SCRIPT_VERSION}"
    echo "==========================================="
    echo

    # Run checks
    check_prerequisites
    check_hugo_project

    # Installation steps
    init_npm
    install_package
    create_env_example
    create_github_workflow

    # Final instructions
    echo
    print_success "Setup complete! 🎉"
    echo
    echo "Next steps:"
    echo "1. Copy .env.example to .env:"
    echo "   ${BLUE}cp .env.example .env${NC}"
    echo
    echo "2. Add your API keys to .env:"
    echo "   - dev.to: https://dev.to/settings/account"
    echo "   - Qiita: https://qiita.com/settings/applications"
    echo
    echo "3. Mark posts for syndication by adding to front matter:"
    echo "   ${BLUE}devto: true${NC}     # Sync to dev.to"
    echo "   ${BLUE}qiita: true${NC}     # Sync to Qiita"
    echo "   ${BLUE}syndicate: true${NC} # Sync to all providers"
    echo
    echo "4. Run hugo-syndicate:"
    echo "   ${BLUE}hugo-syndicate${NC}          # Sync changed posts"
    echo "   ${BLUE}hugo-syndicate --force-all${NC} # Sync all posts"
    echo
    echo "For more information, visit:"
    echo "https://github.com/px4n/hugo-syndicate"
}

# Handle errors
trap 'print_error "Installation failed. If you need help, please open an issue at https://github.com/px4n/hugo-syndicate/issues"' ERR

# Run main function
main "$@"