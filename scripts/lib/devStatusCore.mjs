import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { e2eMetroPolicyLines } from './e2eMetroEnv.mjs';
import {
  collectCursorMemorySnapshot,
  formatCursorCategoryTable,
  readCursorProcesses,
  summarizeCursorMemory,
  topConsumers,
} from './cursorProcessMemory.mjs';

export const DEV_DIR = '.dev';
export const SESSION_FILE = path.join(DEV_DIR, 'last-session.json');
export const CURRENT_STATUS_FILE = 'CURRENT_STATUS.md';
export const OOM_REPORT_FILE = 'OOM_REPORT.md';

const PROCESS_GROUPS = [
  { key: 'cursor', label: 'Cursor', match: (n) => /^cursor/i.test(n) },
  { key: 'codeHelper', label: 'Code Helper', match: (n, cmd) => /code helper/i.test(cmd) || (/cursor/i.test(n) && /NodeService/i.test(cmd)) },
  { key: 'node', label: 'node', match: (n, cmd) => /^node/i.test(n) && !/expo|metro|vitest|tsserver|eslint|cursor/i.test(cmd) },
  { key: 'metro', label: 'Metro', match: (n, cmd) => /metro|expo start|react-native start|8081/i.test(cmd) },
  { key: 'adb', label: 'adb', match: (n) => /^adb/i.test(n) },
  { key: 'adbLogcat', label: 'adb logcat', match: (n, cmd) => /^adb/i.test(n) && /logcat/i.test(cmd) },
  { key: 'tsserver', label: 'TypeScript Server', match: (n, cmd) => /tsserver/i.test(n) || /tsserver/i.test(cmd) },
  { key: 'eslint', label: 'ESLint', match: (n, cmd) => /eslint/i.test(n) || /eslint/i.test(cmd) },
];

const CURSOR_FOCUS_KEYS = ['indexing', 'tsserver', 'extensionHost'];

function isWindows() {
  return process.platform === 'win32';
}

function readWindowsProcesses() {
  try {
    const out = execSync('wmic process get Name,ProcessId,WorkingSetSize /format:csv', {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
      windowsHide: true,
    });
    const rows = [];
    for (const line of out.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('Node,')) continue;
      const parts = t.split(',');
      if (parts.length < 4) continue;
      const name = parts[1];
      if (!/cursor|node|adb|code|tsserver|eslint|expo|chrome|expo/i/i.test(name)) continue;
      rows.push({ Name: name, ProcessId: Number(parts[2]), WorkingSetSize: Number(parts[3]), CommandLine: '' });
    }
    return rows;
  } catch {
    return [];
  }
}

function readUnixProcesses() {
  try {
    const out = execSync('ps -axo rss=,command=', { encoding: 'utf8' });
    return out
      .split('\n')
      .map((line) => {
        const m = line.trim().match(/^(\d+)\s+(.*)$/);
        if (!m) return null;
        const cmd = m[2];
        return {
          Name: cmd.split(/\s+/)[0]?.split('/').pop() ?? 'process',
          ProcessId: 0,
          WorkingSetSize: Number(m[1]) * 1024,
          CommandLine: cmd,
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function readSystemMemory() {
  if (!isWindows()) return { totalMB: 0, freeMB: 0, usedPct: 0 };
  try {
    const out = execSync('wmic OS get FreePhysicalMemory,TotalVisibleMemorySize /format:csv', {
      encoding: 'utf8',
      windowsHide: true,
    });
    for (const line of out.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('Node,')) continue;
      const p = t.split(',');
      if (p.length < 3) continue;
      const freeKb = Number(p[1]);
      const totalKb = Number(p[2]);
      const totalMB = Math.round(totalKb / 1024);
      const freeMB = Math.round(freeKb / 1024);
      return { totalMB, freeMB, usedPct: totalKb > 0 ? Math.round((1 - freeKb / totalKb) * 1000) / 10 : 0 };
    }
  } catch {}
  return { totalMB: 0, freeMB: 0, usedPct: 0 };
}

export function summarizeProcesses(rawProcesses) {
  const groups = Object.fromEntries(
    PROCESS_GROUPS.map((g) => [g.key, { label: g.label, running: false, count: 0, totalMb: 0, pids: [] }]),
  );
  for (const proc of rawProcesses) {
    const name = String(proc.Name ?? '');
    const cmd = String(proc.CommandLine ?? '');
    const mb = Math.round(Number(proc.WorkingSetSize ?? 0) / (1024 * 1024));
    const pid = Number(proc.ProcessId ?? 0);
    for (const group of PROCESS_GROUPS) {
      if (!group.match(name, cmd)) continue;
      const b = groups[group.key];
      b.running = true;
      b.count += 1;
      b.totalMb += mb;
      if (pid) b.pids.push(pid);
    }
  }
  for (const b of Object.values(groups)) b.totalMb = Math.round(b.totalMb * 10) / 10;
  return groups;
}

export function collectSnapshot() {
  const raw = isWindows() ? readWindowsProcesses() : readUnixProcesses();
  const memory = readSystemMemory();
  const processes = summarizeProcesses(raw);
  const cursorRaw = readCursorProcesses();
  const cursor = summarizeCursorMemory(cursorRaw);
  const cursorTotalMb = cursor.totalMb;
  return {
    capturedAt: new Date().toISOString(),
    memory,
    processes,
    cursor,
    cursorTotalMb,
    rawProcessCount: raw.length,
  };
}

export function loadPreviousSession(rootDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(rootDir, SESSION_FILE), 'utf8'));
  } catch {
    return null;
  }
}

export function saveSession(rootDir, snapshot) {
  fs.mkdirSync(path.join(rootDir, DEV_DIR), { recursive: true });
  fs.writeFileSync(path.join(rootDir, SESSION_FILE), JSON.stringify(snapshot, null, 2) + '\n');
}

export function detectStopped(previous, current) {
  if (!previous?.processes) return [];
  const stopped = [];
  for (const [key, prev] of Object.entries(previous.processes)) {
    if (prev?.running && !current.processes[key]?.running) {
      stopped.push({ key, label: prev.label ?? key, lastPids: prev.pids ?? [], lastMb: prev.totalMb ?? 0 });
    }
  }
  return stopped;
}

export function inferOomCauses(snapshot, previous) {
  const c = [];
  if ((snapshot.memory?.usedPct ?? 0) >= 80) c.push(`System memory ${snapshot.memory.usedPct}%`);
  if (snapshot.cursorTotalMb >= 3000) c.push(`Cursor aggregate ~${snapshot.cursorTotalMb} MB`);
  const cats = snapshot.cursor?.categories ?? {};
  for (const key of CURSOR_FOCUS_KEYS) {
    const b = cats[key];
    if (b && b.totalMb >= 1500) c.push(`${b.label} ~${b.totalMb} MB`);
  }
  if (previous?.processes?.metro?.running && !snapshot.processes.metro?.running) c.push('Metro stopped after restart');
  if (previous?.processes?.adbLogcat?.running && !snapshot.processes.adbLogcat?.running) c.push('adb logcat stopped after restart');
  if (snapshot.processes?.rnDevTools?.running) {
    c.push(`React Native DevTools browser (~${snapshot.processes.rnDevTools.totalMb} MB) — close and use npm run e2e:metro during E2E`);
  }
  if (snapshot.processes?.metro?.running && snapshot.processes?.rnDevTools?.running) {
    c.push('Metro + DevTools browser together — EXPO_DEBUG=0 / CI=1 / npm run e2e:metro suppresses auto-open');
  }
  c.push('React Native DevTools auto-launch during E2E (npm run e2e:metro; EXPO_DEBUG=0; CI=1; BROWSER=none)');
  c.push('docs/review tree if watchers not excluded');
  c.push('Full vitest without path filter');
  c.push('TS Server + large chat context');
  return c;
}

export function formatProcessTable(processes) {
  const lines = ['| Process | Running | Count | RAM (MB) | PIDs |', '|---------|---------|-------|----------|------|'];
  for (const b of Object.values(processes)) {
    lines.push(`| ${b.label} | ${b.running ? 'yes' : 'no'} | ${b.count} | ${b.totalMb} | ${b.pids.join(', ') || '-'} |`);
  }
  return lines.join('\n');
}

export function formatCursorFocusLines(cursor) {
  const cats = cursor?.categories ?? {};
  const lines = [];
  for (const key of CURSOR_FOCUS_KEYS) {
    const b = cats[key];
    lines.push(`- **${b?.label ?? key}**: ${b?.totalMb ?? 0} MB (${b?.count ?? 0} proc)`);
  }
  lines.push(`- **Cursor aggregate**: ${cursor?.totalMb ?? 0} MB (${cursor?.processCount ?? 0} proc)`);
  return lines;
}


export const MEMORY_NOTE_HEADING = '## Memory note';
export const LIVE_SNAPSHOT_HEADING = '## Live snapshot';

function formatLiveSnapshotTimestamp(iso = new Date().toISOString()) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  const utc8 = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  return (
    `${utc8.getUTCFullYear()}-${pad(utc8.getUTCMonth() + 1)}-${pad(utc8.getUTCDate())} ` +
    `${pad(utc8.getUTCHours())}:${pad(utc8.getUTCMinutes())} +08`
  );
}

function memoryJudgment(cursorMb) {
  if (cursorMb >= 7000) return '**危険** — Reload Window / Cursor 再起動を推奨';
  if (cursorMb >= 5000) return '**注意** — 5 GB 超過';
  return '**正常** — 5 GB 未満';
}

function devProcessRunningLabel(processes, keys) {
  const running = keys.filter((k) => processes?.[k]?.running);
  if (!running.length) return '**停止中**';
  return running.map((k) => processes[k].label).join(', ') + ' running';
}

export function buildMemoryNoteAndLiveSnapshotMarkdown({ snapshot, stopped = [] }) {
  const mem = snapshot.memory;
  const cursorMb = snapshot.cursorTotalMb;
  const ts = formatLiveSnapshotTimestamp(snapshot.capturedAt);
  const cats = snapshot.cursor?.categories ?? {};
  const proc = snapshot.processes ?? {};

  const lines = [
    MEMORY_NOTE_HEADING,
    '',
    '| 項目 | 値 |',
    '|------|-----|',
    `| 現在の Cursor aggregate | **~${cursorMb} MB**（${ts}、npm run status） |`,
    `| Metro / adb / node | ${devProcessRunningLabel(proc, ['metro', 'adb', 'node'])} |`,
    `| 判定 | ${memoryJudgment(cursorMb)} |`,
    '',
  ];

  if (stopped.length) {
    lines.push('### Stopped since last snapshot', '');
    for (const item of stopped) {
      lines.push(
        `- **${item.label}** — was running (PIDs: ${item.lastPids.join(', ') || 'n/a'}, ~${item.lastMb} MB)`,
      );
    }
    lines.push('');
  }

  lines.push(
    '---',
    '',
    `${LIVE_SNAPSHOT_HEADING}（${ts}）`,
    '',
    '`npm run status` による一時計測。PASS 判定値は上記 OOM / Concierge セクションを正とする。',
    '',
    '### System memory',
    '',
    `- Used: **${mem.usedPct}%** (${mem.totalMB - mem.freeMB} / ${mem.totalMB} MB)`,
    '',
    '### Cursor memory',
    '',
    `- **Cursor aggregate**: ~${cursorMb} MB (${snapshot.cursor?.processCount ?? 0} proc)`,
    `- TypeScript Server: ${cats.tsserver?.totalMb ?? 0} MB (${cats.tsserver?.count ?? 0} proc)`,
    `- Extension Host: ${cats.extensionHost?.totalMb ?? 0} MB (${cats.extensionHost?.count ?? 0} proc)`,
    '',
    '### Dev processes',
    '',
    '| Process | Running |',
    '|---------|---------|',
    `| Metro | ${proc.metro?.running ? 'yes' : 'no'} |`,
    `| adb | ${proc.adb?.running ? 'yes' : 'no'} |`,
    `| node | ${proc.node?.running ? 'yes' : 'no'} |`,
    `| adb logcat | ${proc.adbLogcat?.running ? 'yes' : 'no'} |`,
    '',
    '---',
    '',
  );

  return lines.join('\n');
}

export function extractSuffixAfterLiveSnapshot(content) {
  const liveIdx = content.indexOf(LIVE_SNAPSHOT_HEADING);
  if (liveIdx < 0) return '';
  const tail = content.slice(liveIdx);
  const match = tail.match(/\n## Commands\r?\n/);
  if (!match || match.index === undefined) return '';
  return tail.slice(match.index + 1).trimEnd();
}

export function mergeCurrentStatusLiveSections(existingContent, ctx) {
  const liveBlock = buildMemoryNoteAndLiveSnapshotMarkdown(ctx);
  const suffix = extractSuffixAfterLiveSnapshot(existingContent);
  const memoryIdx = existingContent.indexOf(MEMORY_NOTE_HEADING);
  const liveIdx = existingContent.indexOf(LIVE_SNAPSHOT_HEADING);

  let updateStart = -1;
  if (memoryIdx >= 0) updateStart = memoryIdx;
  else if (liveIdx >= 0) updateStart = liveIdx;

  if (updateStart < 0) {
    const preserved = existingContent.trimEnd();
    const parts = preserved ? [preserved, '', liveBlock] : [liveBlock];
    if (suffix) parts.push('', suffix);
    return parts.join('\n').trimEnd() + '\n';
  }

  const preserved = existingContent.slice(0, updateStart).trimEnd();
  const parts = [preserved, '', liveBlock];
  if (suffix) parts.push('', suffix);
  return parts.join('\n').trimEnd() + '\n';
}

export function writeCurrentStatusPreserving(rootDir, ctx) {
  const filePath = path.join(rootDir, CURRENT_STATUS_FILE);
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const merged = mergeCurrentStatusLiveSections(existing, ctx);
  fs.writeFileSync(filePath, merged, 'utf8');
  return merged;
}

export function buildCurrentStatusMarkdown({ snapshot, stopped, highMemory, gitHead, gitBranch, notes = [] }) {
  const mem = snapshot.memory;
  const lines = ['# CURRENT_STATUS', '', `Updated: ${snapshot.capturedAt}`, '', '## Quick resume after Cursor restart', ''];
  if (stopped.length) {
    lines.push('### Stopped since last snapshot');
    for (const i of stopped) lines.push(`- **${i.label}** 窶・was running (PIDs: ${i.lastPids.join(', ') || 'n/a'}, ~${i.lastMb} MB)`);
    lines.push('');
  } else {
    lines.push('- No tracked dev processes disappeared since the last `npm run status`.', '');
  }
  if (highMemory) lines.push('## WARNING:', 'Memory usage high', '');
  lines.push('## System memory', `- Used: **${mem.usedPct}%** (${mem.totalMB - mem.freeMB} / ${mem.totalMB} MB)`, '');
  lines.push('## Cursor memory (focused categories)', ...formatCursorFocusLines(snapshot.cursor), '');
  if (snapshot.cursor?.categories) lines.push(formatCursorCategoryTable(snapshot.cursor.categories), '');
  lines.push('## Dev processes', formatProcessTable(snapshot.processes), '', '## Git', `- Branch: \`${gitBranch || 'unknown'}\``, `- HEAD: \`${gitHead || 'unknown'}\``, '', '## Notes');
  (notes.length ? notes : ['Run `npm run status` after every Cursor restart.']).forEach((n) => lines.push(`- ${n}`));
  lines.push('', '## Commands', '- `npm run status`', '- `npm run oom:report`', '- `npm run memory:watch`', '- `npm run memory:log`', '- `npm run memory:leak-report`', '');
  return lines.join('\n');
}

export function buildOomReportMarkdown({ snapshot, previous, stopped, gitHead, gitBranch }) {
  const top = topConsumers(snapshot.cursor?.byPid ?? [], 8);
  return [
    '# OOM_REPORT',
    '',
    `Generated: ${snapshot.capturedAt}`,
    '',
    `- System memory: **${snapshot.memory.usedPct}%**`,
    `- Cursor aggregate: **~${snapshot.cursorTotalMb} MB**`,
    '',
    '## Cursor focused categories',
    ...formatCursorFocusLines(snapshot.cursor),
    '',
    '## Top Cursor consumers (by PID)',
    ...(top.length
      ? top.map((p) => `- PID ${p.pid} **${p.name}** [${p.category}] 窶・${p.mb} MB`)
      : ['- none captured']),
    '',
    '## Likely causes',
    ...inferOomCauses(snapshot, previous).map((x, i) => `${i + 1}. ${x}`),
    '',
    '## Processes',
    formatProcessTable(snapshot.processes),
    '',
    '## Cursor categories',
    snapshot.cursor?.categories ? formatCursorCategoryTable(snapshot.cursor.categories) : '- n/a',
    '',
    '## Stopped',
    ...(stopped.length ? stopped.map((s) => `- ${s.label}`) : ['- none']),
    '',
    '## Recovery',
    '1. Reload Cursor',
    '2. npm run status',
    '3. npm run memory:leak-report',
    '4. E2E/device smokes: npm run e2e:metro (suppresses RN DevTools auto-launch)',
    '5. Close Chrome/Edge DevTools tabs opened by interactive Metro before long E2E runs',
    '6. npm run start:clear if Metro needed (interactive dev only — not E2E)',
    '',
    '## E2E Metro policy (DevTools suppression)',
    ...e2eMetroPolicyLines().map((line) => `- ${line}`),
    '',
    `Branch: ${gitBranch}`,
    `HEAD: ${gitHead}`,
    '',
  ].join('\n');
}

export function readGitInfo(rootDir) {
  let head = '';
  let branch = '';
  try {
    head = execSync('git rev-parse --short HEAD', { cwd: rootDir, encoding: 'utf8' }).trim();
  } catch {}
  try {
    branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: rootDir, encoding: 'utf8' }).trim();
  } catch {}
  return { head, branch };
}
