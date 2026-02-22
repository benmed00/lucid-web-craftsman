/**
 * Install backend dependencies. Uses Node's execPath to locate npm,
 * so it works on Windows when the postinstall child process has no npm in PATH.
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const backendPkg = path.join(__dirname, '..', 'backend', 'package.json');
if (!fs.existsSync(backendPkg)) {
  console.warn('postinstall: backend/package.json not found, skipping backend install');
  process.exit(0);
  return;
}

const nodeDir = path.dirname(process.execPath);
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npmPath = path.join(nodeDir, npmCmd);

const result = spawnSync(npmPath, ['install', '--prefix', 'backend'], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
});

process.exit(result.status ?? (result.signal ? 1 : 0));
