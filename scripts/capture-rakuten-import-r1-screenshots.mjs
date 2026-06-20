import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT = path.join('docs', 'review', 'rakuten-import-r1-screenshots');
const PKG = 'com.assistant.stocktrading';

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function dump() {
  sh('adb shell uiautomator dump /sdcard/ui-rakuten-r1.xml');
  return sh('adb shell cat /sdcard/ui-rakuten-r1.xml');
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
    return fallback;
  }
  throw new Error(`tap target not found: ${label}`);
}

async function screenshot(name) {
  const remote = `/sdcard/rakuten-r1-${name}.png`;
  sh(`adb shell screencap -p ${remote}`);
  const local = path.join(OUT, `${name}.png`);
  sh(`adb pull ${remote} ${local}`);
  console.log('screenshot:', local);
  return local;
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

async function ensureStandardMode(xml) {
  const standard = findLabels(xml, (l) => l === '標準');
  if (standard[0]) {
    sh(`adb shell input tap ${standard[0].cx} ${standard[0].cy}`);
    await sleep(1500);
    return dump();
  }
  return xml;
}

async function openSettingsScreen(xml) {
  const tab = findLabels(xml, (l) => l === '設定');
  if (tab[0]) {
    sh(`adb shell input tap ${tab[0].cx} ${tab[0].cy}`);
    await sleep(2000);
    return dump();
  }
  tapFirst(xml, (l) => l === 'ホーム', 'home-tab', { cx: 120, cy: 2550 });
  await sleep(1500);
  xml = dump();
  const gear = findLabels(xml, (l) => l === '設定');
  if (gear[0]) {
    sh(`adb shell input tap ${gear[0].cx} ${gear[0].cy}`);
    await sleep(2000);
    return dump();
  }
  // header gear fallback (1220x2712 class devices)
  sh('adb shell input tap 1150 140');
  await sleep(2000);
  xml = dump();
  if (xml.includes('表示モード') || xml.includes('APIキー設定')) {
    return xml;
  }
  sh('adb shell input tap 1050 2580');
  await sleep(2000);
  return dump();
}

async function openRakutenImport(xml) {
  for (let i = 0; i < 12; i++) {
    const hits = findLabels(xml, (l) => l.includes('Rakuten取引記録'));
    if (hits[0]) {
      sh(`adb shell input tap ${hits[0].cx} ${hits[0].cy}`);
      await sleep(2000);
      return dump();
    }
    sh('adb shell input swipe 600 1800 600 600 400');
    await sleep(800);
    xml = dump();
  }
  throw new Error('Rakuten取引記録 row not found');
}

async function tapKind(xml, kindJa) {
  tapFirst(xml, (l) => l === kindJa, kindJa, null);
  await sleep(600);
}

async function tapContinue(xml) {
  const hits = findLabels(xml, (l) => l.includes('確認画面'));
  if (hits[0]) {
    sh(`adb shell input tap ${hits[0].cx} ${hits[0].cy}`);
  } else {
    sh('adb shell input tap 600 2450');
  }
  await sleep(2000);
}

async function fillBuyFields(symbol, price) {
  let xml = dump();
  const symLabel = findLabels(xml, (l) => l.includes('銘柄コード'));
  if (symLabel[0]) {
    sh(`adb shell input tap ${symLabel[0].cx} ${symLabel[0].cy + 55}`);
    await sleep(300);
    sh(`adb shell input text ${symbol}`);
  }
  await sleep(400);
  xml = dump();
  const priceLabel = findLabels(xml, (l) => l.includes('約定単価'));
  if (priceLabel[0]) {
    sh(`adb shell input tap ${priceLabel[0].cx} ${priceLabel[0].cy + 55}`);
    await sleep(300);
    sh(`adb shell input text ${price}`);
  }
  await sleep(400);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  await wakeDevice();
  sh(`adb shell am force-stop ${PKG}`);
  sh(`adb shell monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);
  await sleep(5000);
  let xml = dump();
  xml = await dismissDialogs(xml);
  xml = await openSettingsScreen(xml);
  xml = await ensureStandardMode(xml);
  xml = await openRakutenImport(xml);
  await screenshot('01-deposit-entry');

  await tapContinue(xml);
  xml = dump();
  await screenshot('02-deposit-confirm');

  tapFirst(xml, (l) => l.includes('修正'), 'back-edit', null);
  await sleep(1500);
  xml = dump();

  await tapKind(xml, '買付');
  await fillBuyFields('1155', '10');
  await screenshot('03-buy-entry');

  xml = dump();
  await tapContinue(xml);
  xml = dump();
  await screenshot('04-buy-confirm');

  const commitHits = findLabels(xml, (l) => l.includes('記録する'));
  if (commitHits[0]) {
    sh(`adb shell input tap ${commitHits[0].cx} ${commitHits[0].cy}`);
  } else {
    sh('adb shell input tap 600 2350');
  }
  await sleep(2000);
  xml = dump();
  xml = await dismissDialogs(xml);

  xml = await openSettingsScreen(xml);
  xml = await ensureStandardMode(xml);
  xml = await openRakutenImport(xml);
  await tapKind(xml, '売却');
  await fillBuyFields('1155', '11');
  await screenshot('05-sell-entry');

  xml = dump();
  await tapContinue(xml);
  xml = dump();
  await screenshot('06-sell-confirm');

  const meta = {
    apk: 'artifacts/preview-v23-rakuten-import-r1.apk',
    device: sh('adb shell getprop ro.product.model'),
    capturedAt: new Date().toISOString(),
    screenshots: [
      '01-deposit-entry.png',
      '02-deposit-confirm.png',
      '03-buy-entry.png',
      '04-buy-confirm.png',
      '05-sell-entry.png',
      '06-sell-confirm.png',
    ],
  };
  fs.writeFileSync(path.join(OUT, 'capture-meta.json'), JSON.stringify(meta, null, 2));
  console.log('done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
