/**
 * UX2.0a device audit capture — 6 screens + settings (Beginner)
 * node scripts/capture-ai-concierge-ux-audit.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT = path.join('docs', 'review', 'ai-concierge-ux-audit');
const PKG = 'com.assistant.stocktrading';
const GEAR = { cx: 1144, cy: 223 };

const MODES = [
  { id: 'beginner', label: '初心者', conciergeTap: { cx: 1067, cy: 2541 }, homeTap: { cx: 152, cy: 2541 } },
  { id: 'standard', label: '標準', conciergeTap: { cx: 991, cy: 2541 }, homeTap: { cx: 76, cy: 2541 } },
  { id: 'pro', label: 'プロ', conciergeTap: { cx: 991, cy: 2541 }, homeTap: { cx: 76, cy: 2541 } },
];

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

async function wake() {
  sh('adb shell input keyevent 224');
  await sleep(600);
  sh('adb shell input swipe 610 2400 610 800 300');
  await sleep(1000);
}

async function launch() {
  sh(`adb shell am force-stop ${PKG}`);
  await sleep(500);
  sh(`adb shell am start -n ${PKG}/.MainActivity`);
  await sleep(5000);
}

async function screenshot(name) {
  fs.mkdirSync(OUT, { recursive: true });
  const remote = `/sdcard/audit-${name}.png`;
  sh(`adb shell screencap -p ${remote}`);
  const local = path.join(OUT, `${name}.png`);
  sh(`adb pull ${remote} ${local}`);
  console.log('screenshot:', local);
  return local;
}

async function setMode(label, y) {
  sh(`adb shell input tap ${GEAR.cx} ${GEAR.cy}`);
  await sleep(2000);
  sh(`adb shell input tap 569 ${y}`);
  await sleep(2000);
  await launch();
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

  await wake();

  const modeY = { 初心者: 971, 標準: 1213, プロ: 1397 };

  for (const mode of MODES) {
    console.log('\n===', mode.id, '===');
    await setMode(mode.label, modeY[mode.label]);
    sh(`adb shell input tap ${mode.homeTap.cx} ${mode.homeTap.cy}`);
    await sleep(3000);
    const home = await screenshot(`${mode.id}-home`);
    meta.shots.push({ mode: mode.id, screen: 'home', file: home });
    sh(`adb shell input tap ${mode.conciergeTap.cx} ${mode.conciergeTap.cy}`);
    await sleep(4000);
    const concierge = await screenshot(`${mode.id}-concierge`);
    meta.shots.push({ mode: mode.id, screen: 'concierge', file: concierge });
  }

  await setMode('初心者', modeY['初心者']);
  sh(`adb shell input tap ${GEAR.cx} ${GEAR.cy}`);
  await sleep(2000);
  const settings = await screenshot('beginner-settings-top');
  meta.shots.push({ mode: 'beginner', screen: 'settings-top', file: settings });
  sh('adb shell input swipe 540 1800 540 400 500');
  await sleep(1200);
  const settingsScroll = await screenshot('beginner-settings-scroll');
  meta.shots.push({ mode: 'beginner', screen: 'settings-scroll', file: settingsScroll });

  fs.writeFileSync(path.join(OUT, 'capture-meta.json'), JSON.stringify(meta, null, 2));
  console.log('\nDone');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
