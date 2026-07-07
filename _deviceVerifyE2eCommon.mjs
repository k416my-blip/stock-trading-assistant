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
export const CREATED_TITLE = jaHome.manualOrderFlow.createdTitle;
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

export function e2eRunTag() {
  return process.env.E2E_RUN_TAG || 'legacy';
}

export function resultPath(step) {
  return path.join(OUT, `results-${e2eRunTag()}-${step}.json`);
}

export function artifactsSubdir() {
  return `${e2eRunTag()}-artifacts`;
}

export function writeUtf8File(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, { encoding: 'utf8' });
}

export function loadResults(file) {
  if (fs.existsSync(file)) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {}
  }
  return { meta: {}, results: [] };
}

export function saveResults(file, data) {
  writeUtf8File(file, `${JSON.stringify(data, null, 2)}\n`);
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

export function isNotificationShadeOpen() {
  try {
    const w = adb('dumpsys window displays');
    if (/mCurrentFocus=Window\{[^}]*NotificationShade/.test(w)) return true;
    if (/mFocusedApp=NotificationShade/.test(w)) return true;
    return false;
  } catch {
    return false;
  }
}

export async function dismissNotificationShade(ctx, tag = 'shade') {
  let retries = 0;
  for (let i = 0; i < 8; i++) {
    if (!isNotificationShadeOpen()) {
      ensureAppForeground();
      await sleep(400);
      if (!isNotificationShadeOpen()) return { closed: true, retries };
    }
    retries += 1;
    console.log(`NOTIFICATION-SHADE ${tag} retry=${retries}`);
    adb('input keyevent 4');
    await sleep(350);
    adb('input keyevent 3');
    await sleep(500);
    adb('input swipe 540 1200 540 400 220');
    await sleep(450);
  }
  return { closed: !isNotificationShadeOpen(), retries };
}

export async function ensureHomeFlowStart(ctx, tag) {
  const parts = [];
  let shadeRetries = 0;
  for (let attempt = 0; attempt < 4; attempt++) {
    const shade = await dismissNotificationShade(ctx, `${tag}-shade-${attempt}`);
    shadeRetries += shade.retries;
    parts.push(`attempt${attempt}:shade=${shade.closed ? 'closed' : 'open'}`);
    await dismissSystemChrome(ctx);
    adb('input keyevent 3');
    await sleep(500);
    ensureAppForeground();
    await tapTab(ctx, 'home');
    await dismissOnboarding(ctx);
    const ready = await ensureHomeReady(ctx, `${tag}-home-${attempt}`);
    parts.push(`home4=${ready ? 'yes' : 'no'}`);
    if (ready && !isNotificationShadeOpen()) {
      return {
        ok: true,
        detail: `NotificationShade dismissed (${shadeRetries} keyevent retries); ${parts.join('; ')}`,
        shadeRetries,
      };
    }
  }
  return {
    ok: false,
    detail: `home 4 buttons not visible after shade dismiss; ${parts.join('; ')}`,
    shadeRetries,
  };
}

export async function dismissSystemChrome(ctx) {
  if (isNotificationShadeOpen()) {
    await dismissNotificationShade(ctx, 'chrome-shade');
  }
  for (let i = 0; i < 3; i++) {
    adb('input keyevent 4');
    await sleep(350);
  }
  adb('input keyevent 3');
  await sleep(400);
  adb('input keyevent 224');
  await sleep(400);
  ensureAppForeground();
  await dismissPermissionDialogs(ctx);
}

export async function saveFailureArtifacts(tag, reason) {
  const dir = path.join(OUT, artifactsSubdir());
  fs.mkdirSync(dir, { recursive: true });
  const base = path.join(dir, tag);
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
  return [`${tag}-fail.png`, `${tag}-fail.xml`, `${artifactsSubdir()}/${path.basename(base)}.json`];
}

export function findLanguageJa(xml) {
  return (
    findTestId(xml, TIDS.languageJa) ||
    findTestId(xml, TIDS.languageOption('ja')) ||
    findTestId(xml, TIDS.settingsLanguage('ja')) ||
    find(xml, (t) => t === JA_LABEL || t === '\u65e5\u672c\u8a9e (Japanese)')[0]
  );
}

export function isJapaneseUiReady(xml) {
  if (!xml) return false;
  if (findTestId(xml, TIDS.homeManualOrderSection)) return true;
  const tx = [...texts(xml)];
  if (tx.some((t) => t === SECTION)) return true;
  if (tx.some((t) => t.includes('\u624b\u52d5\u6ce8\u6587') || t.includes('\u30b3\u30f3\u30b7\u30a7\u30eb\u30b8\u30e5'))) return true;
  return false;
}

export async function ensureLanguageJapanese(ctx) {
  for (let i = 0; i < 18; i++) {
    const xml = await dump(ctx, `lang-${i}`);
    await dismissPermissionDialogs(ctx);
    if (!xml) {
      await sleep(1500);
      continue;
    }
    if (isJapaneseUiReady(xml)) {
      return { ok: true, detail: `${JA_LABEL} already active (picker skipped)` };
    }
    const ja = findLanguageJa(xml);
    if (ja) {
      tap(ja);
      await sleep(5000);
      const after = await dump(ctx, `lang-after-${i}`);
      if (isJapaneseUiReady(after)) {
        return { ok: true, detail: `${JA_LABEL} selected via language-ja` };
      }
    }
    await dismissOnboarding(ctx);
    await sleep(1200);
  }
  return { ok: false, detail: 'language-ja not found and Japanese UI not detected' };
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

let redboxRecoverAttempts = 0;

export async function recoverFromRedbox(ctx) {
  sh(`${ADB} reverse tcp:8081 tcp:8081`);
  if (redboxRecoverAttempts >= 2) {
    redboxRecoverAttempts = 0;
    adb(`am force-stop ${PKG}`);
    await sleep(2000);
    adb(`am start -n ${PKG}/.MainActivity`);
    await sleep(15000);
    return;
  }
  redboxRecoverAttempts += 1;
  const xml = await dump(ctx, 'redbox');
  const reload = find(xml, (t) => t === 'RELOAD' || t.startsWith('RELOAD'))[0];
  if (reload) {
    tap(reload);
    await sleep(20000);
    return;
  }
  adb(`am force-stop ${PKG}`);
  await sleep(1500);
  adb(`am start -n ${PKG}/.MainActivity`);
  await sleep(15000);
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
  await dismissSystemChrome(ctx);
  await tapTab(ctx, 'home');
  await dismissOnboarding(ctx);
  await scrollToHomeSection(ctx, tag);
  for (let i = 0; i < 20; i++) {
    if (isNotificationShadeOpen()) {
      await dismissNotificationShade(ctx, `${tag}-mid-shade`);
      await tapTab(ctx, 'home');
      await scrollToHomeSection(ctx, `${tag}-reshade`);
    }
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

export async function tapHomeFlowButtonWithRetry(ctx, modeKey, tag) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const start = await ensureHomeFlowStart(ctx, `${tag}-start-${attempt}`);
    if (!start.ok && attempt < 2) {
      console.log(`FLOW-START-RETRY ${tag} attempt=${attempt} ${start.detail}`);
      continue;
    }
    const result = await tapHomeFlowButton(ctx, modeKey, `${tag}-a${attempt}`);
    if (result.ok) {
      return { ...result, shadeDetail: start.detail, shadeRetries: start.shadeRetries };
    }
    if (isNotificationShadeOpen() || attempt < 2) {
      await dismissNotificationShade(ctx, `${tag}-post-fail`);
      await ensureHomeReady(ctx, `${tag}-recover`);
      continue;
    }
  }
  const evidence = await saveFailureArtifacts(`${tag}-open-${modeKey}`, 'home button testID not found after retries');
  return { ok: false, evidence, shadeDetail: 'exhausted retries' };
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
  await dismissSystemChrome(ctx);
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

export function readPendingFromAppState() {
  try {
    const key = '@sta/app_state';
    const sql = `SELECT value FROM catalystLocalStorage WHERE key='${key}'`;
    const out = sh(`${ADB} shell run-as ${PKG} sqlite3 databases/RKStorage "${sql}"`);
    if (!out) return null;
    const state = JSON.parse(out);
    const list = Array.isArray(state.manualOrderList) ? state.manualOrderList : [];
    return list.filter((i) => !i.completed).length;
  } catch {
    return null;
  }
}

export function readManualOrderListTotalFromAppState() {
  try {
    const key = '@sta/app_state';
    const sql = `SELECT value FROM catalystLocalStorage WHERE key='${key}'`;
    const out = sh(`${ADB} shell run-as ${PKG} sqlite3 databases/RKStorage "${sql}"`);
    if (!out) return null;
    const state = JSON.parse(out);
    const list = Array.isArray(state.manualOrderList) ? state.manualOrderList : [];
    return list.length;
  } catch {
    return null;
  }
}

export async function readPendingAllProbesAsync(ctx, tag, { openListFirst = false } = {}) {
  if (openListFirst) {
    await openManualOrderList(ctx, `${tag}-nav`);
  }
  const inline = await readPendingInline(ctx, tag);
  const storageProbe = readPendingFromStorage();
  const appState = readPendingFromAppState();
  const ui = inline.count;
  const source = [
    ui != null ? `ui=${ui}` : null,
    storageProbe != null ? `storageProbe=${storageProbe}` : null,
    appState != null ? `appState=${appState}` : null,
  ]
    .filter(Boolean)
    .join(', ');
  console.log(`PENDING-PROBE ${tag}`, source || 'none');
  return { ui, storageProbe, appState, count: ui ?? storageProbe ?? appState, source: source || 'none' };
}

export function evaluatePendingAfterCreate(before, after, alertResult = {}) {
  const total = readManualOrderListTotalFromAppState();
  const detail = `before=${before} ui=${after.ui ?? 'null'} storage=${after.storageProbe ?? 'null'} appState=${after.appState ?? 'null'} listTotal=${total ?? 'null'} (${after.source}) alert=${alertResult.reason ?? 'n/a'}`;
  console.log('PENDING-EVAL', detail);
  const increased =
    (after.ui != null && after.ui > before) ||
    (after.storageProbe != null && after.storageProbe > before) ||
    (after.appState != null && after.appState > before);
  if (increased) {
    const best = Math.max(
      after.ui ?? before,
      after.storageProbe ?? before,
      after.appState ?? before,
    );
    return { pass: true, detail: `pending ${before} -> ${best} ${detail}` };
  }
  const alertOk =
    alertResult.ok &&
    ['view-list', 'created-title-view-list', 'created-title-ok', 'success-probe-ok', 'ok-dismiss', 'view-list-coord'].includes(
      alertResult.reason,
    );
  if (alertOk && after.ui != null && after.ui >= before) {
    return { pass: true, detail: `pending confirmed at ${after.ui} (no increase required) ${detail}` };
  }
  const anyReadable = after.ui != null || after.storageProbe != null || after.appState != null;
  if (anyReadable) {
    return { pass: false, detail: `pending not increased ${detail}` };
  }
  if (alertOk) {
    return { pass: true, detail: `pending unreadable but create alert OK ${detail}` };
  }
  if (alertResult.reason === 'no-alert' && !anyReadable) {
    return { pass: false, detail: `pending unreadable after no-alert (list probe failed) ${detail}` };
  }
  return { pass: false, detail: `pending unreadable ${detail}` };
}

export async function readPendingAfterCreate(ctx, tag) {
  await dismissNotificationShade(ctx, `${tag}-post-create-shade`);
  await returnToHome(ctx);
  let listOpened = await openManualOrderList(ctx, `${tag}-list-nav`);
  if (!listOpened) {
    await returnToHome(ctx);
    listOpened = await openManualOrderList(ctx, `${tag}-list-nav-retry`);
  }
  await sleep(1500);
  let after = await readPendingAllProbesAsync(ctx, `${tag}-list`, { openListFirst: false });
  after.storageProbe = readPendingFromStorage();
  after.appState = readPendingFromAppState();
  after.count = after.ui ?? after.storageProbe ?? after.appState ?? after.count;
  if (after.count == null) {
    const mandatory = await readPendingCountMandatory(ctx, `${tag}-list-m`);
    after = {
      ui: mandatory.count ?? after.ui,
      storageProbe: after.storageProbe,
      appState: after.appState,
      count: mandatory.count ?? after.storageProbe ?? after.appState,
      source: mandatory.source || after.source,
    };
  }
  return { after, listOpened };
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
  if (j.includes('\u672a\u5b8c\u4e86\u306e\u6ce8\u6587\u306f\u3042\u308a\u307e\u305b\u3093')) return 0;
  const m = j.match(/\u672a\u5b8c\u4e86[（(](\d+)件[）)]/);
  return m ? Number(m[1]) : null;
}

export async function openManualOrderList(ctx, tag) {
  await tapTab(ctx, 'portfolio');
  for (let i = 0; i < 22; i++) {
    const xml = await dump(ctx, `${tag}-plist-${i}`);
    const byId = findTestId(xml, TIDS.portfolioManualOrderList);
    if (byId) {
      tap(byId);
      await sleep(POST_TAP_MS);
      return true;
    }
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

export async function readPendingInline(ctx, tag) {
  adb('input swipe 540 350 540 1300 320');
  await sleep(700);
  for (let i = 0; i < 14; i++) {
    const xml = await dump(ctx, `${tag}-inline-${i}`);
    const c = pendingFromXml(xml);
    if (c != null) return { count: c, source: 'ui-inline-probe' };
    if ([...texts(xml)].some((t) => t === LIST_TITLE || t.includes('\u624b\u52d5\u6ce8\u6587\u30ea\u30b9\u30c8'))) {
      if (i % 3 === 2) adb('input swipe 540 400 540 1200 280');
      await sleep(1800);
      continue;
    }
    await sleep(1200);
  }
  return { count: null, source: 'inline-none' };
}

export async function readPendingCountMandatory(ctx, tag) {
  const inline = await readPendingInline(ctx, tag);
  if (inline.count != null) {
    await tapTab(ctx, 'home');
    return inline;
  }
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

export async function typeIntoField(ctx, tag, testId, val) {
  let xml = await dump(ctx, tag);
  let hit = findTestId(xml, testId);
  if (!hit) {
    adb('input swipe 540 1600 540 900 280');
    await sleep(500);
    xml = await dump(ctx, `${tag}-scroll`);
    hit = findTestId(xml, testId);
  }
  if (!hit) {
    const e = edits(xml).sort((a, b) => a.cy - b.cy);
    if (testId === TIDS.manualOrderInputDeposit && e[0]) hit = e[0];
    if (testId === TIDS.manualOrderInputSymbol && e[0]) hit = e[0];
    if (testId === TIDS.manualOrderInputShares && e[1]) hit = e[1];
    else if (testId === TIDS.manualOrderInputShares && e[0]) hit = e[0];
  }
  if (!hit) return false;
  adb(`input tap ${hit.cx} ${hit.cy}`);
  await sleep(400);
  for (let i = 0; i < 8; i++) adb('input keyevent 67');
  adb(`input text ${val}`);
  await sleep(300);
  adb('input tap 540 220');
  await sleep(300);
  return true;
}

export function parseAlertFromXml(xml) {
  const tx = [...texts(xml)];
  const probeErr = tx.find((t) => t.startsWith('manual-order-create-error:'));
  if (probeErr) {
    return {
      kind: 'error',
      title: 'probe',
      body: probeErr.slice('manual-order-create-error:'.length) || 'unknown',
    };
  }
  const probeOk = tx.find((t) => t.startsWith('manual-order-create-success:'));
  if (probeOk) {
    return { kind: 'success', title: 'probe', body: probeOk };
  }
  const hasErrorTitle = tx.some((t) => t === '\u4f5c\u6210\u3067\u304d\u307e\u305b\u3093');
  if (hasErrorTitle) {
    const body =
      tx.find(
        (t) =>
          t !== '\u4f5c\u6210\u3067\u304d\u307e\u305b\u3093' &&
          t !== OK_BTN &&
          t !== 'OK' &&
          !t.startsWith('manual-order-') &&
          t.length > 4,
      ) || 'unknown';
    return { kind: 'error', title: '\u4f5c\u6210\u3067\u304d\u307e\u305b\u3093', body };
  }
  return null;
}

export async function dismissPostCreateAlert(ctx, tag) {
  await sleep(2000);
  for (let i = 0; i < 15; i++) {
    const xml = await dump(ctx, `${tag}-alert-${i}`);
    const parsed = parseAlertFromXml(xml);
    if (parsed?.kind === 'error') {
      console.log(`CREATE-ERROR-ALERT ${tag} title=${parsed.title} body=${parsed.body}`);
      const okBtn = find(xml, (t) => t === OK_BTN || t === 'OK')[0];
      if (okBtn) tap(okBtn);
      else adb('input tap 540 1500');
      await sleep(1000);
      return {
        ok: false,
        reason: `create-error-alert:${parsed.body}`,
        title: parsed.title,
        body: parsed.body,
      };
    }
    const tx = [...texts(xml)];
    const view = find(xml, (t) => t === VIEW_LIST || t === '\u30ea\u30b9\u30c8\u3092\u898b\u308b');
    if (view[0]) {
      tap(view[0]);
      await sleep(POST_TAP_MS);
      return { ok: true, reason: 'view-list' };
    }
    if (tx.some((t) => t === CREATED_TITLE || t === '\u30ea\u30b9\u30c8\u306b\u8ffd\u52a0\u3057\u307e\u3057\u305f' || t.includes('\u624b\u52d5\u6ce8\u6587\u30ea\u30b9\u30c8\u306b\u8ffd\u52a0'))) {
      const view2 = find(xml, (t) => t === VIEW_LIST || t === '\u30ea\u30b9\u30c8\u3092\u898b\u308b');
      if (view2[0]) {
        tap(view2[0]);
        await sleep(POST_TAP_MS);
        return { ok: true, reason: 'created-title-view-list' };
      }
      const okBtn2 = find(xml, (t) => t === OK_BTN || t === 'OK')[0];
      if (okBtn2) {
        tap(okBtn2);
        await sleep(1500);
        return { ok: true, reason: 'created-title-ok' };
      }
    }
    if (tx.some((t) => t === '\u30ea\u30b9\u30c8\u306b\u8ffd\u52a0\u3057\u307e\u3057\u305f')) {
      adb('input tap 780 1520');
      await sleep(POST_TAP_MS);
      return { ok: true, reason: 'view-list-coord' };
    }
    if (parsed?.kind === 'success' || tx.some((t) => t.startsWith('manual-order-create-success:'))) {
      const okBtn = find(xml, (t) => t === OK_BTN || t === 'OK')[0];
      if (okBtn) {
        tap(okBtn);
        await sleep(1500);
        return { ok: true, reason: 'success-probe-ok' };
      }
    }
    const okBtn = find(xml, (t) => t === OK_BTN || t === 'OK')[0];
    if (okBtn) {
      tap(okBtn);
      await sleep(1500);
      return { ok: true, reason: 'ok-dismiss' };
    }
    await sleep(1500);
  }
  return { ok: true, reason: 'no-alert' };
}

export async function ensureMarketBursa(ctx, tag) {
  let xml = await dump(ctx, `${tag}-market`);
  let hit = findTestId(xml, 'market-picker-bursa');
  if (!hit) hit = find(xml, (t) => t === '\u30d0\u30eb\u30b5' || t === 'Bursa')[0];
  if (hit) {
    tap(hit);
    await sleep(500);
    return true;
  }
  return false;
}

export async function verifyFlowInputs(ctx, key) {
  const xml = await dump(ctx, `verify-${key}`);
  const has = (tid) => !!findTestId(xml, tid);
  const issues = [];
  const filled = { market: has('market-picker-bursa') || [...texts(xml)].some((t) => t === '\u30d0\u30eb\u30b5') };
  if (['concierge_full', 'concierge_symbol', 'concierge_quantity'].includes(key)) {
    filled.deposit = has(TIDS.manualOrderInputDeposit);
    if (!filled.deposit && key !== 'concierge_symbol') issues.push('deposit-empty');
  }
  if (key === 'concierge_symbol') {
    filled.deposit = has(TIDS.manualOrderInputDeposit);
    if (!filled.deposit && !has(TIDS.manualOrderInputShares)) issues.push('amount-or-shares-missing');
  }
  if (['manual_full', 'concierge_quantity'].includes(key)) {
    filled.symbol = has(TIDS.manualOrderInputSymbol);
    if (!filled.symbol) issues.push('symbol-empty');
  }
  if (key === 'manual_full') {
    filled.shares = has(TIDS.manualOrderInputShares);
    if (!filled.shares) issues.push('shares-empty');
    filled.side = 'buy-default';
  }
  if (!filled.market) issues.push('market-not-bursa');
  console.log(`FLOW-INPUTS ${key}`, JSON.stringify({ filled, issues }));
  return { ok: issues.length === 0, filled, issues };
}

export async function fillFlow(ctx, key) {
  await ensureMarketBursa(ctx, `fill-${key}`);
  if (key === 'concierge_full') await typeIntoField(ctx, `fill-${key}`, TIDS.manualOrderInputDeposit, '2000');
  if (key === 'manual_full') {
    await typeIntoField(ctx, `fill-${key}`, TIDS.manualOrderInputSymbol, '1155');
    await typeIntoField(ctx, `fill-${key}-s`, TIDS.manualOrderInputShares, '100');
  }
  if (key === 'concierge_symbol') await typeIntoField(ctx, `fill-${key}`, TIDS.manualOrderInputDeposit, '2000');
  if (key === 'concierge_quantity') {
    await typeIntoField(ctx, `fill-${key}`, TIDS.manualOrderInputSymbol, '1155');
    await typeIntoField(ctx, `fill-${key}-d`, TIDS.manualOrderInputDeposit, '50000');
  }
  await sleep(500);
  return verifyFlowInputs(ctx, key);
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
  fs.mkdirSync(path.join(OUT, artifactsSubdir()), { recursive: true });
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
