import { describe, expect, it } from 'vitest';
import { initI18n, i18n, setCurrentAppLanguageSync } from '../../../src/i18n';
import {
  formatMissingDataLabel,
  formatNotificationMessageDisplay,
  formatNotificationTitleDisplay,
  formatTodayActionDisplay,
  formatTodayReasonDisplay,
} from '../../../src/utils/bursaNotificationDisplay';

describe('bursaNotificationDisplay', () => {
  it('translates notification title trigger in English', async () => {
    await initI18n('en');
    setCurrentAppLanguageSync('en');
    const t = i18n.getFixedT('en', 'alerts');

    expect(
      formatNotificationTitleDisplay(
        { titleJa: 'IOI — 利益急減', triggerKindJa: '利益急減' },
        t,
      ),
    ).toBe('IOI — Profit drop');
  });

  it('translates net profit decrease message in English', async () => {
    await initI18n('en');
    setCurrentAppLanguageSync('en');
    const t = i18n.getFixedT('en', 'alerts');

    expect(
      formatNotificationMessageDisplay(
        'IOIの純利益が22.3%減少（2024Q3 → 2024Q4）',
        t,
      ),
    ).toBe('IOI net profit decreased by 22.3% (2024Q3 → 2024Q4)');
  });

  it('translates today action buy recommendation in English', async () => {
    await initI18n('en');
    setCurrentAppLanguageSync('en');
    const t = i18n.getFixedT('en', 'alerts');

    expect(formatTodayActionDisplay('本日の最重要行動: HENGYUANを3200株購入推奨', t)).toBe(
      "Today's top action: Recommended buy: HENGYUAN, 3200 shares",
    );
  });

  it('translates undervalued rank reason in English', async () => {
    await initI18n('en');
    setCurrentAppLanguageSync('en');
    const t = i18n.getFixedT('en', 'alerts');

    expect(formatTodayReasonDisplay('割安 12.5% · 総合 3位', t)).toBe(
      'Undervalued 12.5% · Overall rank 3',
    );
  });

  it('returns Japanese originals in ja locale', async () => {
    await initI18n('ja');
    setCurrentAppLanguageSync('ja');
    const t = i18n.getFixedT('ja', 'alerts');

    expect(formatMissingDataLabel(t)).toBe('データ未取得');
    expect(formatTodayActionDisplay('本日の最重要行動: MAYBANK買い検討', t)).toBe(
      '本日の最重要行動: MAYBANK買い検討',
    );
  });
});
