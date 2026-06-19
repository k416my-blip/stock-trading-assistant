/**
 * Phase11 UI Visibility — 1155 manual Phase24 / Phase23.1 / Concierge screenshots
 * node scripts/bursa-phase11-ui-visibility-verify.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PKG = 'com.assistant.stocktrading';
const OUT = path.join('docs', 'review', 'phase11-ui-visibility');
const STOCK = { code: '1155', label: 'Maybank' };

const PHASE24_HEADING = 'Phase24 Analyst Consensus Intelligence';
const PHASE231_HEADING = 'Phase23.1 Earnings Revision Cross Signal';

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

function installedVersionCode() {
  try {
    const out = sh(`adb shell dumpsys package ${PKG}`);
    const m = out.match(/versionCode=(\d+)/);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

async function dumpUi(name) {
  sh('adb shell uiautomator dump /sdcard/ui-vis.xml');
  await sleep(400);
  const raw = sh('adb shell cat /sdcard/ui-vis.xml');
  fs.writeFileSync(path.join(OUT, `${name}.xml`), raw, 'utf8');
  return raw;
}

function shot(name) {
  const local = path.join(OUT, `${name}.png`);
  sh(`adb shell screencap -p /sdcard/vis-${name}.png`);
  sh(`adb pull /sdcard/vis-${name}.png "${local}"`);
  return local;
}

/** Parse node attrs: text, content-desc, resource-id, bounds */
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
      raw: attrs,
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
  if (xml.includes(heading)) return { xml, found: true, scrolls: 0 };
  for (let i = 1; i <= maxScrolls; i++) {
    xml = await scrollDown(`${name}-${i}`);
    if (xml.includes(heading)) return { xml, found: true, scrolls: i };
  }
  return { xml, found: false, scrolls: maxScrolls };
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

async function ensureStock1155Visible() {
  let xml = await dumpUi('stock1155-pre');
  if (xml.includes(STOCK.code)) return xml;
  const hits = findUiNodes(xml, (n) => n.text === STOCK.code || n.text.startsWith(`${STOCK.code} `));
  if (hits[0]) {
    tapNode(hits[0]);
    await sleep(2000);
    return dumpUi('stock1155-tap');
  }
  const scrolled = await scrollUntilHeading(STOCK.code, 'stock1155-find', 20);
  return scrolled.xml;
}

/** Concierge FAB — content-desc / text / resource-id only (no coordinate tap) */
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
    return { xml: await dumpUi('fab-open-desc'), method: 'content-desc' };
  }

  const byText = findUiNodes(
    xml,
    (n) => n.text === 'AI' && (n.resourceId.includes('fab') || n.resourceId.includes('concierge')),
  );
  if (byText.length) {
    tapNode(byText.sort((a, b) => b.cy - a.cy)[0]);
    await sleep(4000);
    return { xml: await dumpUi('fab-open-text'), method: 'text+resource-id' };
  }

  const byTextOnly = findUiNodes(xml, (n) => n.text === 'AI' && n.cy > 1800);
  if (byTextOnly.length) {
    tapNode(byTextOnly.sort((a, b) => b.cy - a.cy)[0]);
    await sleep(4000);
    return { xml: await dumpUi('fab-open-text-only'), method: 'text' };
  }

  const byRid = findUiNodes(
    xml,
    (n) =>
      /concierge|fab|assistant/i.test(n.resourceId) &&
      (n.text === 'AI' || n.contentDesc.includes('コンシェルジュ')),
  );
  if (byRid.length) {
    tapNode(byRid[0]);
    await sleep(4000);
    return { xml: await dumpUi('fab-open-rid'), method: 'resource-id' };
  }

  throw new Error('Concierge FAB not found via content-desc / text / resource-id');
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const commit = sh('git rev-parse --short HEAD', { stdio: ['pipe', 'pipe', 'ignore'] });
  const startedAt = new Date().toISOString();

  if (!hasAdb()) {
    const blocked = { commit, adb: false, pass: false, note: 'adb device not connected', startedAt };
    fs.writeFileSync(path.join(OUT, 'visibility-results.json'), JSON.stringify(blocked, null, 2));
    console.log(JSON.stringify(blocked, null, 2));
    process.exit(1);
  }

  wakeDevice();
  sh(`adb shell am start -W -n ${PKG}/.MainActivity`);
  await sleep(20000);
  let xml = await waitForAppForeground();
  xml = await dismissDialogs(xml);

  await tapTab('材料分析');
  xml = await dumpUi('material-open');
  const refresh = findUiNodes(xml, (n) => n.text === '再取得');
  if (refresh[0]) {
    tapNode(refresh[0]);
    await sleep(15000);
  }
  await waitMaterialLoaded();
  await ensureStock1155Visible();

  const p24 = await scrollUntilHeading(PHASE24_HEADING, 'phase24-1155', 45);
  shot('phase24-1155');
  const p24Markers = countMarkers(p24.xml, PHASE24_MARKERS);

  const p231 = await scrollUntilHeading(PHASE231_HEADING, 'phase23_1-1155', 45);
  shot('phase23_1-1155');
  const p231Markers = countMarkers(p231.xml, PHASE231_MARKERS);

  sh(`adb shell am start -W -n ${PKG}/.MainActivity`);
  await sleep(10000);
  await tapTab('材料分析');
  await sleep(3000);

  let fabResult;
  try {
    fabResult = await openConciergeFab();
  } catch (e) {
    fabResult = { xml: await dumpUi('fab-fail'), method: null, error: String(e.message ?? e) };
  }

  shot('concierge-1155-open');
  const panelOpen =
    fabResult.xml.includes('AIコンシェルジュ') ||
    fabResult.xml.includes('なぜ買い推奨') ||
    fabResult.xml.includes('AI分析結果');

  let conciergeXml = fabResult.xml;
  if (panelOpen) {
    const quick = findUiNodes(conciergeXml, (n) =>
      ['なぜ買い推奨？', '保有バランスは危険？', 'なぜ信頼度が低下？'].includes(n.text),
    );
    if (quick[0]) {
      tapNode(quick[0]);
      await sleep(25000);
      conciergeXml = await dumpUi('concierge-after-quick');
    } else {
      await sleep(12000);
      conciergeXml = await dumpUi('concierge-after-wait');
    }
    if (!conciergeXml.includes('AI分析結果')) {
      const enhanced = await scrollUntilHeading('AI分析結果', 'concierge-enhanced', 20);
      conciergeXml = enhanced.xml;
    }
  }
  shot('concierge-1155-enhanced');
  const conciergeMarkers = countMarkers(conciergeXml, CONCIERGE_MARKERS);

  const result = {
    commit,
    adb: true,
    device: deviceInfo(),
    installedVersionCode: installedVersionCode(),
    stock: STOCK,
    startedAt,
    finishedAt: new Date().toISOString(),
    phase24: {
      heading: PHASE24_HEADING,
      found: p24.found,
      scrolls: p24.scrolls,
      markers: p24Markers,
      total: PHASE24_MARKERS.length,
      screenshot: 'phase24-1155.png',
    },
    phase231: {
      heading: PHASE231_HEADING,
      found: p231.found,
      scrolls: p231.scrolls,
      markers: p231Markers,
      total: PHASE231_MARKERS.length,
      screenshot: 'phase23_1-1155.png',
    },
    concierge: {
      fabMethod: fabResult.method,
      fabError: fabResult.error ?? null,
      panelOpen,
      markers: conciergeMarkers,
      total: CONCIERGE_MARKERS.length,
      screenshots: ['concierge-1155-open.png', 'concierge-1155-enhanced.png'],
    },
    pass: p24.found && p231.found && panelOpen && conciergeMarkers >= 2,
    screenshots: fs.readdirSync(OUT).filter((f) => f.endsWith('.png')),
  };

  fs.writeFileSync(path.join(OUT, 'visibility-results.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  if (!result.pass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
