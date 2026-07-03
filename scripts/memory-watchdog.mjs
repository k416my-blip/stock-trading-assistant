#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CURRENT_STATUS_FILE,
  buildCurrentStatusMarkdown,
  collectSnapshot,
  detectStopped,
  formatCursorFocusLines,
  loadPreviousSession,
  readGitInfo,
  saveSession,
} from './lib/devStatusCore.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INTERVAL_MS = Number(process.env.MEMORY_WATCH_MS ?? 60_000);

function tick() {
  const previous = loadPreviousSession(ROOT);
  const snapshot = collectSnapshot();
  const stopped = detectStopped(previous, snapshot);
  const highMemory = (snapshot.memory?.usedPct ?? 0) >= 80;
  const git = readGitInfo(ROOT);
  fs.writeFileSync(
    path.join(ROOT, CURRENT_STATUS_FILE),
    buildCurrentStatusMarkdown({
      snapshot,
      stopped,
      highMemory,
      gitHead: git.head,
      gitBranch: git.branch,
      notes: highMemory ? ['Watchdog: memory >=80%'] : ['Watchdog active'],
    }),
    'utf8',
  );
  saveSession(ROOT, snapshot);
  const focus = formatCursorFocusLines(snapshot.cursor).map((l) => l.replace(/\*\*/g, '')).join(' | ');
  console.log(
    `[${new Date().toISOString()}] memory ${snapshot.memory.usedPct}% cursor ~${snapshot.cursorTotalMb}MB | ${focus}${highMemory ? ' WARNING' : ''}`,
  );
}

console.log(`Memory watchdog every ${INTERVAL_MS}ms`);
tick();
setInterval(tick, INTERVAL_MS);
