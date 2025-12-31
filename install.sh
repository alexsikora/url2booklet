#!/bin/bash

#
# install.sh
# Automated installation script for url2booklet
#

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "URL to Booklet PDF Converter - Installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Detect script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
INSTALL_DIR="$HOME/.local/bin"
LIB_DIR="$INSTALL_DIR/url2booklet-lib"
OUTPUT_DIR="$HOME/Downloads/booklets"

echo "Installation Configuration:"
echo "  Script location: $SCRIPT_DIR"
echo "  Install to: $INSTALL_DIR"
echo "  Library dir: $LIB_DIR"
echo "  Output dir: $OUTPUT_DIR"
echo ""

# Check for Homebrew
echo "Checking for Homebrew..."
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew not found!"
    echo ""
    echo "Please install Homebrew first:"
    echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi
echo "✓ Homebrew found"

# Check for Node.js
echo "Checking for Node.js..."
if ! command -v node &> /dev/null; then
    echo "⚠️  Node.js not found"
    read -p "Install Node.js via Homebrew? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        brew install node
    else
        echo "Please install Node.js manually and re-run this script"
        exit 1
    fi
fi
echo "✓ Node.js found ($(node --version))"

# Check for Python 3
echo "Checking for Python 3..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found!"
    echo "Please install Python 3 and re-run this script"
    exit 1
fi
echo "✓ Python 3 found ($(python3 --version))"

# Install pdftk-java
echo ""
echo "Installing system dependencies..."
if ! command -v pdftk &> /dev/null; then
    echo "Installing pdftk-java..."
    brew install pdftk-java
else
    echo "✓ pdftk-java already installed"
fi

# Install Node.js packages
echo ""
echo "Installing Node.js packages..."
echo "This may take a few minutes..."

packages=("@mozilla/readability" "puppeteer" "jsdom")
for package in "${packages[@]}"; do
    if npm list -g "$package" &> /dev/null; then
        echo "✓ $package already installed"
    else
        echo "Installing $package..."
        npm install -g "$package"
    fi
done

# Install Chromium for Puppeteer
echo ""
echo "Installing Chromium for Puppeteer..."
if npx puppeteer browsers install chrome 2>&1 | grep -q "already exists"; then
    echo "✓ Chromium already installed"
else
    npx puppeteer browsers install chrome
fi

# Install Python packages
echo ""
echo "Installing Python packages..."
if python3 -c "import pypdf" 2>/dev/null; then
    echo "✓ pypdf already installed"
else
    echo "Installing pypdf..."
    pip3 install pypdf --break-system-packages
fi

# Create directories
echo ""
echo "Creating directories..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$LIB_DIR"
mkdir -p "$OUTPUT_DIR"
echo "✓ Directories created"

# Copy scripts
echo ""
echo "Installing scripts..."
cp "$SCRIPT_DIR/bin/url2booklet" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/lib/"* "$LIB_DIR/"
echo "✓ Scripts copied"

# Make executable
echo "Setting permissions..."
chmod +x "$INSTALL_DIR/url2booklet"
chmod +x "$LIB_DIR/"*.{js,py,sh} 2>/dev/null || true
echo "✓ Permissions set"

# Check PATH
echo ""
echo "Checking PATH configuration..."
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    echo "⚠️  ~/.local/bin is not in your PATH"
    echo ""
    echo "Add this line to your ~/.zshrc (or ~/.bash_profile):"
    echo ""
    echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
    echo ""
    echo "Then run: source ~/.zshrc"
    echo ""
else
    echo "✓ ~/.local/bin is in PATH"
fi

# Test installation
echo ""
echo "Testing installation..."
if command -v url2booklet &> /dev/null; then
    echo "✓ url2booklet command is available"
else
    echo "⚠️  url2booklet command not found in PATH"
    echo "You may need to restart your terminal or update PATH"
fi

# Installation complete
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Installation Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Quick Start:"
echo "  1. Test: url2booklet \"https://en.wikipedia.org/wiki/JavaScript\""
echo "  2. Output: ~/Downloads/booklets/"
echo ""
echo "Safari Integration:"
echo "  See README.md for instructions on setting up the Shortcuts integration"
echo ""
echo "Documentation:"
echo "  $SCRIPT_DIR/README.md"
echo ""
