#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CURRENT_STATUS_FILE,
  collectSnapshot,
  writeCurrentStatusPreserving,
  detectStopped,
  formatCursorFocusLines,
  loadPreviousSession,
  readGitInfo,
  saveSession,
} from './lib/devStatusCore.mjs';
import {
  appendMemoryWatchEntry,
  collectMemoryWatchEntry,
  resolveMemoryWatchSession,
  resolveWatchLogPath,
} from './lib/memory-watch-jsonl.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INTERVAL_MS = Number(process.env.MEMORY_WATCH_MS ?? 60_000);
const memoryWatchSession = resolveMemoryWatchSession(ROOT);
const jsonlPath = resolveWatchLogPath(ROOT, memoryWatchSession);
let loggedJsonlPath = false;

function tick() {
  const previous = loadPreviousSession(ROOT);
  const snapshot = collectSnapshot();
  const stopped = detectStopped(previous, snapshot);
  const highMemory = (snapshot.memory?.usedPct ?? 0) >= 80;
  const git = readGitInfo(ROOT);
  appendMemoryWatchEntry(
    jsonlPath,
    collectMemoryWatchEntry({ rootDir: ROOT, label: 'watchdog' }),
  );
  writeCurrentStatusPreserving(ROOT, {
      snapshot,
      stopped,
      highMemory,
      gitHead: git.head,
      gitBranch: git.branch,
      notes: [
        'Watchdog active',
        `memory_watch jsonl: \`${jsonlPath.replace(/\\/g, '/')}\``,
        ...(highMemory ? ['Watchdog: memory >=80%'] : []),
      ],
    });
  saveSession(ROOT, snapshot);
  const focus = formatCursorFocusLines(snapshot.cursor).map((l) => l.replace(/\*\*/g, '')).join(' | ');
  if (!loggedJsonlPath) {
    console.log(`Memory watchdog jsonl -> ${jsonlPath}`);
    loggedJsonlPath = true;
  }
  console.log(
    `[${new Date().toISOString()}] memory ${snapshot.memory.usedPct}% cursor ~${snapshot.cursorTotalMb}MB | ${focus}${highMemory ? ' WARNING' : ''}`,
  );
}

console.log(`Memory watchdog every ${INTERVAL_MS}ms (session=${memoryWatchSession})`);
tick();
setInterval(tick, INTERVAL_MS);
