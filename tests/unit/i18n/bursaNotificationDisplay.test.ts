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

  it('translates dividend cut title and message in English', async () => {
    await initI18n('en');
    setCurrentAppLanguageSync('en');
    const t = i18n.getFixedT('en', 'alerts');

    expect(
      formatNotificationTitleDisplay(
        { titleJa: 'ZETRIX — 減配', triggerKindJa: '減配' },
        t,
      ),
    ).toBe('ZETRIX — Dividend cut');

    expect(formatNotificationMessageDisplay('ZETRIXが減配しました', t)).toBe(
      'ZETRIX cut its dividend',
    );

    expect(formatNotificationMessageDisplay('IOIが減配しました', t)).toBe('IOI cut its dividend');
  });

  it('translates dividend cut title and message in zh-Hans', async () => {
    await initI18n('zh-Hans');
    setCurrentAppLanguageSync('zh-Hans');
    const t = i18n.getFixedT('zh-Hans', 'alerts');

    expect(
      formatNotificationTitleDisplay(
        { titleJa: 'ZETRIX — 減配', triggerKindJa: '減配' },
        t,
      ),
    ).toBe('ZETRIX — 削减股息');

    expect(formatNotificationMessageDisplay('ZETRIXが減配しました', t)).toBe(
      'ZETRIX削减了股息',
    );
  });

  it('maps Chinese dividend suffix in title via trigger alias', async () => {
    await initI18n('en');
    setCurrentAppLanguageSync('en');
    const t = i18n.getFixedT('en', 'alerts');

    expect(
      formatNotificationTitleDisplay(
        { titleJa: 'IOI — 削减股息', triggerKindJa: '減配' },
        t,
      ),
    ).toBe('IOI — Dividend cut');
  });
});
