#!/usr/bin/env bash
# goto-app setup for macOS
# Adds hosts entry, installs npm deps, registers a LaunchDaemon.
# Usage: sudo bash setup-mac.sh
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
NODE_BIN="$(which node)"
SELECTED_HOSTNAME="${GOTO_INSTALL_HOSTNAME:-}"
TLS_CERT_FILE="${GOTO_TLS_CERT_FILE:-}"
TLS_KEY_FILE="${GOTO_TLS_KEY_FILE:-}"

if [ -z "$SELECTED_HOSTNAME" ]; then
  read -r -p "Hostname to use [goto]: " SELECTED_HOSTNAME
fi

if [ -z "$SELECTED_HOSTNAME" ]; then
  SELECTED_HOSTNAME="goto"
fi

if [[ ! "$SELECTED_HOSTNAME" =~ ^[A-Za-z0-9.-]+$ ]]; then
  echo "ERROR: Hostname may only contain letters, numbers, dots, and hyphens."
  exit 1
fi

if [ -n "$TLS_CERT_FILE" ] && [ -z "$TLS_KEY_FILE" ] || [ -z "$TLS_CERT_FILE" ] && [ -n "$TLS_KEY_FILE" ]; then
  echo "ERROR: GOTO_TLS_CERT_FILE and GOTO_TLS_KEY_FILE must either both be set or both be unset."
  exit 1
fi

if [ -z "$NODE_BIN" ]; then
  echo "ERROR: Node.js not found. Install it from https://nodejs.org and try again."
  exit 1
fi

echo ""
echo "=================================================="
echo "  goto-app Setup (macOS)"
echo "=================================================="
echo ""

# ---------------------------------------------------------------------------
# Step 1: Hosts file
# ---------------------------------------------------------------------------
echo "[1/4] Updating hosts file..."
if grep -Eq "^[^#]*[[:space:]]${SELECTED_HOSTNAME}$" "$HOSTS_FILE"; then
  echo "      '${SELECTED_HOSTNAME}' already in hosts file — skipped."
else
  printf "127.0.0.1\t%s\n" "$SELECTED_HOSTNAME" >> "$HOSTS_FILE"
  echo "      Added '127.0.0.1  ${SELECTED_HOSTNAME}'."
fi

# ---------------------------------------------------------------------------
# Step 2: npm install
# ---------------------------------------------------------------------------
echo "[2/4] Installing dependencies..."
cd "$APP_DIR"
npm install --omit=dev
echo "      Done."

# ---------------------------------------------------------------------------
# Step 3: LaunchDaemon plist
# ---------------------------------------------------------------------------
echo "[3/4] Installing launch daemon (auto-start on boot)..."

cat > "$PLIST_PATH" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.goto-app</string>

  <key>ProgramArguments</key>
  <array>
    <string>${NODE_BIN}</string>
    <string>${APP_DIR}/server.js</string>
  </array>

  <key>EnvironmentVariables</key>
  <dict>
    <key>GOTO_HOST</key>
    <string>0.0.0.0</string>
    <key>GOTO_HTTP_PORT</key>
    <string>80</string>
    <key>GOTO_DATA_FILE</key>
    <string>${APP_DIR}/data.json</string>
PLIST

if [ -n "$TLS_CERT_FILE" ]; then
cat >> "$PLIST_PATH" << PLIST
    <key>GOTO_HTTPS_PORT</key>
    <string>443</string>
    <key>GOTO_FORCE_HTTPS</key>
    <string>true</string>
    <key>GOTO_TLS_CERT_FILE</key>
    <string>${TLS_CERT_FILE}</string>
    <key>GOTO_TLS_KEY_FILE</key>
    <string>${TLS_KEY_FILE}</string>
PLIST
fi

cat >> "$PLIST_PATH" << PLIST
  </dict>

  <key>WorkingDirectory</key>
  <string>${APP_DIR}</string>

  <key>RunAtLoad</key>
  <true/>

  <key>KeepAlive</key>
  <true/>

  <key>StandardOutPath</key>
  <string>/var/log/goto-app.log</string>

  <key>StandardErrorPath</key>
  <string>/var/log/goto-app-error.log</string>
</dict>
</plist>
PLIST

chmod 644 "$PLIST_PATH"
launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load "$PLIST_PATH"
echo "      Service loaded."

# ---------------------------------------------------------------------------
# Step 4: Flush DNS
# ---------------------------------------------------------------------------
echo "[4/4] Flushing DNS cache..."
dscacheutil -flushcache
killall -HUP mDNSResponder 2>/dev/null || true
echo "      Done."

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo "=================================================="
echo "  Setup complete!"
echo "=================================================="
echo ""
if [ -n "$TLS_CERT_FILE" ]; then
  echo "  Open your browser and go to: https://${SELECTED_HOSTNAME}/"
else
  echo "  Open your browser and go to: http://${SELECTED_HOSTNAME}/"
fi
echo ""
echo "  The server starts automatically on every boot."
echo "  Logs: /var/log/goto-app.log"
echo ""
