import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT = path.join('docs', 'review', 'rakuten-import-r25-screenshots');
const PKG = 'com.assistant.stocktrading';
const APK = path.join('artifacts', 'preview-v25-rakuten-import-r25.apk');

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function dump() {
  sh('adb shell uiautomator dump /sdcard/ui-rakuten-r25.xml');
  return sh('adb shell cat /sdcard/ui-rakuten-r25.xml');
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
  const remote = `/sdcard/rakuten-r25-${name}.png`;
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

async function openConciergeTab() {
  let xml = dump();
  const tab = findLabels(xml, (l) => l === 'AI相談' || l === 'コンシェルジュ');
  if (tab[0]) sh(`adb shell input tap ${tab[0].cx} ${tab[0].cy}`);
  else sh('adb shell input tap 360 2550');
  await sleep(2500);
  return dump();
}

async function sendNl(text) {
  let xml = dump();
  const input = findLabels(xml, (l) => l.includes('メッセージ') || l.includes('質問'));
  if (input[0]) sh(`adb shell input tap ${input[0].cx} ${input[0].cy}`);
  else sh('adb shell input tap 600 2400');
  await sleep(400);
  sh(`adb shell input text ${text}`);
  await sleep(400);
  xml = dump();
  const send = findLabels(xml, (l) => l === 'send' || l.includes('送信'));
  if (send[0]) sh(`adb shell input tap ${send[0].cx} ${send[0].cy}`);
  else sh('adb shell input tap 1150 2400');
  await sleep(3500);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  await wakeDevice();
  sh(`adb install -r ${APK}`);
  await sleep(2000);
  sh(`adb shell am force-stop ${PKG}`);
  sh(`adb shell monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);
  await sleep(5000);
  let xml = dump();
  xml = await dismissDialogs(xml);
  await openConciergeTab();
  await screenshot('01-concierge-home');

  await sendNl('RM500%swithdrawal');
  await screenshot('02-nl-withdrawal-card');

  sh('adb shell input keyevent KEYCODE_BACK');
  await sleep(1200);
  await openConciergeTab();
  await sendNl('Maybank%sgot%sRM50%sdividend');
  await screenshot('03-nl-dividend-card');

  sh('adb shell input keyevent KEYCODE_BACK');
  await sleep(1200);
  await openConciergeTab();
  await sendNl('brokerage%sfee%sRM8');
  await screenshot('04-nl-fee-card');

  const meta = {
    apk: APK,
    versionCode: 25,
    device: sh('adb shell getprop ro.product.model'),
    capturedAt: new Date().toISOString(),
    screenshots: [
      '01-concierge-home.png',
      '02-nl-withdrawal-card.png',
      '03-nl-dividend-card.png',
      '04-nl-fee-card.png',
    ],
  };
  fs.writeFileSync(path.join(OUT, 'capture-meta.json'), JSON.stringify(meta, null, 2));
  console.log('done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
