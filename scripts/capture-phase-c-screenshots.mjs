import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT = path.join('docs', 'review', 'phase-c-screenshots');
const PKG = 'com.assistant.stocktrading';
const ONBOARDING_KEY = '@sta/beginner_onboarding_seen_v1';

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function dump() {
  sh('adb shell uiautomator dump /sdcard/ui-phase-c.xml');
  return sh('adb shell cat /sdcard/ui-phase-c.xml');
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
  const remote = `/sdcard/phase-c-${name}.png`;
  sh(`adb shell screencap -p ${remote}`);
  const local = path.join(OUT, `${name}.png`);
  sh(`adb pull ${remote} ${local}`);
  console.log('screenshot:', local);
  return local;
}

async function clearOnboardingFlag() {
  try {
    sh(`adb shell run-as ${PKG} rm -f files/RKStorage/* 2>/dev/null || true`);
  } catch {
    /* ignore */
  }
  try {
    sh(
      `adb shell "run-as ${PKG} sh -c 'echo null > /data/data/${PKG}/files/RKStorage/${ONBOARDING_KEY}'"`,
    );
  } catch {
    /* ignore */
  }
  try {
    sh(`adb shell pm clear ${PKG}`);
    console.log('cleared app data for fresh onboarding');
  } catch (e) {
    console.warn('pm clear failed, onboarding may not show:', e.message);
  }
}

async function ensureBeginnerMode(xml) {
  tapFirst(
    xml,
    (l) => l === '設定' || l.includes('設定'),
    'settings',
    { cx: 1140, cy: 180, label: 'gear-fallback' },
  );
  await sleep(2500);
  xml = dump();
  const beginner = findLabels(xml, (l) => l === '初心者');
  if (beginner[0]) {
    sh(`adb shell input tap ${beginner[0].cx} ${beginner[0].cy}`);
    await sleep(2000);
  }
  sh('adb shell input keyevent 4');
  await sleep(2000);
  return dump();
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  await clearOnboardingFlag();
  sh('adb shell input keyevent 4');
  await sleep(500);
  sh(`adb shell am force-stop ${PKG}`);
  sh(`adb shell am start -n ${PKG}/.MainActivity`);
  await sleep(12000);

  let xml = dump();
  const onboardingVisible = findLabels(xml, (l) => l === 'ようこそ' || l.includes('ようこそ'));
  if (!onboardingVisible[0]) {
    console.log('onboarding not visible, ensuring beginner mode...');
    xml = await ensureBeginnerMode(xml);
    sh(`adb shell am force-stop ${PKG}`);
    sh(`adb shell am start -n ${PKG}/.MainActivity`);
    await sleep(12000);
    xml = dump();
  }

  await screenshot('01-onboarding-step-1');

  tapFirst(xml, (l) => l === '次へ', 'next step 1', { cx: 900, cy: 1400 });
  await sleep(2000);
  await screenshot('02-onboarding-step-2');

  xml = dump();
  tapFirst(xml, (l) => l === '次へ', 'next step 2', { cx: 540, cy: 1500 });
  await sleep(2000);
  await screenshot('03-onboarding-step-3');

  xml = dump();
  tapFirst(
    xml,
    (l) => l.includes('ホームではじめる'),
    'finish onboarding',
    { cx: 540, cy: 1550 },
  );
  await sleep(3000);

  xml = dump();
  tapFirst(xml, (l) => l === '銘柄チェック' || l.includes('銘柄チェック'), 'material tab', {
    cx: 630,
    cy: 2650,
  });
  await sleep(5000);
  sh('adb shell input swipe 540 1800 540 600 400');
  await sleep(1500);
  await screenshot('04-material-beginner-stock-card');

  fs.writeFileSync(
    path.join(OUT, 'capture-meta.json'),
    JSON.stringify(
      {
        apk: 'artifacts/preview-v20-phase-c.apk',
        versionCode: 20,
        device: sh('adb get-serialno'),
        capturedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
