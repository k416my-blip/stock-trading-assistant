import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { parseBursaCompanyProfileFromHtml } from '../../src/services/bursa/bursaCompanyProfileService';
import { parseBursaQuarterlyFromHtml } from '../../src/services/bursa/bursaQuarterlyService';
import { parseBursaDividendFromHtml } from '../../src/services/bursa/bursaDividendService';
import { formatMarketMonitoringReport } from '../../src/services/bursa/bursaMarketMonitoringService';
import {
  buildDividendChanges,
  buildEarningsChanges,
  buildMonitoringSnapshot,
  buildRankChanges,
} from '../../src/services/bursa/bursaMonitoringDetectors';
import { inMemoryMonitoringStorageBackend } from '../../src/services/bursa/bursaMonitoringStorage';
import { buildBursaPhase6FromBundles } from '../../src/services/bursa/bursaPhase6Analysis';
import { buildBursaPhase9FromBundles } from '../../src/services/bursa/bursaPhase9Analysis';
import type { BursaDisclosureBundle } from '../../types/bursaDisclosure';
import type { PortfolioPosition } from '../../types';

const root = process.cwd();
const VERIFY_CODES = ['1155', '1066', '5819', '5183'];

function loadBundle(code: string): BursaDisclosureBundle | null {
  const path = join(root, `scripts/klse-sample-${code}.html`);
  if (!existsSync(path)) return null;
  const html = readFileSync(path, 'utf8');
  return {
    stockCode: code,
    profile: parseBursaCompanyProfileFromHtml(html, code),
    quarterly: parseBursaQuarterlyFromHtml(html, code),
    dividend: parseBursaDividendFromHtml(html, code),
    dataSource: 'klse_screener',
    fetchedFields: [],
    missingFields: [],
    apiNotes: [],
  };
}

function verifyHoldings(): PortfolioPosition[] {
  return VERIFY_CODES.map((code) => ({
    id: `h-${code}`,
    symbol: code,
    market: 'bursa' as const,
    shares: 1000,
    currentPrice: null,
    companyName: null,
  }));
}

describe('bursa Phase9 market monitoring', () => {
  it('detects earnings and dividend changes from real fixtures', () => {
    const bundles = VERIFY_CODES.map(loadBundle).filter(Boolean) as BursaDisclosureBundle[];
    expect(bundles.length).toBe(4);

    const held = new Set(VERIFY_CODES);
    const earnings = buildEarningsChanges({ bundles, holdingCodes: held, watchlistCodes: new Set() });
    expect(earnings.length).toBe(4);
    for (const e of earnings) {
      expect(e.latestPeriodJa).not.toBe('データ未取得');
    }

    const dividends = buildDividendChanges({ bundles, holdingCodes: held, watchlistCodes: new Set() });
    expect(dividends.length).toBe(4);
    expect(dividends.some((d) => d.status != null)).toBe(true);
  });

  it('compares rank changes when previous snapshot exists', () => {
    const bundles = VERIFY_CODES.map(loadBundle).filter(Boolean) as BursaDisclosureBundle[];
    const phase6 = buildBursaPhase6FromBundles({ bundles });
    const previous = buildMonitoringSnapshot(phase6.rankedTop100, '2026-06-01T00:00:00.000Z');
    const rankChanges = buildRankChanges({
      previous,
      currentRanked: phase6.rankedTop100,
      holdingCodes: new Set(VERIFY_CODES),
      watchlistCodes: new Set(),
    });
    expect(rankChanges.length).toBeGreaterThan(0);
    expect(rankChanges.every((r) => r.changeLabelJa.includes('位'))).toBe(true);
  });

  it('builds full phase9 report with storage backend', async () => {
    const bundles = VERIFY_CODES.map(loadBundle).filter(Boolean) as BursaDisclosureBundle[];
    const storage = inMemoryMonitoringStorageBackend();
    const phase9 = await buildBursaPhase9FromBundles({
      bundles,
      holdings: verifyHoldings(),
      watchlist: VERIFY_CODES.map((c) => ({
        stockCode: c,
        companyName: null,
        addedAt: '2026-06-01T00:00:00.000Z',
      })),
      storage,
    });

    expect(phase9.earningsChanges.length).toBe(4);
    expect(phase9.holdingsMonitor.earningsChanges.length).toBe(4);
    const report = formatMarketMonitoringReport(phase9);
    expect(report.earningsChanges.length).toBe(4);
  });
});
