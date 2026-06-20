import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT = path.join('docs', 'review', 'rakuten-import-r3-screenshots');
const PKG = 'com.assistant.stocktrading';
const APK = path.join('artifacts', 'preview-v26-rakuten-import-r3.apk');

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function dump() {
  sh('adb shell uiautomator dump /sdcard/ui-rakuten-r3.xml');
  return sh('adb shell cat /sdcard/ui-rakuten-r3.xml');
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
    if (pred(label)) out.push({ label, cx: Math.floor((x1 + x2) / 2), cy: Math.floor((y1 + y2) / 2) });
  }
  return out;
}

async function screenshot(name) {
  const remote = `/sdcard/rakuten-r3-${name}.png`;
  sh(`adb shell screencap -p ${remote}`);
  const local = path.join(OUT, `${name}.png`);
  sh(`adb pull ${remote} ${local}`);
  console.log('screenshot:', local);
}

async function wakeDevice() {
  sh('adb shell input keyevent KEYCODE_WAKEUP');
  await sleep(800);
  sh('adb shell input swipe 600 2000 600 800 300');
  await sleep(1000);
}

async function dismissDialogs(xml) {
  for (const label of ['スキップ', '閉じる', 'OK', 'キャンセル', '後で']) {
    const hits = findLabels(xml, (l) => l === label);
    if (hits[0]) {
      sh(`adb shell input tap ${hits[0].cx} ${hits[0].cy}`);
      await sleep(1200);
      return dump();
    }
  }
  return xml;
}

async function openSettings() {
  let xml = dump();
  const tab = findLabels(xml, (l) => l === '設定' || l === 'Settings');
  if (tab[0]) sh(`adb shell input tap ${tab[0].cx} ${tab[0].cy}`);
  else sh('adb shell input tap 900 2550');
  await sleep(2500);
  return dump();
}

async function scrollToOcrEntry() {
  for (let i = 0; i < 8; i++) {
    const xml = dump();
    const hit = findLabels(xml, (l) => l.includes('履歴スクショ'));
    if (hit[0]) return xml;
    sh('adb shell input swipe 600 1800 600 600 400');
    await sleep(800);
  }
  return dump();
}

async function openConciergeTab() {
  let xml = dump();
  const tab = findLabels(xml, (l) => l === 'AI相談' || l === 'コンシェルジュ');
  if (tab[0]) sh(`adb shell input tap ${tab[0].cx} ${tab[0].cy}`);
  else sh('adb shell input tap 360 2550');
  await sleep(2500);
  return dump();
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  await wakeDevice();
  if (fs.existsSync(APK)) {
    sh(`adb install -r ${APK}`);
    await sleep(2000);
  } else {
    console.warn('APK not found, skipping install:', APK);
  }
  sh(`adb shell am force-stop ${PKG}`);
  sh(`adb shell monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);
  await sleep(5000);
  let xml = dump();
  xml = await dismissDialogs(xml);

  await openSettings();
  await scrollToOcrEntry();
  await screenshot('01-settings-ocr-entry');

  await openConciergeTab();
  await screenshot('02-concierge-camera-button');

  const meta = {
    apk: APK,
    versionCode: 26,
    device: sh('adb devices').split('\n')[1]?.split('\t')[0] ?? 'unknown',
    capturedAt: new Date().toISOString(),
    screenshots: ['01-settings-ocr-entry.png', '02-concierge-camera-button.png'],
  };
  fs.writeFileSync(path.join(OUT, 'capture-meta.json'), JSON.stringify(meta, null, 2));
  console.log('done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
