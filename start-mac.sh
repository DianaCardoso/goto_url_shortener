#!/usr/bin/env bash
# goto-app manual start for macOS (use when the LaunchDaemon is not installed)
# Requires Administrator privileges to bind port 80.
# Usage: sudo bash start-mac.sh

echo "================================================"
echo "  goto-app — Local URL Shortener"
echo "================================================"
echo ""
echo "Starting server on port 80..."
echo "This requires Administrator privileges."
echo ""
echo "Management UI: http://goto/"
echo ""

if [ "$EUID" -ne 0 ]; then
  exec sudo node "$(dirname "$0")/server.js"
else
  node "$(dirname "$0")/server.js"
fi
