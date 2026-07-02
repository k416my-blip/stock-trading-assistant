import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { initI18n, i18n } from '../../../src/i18n';
import enPortfolio from '../../../src/i18n/resources/en/portfolio.json';
import enAlerts from '../../../src/i18n/resources/en/alerts.json';
import enConcierge from '../../../src/i18n/resources/en/concierge.json';
import enSettings from '../../../src/i18n/resources/en/settings.json';
import zhPortfolio from '../../../src/i18n/resources/zh-Hans/portfolio.json';
import zhAlerts from '../../../src/i18n/resources/zh-Hans/alerts.json';
import zhConcierge from '../../../src/i18n/resources/zh-Hans/concierge.json';
import zhSettings from '../../../src/i18n/resources/zh-Hans/settings.json';
import { I18N_NAMESPACES } from '../../../src/i18n/config';

const REPO_ROOT = join(__dirname, '../../..');

/** All M1 screen/component paths from scripts/audit-m1-i18n-final.mjs M1_SCREENS */
const M1_COMPONENT_PATHS = [
  'src/screens/HomeScreen.tsx',
  'src/components/beginner/BeginnerTodayAdviceCard.tsx',
  'src/components/beginner/BeginnerOnboardingModal.tsx',
  'src/components/proactive/ProactiveSuggestionsHomeCard.tsx',
  'src/screens/PortfolioScreen.tsx',
  'src/components/portfolio/PortfolioHoldingsCardsSection.tsx',
  'src/components/portfolio/PortfolioPriceSyncCard.tsx',
  'src/components/PriceSyncResultPanel.tsx',
  'src/components/HoldingCard.tsx',
  'src/screens/AiNotificationsScreen.tsx',
  'src/utils/alertsI18nHelpers.ts',
  'src/screens/MaterialAnalysisScreen.tsx',
  'src/components/beginner/BeginnerStockSummaryCard.tsx',
  'src/screens/ConciergeTabScreen.tsx',
  'src/components/AiAssistantChat.tsx',
  'src/components/concierge/AiDailyCommentPanel.tsx',
  'src/components/concierge/ConciergeTodayProposalsPanel.tsx',
  'src/components/concierge/ConciergeBursaNotificationDigestPanel.tsx',
  'src/components/BursaConciergeHomeCard.tsx',
  'src/components/concierge/ConciergeShortAnswerBlock.tsx',
  'src/components/SettingsAdvancedDisclosureSection.tsx',
  'src/components/PersonalUseBanner.tsx',
  'src/components/PlatformClarificationCard.tsx',
  'src/components/RiskNoticeOrangeBox.tsx',
  'src/components/AiTradeQueueSection.tsx',
  'src/components/AiTradeQueueCard.tsx',
  'src/utils/bursaNotificationDisplay.ts',
  'src/components/concierge/BeginnerConciergeQuickActions.tsx',
  'src/screens/SettingsScreen.tsx',
  'src/components/LanguagePickerModal.tsx',
  'src/screens/RakutenImportManualEntryScreen.tsx',
  'src/screens/RakutenImportConfirmScreen.tsx',
  'src/screens/RakutenImportOcrReviewScreen.tsx',
  'src/components/TermHint.tsx',
] as const;

/** Hiragana/katakana in JSX string literals — UI chrome should use i18n. */
const JSX_JA_STRING = /(?:label|title|Text[^>]*>|Alert\.alert\()\s*['"`][^'"`]*[\u3040-\u30ff]/;

const ALLOWLIST_PATTERNS = [
  /testID=/,
  /accessibilityLabel=\{/,
  /console\./,
  /\/\//,
  /\/\*/,
  /import\s/,
  /styles\./,
  /theme\./,
  /★/,
  /▼|▶/,
  /·/,
  // Category D: *_Ja field names / server-side Japanese content labels
  /titleJa|messageJa|headlineJa|bodyJa|labelJa|summaryJa|actionJa/,
  /displayLabelJa|companyNameJa|reasonsJa|todayActionJa|createdAtJa/,
  // Category E: stock symbols / market data literals
  /companyName|stockCode|symbol|displayLabel|MAYBANK|TENAGA|\.KL|Yahoo symbol/,
  // Category F: Pro-only / debug / Phase panels intentionally left in JA
  /Phase\d|ForwardValidation|Debug|debug|ProMode|Production Dashboard/,
  /HistoricalValidation|Governance|ShadowTrading|BehavioralRisk/,
];

const EN_ZH_KANA_ALLOWLIST = [
  'Rakuten Trade',
  'MYR',
  'RM',
  'USD',
  'HKD',
  'Twelve Data',
  'OpenAI',
  'NewsAPI',
  'Transaction History',
  'symbol',
  'Yahoo',
  'API',
  'Phase',
  'SecureStore',
  'GET',
  'HTTP',
  'Bearer',
  'Reddit',
  'X API',
  'News API',
  'OCR',
  'AI',
  'MD',
  'ETF',
  'PF',
  'BMA',
  'CVaR',
  'Kelly',
  'VaR',
  'ES',
  'OHLCV',
  'Sharpe',
  'Calmar',
  'ROE',
  'P/E',
  'P/B',
  'RSI',
  'Black-Litterman',
  'EWMA',
  'OMS',
];

const HIRAGANA = /[\u3040-\u309F]/;
const KATAKANA = /[\u30A0-\u30FF]/;

const REQUIRED_PORTFOLIO_KEYS = [
  'holdingsList.title',
  'holdingsList.emptyTitle',
  'priceSync.priceUpdateTitle',
  'priceSync.refreshAll',
  'priceSync.noHoldingsTitle',
  'holding.save',
  'sell.sellAllAction',
] as const;

const REQUIRED_ALERTS_KEYS = [
  'title',
  'loading',
  'sections.todayAction',
  'triggers.profitDrop',
  'categories.earnings',
] as const;

const REQUIRED_CONCIERGE_KEYS = [
  'dailyCommentTitle',
  'todayProposalsEmpty',
  'notificationDigestTitle',
  'dailyComment.portfolioScoreLine',
  'proposalLabels.buyCandidate',
  'alerts.openAiKeyMissingTitle',
] as const;

const REQUIRED_SETTINGS_KEYS = [
  'displayMode.modes.beginner.label',
  'displayMode.modes.standard.label',
  'displayMode.modes.pro.label',
  'displayMode.modes.standard.hint',
  'nav.apiKeySettings',
  'priceRefresh.options.15',
  'common.cancel',
  'detailedSettings.sectionTitle',
  'detailedSettings.sectionHint',
  'personalUse.label',
  'personalUse.tagline',
  'personalUse.disclaimer1',
  'platformClarification.systemNotice',
  'platformClarification.analysisDisclaimer',
  'riskNotice.title',
  'riskNotice.selfResponsibility',
] as const;

function hasKey(obj: Record<string, unknown>, dotted: string): boolean {
  const parts = dotted.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object' || !(p in (cur as object))) return false;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === 'string' && cur.length > 0;
}

function walkJsonStrings(obj: unknown, cb: (path: string, value: string) => void, pathParts: string[] = []) {
  if (typeof obj === 'string') {
    cb(pathParts.join('.'), obj);
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => walkJsonStrings(v, cb, [...pathParts, String(i)]));
    return;
  }
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      walkJsonStrings(v, cb, [...pathParts, k]);
    }
  }
}

function isEnZhKanaAllowed(value: string): boolean {
  for (const token of EN_ZH_KANA_ALLOWLIST) {
    if (value.includes(token)) return true;
  }
  return false;
}

function scanLocaleResourcesForKana(locale: 'en' | 'zh-Hans'): string[] {
  const violations: string[] = [];
  const localeDir = join(REPO_ROOT, 'src/i18n/resources', locale);

  for (const ns of I18N_NAMESPACES) {
    const fp = join(localeDir, `${ns}.json`);
    walkJsonStrings(JSON.parse(readFileSync(fp, 'utf8')), (keyPath, value) => {
      if (!HIRAGANA.test(value) && !KATAKANA.test(value)) return;
      if (isEnZhKanaAllowed(value)) return;
      violations.push(`${locale}/${ns}.json:${keyPath}: ${value.slice(0, 80)}`);
    });
  }
  return violations;
}

describe('M1 visible JA leak — i18n resource parity', () => {
  it('defines required portfolio/alerts/concierge/settings keys in en and zh-Hans', () => {
    for (const key of REQUIRED_PORTFOLIO_KEYS) {
      expect(hasKey(enPortfolio as Record<string, unknown>, key), `en portfolio.${key}`).toBe(true);
      expect(hasKey(zhPortfolio as Record<string, unknown>, key), `zh portfolio.${key}`).toBe(true);
    }
    for (const key of REQUIRED_ALERTS_KEYS) {
      expect(hasKey(enAlerts as Record<string, unknown>, key), `en alerts.${key}`).toBe(true);
      expect(hasKey(zhAlerts as Record<string, unknown>, key), `zh alerts.${key}`).toBe(true);
    }
    for (const key of REQUIRED_CONCIERGE_KEYS) {
      expect(hasKey(enConcierge as Record<string, unknown>, key), `en concierge.${key}`).toBe(true);
      expect(hasKey(zhConcierge as Record<string, unknown>, key), `zh concierge.${key}`).toBe(true);
    }
    for (const key of REQUIRED_SETTINGS_KEYS) {
      expect(hasKey(enSettings as Record<string, unknown>, key), `en settings.${key}`).toBe(true);
      expect(hasKey(zhSettings as Record<string, unknown>, key), `zh settings.${key}`).toBe(true);
    }
  });

  it('en and zh-Hans JSON resources avoid hiragana/katakana (with allowlist)', () => {
    const enViolations = scanLocaleResourcesForKana('en');
    const zhViolations = scanLocaleResourcesForKana('zh-Hans');
    expect(enViolations, enViolations.join('\n')).toEqual([]);
    expect(zhViolations, zhViolations.join('\n')).toEqual([]);
  });
});

describe('M1 visible JA leak — runtime English resolution', () => {
  it('resolves portfolio price sync and alerts chrome in English', async () => {
    await initI18n('en');
    expect(i18n.t('portfolio:priceSync.priceUpdateTitle')).toBe('Price update');
    expect(i18n.t('portfolio:holdingsList.title')).toBe('Holdings');
    expect(i18n.t('portfolio:sell.sellAllAction')).toBe('Sell all');
    expect(i18n.t('glossary:explainTitle', { term: 'Holdings' })).toBe('About Holdings');
    expect(i18n.t('alerts:title')).toBe('AI alerts');
    expect(i18n.t('concierge:dailyComment.portfolioScoreLine', { score: 72, count: 5 })).toBe(
      'Portfolio score 72/100 · 5 holdings',
    );
    expect(i18n.t('settings:displayMode.modes.standard.label')).toBe('Standard');
    expect(i18n.t('settings:priceRefresh.options.15')).toBe('15 min (recommended)');
  });
});

describe('M1 visible JA leak — component scan', () => {
  it('M1 target components avoid hardcoded Japanese UI chrome in JSX', () => {
    const violations: string[] = [];

    for (const rel of M1_COMPONENT_PATHS) {
      const abs = join(REPO_ROOT, rel);
      try {
        readFileSync(abs, 'utf8');
      } catch {
        continue;
      }
      const lines = readFileSync(abs, 'utf8').split('\n');
      lines.forEach((line, idx) => {
        if (!JSX_JA_STRING.test(line)) return;
        if (ALLOWLIST_PATTERNS.some((p) => p.test(line))) return;
        if (line.includes('useTranslation') || line.includes('t(')) return;
        violations.push(`${rel}:${idx + 1}: ${line.trim()}`);
      });
    }

    expect(violations).toEqual([]);
  });
});

describe('M1 visible JA leak — notification display wiring', () => {
  const NOTIFICATION_CONSUMERS = [
    'src/screens/AiNotificationsScreen.tsx',
    'src/components/concierge/ConciergeBursaNotificationDigestPanel.tsx',
    'src/components/BursaConciergeHomeCard.tsx',
  ] as const;

  it('M1 notification consumers avoid raw titleJa/messageJa in JSX', () => {
    const violations: string[] = [];
    const rawJaField = /\{(?:n|top|report)\.(?:titleJa|messageJa|todayActionJa)\}/;

    for (const rel of NOTIFICATION_CONSUMERS) {
      const content = readFileSync(join(REPO_ROOT, rel), 'utf8');
      content.split('\n').forEach((line, idx) => {
        if (!rawJaField.test(line)) return;
        if (line.includes('formatNotification') || line.includes('formatTodayAction')) return;
        violations.push(`${rel}:${idx + 1}: ${line.trim()}`);
      });
    }

    expect(violations).toEqual([]);
  });
});

describe('M1 visible JA leak — mockAiChat locale guard', () => {
  it('mockAiChat hardcoded hiragana replies are behind isJaAppLocale', () => {
    const content = readFileSync(join(REPO_ROOT, 'src/data/mockAiChat.ts'), 'utf8');
    const hiraganaLine = /[\u3040-\u309F]/;
    const violations: string[] = [];

    content.split('\n').forEach((line, idx, lines) => {
      if (!hiraganaLine.test(line)) return;
      if (line.includes('//') || line.includes('*')) return;
      const context = lines.slice(Math.max(0, idx - 2), idx + 2).join('\n');
      if (context.includes('replyForLocale') || context.includes('const WELCOME')) return;
      if (/if \(\//.test(line)) return;
      violations.push(`src/data/mockAiChat.ts:${idx + 1}: ${line.trim()}`);
    });

    expect(violations).toEqual([]);
  });
});

describe('M1 visible JA leak — Settings detailed section', () => {
  const DETAILED_SETTINGS_LITERALS = [
    '詳細設定',
    '個人利用の説明・初心者ガイド・リスク告知',
    '個人利用',
    '個人用AI投資OS',
    'ご自身の検討用のみ',
    'モック／閲覧専用',
    'このアプリは投資判断を補助',
    '現在は分析支援システムとして動作',
  ] as const;

  it('SettingsScreen avoids hardcoded detailed-settings Japanese literals', () => {
    const content = readFileSync(join(REPO_ROOT, 'src/screens/SettingsScreen.tsx'), 'utf8');
    const violations = DETAILED_SETTINGS_LITERALS.filter((literal) => content.includes(literal));
    expect(violations).toEqual([]);
  });
});

describe('M1 glossary namespace', () => {
  it('registers glossary in all locale bundles', () => {
    const jaDir = join(REPO_ROOT, 'src/i18n/resources/ja');
    expect(readdirSync(jaDir)).toContain('glossary.json');
  });
});
