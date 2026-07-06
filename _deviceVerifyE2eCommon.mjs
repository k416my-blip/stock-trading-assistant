#!/usr/bin/env node
/** Shared Device Verify v44 E2E helpers (split scripts A–E). */
process.env.PYTHONIOENCODING = 'utf-8';

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  findTestId,
  parsePendingCountFromXml,
  parseCreateBlockReason,
  isCreateReady,
  TIDS,
  CREATE_READY,
  CREATE_BLOCKED_PREFIX,
} from './_deviceVerifyAdb.mjs';

export const SERIAL = process.env.ADB_SERIAL || 'FYRWXSNNAIOR9DCM';
export const ADB = `adb -s ${SERIAL}`;
export const PKG = 'com.assistant.stocktrading';
export const OUT = path.join('docs', 'review', 'device-verify-v44');
export const ARTIFACTS = path.join(OUT, 'rerun2-artifacts');
export const POST_TAP_MS = Number(process.env.POST_TAP_MS || 12000);
export const SKIP_PM_CLEAR = process.env.SKIP_PM_CLEAR === '1';

const jaHome = JSON.parse(fs.readFileSync('src/i18n/resources/ja/home.json', 'utf8'));
const jaSettings = JSON.parse(fs.readFileSync('src/i18n/resources/ja/settings.json', 'utf8'));
const jaPortfolio = JSON.parse(fs.readFileSync('src/i18n/resources/ja/portfolio.json', 'utf8'));

export const SECTION = jaHome.manualOrderEntry.sectionTitle;
export const CREATE = jaHome.manualOrderFlow.createList;
export const VIEW_LIST = jaHome.trust.viewList;
export const OK_BTN = jaHome.trust.ok;
export const LIST_TITLE = jaPortfolio.sell.manualOrderList;
export const JA_LABEL = '\u65e5\u672c\u8a9e';
export const TRUST_LABEL = 'AI\u4fe1\u8a17\u30e2\u30fc\u30c9';
export const PRACTICE_BLOCKED_TEXT = jaHome.manualOrderFlow.practiceBlockedBody;

export const FLOWS = [
  { key: 'concierge_full', home: jaHome.manualOrderEntry.conciergeFull.title, title: jaHome.manualOrderFlow.conciergeFull.title },
  { key: 'manual_full', home: jaHome.manualOrderEntry.manualFull.title, title: jaHome.manualOrderFlow.manualFull.title },
  { key: 'concierge_symbol', home: jaHome.manualOrderEntry.conciergeSymbol.title, title: jaHome.manualOrderFlow.conciergeSymbol.title },
  { key: 'concierge_quantity', home: jaHome.manualOrderEntry.conciergeQuantity.title, title: jaHome.manualOrderFlow.conciergeQuantity.title },
];

export const UX_MODES = [
  { key: 'standard', label: jaSettings.displayMode.modes.standard.label },
  { key: 'pro', label: jaSettings.displayMode.modes.pro.label },
  { key: 'beginner', label: jaSettings.displayMode.modes.beginner.label },
];

export const sh = (c) => execSync(c, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }).trim();
export const adb = (a) => sh(`${ADB} shell ${a}`);

export function loadResults(file) {
  if (fs.existsSync(file)) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {}
  }
  return { meta: {}, results: [] };
}

export function saveResults(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

export function createRecorder(results) {
  return (id, status, detail, evidence = []) => {
    results.push({ id, status, detail, evidence });
    console.log(status, id, detail);
  };
}

export async function dump(ctx, name) {
  const dest = path.join(OUT, `${name}.xml`);
  for (let i = 0; i < 6; i++) {
    try {
      adb('uiautomator dump /sdcard/ui-rerun2.xml');
      sh(`${ADB} exec-out cat /sdcard/ui-rerun2.xml > "${dest}"`);
      const xml = fs.readFileSync(dest, 'utf8');
      if (xml.includes('<hierarchy') && xml.length > 200) return xml;
    } catch {}
    await sleep(900);
  }
  return '';
}

export function shot(name) {
  fs.mkdirSync(OUT, { recursive: true });
  sh(`${ADB} exec-out screencap -p > "${path.join(OUT, name + '.png')}"`);
}

export function texts(xml) {
  const s = new Set();
  let m;
  const re = /(?:text|content-desc)="([^"]*)"/g;
  while ((m = re.exec(xml))) if (m[1]) s.add(m[1]);
  return s;
}

export function find(xml, pred) {
  const out = [];
  const re = /(?:text|content-desc)="([^"]*)"/g;
  let m;
  while ((m = re.exec(xml))) {
    const label = m[1];
    if (!pred(label)) continue;
    const b = xml.slice(m.index, m.index + 500).match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    if (!b) continue;
    out.push({ label, cx: Math.floor((+b[1] + +b[3]) / 2), cy: Math.floor((+b[2] + +b[4]) / 2) });
  }
  return out;
}

export function tap(it) {
  console.log('TAP', (it.label || String(it)).slice(0, 48));
  adb(`input tap ${it.cx} ${it.cy}`);
}

export function edits(xml) {
  const out = [];
  for (const chunk of xml.split('<node')) {
    if (!chunk.includes('EditText')) continue;
    const b = chunk.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    if (b) out.push({ cx: Math.floor((+b[1] + +b[3]) / 2), cy: Math.floor((+b[2] + +b[4]) / 2) });
  }
  return out.sort((a, b) => a.cy - b.cy);
}

export function currentActivity() {
  try {
    const w = adb('dumpsys window displays');
    const m = w.match(/mCurrentFocus=Window\{[^ ]+ u\d+ ([^/]+)\//);
    return m ? m[1] : 'unknown';
  } catch {
    return 'unknown';
  }
}

export function ensureAppForeground() {
  try {
    const act = currentActivity();
    if (!act.includes(PKG)) {
      adb(`am start -n ${PKG}/.MainActivity`);
    }
  } catch {
    // device may be temporarily unavailable
  }
}

export async function dismissSystemChrome(ctx) {
  for (let i = 0; i < 3; i++) {
    adb('input keyevent 4');
    await sleep(350);
  }
  adb('input keyevent 224');
  await sleep(400);
  ensureAppForeground();
  await dismissPermissionDialogs(ctx);
}

export async function saveFailureArtifacts(tag, reason) {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  const base = path.join(ARTIFACTS, tag);
  const xml = await dump({}, `${tag}-fail`);
  shot(`${tag}-fail`);
  const meta = {
    tag,
    reason,
    activity: currentActivity(),
    timestamp: new Date().toISOString(),
    texts: xml ? [...texts(xml)].slice(0, 40) : [],
  };
  fs.writeFileSync(`${base}.json`, JSON.stringify(meta, null, 2), 'utf8');
  return [`${tag}-fail.png`, `${tag}-fail.xml`, `rerun2-artifacts/${path.basename(base)}.json`];
}

export function findLanguageJa(xml) {
  return (
    findTestId(xml, TIDS.languageJa) ||
    findTestId(xml, TIDS.languageOption('ja')) ||
    findTestId(xml, TIDS.settingsLanguage('ja')) ||
    find(xml, (t) => t === JA_LABEL)[0]
  );
}

export function hasRedbox(xml) {
  const j = [...texts(xml)].join(' ');
  return j.includes('Unable to load script') || j.includes('loadJSBundle');
}

export async function ensureMetroLink() {
  sh(`${ADB} reverse tcp:8081 tcp:8081`);
  for (let i = 0; i < 15; i++) {
    try {
      const code = sh(
        'powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 http://127.0.0.1:8081/status).StatusCode } catch { 0 }"',
      );
      if (code === '200') return true;
    } catch {}
    await sleep(2000);
  }
  return false;
}

export async function dismissPermissionDialogs(ctx) {
  for (let i = 0; i < 8; i++) {
    const xml = await dump(ctx, `perm-${i}`);
    if (!xml) break;
    const allow = find(xml, (t) => t === '\u8a31\u53ef' || t === 'Allow')[0];
    if (!allow) break;
    tap(allow);
    await sleep(2000);
  }
}

export async function recoverFromRedbox(ctx) {
  sh(`${ADB} reverse tcp:8081 tcp:8081`);
  const xml = await dump(ctx, 'redbox');
  const reload = find(xml, (t) => t === 'RELOAD' || t.includes('RELOAD'))[0];
  if (reload) {
    tap(reload);
    await sleep(20000);
    return;
  }
  adb(`am force-stop ${PKG}`);
  await sleep(1500);
  adb(`am start -n ${PKG}/.MainActivity`);
  await sleep(20000);
}

export async function waitForUiHydration(ctx, prefix, maxSec = 180) {
  for (let i = 0; i < maxSec / 4; i++) {
    const xml = await dump(ctx, `${prefix}-hydrate-${i}`);
    if (!xml) {
      await sleep(4000);
      continue;
    }
    if (hasRedbox(xml)) {
      await recoverFromRedbox(ctx);
      continue;
    }
    await dismissPermissionDialogs(ctx);
    const tx = texts(xml);
    if (
      findLanguageJa(xml) ||
      findTestId(xml, TIDS.homeManualOrderSection) ||
      tx.size >= 8
    ) {
      return xml;
    }
    if (i > 0 && i % 8 === 0) {
      await ensureMetroLink();
      adb(`am start -n ${PKG}/.MainActivity`);
      await sleep(8000);
    }
    await sleep(4000);
  }
  return '';
}

export async function tapTab(ctx, label) {
  ensureAppForeground();
  await sleep(500);
  const xml = await dump(ctx, 'tab');
  for (const l of label === 'home'
    ? ['Home', '\u30db\u30fc\u30e0']
    : label === 'portfolio'
      ? ['\u4fdd\u6709\u9298\u67c4', 'Portfolio']
      : ['\u8a2d\u5b9a', 'Settings']) {
    const b = find(xml, (t) => t === l);
    if (b[0]) {
      tap(b[0]);
      await sleep(2000);
      return;
    }
  }
  const coords = { home: '101 2541', settings: '1118 2486', portfolio: '350 2486' };
  adb(`input tap ${coords[label]}`);
  await sleep(2000);
}

export async function dismissOnboarding(ctx) {
  for (let i = 0; i < 12; i++) {
    const xml = await dump(ctx, `onb-${i}`);
    if (!xml) continue;
    if (findTestId(xml, TIDS.homeManualOrderSection)) return true;
    if ([...texts(xml)].some((t) => t === SECTION)) return true;
    for (const l of [jaHome.onboarding.skip, jaHome.onboarding.next, jaHome.onboarding.startOnHome]) {
      const b = find(xml, (t) => t === l);
      if (b[0]) {
        tap(b[0]);
        await sleep(1200);
        break;
      }
    }
  }
  return false;
}

export async function scrollToHomeTop(ctx) {
  for (let i = 0; i < 4; i++) {
    adb('input swipe 540 650 540 1900 350');
    await sleep(280);
  }
}

export async function scrollToHomeSection(ctx, tag) {
  await scrollToHomeTop(ctx);
  for (let i = 0; i < 32; i++) {
    const xml = await dump(ctx, `${tag}-sec-${i}`);
    if (findTestId(xml, TIDS.homeManualOrderSection)) return true;
    adb('input swipe 540 1900 540 650 350');
    await sleep(450);
  }
  return false;
}

export async function tapHomeFlowButton(ctx, modeKey, tag) {
  await tapTab(ctx, 'home');
  await dismissOnboarding(ctx);
  await scrollToHomeSection(ctx, tag);
  for (let i = 0; i < 16; i++) {
    const xml = await dump(ctx, `${tag}-btn-${modeKey}-${i}`);
    const hit = findTestId(xml, TIDS.homeManualOrderButton(modeKey));
    if (hit) {
      tap(hit);
      return { ok: true, xml };
    }
    adb('input swipe 540 1600 540 900 280');
    await sleep(400);
  }
  const evidence = await saveFailureArtifacts(`${tag}-open-${modeKey}`, 'home button testID not found');
  return { ok: false, evidence };
}

export function countHomeButtonsInXml(xml) {
  let n = 0;
  for (const flow of FLOWS) {
    if (findTestId(xml, TIDS.homeManualOrderButton(flow.key))) n++;
  }
  return n;
}

export async function scrollHomeShots(ctx, prefix, record) {
  const seen = new Set();
  const shots = [];
  let max = 0;
  await tapTab(ctx, 'home');
  await dismissOnboarding(ctx);
  await scrollToHomeTop(ctx);
  await scrollToHomeSection(ctx, prefix);
  for (let i = 0; i < 28; i++) {
    const xml = await dump(ctx, `${prefix}-scroll-${i}`);
    for (const flow of FLOWS) {
      if (findTestId(xml, TIDS.homeManualOrderButton(flow.key))) seen.add(flow.key);
    }
    max = Math.max(max, seen.size, countHomeButtonsInXml(xml));
    if (max > 0) {
      const s = `${prefix}-found${max}-${i}`;
      shot(s);
      shots.push(`${s}.png`);
    }
    if (max >= 4) break;
    adb('input swipe 540 1600 540 900 280');
    await sleep(400);
  }
  const n = max;
  if (record) record(`${prefix}-four-buttons`, n === 4 ? 'PASS' : n > 0 ? 'PARTIAL' : 'FAIL', `${n}/4`, shots);
  return { n, shots };
}

export async function ensureHomeReady(ctx, prefix) {
  await tapTab(ctx, 'home');
  await dismissOnboarding(ctx);
  await sleep(1500);
  const { n } = await scrollHomeShots(ctx, `${prefix}-ensure`, null);
  return n >= 4;
}

export async function returnToHome(ctx) {
  for (let i = 0; i < 6; i++) {
    adb('input keyevent 4');
    await sleep(450);
  }
  await dismissPermissionDialogs(ctx);
  await tapTab(ctx, 'home');
  await dismissOnboarding(ctx);
}

export function readPendingFromStorage() {
  try {
    const key = '@sta/device_verify_pending_manual_order_count_v1';
    const sql = `SELECT value FROM catalystLocalStorage WHERE key='${key}'`;
    const out = sh(`${ADB} shell run-as ${PKG} sqlite3 databases/RKStorage "${sql}"`);
    if (!out) return null;
    const parsed = JSON.parse(out);
    return typeof parsed.count === 'number' ? parsed.count : null;
  } catch {
    return null;
  }
}

export function writeAsyncStorageValue(storageKey, value) {
  try {
    const val = JSON.stringify(value).replace(/'/g, "''");
    const key = storageKey.replace(/'/g, "''");
    const sql = `INSERT OR REPLACE INTO catalystLocalStorage (key, value) VALUES ('${key}', '${val}')`;
    sh(`${ADB} shell run-as ${PKG} sqlite3 databases/RKStorage "${sql}"`);
    return true;
  } catch {
    return false;
  }
}

/** Beginner UX hides Settings tab — seed standard mode before Test C/D/E settings navigation. */
export async function ensureStandardUxMode(ctx) {
  writeAsyncStorageValue('@sta/app_ux_mode_v1', 'standard');
  adb(`am force-stop ${PKG}`);
  await sleep(2500);
  adb(`am start -n ${PKG}/.MainActivity`);
  await waitForUiHydration(ctx, 'ux-std', 120);
  await dismissSystemChrome(ctx);
}

export function pendingFromXml(xml) {
  const probe = parsePendingCountFromXml(xml);
  if (probe != null) return probe;
  const j = [...texts(xml)].join('\n');
  const m = j.match(/\u672a\u5b8c\u4e86[（(](\d+)件[）)]/);
  return m ? Number(m[1]) : null;
}

export async function openManualOrderList(ctx, tag) {
  await tapTab(ctx, 'portfolio');
  for (let i = 0; i < 22; i++) {
    const xml = await dump(ctx, `${tag}-plist-${i}`);
    const b = find(xml, (t) => t === LIST_TITLE);
    if (b[0]) {
      tap(b[0]);
      await sleep(POST_TAP_MS);
      return true;
    }
    adb('input swipe 540 1900 540 650 350');
    await sleep(450);
  }
  return false;
}

export async function readPendingCountMandatory(ctx, tag) {
  const sources = [];
  if (await openManualOrderList(ctx, tag)) {
    for (let i = 0; i < 12; i++) {
      const xml = await dump(ctx, `${tag}-pc-${i}`);
      const c = pendingFromXml(xml);
      if (c != null) {
        sources.push('ui-probe');
        adb('input keyevent 4');
        await sleep(800);
        adb('input keyevent 4');
        await sleep(800);
        await tapTab(ctx, 'home');
        return { count: c, source: sources.join('+') };
      }
      await sleep(1200);
    }
    adb('input keyevent 4');
    await sleep(800);
  }
  const stored = readPendingFromStorage();
  if (stored != null) {
    await tapTab(ctx, 'home');
    return { count: stored, source: 'async-storage-probe' };
  }
  await tapTab(ctx, 'home');
  return { count: null, source: 'none' };
}

export async function enableLiveAnalysisMode(ctx, record, opts = {}) {
  if (!opts.alreadyOnSettings) {
    for (let i = 0; i < 4; i++) {
      adb('input keyevent 4');
      await sleep(350);
    }
    await tapTab(ctx, 'settings');
    await sleep(2000);
    adb('input swipe 540 650 540 1900 400');
    await sleep(600);
  } else {
    await sleep(800);
  }
  let opened = false;
  for (let i = 0; i < 60; i++) {
    const xml = await dump(ctx, `live-nav-${i}`);
    const hit =
      findTestId(xml, TIDS.settingsNavPracticeMode) ||
      find(xml, (t) =>
        t === '\u7df4\u7fd2\u30e2\u30fc\u30c9\u8a2d\u5b9a' ||
        t.includes('\u7df4\u7fd2\u30e2\u30fc\u30c9') ||
        t.includes('\u7df4\u7fd2') ||
        t.includes('Practice'))[0];
    if (hit) {
      tap(hit);
      await sleep(2500);
      opened = true;
      break;
    }
    if (findTestId(xml, TIDS.settingsNavAiStrategy)) {
      adb('input swipe 540 1600 540 900 280');
      await sleep(450);
      continue;
    }
    adb('input swipe 540 1900 540 650 350');
    await sleep(500);
  }
  if (!opened) {
    record('test-c-live-mode', 'FAIL', 'settings-nav-practice-mode not found', await saveFailureArtifacts('live-nav', 'practice nav missing'));
    adb('input keyevent 4');
    return false;
  }
  for (let i = 0; i < 12; i++) {
    const xml = await dump(ctx, `live-mode-${i}`);
    const liveHit =
      findTestId(xml, TIDS.appModeLiveAnalysis) ||
      find(xml, (t) => t === '\u5b9f\u904b\u7528\u5206\u6790\u30e2\u30fc\u30c9')[0];
    if (liveHit) {
      tap(liveHit);
      await sleep(2000);
      record('test-c-live-mode', 'PASS', 'app-mode-live-analysis selected', []);
      adb('input keyevent 4');
      await sleep(800);
      return true;
    }
    if (findTestId(xml, TIDS.appModePractice) || find(xml, (t) => t === '\u7df4\u7fd2\u30e2\u30fc\u30c9')[0]) {
      record('test-c-live-mode', 'PARTIAL', 'still on practice chip before tap', []);
    }
    await sleep(800);
  }
  record('test-c-live-mode', 'FAIL', 'app-mode-live-analysis not tappable', await saveFailureArtifacts('live-mode', 'live mode chip missing'));
  adb('input keyevent 4');
  return false;
}

export async function waitForCreateReady(ctx, modeKey, tag, record, maxSec = 30) {
  for (let i = 0; i < maxSec / 2; i++) {
    const xml = await dump(ctx, `${tag}-ready-${i}`);
    if (isCreateReady(xml)) return { ok: true, reason: null };
    const block = parseCreateBlockReason(xml);
    if (block && block !== 'practice') return { ok: false, reason: block };
    await sleep(2000);
  }
  return { ok: false, reason: 'timeout-create-ready-probe' };
}

export async function fillFlow(ctx, key) {
  const xml = await dump(ctx, `fill-${key}`);
  const e = edits(xml);
  const type = async (idx, val) => {
    if (!e[idx]) return;
    adb(`input tap ${e[idx].cx} ${e[idx].cy}`);
    await sleep(300);
    for (let i = 0; i < 6; i++) adb('input keyevent 67');
    adb(`input text ${val}`);
    await sleep(300);
  };
  if (key === 'concierge_full') await type(0, '2000');
  if (key === 'manual_full') {
    await type(0, '1155');
    await type(1, '100');
  }
  if (key === 'concierge_symbol') await type(0, '2000');
  if (key === 'concierge_quantity') {
    await type(0, '1155');
    await type(1, '2000');
  }
}

export async function tapCreate(ctx, tag, modeKey) {
  let xml = await dump(ctx, `${tag}-create-${modeKey}`);
  let hit = findTestId(xml, TIDS.manualOrderCreate(modeKey));
  if (!hit) {
    adb('input swipe 540 1600 540 800 300');
    await sleep(500);
    xml = await dump(ctx, `${tag}-create2-${modeKey}`);
    hit = findTestId(xml, TIDS.manualOrderCreate(modeKey));
  }
  if (!hit) {
    const b = find(xml, (t) => t === CREATE);
    if (b[0]) {
      tap(b[0]);
      return true;
    }
    return false;
  }
  tap(hit);
  return true;
}

const UX_MODE_LABELS = {
  beginner: '\u521d\u5fc3\u8005',
  standard: '\u6a19\u6e96',
  pro: '\u30d7\u30ed',
};

export async function setDisplayMode(ctx, modeKey) {
  await tapTab(ctx, 'settings');
  await dismissSystemChrome(ctx);
  await sleep(1000);
  const testId = TIDS.settingsUxMode(modeKey);
  const label = UX_MODE_LABELS[modeKey];
  for (let i = 0; i < 28; i++) {
    const xml = await dump(ctx, `ux-${modeKey}-${i}`);
    const hit =
      findTestId(xml, testId) ||
      find(xml, (t) => t === label || t.startsWith(label))[0];
    if (hit) {
      tap(hit);
      await sleep(2500);
      return true;
    }
    adb('input swipe 540 1900 540 650 350');
    await sleep(500);
  }
  return false;
}

export async function setTrustMode(ctx) {
  await tapTab(ctx, 'settings');
  await sleep(1500);
  for (let i = 0; i < 40; i++) {
    const xml = await dump(ctx, `trust-nav-${i}`);
    const hit = findTestId(xml, TIDS.settingsNavAiStrategy);
    if (hit) {
      tap(hit);
      await sleep(POST_TAP_MS);
      break;
    }
    adb('input swipe 540 1900 540 650 350');
    await sleep(550);
  }
  for (let i = 0; i < 45; i++) {
    const xml = await dump(ctx, `trust-pick-${i}`);
    const trustHit = findTestId(xml, TIDS.aiInvestmentMode('trust'));
    if (trustHit) {
      tap(trustHit);
      await sleep(2500);
      adb('input keyevent 4');
      await sleep(1000);
      adb('input keyevent 4');
      await sleep(1000);
      return true;
    }
    adb('input swipe 540 1900 540 650 350');
    await sleep(550);
  }
  adb('input keyevent 4');
  return false;
}

export function buildMeta() {
  let model = 'unknown';
  let versionCode = 'unknown';
  let adbDevices = '';
  try {
    model = adb('getprop ro.product.model');
  } catch {}
  try {
    versionCode = sh(`${ADB} shell dumpsys package ${PKG} | findstr versionCode`);
  } catch {}
  try {
    adbDevices = sh('adb devices');
  } catch {}
  return {
    serial: SERIAL,
    model,
    versionCode,
    adbDevices,
    timestamp: new Date().toISOString(),
  };
}

export function initContext() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  return {};
}

export async function prepareDevice(ctx) {
  const ok = await ensureMetroLink();
  if (!ok) throw new Error('Metro not reachable on :8081');
  sh(`${ADB} reverse tcp:8081 tcp:8081`);
  ensureAppForeground();
  await sleep(1500);
  adb('input keyevent 224');
}

export function resolveGit() {
  const paths = [
    process.env.STA_GIT_EXE,
    path.join(process.env.LOCALAPPDATA || '', 'MinGit', 'cmd', 'git.exe'),
    'C:\\Program Files\\Git\\cmd\\git.exe',
  ].filter(Boolean);
  for (const p of paths) {
    if (p.endsWith('.exe') && fs.existsSync(p)) return p;
  }
  try {
    return sh('where git').split(/\r?\n/)[0];
  } catch {
    return null;
  }
}

export function gitHash() {
  const git = resolveGit();
  try {
    if (git) return sh(`"${git}" rev-parse HEAD`);
  } catch {}
  try {
    const head = fs.readFileSync('.git/HEAD', 'utf8').trim();
    if (head.startsWith('ref: ')) return fs.readFileSync(path.join('.git', head.slice(5)), 'utf8').trim();
    return head;
  } catch {
    return 'unknown';
  }
}

export {
  findTestId,
  parsePendingCountFromXml,
  parseCreateBlockReason,
  isCreateReady,
  TIDS,
  CREATE_READY,
  CREATE_BLOCKED_PREFIX,
} from './_deviceVerifyAdb.mjs';
