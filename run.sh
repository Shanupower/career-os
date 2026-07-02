#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "===================================="
echo "  Career OS Automated Launcher"
echo "===================================="
echo ""

# 1. Verify Node is installed
if ! command -v node &> /dev/null; then
    echo "[launcher] Error: Node.js was not found. Please install Node.js first."
    exit 1
fi

# 2. Install Node dependencies if node_modules is missing
if [ ! -d "node_modules" ]; then
    echo "[launcher] Installing Node.js dependencies..."
    npm install
fi

# 3. Run cross-platform setup (clones sub-repos and configures Python)
echo "[launcher] Verifying dependencies and virtual environment..."
node scripts/setup.js --all

# 4. Start the development server
echo "[launcher] Starting Career OS development server..."
npm run dev
