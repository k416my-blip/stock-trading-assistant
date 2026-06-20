/**
 * UX2.0a evidence capture — Home + AI相談 for Beginner / Standard / Pro
 * node scripts/capture-ux20a-screenshots.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT = path.join('docs', 'review', 'ux20a-screenshots');
const PKG = 'com.assistant.stocktrading';
const GEAR = { cx: 1144, cy: 223 };

async function wakeDevice() {
  sh('adb shell input keyevent 224');
  await sleep(800);
  sh('adb shell input swipe 610 2400 610 800 300');
  await sleep(1200);
}

const MODES = [
  { id: 'beginner', label: '初心者', tabY: 2541 },
  { id: 'standard', label: '標準', tabY: 2541 },
  { id: 'pro', label: 'プロ', tabY: 2541 },
];

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function dump() {
  sh('adb shell uiautomator dump /sdcard/ui-ux20a.xml');
  return sh('adb shell cat /sdcard/ui-ux20a.xml');
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

function tapFirst(xml, pred, label, fallback) {
  const hits = findLabels(xml, pred);
  if (hits[0]) {
    sh(`adb shell input tap ${hits[0].cx} ${hits[0].cy}`);
    return hits[0];
  }
  if (fallback) {
    sh(`adb shell input tap ${fallback.cx} ${fallback.cy}`);
    console.log(`fallback tap ${label}:`, fallback);
    return fallback;
  }
  throw new Error(`tap target not found: ${label}`);
}

async function screenshot(name) {
  fs.mkdirSync(OUT, { recursive: true });
  const remote = `/sdcard/ux20a-${name}.png`;
  sh(`adb shell screencap -p ${remote}`);
  const local = path.join(OUT, `${name}.png`);
  sh(`adb pull ${remote} ${local}`);
  console.log('screenshot:', local);
  return local;
}

async function launchApp() {
  sh(`adb shell am force-stop ${PKG}`);
  await sleep(800);
  sh(`adb shell am start -n ${PKG}/.MainActivity`);
  await sleep(3500);
}

async function openSettings() {
  let xml = dump();
  const gear = findLabels(
    xml,
    (t) => t.includes('設定') || t.toLowerCase().includes('settings') || t.includes('歯車'),
  );
  if (gear[0]) {
    sh(`adb shell input tap ${gear[0].cx} ${gear[0].cy}`);
    await sleep(2000);
    return;
  }
  sh(`adb shell input tap ${GEAR.cx} ${GEAR.cy}`);
  await sleep(2000);
}

async function setUxMode(modeLabel) {
  await openSettings();
  let xml = dump();
  sh('adb shell input swipe 540 1800 540 400 500');
  await sleep(1000);
  xml = dump();
  tapFirst(
    xml,
    (t) => t === modeLabel || t.startsWith(modeLabel),
    `UX mode ${modeLabel}`,
    null,
  );
  await sleep(2500);
  sh('adb shell input keyevent 4');
  await sleep(800);
  sh('adb shell input keyevent 4');
  await sleep(1500);
}

async function tapHomeTab() {
  sh('adb shell input tap 135 2541');
  await sleep(2000);
}

async function tapConciergeTab(tabY) {
  let xml = dump();
  const hits = findLabels(xml, (t) => t === 'AI相談' || t.includes('AI相談'));
  if (hits[0]) {
    sh(`adb shell input tap ${hits[0].cx} ${hits[0].cy}`);
  } else {
    sh(`adb shell input tap 810 ${tabY}`);
  }
  await sleep(3000);
}

async function main() {
  const meta = {
    capturedAt: new Date().toISOString(),
    device: sh('adb get-serialno'),
    versionCode: null,
    shots: [],
  };

  try {
    const dumpsys = sh(`adb shell dumpsys package ${PKG} | findstr versionCode`);
    const m = dumpsys.match(/versionCode=(\d+)/);
    if (m) meta.versionCode = Number(m[1]);
  } catch {
    /* ignore */
  }

  await wakeDevice();
  await launchApp();

  for (const mode of MODES) {
    console.log('\n=== mode:', mode.id, '===');
    await setUxMode(mode.label);
    await launchApp();
    await tapHomeTab();
    const homeShot = await screenshot(`${mode.id}-home`);
    meta.shots.push({ mode: mode.id, screen: 'home', file: homeShot });
    await tapConciergeTab(mode.tabY);
    const conciergeShot = await screenshot(`${mode.id}-concierge`);
    meta.shots.push({ mode: mode.id, screen: 'concierge', file: conciergeShot });
  }

  fs.writeFileSync(path.join(OUT, 'capture-meta.json'), JSON.stringify(meta, null, 2));
  console.log('\nDone. Meta:', path.join(OUT, 'capture-meta.json'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
