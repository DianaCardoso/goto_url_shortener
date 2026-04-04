'use strict';

const { Service } = require('node-windows');
const path = require('node:path');

function readStringEnv(name, fallback = null) {
  const value = process.env[name];

  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed === '' ? fallback : trimmed;
}

const installHostname = readStringEnv('GOTO_INSTALL_HOSTNAME', 'goto');
const tlsCertFile = readStringEnv('GOTO_TLS_CERT_FILE');
const tlsKeyFile = readStringEnv('GOTO_TLS_KEY_FILE');

if (Boolean(tlsCertFile) !== Boolean(tlsKeyFile)) {
  throw new Error(
    'GOTO_TLS_CERT_FILE and GOTO_TLS_KEY_FILE must either both be set or both be unset.',
  );
}

const httpsEnabled = Boolean(tlsCertFile && tlsKeyFile);
const serviceEnv = [
  { name: 'GOTO_HOST', value: '0.0.0.0' },
  { name: 'GOTO_HTTP_PORT', value: '80' },
  { name: 'GOTO_DATA_FILE', value: path.join(__dirname, 'data.json') },
];

if (httpsEnabled) {
  serviceEnv.push(
    { name: 'GOTO_HTTPS_PORT', value: '443' },
    { name: 'GOTO_FORCE_HTTPS', value: 'true' },
    { name: 'GOTO_TLS_CERT_FILE', value: tlsCertFile },
    { name: 'GOTO_TLS_KEY_FILE', value: tlsKeyFile },
  );
}

const svc = new Service({
  name:             'goto-app',
  description:      'Local URL shortener for a configurable local hostname',
  script:           path.join(__dirname, 'server.js'),
  workingDirectory: __dirname,
  nodeOptions:      [],
  env:              serviceEnv,
});

svc.on('install', () => {
  console.log('Service "goto-app" installed successfully.');
  console.log('Starting service...');
  svc.start();
});

svc.on('start', () => {
  const protocol = httpsEnabled ? 'https' : 'http';
  console.log(`Service started. Open ${protocol}://${installHostname}/ in your browser.`);
});

svc.on('error', (err) => {
  console.error('Service error:', err);
  process.exit(1);
});

svc.on('alreadyinstalled', () => {
  console.log('Service is already installed. Starting it...');
  svc.start();
});

console.log('Installing goto-app Windows Service...');
svc.install();
