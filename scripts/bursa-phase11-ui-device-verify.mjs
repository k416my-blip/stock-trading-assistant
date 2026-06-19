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

const PHASE24_HEADING = 'Phase24 Analyst Consensus Intelligence';
const PHASE231_HEADING = 'Phase23.1 Earnings Revision Cross Signal';

const MATERIAL_MARKERS = ['材料分析', '【銘柄別材料分析】', PHASE24_HEADING];
const PHASE24_MARKERS = [
  PHASE24_HEADING,
  'Source:',
  'Consensus:',
  'Target:',
  'Score:',
  'Confidence:',
];
const PHASE231_MARKERS = [
  PHASE231_HEADING,
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

function parseNodes(xml) {
  const re = /<node\b([^>]*)\/>|<node\b([^>]*)>/g;
  const nodes = [];
  let m;
  while ((m = re.exec(xml))) {
    const attrs = m[1] ?? m[2] ?? '';
    const pick = (key) => {
      const mm = attrs.match(new RegExp(`${key}="([^"]*)"`));
      return mm ? mm[1] : '';
    };
    const bounds = pick('bounds');
    const bm = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!bm) continue;
    nodes.push({
      text: pick('text'),
      contentDesc: pick('content-desc'),
      resourceId: pick('resource-id'),
      cx: Math.floor((+bm[1] + +bm[3]) / 2),
      cy: Math.floor((+bm[2] + +bm[4]) / 2),
    });
  }
  return nodes;
}

function findUiNodes(xml, pred) {
  return parseNodes(xml).filter((n) => pred(n));
}

function countMarkers(xml, markers) {
  return markers.filter((m) => xml.includes(m)).length;
}

function tapNode(node) {
  sh(`adb shell input tap ${node.cx} ${node.cy}`);
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
    const btn = findUiNodes(xml, (n) => n.text === label || n.contentDesc === label);
    if (btn[0]) {
      tapNode(btn[0]);
      await sleep(1200);
      return dumpUi('dismiss');
    }
  }
  return xml;
}

function wakeDevice() {
  sh('adb shell input keyevent KEYCODE_WAKEUP');
  sh('adb shell wm dismiss-keyguard');
  sh('adb shell input swipe 610 2200 610 900 300');
}

async function waitForAppForeground(maxMs = 90000) {
  wakeDevice();
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    wakeDevice();
    const xml = await dumpUi('app-wait');
    if (xml.includes(`package="${PKG}"`)) return xml;
    sh(`adb shell am start -W -n ${PKG}/.MainActivity`);
    await sleep(3000);
  }
  throw new Error('app foreground timeout');
}

async function tapTab(label) {
  let xml = await dumpUi(`tab-pre-${label}`);
  const matchTab = (n) =>
    n.text === label ||
    n.contentDesc === label ||
    (label === '材料分析' && (n.text.includes('材料') || n.contentDesc.includes('材料')));
  for (let i = 0; i < 8; i++) {
    const tabs = findUiNodes(xml, matchTab);
    if (tabs.length) {
      tapNode(tabs.sort((a, b) => a.cy - b.cy)[0]);
      await sleep(5000);
      return;
    }
    sh('adb shell input swipe 900 2620 300 2620 350');
    await sleep(700);
    xml = await dumpUi(`tab-scroll-${label}-${i}`);
  }
  throw new Error(`tab not found: ${label}`);
}

async function scrollDown(name) {
  sh('adb shell input swipe 610 1700 610 500 350');
  await sleep(900);
  return dumpUi(name);
}

async function scrollUntilHeading(heading, name, maxScrolls = 45) {
  let xml = await dumpUi(`${name}-0`);
  if (xml.includes(heading)) return xml;
  for (let i = 1; i <= maxScrolls; i++) {
    xml = await scrollDown(`${name}-${i}`);
    if (xml.includes(heading)) return xml;
  }
  return xml;
}

/** Concierge FAB — content-desc / text / resource-id only (coordinate tap prohibited) */
async function openConciergeFab() {
  const xml = await dumpUi('fab-pre');
  const byDesc = findUiNodes(
    xml,
    (n) =>
      n.contentDesc === 'AIコンシェルジュを開く' ||
      n.contentDesc.includes('AIコンシェルジュ') ||
      n.contentDesc.includes('コンシェルジュを開く'),
  );
  if (byDesc.length) {
    tapNode(byDesc.sort((a, b) => b.cy - a.cy)[0]);
    await sleep(4000);
    return dumpUi('fab-open');
  }

  const byTextRid = findUiNodes(
    xml,
    (n) => n.text === 'AI' && /concierge|fab|assistant/i.test(n.resourceId),
  );
  if (byTextRid.length) {
    tapNode(byTextRid.sort((a, b) => b.cy - a.cy)[0]);
    await sleep(4000);
    return dumpUi('fab-open-rid');
  }

  const byText = findUiNodes(xml, (n) => n.text === 'AI' && n.cy > 1800);
  if (byText.length) {
    tapNode(byText.sort((a, b) => b.cy - a.cy)[0]);
    await sleep(4000);
    return dumpUi('fab-open-text');
  }

  throw new Error('Concierge FAB not found via content-desc / text / resource-id');
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
  let xml = await dumpUi(`stock-${stock.code}-pre`);
  const codeHit = findUiNodes(xml, (n) => n.text === stock.code);
  if (codeHit[0]) {
    tapNode(codeHit[0]);
    await sleep(1500);
    xml = await dumpUi(`stock-${stock.code}-tap`);
  }

  xml = await scrollUntilHeading(PHASE24_HEADING, `stock-${stock.code}`, 45);
  const p24 = countMarkers(xml, PHASE24_MARKERS);
  xml = await scrollUntilHeading(PHASE231_HEADING, `stock-${stock.code}-p231`, 45);
  shot(`material-${stock.code}`);
  const p231 = countMarkers(xml, PHASE231_MARKERS);
  return {
    code: stock.code,
    label: stock.label,
    phase24HeadingFound: xml.includes(PHASE24_HEADING),
    phase231HeadingFound: xml.includes(PHASE231_HEADING),
    phase24Markers: p24,
    phase24Total: PHASE24_MARKERS.length,
    phase231Markers: p231,
    phase231Total: PHASE231_MARKERS.length,
    materialPass: xml.includes(PHASE24_HEADING) && xml.includes(PHASE231_HEADING),
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
  await sleep(20000);
  let xml = await waitForAppForeground();
  xml = await dismissDialogs(xml);
  shot('00-launch');

  await tapTab('材料分析');
  shot('01-material-tab');
  xml = await dumpUi('material-open');
  const refresh = findUiNodes(xml, (n) => n.text === '再取得');
  if (refresh[0]) {
    tapNode(refresh[0]);
    await sleep(15000);
  }
  xml = await waitMaterialLoaded();
  shot('02-material-loaded');

  const materialScreenOk =
    xml.includes('【銘柄別材料分析】') && (xml.includes('材料分析') || xml.includes(PHASE24_HEADING));
  xml = await scrollUntilHeading(PHASE24_HEADING, 'phase24-scroll', 45);
  shot('03-phase24-scroll');
  const phase24HeadingFound = xml.includes(PHASE24_HEADING);
  xml = await scrollUntilHeading(PHASE231_HEADING, 'phase231-scroll', 45);
  shot('04-phase23_1-scroll');
  const phase231HeadingFound = xml.includes(PHASE231_HEADING);

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
  await tapTab('材料分析');
  await sleep(3000);
  await openConciergeFab();
  shot('05-concierge-open');

  const quick = findUiNodes(await dumpUi('concierge-pre'), (n) =>
    ['なぜ買い推奨？', '保有バランスは危険？', 'なぜ信頼度が低下？'].includes(n.text),
  );
  if (quick[0]) {
    tapNode(quick[0]);
    await sleep(25000);
  } else {
    await sleep(12000);
  }

  xml = await scrollUntilHeading('AI分析結果', 'concierge-scroll', 20);
  shot('06-concierge-enhanced');
  const conciergeMarkers = countMarkers(xml, CONCIERGE_MARKERS);
  const conciergePass = conciergeMarkers >= 3 && xml.includes('AI分析結果');

  const fatalsAfter = logcatFatals();
  const crashFree = fatalsAfter === fatalsBefore;

  const materialPassCount = stockResults.filter((r) => r.materialPass).length;
  const pass =
    phase24HeadingFound &&
    phase231HeadingFound &&
    materialPassCount >= 4 &&
    conciergePass &&
    crashFree &&
    materialScreenOk;

  const report = {
    commit,
    adb: true,
    device: deviceInfo(),
    startedAt,
    finishedAt: new Date().toISOString(),
    pass,
    materialScreenOk,
    phase24HeadingFound,
    phase231HeadingFound,
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
