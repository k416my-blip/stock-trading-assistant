import { describe, expect, it } from 'vitest';
import { buildAiAnalystReportAsync, buildEmptyAnalystReport } from '../../src/services/aiAnalystReportBuilder';
import {
  computeCompositeFromPartial,
  computeDimensionScoresFromRealData,
  scoreToGrade,
} from '../../src/services/aiRankingEngine';
import { assembleAiStockReport } from '../../src/services/aiStockReportService';
import type { AiStockReportRawData } from '../../src/services/aiStockReportDataFetcher';
import type { PortfolioPosition } from '../../src/types';

const chinaMobile: PortfolioPosition = {
  id: 'pos-941',
  symbol: '0941',
  companyName: 'China Mobile Limited',
  market: 'hk',
  currency: 'HKD',
  shares: 1,
  averageBuyPrice: 68.5,
  currentPrice: 82.35,
  openedAt: '2024-01-01T00:00:00.000Z',
};

function mockRaw(partial: Partial<AiStockReportRawData> = {}): AiStockReportRawData {
  return {
    symbol: '0941',
    market: 'hk',
    currency: 'HKD',
    yahoo: {
      ok: true,
      yahooSymbol: '0941.HK',
      requestUrl: 'https://example.com',
      fetched: ['companyName', 'sector', 'pe', 'eps', 'revenue', 'profit', 'dividendYield', 'marketCap'],
      missing: [],
      companyName: 'China Mobile Limited',
      sector: 'Communication Services',
      marketCap: 1_400_000_000_000,
      dividendYieldPct: 6.2,
      pe: 9.8,
      eps: 6.99,
      revenue: 900_000_000_000,
      profit: 130_000_000_000,
      operatingIncome: 150_000_000_000,
      profitMarginPct: 18,
      businessDescription: 'China telecom leader.',
      debtToEquity: 0.4,
      freeCashflow: 80_000_000_000,
      operatingCashflow: 120_000_000_000,
      revenueGrowthPct: 4.2,
    },
    currentPrice: 82.35,
    volume: 12_000_000,
    marketStatusJa: '取引時間外',
    newsHeadlines: [
      { title: 'China Mobile profit beat', sentiment: 'positive' },
      { title: 'Sector regulation risk', sentiment: 'negative' },
    ],
    positiveNewsCount: 1,
    negativeNewsCount: 1,
    fetchedFields: ['companyName', 'currentPrice', 'newsHeadlines'],
    missingFields: ['equityRatio'],
    sourceStatus: { yahooFinance: 'ok', twelveData: 'ok', newsApi: 'ok', bursaMalaysia: 'skipped' },
    apiLimitNotes: ['test'],
    bursa: null,
    bursaPhase3: null,
    bursaPhase4: null,
    bursaPhase5: null,
    ...partial,
  };
}

describe('aiRankingEngine real metrics', () => {
  it('computes scores only from real metrics', () => {
    const partial = computeDimensionScoresFromRealData({
      per: 9.8,
      dividendYieldPct: 6.2,
      marketCap: 1_400_000_000_000,
      volume: 12_000_000,
      revenueGrowthPct: 4.2,
      profitMarginPct: 18,
    });
    expect(partial.growth).not.toBeNull();
    expect(partial.dividendAppeal).not.toBeNull();
    const { compositeScore } = computeCompositeFromPartial(partial);
    expect(compositeScore).not.toBeNull();
    expect(scoreToGrade(compositeScore!)).toBeTruthy();
  });
});

describe('assembleAiStockReport', () => {
  it('uses live fields and missing label for unavailable data', () => {
    const report = assembleAiStockReport(mockRaw(), chinaMobile);
    expect(report.dataSource).toBe('live');
    expect(report.overview.companyName).toContain('China Mobile');
    expect(report.financials.revenueJa).not.toContain('推定');
    expect(report.health.equityRatioJa).toBe('データ未取得');
    expect(report.competitiveness.entryBarrierJa).toBe('データ未取得');
    expect(report.news.positiveCount).toBe(1);
    expect(report.evaluation.compositeScore).not.toBeNull();
  });
});

describe('buildAiAnalystReportAsync', () => {
  it('without holdings: candidate summary only', async () => {
    const result = await buildAiAnalystReportAsync({
      portfolio: {
        portfolioScore: 50,
        rankedHoldings: [],
        bestToday: [{
          rank: 1, symbol: '0883', displayLabelJa: '0883・香港', action: 'buy', confidence: 80,
          rsi14: 50, rsiSource: 'yahoo_finance', rationaleJa: 'x', finalScore: 65, ruleScore: 50,
          aiScore: 80, displayTone: 'buy',
          dataSources: { quote: null, rsi: 'Yahoo', news: 'RSS', x: null }, weightPct: 10,
        }],
        worstToday: [],
        riskWarnings: [],
        holdingCount: 0,
        generatedAt: '',
        evaluatedAtJa: '',
        batchSource: 'mock',
      },
      holdings: [],
    });
    expect(result.holdingReports).toHaveLength(0);
    expect(result.candidateSummaryJa).toContain('本日の強い候補');
  });

  it('placeholder shows loading for holdings', () => {
    const p = buildEmptyAnalystReport({ portfolio: null, holdings: [chinaMobile] });
    expect(p.loading).toBe(true);
  });
});
