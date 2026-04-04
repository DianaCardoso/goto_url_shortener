"use strict";

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_HTTP_PORT = 8080;
const DEFAULT_HTTPS_PORT = 8443;
const DEFAULT_DATA_FILE = "data.json";

function readStringEnv(env, name) {
  const value = env[name];

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function readBooleanEnv(env, name, defaultValue) {
  const value = readStringEnv(env, name);

  if (value === null) {
    return defaultValue;
  }

  const normalized = value.toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(
    `${name} must be one of: true, false, 1, 0, yes, no, on, off`,
  );
}

function readPortEnv(env, name, defaultValue) {
  const value = readStringEnv(env, name);

  if (value === null) {
    return defaultValue;
  }

  const port = Number.parseInt(value, 10);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }

  return port;
}

function resolveAppPath(value) {
  if (path.isAbsolute(value)) {
    return value;
  }

  return path.resolve(__dirname, value);
}

function assertFileExists(envName, filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `${envName} points to a file that does not exist: ${filePath}`,
    );
  }
}

function loadConfig(env = process.env) {
  const host = readStringEnv(env, "GOTO_HOST") || DEFAULT_HOST;
  const httpPort = readPortEnv(env, "GOTO_HTTP_PORT", DEFAULT_HTTP_PORT);
  const tlsKeyFileRaw = readStringEnv(env, "GOTO_TLS_KEY_FILE");
  const tlsCertFileRaw = readStringEnv(env, "GOTO_TLS_CERT_FILE");

  if (Boolean(tlsKeyFileRaw) !== Boolean(tlsCertFileRaw)) {
    throw new Error(
      "GOTO_TLS_KEY_FILE and GOTO_TLS_CERT_FILE must either both be set or both be unset",
    );
  }

  const httpsEnabled = Boolean(tlsKeyFileRaw && tlsCertFileRaw);
  const httpsPort = readPortEnv(env, "GOTO_HTTPS_PORT", DEFAULT_HTTPS_PORT);
  const forceHttps = readBooleanEnv(env, "GOTO_FORCE_HTTPS", false);
  const dataFile = resolveAppPath(
    readStringEnv(env, "GOTO_DATA_FILE") || DEFAULT_DATA_FILE,
  );
  const tlsKeyFile = httpsEnabled ? resolveAppPath(tlsKeyFileRaw) : null;
  const tlsCertFile = httpsEnabled ? resolveAppPath(tlsCertFileRaw) : null;

  if (httpsEnabled && httpPort === httpsPort) {
    throw new Error(
      "GOTO_HTTP_PORT and GOTO_HTTPS_PORT must be different when HTTPS is enabled",
    );
  }

  if (forceHttps && !httpsEnabled) {
    throw new Error(
      "GOTO_FORCE_HTTPS=true requires both GOTO_TLS_KEY_FILE and GOTO_TLS_CERT_FILE",
    );
  }

  if (tlsKeyFile) {
    assertFileExists("GOTO_TLS_KEY_FILE", tlsKeyFile);
  }

  if (tlsCertFile) {
    assertFileExists("GOTO_TLS_CERT_FILE", tlsCertFile);
  }

  return {
    dataFile,
    forceHttps,
    host,
    httpPort,
    httpsEnabled,
    httpsPort,
    tlsCertFile,
    tlsKeyFile,
  };
}

module.exports = {
  DEFAULT_HOST,
  DEFAULT_HTTP_PORT,
  DEFAULT_HTTPS_PORT,
  loadConfig,
};
