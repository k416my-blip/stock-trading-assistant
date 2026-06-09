import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { parseBursaCompanyProfileFromHtml } from '../../src/services/bursa/bursaCompanyProfileService';
import { parseBursaQuarterlyFromHtml } from '../../src/services/bursa/bursaQuarterlyService';
import { parseBursaDividendFromHtml } from '../../src/services/bursa/bursaDividendService';
import { computeBursaDimensionScores } from '../../src/services/bursa/bursaRankingMetrics';
import { buildBursaFiveYearTrend } from '../../src/services/bursa/bursaTrendAnalysis';
import { buildBursaAiPhase2Analysis } from '../../src/services/bursa/bursaAiAnalysis';
import { assembleAiStockReport } from '../../src/services/aiStockReportService';
import type { AiStockReportRawData } from '../../src/services/aiStockReportDataFetcher';
import type { BursaDisclosureBundle } from '../../src/types/bursaDisclosure';

const FIXTURE = join(process.cwd(), 'scripts/klse-sample-1155.html');

function loadBundle(): BursaDisclosureBundle {
  const html = readFileSync(FIXTURE, 'utf8');
  return {
    stockCode: '1155',
    profile: parseBursaCompanyProfileFromHtml(html, '1155'),
    quarterly: parseBursaQuarterlyFromHtml(html, '1155'),
    dividend: parseBursaDividendFromHtml(html, '1155'),
    dataSource: 'klse_screener',
    fetchedFields: [],
    missingFields: [],
    apiNotes: [],
  };
}

describe('bursa AI evaluation from KLSE data', () => {
  it('computes all 5 dimension scores for Maybank without Yahoo', () => {
    const bundle = loadBundle();
    const partial = computeBursaDimensionScores(bundle, 10.62, null);
    expect(partial.growth).not.toBeNull();
    expect(partial.profitability).not.toBeNull();
    expect(partial.stability).not.toBeNull();
    expect(partial.value).not.toBeNull();
    expect(partial.dividendAppeal).not.toBeNull();
  });

  it('assembleAiStockReport uses Bursa when Yahoo empty', () => {
    const bundle = loadBundle();
    const raw: AiStockReportRawData = {
      symbol: '1155',
      market: 'bursa',
      currency: 'MYR',
      yahoo: {
        ok: false,
        yahooSymbol: '1155.KL',
        requestUrl: '',
        fetched: [],
        missing: ['all'],
        companyName: null,
        sector: null,
        marketCap: null,
        dividendYieldPct: null,
        pe: null,
        eps: null,
        revenue: null,
        profit: null,
        operatingIncome: null,
        profitMarginPct: null,
        businessDescription: null,
        debtToEquity: null,
        freeCashflow: null,
        operatingCashflow: null,
        revenueGrowthPct: null,
      },
      currentPrice: 10.62,
      volume: null,
      marketStatusJa: '取引時間外',
      newsHeadlines: [],
      positiveNewsCount: 0,
      negativeNewsCount: 0,
      fetchedFields: [],
      missingFields: [],
      bursa: bundle,
      bursaPhase3: null,
      bursaPhase4: null,
      bursaPhase5: null,
      sourceStatus: {
        yahooFinance: 'failed',
        twelveData: 'skipped',
        newsApi: 'skipped',
        bursaMalaysia: 'ok',
      },
      apiLimitNotes: [],
    };
    const report = assembleAiStockReport(raw);
    expect(report.evaluation.availability.growth).toBe(true);
    expect(report.evaluation.availability.profitability).toBe(true);
    expect(report.evaluation.compositeScore).not.toBeNull();
    expect(report.evaluation.overallRank).not.toBeNull();
    expect(report.bursa?.phase2?.trendRows.length).toBeGreaterThanOrEqual(3);
  });

  it('builds 5-year trend for Maybank', () => {
    const bundle = loadBundle();
    const trend = buildBursaFiveYearTrend(bundle);
    expect(trend.years.length).toBeGreaterThanOrEqual(4);
    expect(trend.revenue.filter((v) => v != null).length).toBeGreaterThan(0);
    const analysis = buildBursaAiPhase2Analysis(bundle, 10.62, null);
    expect(analysis.investmentType).not.toBeNull();
    expect(analysis.compositeScore).not.toBeNull();
    console.log('Maybank 1155 evaluation:', {
      composite: analysis.compositeScore,
      rank: analysis.overallRank,
      type: analysis.investmentType,
      reasons: analysis.judgmentReasons,
      stars: {
        revenue: analysis.revenueGrowthStars,
        profit: analysis.profitGrowthStars,
        dividend: analysis.dividendGrowthStars,
        health: analysis.financialHealthStars,
      },
      dimensions: computeBursaDimensionScores(bundle, 10.62, null),
    });
  });
});
