/**
 * Device NL validation — send phrases in AI Concierge and capture confirm cards.
 * Usage: node scripts/capture-rakuten-import-validation-screenshots.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT = path.join('docs', 'review', 'rakuten-import-validation', 'screenshots');
const PKG = 'com.assistant.stocktrading';

const PHRASES = [
  { id: '01-deposit', adbText: '500%E3%83%AA%E3%83%B3%E3%82%AE%E3%83%83%E3%83%88%E5%85%A5%E9%87%91%E3%81%97%E3%81%9F', label: '500リンギット入金した' },
  { id: '02-buy', adbText: 'Maybank%E3%82%92RM9.20%E3%81%A7100%E6%A0%AA%E8%B2%B7%E3%81%A3%E3%81%9F', label: 'MaybankをRM9.20で100株買った' },
  { id: '03-dividend', adbText: 'Maybank%E3%81%AE%E9%85%8D%E5%BD%93%E3%81%8CRM50%E5%85%A5%E3%81%A3%E3%81%9F', label: 'Maybankの配当がRM50入った' },
  { id: '04-withdrawal', adbText: 'RM500%20withdrawal', label: 'RM500 withdrawal' },
];

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function adbOk() {
  try {
    const out = sh('adb devices');
    return out.split('\n').some((l) => l.includes('\tdevice'));
  } catch {
    return false;
  }
}

function dump() {
  sh('adb shell uiautomator dump /sdcard/ui-rakuten-val.xml');
  return sh('adb shell cat /sdcard/ui-rakuten-val.xml');
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
  const remote = `/sdcard/rakuten-val-${name}.png`;
  sh(`adb shell screencap -p ${remote}`);
  const local = path.join(OUT, `${name}.png`);
  sh(`adb pull ${remote} ${local}`);
  console.log('screenshot:', local);
  return `${name}.png`;
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

async function sendNl(adbText) {
  let xml = dump();
  const input = findLabels(xml, (l) => l.includes('メッセージ') || l.includes('質問'));
  if (input[0]) sh(`adb shell input tap ${input[0].cx} ${input[0].cy}`);
  else sh('adb shell input tap 600 2400');
  await sleep(400);
  sh(`adb shell input text ${adbText}`);
  await sleep(400);
  xml = dump();
  const send = findLabels(xml, (l) => l === 'send' || l.includes('送信'));
  if (send[0]) sh(`adb shell input tap ${send[0].cx} ${send[0].cy}`);
  else sh('adb shell input tap 1150 2400');
  await sleep(4000);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  if (!adbOk()) {
    const meta = {
      skipped: true,
      reason: 'adb device not connected',
      capturedAt: new Date().toISOString(),
      screenshots: [],
    };
    fs.writeFileSync(path.join(OUT, 'capture-meta.json'), JSON.stringify(meta, null, 2));
    console.warn('adb not available — wrote skip meta');
    return;
  }

  await wakeDevice();
  sh(`adb shell am force-stop ${PKG}`);
  sh(`adb shell monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);
  await sleep(5000);
  let xml = dump();
  xml = await dismissDialogs(xml);
  await openConciergeTab();
  const captured = [];
  await screenshot('00-concierge-home');
  captured.push('00-concierge-home.png');

  for (const p of PHRASES) {
    await sendNl(p.adbText);
    const file = await screenshot(p.id);
    captured.push(file);
    sh('adb shell input keyevent KEYCODE_BACK');
    await sleep(1500);
    await openConciergeTab();
  }

  const meta = {
    skipped: false,
    device: sh('adb shell getprop ro.product.model'),
    capturedAt: new Date().toISOString(),
    phrases: PHRASES.map((p) => p.label),
    screenshots: captured,
  };
  fs.writeFileSync(path.join(OUT, 'capture-meta.json'), JSON.stringify(meta, null, 2));
  console.log('done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
