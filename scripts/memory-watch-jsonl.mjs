#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyNodeMemoryLimit } from './lib/oom-node-env.mjs';
import {
  appendMemoryWatchEntry,
  collectMemoryWatchEntry,
  DEFAULT_INTERVAL_MS,
  resolveMemoryWatchSession,
  resolveWatchLogPath,
} from './lib/memory-watch-jsonl.mjs';

applyNodeMemoryLimit();
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sessionTs = resolveMemoryWatchSession(ROOT);
const logPath = resolveWatchLogPath(ROOT, sessionTs);
const once = process.argv.includes('--once');
const intervalMs = Number(process.env.MEMORY_WATCH_JSONL_MS ?? DEFAULT_INTERVAL_MS);

function tick(label) {
  const entry = collectMemoryWatchEntry({ rootDir: ROOT, label });
  appendMemoryWatchEntry(logPath, entry);
  console.log('[memory-watch]', entry.timestamp, 'rss=' + entry.process.rssMb + 'MB heap=' + entry.process.heapUsedMb + 'MB ->', logPath);
}

console.log('memory-watch-jsonl every ' + intervalMs + 'ms -> ' + logPath);
tick('start');
if (!once) setInterval(() => tick('tick'), intervalMs);
