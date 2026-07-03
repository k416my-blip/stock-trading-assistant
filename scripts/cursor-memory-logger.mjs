#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectCursorMemorySnapshot, formatCursorCategoryTable } from './lib/cursorProcessMemory.mjs';
import { DEV_DIR, readGitInfo } from './lib/devStatusCore.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG_FILE = path.join(DEV_DIR, 'cursor-memory-log.jsonl');
const LATEST_FILE = path.join(DEV_DIR, 'cursor-memory-latest.json');
const PID_FILE = path.join(DEV_DIR, 'cursor-memory-logger.pid');
const INTERVAL_MS = Number(process.env.CURSOR_MEMORY_LOG_MS ?? 5 * 60 * 1000);
const daemon = process.argv.includes('--daemon');

function ensureDevDir() {
  fs.mkdirSync(path.join(ROOT, DEV_DIR), { recursive: true });
}

function buildLatestSummary(snapshot) {
  const git = readGitInfo(ROOT);
  return {
    updatedAt: snapshot.capturedAt,
    intervalMs: INTERVAL_MS,
    git,
    totalMb: snapshot.totalMb,
    processCount: snapshot.processCount,
    categories: Object.fromEntries(
      Object.entries(snapshot.categories).map(([k, v]) => [k, { label: v.label, count: v.count, totalMb: v.totalMb, pids: v.pids }]),
    ),
    topConsumers: snapshot.byPid.slice(0, 10),
    humanSummary: formatCursorCategoryTable(snapshot.categories),
  };
}

function appendSnapshot() {
  const snapshot = collectCursorMemorySnapshot();
  ensureDevDir();
  const line = JSON.stringify(snapshot) + '\n';
  fs.appendFileSync(path.join(ROOT, LOG_FILE), line, 'utf8');
  fs.writeFileSync(path.join(ROOT, LATEST_FILE), JSON.stringify(buildLatestSummary(snapshot), null, 2) + '\n', 'utf8');
  console.log(`[${snapshot.capturedAt}] cursor ${snapshot.totalMb} MB / ${snapshot.processCount} proc → ${LOG_FILE}`);
  return snapshot;
}

function writePid() {
  ensureDevDir();
  fs.writeFileSync(path.join(ROOT, PID_FILE), String(process.pid) + '\n', 'utf8');
}

if (daemon) {
  console.log(`Cursor memory logger daemon (every ${INTERVAL_MS / 1000}s)`);
  writePid();
  appendSnapshot();
  setInterval(appendSnapshot, INTERVAL_MS);
} else {
  appendSnapshot();
}
