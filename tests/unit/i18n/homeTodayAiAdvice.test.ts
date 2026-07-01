import { describe, expect, it } from 'vitest';
import { initI18n, i18n } from '../../../src/i18n';
import jaHome from '../../../src/i18n/resources/ja/home.json';
import enHome from '../../../src/i18n/resources/en/home.json';
import zhHome from '../../../src/i18n/resources/zh-Hans/home.json';

describe('home todayAiAdvice i18n resources', () => {
  it('defines title and loading in ja, en, zh-Hans JSON', () => {
    expect(jaHome.todayAiAdvice.title).toBe('今日のAIアドバイス');
    expect(jaHome.todayAiAdvice.loading).toBe('AIアドバイスを取得中…');
    expect(enHome.todayAiAdvice.title).toBe("Today's AI advice");
    expect(enHome.todayAiAdvice.loading).toBe('Loading AI advice...');
    expect(zhHome.todayAiAdvice.title).toBe('今日AI建议');
    expect(zhHome.todayAiAdvice.loading).toBe('正在获取AI建议...');
  });
});

describe('home todayAiAdvice runtime i18n', () => {
  it('resolves keys for Japanese and English', async () => {
    await initI18n('ja');
    expect(i18n.t('home:todayAiAdvice.title')).toBe('今日のAIアドバイス');

    await initI18n('en');
    expect(i18n.t('home:todayAiAdvice.title')).toBe("Today's AI advice");
    expect(i18n.t('home:todayAiAdvice.lineMonitor', { name: 'MAYBANK' })).toBe(
      'MAYBANK — Watch',
    );
  });
});
