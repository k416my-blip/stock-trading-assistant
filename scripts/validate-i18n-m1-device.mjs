/**
 * M1 i18n device validation — 3 locales × 6 areas + AI language check
 * node scripts/validate-i18n-m1-device.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const OUT = path.join('docs', 'review', 'i18n-m1-validation');
const PKG = 'com.assistant.stocktrading';
const AI_QUERY_ADB = 'Maybank%E3%82%92%E5%88%86%E6%9E%90%E3%81%97%E3%81%A6';
const AI_WAIT_MS = 55_000;

const LOCALES = [
  {
    id: 'ja',
    expectedAi: 'ja',
    settingsLanguageTestId: 'settings-language-ja',
    tabs: {
      home: 'ホーム',
      portfolio: '保有銘柄',
      stockCheck: '銘柄チェック',
      concierge: 'AI相談',
      settings: '設定',
    },
    rakutenSettingsRow: 'Rakuten取引記録',
    dismiss: ['スキップ', '閉じる', 'OK', '後で'],
    composerHint: ['メッセージ', '質問'],
    sendLabels: ['send', '送信'],
  },
  {
    id: 'en',
    expectedAi: 'en',
    settingsLanguageTestId: 'settings-language-en',
    tabs: {
      home: 'Home',
      portfolio: 'Portfolio',
      stockCheck: 'Stock Check',
      concierge: 'AI Chat',
      settings: 'Settings',
    },
    rakutenSettingsRow: 'Rakuten取引記録',
    dismiss: ['Skip', 'Close', 'OK', 'Later', 'スキップ', '閉じる'],
    composerHint: ['message', 'question', 'Message', 'Ask'],
    sendLabels: ['send', 'Send', '送信'],
  },
  {
    id: 'zh-Hans',
    expectedAi: 'zh',
    settingsLanguageTestId: 'settings-language-zh-Hans',
    tabs: {
      home: '首页',
      portfolio: '持仓',
      stockCheck: '股票检查',
      concierge: 'AI咨询',
      settings: '设置',
    },
    rakutenSettingsRow: 'Rakuten取引記録',
    dismiss: ['跳过', '关闭', 'OK', '稍后', 'スキップ', '閉じる'],
    composerHint: ['消息', '问题', 'message'],
    sendLabels: ['send', 'Send', '发送', '送信'],
  },
];

const TAB_FALLBACK = {
  home: { cx: 152, cy: 2541 },
  portfolio: { cx: 380, cy: 2541 },
  stockCheck: { cx: 610, cy: 2541 },
  concierge: { cx: 840, cy: 2541 },
  settings: { cx: 1117, cy: 2541 },
};

const JA_RE = /[\u3040-\u309F\u30A0-\u30FF]/;
const CJK_RE = /[\u4E00-\u9FFF]/;
const LATIN_WORD_RE = /\b[A-Za-z]{3,}\b/;

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function foregroundPkg() {
  const out = sh('adb shell dumpsys window');
  const m = out.match(/mCurrentFocus=Window\{[^ ]+ u0 ([^/]+)\//);
  return m?.[1] ?? '';
}

async function ensureStockApp(label = '') {
  if (foregroundPkg() !== PKG) {
    console.warn(`WARN relaunch (${label}) fg=${foregroundPkg()}`);
    sh('adb shell input keyevent 224'); // wake
    sh(`adb shell am start -n ${PKG}/.MainActivity`);
    await sleep(5000);
  }
  if (foregroundPkg() !== PKG) {
    sh('adb shell input keyevent 4'); // back from overlay
    await sleep(800);
    sh(`adb shell am start -n ${PKG}/.MainActivity`);
    await sleep(4000);
  }
  if (foregroundPkg() !== PKG) throw new Error(`wrong_foreground:${foregroundPkg()} at ${label}`);
}

function xmlHasPkg(xml) {
  return xml.includes(`package="${PKG}"`) || xml.includes(`package='${PKG}'`);
}

async function dump(label = '') {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await ensureStockApp(label || 'dump');
    try {
      sh('adb shell uiautomator dump /sdcard/ui-i18n-val.xml');
      const xml = sh('adb shell cat /sdcard/ui-i18n-val.xml');
      if (xmlHasPkg(xml)) return xml;
      console.warn(`WARN dump missing pkg (${label}) attempt=${attempt + 1} fg=${foregroundPkg()}`);
    } catch {
      if (attempt === 2) throw new Error(`uiautomator dump failed at ${label}`);
    }
    await sleep(800);
  }
  throw new Error(`dump_pkg_mismatch at ${label} fg=${foregroundPkg()}`);
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

function bottomTab(xml, label) {
  return findLabels(xml, (t) => t === label || t.startsWith(label) || t.includes(label))
    .filter((h) => h.cy > 2300)
    .sort((a, b) => a.cx - b.cx)[0];
}

function detectTextLanguage(text) {
  const sample = text.slice(0, 800);
  const hasKana = JA_RE.test(sample);
  const hasCjk = CJK_RE.test(sample);
  const latinWords = (sample.match(LATIN_WORD_RE) ?? []).length;
  if (hasKana) return 'ja';
  if (hasCjk && !hasKana) return 'zh';
  if (latinWords >= 3) return 'en';
  if (hasCjk) return 'zh';
  return 'unknown';
}

function collectVisibleTexts(xml) {
  const re = /(?:text|content-desc)="([^"]{2,})"/g;
  const texts = new Set();
  let m;
  while ((m = re.exec(xml))) {
    const t = m[1].trim();
    if (t && t.length > 1) texts.add(t);
  }
  return [...texts];
}

function findTranslationLeaks(texts, localeId) {
  if (localeId === 'ja') return [];
  const pickerNoise = new Set([
    '言語を選択',
    '表示言語とAIの応答言語に使います',
    'この言語で始める',
    'Choose language',
    'Continue with this language',
    '选择语言',
    '使用此语言开始',
    'Open debugger to view warnings.',
  ]);
  const leaks = [];
  for (const t of texts) {
    if (pickerNoise.has(t)) continue;
    if (JA_RE.test(t)) leaks.push(t);
    else if (localeId === 'en' && /[ぁ-んァ-ン]/.test(t)) leaks.push(t);
  }
  return leaks.slice(0, 40);
}

async function wakeDevice() {
  sh('adb shell input keyevent 224');
  await sleep(600);
  sh('adb shell input swipe 610 2400 610 800 300');
  await sleep(1000);
}

async function launchApp() {
  sh(`adb shell am force-stop ${PKG}`);
  await sleep(400);
  sh(`adb shell am start -n ${PKG}/.MainActivity`);
  await sleep(8000);
}

async function screenshot(name) {
  await ensureStockApp(`screenshot:${name}`);
  fs.mkdirSync(OUT, { recursive: true });
  const remote = `/sdcard/i18n-val-${name}.png`;
  sh(`adb shell screencap -p ${remote}`);
  const local = path.join(OUT, `${name}.png`);
  sh(`adb pull ${remote} ${local}`);
  return `${name}.png`;
}

async function saveXml(name, xml) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${name}.xml`), xml, 'utf8');
}

function findResourceIds(xml, id) {
  const re = new RegExp(
    `resource-id="${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`,
    'g',
  );
  const out = [];
  let m;
  while ((m = re.exec(xml))) {
    out.push({
      id,
      cx: Math.floor((+m[1] + +m[3]) / 2),
      cy: Math.floor((+m[2] + +m[4]) / 2),
    });
  }
  return out;
}

async function dismissLanguagePickerIfPresent(locale) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const xml = await dump(`langPicker:${locale.id}:${attempt}`);
    if (!xml.includes('language-picker-modal')) return;
    const option = findResourceIds(xml, `language-option-${locale.id}`);
    if (option[0]) {
      sh(`adb shell input tap ${option[0].cx} ${option[0].cy}`);
      await sleep(800);
    }
    const confirmXml = await dump(`langPickerConfirm:${locale.id}`);
    const confirmLabels =
      locale.id === 'ja'
        ? ['この言語で始める']
        : locale.id === 'en'
          ? ['Continue with this language', 'この言語で始める']
          : ['使用此语言开始', 'この言語で始める'];
    const confirm = findLabels(confirmXml, (t) => confirmLabels.some((c) => t === c || t.includes(c)));
    if (confirm[0]) {
      sh(`adb shell input tap ${confirm[0].cx} ${confirm[0].cy}`);
      await sleep(2500);
    }
  }
  const finalXml = await dump(`langPickerFinal:${locale.id}`);
  if (finalXml.includes('language-picker-modal')) {
    console.warn(`WARN language picker still visible for ${locale.id}`);
  }
}

async function tapBottomTab(label, fallbackKey) {
  const xml = await dump(`tab:${fallbackKey}`);
  const hit = bottomTab(xml, label);
  if (hit) sh(`adb shell input tap ${hit.cx} ${hit.cy}`);
  else sh(`adb shell input tap ${TAB_FALLBACK[fallbackKey].cx} ${TAB_FALLBACK[fallbackKey].cy}`);
  await sleep(2500);
}

async function dismissOverlays(locale) {
  await dismissLanguagePickerIfPresent(locale);
  for (let i = 0; i < 3; i += 1) {
    const xml = await dump('dismissOverlays');
    if (xml.includes('language-picker-modal')) {
      await dismissLanguagePickerIfPresent(locale);
    }
    for (const label of locale.dismiss) {
      const hits = findLabels(xml, (l) => l === label);
      if (hits[0]) {
        sh(`adb shell input tap ${hits[0].cx} ${hits[0].cy}`);
        await sleep(800);
        break;
      }
    }
  }
}

async function setLanguage(locale) {
  await dismissLanguagePickerIfPresent(locale);
  await tapBottomTab(locale.tabs.settings, 'settings');
  await sleep(1000);
  for (let scroll = 0; scroll < 4; scroll += 1) {
    const xml = await dump(`setLanguage:${scroll}`);
    const byTestId = findResourceIds(xml, locale.settingsLanguageTestId);
    if (byTestId[0]) {
      sh(`adb shell input tap ${byTestId[0].cx} ${byTestId[0].cy}`);
      await sleep(2000);
      await dismissLanguagePickerIfPresent(locale);
      return;
    }
    sh('adb shell input swipe 610 1800 610 900 400');
    await sleep(600);
  }
  const xml = await dump('setLanguage:fallback');
  const option = findLabels(xml, (t) =>
    locale.id === 'ja' ? t === '日本語' : locale.id === 'en' ? t === 'English' : t === '简体中文',
  );
  if (option[0]) {
    sh(`adb shell input tap ${option[0].cx} ${option[0].cy}`);
    await sleep(2000);
  }
  await dismissLanguagePickerIfPresent(locale);
}

async function openRakutenImport(locale) {
  await tapBottomTab(locale.tabs.settings, 'settings');
  await sleep(1000);
  for (let scroll = 0; scroll < 8; scroll += 1) {
    const xml = await dump('openRakutenImport');
    const row = findLabels(
      xml,
      (t) =>
        t.includes('Rakuten') ||
        t.includes('trade record') ||
        t.includes('取引記録') ||
        t.includes('交易记录'),
    ).filter((h) => h.cy > 400 && h.cy < 2400);
    if (row[0]) {
      sh(`adb shell input tap ${row[0].cx} ${row[0].cy}`);
      await sleep(2500);
      return;
    }
    sh('adb shell input swipe 610 2000 610 900 400');
    await sleep(700);
  }
}

async function sendAiQuery(locale) {
  await tapBottomTab(locale.tabs.concierge, 'concierge');
  await sleep(1500);
  let xml = await dump('sendAiQuery:composer');
  const input = findLabels(xml, (l) => locale.composerHint.some((h) => l.toLowerCase().includes(h.toLowerCase())));
  if (input[0]) sh(`adb shell input tap ${input[0].cx} ${input[0].cy}`);
  else sh('adb shell input tap 600 2350');
  await sleep(400);
  sh(`adb shell input text ${AI_QUERY_ADB}`);
  await sleep(500);
  xml = await dump('sendAiQuery:send');
  const send = findLabels(xml, (l) => locale.sendLabels.some((s) => l.toLowerCase().includes(s.toLowerCase())));
  if (send[0]) sh(`adb shell input tap ${send[0].cx} ${send[0].cy}`);
  else sh('adb shell input tap 1150 2400');
  await sleep(AI_WAIT_MS);
  await ensureStockApp('sendAiQuery:afterWait');
}

function extractAssistantTexts(xml) {
  const lines = collectVisibleTexts(xml);
  return lines.filter(
    (t) =>
      t.length > 20 &&
      !t.includes('Maybankを分析') &&
      !['Thinking', '思考', 'Composing', '回答', 'Send', '送信', 'AI Chat', 'AI相談'].some((x) => t === x),
  );
}

async function validateLocale(locale, results) {
  console.log(`\n=== ${locale.id} ===`);
  await setLanguage(locale);
  await dismissOverlays(locale);

  const localeResult = {
    locale: locale.id,
    screens: {},
    leaks: {},
    ai: {},
  };

  const screens = [
    ['home', locale.tabs.home, 'home'],
    ['portfolio', locale.tabs.portfolio, 'portfolio'],
    ['stockCheck', locale.tabs.stockCheck, 'stockCheck'],
    ['concierge', locale.tabs.concierge, 'concierge'],
    ['settings', locale.tabs.settings, 'settings'],
  ];

  for (const [key, tabLabel, fb] of screens) {
    await tapBottomTab(tabLabel, fb);
    await dismissLanguagePickerIfPresent(locale);
    const xml = await dump(`${locale.id}:${key}`);
    const png = await screenshot(`${locale.id}-${key}`);
    const texts = collectVisibleTexts(xml);
    const leaks = findTranslationLeaks(texts, locale.id);
    localeResult.screens[key] = { screenshot: png, leakCount: leaks.length, sampleLeaks: leaks.slice(0, 8) };
    localeResult.leaks[key] = leaks;
    await saveXml(`${locale.id}-${key}`, xml);
  }

  await openRakutenImport(locale);
  const importXml = await dump(`${locale.id}:rakutenImport`);
  const importPng = await screenshot(`${locale.id}-rakutenImport`);
  const importTexts = collectVisibleTexts(importXml);
  const importLeaks = findTranslationLeaks(importTexts, locale.id);
  localeResult.screens.rakutenImport = {
    screenshot: importPng,
    leakCount: importLeaks.length,
    sampleLeaks: importLeaks.slice(0, 8),
  };
  localeResult.leaks.rakutenImport = importLeaks;
  await saveXml(`${locale.id}-rakutenImport`, importXml);
  sh('adb shell input keyevent 4');
  await sleep(1500);

  await sendAiQuery(locale);
  const aiXml = await dump(`${locale.id}:ai-maybank`);
  const aiPng = await screenshot(`${locale.id}-ai-maybank-response`);
  await saveXml(`${locale.id}-ai-maybank`, aiXml);
  const assistantTexts = extractAssistantTexts(aiXml);
  const combined = assistantTexts.join('\n');
  const detected = detectTextLanguage(combined);
  localeResult.ai = {
    query: 'Maybankを分析して',
    screenshot: aiPng,
    detectedLanguage: detected,
    expected: locale.expectedAi,
    pass: detected === locale.expectedAi || (locale.expectedAi === 'zh' && detected === 'zh'),
    sampleResponse: assistantTexts.slice(0, 3),
    responseLength: combined.length,
  };

  results.locales.push(localeResult);
}

async function main() {
  const devices = sh('adb devices').split('\n').filter((l) => l.includes('\tdevice'));
  const meta = {
    capturedAt: new Date().toISOString(),
    device: devices.length ? sh('adb shell getprop ro.product.model') : null,
    versionCode: null,
    skipped: devices.length === 0,
    locales: [],
  };

  if (devices.length === 0) {
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'validation-meta.json'), JSON.stringify(meta, null, 2));
    console.error('No adb device');
    process.exit(1);
  }

  try {
    const pkgInfo = sh(`adb shell dumpsys package ${PKG}`);
    const m = pkgInfo.match(/versionCode=(\d+)/);
    if (m) meta.versionCode = Number(m[1]);
  } catch {
    /* ignore */
  }

  sh('adb shell settings put system accelerometer_rotation 0');
  if (fs.existsSync(OUT)) {
    for (const f of fs.readdirSync(OUT)) {
      if (f.endsWith('.png') || f.endsWith('.xml') || f === 'validation-meta.json') {
        fs.unlinkSync(path.join(OUT, f));
      }
    }
    console.log('Cleared stale validation artifacts in', OUT);
  }
  await wakeDevice();
  await launchApp();
  await ensureStockApp('main:start');
  await dismissOverlays(LOCALES[0]);

  for (const locale of LOCALES) {
    await validateLocale(locale, meta);
  }

  meta.summary = {
    aiPass: meta.locales.filter((l) => l.ai.pass).length,
    aiTotal: meta.locales.length,
    totalLeaks: meta.locales.reduce(
      (sum, l) => sum + Object.values(l.leaks).reduce((s, arr) => s + arr.length, 0),
      0,
    ),
  };

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'validation-meta.json'), JSON.stringify(meta, null, 2));
  console.log('\nDone:', path.join(OUT, 'validation-meta.json'));
  console.log(JSON.stringify(meta.summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
