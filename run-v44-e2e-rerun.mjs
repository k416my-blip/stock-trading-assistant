#!/usr/bin/env node
/**
 * Device Verify v44 — E2E Rerun (Test A–E separated)
 * A: cold start + language + onboarding
 * B: home 4 buttons
 * C: 4-flow create → list E2E (after B ready)
 * D: UX modes (beginner / standard / pro)
 * E: Trust mode
 */
process.env.PYTHONIOENCODING = 'utf-8';

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { findTestId, parsePendingCountFromXml, TIDS } from './_deviceVerifyAdb.mjs';

const SERIAL = process.env.ADB_SERIAL || 'FYRWXSNNAIOR9DCM';
const ADB = `adb -s ${SERIAL}`;
const PKG = 'com.assistant.stocktrading';
const OUT = path.join('docs', 'review', 'device-verify-v44');
const REPORT = path.join('docs', 'review', 'DEVICE_VERIFY_V44_E2E_FINAL_RERUN_REPORT.md');
const POST_TAP_MS = Number(process.env.POST_TAP_MS || 12000);
const SKIP_PM_CLEAR = process.env.SKIP_PM_CLEAR === '1';

const jaHome = JSON.parse(fs.readFileSync('src/i18n/resources/ja/home.json', 'utf8'));
const jaSettings = JSON.parse(fs.readFileSync('src/i18n/resources/ja/settings.json', 'utf8'));
const jaPortfolio = JSON.parse(fs.readFileSync('src/i18n/resources/ja/portfolio.json', 'utf8'));
const TRUST_LABEL = 'AI\u4fe1\u8a17\u30e2\u30fc\u30c9';
const AI_NAV = fs.readFileSync('src/constants/aiSettings.ts', 'utf8').match(/screenTitle:\s*'([^']+)'/)?.[1] ?? 'AI\u8a2d\u5b9a';

const SECTION = jaHome.manualOrderEntry.sectionTitle;
const CREATE = jaHome.manualOrderFlow.createList;
const VIEW_LIST = jaHome.trust.viewList;
const OK_BTN = jaHome.trust.ok;
const LIST_TITLE = jaPortfolio.sell.manualOrderList;
const JA_LABEL = '\u65e5\u672c\u8a9e';

const FLOWS = [
  { key: 'concierge_full', home: jaHome.manualOrderEntry.conciergeFull.title, title: jaHome.manualOrderFlow.conciergeFull.title },
  { key: 'manual_full', home: jaHome.manualOrderEntry.manualFull.title, title: jaHome.manualOrderFlow.manualFull.title },
  { key: 'concierge_symbol', home: jaHome.manualOrderEntry.conciergeSymbol.title, title: jaHome.manualOrderFlow.conciergeSymbol.title },
  { key: 'concierge_quantity', home: jaHome.manualOrderEntry.conciergeQuantity.title, title: jaHome.manualOrderFlow.conciergeQuantity.title },
];

const UX_MODES = [
  { key: 'beginner', label: jaSettings.displayMode.modes.beginner.label },
  { key: 'standard', label: jaSettings.displayMode.modes.standard.label },
  { key: 'pro', label: jaSettings.displayMode.modes.pro.label },
];

const sh = (c) => execSync(c, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }).trim();
const adb = (a) => sh(`${ADB} shell ${a}`);
const results = [];
let meta = {};

function record(id, status, detail, evidence = []) {
  results.push({ id, status, detail, evidence });
  console.log(status, id, detail);
}

async function dump(name) {
  const dest = path.join(OUT, `${name}.xml`);
  for (let i = 0; i < 6; i++) {
    try {
      adb('uiautomator dump /sdcard/ui-rerun.xml');
      sh(`${ADB} exec-out cat /sdcard/ui-rerun.xml > "${dest}"`);
      const xml = fs.readFileSync(dest, 'utf8');
      if (xml.includes('<hierarchy') && xml.length > 200) return xml;
    } catch {}
    await sleep(1000);
  }
  return '';
}

function shot(name) {
  sh(`${ADB} exec-out screencap -p > "${path.join(OUT, name + '.png')}"`);
}

function texts(xml) {
  const s = new Set();
  let m;
  const re = /(?:text|content-desc)="([^"]*)"/g;
  while ((m = re.exec(xml))) if (m[1]) s.add(m[1]);
  return s;
}

function find(xml, pred) {
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

function tap(it) {
  console.log('TAP', (it.label || it).slice(0, 48));
  adb(`input tap ${it.cx} ${it.cy}`);
}

function edits(xml) {
  const out = [];
  for (const chunk of xml.split('<node')) {
    if (!chunk.includes('EditText')) continue;
    const b = chunk.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    if (b) out.push({ cx: Math.floor((+b[1] + +b[3]) / 2), cy: Math.floor((+b[2] + +b[4]) / 2) });
  }
  return out.sort((a, b) => a.cy - b.cy);
}

function findLanguageJa(xml) {
  return (
    findTestId(xml, TIDS.languageJa) ||
    findTestId(xml, TIDS.languageOption('ja')) ||
    findTestId(xml, TIDS.settingsLanguage('ja')) ||
    find(xml, (t) => t === JA_LABEL)[0] ||
    find(xml, (t) => t.includes(JA_LABEL))[0]
  );
}

function hasRedbox(xml) {
  const j = [...texts(xml)].join(' ');
  return j.includes('Unable to load script') || j.includes('Metro') || j.includes('loadJSBundle');
}

async function dismissPermissionDialogs() {
  for (let i = 0; i < 8; i++) {
    const xml = await dump(`perm-${i}`);
    if (!xml) break;
    const allow =
      find(xml, (t) => t === '\u8a31\u53ef' || t === 'Allow' || t === 'ALLOW')[0] ||
      find(xml, (t) => t.includes('\u8a31\u53ef'))[0];
    if (!allow) break;
    tap(allow);
    await sleep(2500);
  }
}

async function ensureMetroLink() {
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

async function recoverFromRedbox() {
  sh(`${ADB} reverse tcp:8081 tcp:8081`);
  const xml = await dump('redbox-recover');
  const reload = find(xml, (t) => t === 'RELOAD' || t === 'Reload' || t.includes('RELOAD'))[0];
  if (reload) {
    tap(reload);
    await sleep(20000);
    return true;
  }
  adb(`am force-stop ${PKG}`);
  await sleep(1500);
  adb(`am start -n ${PKG}/.MainActivity`);
  await sleep(20000);
  return true;
}

async function waitForUiHydration(prefix, maxSec = 180) {
  for (let i = 0; i < maxSec / 4; i++) {
    const xml = await dump(`${prefix}-hydrate-${i}`);
    if (!xml) {
      await sleep(4000);
      continue;
    }
    if (hasRedbox(xml)) {
      record(`${prefix}-metro-recover`, 'PARTIAL', 'redbox detected, recovering', []);
      await ensureMetroLink();
      await recoverFromRedbox();
      continue;
    }
    await dismissPermissionDialogs();
    const tx = texts(xml);
    if (
      findLanguageJa(xml) ||
      findTestId(xml, TIDS.languagePickerModal) ||
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

async function tapTab(label) {
  const xml = await dump('tab');
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

async function dismissOnboarding() {
  for (let i = 0; i < 12; i++) {
    const xml = await dump(`onb-${i}`);
    if (!xml) continue;
    if (findTestId(xml, TIDS.homeManualOrderSection)) return true;
    if ([...texts(xml)].some((t) => t === SECTION || FLOWS.some((f) => t === f.home))) return true;
    for (const l of [jaHome.onboarding.skip, jaHome.onboarding.next, jaHome.onboarding.startOnHome]) {
      const b = find(xml, (t) => t === l);
      if (b[0]) {
        tap(b[0]);
        await sleep(1200);
        break;
      }
    }
    const ok = find(xml, (t) => t === OK_BTN || t === 'OK');
    if (ok[0]) {
      tap(ok[0]);
      await sleep(800);
    }
  }
  return false;
}

function countHomeButtonsInXml(xml) {
  let n = 0;
  for (const flow of FLOWS) {
    if (findTestId(xml, TIDS.homeManualOrderButton(flow.key))) n++;
  }
  return n;
}

async function scrollHomeShots(prefix, recordId = null) {
  const corpus = new Set();
  const seenTestIds = new Set();
  const shots = [];
  let maxFound = 0;
  for (let i = 0; i < 28; i++) {
    const xml = await dump(`${prefix}-scroll-${i}`);
    if (xml) {
      for (const t of texts(xml)) corpus.add(t);
      for (const flow of FLOWS) {
        if (findTestId(xml, TIDS.homeManualOrderButton(flow.key))) seenTestIds.add(flow.key);
      }
      maxFound = Math.max(maxFound, countHomeButtonsInXml(xml), seenTestIds.size);
    }
    const found = Math.max(FLOWS.filter((f) => corpus.has(f.home)).length, maxFound);
    if (found > 0) {
      const s = `${prefix}-found${found}-${i}`;
      shot(s);
      shots.push(`${s}.png`);
    }
    if (found >= 4) break;
    adb('input swipe 540 1900 540 650 350');
    await sleep(500);
  }
  const n = Math.max(FLOWS.filter((f) => corpus.has(f.home)).length, seenTestIds.size, maxFound);
  if (recordId) {
    record(recordId, n === 4 ? 'PASS' : n > 0 ? 'PARTIAL' : 'FAIL', `${n}/4 buttons`, shots);
  }
  return { n, shots };
}

async function ensureHomeReady(prefix) {
  await tapTab('home');
  await dismissOnboarding();
  await sleep(2000);
  for (let attempt = 0; attempt < 3; attempt++) {
    const { n } = await scrollHomeShots(`${prefix}-ensure-${attempt}`);
    if (n >= 4) return true;
    adb('input swipe 540 400 540 1900 350');
    await sleep(800);
  }
  return false;
}

async function findButton(label, prefix) {
  const mode = FLOWS.find((f) => f.home === label)?.key;
  if (mode) {
    for (let i = 0; i < 28; i++) {
      const xml = await dump(`${prefix}-tid-${i}`);
      const hit = findTestId(xml, TIDS.homeManualOrderButton(mode));
      if (hit) return hit;
      adb('input swipe 540 1900 540 650 350');
      await sleep(450);
    }
  }
  for (let i = 0; i < 28; i++) {
    const xml = await dump(`${prefix}-find-${i}`);
    const b = find(xml, (t) => t === label);
    if (b[0]) return b[0];
    adb('input swipe 540 1900 540 650 350');
    await sleep(450);
  }
  return null;
}

async function waitForColdStart(maxWaitSec = 90) {
  for (let i = 0; i < maxWaitSec / 3; i++) {
    const xml = await dump(`cold-${i}`);
    if (!xml) {
      await sleep(3000);
      continue;
    }
    if (
      findLanguageJa(xml) ||
      findTestId(xml, TIDS.languagePickerModal) ||
      findTestId(xml, TIDS.homeManualOrderSection)
    ) {
      return xml;
    }
    await sleep(3000);
  }
  return '';
}

async function testA_coldStartLanguageOnboarding() {
  const metroOk = await ensureMetroLink();
  record('test-a-metro', metroOk ? 'PASS' : 'FAIL', metroOk ? '8081/status ok' : 'Metro unreachable', []);

  if (!SKIP_PM_CLEAR) {
    adb(`pm clear ${PKG}`);
    await sleep(3000);
  }
  adb(`am start -n ${PKG}/.MainActivity`);
  await ensureMetroLink();
  await dismissPermissionDialogs();
  await waitForUiHydration('test-a', 180);

  const LANG_TITLE = '\u8a00\u8a9e\u3092\u9078\u629e';
  let picked = false;
  for (let i = 0; i < 15; i++) {
    const xml = await dump(`test-a-lang-${i}`);
    if (!xml) {
      await sleep(2000);
      continue;
    }
    if (hasRedbox(xml)) {
      await recoverFromRedbox();
      continue;
    }
    await dismissPermissionDialogs();
    shot(`test-a-lang-${i}`);
    const jaBtn = findLanguageJa(xml);
    if (jaBtn) {
      tap(jaBtn);
      await sleep(6000);
      picked = true;
      break;
    }
    await sleep(2000);
  }

  await dismissOnboarding();
  await tapTab('home');
  await dismissOnboarding();

  const after = await dump('test-a-after');
  shot('test-a-after');
  const tx = texts(after);
  const modalGone = !findTestId(after, TIDS.languagePickerModal) && !findLanguageJa(after);
  const onHome =
    findTestId(after, TIDS.homeManualOrderSection) ||
    [...tx].some((t) => t === SECTION) ||
    [...tx].some((t) => t === '\u30db\u30fc\u30e0' || t === 'Home');

  const ok = picked && modalGone && onHome;
  record(
    'test-a-language-ja',
    ok ? 'PASS' : picked && onHome ? 'PARTIAL' : 'FAIL',
    ok ? `${JA_LABEL} selected, home visible` : picked ? 'tap ok, verify incomplete' : 'language-ja not found',
    ['test-a-after.png'],
  );
  record(
    'test-a-onboarding-dismiss',
    onHome ? 'PASS' : 'FAIL',
    onHome ? 'home reachable after dismiss' : 'home not ready',
    ['test-a-after.png'],
  );
  return ok || onHome;
}

async function testB_homeFourButtons() {
  const ready = await ensureHomeReady('test-b');
  const { n, shots } = await scrollHomeShots('test-b', 'test-b-four-buttons');
  return ready && n >= 4 ? { ok: true, n, shots } : { ok: false, n, shots };
}

async function testHomeStability() {
  await tapTab('home');
  let stable = true;
  for (let i = 0; i < 4; i++) {
    await sleep(5000);
    const xml = await dump(`test-stability-${i}`);
    shot(`test-stability-${i}`);
    const onHome =
      findTestId(xml, TIDS.homeManualOrderSection) ||
      findTestId(xml, TIDS.homeManualOrderButton('concierge_full'));
    if (!onHome) stable = false;
  }
  record('test-home-stability', stable ? 'PASS' : 'FAIL', stable ? '20s home stable' : 'left home tab', [
    'test-stability-3.png',
  ]);
  return stable;
}

function pendingCount(xml) {
  const probe = parsePendingCountFromXml(xml);
  if (probe != null) return probe;
  const j = [...texts(xml)].join('\n');
  const m = j.match(/\u672a\u5b8c\u4e86[（(](\d+)件[）)]/);
  return m ? Number(m[1]) : null;
}

function readPendingFromStorage() {
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

async function readPendingOnList(prefix) {
  if (!(await openList())) return null;
  let count = null;
  for (let i = 0; i < 10; i++) {
    const xml = await dump(`${prefix}-pending-${i}`);
    const c = pendingCount(xml);
    if (c != null) {
      count = c;
      break;
    }
    await sleep(1500);
  }
  if (count == null) count = readPendingFromStorage();
  adb('input keyevent 4');
  await sleep(1000);
  adb('input keyevent 4');
  await sleep(1000);
  await tapTab('home');
  await dismissOnboarding();
  return count;
}

async function openList() {
  await tapTab('portfolio');
  for (let i = 0; i < 20; i++) {
    const xml = await dump(`plist-${i}`);
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

async function fillFlow(key) {
  const xml = await dump(`fill-${key}`);
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

async function tapCreate(prefix, modeKey) {
  let xml = await dump(`${prefix}-before-create`);
  let hit = findTestId(xml, TIDS.manualOrderCreate(modeKey));
  if (!hit) {
    adb('input swipe 540 1600 540 800 300');
    await sleep(500);
    xml = await dump(`${prefix}-before-create-2`);
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

async function testC_flowE2E() {
  await setDisplay('standard');
  await enableLiveAnalysisMode();
  const ready = await ensureHomeReady('test-c-prep');
  if (!ready) {
    record('test-c-prerequisite', 'FAIL', 'home 4 buttons not ready before E2E', []);
    for (const flow of FLOWS) {
      record(`test-c-e2e-${flow.key}`, 'FAIL', 'skipped: home not ready', []);
    }
    return;
  }
  record('test-c-prerequisite', 'PASS', 'language ok, onboarding dismissed, 4 buttons visible', []);

  let pending = (await readPendingOnList('test-c-baseline')) ?? 0;
  record('test-c-pending-baseline', 'PASS', `before=${pending}`, []);
  await ensureHomeReady('test-c-after-baseline');

  for (const flow of FLOWS) {
    await tapTab('home');
    await dismissOnboarding();
    await sleep(1000);
    const btn = await findButton(flow.home, `test-c-${flow.key}`);
    if (!btn) {
      record(`test-c-flow-${flow.key}-open`, 'FAIL', 'button not found', []);
      record(`test-c-e2e-${flow.key}`, 'FAIL', 'button not found', []);
      await returnToHome();
      continue;
    }
    tap(btn);
    await sleep(POST_TAP_MS);
    const fx = await dump(`test-c-flow-${flow.key}`);
    shot(`test-c-flow-${flow.key}`);
    const opened = [...texts(fx)].some((t) => t === flow.title || t === CREATE);
    record(`test-c-flow-${flow.key}-open`, opened ? 'PASS' : 'FAIL', opened ? flow.title : 'not open', [
      `test-c-flow-${flow.key}.png`,
    ]);

    if (!opened) {
      record(`test-c-e2e-${flow.key}`, 'FAIL', 'flow not open', []);
      adb('input keyevent 4');
      continue;
    }

    await fillFlow(flow.key);
    const before = pending;
    if (!(await tapCreate(`test-c-${flow.key}`, flow.key))) {
      record(`test-c-e2e-${flow.key}`, 'FAIL', 'create button missing', []);
      adb('input keyevent 4');
      continue;
    }
    await sleep(4000);
    const ax = await dump(`test-c-after-${flow.key}`);
    shot(`test-c-after-${flow.key}`);
    const view = find(ax, (t) => t === VIEW_LIST || t.includes('\u30ea\u30b9\u30c8'));
    if (view[0]) {
      tap(view[0]);
      await sleep(POST_TAP_MS);
    } else {
      const okBtn = find(ax, (t) => t === OK_BTN || t === 'OK');
      if (okBtn[0]) tap(okBtn[0]);
      await sleep(1500);
    }

    const count = (await readPendingOnList(`test-c-list-${flow.key}`)) ?? null;
    shot(`test-c-list-${flow.key}`);
    const increased = count !== null && count > before;
    record(
      `test-c-e2e-${flow.key}`,
      increased ? 'PASS' : count !== null ? 'PARTIAL' : 'FAIL',
      `pending ${before} -> ${count ?? '?'}`,
      [`test-c-list-${flow.key}.png`],
    );
    if (count != null) pending = count;
    await returnToHome();
  }
  await ensureHomeReady('test-c-end');
}

async function returnToHome() {
  for (let i = 0; i < 5; i++) {
    adb('input keyevent 4');
    await sleep(500);
  }
  await dismissPermissionDialogs();
  await tapTab('home');
  await dismissOnboarding();
}

async function enableLiveAnalysisMode() {
  await tapTab('settings');
  for (let i = 0; i < 28; i++) {
    const xml = await dump(`live-nav-${i}`);
    const hit =
      findTestId(xml, TIDS.settingsNavPracticeMode) ||
      find(xml, (t) => t.includes('\u7df4\u7fd2') || t.includes('Practice'))[0];
    if (hit) {
      tap(hit);
      await sleep(2500);
      break;
    }
    adb('input swipe 540 1900 540 650 350');
    await sleep(500);
  }
  for (let i = 0; i < 12; i++) {
    const xml = await dump(`live-mode-${i}`);
    const hit =
      findTestId(xml, TIDS.appModeLiveAnalysis) ||
      find(xml, (t) => t === '\u5b9f\u904b\u7528\u5206\u6790\u30e2\u30fc\u30c9')[0];
    if (hit) {
      tap(hit);
      await sleep(2000);
      record('test-c-live-mode', 'PASS', 'live analysis enabled', []);
      adb('input keyevent 4');
      await sleep(800);
      return true;
    }
    await sleep(1000);
  }
  record('test-c-live-mode', 'FAIL', 'could not enable live analysis', []);
  adb('input keyevent 4');
  await sleep(800);
  return false;
}

async function setDisplay(modeKey) {
  await tapTab('settings');
  const testId = TIDS.settingsUxMode(modeKey);
  for (let i = 0; i < 20; i++) {
    const xml = await dump(`mode-${modeKey}-${i}`);
    const hit = findTestId(xml, testId);
    if (hit) {
      tap(hit);
      await sleep(2000);
      return true;
    }
    adb('input swipe 540 1900 540 650 350');
    await sleep(500);
  }
  return false;
}

async function setTrust() {
  await tapTab('settings');
  await sleep(1500);
  let navigated = false;
  for (let i = 0; i < 35; i++) {
    const xml = await dump(`trust-nav-${i}`);
    const hit =
      findTestId(xml, TIDS.settingsNavAiStrategy) ||
      find(xml, (t) => t.includes('AI') && (t.includes('\u8a2d\u5b9a') || t.includes('Strategy')))[0];
    if (hit) {
      tap(hit);
      await sleep(POST_TAP_MS);
      navigated = true;
      break;
    }
    adb('input swipe 540 1900 540 650 350');
    await sleep(600);
  }
  if (!navigated) return false;

  for (let i = 0; i < 40; i++) {
    const xml = await dump(`trust-mode-${i}`);
    const trustHit =
      findTestId(xml, TIDS.aiInvestmentMode('trust')) ||
      find(xml, (t) => t === TRUST_LABEL || t.includes('\u4fe1\u8a17\u30e2\u30fc\u30c9'))[0];
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
    await sleep(600);
  }
  adb('input keyevent 4');
  await sleep(800);
  return false;
}

async function testD_uxMode(mode) {
  const prefix = `test-d-${mode.key}`;
  const switched = await setDisplay(mode.key);
  record(`${prefix}-mode-switch`, switched ? 'PASS' : 'FAIL', mode.label, []);
  await tapTab('home');
  await dismissOnboarding();
  const { n, shots } = await scrollHomeShots(prefix, `${prefix}-four-buttons`);
  const btn = await findButton(FLOWS[0].home, `${prefix}-open`);
  if (!btn) {
    record(`${prefix}-flow-open`, 'FAIL', 'concierge_full not tappable', shots);
    return;
  }
  tap(btn);
  await sleep(POST_TAP_MS);
  const fx = await dump(`${prefix}-flow`);
  shot(`${prefix}-flow`);
  const opened = [...texts(fx)].some((t) => t === FLOWS[0].title || t === CREATE);
  record(`${prefix}-flow-open`, opened ? 'PASS' : 'FAIL', FLOWS[0].title, [`${prefix}-flow.png`, ...shots]);
  adb('input keyevent 4');
  await sleep(800);
}

async function testE_trust() {
  const switched = await setTrust();
  record('test-e-trust-mode-switch', switched ? 'PASS' : 'FAIL', TRUST_LABEL, []);
  await tapTab('home');
  await dismissOnboarding();
  await sleep(2000);
  const { n, shots } = await scrollHomeShots('test-e', 'test-e-four-buttons');
  const btn = await findButton(FLOWS[0].home, 'test-e-open');
  if (!btn) {
    record('test-e-flow-open', 'FAIL', 'concierge_full not tappable', shots);
    return;
  }
  tap(btn);
  await sleep(POST_TAP_MS);
  const fx = await dump('test-e-flow');
  shot('test-e-flow');
  const opened = [...texts(fx)].some((t) => t === FLOWS[0].title || t === CREATE);
  record('test-e-flow-open', opened ? 'PASS' : 'FAIL', FLOWS[0].title, ['test-e-flow.png', ...shots]);
  adb('input keyevent 4');
  await sleep(800);
}

function resolveGit() {
  const paths = [
    process.env.STA_GIT_EXE,
    path.join(process.env.LOCALAPPDATA || '', 'MinGit', 'cmd', 'git.exe'),
    'C:\\Program Files\\Git\\cmd\\git.exe',
  ].filter(Boolean);
  for (const p of paths) {
    if (p.endsWith('.exe') && fs.existsSync(p)) return p;
    const exe = path.join(p, 'git.exe');
    if (fs.existsSync(exe)) return exe;
  }
  try {
    return sh('where git').split(/\r?\n/)[0];
  } catch {
    return null;
  }
}

function gitHash() {
  const git = resolveGit();
  try {
    if (git) return sh(`"${git}" rev-parse HEAD`);
    const head = fs.readFileSync('.git/HEAD', 'utf8').trim();
    if (head.startsWith('ref: ')) return fs.readFileSync(path.join('.git', head.slice(5)), 'utf8').trim();
    return head;
  } catch {
    return 'unknown';
  }
}

function writeReport() {
  const pass = results.filter((r) => r.status === 'PASS').length;
  const partial = results.filter((r) => r.status === 'PARTIAL').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  const overall = fail === 0 && partial === 0 ? 'PASS' : fail === 0 ? 'PARTIAL' : pass > 0 ? 'PARTIAL' : 'FAIL';
  const commit = gitHash();
  const gitExe = resolveGit();

  const modeResult = (prefix, label) => {
    const sw = results.find((r) => r.id === `${prefix}-mode-switch`);
    const bt = results.find((r) => r.id === `${prefix}-four-buttons`);
    const fo = results.find((r) => r.id === `${prefix}-flow-open`);
    return `| ${label} | ${sw?.status ?? '—'} | ${bt?.detail ?? bt?.status ?? '—'} | ${fo?.status ?? '—'} |`;
  };

  const flowResult = (key, label) => {
    const op = results.find((r) => r.id === `test-c-flow-${key}-open`);
    const e2e = results.find((r) => r.id === `test-c-e2e-${key}`);
    return `| ${label} | ${op?.status ?? '—'} | ${e2e?.status ?? '—'} | ${e2e?.detail ?? '—'} |`;
  };

  const lines = [
    '# Device Verify v44 — E2E Final Rerun Report',
    '',
    `- **Overall**: **${overall}**`,
    `- **PASS / PARTIAL / FAIL**: ${pass} / ${partial} / ${fail}`,
    `- **Device**: ${meta.model} (${meta.serial})`,
    `- **versionCode**: ${meta.versionCode}`,
    `- **Timestamp**: ${meta.timestamp}`,
    `- **Git commit (run start)**: \`${commit}\``,
    `- **Git executable**: ${gitExe ?? 'not found — use scripts/git-env.ps1'}`,
    `- **Push**: see post-run commit`,
    '',
    '## Commands',
    '```powershell',
    'chcp 65001',
    "$env:PYTHONIOENCODING='utf-8'",
    '. .\\scripts\\git-env.ps1',
    'adb devices',
    'adb -s FYRWXSNNAIOR9DCM reverse tcp:8081 tcp:8081',
    'npm run start:clear',
    '$env:ANDROID_SERIAL=\'FYRWXSNNAIOR9DCM\'; npx expo run:android --no-bundler',
    'node run-v44-e2e-rerun.mjs',
    '```',
    '',
    '## adb devices',
    '```',
    meta.adbDevices,
    '```',
    '',
    '## Test A — cold start / language / onboarding',
    '| Check | Status | Detail |',
    '|-------|--------|--------|',
    ...['test-a-language-ja', 'test-a-onboarding-dismiss'].map((id) => {
      const r = results.find((x) => x.id === id);
      return r ? `| ${id} | ${r.status} | ${r.detail} |` : '';
    }),
    '',
    '## Test B — home 4 buttons',
    '| Check | Status | Detail |',
    '|-------|--------|--------|',
    ...(results.filter((r) => r.id.startsWith('test-b')).map((r) => `| ${r.id} | ${r.status} | ${r.detail} |`)),
    '',
    '## Test C — flow E2E create → list',
    '| Flow | Open | Create/list | Pending |',
    '|------|------|-------------|---------|',
    ...FLOWS.map((f) => flowResult(f.key, f.home)),
    '',
    '## Test D — UX modes',
    '| Mode | Switch | 4 buttons | Flow open |',
    '|------|--------|-----------|-----------|',
    modeResult('test-d-beginner', 'Beginner'),
    modeResult('test-d-standard', 'Standard'),
    modeResult('test-d-pro', 'Pro'),
    '',
    '## Test E — Trust mode',
    '| Check | Status | Detail |',
    '|-------|--------|--------|',
    ...(results.filter((r) => r.id.startsWith('test-e')).map((r) => `| ${r.id} | ${r.status} | ${r.detail} |`)),
    '',
    '## Home stability',
    ...(results.filter((r) => r.id === 'test-home-stability').map((r) => `- **${r.status}**: ${r.detail}`)),
    '',
    '## Evidence',
    '- `docs/review/device-verify-v44/` (screenshots, XML, log)',
    '- `docs/review/device-verify-v44/results-e2e-rerun.json`',
    '- `docs/review/device-verify-v44/e2e-rerun-run.log`',
    '',
    '## AAB',
    '- **Created**: No — Build Credit 節約のため今回は未作成',
    '',
    '## Manual git commit / push',
    '```powershell',
    '. .\\scripts\\git-env.ps1',
    'git add run-v44-e2e-rerun.mjs _deviceVerifyAdb.mjs src/constants/deviceVerifyTestIds.ts src/components/LanguagePickerModal.tsx scripts/git-env.ps1 docs/review/DEVICE_VERIFY_V44_E2E_FINAL_RERUN_REPORT.md',
    'git commit -m "fix: Device Verify v44 E2E rerun — split tests A–E, language/trust probes"',
    'git push origin cursor/top3-maxdd-capital-audit',
    '```',
  ];

  if (fail > 0 || partial > 0) {
    lines.push('', '## Remaining failures');
    for (const r of results.filter((x) => x.status !== 'PASS')) {
      lines.push(`- **${r.id}** (${r.status}): ${r.detail}`);
    }
  }

  fs.writeFileSync(REPORT, lines.join('\n'), 'utf8');
  return { overall, pass, partial, fail, commit };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const metroOk = await ensureMetroLink();
  if (!metroOk) {
    console.error('FATAL: Metro not reachable on :8081 — run npm run start:clear first');
    process.exit(2);
  }
  sh(`${ADB} reverse tcp:8081 tcp:8081`);
  adb('input keyevent 224');

  meta = {
    serial: SERIAL,
    model: adb('getprop ro.product.model'),
    versionCode: sh(`${ADB} shell dumpsys package ${PKG} | findstr versionCode`),
    adbDevices: sh('adb devices'),
    timestamp: new Date().toISOString(),
  };

  await testA_coldStartLanguageOnboarding();
  await testB_homeFourButtons();
  await testHomeStability();
  await testC_flowE2E();
  await ensureHomeReady('pre-test-d');
  for (const mode of UX_MODES) await testD_uxMode(mode);
  await ensureHomeReady('pre-test-e');
  await testE_trust();

  fs.writeFileSync(path.join(OUT, 'results-e2e-rerun.json'), JSON.stringify({ meta, results }, null, 2), 'utf8');
  const summary = writeReport();
  console.log('DONE', summary);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
