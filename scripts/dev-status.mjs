#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CURRENT_STATUS_FILE,
  OOM_REPORT_FILE,
  buildCurrentStatusMarkdown,
  buildOomReportMarkdown,
  collectSnapshot,
  detectStopped,
  formatCursorFocusLines,
  loadPreviousSession,
  readGitInfo,
  saveSession,
} from './lib/devStatusCore.mjs';
import { formatCursorCategoryTable } from './lib/cursorProcessMemory.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const writeOom = process.argv.includes('--oom') || process.env.CURSOR_OOM === '1';

const previous = loadPreviousSession(ROOT);
const snapshot = collectSnapshot();
const stopped = detectStopped(previous, snapshot);
const highMemory = (snapshot.memory?.usedPct ?? 0) >= 80;
const git = readGitInfo(ROOT);

const notes = [];
if (writeOom) notes.push('OOM report requested — see OOM_REPORT.md');
if (stopped.some((s) => s.key === 'metro')) notes.push('Metro stopped — run `npm run start:clear` if device testing');
if (stopped.some((s) => s.key === 'adbLogcat')) notes.push('adb logcat tail stopped — restart only if needed');

fs.writeFileSync(
  path.join(ROOT, CURRENT_STATUS_FILE),
  buildCurrentStatusMarkdown({ snapshot, stopped, highMemory, gitHead: git.head, gitBranch: git.branch, notes }),
  'utf8',
);
saveSession(ROOT, snapshot);

if (writeOom) {
  fs.writeFileSync(
    path.join(ROOT, OOM_REPORT_FILE),
    buildOomReportMarkdown({ snapshot, previous, stopped, gitHead: git.head, gitBranch: git.branch }),
    'utf8',
  );
  console.log(`Wrote ${OOM_REPORT_FILE}`);
}

console.log('\n=== npm run status ===');
console.log(`System memory: ${snapshot.memory.usedPct}% (${snapshot.memory.totalMB - snapshot.memory.freeMB}/${snapshot.memory.totalMB} MB)`);
console.log(`Cursor aggregate: ~${snapshot.cursorTotalMb} MB (${snapshot.cursor?.processCount ?? 0} proc)\n`);
console.log('Cursor focused categories:');
for (const line of formatCursorFocusLines(snapshot.cursor)) console.log(`  ${line.replace(/\*\*/g, '')}`);
console.log('');
if (snapshot.cursor?.categories) console.log(formatCursorCategoryTable(snapshot.cursor.categories));
console.log('\n| Process | Running | Count | RAM (MB) |');
console.log('|---------|---------|-------|----------|');
for (const bucket of Object.values(snapshot.processes)) {
  console.log(`| ${bucket.label.padEnd(16)} | ${(bucket.running ? 'yes' : 'no ').padEnd(7)} | ${String(bucket.count).padEnd(5)} | ${String(bucket.totalMb).padEnd(8)} |`);
}
if (stopped.length) {
  console.log('\nStopped since last run:');
  for (const s of stopped) console.log(`  - ${s.label}`);
}
if (highMemory) console.log('\nWARNING: Memory usage high (>=80%) — see CURRENT_STATUS.md');
console.log(`\nWrote ${CURRENT_STATUS_FILE}`);
