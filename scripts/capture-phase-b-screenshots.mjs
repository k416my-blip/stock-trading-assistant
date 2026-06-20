import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT = path.join('docs', 'review', 'phase-b-screenshots');
const PKG = 'com.assistant.stocktrading';

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function dump() {
  sh('adb shell uiautomator dump /sdcard/ui-phase-b.xml');
  return sh('adb shell cat /sdcard/ui-phase-b.xml');
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
  const remote = `/sdcard/phase-b-${name}.png`;
  sh(`adb shell screencap -p ${remote}`);
  const local = path.join(OUT, `${name}.png`);
  sh(`adb pull ${remote} ${local}`);
  console.log('screenshot:', local);
  return local;
}

async function dismissDialogs(xml) {
  for (const label of ['スキップ', '閉じる', 'OK', 'キャンセル']) {
    const hits = findLabels(xml, (l) => l === label);
    if (hits[0]) {
      sh(`adb shell input tap ${hits[0].cx} ${hits[0].cy}`);
      await sleep(1200);
      return dump();
    }
  }
  return xml;
}

async function ensureBeginnerMode(xml) {
  tapFirst(
    xml,
    (l) => l === '設定' || l.includes('設定') || l.includes('settings'),
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
  sh('adb shell input keyevent 4');
  await sleep(500);
  sh(`adb shell am force-stop ${PKG}`);
  sh(`adb shell am start -n ${PKG}/.MainActivity`);
  await sleep(10000);

  let xml = dump();
  xml = await dismissDialogs(xml);
  xml = await ensureBeginnerMode(xml);

  try {
    sh('adb shell cmd statusbar collapse');
  } catch {
    /* ignore */
  }
  await sleep(800);

  await screenshot('01-home-advice-card');

  tapFirst(xml, (l) => l === '保有銘柄' || l.includes('保有'), 'portfolio tab', { cx: 360, cy: 2650 });
  await sleep(4000);
  await screenshot('02-portfolio-hold-card');

  sh('adb shell input keyevent 4');
  await sleep(1500);
  xml = dump();
  tapFirst(xml, (l) => l === 'AI相談' || l.includes('AI相談'), 'concierge tab', { cx: 900, cy: 2650 });
  await sleep(4000);
  await screenshot('03-concierge-quick-actions');

  sh('adb shell input keyevent 4');
  await sleep(1500);
  xml = dump();
  tapFirst(xml, (l) => l === '銘柄チェック' || l.includes('銘柄チェック'), 'material tab', { cx: 630, cy: 2650 });
  await sleep(5000);
  await screenshot('04-material-advice-card');

  fs.writeFileSync(
    path.join(OUT, 'capture-meta.json'),
    JSON.stringify(
      {
        apk: 'artifacts/preview-v19-phase-b.apk',
        versionCode: 19,
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
