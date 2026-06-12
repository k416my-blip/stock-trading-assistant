#!/usr/bin/env node
/**
 * Phase12.5 watchdog — monitors pre-run-watch.log mtime only (no adb).
 *
 * Usage:
 *   node scripts/phase12-5-watchdog.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { checkWatchLogStale, DEFAULT_WATCH_FAIL_MS, DEFAULT_WATCH_WARN_MS } from './lib/phase12-5-invalid-detectors.mjs';

const LOG_DIR = path.join(process.cwd(), 'docs/review/twelve-hour-test');
const WATCH_LOG = path.join(LOG_DIR, 'pre-run-watch.log');
const WATCHDOG_LOG = path.join(LOG_DIR, 'watchdog.log');
const INTERVAL_MS = Number(process.env.PHASE12_5_WATCHDOG_INTERVAL_MS ?? '60000');
const startedMs = Date.now();

function append(line) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.appendFileSync(WATCHDOG_LOG, `${line}\n`, 'utf8');
}

async function main() {
  append(`--- watchdog started ${new Date().toISOString()} intervalMs=${INTERVAL_MS} ---`);
  while (true) {
    const nowMs = Date.now();
    const exists = fs.existsSync(WATCH_LOG);
    const mtimeMs = exists ? fs.statSync(WATCH_LOG).mtimeMs : 0;
    const result = checkWatchLogStale({
      mtimeMs,
      nowMs,
      runnerStartedMs: startedMs,
      warnAfterMs: DEFAULT_WATCH_WARN_MS,
      failAfterMs: DEFAULT_WATCH_FAIL_MS,
      fileExists: exists,
    });
    const ts = new Date().toISOString();
    if (result.level === 'fail') {
      append(`[${ts}] FAIL watch_dead ageSec=${result.ageSec} mtime=${new Date(mtimeMs).toISOString()}`);
    } else if (result.level === 'warn') {
      append(`[${ts}] WARN watch_stale ageSec=${result.ageSec}`);
    } else {
      append(`[${ts}] OK ageSec=${result.ageSec}`);
    }
    await sleep(INTERVAL_MS);
  }
}

main().catch((err) => {
  append(`[${new Date().toISOString()}] fatal ${err?.message ?? err}`);
  process.exit(1);
});
