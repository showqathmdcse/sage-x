#!/bin/bash
# ============================================
# AAVA Code - Quick Install Script
# ============================================
# Usage: curl -sSL <your-url>/install.sh | bash
# Or:    ./install.sh

set -e

echo ""
echo "  🔥 Installing AAVA Code v1.0..."
echo "  Multi-Cloud AI Coding Assistant"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "  ❌ Node.js is required but not installed."
    echo "     Install from: https://nodejs.org (v18+)"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "  ❌ Node.js v18+ required. Found: $(node -v)"
    exit 1
fi

echo "  ✓ Node.js $(node -v) found"

# Install globally from npm
echo "  📦 Installing aava-code..."
npm install -g aava-code

echo ""
echo "  ✅ AAVA Code installed successfully!"
echo ""
echo "  Get started:"
echo "    1. Run:  aava-code  (or smart-code)"
echo "    2. Pick provider:  /provider"
echo "    3. Add credentials: /config"
echo "    4. Start coding!"
echo ""
