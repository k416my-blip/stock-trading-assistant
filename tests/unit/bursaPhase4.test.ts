import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { parseBursaCompanyProfileFromHtml } from '../../src/services/bursa/bursaCompanyProfileService';
import { parseBursaQuarterlyFromHtml } from '../../src/services/bursa/bursaQuarterlyService';
import { parseBursaDividendFromHtml } from '../../src/services/bursa/bursaDividendService';
import { buildBursaPhase3FromSnapshots } from '../../src/services/bursa/bursaPhase3Analysis';
import { buildBursaPhase4FromHtml } from '../../src/services/bursa/bursaPhase4Analysis';
import { parseKlseMajorShareholders } from '../../src/services/bursa/bursaShareholdersService';
import { filterCompleteFyAnnual } from '../../src/services/bursa/bursaTrendAnalysis';
import { assembleAiStockReport } from '../../src/services/aiStockReportService';
import type { AiStockReportRawData } from '../../src/services/aiStockReportDataFetcher';
import type { BursaDisclosureBundle, BursaPeerSnapshot } from '../../src/types/bursaDisclosure';

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
  return {
    stockCode: code,
    companyName: profile.companyName,
    marketCap: profile.marketCap,
    pe: profile.pe,
    dividendYieldPct: profile.dividendYieldPct,
    roePct: null,
    revenue: latestFy?.revenue ?? quarterly.latestQuarter?.revenue ?? null,
    netProfit: latestFy?.netProfit ?? quarterly.latestQuarter?.netProfit ?? null,
    eps: latestFy?.eps ?? quarterly.latestQuarter?.eps ?? null,
    status: profile.marketCap != null ? 'ok' : 'partial',
  };
}

describe('bursa Phase4 shikiho format', () => {
  it('parses major shareholders from KLSE shareholdings fixture', () => {
    const shHtml = readFileSync(join(root, 'scripts/klse-shareholdings-1155.html'), 'utf8');
    const holders = parseKlseMajorShareholders(shHtml, '1155');

    expect(holders.length).toBeGreaterThanOrEqual(3);
    const asb = holders.find((h) => h.name.includes('AMANAH SAHAM BUMIPUTERA'));
    expect(asb?.holdingPct).toBeCloseTo(27.669, 2);
    const epf = holders.find((h) => h.name.includes('EMPLOYEES PROVIDENT FUND'));
    expect(epf?.holdingPct).toBeCloseTo(12.817, 2);
  });

  it('builds Phase4 from offline fixtures with fixed shikiho comments', () => {
    const bundle = loadMaybankBundle();
    const stockHtml = readFileSync(join(root, 'scripts/klse-sample-1155.html'), 'utf8');
    const shHtml = readFileSync(join(root, 'scripts/klse-shareholdings-1155.html'), 'utf8');
    const frPath = join(root, 'scripts/klse-financial-report-1155-2024-12-31.html');
    const frHtml = existsSync(frPath) ? readFileSync(frPath, 'utf8') : null;

    const peers = ['1155', '1066', '5819'].map(snapshotFromFixture);
    const phase3 = buildBursaPhase3FromSnapshots(bundle, peers);
    const phase4 = buildBursaPhase4FromHtml({
      bundle,
      phase3,
      negativeNewsCount: 0,
      stockHtml,
      shareholdingsHtml: shHtml,
      financialReportHtml: frHtml,
    });

    expect(phase4.majorShareholders.length).toBeGreaterThanOrEqual(3);
    expect(phase4.comments.performanceJa).not.toBe('データ未取得');
    expect(phase4.comments.summaryJa).not.toBe('データ未取得');
    expect(phase4.currentForecastStatus).toBe('none');
    expect(phase4.nextForecastStatus).toBe('undisclosed');
    expect(phase4.segmentRevenue.every((s) => s.revenuePct == null)).toBe(true);
    expect(phase4.geographicRevenue.every((g) => g.revenuePct == null)).toBe(true);
  });

  it('wires phase4 into assembled report for Bursa market', () => {
    const bundle = loadMaybankBundle();
    const stockHtml = readFileSync(join(root, 'scripts/klse-sample-1155.html'), 'utf8');
    const shHtml = readFileSync(join(root, 'scripts/klse-shareholdings-1155.html'), 'utf8');
    const peers = ['1155', '1066'].map(snapshotFromFixture);
    const phase3 = buildBursaPhase3FromSnapshots(bundle, peers);
    const phase4 = buildBursaPhase4FromHtml({
      bundle,
      phase3,
      negativeNewsCount: 1,
      stockHtml,
      shareholdingsHtml: shHtml,
      financialReportHtml: null,
    });

    const raw: AiStockReportRawData = {
      symbol: '1155',
      market: 'bursa',
      currency: 'MYR',
      yahoo: {
        ok: false,
        fetched: [],
        missing: ['all'],
        companyName: null,
        sector: null,
        revenue: null,
        operatingIncome: null,
        profit: null,
        eps: null,
        marketCap: null,
        pe: null,
        dividendYieldPct: null,
        revenueGrowthPct: null,
        profitMarginPct: null,
        debtToEquity: null,
        operatingCashflow: null,
        freeCashflow: null,
        businessDescription: null,
      },
      currentPrice: 10.5,
      volume: 1_000_000,
      marketStatusJa: '取引中',
      newsHeadlines: [],
      positiveNewsCount: 0,
      negativeNewsCount: 1,
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
      bursaPhase4: phase4,
    };

    const report = assembleAiStockReport(raw);
    expect(report.bursa?.phase4).not.toBeNull();
    expect(report.bursa?.phase4?.currentForecastJa).toBe('会社予想なし');
    expect(report.bursa?.phase4?.nextForecastJa).toBe('未開示');
    expect(report.bursa?.phase4?.majorShareholderRows.length).toBeGreaterThanOrEqual(3);
    expect(report.bursa?.phase4?.comments.performanceJa).toContain('売上');
  });
});
