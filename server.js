"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const url = require("node:url");

const DATA_FILE = path.join(__dirname, "data.json");
const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = 80;
const HOST = "127.0.0.1";

// ---------------------------------------------------------------------------
// Data layer
// ---------------------------------------------------------------------------

function loadDb() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ aliases: {} }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveDb(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

let db = loadDb();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readBody(req, cb) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });
  req.on("end", () => cb(body));
}

function jsonResponse(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(data));
}

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

// ---------------------------------------------------------------------------
// API handler
// ---------------------------------------------------------------------------

function handleApi(req, res, method, pathname) {
  // GET /api/aliases
  if (method === "GET" && pathname === "/api/aliases") {
    return jsonResponse(res, 200, db.aliases);
  }

  // POST /api/aliases  { alias, url }
  if (method === "POST" && pathname === "/api/aliases") {
    return readBody(req, (body) => {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        return jsonResponse(res, 400, { error: "invalid JSON" });
      }
      const { alias, url: target } = parsed;
      if (!alias || !target) {
        return jsonResponse(res, 400, { error: "alias and url are required" });
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(alias)) {
        return jsonResponse(res, 400, {
          error: "alias may only contain letters, numbers, _ and -",
        });
      }
      if (!/^https?:\/\//i.test(target)) {
        return jsonResponse(res, 400, {
          error: "url must start with http:// or https://",
        });
      }
      db.aliases[alias] = target;
      saveDb(db);
      return jsonResponse(res, 201, { alias, url: target });
    });
  }

  // DELETE /api/aliases/:alias
  const deleteMatch = pathname.match(/^\/api\/aliases\/(.+)$/);
  if (method === "DELETE" && deleteMatch) {
    const alias = decodeURIComponent(deleteMatch[1]);
    if (!db.aliases[alias]) {
      return jsonResponse(res, 404, { error: "alias not found" });
    }
    delete db.aliases[alias];
    saveDb(db);
    return jsonResponse(res, 200, { deleted: alias });
  }

  jsonResponse(res, 404, { error: "unknown API route" });
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const method = req.method;

  // Handle CORS preflight for API calls
  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,DELETE",
    });
    return res.end();
  }

  // Management UI
  if (method === "GET" && pathname === "/") {
    return serveFile(
      res,
      path.join(PUBLIC_DIR, "index.html"),
      "text/html; charset=utf-8",
    );
  }

  // JSON API
  if (pathname.startsWith("/api/")) {
    return handleApi(req, res, method, pathname);
  }

  // Static files (images, css, js)
  if (method === "GET") {
    const filePath = path.join(PUBLIC_DIR, pathname);

    if (filePath.startsWith(PUBLIC_DIR) && fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();

      const contentTypes = {
        ".html": "text/html; charset=utf-8",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".css": "text/css",
        ".js": "application/javascript",
        ".json": "application/json",
      };

      return serveFile(
        res,
        filePath,
        contentTypes[ext] || "application/octet-stream",
      );
    }
  }

  // Alias redirect (must be last)
  if (method === "GET") {
    const alias = pathname.slice(1); // strip leading "/"
    const target = db.aliases[alias];
    if (target) {
      res.writeHead(302, { Location: target });
      return res.end();
    }
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(
      `<!DOCTYPE html><html><body style="font-family:system-ui;max-width:600px;margin:60px auto;padding:0 20px">` +
        `<h2>Alias not found: <code>${alias}</code></h2>` +
        `<p><a href="http://goto/">Manage aliases</a></p></body></html>`,
    );
  }

  res.writeHead(405);
  res.end();
});

server.listen(PORT, HOST, () => {
  console.log(`goto-app running on http://${HOST}:${PORT}`);
  console.log("Management UI: http://goto/");
});

server.on("error", (err) => {
  if (err.code === "EACCES") {
    console.error(`Error: Cannot bind to port ${PORT}. Run as Administrator.`);
  } else if (err.code === "EADDRINUSE") {
    console.error(`Error: Port ${PORT} is already in use.`);
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});
