/**
 * UX2.0b evidence capture — Home + AI相談 + 設定 for Beginner / Standard / Pro
 * node scripts/capture-ux20b-screenshots.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT = path.join('docs', 'review', 'ux20b-screenshots');
const PKG = 'com.assistant.stocktrading';
const GEAR = { cx: 1144, cy: 223 };

const TAB_HOME = '\u30DB\u30FC\u30E0';
const TAB_CONCIERGE = 'AI\u76F8\u8AC7';
const TAB_SETTINGS = '\u8A2D\u5B9A';

const MODE_LABEL = {
  beginner: '\u521D\u5FC3\u8005',
  standard: '\u6A19\u6E96',
  pro: '\u30D7\u30ED',
};

const MODES = [
  { id: 'beginner', settingsViaTab: false },
  { id: 'standard', settingsViaTab: true },
  { id: 'pro', settingsViaTab: false },
];

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function dump() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      sh('adb shell uiautomator dump /sdcard/ui-ux20b.xml');
      return sh('adb shell cat /sdcard/ui-ux20b.xml');
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

async function screenshot(name) {
  fs.mkdirSync(OUT, { recursive: true });
  const remote = `/sdcard/ux20b-${name}.png`;
  sh(`adb shell screencap -p ${remote}`);
  const local = path.join(OUT, `${name}.png`);
  sh(`adb pull ${remote} ${local}`);
  console.log('screenshot:', local);
  return local;
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

async function openSettings(currentMode) {
  if (currentMode?.settingsViaTab) {
    await tapBottomTab(TAB_SETTINGS, { cx: 1117, cy: 2541 });
    return;
  }
  await tapBottomTab(TAB_HOME, { cx: 152, cy: 2541 });
  sh(`adb shell input tap ${GEAR.cx} ${GEAR.cy}`);
  await sleep(2500);
}

async function tapUxMode(modeId) {
  const label = MODE_LABEL[modeId];
  const fallbackY = { beginner: 971, standard: 1213, pro: 1397 }[modeId];
  const xml = dump();
  const hits = findLabels(xml, (t) => t === label);
  if (hits[0]) {
    console.log(`tap mode ${modeId} via label at`, hits[0]);
    sh(`adb shell input tap ${hits[0].cx} ${hits[0].cy}`);
  } else {
    console.log(`fallback tap mode ${modeId} at y=${fallbackY}`);
    sh(`adb shell input tap 576 ${fallbackY}`);
  }
  await sleep(3000);
}

async function setUxMode(modeId, currentMode) {
  await openSettings(currentMode);
  await tapUxMode(modeId);
  await launchApp();
  await tapBottomTab(TAB_HOME, { cx: 152, cy: 2541 });
  await sleep(1500);
}

async function captureSettingsScreen(mode) {
  if (mode.settingsViaTab) {
    await tapBottomTab(TAB_SETTINGS, { cx: 1117, cy: 2541 });
  } else {
    await tapBottomTab(TAB_HOME, { cx: 152, cy: 2541 });
    sh(`adb shell input tap ${GEAR.cx} ${GEAR.cy}`);
    await sleep(2500);
  }
}

async function main() {
  const meta = {
    capturedAt: new Date().toISOString(),
    device: sh('adb get-serialno'),
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

  let currentMode = null;

  for (const mode of MODES) {
    console.log('\n=== mode:', mode.id, '===');
    await setUxMode(mode.id, currentMode);
    currentMode = mode;

    const homeShot = await screenshot(`${mode.id}-home`);
    meta.shots.push({ mode: mode.id, screen: 'home', file: homeShot });

    await tapBottomTab(TAB_CONCIERGE, { cx: 1067, cy: 2541 });
    await sleep(1500);
    const conciergeShot = await screenshot(`${mode.id}-concierge`);
    meta.shots.push({ mode: mode.id, screen: 'concierge', file: conciergeShot });

    await captureSettingsScreen(mode);
    await sleep(1500);
    const settingsShot = await screenshot(`${mode.id}-settings`);
    meta.shots.push({ mode: mode.id, screen: 'settings', file: settingsShot });
  }

  fs.writeFileSync(path.join(OUT, 'capture-meta.json'), JSON.stringify(meta, null, 2));
  console.log('\nDone. Meta:', path.join(OUT, 'capture-meta.json'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
