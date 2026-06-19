/**
 * Phase24 / Phase23.1 UI device smoke — 材料分析タブでラベル確認 + スクリーンショット
 * node scripts/bursa-phase24-23_1-ui-device-verify.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PKG = 'com.assistant.stocktrading';
const OUT = path.join('docs', 'review', 'phase24-23_1-ui-device');
const STOCKS = [
  { code: '1155', label: 'Maybank' },
  { code: '1023', label: 'CIMB' },
  { code: '1295', label: 'Public Bank' },
  { code: '5347', label: 'Tenaga' },
  { code: '4707', label: 'Nestle' },
  { code: '6033', label: 'Petronas Gas' },
];

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

async function dumpUi(name) {
  sh('adb shell uiautomator dump /sdcard/ui-p24.xml');
  await sleep(400);
  const raw = sh('adb shell cat /sdcard/ui-p24.xml');
  fs.writeFileSync(path.join(OUT, `${name}.xml`), raw, 'utf8');
  return raw;
}

function shot(name) {
  const local = path.join(OUT, `${name}.png`);
  sh(`adb shell screencap -p /sdcard/p24-${name}.png`);
  sh(`adb pull /sdcard/p24-${name}.png "${local}"`);
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

async function tapTab(label) {
  let xml = await dumpUi(`pre-${label}`);
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
    xml = await dumpUi(`scroll-tab-${i}`);
  }
}

function countMarkers(xml, markers) {
  return markers.filter((m) => xml.includes(m)).length;
}

async function scrollForMarkers(name, markers, maxScrolls = 12) {
  let xml = await dumpUi(`${name}-scroll-0`);
  let best = countMarkers(xml, markers);
  for (let i = 1; i <= maxScrolls && best < markers.length; i++) {
    sh('adb shell input swipe 610 1700 610 500 350');
    await sleep(1200);
    xml = await dumpUi(`${name}-scroll-${i}`);
    best = Math.max(best, countMarkers(xml, markers));
  }
  return { xml, found: best, total: markers.length };
}

async function selectStock(code) {
  let xml = await dumpUi(`search-open`);
  const search = findLabels(xml, (l) => l.includes('銘柄') || l.includes('検索') || l === '再取得');
  if (search[0]) {
    sh(`adb shell input tap ${search[0].cx} ${search[0].cy}`);
    await sleep(800);
  }
  sh(`adb shell input text ${code}`);
  await sleep(1500);
  xml = await dumpUi(`search-${code}`);
  const hit = findLabels(xml, (l) => l.includes(code));
  if (hit[0]) {
    sh(`adb shell input tap ${hit[0].cx} ${hit[0].cy}`);
    await sleep(4000);
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const commit = sh('git rev-parse --short HEAD', { stdio: ['pipe', 'pipe', 'ignore'] });

  if (!hasAdb()) {
    const report = {
      commit,
      adb: false,
      pass: false,
      note: 'adb device not connected — pipeline verify only',
      stocks: [],
    };
    fs.writeFileSync(path.join(OUT, 'device-results.json'), JSON.stringify(report, null, 2));
    console.log('No adb device — skipped device UI smoke');
    return;
  }

  sh('adb reverse tcp:8081 tcp:8081');
  sh(`adb shell am start -W -S -n ${PKG}/.MainActivity`);
  await sleep(16000);

  await tapTab('材料分析');
  await sleep(6000);

  let xml = await dumpUi('material-open');
  const refresh = findLabels(xml, (l) => l === '再取得');
  if (refresh[0]) {
    sh(`adb shell input tap ${refresh[0].cx} ${refresh[0].cy}`);
    await sleep(12000);
  }

  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    xml = await dumpUi('material-wait');
    if (xml.includes('【銘柄別材料分析】') && !xml.includes('材料分析を取得中')) break;
    await sleep(3000);
  }

  shot('00-material-tab');
  const phase24Scroll = await scrollForMarkers('phase24', PHASE24_MARKERS);
  shot('01-phase24-section');
  const phase231Scroll = await scrollForMarkers('phase23_1', PHASE231_MARKERS);
  shot('02-phase23_1-section');

  const stockResults = [];
  for (const stock of STOCKS) {
    await selectStock(stock.code);
    xml = await dumpUi(`stock-${stock.code}`);
    shot(`stock-${stock.code}`);
    const p24 = countMarkers(xml, PHASE24_MARKERS);
    const p231 = countMarkers(xml, PHASE231_MARKERS);
    stockResults.push({
      code: stock.code,
      label: stock.label,
      phase24Markers: p24,
      phase24Total: PHASE24_MARKERS.length,
      phase231Markers: p231,
      phase231Total: PHASE231_MARKERS.length,
      pass: p24 >= 4 && p231 >= 4,
    });
  }

  const passCount = stockResults.filter((r) => r.pass).length;
  const report = {
    commit,
    adb: true,
    pass: passCount >= 4,
    passCount,
    total: STOCKS.length,
    phase24ScrollFound: phase24Scroll.found,
    phase231ScrollFound: phase231Scroll.found,
    stocks: stockResults,
    screenshots: fs.readdirSync(OUT).filter((f) => f.endsWith('.png')),
  };
  fs.writeFileSync(path.join(OUT, 'device-results.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
