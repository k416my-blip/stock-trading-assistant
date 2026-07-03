import { execSync } from 'node:child_process';

export const CURSOR_CATEGORIES = [
  { key: 'indexing', label: 'Cursor Indexing' },
  { key: 'tsserver', label: 'TypeScript Server' },
  { key: 'extensionHost', label: 'Extension Host' },
  { key: 'codeHelper', label: 'Code Helper' },
  { key: 'main', label: 'Cursor Main' },
  { key: 'other', label: 'Cursor Other' },
];

const CURSOR_NAME_RE = /cursor|code helper|tsserver|eslint/i;
const CURSOR_CMD_RE = /cursor|tsserver|typescript|eslint|vscode-/i;

export function isCursorRelated(name, cmd = '') {
  const n = String(name ?? '');
  const c = String(cmd ?? '');
  if (CURSOR_NAME_RE.test(n)) return true;
  if (/^node/i.test(n) && CURSOR_CMD_RE.test(c)) return true;
  return false;
}

export function classifyCursorProcess(name, cmd = '') {
  const n = String(name ?? '');
  const c = String(cmd ?? '');
  const lc = c.toLowerCase();

  if (/tsserver/i.test(n) || /tsserver|typescript-language-features|--server/i.test(c)) {
    return 'tsserver';
  }
  if (/indexing|fileindexer|cursor indexing|cursorindexing/i.test(c) || /indexing/i.test(n)) {
    return 'indexing';
  }
  if (/extensionhost|extension-host|--type=extensionhost/i.test(lc)) {
    return 'extensionHost';
  }
  if (
    /node\.mojom\.nodeservice/i.test(lc) &&
    (/inspect-port/i.test(lc) || /extension/i.test(lc) || /vscode-/i.test(lc))
  ) {
    return 'extensionHost';
  }
  if (/code helper/i.test(c) || (/cursor/i.test(n) && /nodeservice/i.test(c))) {
    return 'codeHelper';
  }
  if (/cursor/i.test(n) && !/--type=/i.test(c)) {
    return 'main';
  }
  if (/cursor/i.test(n) || /--type=(renderer|utility|gpu-process|zygote)/i.test(c)) {
    return 'other';
  }
  if (/^node/i.test(n) && CURSOR_CMD_RE.test(c)) {
    return 'other';
  }
  return 'other';
}

export function mbFromBytes(bytes) {
  return Math.round((Number(bytes ?? 0) / (1024 * 1024)) * 10) / 10;
}

function emptyCategoryBuckets() {
  return Object.fromEntries(
    CURSOR_CATEGORIES.map(({ key, label }) => [key, { label, count: 0, totalMb: 0, pids: [], processes: [] }]),
  );
}

export function summarizeCursorMemory(rawProcesses) {
  const categories = emptyCategoryBuckets();
  const byPid = [];
  let totalMb = 0;

  for (const proc of rawProcesses) {
    const name = String(proc.Name ?? proc.name ?? '');
    const cmd = String(proc.CommandLine ?? proc.commandLine ?? '');
    if (!isCursorRelated(name, cmd)) continue;

    const pid = Number(proc.ProcessId ?? proc.pid ?? 0);
    const mb = mbFromBytes(proc.WorkingSetSize ?? proc.WorkingSetSize ?? proc.workingSetSize ?? 0);
    const category = classifyCursorProcess(name, cmd);
    const bucket = categories[category];

    bucket.count += 1;
    bucket.totalMb = Math.round((bucket.totalMb + mb) * 10) / 10;
    if (pid) bucket.pids.push(pid);
    bucket.processes.push({ pid, name, mb, category, commandLine: cmd.slice(0, 240) });
    byPid.push({ pid, name, mb, category, commandLine: cmd.slice(0, 240) });
    totalMb = Math.round((totalMb + mb) * 10) / 10;
  }

  for (const b of Object.values(categories)) {
    b.pids.sort((a, z) => a - z);
    b.processes.sort((a, z) => z.mb - a.mb);
  }
  byPid.sort((a, z) => z.mb - a.mb);

  return { categories, byPid, totalMb, processCount: byPid.length };
}

function isWindows() {
  return process.platform === 'win32';
}

function readWindowsCursorProcesses() {
  const psScript = [
    "Get-CimInstance Win32_Process |",
    "Where-Object { $_.Name -match '(?i)cursor|tsserver|eslint|code' -or ($_.Name -eq 'node.exe' -and $_.CommandLine -match '(?i)cursor|tsserver|typescript|eslint') } |",
    "Select-Object ProcessId, Name, CommandLine, WorkingSetSize |",
    "ConvertTo-Json -Compress",
  ].join(' ');

  try {
    const out = execSync(
      'powershell -NoProfile -ExecutionPolicy Bypass -Command ' + JSON.stringify(psScript),
      { encoding: 'utf8', maxBuffer: 30 * 1024 * 1024, windowsHide: true },
    ).trim();
    if (!out) return [];
    const parsed = JSON.parse(out);
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    return rows.map((r) => ({
      Name: r.Name ?? '',
      ProcessId: Number(r.ProcessId ?? 0),
      CommandLine: r.CommandLine ?? '',
      WorkingSetSize: Number(r.WorkingSetSize ?? 0),
    }));
  } catch {
    return readWindowsCursorProcessesWmic();
  }
}

function readWindowsCursorProcessesWmic() {
  try {
    const out = execSync('wmic process get Name,ProcessId,CommandLine,WorkingSetSize /format:csv', {
      encoding: 'utf8',
      maxBuffer: 30 * 1024 * 1024,
      windowsHide: true,
    });
    const rows = [];
    for (const line of out.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('Node,')) continue;
      const parts = t.split(',');
      if (parts.length < 5) continue;
      const name = parts[1];
      const cmd = parts.slice(2, -2).join(',');
      const pid = Number(parts[parts.length - 2]);
      const ws = Number(parts[parts.length - 1]);
      if (!isCursorRelated(name, cmd)) continue;
      rows.push({ Name: name, ProcessId: pid, CommandLine: cmd, WorkingSetSize: ws });
    }
    return rows;
  } catch {
    return [];
  }
}

function readUnixCursorProcesses() {
  try {
    const out = execSync('ps -axo pid=,rss=,command=', { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    const rows = [];
    for (const line of out.split('\n')) {
      const m = line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/);
      if (!m) continue;
      const cmd = m[3];
      const name = cmd.split(/\s+/)[0]?.split('/').pop() ?? 'process';
      if (!isCursorRelated(name, cmd)) continue;
      rows.push({
        Name: name,
        ProcessId: Number(m[1]),
        CommandLine: cmd,
        WorkingSetSize: Number(m[2]) * 1024,
      });
    }
    return rows;
  } catch {
    return [];
  }
}

export function readCursorProcesses() {
  return isWindows() ? readWindowsCursorProcesses() : readUnixCursorProcesses();
}

export function collectCursorMemorySnapshot() {
  const raw = readCursorProcesses();
  const summary = summarizeCursorMemory(raw);
  return {
    capturedAt: new Date().toISOString(),
    ...summary,
  };
}

export function formatCursorCategoryTable(categories) {
  const lines = ['| Category | Count | RAM (MB) | PIDs |', '|----------|-------|----------|------|'];
  for (const { key } of CURSOR_CATEGORIES) {
    const b = categories[key];
    if (!b || b.count === 0) continue;
    lines.push(`| ${b.label} | ${b.count} | ${b.totalMb} | ${b.pids.join(', ') || '-'} |`);
  }
  return lines.join('\n');
}

export function topConsumers(byPid, limit = 5) {
  return byPid.slice(0, limit);
}

export function linearRegressionSlope(points) {
  if (!points || points.length < 2) return 0;
  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i += 1) {
    const x = points[i].t;
    const y = points[i].mb;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

export function detectLeakSuspects(samples, options = {}) {
  const minSamples = options.minSamples ?? 4;
  const growthPctThreshold = options.growthPctThreshold ?? 20;
  const minSlopeMbPerHour = options.minSlopeMbPerHour ?? 5;
  if (!samples || samples.length < minSamples) {
    return { suspects: [], reason: 'insufficient_samples', sampleCount: samples?.length ?? 0 };
  }

  const byKey = new Map();
  for (const snap of samples) {
    for (const proc of snap.byPid ?? []) {
      const key = proc.pid ? String(proc.pid) : `${proc.name}:${proc.category}`;
      if (!byKey.has(key)) byKey.set(key, { pid: proc.pid, name: proc.name, category: proc.category, points: [] });
      byKey.get(key).points.push({ t: new Date(snap.capturedAt).getTime(), mb: proc.mb });
    }
  }

  const suspects = [];
  const t0 = new Date(samples[0].capturedAt).getTime();
  const t1 = new Date(samples[samples.length - 1].capturedAt).getTime();
  const spanHours = Math.max((t1 - t0) / 3_600_000, 0.01);

  for (const entry of byKey.values()) {
    entry.points.sort((a, b) => a.t - b.t);
    if (entry.points.length < minSamples) continue;
    const first = entry.points[0].mb;
    const last = entry.points[entry.points.length - 1].mb;
    const growthPct = first > 0 ? ((last - first) / first) * 100 : last > 0 ? 100 : 0;
    const normalized = entry.points.map((p) => ({ t: (p.t - t0) / 3_600_000, mb: p.mb }));
    const slope = linearRegressionSlope(normalized);
    const sustainedUp = entry.points.every((p, i) => i === 0 || p.mb >= entry.points[i - 1].mb - 1);
    const flagged =
      (growthPct >= growthPctThreshold && entry.points.length >= minSamples) ||
      (slope >= minSlopeMbPerHour && growthPct > 5) ||
      (sustainedUp && growthPct >= 10 && spanHours >= 0.5);

    if (flagged) {
      suspects.push({
        pid: entry.pid,
        name: entry.name,
        category: entry.category,
        firstMb: first,
        lastMb: last,
        growthPct: Math.round(growthPct * 10) / 10,
        slopeMbPerHour: Math.round(slope * 100) / 100,
        sampleCount: entry.points.length,
        sustainedUp,
      });
    }
  }

  suspects.sort((a, b) => b.lastMb - a.lastMb);
  return { suspects, sampleCount: samples.length, spanHours: Math.round(spanHours * 100) / 100 };
}
