#!/usr/bin/env node
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
const POST_TAP_MS = Number(process.env.POST_TAP_MS || 12000);

const jaHome = JSON.parse(fs.readFileSync('src/i18n/resources/ja/home.json', 'utf8'));
const jaSettings = JSON.parse(fs.readFileSync('src/i18n/resources/ja/settings.json', 'utf8'));
const jaPortfolio = JSON.parse(fs.readFileSync('src/i18n/resources/ja/portfolio.json', 'utf8'));
const TRUST_LABEL = fs.readFileSync('src/constants/investmentDisplay.ts', 'utf8').match(/trust:\s*'([^']+)'/)[1];
const AI_ROW = fs.readFileSync('src/constants/aiSettings.ts', 'utf8').match(/screenTitle:\s*'([^']+)'/)[1];

const SECTION = jaHome.manualOrderEntry.sectionTitle;
const CREATE = jaHome.manualOrderFlow.createList;
const VIEW_LIST = jaHome.trust.viewList;
const OK_BTN = jaHome.trust.ok;
const LIST_TITLE = jaPortfolio.sell.manualOrderList;
const FLOWS = [
  { key: 'concierge_full', home: jaHome.manualOrderEntry.conciergeFull.title, title: jaHome.manualOrderFlow.conciergeFull.title },
  { key: 'manual_full', home: jaHome.manualOrderEntry.manualFull.title, title: jaHome.manualOrderFlow.manualFull.title },
  { key: 'concierge_symbol', home: jaHome.manualOrderEntry.conciergeSymbol.title, title: jaHome.manualOrderFlow.conciergeSymbol.title },
  { key: 'concierge_quantity', home: jaHome.manualOrderEntry.conciergeQuantity.title, title: jaHome.manualOrderFlow.conciergeQuantity.title },
];
const MODES = [
  { key: 'beginner', label: jaSettings.displayMode.modes.beginner.label },
  { key: 'standard', label: jaSettings.displayMode.modes.standard.label },
  { key: 'pro', label: jaSettings.displayMode.modes.pro.label },
  { key: 'trust', label: TRUST_LABEL, trust: true },
];

const sh = (c) => execSync(c, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }).trim();
const adb = (a) => sh(`${ADB} shell ${a}`);
const results = [];

function record(id, status, detail, evidence = []) {
  results.push({ id, status, detail, evidence });
  console.log(status, id, detail);
}

async function dump(name) {
  const dest = path.join(OUT, `${name}.xml`);
  for (let i = 0; i < 5; i++) {
    try {
      adb('uiautomator dump /sdcard/ui-complete.xml');
      sh(`${ADB} exec-out cat /sdcard/ui-complete.xml > "${dest}"`);
      const xml = fs.readFileSync(dest, 'utf8');
      if (xml.includes('<hierarchy') && xml.length > 200) return xml;
    } catch {}
    await sleep(1200);
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
  console.log('TAP', it.label.slice(0, 40));
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

async function tapTab(label) {
  const xml = await dump('tab');
  for (const l of label === 'home' ? ['Home', '\u30db\u30fc\u30e0'] : label === 'portfolio' ? ['\u4fdd\u6709\u9298\u67c4', 'Portfolio'] : ['\u8a2d\u5b9a', 'Settings']) {
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
  for (let i = 0; i < 10; i++) {
    const xml = await dump(`onb-${i}`);
    if ([...texts(xml)].some((t) => t === SECTION || FLOWS.some((f) => t === f.home))) return true;
    for (const l of [jaHome.onboarding.skip, jaHome.onboarding.next, jaHome.onboarding.startOnHome]) {
      const b = find(xml, (t) => t === l);
      if (b[0]) {
        tap(b[0]);
        await sleep(1000);
        break;
      }
    }
  }
  return false;
}

async function scrollHomeShots(prefix) {
  const corpus = new Set();
  const shots = [];
  for (let i = 0; i < 24; i++) {
    const xml = await dump(`${prefix}-home-scroll-${i}`);
    if (xml) for (const t of texts(xml)) corpus.add(t);
    const found = FLOWS.filter((f) => corpus.has(f.home)).length;
    if (found > 0) {
      const s = `${prefix}-home-scroll-${i}-found${found}`;
      shot(s);
      shots.push(`${s}.png`);
    }
    if (found === 4) break;
    adb('input swipe 540 1900 540 650 350');
    await sleep(500);
  }
  const n = FLOWS.filter((f) => corpus.has(f.home)).length;
  record(`${prefix}-four-buttons`, n === 4 ? 'PASS' : n > 0 ? 'PARTIAL' : 'FAIL', `${n}/4 buttons in corpus`, shots);
  return { n, shots };
}

async function findButtonByTestId(testId, prefix) {
  for (let i = 0; i < 24; i++) {
    const xml = await dump(`${prefix}-tid-${i}`);
    const hit = findTestId(xml, testId);
    if (hit) return hit;
    adb('input swipe 540 1900 540 650 350');
    await sleep(450);
  }
  return null;
}

async function findButton(label, prefix) {
  const mode = FLOWS.find((f) => f.home === label)?.key;
  if (mode) {
    const byId = await findButtonByTestId(TIDS.homeManualOrderButton(mode), prefix);
    if (byId) return byId;
  }
  for (let i = 0; i < 24; i++) {
    const xml = await dump(`${prefix}-find-${i}`);
    const b = find(xml, (t) => t === label);
    if (b[0]) return b[0];
    adb('input swipe 540 1900 540 650 350');
    await sleep(450);
  }
  return null;
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

function pendingCount(xml) {
  const probe = parsePendingCountFromXml(xml);
  if (probe != null) return probe;
  const j = [...texts(xml)].join('\n');
  const m = j.match(/\u672a\u5b8c\u4e86[（(](\d+)件[）)]/);
  return m ? Number(m[1]) : null;
}

async function openList() {
  await tapTab('portfolio');
  for (let i = 0; i < 18; i++) {
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

async function setDisplay(modeKey) {
  await tapTab('settings');
  const testId = TIDS.settingsUxMode(modeKey);
  for (let i = 0; i < 16; i++) {
    const xml = await dump(`mode-${modeKey}-${i}`);
    const hit = findTestId(xml, testId);
    if (hit) {
      tap(hit);
      await sleep(1500);
      return true;
    }
    adb('input swipe 540 1900 540 650 350');
    await sleep(500);
  }
  return false;
}

async function setTrust() {
  await tapTab('settings');
  for (let i = 0; i < 18; i++) {
    const xml = await dump(`trust-nav-${i}`);
    const hit = findTestId(xml, TIDS.settingsNavAiStrategy);
    if (hit) {
      tap(hit);
      await sleep(2000);
      break;
    }
    adb('input swipe 540 1900 540 650 350');
    await sleep(500);
  }
  for (let i = 0; i < 18; i++) {
    const xml = await dump(`trust-${i}`);
    const hit = findTestId(xml, TIDS.aiInvestmentMode('trust'));
    if (hit) {
      tap(hit);
      await sleep(1500);
      adb('input keyevent 4');
      await sleep(800);
      adb('input keyevent 4');
      await sleep(800);
      return true;
    }
    adb('input swipe 540 1900 540 650 350');
    await sleep(500);
  }
  return false;
}

async function runE2E(prefix) {
  let pending = null;
  if (await openList()) {
    pending = pendingCount(await dump(`${prefix}-pending-start`)) ?? 0;
    shot(`${prefix}-pending-start`);
    adb('input keyevent 4');
    await sleep(1000);
  }
  await tapTab('home');
  await dismissOnboarding();

  for (const flow of FLOWS) {
    await tapTab('home');
    await sleep(1000);
    const btn = await findButton(flow.home, `${prefix}-e2e-${flow.key}`);
    if (!btn) {
      record(`${prefix}-e2e-${flow.key}`, 'FAIL', 'button not found', []);
      continue;
    }
    shot(`${prefix}-btn-${flow.key}`);
    tap(btn);
    await sleep(POST_TAP_MS);
    const fx = await dump(`${prefix}-flow-${flow.key}`);
    shot(`${prefix}-flow-${flow.key}`);
    const opened = [...texts(fx)].some((t) => t === flow.title || t === CREATE);
    record(`${prefix}-flow-${flow.key}-open`, opened ? 'PASS' : 'FAIL', opened ? flow.title : 'flow not open', [`${prefix}-flow-${flow.key}.png`]);

    await fillFlow(flow.key);
    if (!(await tapCreate(`${prefix}-${flow.key}`, flow.key))) {
      record(`${prefix}-e2e-${flow.key}`, 'FAIL', 'create button missing', []);
      adb('input keyevent 4');
      continue;
    }
    await sleep(3000);
    const ax = await dump(`${prefix}-after-${flow.key}`);
    shot(`${prefix}-after-${flow.key}`);
    const view = find(ax, (t) => t === VIEW_LIST);
    if (view[0]) {
      tap(view[0]);
      await sleep(POST_TAP_MS);
    } else {
      const ok = find(ax, (t) => t === OK_BTN || t === 'OK');
      if (ok[0]) tap(ok[0]);
      await sleep(1000);
      await openList();
    }
    const lx = await dump(`${prefix}-list-${flow.key}`);
    shot(`${prefix}-list-${flow.key}`);
    const count = pendingCount(lx);
    const ok = count !== null && (pending === null || count >= pending);
    record(`${prefix}-e2e-${flow.key}`, ok && count > (pending ?? 0) ? 'PASS' : count !== null ? 'PARTIAL' : 'FAIL', `pending ${pending ?? '?'} -> ${count ?? '?'}`, [`${prefix}-list-${flow.key}.png`]);
    if (count != null) pending = count;
    adb('input keyevent 4');
    await sleep(800);
    adb('input keyevent 4');
    await sleep(800);
  }
}

async function verifyMode(mode) {
  const prefix = `final-${mode.key}`;
  const switched = mode.trust ? await setTrust() : await setDisplay(mode.key);
  record(`${prefix}-mode-switch`, switched ? 'PASS' : 'FAIL', mode.label, []);
  await tapTab('home');
  await dismissOnboarding();
  const { shots } = await scrollHomeShots(prefix);
  const btn = await findButton(FLOWS[0].home, `${prefix}-open`);
  if (!btn) {
    record(`${prefix}-flow-open`, 'FAIL', 'concierge_full not tappable', shots);
    return;
  }
  tap(btn);
  await sleep(POST_TAP_MS);
  const fx = await dump(`${prefix}-flow-screen`);
  shot(`${prefix}-flow-screen`);
  const opened = [...texts(fx)].some((t) => t === FLOWS[0].title || t === CREATE);
  record(`${prefix}-flow-open`, opened ? 'PASS' : 'FAIL', FLOWS[0].title, [`${prefix}-flow-screen.png`, ...shots]);
  adb('input keyevent 4');
  await sleep(800);
}

function writeReport(meta) {
  const pass = results.filter((r) => r.status === 'PASS').length;
  const partial = results.filter((r) => r.status === 'PARTIAL').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  const overall = fail === 0 && partial === 0 ? 'PASS' : pass > 0 ? 'PARTIAL' : 'FAIL';
  const lines = [
    '# Device Verify v44 — Phase B Final Report',
    '',
    `- **Overall**: ${overall}`,
    `- **Device**: ${meta.model} (${meta.serial})`,
    `- **versionCode**: ${meta.versionCode}`,
    `- **Timestamp**: ${meta.timestamp}`,
    `- **PASS / PARTIAL / FAIL**: ${pass} / ${partial} / ${fail}`,
    '',
    '## UTF-8 encoding fixes',
    '- Shell: `chcp 65001`, `PYTHONIOENCODING=utf-8`',
    '- Script reads ja i18n JSON as UTF-8; Markdown saved UTF-8',
    '',
    '## Results',
    '',
    '| ID | Status | Detail |',
    '|----|--------|--------|',
    ...results.map((r) => `| ${r.id} | ${r.status} | ${r.detail.replace(/\|/g, '\\|')} |`),
    '',
    '## Evidence',
    '- `docs/review/device-verify-v44/final-*-home-scroll-*.png`',
    '- `docs/review/device-verify-v44/final-*-flow-*.png`',
    '- `docs/review/device-verify-v44/final-*-list-*.png`',
    '',
    '## AAB',
    '- **Created**: No — Build Credit savings',
    '',
    '## Script',
    '- `run-v44-phase-b-complete.mjs`',
  ];
  fs.writeFileSync(path.join('docs', 'review', 'DEVICE_VERIFY_V44_PHASE_B_FINAL_REPORT.md'), lines.join('\n'), 'utf8');
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  sh(`${ADB} reverse tcp:8081 tcp:8081`);
  adb('input keyevent 224');
  adb(`am start -n ${PKG}/.MainActivity`);
  await sleep(8000);
  await tapTab('home');
  await dismissOnboarding();

  const meta = {
    serial: SERIAL,
    model: adb('getprop ro.product.model'),
    versionCode: sh(`${ADB} shell dumpsys package ${PKG} | findstr versionCode`),
    timestamp: new Date().toISOString(),
  };

  await setDisplay('standard');
  await tapTab('home');
  await scrollHomeShots('final-e2e');
  await runE2E('final-e2e');
  for (const mode of MODES) await verifyMode(mode);

  fs.writeFileSync(path.join(OUT, 'results-phase-b-final.json'), JSON.stringify({ meta, results }, null, 2), 'utf8');
  writeReport(meta);
  console.log('DONE');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
