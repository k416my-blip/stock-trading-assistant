#!/usr/bin/env node
/**
 * Rakuten Import Validation entrypoint.
 * Usage: node scripts/rakuten-import-validation.mjs
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

execSync('npx vitest run --config vitest.validation.config.ts', {
  cwd: ROOT,
  stdio: 'inherit',
});
