import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT = path.join('docs', 'review', 'phase-a-screenshots');
const PKG = 'com.assistant.stocktrading';

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function dump() {
  sh('adb shell uiautomator dump /sdcard/ui-phase-a.xml');
  return sh('adb shell cat /sdcard/ui-phase-a.xml');
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
  const remote = `/sdcard/phase-a-${name}.png`;
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

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  sh('adb shell input keyevent 4');
  await sleep(500);
  sh(`adb shell am force-stop ${PKG}`);
  sh(`adb shell am start -n ${PKG}/.MainActivity`);
  await sleep(10000);

  let xml = dump();
  xml = await dismissDialogs(xml);

  try {
    sh('adb shell cmd statusbar collapse');
  } catch {
    /* ignore */
  }
  await sleep(800);

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

  await screenshot('01-settings-beginner-mode');
  sh('adb shell input keyevent 4');
  await sleep(2000);

  xml = dump();
  await screenshot('02-home-4-tabs');

  tapFirst(xml, (l) => l === '銘柄チェック' || l.includes('銘柄チェック'), 'material tab');
  await sleep(4000);
  await screenshot('03-stock-check-no-phase');

  sh('adb shell input keyevent 4');
  await sleep(1500);
  xml = dump();
  tapFirst(xml, (l) => l === 'AI相談' || l.includes('AI相談'), 'concierge tab');
  await sleep(4000);
  await screenshot('04-ai-consult-tab');

  sh('adb shell input keyevent 4');
  await sleep(1500);
  xml = dump();
  const fab = findLabels(xml, (l) => l.includes('AIコンシェルジュ') || l.includes('コンシェルジュを開く'));
  console.log('FAB visible:', fab.length > 0 ? fab.map((f) => f.label) : 'none');
  await screenshot('05-home-no-fab');

  fs.writeFileSync(
    path.join(OUT, 'capture-meta.json'),
    JSON.stringify(
      {
        apk: 'artifacts/preview-v18-phase-a.apk',
        versionCode: 18,
        device: sh('adb get-serialno'),
        fabVisibleInBeginner: fab.length > 0,
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
