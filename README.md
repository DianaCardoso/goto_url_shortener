# HOW TO INSTALL

### Prerequisites
Node.js installed
* https://nodejs.org

## 🪟 Windows

Right-click setup.ps1 → Run with PowerShell
(or run it as Administrator)

The script automatically performs:
1. Adds 127.0.0.1 goto to the hosts file (C:\Windows\System32\drivers\etc\hosts)
2. Installs dependencies (npm install)
3. Registers a Windows Service (auto-start on boot)
4. Flushes DNS cache (ipconfig /flushdns)

Manual Start (without installing as a service): Run `start.bat` as Administrator.

Uninstall: Right-click  `uninstall.ps1` → Run with PowerShell (as Administrator)

## 🍎 macOS

Open Terminal in the project folder and run:
`sudo bash setup-mac.sh`

The script automatically performs:
1. Adds 127.0.0.1 goto to /etc/hosts
2. Installs dependencies (npm install)
3. Registers a LaunchDaemon (auto-start on boot)
4. Flushes DNS cache

Manual Start (without installing as a service): Run `sudo bash start-mac.sh`.

Uninstall: Run `sudo bash uninstall-mac.sh`. 

--

After setup, open in your browser:

http://goto/

---

## Logs

|  Platform  |  Location |
|----------|----------|
|  Windows   |  Service Manager (services.msc → goto-app)  |
|  macOS     |  /var/log/goto-app.log / /var/log/goto-app-error.log  |

---

## HTTPS Setup (Local)

This project uses `mkcert` to enable HTTPS for the `goto` domain.

### 1. Install mkcert

Download from:
https://github.com/FiloSottile/mkcert/releases

* Rename to `mkcert.exe`
* Place it in a folder (e.g. `C:\mkcert`)

### 2. Install local CA

Run PowerShell as Administrator:

```powershell
cd C:\mkcert
.\mkcert -install
```

### 3. Generate certificate

```powershell
.\mkcert goto
```

This creates:

* `goto.pem`
* `goto-key.pem`

### 4. Update server paths

Edit `server.js`:

```javascript
key: fs.readFileSync("C:/Users/YOUR_USER/mkcert/goto-key.pem"),
cert: fs.readFileSync("C:/Users/YOUR_USER/mkcert/goto.pem")
```

### 5. Run

```bash
node server.js
```

Access:

```
https://goto/
```

### Notes

* Run as admin for ports 80/443
* Restart service if needed:

```powershell
net stop goto-app
net start goto-app
```
---

###

White Monster for ever!

What a fucking day.
