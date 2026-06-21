/**
 * M1 fix device evidence — 3 locales × 5 screens + AI Maybank
 * node scripts/capture-i18n-m1-fix-device.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT = path.join('docs', 'review', 'i18n-m1-fix');
const PKG = 'com.assistant.stocktrading';
const AI_QUERY = 'Maybank%E3%82%92%E5%88%86%E6%9E%90%E3%81%97%E3%81%A6';
const AI_WAIT_MS = 70_000;

const LOCALES = [
  {
    id: 'ja',
    expectedAi: 'ja',
    settingsTestId: 'settings-language-ja',
    nativeLabel: '日本語',
    tabs: { home: 'ホーム', portfolio: '保有銘柄', stockCheck: '銘柄チェック', concierge: 'AI相談', settings: '設定' },
    homeMarker: '今日のポートフォリオ',
    composerHint: ['質問', 'メッセージ'],
    sendLabels: ['送信', 'send'],
  },
  {
    id: 'en',
    expectedAi: 'en',
    settingsTestId: 'settings-language-en',
    nativeLabel: 'English',
    tabs: { home: 'Home', portfolio: 'Portfolio', stockCheck: 'Stock Check', concierge: 'AI Chat', settings: 'Settings' },
    homeMarker: "Today's Portfolio",
    composerHint: ['message', 'question', 'Ask'],
    sendLabels: ['Send', 'send'],
  },
  {
    id: 'zh-Hans',
    expectedAi: 'zh',
    settingsTestId: 'settings-language-zh-Hans',
    nativeLabel: '简体中文',
    tabs: { home: '首页', portfolio: '持仓', stockCheck: '股票检查', concierge: 'AI咨询', settings: '设置' },
    homeMarker: '今日投资组合',
    composerHint: ['消息', '问题'],
    sendLabels: ['发送', 'Send', 'send'],
  },
];

/** Standard 6-tab layout on device: Home, Portfolio, Alerts, Stock Check, AI Chat, Settings */
const TAB_CX = {
  home: 101,
  portfolio: 304,
  stockCheck: 712,
  concierge: 915,
  settings: 1118,
};
const TAB_CY = 2541;

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 20 * 1024 * 1024 }).trim();
}

function foregroundPkg() {
  const out = sh('adb shell dumpsys window');
  const m = out.match(/mCurrentFocus=Window\{[^ ]+ u0 ([^/]+)\//);
  return m?.[1] ?? '';
}

async function ensureStockApp(label = '') {
  if (foregroundPkg() !== PKG) {
    sh('adb shell input keyevent 224');
    sh(`adb shell am start -n ${PKG}/.MainActivity`);
    await sleep(5000);
  }
  if (foregroundPkg() !== PKG) throw new Error(`wrong_foreground:${foregroundPkg()} at ${label}`);
}

async function dump(label) {
  await ensureStockApp(label);
  for (let i = 0; i < 3; i += 1) {
    sh('adb shell uiautomator dump /sdcard/i18n-m1-fix.xml');
    const xml = sh('adb shell cat /sdcard/i18n-m1-fix.xml');
    if (xml.includes(`package="${PKG}"`)) return xml;
    await sleep(500);
  }
  throw new Error(`dump_missing_pkg:${label}`);
}

function findLabels(xml, pred) {
  const re = /(?:text|content-desc)="([^"]*)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g;
  const out = [];
  let m;
  while ((m = re.exec(xml))) {
    const label = m[1];
    if (!pred(label)) continue;
    out.push({ label, cx: Math.floor((+m[2] + +m[4]) / 2), cy: Math.floor((+m[3] + +m[5]) / 2) });
  }
  return out;
}

function findLanguageRow(xml, locale) {
  const byDesc = findLabels(xml, (t) => t === locale.settingsTestId);
  if (byDesc[0]) return byDesc[0];
  const byId = findLabels(xml, (t) => t.includes(locale.settingsTestId));
  if (byId[0]) return byId[0];
  const byNative = findLabels(xml, (t) => t === locale.nativeLabel || t.includes('简体') || t.includes('中文'));
  return byNative.find((h) => h.cy > 300 && h.cy < 1200) ?? null;
}

function bottomTab(xml, label) {
  return findLabels(xml, (t) => t === label)
    .filter((h) => h.cy > 2300)
    .sort((a, b) => a.cx - b.cx)[0];
}

async function tapTab(locale, key) {
  const xml = await dump(`tab:${key}`);
  const hit = bottomTab(xml, locale.tabs[key]);
  if (hit) sh(`adb shell input tap ${hit.cx} ${hit.cy}`);
  else sh(`adb shell input tap ${TAB_CX[key]} ${TAB_CY}`);
  await sleep(2500);
}

async function screenshot(name) {
  await ensureStockApp(`shot:${name}`);
  const remote = `/sdcard/i18n-fix-${name}.png`;
  sh(`adb shell screencap -p ${remote}`);
  const local = path.join(OUT, `${name}.png`);
  sh(`adb pull ${remote} ${local}`);
  return `${name}.png`;
}

async function dismissInitialPicker(locale) {
  for (let i = 0; i < 3; i += 1) {
    const xml = await dump('picker');
    if (!xml.includes('language-picker-modal')) return;
    const opt = findLabels(xml, (t) => t === locale.nativeLabel);
    if (opt[0]) sh(`adb shell input tap ${opt[0].cx} ${opt[0].cy}`);
    await sleep(600);
    const confirm = findLabels(await dump('pickerConfirm'), (t) =>
      ['この言語で始める', 'Continue with this language', '使用此语言开始'].includes(t),
    );
    if (confirm[0]) {
      sh(`adb shell input tap ${confirm[0].cx} ${confirm[0].cy}`);
      await sleep(2500);
    }
  }
}

async function isLocaleActive(locale) {
  await tapTab(locale, 'home');
  await sleep(1200);
  const xml = await dump('isLocaleActive');
  return xml.includes(locale.homeMarker);
}

async function switchLanguage(locale) {
  if (await isLocaleActive(locale)) return;
  await tapTab(locale, 'settings');
  await sleep(1500);
  let xml = await dump('switchLanguage:open');
  let row = findLanguageRow(xml, locale);
  for (let scroll = 0; !row && scroll < 5; scroll += 1) {
    sh('adb shell input swipe 610 1800 610 900 350');
    await sleep(500);
    xml = await dump(`switchLanguage:scroll${scroll}`);
    row = findLanguageRow(xml, locale);
  }
  if (!row) throw new Error(`language_row_not_found:${locale.id}`);
  sh(`adb shell input tap ${row.cx} ${row.cy}`);
  await sleep(3000);
  if (!(await isLocaleActive(locale))) {
    throw new Error(`language_switch_failed:${locale.id}`);
  }
}

const JA_RE = /[\u3040-\u309F\u30A0-\u30FF]/;
const CJK_RE = /[\u4E00-\u9FFF]/;
const LATIN_WORD_RE = /\b[A-Za-z]{3,}\b/;

function detectLang(text) {
  const s = text.slice(0, 800);
  if (JA_RE.test(s)) return 'ja';
  if (CJK_RE.test(s)) return 'zh';
  if ((s.match(LATIN_WORD_RE) ?? []).length >= 3) return 'en';
  return 'unknown';
}

async function runAiTest(locale) {
  await tapTab(locale, 'concierge');
  await sleep(1500);
  let xml = await dump('ai:open');
  if (!xml.includes('concierge-tab-screen') && !xml.includes(locale.tabs.concierge)) {
    throw new Error(`concierge_tab_miss:${locale.id}`);
  }
  const input = findLabels(xml, (l) => locale.composerHint.some((h) => l.toLowerCase().includes(h.toLowerCase())));
  if (input[0]) sh(`adb shell input tap ${input[0].cx} ${input[0].cy}`);
  else sh('adb shell input tap 600 2350');
  await sleep(400);
  sh(`adb shell input text ${AI_QUERY}`);
  await sleep(500);
  xml = await dump('ai:send');
  const send = findLabels(xml, (l) => locale.sendLabels.some((s) => l.toLowerCase().includes(s.toLowerCase())));
  if (send[0]) sh(`adb shell input tap ${send[0].cx} ${send[0].cy}`);
  else sh('adb shell input tap 1150 2400');
  await sleep(AI_WAIT_MS);
  await ensureStockApp('ai:wait');
  const respXml = await dump('ai:response');
  await screenshot(`${locale.id}-ai-maybank-response`);
  fs.writeFileSync(path.join(OUT, `${locale.id}-ai-maybank.xml`), respXml);
  const texts = findLabels(respXml, () => true).map((x) => x.label).filter((t) => t.length > 15);
  const detected = detectLang(texts.join('\n'));
  return { detected, pass: detected === locale.expectedAi, sample: texts.slice(0, 3) };
}

async function captureLocale(locale, meta) {
  await switchLanguage(locale);
  const screens = ['home', 'portfolio', 'stockCheck', 'concierge', 'settings'];
  const result = { locale: locale.id, screens: {}, ai: null };
  for (const key of screens) {
    await tapTab(locale, key);
    const png = await screenshot(`${locale.id}-${key}`);
    const xml = await dump(`cap:${locale.id}:${key}`);
    fs.writeFileSync(path.join(OUT, `${locale.id}-${key}.xml`), xml);
    result.screens[key] = png;
  }
  result.ai = await runAiTest(locale);
  meta.locales.push(result);
}

async function main() {
  const devices = sh('adb devices').split('\n').filter((l) => l.includes('\tdevice'));
  if (!devices.length) {
    console.error('No adb device');
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });
  sh('adb reverse tcp:8081 tcp:8081');
  sh('adb shell settings put system accelerometer_rotation 0');
  sh(`adb shell am force-stop ${PKG}`);
  sh(`adb shell am start -n ${PKG}/.MainActivity`);
  await sleep(12000);

  const meta = {
    capturedAt: new Date().toISOString(),
    device: sh('adb shell getprop ro.product.model'),
    versionCode: null,
    locales: [],
  };
  try {
    const info = sh(`adb shell dumpsys package ${PKG}`);
    const m = info.match(/versionCode=(\d+)/);
    if (m) meta.versionCode = Number(m[1]);
  } catch {
    /* ignore */
  }

  for (const locale of LOCALES) {
    await dismissInitialPicker(locale);
    await captureLocale(locale, meta);
  }

  meta.summary = {
    aiPass: meta.locales.filter((l) => l.ai?.pass).length,
    aiTotal: meta.locales.length,
  };
  fs.writeFileSync(path.join(OUT, 'fix-meta.json'), JSON.stringify(meta, null, 2));
  console.log(JSON.stringify(meta.summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
