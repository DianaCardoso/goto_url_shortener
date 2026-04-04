# goto-app

Local URL shortener for a single machine or local network.

It serves a small management UI plus alias redirects:

- `http://localhost:8080/drive` -> `https://drive.google.com/...`
- installed mode can expose the same aliases under a custom hostname such as `http://goto/drive`

## Runtime Modes

### Manual mode

Manual mode is for running the app directly without installing a system service.

Defaults:

- host: `127.0.0.1`
- HTTP port: `8080`
- HTTPS port: `8443` if TLS is configured

Start it with:

```bash
node server.js
```

Or use the helper scripts:

- Windows: `start.bat`
- macOS: `bash start-mac.sh`

Manual mode always works with `localhost`.

The custom hostname such as `goto` only works after install, because the install scripts add the hosts-file entry.

### Installed mode

Installed mode registers the app as a system service:

- Windows: Windows Service
- macOS: LaunchDaemon

Installed mode uses:

- `GOTO_HOST=0.0.0.0`
- `GOTO_HTTP_PORT=80`
- optional HTTPS on `443`

The install scripts prompt for the hostname to add to the hosts file. Default: `goto`.

## Configuration

Runtime configuration is controlled through environment variables.

See [example.env](/Users/fcrozetta/projects/goto_url_shortener/example.env) for the full set.

Supported variables:

- `GOTO_HOST`
- `GOTO_HTTP_PORT`
- `GOTO_HTTPS_PORT`
- `GOTO_DATA_FILE`
- `GOTO_FORCE_HTTPS`
- `GOTO_TLS_CERT_FILE`
- `GOTO_TLS_KEY_FILE`

Notes:

- HTTPS is enabled only when both `GOTO_TLS_CERT_FILE` and `GOTO_TLS_KEY_FILE` are set.
- `GOTO_FORCE_HTTPS=true` requires both TLS variables.
- relative paths are resolved from the project directory.

## HTTPS

HTTPS is optional.

If you want local HTTPS, `mkcert` is the simplest local workflow.

### Create certificates with mkcert

Install `mkcert`:

- macOS: `brew install mkcert`
- Windows:
  - `choco install mkcert`
  - or `scoop install mkcert`

Install the local CA once per machine:

```bash
mkcert -install
```

Generate a certificate and key for the names you want this app to serve:

```bash
mkdir -p certs
mkcert -cert-file certs/goto.pem -key-file certs/goto-key.pem localhost 127.0.0.1 ::1 goto
```

If you use a different installed hostname, replace `goto` with that hostname.

Then set:

```dotenv
GOTO_TLS_CERT_FILE=./certs/goto.pem
GOTO_TLS_KEY_FILE=./certs/goto-key.pem
```

Optionally force HTTPS redirects:

```dotenv
GOTO_FORCE_HTTPS=true
```

### HTTPS without mkcert

You can also use any other local certificate workflow.

If you already have a certificate and key:

1. Generate a certificate and key for your chosen hostname by whatever local certificate workflow you prefer.
2. Set:

```dotenv
GOTO_TLS_CERT_FILE=/absolute/path/to/cert.pem
GOTO_TLS_KEY_FILE=/absolute/path/to/key.pem
```

3. Optionally set:

```dotenv
GOTO_FORCE_HTTPS=true
```

This project does not hardcode any certificate paths and does not require `mkcert`.

## Install

### Windows

Run PowerShell as Administrator:

```powershell
./setup.ps1
```

What it does:

1. prompts for a hostname, default `goto`
2. adds `127.0.0.1 <hostname>` to the hosts file
3. installs production dependencies
4. registers the Windows Service
5. flushes DNS

TLS in installed mode is optional. If you want HTTPS, set `GOTO_TLS_CERT_FILE` and `GOTO_TLS_KEY_FILE` in the environment before running the installer.

Uninstall:

```powershell
./uninstall.ps1
```

### macOS

Run:

```bash
sudo bash setup-mac.sh
```

What it does:

1. prompts for a hostname, default `goto`
2. adds `127.0.0.1 <hostname>` to `/etc/hosts`
3. installs production dependencies
4. registers a LaunchDaemon
5. flushes DNS caches

TLS in installed mode is optional. If you want HTTPS, set `GOTO_TLS_CERT_FILE` and `GOTO_TLS_KEY_FILE` before running the installer.

Uninstall:

```bash
sudo bash uninstall-mac.sh
```

## Logs

- Windows: service logs depend on the Windows Service wrapper
- macOS: `/var/log/goto-app.log` and `/var/log/goto-app-error.log`

## Development Notes

- Alias data is stored in `data.json` by default.
- `data.json`, `daemon/`, and `node_modules/` are runtime/generated artifacts and are intentionally not tracked.
