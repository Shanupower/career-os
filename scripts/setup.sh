#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Career OS setup"
echo ""

echo "==> Installing Node dependencies..."
npm install

echo ""
echo "==> Setting up Python job pipeline (venv + requirements.txt + Playwright)..."
bash scripts/setup-job-discovery.sh

echo ""
echo "==> Setup complete!"
echo ""
echo "Next steps:"
echo "  1. (Optional) Install Claude Code CLI for AI-enhanced resume tailoring"
echo "  2. (Optional) Run: npm run claude:login"
echo "  3. Start the app:"
echo "       npm run dev          # development with hot reload"
echo "       npm run start        # production build + local server"
echo "  4. Open http://localhost:5173 and complete onboarding or load demo data in Settings"
echo ""
