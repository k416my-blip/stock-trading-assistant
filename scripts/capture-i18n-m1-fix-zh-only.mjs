import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT = 'docs/review/i18n-m1-fix';
const TAB = { home: [101, 2541], portfolio: [304, 2541], stockCheck: [712, 2541], concierge: [915, 2541], settings: [1118, 2541] };

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }).trim();
}

async function dump() {
  sh('adb shell uiautomator dump /sdcard/z.xml');
  return sh('adb shell cat /sdcard/z.xml');
}

function findDesc(xml, desc) {
  const re = new RegExp(`content-desc="${desc.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`);
  const m = xml.match(re);
  if (!m) return null;
  return { cx: Math.floor((+m[1] + +m[3]) / 2), cy: Math.floor((+m[2] + +m[4]) / 2) };
}

async function tapTab(key) {
  sh(`adb shell input tap ${TAB[key][0]} ${TAB[key][1]}`);
  await sleep(2800);
}

async function shot(name) {
  sh(`adb shell screencap -p /sdcard/${name}.png`);
  sh(`adb pull /sdcard/${name}.png ${path.join(OUT, `${name}.png`)}`);
}

async function main() {
  await sleep(15000);
  sh('adb shell input keyevent 4');
  await sleep(500);
  await tapTab('settings');
  let xml = await dump();
  const zhRow = findDesc(xml, 'settings-language-zh-Hans');
  if (!zhRow) throw new Error('zh row not in settings');
  sh(`adb shell input tap ${zhRow.cx} ${zhRow.cy}`);
  await sleep(4000);
  await tapTab('home');
  xml = await dump();
  if (!xml.includes('今日投资组合') && !xml.includes('首页')) throw new Error('zh home not detected: ' + xml.slice(0, 500));
  for (const key of ['home', 'portfolio', 'stockCheck', 'concierge']) {
    await tapTab(key);
    await shot(`zh-Hans-${key}`);
    fs.writeFileSync(path.join(OUT, `zh-Hans-${key}.xml`), await dump());
  }
  await tapTab('settings');
  await shot('zh-Hans-settings');
  fs.writeFileSync(path.join(OUT, 'zh-Hans-settings.xml'), await dump());
  console.log('done');
}

main().catch((e) => { console.error(e); process.exit(1); });
