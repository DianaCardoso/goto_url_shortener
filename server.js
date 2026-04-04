"use strict";

const https = require("node:https");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { loadConfig } = require("./config");
const { createAliasStore } = require("./storage");

const config = loadConfig();
const DATA_FILE = config.dataFile;
const PUBLIC_DIR = path.join(__dirname, "public");
const aliasStore = createAliasStore(DATA_FILE);

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
    return jsonResponse(res, 200, aliasStore.list());
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
      aliasStore.set(alias, target);
      return jsonResponse(res, 201, { alias, url: target });
    });
  }

  // DELETE /api/aliases/:alias
  const deleteMatch = pathname.match(/^\/api\/aliases\/(.+)$/);
  if (method === "DELETE" && deleteMatch) {
    const alias = decodeURIComponent(deleteMatch[1]);
    if (!aliasStore.delete(alias)) {
      return jsonResponse(res, 404, { error: "alias not found" });
    }
    return jsonResponse(res, 200, { deleted: alias });
  }

  jsonResponse(res, 404, { error: "unknown API route" });
}

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------

function isDefaultPort(protocol, port) {
  return (protocol === "http" && port === 80) ||
    (protocol === "https" && port === 443);
}

function getOrigin(req, protocol, port) {
  const baseUrl = new URL(`${protocol}://${req.headers.host || "localhost"}`);
  baseUrl.protocol = `${protocol}:`;
  baseUrl.port = isDefaultPort(protocol, port) ? "" : String(port);
  return baseUrl.origin;
}

function createAppHandler(protocol, port) {
  return (req, res) => {
    const requestUrl = new URL(req.url, `${protocol}://localhost`);
    const pathname = requestUrl.pathname;
    const method = req.method;

    // Handle CORS preflight for API calls
    if (method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,DELETE",
        "Access-Control-Allow-Headers": "Content-Type",
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
      const target = aliasStore.get(alias);
      if (target) {
        res.writeHead(302, { Location: target });
        return res.end();
      }
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(
        `<!DOCTYPE html><html><body style="font-family:system-ui;max-width:600px;margin:60px auto;padding:0 20px">` +
          `<h2>Alias not found: <code>${alias}</code></h2>` +
          `<p><a href="${getOrigin(req, protocol, port)}/">Manage aliases</a></p></body></html>`,
      );
    }

    res.writeHead(405);
    res.end();
  };
}

function createRedirectHandler() {
  return (req, res) => {
    const location = new URL(req.url, getOrigin(req, "https", config.httpsPort));
    res.writeHead(301, { Location: location.toString() });
    res.end();
  };
}

function attachServerErrorHandler(server, protocol, port) {
  server.on("error", (err) => {
    if (err.code === "EACCES") {
      console.error(`Error: Cannot bind ${protocol.toUpperCase()} server to port ${port}.`);
    } else if (err.code === "EADDRINUSE") {
      console.error(`Error: ${protocol.toUpperCase()} port ${port} is already in use.`);
    } else {
      console.error(`${protocol.toUpperCase()} server error:`, err);
    }
    process.exit(1);
  });
}

const appHandler = createAppHandler("http", config.httpPort);
const httpHandler = config.forceHttps ? createRedirectHandler() : appHandler;
const httpServer = http.createServer(httpHandler);
attachServerErrorHandler(httpServer, "http", config.httpPort);

httpServer.listen(config.httpPort, config.host, () => {
  console.log(`HTTP server listening on http://${config.host}:${config.httpPort}`);
});

if (config.httpsEnabled) {
  const httpsServer = https.createServer(
    {
      key: fs.readFileSync(config.tlsKeyFile),
      cert: fs.readFileSync(config.tlsCertFile),
    },
    createAppHandler("https", config.httpsPort),
  );

  attachServerErrorHandler(httpsServer, "https", config.httpsPort);

  httpsServer.listen(config.httpsPort, config.host, () => {
    console.log(`HTTPS server listening on https://${config.host}:${config.httpsPort}`);
  });
}

console.log(`Data file: ${DATA_FILE}`);

if (config.httpsEnabled) {
  if (config.forceHttps) {
    console.log("HTTP requests will redirect to HTTPS.");
  }
} else {
  console.log(
    "HTTPS is disabled. Set GOTO_TLS_KEY_FILE and GOTO_TLS_CERT_FILE to enable it.",
  );
}
