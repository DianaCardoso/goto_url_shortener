'use strict';

const { Service } = require('node-windows');
const path = require('node:path');

const svc = new Service({
  name:   'goto-app',
  script: path.join(__dirname, 'server.js'),
});

svc.on('uninstall', () => {
  console.log('Service "goto-app" uninstalled successfully.');
});

svc.on('error', (err) => {
  console.error('Service error:', err);
  process.exit(1);
});

svc.on('notinstalled', () => {
  console.log('Service was not installed — nothing to remove.');
});

console.log('Uninstalling goto-app Windows Service...');
svc.uninstall();
