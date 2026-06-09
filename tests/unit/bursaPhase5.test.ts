import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { parseBursaCompanyProfileFromHtml } from '../../src/services/bursa/bursaCompanyProfileService';
import { parseBursaQuarterlyFromHtml } from '../../src/services/bursa/bursaQuarterlyService';
import { parseBursaDividendFromHtml } from '../../src/services/bursa/bursaDividendService';
import { buildBursaPhase3FromSnapshots } from '../../src/services/bursa/bursaPhase3Analysis';
import { buildBursaPhase5Analysis } from '../../src/services/bursa/bursaPhase5Analysis';
import { relativeDiffPct } from '../../src/services/bursa/bursaPeerEnhancedComparison';
import { computeFairValueByPer } from '../../src/services/bursa/bursaFairValue';
import { filterCompleteFyAnnual } from '../../src/services/bursa/bursaTrendAnalysis';
import { assembleAiStockReport } from '../../src/services/aiStockReportService';
import type { AiStockReportRawData } from '../../src/services/aiStockReportDataFetcher';
import type { BursaDisclosureBundle, BursaPeerSnapshot } from '../../src/types/bursaDisclosure';
import { emptyYahooFundamentals } from '../helpers/bursaPortfolioFixture';

const root = process.cwd();

function loadMaybankBundle(): BursaDisclosureBundle {
  const html = readFileSync(join(root, 'scripts/klse-sample-1155.html'), 'utf8');
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

function snapshotFromFixture(code: string): BursaPeerSnapshot {
  const html = readFileSync(join(root, `scripts/klse-sample-${code}.html`), 'utf8');
  const profile = parseBursaCompanyProfileFromHtml(html, code);
  const quarterly = parseBursaQuarterlyFromHtml(html, code);
  const annual = filterCompleteFyAnnual(quarterly.annualRecords);
  const latestFy = annual[0] ?? null;
  let roePct: number | null = null;
  for (const q of quarterly.quarterlyHistory) {
    if (q.quarter === '4' && q.roePct != null) {
      roePct = q.roePct;
      break;
    }
  }
  return {
    stockCode: code,
    companyName: profile.companyName,
    marketCap: profile.marketCap,
    pe: profile.pe,
    dividendYieldPct: profile.dividendYieldPct,
    roePct,
    revenue: latestFy?.revenue ?? quarterly.latestQuarter?.revenue ?? null,
    netProfit: latestFy?.netProfit ?? quarterly.latestQuarter?.netProfit ?? null,
    eps: latestFy?.eps ?? quarterly.latestQuarter?.eps ?? null,
    status: profile.marketCap != null ? 'ok' : 'partial',
  };
}

describe('bursa Phase5 analyst features', () => {
  it('computes industry average diff for ROE', () => {
    const diff = relativeDiffPct(15.2, 12.4);
    expect(diff).toBeCloseTo(22.58, 1);
  });

  it('computes PER fair value and discount', () => {
    const fv = computeFairValueByPer({
      currentPrice: 10.2,
      epsSen: 60,
      industryMedianPe: 12.5,
    });
    expect(fv.fairPrice).toBeCloseTo(7.5, 2);
    expect(fv.discountPct).toBeCloseTo(-26.47, 1);
  });

  it('builds Phase5 from Maybank fixtures', () => {
    const bundle = loadMaybankBundle();
    const peers = ['1155', '1066', '5819'].map(snapshotFromFixture);
    const phase3 = buildBursaPhase3FromSnapshots(bundle, peers);
    const phase5 = buildBursaPhase5Analysis({
      bundle,
      phase3,
      currentPrice: 10.62,
    });

    expect(phase5.enhancedPeerComparison.length).toBe(5);
    const roe = phase5.enhancedPeerComparison.find((r) => r.metricKey === 'roePct');
    expect(roe?.targetValue).not.toBeNull();
    expect(roe?.industryAverage).not.toBeNull();
    expect(phase5.fairValue.fairPrice).not.toBeNull();
    expect(phase5.dividendJudgment.rating).not.toBeNull();
    expect(phase5.trendJudgment.revenue).not.toBeNull();
    expect(['強気買い', '買い', '保有', '注意', '見送り']).toContain(phase5.overallJudgment);
    expect(phase5.judgmentReasons.length).toBeLessThanOrEqual(3);
  });

  it('wires phase5 into assembled report', () => {
    const bundle = loadMaybankBundle();
    const peers = ['1155', '1066'].map(snapshotFromFixture);
    const phase3 = buildBursaPhase3FromSnapshots(bundle, peers);
    const phase5 = buildBursaPhase5Analysis({ bundle, phase3, currentPrice: 10.62 });

    const raw: AiStockReportRawData = {
      symbol: '1155',
      market: 'bursa',
      currency: 'MYR',
      yahoo: { ...emptyYahooFundamentals, yahooSymbol: '1155.KL' },
      currentPrice: 10.62,
      volume: 1_000_000,
      marketStatusJa: '取引中',
      newsHeadlines: [],
      positiveNewsCount: 0,
      negativeNewsCount: 0,
      fetchedFields: [],
      missingFields: [],
      sourceStatus: {
        yahooFinance: 'failed',
        twelveData: 'ok',
        newsApi: 'skipped',
        bursaMalaysia: 'ok',
      },
      apiLimitNotes: [],
      bursa: bundle,
      bursaPhase3: phase3,
      bursaPhase4: null,
      bursaPhase5: phase5,
    };

    const report = assembleAiStockReport(raw);
    expect(report.bursa?.phase5).not.toBeNull();
    expect(report.bursa?.phase5?.enhancedPeerRows.length).toBe(5);
    expect(report.bursa?.phase5?.overallJudgmentJa).not.toBe('データ未取得');
  });
});
