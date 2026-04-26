#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Ensure the child Expo process preloads our polyfill by setting NODE_OPTIONS
let polyfillPath = path.resolve(__dirname, '..', 'tools', 'polyfills', 'toReversed.js');
// Normalize to forward slashes for Windows and avoid quotes which can be stripped
polyfillPath = polyfillPath.replace(/\\/g, '/');
process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS ? process.env.NODE_OPTIONS + ' ' : '') + '--require ' + polyfillPath;

const args = process.argv.slice(2);
const localExpoCli = path.resolve(__dirname, '..', 'node_modules', 'expo', 'bin', 'cli');

if (!fs.existsSync(localExpoCli)) {
  console.error('Local Expo CLI not found at node_modules/expo/bin/cli. Run `npm install` and try again.');
  process.exit(1);
}

const cp = spawn(process.execPath, [localExpoCli, ...args], { stdio: 'inherit', env: process.env });
cp.on('exit', (code) => process.exit(code));
cp.on('error', (err) => {
  console.error('Failed to start expo:', err);
  process.exit(1);
});
