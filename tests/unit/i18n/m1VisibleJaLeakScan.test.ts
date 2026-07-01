import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
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

const REPO_ROOT = join(__dirname, '../../..');

const M1_COMPONENT_PATHS = [
  'src/components/portfolio/PortfolioHoldingsCardsSection.tsx',
  'src/components/portfolio/PortfolioPriceSyncCard.tsx',
  'src/components/PriceSyncResultPanel.tsx',
  'src/screens/AiNotificationsScreen.tsx',
  'src/components/concierge/AiDailyCommentPanel.tsx',
  'src/components/concierge/ConciergeTodayProposalsPanel.tsx',
  'src/components/concierge/ConciergeBursaNotificationDigestPanel.tsx',
  'src/screens/SettingsScreen.tsx',
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
];

const REQUIRED_PORTFOLIO_KEYS = [
  'holdingsList.title',
  'holdingsList.emptyTitle',
  'priceSync.priceUpdateTitle',
  'priceSync.refreshAll',
  'priceSync.noHoldingsTitle',
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
] as const;

const REQUIRED_SETTINGS_KEYS = [
  'displayMode.modes.beginner.label',
  'displayMode.modes.standard.label',
  'displayMode.modes.pro.label',
  'displayMode.modes.standard.hint',
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
});

describe('M1 visible JA leak — runtime English resolution', () => {
  it('resolves portfolio price sync and alerts chrome in English', async () => {
    await initI18n('en');
    expect(i18n.t('portfolio:priceSync.priceUpdateTitle')).toBe('Price update');
    expect(i18n.t('portfolio:holdingsList.title')).toBe('Holdings');
    expect(i18n.t('alerts:title')).toBe('AI alerts');
    expect(i18n.t('concierge:dailyComment.portfolioScoreLine', { score: 72, count: 5 })).toBe(
      'Portfolio score 72/100 · 5 holdings',
    );
    expect(i18n.t('settings:displayMode.modes.standard.label')).toBe('Standard');
  });
});

describe('M1 visible JA leak — component scan', () => {
  it('M1 target components avoid hardcoded Japanese UI chrome in JSX', () => {
    const violations: string[] = [];

    for (const rel of M1_COMPONENT_PATHS) {
      const abs = join(REPO_ROOT, rel);
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
