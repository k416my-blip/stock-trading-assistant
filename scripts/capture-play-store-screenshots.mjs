/**
 * Play Store screenshot capture — Standard mode (5 screens)
 * node scripts/capture-play-store-screenshots.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT = path.join('docs', 'store-assets', 'screenshots', 'phone');
const PKG = 'com.assistant.stocktrading';

const SCREENS = [
  { id: '01-home', tab: 'ホーム', fallback: { cx: 76, cy: 2541 } },
  { id: '02-ai-consult', tab: 'AI相談', fallback: { cx: 991, cy: 2541 } },
  { id: '03-portfolio', tab: '保有銘柄', fallback: { cx: 228, cy: 2541 } },
  { id: '04-stock-check', tab: '銘柄チェック', fallback: { cx: 380, cy: 2541 } },
  { id: '05-settings', tab: '設定', fallback: { cx: 1117, cy: 2541 } },
];

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function dump() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      sh('adb shell uiautomator dump /sdcard/ui-play-store.xml');
      return sh('adb shell cat /sdcard/ui-play-store.xml');
    } catch (e) {
      if (attempt === 2) throw e;
    }
  }
  return '';
}

function findLabels(xml, pred) {
  const re = /(?:text|content-desc)="([^"]*)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g;
  const out = [];
  let m;
  while ((m = re.exec(xml))) {
    const label = m[1];
    const x1 = +m[2];
    const y1 = +m[3];
    const x2 = +m[4];
    const y2 = +m[5];
    if (x2 <= x1 || y2 <= y1) continue;
    if (pred(label)) {
      out.push({ label, cx: Math.floor((x1 + x2) / 2), cy: Math.floor((y1 + y2) / 2) });
    }
  }
  return out;
}

function bottomTab(xml, label) {
  const hits = findLabels(
    xml,
    (t) => t === label || t.startsWith(label) || t.includes(label),
  ).filter((h) => h.cy > 2300);
  hits.sort((a, b) => a.cx - b.cx);
  return hits[0] ?? null;
}

async function wakeDevice() {
  sh('adb shell input keyevent 224');
  await sleep(600);
  sh('adb shell input swipe 610 2400 610 800 300');
  await sleep(1000);
}

async function launchApp() {
  sh(`adb shell am force-stop ${PKG}`);
  await sleep(500);
  sh(`adb shell am start -n ${PKG}/.MainActivity`);
  await sleep(4500);
}

async function dismissOverlays() {
  for (const label of ['スキップ', '閉じる', 'OK', '後で', '許可']) {
    const xml = dump();
    const hits = findLabels(xml, (l) => l === label);
    if (hits[0]) {
      sh(`adb shell input tap ${hits[0].cx} ${hits[0].cy}`);
      await sleep(800);
    }
  }
}

async function ensureStandardMode() {
  const xml = dump();
  if (bottomTab(xml, '設定')) return;
  sh('adb shell input tap 1144 223');
  await sleep(2500);
  const settingsXml = dump();
  const stdHits = findLabels(settingsXml, (t) => t === '標準');
  if (stdHits[0]) {
    sh(`adb shell input tap ${stdHits[0].cx} ${stdHits[0].cy}`);
    await sleep(3000);
  }
  await launchApp();
}

async function tapBottomTab(label, fallback) {
  const xml = dump();
  const hit = bottomTab(xml, label);
  if (hit) {
    console.log(`tap tab ${label} at`, hit);
    sh(`adb shell input tap ${hit.cx} ${hit.cy}`);
  } else if (fallback) {
    console.log(`fallback tab ${label} at`, fallback);
    sh(`adb shell input tap ${fallback.cx} ${fallback.cy}`);
  } else {
    throw new Error(`tab not found: ${label}`);
  }
  await sleep(2500);
}

async function screenshot(name) {
  fs.mkdirSync(OUT, { recursive: true });
  const remote = `/sdcard/play-store-${name}.png`;
  sh(`adb shell screencap -p ${remote}`);
  const local = path.join(OUT, `${name}.png`);
  sh(`adb pull ${remote} ${local}`);
  console.log('screenshot:', local);
  return local;
}

async function main() {
  const meta = {
    capturedAt: new Date().toISOString(),
    device: sh('adb get-serialno'),
    mode: 'standard',
    versionCode: null,
    shots: [],
  };

  try {
    const line = sh(`adb shell dumpsys package ${PKG}`);
    const m = line.match(/versionCode=(\d+)/);
    if (m) meta.versionCode = Number(m[1]);
  } catch {
    /* ignore */
  }

  await wakeDevice();
  await launchApp();
  await dismissOverlays();
  await ensureStandardMode();
  await dismissOverlays();

  for (const screen of SCREENS) {
    await tapBottomTab(screen.tab, screen.fallback);
    await dismissOverlays();
    const file = await screenshot(screen.id);
    meta.shots.push({ id: screen.id, tab: screen.tab, file });
  }

  fs.writeFileSync(path.join(OUT, 'capture-meta.json'), JSON.stringify(meta, null, 2));
  console.log('\nDone.', path.join(OUT, 'capture-meta.json'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
