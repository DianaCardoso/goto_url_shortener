#!/usr/bin/env bash
# goto-app uninstall for macOS
# Stops and removes the LaunchDaemon, removes hosts file entry, flushes DNS.
# Usage: sudo bash uninstall-mac.sh
#        (script self-elevates if not already root)

set -euo pipefail

# ---------------------------------------------------------------------------
# Self-elevation
# ---------------------------------------------------------------------------
if [ "$EUID" -ne 0 ]; then
  echo "Requesting administrator privileges..."
  exec sudo bash "$0" "$@"
fi

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
HOSTS_FILE="/etc/hosts"
PLIST_PATH="/Library/LaunchDaemons/com.goto-app.plist"
SELECTED_HOSTNAME="${GOTO_INSTALL_HOSTNAME:-}"

if [ -z "$SELECTED_HOSTNAME" ]; then
  read -r -p "Hostname to remove from hosts file [goto]: " SELECTED_HOSTNAME
fi

if [ -z "$SELECTED_HOSTNAME" ]; then
  SELECTED_HOSTNAME="goto"
fi

echo ""
echo "=================================================="
echo "  goto-app Uninstall (macOS)"
echo "=================================================="
echo ""

# ---------------------------------------------------------------------------
# Step 1: Remove LaunchDaemon
# ---------------------------------------------------------------------------
echo "[1/3] Removing launch daemon..."
if [ -f "$PLIST_PATH" ]; then
  launchctl unload "$PLIST_PATH" 2>/dev/null || true
  rm "$PLIST_PATH"
  echo "      Service removed."
else
  echo "      Service not found — skipped."
fi

# ---------------------------------------------------------------------------
# Step 2: Remove hosts entry
# ---------------------------------------------------------------------------
echo "[2/3] Removing hosts file entry..."
sed -i '' "/^[^#]*[[:space:]]${SELECTED_HOSTNAME}\$/d" "$HOSTS_FILE"
echo "      Removed '${SELECTED_HOSTNAME}' from hosts file."

# ---------------------------------------------------------------------------
# Step 3: Flush DNS
# ---------------------------------------------------------------------------
echo "[3/3] Flushing DNS cache..."
dscacheutil -flushcache
killall -HUP mDNSResponder 2>/dev/null || true
echo "      Done."

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo "=================================================="
echo "  Uninstall complete!"
echo "=================================================="
echo ""
echo "  Your aliases are still saved in: $APP_DIR/data.json"
echo "  You can safely delete the $APP_DIR folder."
echo ""
