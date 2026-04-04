"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  DEFAULT_HOST,
  DEFAULT_HTTP_PORT,
  DEFAULT_HTTPS_PORT,
  loadConfig,
} = require("../config");

test("loadConfig returns sane manual-mode defaults", () => {
  const config = loadConfig({});

  assert.equal(config.host, DEFAULT_HOST);
  assert.equal(config.httpPort, DEFAULT_HTTP_PORT);
  assert.equal(config.httpsPort, DEFAULT_HTTPS_PORT);
  assert.equal(config.httpsEnabled, false);
  assert.equal(config.forceHttps, false);
  assert.equal(config.tlsCertFile, null);
  assert.equal(config.tlsKeyFile, null);
  assert.equal(config.dataFile, path.resolve(__dirname, "..", "data.json"));
});

test("loadConfig resolves relative paths and enables https when both TLS files exist", () => {
  const certPath = path.resolve(__dirname, "fixtures", "cert.pem");
  const keyPath = path.resolve(__dirname, "fixtures", "key.pem");

  const config = loadConfig({
    GOTO_HOST: "0.0.0.0",
    GOTO_HTTP_PORT: "80",
    GOTO_HTTPS_PORT: "443",
    GOTO_FORCE_HTTPS: "true",
    GOTO_DATA_FILE: "./tmp/data.json",
    GOTO_TLS_CERT_FILE: certPath,
    GOTO_TLS_KEY_FILE: keyPath,
  });

  assert.equal(config.host, "0.0.0.0");
  assert.equal(config.httpPort, 80);
  assert.equal(config.httpsPort, 443);
  assert.equal(config.forceHttps, true);
  assert.equal(config.httpsEnabled, true);
  assert.equal(config.tlsCertFile, certPath);
  assert.equal(config.tlsKeyFile, keyPath);
  assert.equal(config.dataFile, path.resolve(__dirname, "..", "tmp", "data.json"));
});

test("loadConfig rejects partial TLS configuration", () => {
  assert.throws(
    () =>
      loadConfig({
        GOTO_TLS_CERT_FILE: path.resolve(__dirname, "fixtures", "cert.pem"),
      }),
    /must either both be set or both be unset/,
  );
});

test("loadConfig rejects forced https without tls files", () => {
  assert.throws(
    () =>
      loadConfig({
        GOTO_FORCE_HTTPS: "true",
      }),
    /requires both GOTO_TLS_KEY_FILE and GOTO_TLS_CERT_FILE/,
  );
});

test("loadConfig rejects invalid ports", () => {
  assert.throws(
    () =>
      loadConfig({
        GOTO_HTTP_PORT: "70000",
      }),
    /must be an integer between 1 and 65535/,
  );
});
