#!/usr/bin/env bash
# goto-app setup for macOS
# Adds hosts entry, installs npm deps, registers a LaunchDaemon (port 80 requires root).
# Usage: sudo bash setup-mac.sh
#        (script self-elevates if not already root)

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
if grep -qw "goto" "$HOSTS_FILE"; then
  echo "      'goto' already in hosts file — skipped."
else
  printf "127.0.0.1\tgoto\n" >> "$HOSTS_FILE"
  echo "      Added '127.0.0.1  goto'."
fi

# ---------------------------------------------------------------------------
# Step 2: npm install
# ---------------------------------------------------------------------------
echo "[2/4] Installing dependencies..."
cd "$APP_DIR"
npm install --omit=dev 2>&1 | tail -3
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
echo "  Open your browser and go to: http://goto/"
echo ""
echo "  The server starts automatically on every boot."
echo "  Logs: /var/log/goto-app.log"
echo ""
