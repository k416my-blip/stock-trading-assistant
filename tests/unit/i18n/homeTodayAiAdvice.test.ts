import { describe, expect, it } from 'vitest';
import { initI18n, i18n } from '../../../src/i18n';
import jaHome from '../../../src/i18n/resources/ja/home.json';
import enHome from '../../../src/i18n/resources/en/home.json';
import zhHome from '../../../src/i18n/resources/zh-Hans/home.json';
import {
  buildBeginnerTodayAdvice,
  resolveTodayAdviceCardLoading,
} from '../../../src/services/beginner/beginnerTodayAdviceBuilder';

describe('home todayAiAdvice i18n resources', () => {
  it('defines title, loading, empty, and emptyHint in ja, en, zh-Hans JSON', () => {
    expect(jaHome.todayAiAdvice.title).toBe('今日のAIアドバイス');
    expect(jaHome.todayAiAdvice.loading).toBe('AIアドバイスを取得中…');
    expect(jaHome.todayAiAdvice.empty).toBe('現在、AIアドバイスはありません');
    expect(jaHome.todayAiAdvice.emptyHint).toBe(
      '入金額または保有銘柄を追加すると、AIが提案を作成します',
    );

    expect(enHome.todayAiAdvice.title).toBe("Today's AI advice");
    expect(enHome.todayAiAdvice.loading).toBe('Loading AI advice...');
    expect(enHome.todayAiAdvice.empty).toBe('No AI advice yet');
    expect(enHome.todayAiAdvice.emptyHint).toBe(
      'Add a deposit amount or holdings to generate advice',
    );

    expect(zhHome.todayAiAdvice.title).toBe('今日AI建议');
    expect(zhHome.todayAiAdvice.loading).toBe('正在获取AI建议...');
    expect(zhHome.todayAiAdvice.empty).toBe('暂无AI建议');
    expect(zhHome.todayAiAdvice.emptyHint).toBe('添加入金金额或持仓后，AI会生成建议');
  });
});

describe('home todayAiAdvice runtime i18n', () => {
  it('resolves keys for Japanese and English', async () => {
    await initI18n('ja');
    expect(i18n.t('home:todayAiAdvice.title')).toBe('今日のAIアドバイス');
    expect(i18n.t('home:todayAiAdvice.empty')).toBe('現在、AIアドバイスはありません');

    await initI18n('en');
    expect(i18n.t('home:todayAiAdvice.title')).toBe("Today's AI advice");
    expect(i18n.t('home:todayAiAdvice.empty')).toBe('No AI advice yet');
    expect(i18n.t('home:todayAiAdvice.lineMonitor', { name: 'MAYBANK' })).toBe(
      'MAYBANK — Watch',
    );
  });
});

describe('resolveTodayAdviceCardLoading', () => {
  it('shows loading only while material fetch is pending', () => {
    expect(
      resolveTodayAdviceCardLoading({
        materialLoading: true,
        materialReport: null,
        materialError: null,
        materialContextAvailable: true,
        timedOut: false,
      }),
    ).toBe(true);

    expect(
      resolveTodayAdviceCardLoading({
        materialLoading: true,
        materialReport: null,
        materialError: null,
        materialContextAvailable: true,
        timedOut: true,
      }),
    ).toBe(false);
  });

  it('clears loading on API error, missing context, or report arrival', () => {
    expect(
      resolveTodayAdviceCardLoading({
        materialLoading: true,
        materialReport: null,
        materialError: 'network error',
        materialContextAvailable: true,
      }),
    ).toBe(false);

    expect(
      resolveTodayAdviceCardLoading({
        materialLoading: true,
        materialReport: null,
        materialError: null,
        materialContextAvailable: false,
      }),
    ).toBe(false);

    expect(
      resolveTodayAdviceCardLoading({
        materialLoading: true,
        materialReport: { stocks: [] } as never,
        materialError: null,
        materialContextAvailable: true,
      }),
    ).toBe(false);

    expect(
      resolveTodayAdviceCardLoading({
        materialLoading: false,
        materialReport: null,
        materialError: null,
        materialContextAvailable: true,
      }),
    ).toBe(false);
  });
});

describe('buildBeginnerTodayAdvice empty state', () => {
  it('returns empty lines without loading when holdings and proposals are zero', () => {
    const data = buildBeginnerTodayAdvice({
      holdings: [],
      materialReport: null,
      strategyBundle: null,
      loading: false,
    });

    expect(data.loading).toBe(false);
    expect(data.lines).toEqual([]);
  });

  it('keeps loading true only when explicitly requested', () => {
    const loading = buildBeginnerTodayAdvice({
      holdings: [],
      materialReport: null,
      strategyBundle: null,
      loading: true,
    });
    const ready = buildBeginnerTodayAdvice({
      holdings: [],
      materialReport: null,
      strategyBundle: null,
      loading: false,
    });

    expect(loading.loading).toBe(true);
    expect(ready.loading).toBe(false);
    expect(ready.lines).toEqual([]);
  });
});
