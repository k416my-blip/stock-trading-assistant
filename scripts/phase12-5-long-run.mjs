/**
 * Phase12.5 Long Run Validation — 実時間12時間 実機連続稼働
 *
 * Usage:
 *   node scripts/phase12-5-long-run.mjs
 *   PHASE12_5_HOURS=12 node scripts/phase12-5-long-run.mjs
 *
 * 短縮検証 (スクリプト動作確認):
 *   PHASE12_5_HOURS=0.25 node scripts/phase12-5-long-run.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs/review/phase12-5-long-run');
const REPORT_PATH = path.join(ROOT, 'docs/review/PHASE12_5_LONG_RUN_REPORT.md');
const TELEMETRY_PATH = path.join(OUT_DIR, 'telemetry.jsonl');
const CHECKPOINT_PATH = path.join(OUT_DIR, 'checkpoint.json');
const PKG = 'com.assistant.stocktrading';

const HOURS = Number(process.env.PHASE12_5_HOURS ?? '12');
const DURATION_MS = HOURS * 3600 * 1000;
const HOUR_MS = 3600 * 1000;
const PRICE_INTERVAL_MS = 15 * 60 * 1000;
const TICK_MS = 60 * 1000;

const STOCKS = [
  { code: '1155', label: 'Maybank', patterns: ['1155', 'Maybank', 'マレー'] },
  { code: '1023', label: 'CIMB', patterns: ['1023', 'CIMB'] },
  { code: '1295', label: 'Public Bank', patterns: ['1295', 'Public', 'パブリック'] },
  { code: '5347', label: 'Tenaga', patterns: ['5347', 'Tenaga', 'テナガ'] },
  { code: '4707', label: 'Nestle', patterns: ['4707', 'Nestle', 'ネスレ'] },
  { code: '6033', label: 'Petronas Gas', patterns: ['6033', 'Petronas Gas', 'ペトロナス'] },
];

const state = {
  startedAt: null,
  endedAt: null,
  baselineMemKb: null,
  hourlyMemKb: [],
  cpuSamples: [],
  storageSamples: [],
  priceRefreshRuns: [],
  aiAnalysisRuns: [],
  stockChecks: [],
  crashes: { fatal: 0, rnTypeError: 0, undefined: 0 },
  anrCount: 0,
  logcatBaselineSize: 0,
  pidLostEvents: 0,
};

function sh(cmd, opts = {}) {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 30 * 1024 * 1024,
      ...opts,
    }).trim();
  } catch (e) {
    if (opts.allowFail) {
      return `${e.stdout?.toString?.() ?? ''}${e.stderr?.toString?.() ?? ''}`.trim();
    }
    throw e;
  }
}

function adbOk() {
  const out = sh('adb devices', { allowFail: true });
  return out.split('\n').some((l) => l.includes('\tdevice'));
}

function appendTelemetry(entry) {
  fs.appendFileSync(TELEMETRY_PATH, `${JSON.stringify(entry)}\n`, 'utf8');
}

function saveCheckpoint() {
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2));
}

function wakeDevice() {
  sh('adb shell input keyevent KEYCODE_WAKEUP', { allowFail: true });
  sh('adb shell wm dismiss-keyguard', { allowFail: true });
}

function parseMeminfoKb(text) {
  const m = text.match(/TOTAL\s+(\d+)/);
  return m ? Number(m[1]) : null;
}

function sampleMemory(label) {
  const raw = sh(`adb shell dumpsys meminfo ${PKG}`, { allowFail: true });
  const kb = parseMeminfoKb(raw);
  const file = path.join(OUT_DIR, `meminfo-${label}.txt`);
  fs.writeFileSync(file, raw);
  return { kb, file, at: new Date().toISOString() };
}

function sampleCpu() {
  const raw = sh(`adb shell "top -n 1 -d 1 -b | grep ${PKG}"`, { allowFail: true });
  const m = raw.match(/\s(\d+(?:\.\d+)?)\s+\d/);
  const percent = m ? Number(m[1]) : null;
  return { percent, raw, at: new Date().toISOString() };
}

function sampleAsyncStorageKb() {
  const raw = sh(`adb shell run-as ${PKG} du -sk databases/RKStorage .`, { allowFail: true });
  const lines = raw.split('\n').filter(Boolean);
  let rkKb = null;
  let totalKb = null;
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const kb = Number(parts[0]);
    if (Number.isNaN(kb)) continue;
    if (line.includes('RKStorage') && !line.includes('journal')) rkKb = kb;
    if (line.endsWith(' .') || line.endsWith('\t.')) totalKb = kb;
  }
  if (totalKb == null && lines.length) {
    const p = lines[lines.length - 1].trim().split(/\s+/);
    totalKb = Number(p[0]) || null;
  }
  return { rkKb, totalKb, raw, at: new Date().toISOString() };
}

function dumpUi(name) {
  sh('adb shell uiautomator dump /sdcard/p125-ui.xml', { allowFail: true });
  const raw = sh('adb shell cat /sdcard/p125-ui.xml', { allowFail: true });
  fs.writeFileSync(path.join(OUT_DIR, `${name}.xml`), raw);
  return raw;
}

function findLabels(xml, pred) {
  const re = /(?:text|content-desc)="([^"]*)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g;
  const out = [];
  let m;
  while ((m = re.exec(xml))) {
    const cx = Math.floor((+m[2] + +m[4]) / 2);
    const cy = Math.floor((+m[3] + +m[5]) / 2);
    if (pred(m[1])) out.push({ label: m[1], cx, cy });
  }
  return out;
}

function tap(item) {
  sh(`adb shell input tap ${item.cx} ${item.cy}`, { allowFail: true });
}

async function tapTab(label) {
  let xml = dumpUi(`tab-pre-${label}`);
  for (let i = 0; i < 8; i++) {
    const tabs = findLabels(xml, (l) => l === label || l.endsWith(label) || l.includes(`, ${label}`));
    if (tabs.length) {
      tap(tabs.sort((a, b) => a.cx - b.cx)[0]);
      await sleep(5000);
      return true;
    }
    sh('adb shell input swipe 900 2620 300 2620 350', { allowFail: true });
    await sleep(600);
    xml = dumpUi(`tab-scroll-${label}-${i}`);
  }
  return false;
}

async function ensureAppForeground() {
  wakeDevice();
  sh(`adb shell am start -W -n ${PKG}/.MainActivity`, { allowFail: true });
  await sleep(6000);
  for (const label of ['スキップ', '閉じる', 'OK', '後で']) {
    const xml = dumpUi('dismiss');
    const btn = findLabels(xml, (l) => l === label);
    if (btn[0]) {
      tap(btn[0]);
      await sleep(1000);
    }
  }
  const pid = sh(`adb shell pidof ${PKG}`, { allowFail: true }).trim();
  return Boolean(pid);
}

async function runPriceRefresh(hourIndex, minuteIndex) {
  const tag = `h${hourIndex}-m${minuteIndex}`;
  console.log(`[p12.5] price refresh ${tag}`);
  const ok = await ensureAppForeground();
  if (!ok) {
    state.pidLostEvents += 1;
    return { tag, ok: false, error: 'app not running' };
  }
  await tapTab('保有銘柄');
  await sleep(3000);
  let xml = dumpUi(`price-${tag}-before`);
  let btn = findLabels(xml, (l) => l.includes('株価を自動更新') || l.includes('更新中'));
  if (!btn.length) {
    sh('adb shell input swipe 540 700 540 1800 350', { allowFail: true });
    await sleep(800);
    xml = dumpUi(`price-${tag}-scroll`);
    btn = findLabels(xml, (l) => l.includes('株価を自動更新') || l.includes('更新中'));
  }
  if (btn[0]) tap(btn[0]);
  else sh('adb shell input tap 540 520', { allowFail: true });
  await sleep(25000);
  xml = dumpUi(`price-${tag}-after`);
  const hasError =
    xml.includes('Cannot convert undefined') ||
    xml.includes('Unfortunately') ||
    xml.includes('クラッシュ');
  const result = { tag, ok: !hasError, hasError, at: new Date().toISOString() };
  state.priceRefreshRuns.push(result);
  appendTelemetry({ type: 'price_refresh', ...result });
  return result;
}

async function verifyStockDevice(stock) {
  console.log(`[p12.5] verify stock ${stock.code} ${stock.label}`);
  await ensureAppForeground();
  sh('adb shell input keyevent 4', { allowFail: true });
  await sleep(500);
  await tapTab('ホーム');
  await sleep(1500);
  sh('adb shell input tap 277 2486', { allowFail: true });
  await sleep(2500);
  sh('adb shell input tap 484 828', { allowFail: true });
  await sleep(600);
  for (let i = 0; i < 12; i++) sh('adb shell input keyevent 67', { allowFail: true });
  sh(`adb shell input text ${stock.code}`, { allowFail: true });
  await sleep(4500);
  const xml = dumpUi(`search-${stock.code}`);
  const cards = findLabels(
    xml,
    (l) =>
      l.includes(`${stock.code} ·`) ||
      (l.includes(stock.code) &&
        !l.includes('マレーシア市場') &&
        !l.includes('銘柄名') &&
        !l.includes('ティッカー')),
  );
  if (!cards.length) {
    return { code: stock.code, label: stock.label, ok: false, reason: 'card not found' };
  }
  tap(cards.sort((a, b) => a.cy - b.cy).find((c) => c.label.includes('·')) ?? cards[0]);
  await sleep(12000);
  const detail = dumpUi(`detail-${stock.code}`);
  const hasError =
    detail.includes('Cannot convert undefined') ||
    detail.includes('Unfortunately') ||
    detail.includes('クラッシュ');
  const visible =
    detail.includes(stock.code) || stock.patterns.some((p) => detail.includes(p));
  sh('adb shell input keyevent 4', { allowFail: true });
  await sleep(800);
  return {
    code: stock.code,
    label: stock.label,
    ok: visible && !hasError,
    visible,
    hasError,
  };
}

async function verifyAllStocks() {
  const rows = [];
  for (const stock of STOCKS) {
    const row = await verifyStockDevice(stock);
    rows.push(row);
    appendTelemetry({ type: 'stock_verify', ...row, at: new Date().toISOString() });
    await sleep(1500);
  }
  return { rows, allOk: rows.every((r) => r.ok) };
}

async function runMaterialAnalysisRefresh(hourIndex) {
  const tag = `hour-${hourIndex}`;
  await ensureAppForeground();
  await tapTab('材料分析');
  await sleep(6000);
  let xml = dumpUi(`mat-${tag}-open`);
  const refreshBtn = findLabels(xml, (l) => l === '再取得');
  if (refreshBtn[0]) {
    tap(refreshBtn[0]);
    await sleep(8000);
  }
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    xml = dumpUi(`mat-${tag}-wait`);
    if (xml.includes('【銘柄別材料分析】') && !xml.includes('材料分析を取得中')) break;
    await sleep(4000);
  }
  const hasError = xml.includes('Cannot convert undefined');
  return { tag, ok: !hasError && !xml.includes('材料分析を取得中'), at: new Date().toISOString() };
}

async function runAiAnalysis(hourIndex) {
  const tag = `hour-${hourIndex}`;
  console.log(`[p12.5] AI analysis ${tag}`);
  const ok = await ensureAppForeground();
  if (!ok) {
    state.pidLostEvents += 1;
    return { tag, ok: false, error: 'app not running' };
  }

  const material = await runMaterialAnalysisRefresh(hourIndex);
  const totalHours = Math.max(1, Math.ceil(HOURS));
  let stockCheck;
  if (hourIndex === 0 || hourIndex >= totalHours) {
    stockCheck = await verifyAllStocks();
  } else {
    const stock = STOCKS[hourIndex % STOCKS.length];
    const row = await verifyStockDevice(stock);
    stockCheck = { rows: [row], allOk: row.ok, partial: true, rotated: stock.code };
  }

  const shotPath = path.join(OUT_DIR, `ai-${tag}.png`);
  sh(`adb shell screencap -p /sdcard/p125-ai.png`, { allowFail: true });
  sh(`adb pull /sdcard/p125-ai.png "${shotPath}"`, { allowFail: true });

  const result = {
    tag,
    ok: material.ok && (stockCheck.allOk || stockCheck.partial),
    material,
    stockCheck,
    at: new Date().toISOString(),
    screenshot: `docs/review/phase12-5-long-run/ai-${tag}.png`,
  };
  state.aiAnalysisRuns.push(result);
  state.stockChecks.push({ hour: hourIndex, ...stockCheck, at: result.at });
  appendTelemetry({ type: 'ai_analysis', ...result });
  return result;
}

function scanLogcatDelta() {
  const raw = sh('adb logcat -d', { allowFail: true });
  const fatal = (raw.match(/FATAL EXCEPTION/gi) ?? []).length;
  const anr = (raw.match(/ANR in /gi) ?? []).length;
  const rnType = (raw.match(/ReactNativeJS.*TypeError/gi) ?? []).length;
  const undef = (raw.match(/Cannot convert undefined value to object/gi) ?? []).length;
  state.crashes = { fatal, rnTypeError: rnType, undefined: undef };
  state.anrCount = anr;
  fs.writeFileSync(path.join(OUT_DIR, 'logcat-final.txt'), raw);
  return { fatal, anr, rnType, undef };
}

async function hourlySnapshot(hourIndex) {
  console.log(`[p12.5] hourly snapshot ${hourIndex}`);
  wakeDevice();
  const mem = sampleMemory(`hour-${String(hourIndex).padStart(2, '0')}`);
  const cpu = sampleCpu();
  const storage = sampleAsyncStorageKb();
  state.hourlyMemKb.push({ hour: hourIndex, kb: mem.kb, at: mem.at });
  state.cpuSamples.push({ hour: hourIndex, ...cpu });
  state.storageSamples.push({ hour: hourIndex, ...storage });
  appendTelemetry({ type: 'hourly', hour: hourIndex, mem, cpu, storage });
  saveCheckpoint();
  writeProgressReport('RUNNING');
  return { mem, cpu, storage };
}

function memoryLeakPass() {
  if (state.baselineMemKb == null || state.hourlyMemKb.length === 0) return false;
  const end = state.hourlyMemKb[state.hourlyMemKb.length - 1]?.kb;
  if (end == null) return false;
  const increase = (end - state.baselineMemKb) / state.baselineMemKb;
  return increase <= 0.2;
}

function stocksPass() {
  const passed = new Set();
  for (const check of state.stockChecks) {
    for (const row of check.rows ?? []) {
      if (row.ok) passed.add(row.code);
    }
  }
  return STOCKS.every((s) => passed.has(s.code));
}

function evaluatePass() {
  const crashFree = state.crashes.fatal === 0 && state.crashes.undefined === 0;
  const anrFree = state.anrCount === 0;
  const memOk = memoryLeakPass();
  const stocksOk = stocksPass();
  const pidOk = state.pidLostEvents === 0;
  return {
    overall: crashFree && anrFree && memOk && stocksOk && pidOk,
    crashFree,
    anrFree,
    memOk,
    stocksOk,
    pidOk,
    memIncreasePct:
      state.baselineMemKb && state.hourlyMemKb.length
        ? (
            ((state.hourlyMemKb[state.hourlyMemKb.length - 1].kb - state.baselineMemKb) /
              state.baselineMemKb) *
            100
          ).toFixed(1)
        : null,
  };
}

function writeProgressReport(status) {
  const eval_ = evaluatePass();
  const lines = [
    '# Phase12.5 Long Run Validation Report',
    '',
    `**ステータス:** ${status}`,
    `**開始:** ${state.startedAt ?? '—'}`,
    `**終了:** ${state.endedAt ?? '—'}`,
    `**計画時間:** ${HOURS} 時間`,
    `**実機:** Redmi (adb)`,
    '',
    status === 'COMPLETED'
      ? `## 総合判定: **${eval_.overall ? 'PASS' : 'FAIL'}**`
      : '## 総合判定: **進行中**',
    '',
    '### PASS条件',
    '',
    '| 条件 | 判定 | 結果 |',
    '|------|------|------|',
    `| クラッシュ0 | ${eval_.crashFree ? 'PASS' : status === 'RUNNING' ? '—' : 'FAIL'} | FATAL=${state.crashes.fatal}, undefined=${state.crashes.undefined} |`,
    `| ANR0 | ${eval_.anrFree ? 'PASS' : status === 'RUNNING' ? '—' : 'FAIL'} | ANR=${state.anrCount} |`,
    `| メモリ増加20%以内 | ${eval_.memOk ? 'PASS' : status === 'RUNNING' ? '—' : 'FAIL'} | ${eval_.memIncreasePct != null ? `+${eval_.memIncreasePct}%` : '—'} |`,
    `| 全銘柄正常表示 | ${eval_.stocksOk ? 'PASS' : status === 'RUNNING' ? '—' : 'FAIL'} | ${STOCKS.map((s) => s.code).join(', ')} — 各1回以上OK必要 |`,
    '',
    '### 検証銘柄',
    '',
    ...STOCKS.map((s) => `- ${s.code} ${s.label}`),
    '',
    '### 1時間ごとメモリ (KB)',
    '',
    '| Hour | TOTAL KB |',
    '|------|----------|',
    ...state.hourlyMemKb.map((h) => `| ${h.hour} | ${h.kb ?? '—'} |`),
    '',
    '### CPU使用率サンプル',
    '',
    '| Hour | CPU % |',
    '|------|-------|',
    ...state.cpuSamples.map((c) => `| ${c.hour} | ${c.percent ?? '—'} |`),
    '',
    '### AsyncStorageサイズ (KB)',
    '',
    '| Hour | RKStorage | App data total |',
    '|------|-----------|----------------|',
    ...state.storageSamples.map((s) => `| ${s.hour ?? '—'} | ${s.rkKb ?? '—'} | ${s.totalKb ?? '—'} |`),
    '',
    '### 実行回数',
    '',
    `- 株価更新 (15分毎): ${state.priceRefreshRuns.length} 回 (失敗 ${state.priceRefreshRuns.filter((r) => !r.ok).length})`,
    `- AI分析 (1時間毎): ${state.aiAnalysisRuns.length} 回 (失敗 ${state.aiAnalysisRuns.filter((r) => !r.ok).length})`,
    `- プロセス消失: ${state.pidLostEvents}`,
    '',
    '### エビデンス',
    '',
    '- `docs/review/phase12-5-long-run/telemetry.jsonl`',
    '- `docs/review/phase12-5-long-run/checkpoint.json`',
    '- `docs/review/phase12-5-long-run/logcat-final.txt`',
    '- `docs/review/phase12-5-long-run/meminfo-hour-*.txt`',
    '',
    '### 再実行',
    '',
    '```powershell',
    'npm run verify:phase12-5',
    '# または',
    'PHASE12_5_HOURS=12 node scripts/phase12-5-long-run.mjs',
    '```',
    '',
  ];
  fs.writeFileSync(REPORT_PATH, lines.join('\n'));
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (!adbOk()) {
    console.error('[p12.5] FAIL: adb device not found');
    process.exit(2);
  }

  try {
    sh('adb reverse tcp:8081 tcp:8081', { allowFail: true });
  } catch {
    /* ignore */
  }

  if (process.env.PHASE12_5_SMOKE === '1' && HOURS < 1) {
    await ensureAppForeground();
    const stockCheck = await verifyAllStocks();
    console.log(JSON.stringify(stockCheck, null, 2));
    process.exit(stockCheck.allOk ? 0 : 1);
  }

  state.startedAt = new Date().toISOString();
  sh('adb logcat -c', { allowFail: true });
  await ensureAppForeground();

  const baseline = sampleMemory('baseline');
  state.baselineMemKb = baseline.kb;
  state.hourlyMemKb.push({ hour: 0, kb: baseline.kb, at: baseline.at });
  state.cpuSamples.push({ hour: 0, ...sampleCpu() });
  state.storageSamples.push({ hour: 0, ...sampleAsyncStorageKb() });
  appendTelemetry({ type: 'start', baseline, hours: HOURS });
  spawnSync('npx tsx scripts/phase12-5-node-stocks.ts', {
    shell: true,
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  writeProgressReport('RUNNING');
  console.log(`[p12.5] Started — ${HOURS}h run, ends ~${new Date(Date.now() + DURATION_MS).toISOString()}`);

  const startMs = Date.now();
  let lastHour = 0;
  let lastPriceMs = startMs;

  await runAiAnalysis(0);
  await runPriceRefresh(0, 0);
  lastPriceMs = Date.now();

  while (Date.now() - startMs < DURATION_MS) {
    await sleep(TICK_MS);
    const elapsed = Date.now() - startMs;
    const hourIndex = Math.floor(elapsed / HOUR_MS);

    if (hourIndex > lastHour) {
      lastHour = hourIndex;
      await hourlySnapshot(hourIndex);
      await runAiAnalysis(hourIndex);
    }

    if (Date.now() - lastPriceMs >= PRICE_INTERVAL_MS) {
      const minuteIndex = Math.floor((elapsed % HOUR_MS) / (15 * 60 * 1000)) * 15;
      await runPriceRefresh(hourIndex, minuteIndex);
      lastPriceMs = Date.now();
    }

    const pid = sh(`adb shell pidof ${PKG}`, { allowFail: true }).trim();
    if (!pid) {
      state.pidLostEvents += 1;
      console.warn('[p12.5] pid lost — restarting app');
      await ensureAppForeground();
    }

    if (Math.floor(elapsed / 60000) % 10 === 0) {
      scanLogcatDelta();
      saveCheckpoint();
    }
  }

  state.endedAt = new Date().toISOString();
  scanLogcatDelta();
  spawnSync('npx tsx scripts/phase12-5-node-stocks.ts', {
    shell: true,
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const finalMem = sampleMemory('final');
  state.hourlyMemKb.push({ hour: 'final', kb: finalMem.kb, at: finalMem.at });

  saveCheckpoint();
  writeProgressReport('COMPLETED');

  const eval_ = evaluatePass();
  console.log(`[p12.5] COMPLETED — ${eval_.overall ? 'PASS' : 'FAIL'}`);
  console.log(`[p12.5] Report: ${REPORT_PATH}`);
  process.exit(eval_.overall ? 0 : 1);
}

main().catch((e) => {
  state.endedAt = new Date().toISOString();
  scanLogcatDelta();
  saveCheckpoint();
  writeProgressReport('FAILED');
  console.error('[p12.5] ERROR', e);
  process.exit(1);
});
