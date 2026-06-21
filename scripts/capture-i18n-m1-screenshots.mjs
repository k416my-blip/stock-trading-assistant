/**
 * Multi-Language M1 evidence — Home/Portfolio/StockCheck/Concierge/Settings in ja/en/zh-Hans
 * node scripts/capture-i18n-m1-screenshots.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT = path.join('docs', 'review', 'i18n-m1-screenshots');
const PKG = 'com.assistant.stocktrading';

const LOCALES = [
  {
    id: 'ja',
    settingsLabel: '言語',
    languageOptionTestId: 'settings-language-ja',
    tabs: {
      home: 'ホーム',
      portfolio: '保有銘柄',
      stockCheck: '銘柄チェック',
      concierge: 'AI相談',
      settings: '設定',
    },
  },
  {
    id: 'en',
    settingsLabel: 'Language',
    languageOptionTestId: 'settings-language-en',
    tabs: {
      home: 'Home',
      portfolio: 'Portfolio',
      stockCheck: 'Stock Check',
      concierge: 'AI Chat',
      settings: 'Settings',
    },
  },
  {
    id: 'zh-Hans',
    settingsLabel: '语言',
    languageOptionTestId: 'settings-language-zh-Hans',
    tabs: {
      home: '首页',
      portfolio: '持仓',
      stockCheck: '股票检查',
      concierge: 'AI咨询',
      settings: '设置',
    },
  },
];

const TAB_FALLBACK = {
  home: { cx: 152, cy: 2541 },
  portfolio: { cx: 380, cy: 2541 },
  stockCheck: { cx: 610, cy: 2541 },
  concierge: { cx: 840, cy: 2541 },
  settings: { cx: 1117, cy: 2541 },
};

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function dump() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      sh('adb shell uiautomator dump /sdcard/ui-i18n-m1.xml');
      return sh('adb shell cat /sdcard/ui-i18n-m1.xml');
    } catch (e) {
      if (attempt === 2) throw e;
    }
  }
  return '';
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

function bottomTab(xml, label) {
  const hits = findLabels(
    xml,
    (t) => t === label || t.startsWith(label) || t.includes(label),
  ).filter((h) => h.cy > 2300);
  hits.sort((a, b) => a.cx - b.cx);
  return hits[0] ?? null;
}

async function wakeDevice() {
  sh('adb shell input keyevent 224');
  await sleep(600);
  sh('adb shell input swipe 610 2400 610 800 300');
  await sleep(1000);
}

async function launchApp() {
  sh(`adb shell am force-stop ${PKG}`);
  await sleep(500);
  sh(`adb shell am start -n ${PKG}/.MainActivity`);
  await sleep(4500);
}

async function screenshot(name) {
  fs.mkdirSync(OUT, { recursive: true });
  const remote = `/sdcard/i18n-m1-${name}.png`;
  sh(`adb shell screencap -p ${remote}`);
  const local = path.join(OUT, `${name}.png`);
  sh(`adb pull ${remote} ${local}`);
  console.log('screenshot:', local);
  return local;
}

async function tapBottomTab(label, fallbackKey) {
  const xml = dump();
  const hit = bottomTab(xml, label);
  if (hit) {
    sh(`adb shell input tap ${hit.cx} ${hit.cy}`);
  } else {
    const fb = TAB_FALLBACK[fallbackKey];
    sh(`adb shell input tap ${fb.cx} ${fb.cy}`);
  }
  await sleep(2500);
}

async function openSettings(locale) {
  await tapBottomTab(locale.tabs.settings, 'settings');
}

async function setLanguage(locale) {
  await openSettings(locale);
  const xml = dump();
  const langSection = findLabels(xml, (t) => t.includes(locale.settingsLabel)).filter((h) => h.cy < 1200);
  if (langSection[0]) {
    sh(`adb shell input swipe 610 1800 610 900 400`);
    await sleep(800);
  }
  const option = findLabels(dump(), (t) =>
    locale.id === 'ja'
      ? t === '日本語'
      : locale.id === 'en'
        ? t === 'English'
        : t === '简体中文',
  );
  if (option[0]) {
    sh(`adb shell input tap ${option[0].cx} ${option[0].cy}`);
    await sleep(2000);
  }
}

async function captureLocale(locale) {
  console.log(`\n=== locale ${locale.id} ===`);
  await setLanguage(locale);
  await tapBottomTab(locale.tabs.home, 'home');
  await screenshot(`${locale.id}-home`);
  await tapBottomTab(locale.tabs.portfolio, 'portfolio');
  await screenshot(`${locale.id}-portfolio`);
  await tapBottomTab(locale.tabs.stockCheck, 'stockCheck');
  await screenshot(`${locale.id}-stockcheck`);
  await tapBottomTab(locale.tabs.concierge, 'concierge');
  await screenshot(`${locale.id}-concierge`);
  await openSettings(locale);
  await screenshot(`${locale.id}-settings`);
}

async function main() {
  const devices = sh('adb devices').split('\n').filter((l) => l.includes('device') && !l.startsWith('List'));
  if (devices.length === 0) {
    console.error('No adb device connected — skipping screenshots');
    process.exit(0);
  }
  await wakeDevice();
  await launchApp();
  for (const locale of LOCALES) {
    await captureLocale(locale);
  }
  console.log('Done. Output:', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
