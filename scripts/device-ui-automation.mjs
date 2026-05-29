import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function dump(path) {
  sh('adb shell uiautomator dump /sdcard/ui-auto.xml');
  sh(`adb shell cat /sdcard/ui-auto.xml > ${path}`);
  return fs.readFileSync(path, 'utf8');
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

async function main() {
  sh('adb shell am start -n com.assistant.stocktrading/.MainActivity');
  await sleep(12000);

  let xml = dump('scripts/device-ui-auto.xml');
  const skip = findLabels(xml, (l) => l === 'スキップ' || l === '閉じる');
  if (skip[0]) {
    console.log('dismiss dialog', skip[0]);
    sh(`adb shell input tap ${skip[0].cx} ${skip[0].cy}`);
    await sleep(1500);
    xml = dump('scripts/device-ui-auto.xml');
  }

  let fab = findLabels(xml, (l) => l.includes('AIコンシェルジュを開く'));
  if (fab[0]) {
    console.log('tap fab/content-desc', fab[0]);
    sh(`adb shell input tap ${fab[0].cx} ${fab[0].cy}`);
  } else {
    console.log('tap default fab area 1046,2295');
    sh('adb shell input tap 1046 2295');
  }

  await sleep(95000);

  for (let i = 0; i < 4; i++) {
    sh('adb shell input swipe 600 900 600 2100 300');
    await sleep(1200);
    xml = dump('scripts/device-ui-auto.xml');
    if (
      xml.includes('AI Action Center') ||
      xml.includes('action hold') ||
      xml.includes('rationaleJa') ||
      xml.includes('0820EA') ||
      xml.includes('AI第二評価')
    ) {
      console.log('found strategy panel at scroll-up', i);
      break;
    }
  }

  const checks = [
    'AI Action Center',
    'ポートフォリオ全体スコア',
    'おすすめ順ランキング',
    '本日のベスト銘柄',
    '本日のワースト銘柄',
    'リスク警告',
    '評価更新',
    '取得元',
    'action hold',
    'action ',
    'confidence',
    'rationaleJa',
    'RSI',
    '0820EA',
    'Yahoo',
  ];
  for (const c of checks) {
    console.log(c, xml.includes(c));
  }

  sh('adb shell screencap -p /sdcard/sta-device-ai-eval.png');
  sh('adb pull /sdcard/sta-device-ai-eval.png agent-tools/0820ea-device-screenshot.png');
  console.log('screenshot saved agent-tools/0820ea-device-screenshot.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
