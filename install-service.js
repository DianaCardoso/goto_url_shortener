'use strict';

const { Service } = require('node-windows');
const path = require('node:path');

const svc = new Service({
  name:             'goto-app',
  description:      'Local URL shortener — redirects http://goto/<alias> to saved URLs',
  script:           path.join(__dirname, 'server.js'),
  workingDirectory: __dirname,
  nodeOptions:      [],
});

svc.on('install', () => {
  console.log('Service "goto-app" installed successfully.');
  console.log('Starting service...');
  svc.start();
});

svc.on('start', () => {
  console.log('Service started. Open http://goto/ in your browser.');
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
