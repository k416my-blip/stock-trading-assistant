/**
 * v16 focused UI revalidation — 1155 primary + 6-stock scan + Concierge
 * node scripts/bursa-v16-ui-revalidation-focused.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PKG = 'com.assistant.stocktrading';
const OUT = path.join('docs', 'review', 'v16-ui-revalidation');
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
const PHASE24_MARKERS = [PHASE24_HEADING, 'Source:', 'Consensus:', 'Target:', 'Score:', 'Confidence:'];
const PHASE231_MARKERS = [PHASE231_HEADING, 'Cross Signal:', 'Direction:', 'Alignment:', 'Material Impact:'];
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

async function dumpUi(name) {
  sh('adb shell uiautomator dump /sdcard/ui-v16f.xml');
  await sleep(400);
  const raw = sh('adb shell cat /sdcard/ui-v16f.xml');
  fs.writeFileSync(path.join(OUT, `${name}.xml`), raw, 'utf8');
  return raw;
}

function shot(name) {
  const local = path.join(OUT, `${name}.png`);
  sh(`adb shell screencap -p /sdcard/v16f-${name}.png`);
  sh(`adb pull /sdcard/v16f-${name}.png "${local}"`);
  return local;
}

function parseNodes(xml) {
  const re = /<node\b([^>]*)\/>|<node\b([^>]*)>/g;
  const nodes = [];
  let m;
  while ((m = re.exec(xml))) {
    const attrs = m[1] ?? m[2] ?? '';
    const pick = (k) => {
      const mm = attrs.match(new RegExp(`${k}="([^"]*)"`));
      return mm ? mm[1] : '';
    };
    const bm = pick('bounds').match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!bm) continue;
    nodes.push({
      text: pick('text'),
      contentDesc: pick('content-desc'),
      cx: Math.floor((+bm[1] + +bm[3]) / 2),
      cy: Math.floor((+bm[2] + +bm[4]) / 2),
    });
  }
  return nodes;
}

function findUiNodes(xml, pred) {
  return parseNodes(xml).filter((n) => pred(n));
}

function tapNode(n) {
  sh(`adb shell input tap ${n.cx} ${n.cy}`);
}

function countMarkers(xml, markers) {
  return markers.filter((m) => xml.includes(m)).length;
}

function wake() {
  sh('adb shell input keyevent KEYCODE_WAKEUP');
  sh('adb shell wm dismiss-keyguard');
}

async function tapTab(label) {
  let xml = await dumpUi(`tab-${label}`);
  for (let i = 0; i < 8; i++) {
    const tabs = findUiNodes(
      xml,
      (n) =>
        n.text === label ||
        n.contentDesc === label ||
        (label === '材料分析' && (n.text.includes('材料') || n.contentDesc.includes('材料'))),
    );
    if (tabs.length) {
      tapNode(tabs.sort((a, b) => a.cy - b.cy)[0]);
      await sleep(5000);
      return;
    }
    sh('adb shell input swipe 900 2620 300 2620 350');
    await sleep(600);
    xml = await dumpUi(`tab-scroll-${i}`);
  }
  throw new Error(`tab missing: ${label}`);
}

async function scrollDown(name) {
  sh('adb shell input swipe 610 1700 610 500 320');
  await sleep(850);
  return dumpUi(name);
}

async function scrollUntilHeading(heading, prefix, max = 55) {
  let xml = await dumpUi(`${prefix}-0`);
  if (xml.includes(heading)) return { xml, found: true, scrolls: 0 };
  for (let i = 1; i <= max; i++) {
    xml = await scrollDown(`${prefix}-${i}`);
    if (xml.includes(heading)) return { xml, found: true, scrolls: i };
  }
  return { xml, found: false, scrolls: max };
}

async function waitMaterial(maxMs = 420000) {
  const deadline = Date.now() + maxMs;
  let lastRefresh = 0;
  while (Date.now() < deadline) {
    let xml = await dumpUi('mat-wait');
    if (!xml.includes('材料分析') || xml.includes('資産運用コンシェルジュ')) {
      try {
        await tapTab('材料分析');
        xml = await dumpUi('mat-retap');
      } catch {
        /* continue */
      }
    }
    if (xml.includes('【銘柄別材料分析】') && !xml.includes('材料分析を取得中')) {
      return { xml, loaded: true };
    }
    if (Date.now() - lastRefresh > 40000) {
      const ref = findUiNodes(xml, (n) => n.text === '再取得');
      if (ref[0]) {
        tapNode(ref[0]);
        lastRefresh = Date.now();
        await sleep(10000);
        continue;
      }
    }
    await sleep(3500);
  }
  await tapTab('材料分析').catch(() => {});
  const xml = await dumpUi('mat-final');
  return {
    xml,
    loaded: xml.includes('【銘柄別材料分析】') && !xml.includes('材料分析を取得中'),
  };
}

async function openConciergeFab() {
  const xml = await dumpUi('fab-pre');
  const fab = findUiNodes(
    xml,
    (n) =>
      n.contentDesc === 'AIコンシェルジュを開く' ||
      n.contentDesc.includes('AIコンシェルジュ') ||
      n.contentDesc.includes('コンシェルジュを開く'),
  );
  if (!fab.length) throw new Error('FAB content-desc not found');
  tapNode(fab.sort((a, b) => b.cy - a.cy)[0]);
  await sleep(4000);
  return { xml: await dumpUi('fab-open'), method: 'content-desc' };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const commit = sh('git rev-parse HEAD');
  const commitShort = sh('git rev-parse --short HEAD');
  const vc = sh(`adb shell dumpsys package ${PKG}`).match(/versionCode=(\d+)/)?.[1] ?? null;

  sh('adb logcat -c');
  const fatalsBefore = (sh('adb logcat -d -s AndroidRuntime:E 2>&1', { stdio: ['pipe', 'pipe', 'ignore'] }).match(/FATAL EXCEPTION/g) ?? []).length;

  wake();
  sh(`adb shell am start -W -S -n ${PKG}/.MainActivity`);
  await sleep(18000);

  await tapTab('材料分析');
  shot('v16-01-material-tab');
  let xml = await dumpUi('mat-open');
  const ref = findUiNodes(xml, (n) => n.text === '再取得');
  if (ref[0]) {
    tapNode(ref[0]);
    await sleep(12000);
  }

  const mat = await waitMaterial(420000);
  shot('v16-02-material-loaded');
  xml = mat.xml;

  const p24 = mat.loaded
    ? await scrollUntilHeading(PHASE24_HEADING, 'v16-phase24', 55)
    : { xml, found: false, scrolls: 0 };
  shot('v16-03-phase24');

  const p231 = mat.loaded
    ? await scrollUntilHeading(PHASE231_HEADING, 'v16-phase231', 55)
    : { xml: p24.xml, found: false, scrolls: 0 };
  shot('v16-04-phase231');

  const stockScan = STOCKS.map((s) => ({
    code: s.code,
    label: s.label,
    inMaterialUi: xml.includes(s.code),
  }));

  if (mat.loaded) {
    const card1155 = findUiNodes(xml, (n) => n.text === '1155');
    if (card1155[0]) tapNode(card1155[0]);
    for (let i = 0; i < 6; i++) {
      sh('adb shell input swipe 610 1700 610 500 320');
      await sleep(600);
    }
    const p24_1155 = await scrollUntilHeading(PHASE24_HEADING, 'v16-1155-p24', 55);
    const p231_1155 = await scrollUntilHeading(PHASE231_HEADING, 'v16-1155-p231', 55);
    shot('v16-05-maybank-1155');
    stockScan.find((s) => s.code === '1155').phase24 = {
      headingFound: p24_1155.found,
      markers: countMarkers(p24_1155.xml, PHASE24_MARKERS),
    };
    stockScan.find((s) => s.code === '1155').phase231 = {
      headingFound: p231_1155.found,
      markers: countMarkers(p231_1155.xml, PHASE231_MARKERS),
    };
  }

  sh(`adb shell am start -W -n ${PKG}/.MainActivity`);
  await sleep(8000);
  await tapTab('材料分析');
  await sleep(2500);

  let concierge = { fabMethod: null, panelOpen: false, enhancedFound: false, error: null };
  try {
    const fab = await openConciergeFab();
    concierge.fabMethod = fab.method;
    concierge.panelOpen =
      fab.xml.includes('AIコンシェルジュ') ||
      fab.xml.includes('なぜ買い推奨') ||
      fab.xml.includes('銘柄や方針');
    shot('v16-06-concierge-open');

    let cxml = fab.xml;
    const quick = findUiNodes(cxml, (n) =>
      ['なぜ買い推奨？', '1155 を分析', '1155を分析'].includes(n.text),
    );
    if (quick[0]) {
      tapNode(quick[0]);
      await sleep(28000);
      cxml = await dumpUi('concierge-quick');
    } else {
      const inputs = findUiNodes(cxml, (n) => n.text.includes('銘柄や方針') || n.text.includes('1155'));
      if (inputs[0]) {
        tapNode(inputs.sort((a, b) => b.cy - a.cy)[0]);
        await sleep(500);
        sh('adb shell input text 1155');
        await sleep(300);
        sh('adb shell input keyevent 66');
        await sleep(32000);
        cxml = await dumpUi('concierge-send');
      }
    }
    if (!cxml.includes('AI分析結果')) {
      const sc = await scrollUntilHeading('AI分析結果', 'v16-concierge-enh', 25);
      cxml = sc.xml;
    }
    shot('v16-07-concierge-enhanced');
    concierge.enhancedFound = cxml.includes('AI分析結果');
    concierge.phase24InConcierge = cxml.includes('Analyst Consensus Intelligence (Phase24)');
    concierge.phase231InConcierge = cxml.includes('Phase23.1 Cross Signal');
    concierge.markers = countMarkers(cxml, CONCIERGE_MARKERS);
    concierge.openAiGateClosed = cxml.includes('AI Input Gate') && cxml.includes('閉鎖');
    concierge.openAiUnset = cxml.includes('openai') && cxml.includes('未設定');
  } catch (e) {
    concierge.error = String(e.message ?? e);
    shot('v16-06-concierge-fail');
  }

  const fatalsAfter = (sh('adb logcat -d -s AndroidRuntime:E 2>&1', { stdio: ['pipe', 'pipe', 'ignore'] }).match(/FATAL EXCEPTION/g) ?? []).length;
  const anr = /ANR in com\.assistant\.stocktrading/i.test(
    sh('adb logcat -d -s ActivityManager:I 2>&1', { stdio: ['pipe', 'pipe', 'ignore'] }),
  );

  const maybank = stockScan.find((s) => s.code === '1155');
  const result = {
    commit,
    commitShort,
    versionCode: vc ? Number(vc) : null,
    device: sh('adb devices -l').split('\n').find((l) => l.includes('device') && !l.includes('List')),
    startedAt: new Date().toISOString(),
    materialLoaded: mat.loaded,
    phase24: {
      headingFound: p24.found,
      scrolls: p24.scrolls,
      markers: countMarkers(p24.xml, PHASE24_MARKERS),
      total: PHASE24_MARKERS.length,
    },
    phase231: {
      headingFound: p231.found,
      scrolls: p231.scrolls,
      markers: countMarkers(p231.xml, PHASE231_MARKERS),
      total: PHASE231_MARKERS.length,
    },
    maybank1155: maybank?.phase24
      ? {
          phase24HeadingFound: maybank.phase24.headingFound,
          phase24Markers: maybank.phase24.markers,
          phase231HeadingFound: maybank.phase231.headingFound,
          phase231Markers: maybank.phase231.markers,
        }
      : null,
    stocks: stockScan,
    concierge,
    crashFree: fatalsAfter === fatalsBefore && !anr,
    fatalsBefore,
    fatalsAfter,
    anr,
    pass:
      mat.loaded &&
      p24.found &&
      p231.found &&
      (maybank?.phase24?.headingFound ?? false) &&
      concierge.panelOpen &&
      concierge.enhancedFound &&
      fatalsAfter === fatalsBefore,
    screenshots: fs.readdirSync(OUT).filter((f) => f.startsWith('v16-') && f.endsWith('.png')),
  };

  fs.writeFileSync(path.join(OUT, 'revalidation-results-focused.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
