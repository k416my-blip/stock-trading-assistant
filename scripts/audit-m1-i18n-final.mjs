/**
 * M1 i18n Final Audit — static + device UI text extraction
 * node scripts/audit-m1-i18n-final.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs', 'review', 'm1-final-audit');
const PKG = 'com.assistant.stocktrading';

const HIRAGANA = /[\u3040-\u309F]/;
const KATAKANA = /[\u30A0-\u30FF]/;
const JA_UI_PHRASES = [
  '銘柄', '保有', '通知', '利益急減', '本日の', '更新対象', '株価', 'APIキー',
  '初心者', '標準', 'プロ', '設定', '取得中', '更新', '一覧', 'ダイジェスト',
  '提案', 'コメント', 'ポートフォリオ', 'Rakuten Trade', '確認してください',
  '件', '既読', '未読', '再計算', '理由:', '材料品質',
];

const M1_SCREENS = {
  Home: {
    files: [
      'src/screens/HomeScreen.tsx',
      'src/components/beginner/BeginnerTodayAdviceCard.tsx',
      'src/components/beginner/BeginnerOnboardingModal.tsx',
      'src/components/ProactiveSuggestionsHomeCard.tsx',
    ],
    deviceTab: 'home',
  },
  Portfolio: {
    files: [
      'src/screens/PortfolioScreen.tsx',
      'src/components/portfolio/PortfolioHoldingsCardsSection.tsx',
      'src/components/portfolio/PortfolioPriceSyncCard.tsx',
      'src/components/PriceSyncResultPanel.tsx',
      'src/components/HoldingCard.tsx',
    ],
    deviceTab: 'portfolio',
  },
  Alerts: {
    files: ['src/screens/AiNotificationsScreen.tsx', 'src/utils/alertsI18nHelpers.ts'],
    deviceTab: 'alerts',
  },
  'Stock Check': {
    files: [
      'src/screens/MaterialAnalysisScreen.tsx',
      'src/components/beginner/BeginnerStockSummaryCard.tsx',
    ],
    deviceTab: 'stockCheck',
  },
  'AI Chat': {
    files: [
      'src/screens/ConciergeTabScreen.tsx',
      'src/components/AiAssistantChat.tsx',
      'src/components/concierge/AiDailyCommentPanel.tsx',
      'src/components/concierge/ConciergeTodayProposalsPanel.tsx',
      'src/components/concierge/ConciergeBursaNotificationDigestPanel.tsx',
      'src/components/concierge/BeginnerConciergeQuickActions.tsx',
    ],
    deviceTab: 'concierge',
  },
  Settings: {
    files: ['src/screens/SettingsScreen.tsx', 'src/components/LanguagePickerModal.tsx'],
    deviceTab: 'settings',
  },
  'Rakuten Import': {
    files: [
      'src/screens/RakutenImportManualEntryScreen.tsx',
      'src/screens/RakutenImportConfirmScreen.tsx',
      'src/screens/RakutenImportOcrReviewScreen.tsx',
    ],
    deviceTab: null,
  },
};

const M1_CONSTANTS = [
  'src/constants/marketData.ts',
  'src/constants/apiSettings.ts',
  'src/constants/appUxMode.ts',
  'src/constants/investmentDisplay.ts',
  'src/constants/beginnerTabLabelsJa.ts',
];

const I18N_NS = [
  'common', 'navigation', 'home', 'portfolio', 'stockCheck',
  'concierge', 'settings', 'rakutenImport', 'errors', 'alerts', 'glossary',
];

const SKIP_LINE = [
  /^\s*\/\//, /^\s*\*/, /import\s/, /from\s+['"]/, /console\./,
  /testID/, /accessibilityLabel=\{/, /styles\./, /theme\./,
  /titleJa|messageJa|headlineJa|bodyJa|labelJa|summaryJa|actionJa/,
  /displayLabelJa|companyNameJa|reasonsJa|todayActionJa|createdAtJa/,
  /triggerKindJa|categoryJa|importanceJa|footerJa|lineJa|nameJa/,
  /regimeStrategyJa|concentrationJa|failureKindJa|statusJa/,
  /Phase\d|ForwardValidation|Debug|debug|ProMode|pro mode/i,
];

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function hasJaLeak(text) {
  if (!text || text.length < 2) return null;
  if (HIRAGANA.test(text) || KATAKANA.test(text)) return 'kana';
  for (const p of JA_UI_PHRASES) {
    if (text.includes(p)) return `phrase:${p}`;
  }
  return null;
}

function classifyFinding(ctx) {
  const { source, field, text, file } = ctx;
  if (/Debug|ForwardValidation|ProactiveSuggestions|Phase1[3-9]|Phase2[0-4]/i.test(file)) {
    return 'F';
  }
  if (/titleJa|messageJa|headlineJa|bodyJa|summaryJa|todayActionJa|triggerKind|importanceJa/.test(field || source)) {
    return 'D';
  }
  if (/companyName|stockCode|symbol|displayLabel|MAYBANK|TENAGA|\.KL/i.test(text)) {
    return 'E';
  }
  if (/Button|label=|title=|sectionTitle|pageTitle|soundLabel|headerRow/.test(source)) {
    return 'A';
  }
  if (/hint|subtitle|description|note|muted|empty|footer/.test(source)) {
    return 'B';
  }
  if (/notification|alert|digest|importance|category/.test(source)) {
    return 'C';
  }
  return 'A';
}

function scanFileStatic(relPath, screen) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return [];
  const lines = fs.readFileSync(abs, 'utf8').split('\n');
  const findings = [];
  lines.forEach((line, idx) => {
    if (SKIP_LINE.some((re) => re.test(line))) return;
    if (line.includes('t(') || line.includes('useTranslation')) return;
    const strMatches = line.matchAll(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g);
    for (const m of strMatches) {
      const s = m[2];
      if (s.length < 2 || s.length > 200) continue;
      if (!/[\u3000-\u9FFF]/.test(s)) continue;
      const leak = hasJaLeak(s);
      if (!leak) continue;
      findings.push({
        screen,
        file: relPath,
        line: idx + 1,
        text: s.slice(0, 120),
        detect: leak,
        method: 'static-tsx',
        category: classifyFinding({ source: line, text: s, file: relPath }),
      });
    }
  });
  return findings;
}

function scanI18nResources(locale) {
  const findings = [];
  for (const ns of I18N_NS) {
    const fp = path.join(ROOT, 'src', 'i18n', 'resources', locale, `${ns}.json`);
    if (!fs.existsSync(fp)) continue;
    const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
    walkJson(data, [], (keyPath, value) => {
      if (typeof value !== 'string') return;
      const leak = hasJaLeak(value);
      if (leak) {
        findings.push({
          screen: 'i18n',
          file: `src/i18n/resources/${locale}/${ns}.json`,
          line: keyPath,
          text: value.slice(0, 120),
          detect: leak,
          method: 'i18n-resource',
          category: 'A',
          locale,
        });
      }
    });
  }
  return findings;
}

function walkJson(obj, pathParts, cb) {
  if (typeof obj === 'string') {
    cb(pathParts.join('.'), obj);
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => walkJson(v, [...pathParts, String(i)], cb));
    return;
  }
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      walkJson(v, [...pathParts, k], cb);
    }
  }
}

function extractTextsFromXml(xml) {
  const texts = [];
  const re = /text="([^"]*)"/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const t = m[1].replace(/&amp;/g, '&').replace(/&#10;/g, '\n').trim();
    if (t.length >= 2) texts.push(t);
  }
  return [...new Set(texts)];
}

async function deviceAudit(locale) {
  const settingsId = locale === 'en' ? 'settings-language-en' : 'settings-language-zh-Hans';
  const tabMap = locale === 'en'
    ? { home: 'Home', portfolio: 'Portfolio', stockCheck: 'Stock Check', concierge: 'AI Chat', alerts: 'Alerts', settings: 'Settings' }
    : { home: '首页', portfolio: '持仓', stockCheck: '股票检查', concierge: 'AI咨询', alerts: '通知', settings: '设置' };

  const tabCx = { home: 152, portfolio: 380, stockCheck: 610, concierge: 840, alerts: 509, settings: 1117 };
  const findings = [];
  const dumps = {};

  try {
    sh(`adb shell am start -n ${PKG}/.MainActivity`);
    await sleep(4000);

    // Settings → language
    sh(`adb shell input tap ${tabCx.settings} 2541`);
    await sleep(2500);
    let xml = sh('adb shell uiautomator dump /sdcard/m1-audit.xml && adb shell cat /sdcard/m1-audit.xml');
    if (xml.includes(settingsId)) {
      const bounds = xml.match(new RegExp(`resource-id="${settingsId.replace(/-/g, '\\-')}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`));
      if (bounds) {
        const cx = Math.floor((+bounds[1] + +bounds[3]) / 2);
        const cy = Math.floor((+bounds[2] + +bounds[4]) / 2);
        sh(`adb shell input tap ${cx} ${cy}`);
        await sleep(2000);
      }
    }

    for (const [tabKey, label] of Object.entries(tabMap)) {
      const cx = tabCx[tabKey] ?? tabCx.home;
      sh(`adb shell input tap ${cx} 2541`);
      await sleep(2800);
      if (tabKey === 'portfolio' || tabKey === 'concierge') {
        sh('adb shell input swipe 500 1800 500 600 400');
        await sleep(800);
      }
      xml = sh('adb shell uiautomator dump /sdcard/m1-audit.xml && adb shell cat /sdcard/m1-audit.xml');
      if (!xml.includes(PKG)) continue;
      const texts = extractTextsFromXml(xml);
      dumps[`${locale}:${tabKey}`] = texts;
      for (const text of texts) {
        const leak = hasJaLeak(text);
        if (!leak) continue;
        if (tabMap[tabKey] && text === tabMap[tabKey]) continue;
        findings.push({
          screen: tabKey === 'stockCheck' ? 'Stock Check' : tabKey === 'concierge' ? 'AI Chat' : tabKey.charAt(0).toUpperCase() + tabKey.slice(1),
          file: 'device:uiautomator',
          line: locale,
          text: text.slice(0, 160),
          detect: leak,
          method: 'device-ui',
          category: classifyFinding({ source: 'device-text', text }),
          locale,
        });
      }
    }
  } catch (e) {
    return { findings, dumps, error: String(e.message || e) };
  }
  return { findings, dumps, error: null };
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const staticFindings = [];
  for (const [screen, cfg] of Object.entries(M1_SCREENS)) {
    for (const f of cfg.files) {
      staticFindings.push(...scanFileStatic(f, screen));
    }
  }
  for (const f of M1_CONSTANTS) {
    staticFindings.push(...scanFileStatic(f, 'constants'));
  }

  const enI18nLeaks = scanI18nResources('en');
  const zhI18nLeaks = scanI18nResources('zh-Hans');

  const report = {
    generatedAt: new Date().toISOString(),
    branch: sh('git branch --show-current'),
    commit: sh('git log -1 --format=%H'),
    staticFindings,
    enI18nLeaks,
    zhI18nLeaks,
    deviceEn: null,
    deviceZh: null,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'audit-static.json'), JSON.stringify(report, null, 2));
  console.log(`Static findings: ${staticFindings.length}, en i18n leaks: ${enI18nLeaks.length}, zh i18n leaks: ${zhI18nLeaks.length}`);
  return report;
}

async function runDevice() {
  const base = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'audit-static.json'), 'utf8'));
  let devices = '';
  try { devices = sh('adb devices'); } catch { devices = ''; }
  if (!devices.includes('device')) {
    base.deviceSkipped = 'no adb device';
    fs.writeFileSync(path.join(OUT_DIR, 'audit-full.json'), JSON.stringify(base, null, 2));
    return base;
  }
  console.log('Device audit EN...');
  base.deviceEn = await deviceAudit('en');
  console.log('Device audit zh-Hans...');
  base.deviceZh = await deviceAudit('zh-Hans');
  fs.writeFileSync(path.join(OUT_DIR, 'audit-full.json'), JSON.stringify(base, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'device-en-dumps.json'), JSON.stringify(base.deviceEn?.dumps ?? {}, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'device-zh-dumps.json'), JSON.stringify(base.deviceZh?.dumps ?? {}, null, 2));
  return base;
}

const staticReport = main();
await runDevice();
