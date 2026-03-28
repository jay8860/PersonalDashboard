import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const cwd = dirname(fileURLToPath(import.meta.url));
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const backendPort = process.env.BACKEND_PORT || '3001';

const processes = [
  spawn(process.execPath, ['backend/index.js'], {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: backendPort,
    },
  }),
  spawn(npmCommand, ['run', 'dev:frontend'], {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_API_URL: process.env.VITE_API_URL || '',
    },
  }),
];

let isShuttingDown = false;

const shutdown = (code = 0) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  for (const child of processes) {
    if (child.exitCode == null && child.killed === false) {
      child.kill('SIGTERM');
    }
  }

  setTimeout(() => process.exit(code), 100);
};

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => shutdown(0));
}

processes.forEach((child) => {
  child.on('exit', (code) => {
    shutdown(code ?? 0);
  });
});
