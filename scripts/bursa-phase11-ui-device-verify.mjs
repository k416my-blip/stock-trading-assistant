/**
 * Phase11 UI Device Smoke — Material Analysis + Concierge Enhanced Analysis
 * node scripts/bursa-phase11-ui-device-verify.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PKG = 'com.assistant.stocktrading';
const OUT = path.join('docs', 'review', 'phase11-ui-device');
const STOCKS = [
  { code: '1155', label: 'Maybank' },
  { code: '1023', label: 'CIMB' },
  { code: '1295', label: 'Public Bank' },
  { code: '5347', label: 'Tenaga' },
  { code: '4707', label: 'Nestle' },
  { code: '6033', label: 'Petronas Gas' },
];

const MATERIAL_MARKERS = ['材料分析', '【銘柄別材料分析】', 'Phase24 Analyst Consensus Intelligence'];
const PHASE24_MARKERS = [
  'Phase24 Analyst Consensus Intelligence',
  'Source:',
  'Consensus:',
  'Target:',
  'Score:',
  'Confidence:',
];
const PHASE231_MARKERS = [
  'Phase23.1 Earnings Revision Cross Signal',
  'Cross Signal:',
  'Direction:',
  'Alignment:',
  'Material Impact:',
];
const CONCIERGE_MARKERS = [
  'AI分析結果',
  'Analyst Consensus Intelligence (Phase24)',
  'Phase23.1 Cross Signal',
  'Source:',
  'Cross Signal:',
];

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opts }).trim();
}

function hasAdb() {
  try {
    sh('adb get-state');
    return true;
  } catch {
    return false;
  }
}

function deviceInfo() {
  try {
    return sh('adb devices -l').split('\n').find((l) => l.includes('device') && !l.includes('List')) ?? '';
  } catch {
    return '';
  }
}

async function dumpUi(name) {
  sh('adb shell uiautomator dump /sdcard/ui-p11.xml');
  await sleep(400);
  const raw = sh('adb shell cat /sdcard/ui-p11.xml');
  fs.writeFileSync(path.join(OUT, `${name}.xml`), raw, 'utf8');
  return raw;
}

function shot(name) {
  const local = path.join(OUT, `${name}.png`);
  sh(`adb shell screencap -p /sdcard/p11-${name}.png`);
  sh(`adb pull /sdcard/p11-${name}.png "${local}"`);
  return local;
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

function countMarkers(xml, markers) {
  return markers.filter((m) => xml.includes(m)).length;
}

function logcatFatals() {
  try {
    const out = sh('adb logcat -d -s AndroidRuntime:E ReactNativeJS:E 2>&1', { stdio: ['pipe', 'pipe', 'ignore'] });
    return (out.match(/FATAL EXCEPTION/g) ?? []).length;
  } catch {
    return 0;
  }
}

async function dismissDialogs(xml) {
  for (const label of ['スキップ', '閉じる', 'OK', '後で', '許可', 'Allow']) {
    const btn = findLabels(xml, (l) => l === label || l.includes(label));
    if (btn[0]) {
      sh(`adb shell input tap ${btn[0].cx} ${btn[0].cy}`);
      await sleep(1200);
      return dumpUi('dismiss');
    }
  }
  return xml;
}

async function tapTab(label) {
  let xml = await dumpUi(`tab-pre-${label}`);
  for (let i = 0; i < 8; i++) {
    const tabs = findLabels(xml, (l) => l === label);
    if (tabs.length) {
      const t = tabs.sort((a, b) => a.cx - b.cx)[0];
      sh(`adb shell input tap ${t.cx} ${t.cy}`);
      await sleep(5000);
      return;
    }
    sh('adb shell input swipe 900 2620 300 2620 350');
    await sleep(700);
    xml = await dumpUi(`tab-scroll-${label}-${i}`);
  }
  throw new Error(`tab not found: ${label}`);
}

async function scrollDown(name, times = 1) {
  for (let i = 0; i < times; i++) {
    sh('adb shell input swipe 610 1700 610 500 350');
    await sleep(900);
  }
  return dumpUi(name);
}

async function scrollUntil(xmlCheck, name, maxScrolls = 20) {
  let xml = await dumpUi(`${name}-0`);
  if (xmlCheck(xml)) return xml;
  for (let i = 1; i <= maxScrolls; i++) {
    await scrollDown(`${name}-${i}`, 1);
    xml = await dumpUi(`${name}-${i}`);
    if (xmlCheck(xml)) return xml;
  }
  return xml;
}

async function openConciergeFab() {
  let xml = await dumpUi('fab-pre');
  const fab = findLabels(
    xml,
    (l) =>
      l.includes('AIコンシェルジュ') ||
      l.includes('コンシェルジュを開く') ||
      l === 'AIコンシェルジュを開く',
  );
  if (!fab.length) {
    sh('adb shell input tap 980 2100');
    await sleep(3000);
    xml = await dumpUi('fab-tap-fallback');
  } else {
    const f = fab.sort((a, b) => b.cy - a.cy)[0];
    sh(`adb shell input tap ${f.cx} ${f.cy}`);
    await sleep(4000);
    xml = await dumpUi('fab-open');
  }
  return xml;
}

async function waitMaterialLoaded() {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    const xml = await dumpUi('material-wait');
    if (xml.includes('【銘柄別材料分析】') && !xml.includes('材料分析を取得中')) return xml;
    await sleep(3000);
  }
  throw new Error('material analysis load timeout');
}

async function verifyStockOnMaterial(stock) {
  const xml = await scrollUntil(
    (x) => x.includes(stock.code) && countMarkers(x, PHASE24_MARKERS) >= 1,
    `stock-${stock.code}`,
    25,
  );
  shot(`material-${stock.code}`);
  const p24 = countMarkers(xml, PHASE24_MARKERS);
  const p231 = countMarkers(xml, PHASE231_MARKERS);
  return {
    code: stock.code,
    label: stock.label,
    phase24Markers: p24,
    phase24Total: PHASE24_MARKERS.length,
    phase231Markers: p231,
    phase231Total: PHASE231_MARKERS.length,
    materialPass: p24 >= 4 && p231 >= 3,
    xmlHasCode: xml.includes(stock.code),
  };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const commit = sh('git rev-parse --short HEAD', { stdio: ['pipe', 'pipe', 'ignore'] });
  const startedAt = new Date().toISOString();

  if (!hasAdb()) {
    const blocked = {
      commit,
      adb: false,
      pass: false,
      note: 'adb device not connected',
      startedAt,
    };
    fs.writeFileSync(path.join(OUT, 'device-results.json'), JSON.stringify(blocked, null, 2));
    console.log(JSON.stringify(blocked, null, 2));
    process.exit(1);
  }

  sh('adb logcat -c');
  const fatalsBefore = logcatFatals();

  sh(`adb shell am start -W -S -n ${PKG}/.MainActivity`);
  await sleep(16000);
  let xml = await dumpUi('00-launch');
  xml = await dismissDialogs(xml);
  shot('00-launch');

  await tapTab('材料分析');
  shot('01-material-tab');
  xml = await dumpUi('material-open');
  const refresh = findLabels(xml, (l) => l === '再取得');
  if (refresh[0]) {
    sh(`adb shell input tap ${refresh[0].cx} ${refresh[0].cy}`);
    await sleep(15000);
  }
  await waitMaterialLoaded();
  shot('02-material-loaded');

  const materialScreenOk = countMarkers(xml, MATERIAL_MARKERS) >= 2;
  xml = await scrollUntil((x) => countMarkers(x, PHASE24_MARKERS) >= 4, 'phase24-scroll', 15);
  shot('03-phase24-scroll');
  xml = await scrollUntil((x) => countMarkers(x, PHASE231_MARKERS) >= 3, 'phase231-scroll', 15);
  shot('04-phase23_1-scroll');

  const stockResults = [];
  for (const stock of STOCKS) {
    sh(`adb shell am start -W -n ${PKG}/.MainActivity`);
    await sleep(8000);
    await tapTab('材料分析');
    await sleep(4000);
    stockResults.push(await verifyStockOnMaterial(stock));
  }

  sh(`adb shell am start -W -n ${PKG}/.MainActivity`);
  await sleep(10000);
  await openConciergeFab();
  shot('05-concierge-open');

  const quick = findLabels(await dumpUi('concierge-pre'), (l) =>
    ['なぜ買い推奨？', '保有バランスは危険？', 'なぜ信頼度が低下？'].includes(l),
  );
  if (quick[0]) {
    sh(`adb shell input tap ${quick[0].cx} ${quick[0].cy}`);
    await sleep(25000);
  } else {
    await sleep(12000);
  }

  xml = await scrollUntil((x) => countMarkers(x, CONCIERGE_MARKERS) >= 2, 'concierge-scroll', 18);
  shot('06-concierge-enhanced');
  const conciergeMarkers = countMarkers(xml, CONCIERGE_MARKERS);
  const conciergePass = conciergeMarkers >= 3;

  const fatalsAfter = logcatFatals();
  const crashFree = fatalsAfter === fatalsBefore;

  const materialPassCount = stockResults.filter((r) => r.materialPass).length;
  const pass = materialPassCount >= 4 && conciergePass && crashFree && materialScreenOk;

  const report = {
    commit,
    adb: true,
    device: deviceInfo(),
    startedAt,
    finishedAt: new Date().toISOString(),
    pass,
    materialScreenOk,
    materialPassCount,
    totalStocks: STOCKS.length,
    conciergeMarkers,
    conciergePass,
    crashFree,
    fatalsBefore,
    fatalsAfter,
    phase24ScrollMarkers: countMarkers(xml, PHASE24_MARKERS),
    phase231ScrollMarkers: countMarkers(xml, PHASE231_MARKERS),
    stocks: stockResults,
    screenshots: fs.readdirSync(OUT).filter((f) => f.endsWith('.png')),
  };

  fs.writeFileSync(path.join(OUT, 'device-results.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!pass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
