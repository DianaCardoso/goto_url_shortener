#!/usr/bin/env bash
# goto-app manual start for macOS (use when the LaunchDaemon is not installed)

export GOTO_HOST="${GOTO_HOST:-127.0.0.1}"
export GOTO_HTTP_PORT="${GOTO_HTTP_PORT:-8080}"

echo "================================================"
echo "  goto-app — Local URL Shortener"
echo "================================================"
echo ""
echo "Starting server with current GOTO_* environment settings..."
echo "Default manual mode: http://localhost:${GOTO_HTTP_PORT}/"
echo "The custom goto hostname only works after running the installer."
echo ""
echo "Management UI: http://${GOTO_HOST}:${GOTO_HTTP_PORT}/"
echo ""

exec node "$(dirname "$0")/server.js"
