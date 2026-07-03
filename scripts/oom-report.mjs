#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dev-status.mjs');
const result = spawnSync(process.execPath, [script, '--oom'], {
  stdio: 'inherit',
  env: { ...process.env, CURSOR_OOM: '1' },
});
process.exit(result.status ?? 1);
