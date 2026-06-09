import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { parseBursaCompanyProfileFromHtml } from '../../src/services/bursa/bursaCompanyProfileService';
import { parseBursaQuarterlyFromHtml } from '../../src/services/bursa/bursaQuarterlyService';
import { parseBursaDividendFromHtml } from '../../src/services/bursa/bursaDividendService';
import { formatTodayTradingReport } from '../../src/services/bursa/bursaTodayTradingService';
import {
  buildBudgetPlans,
  buildBuyTop10,
  buildConciergeNotifications,
  buildPrimaryAction,
  buildSellCandidates,
} from '../../src/services/bursa/bursaTodayActions';
import {
  buildBursaPhase8Analysis,
  buildBursaPhase8FromBundles,
} from '../../src/services/bursa/bursaPhase8Analysis';
import { buildBursaPhase7FromBundles } from '../../src/services/bursa/bursaPhase7Analysis';
import { buildBursaPhase6FromBundles } from '../../src/services/bursa/bursaPhase6Analysis';
import { buildBursaPhase3FromSnapshots } from '../../src/services/bursa/bursaPhase3Analysis';
import { buildBursaPhase5Analysis } from '../../src/services/bursa/bursaPhase5Analysis';
import { peerSnapshotFromBundle } from '../../src/services/bursa/bursaPeerSnapshotService';
import { BURSA_TODAY_BUDGETS_MYR } from '../../src/services/bursa/bursaStockUniverse';
import type { BursaDisclosureBundle } from '../../src/types/bursaDisclosure';
import type { PortfolioPosition } from '../../src/types';
import { bursaTestHolding } from '../helpers/bursaPortfolioFixture';

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
  return VERIFY_CODES.map((code) =>
    bursaTestHolding({
      id: `h-${code}`,
      symbol: code,
      shares: 1000,
      currentPrice: 0,
      companyName: code,
    }),
  );
}

describe('bursa Phase8 today trading', () => {
  it('defines today budgets including RM3000', () => {
    expect(BURSA_TODAY_BUDGETS_MYR).toContain(3000);
    expect(BURSA_TODAY_BUDGETS_MYR).toEqual([1000, 3000, 5000, 10000, 50000]);
  });

  it('builds buy top10 from ranked + phase5', () => {
    const bundles = VERIFY_CODES.map(loadBundle).filter(Boolean) as BursaDisclosureBundle[];
    expect(bundles.length).toBe(4);

    const snapshots = bundles.map(peerSnapshotFromBundle);
    const phase6 = buildBursaPhase6FromBundles({ bundles });
    const phase5Map = new Map(
      phase6.rankedTop100.map((r) => {
        const bundle = bundles.find((b) => b.stockCode === r.stockCode)!;
        const phase3 = buildBursaPhase3FromSnapshots(bundle, snapshots);
        const phase5 = buildBursaPhase5Analysis({
          bundle,
          phase3,
          currentPrice: r.currentPrice,
        });
        return [r.stockCode, phase5] as const;
      }),
    );

    const buyTop10 = buildBuyTop10({ ranked: phase6.rankedTop100, phase5ByCode: phase5Map });
    expect(buyTop10.length).toBeGreaterThan(0);
    expect(buyTop10.length).toBeLessThanOrEqual(10);
    for (const b of buyTop10) {
      expect(b.currentPrice).not.toBeNull();
      expect(b.fairPrice).not.toBeNull();
      expect(b.reasonJa).not.toBe('');
    }
  });

  it('builds sell candidates with mandatory reasons', () => {
    const bundles = VERIFY_CODES.map(loadBundle).filter(Boolean) as BursaDisclosureBundle[];
    const phase7 = buildBursaPhase7FromBundles({ bundles, holdings: verifyHoldings() });
    const sells = buildSellCandidates(phase7);
    for (const s of sells) {
      expect(s.reasonJa).not.toBe('');
      expect(['利益確定', '損切り', '売却']).toContain(s.kind);
    }
  });

  it('builds full phase8 report from 4-stock fixtures', () => {
    const bundles = VERIFY_CODES.map(loadBundle).filter(Boolean) as BursaDisclosureBundle[];
    const phase8 = buildBursaPhase8FromBundles({
      bundles,
      holdings: verifyHoldings(),
      budgetsMYR: [...BURSA_TODAY_BUDGETS_MYR],
    });

    expect(phase8.primaryAction.actionJa).toBeTruthy();
    expect(phase8.budgetPlans.length).toBe(5);
    expect(phase8.notifications.length).toBeGreaterThan(0);

    const report = formatTodayTradingReport(phase8);
    expect(report.primaryActionJa).toBeTruthy();
    expect(report.buyTop10.length).toBeGreaterThan(0);
  });

  it('exports async buildBursaPhase8Analysis', () => {
    expect(typeof buildBursaPhase8Analysis).toBe('function');
  });
});
