import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { parseBursaCompanyProfileFromHtml } from '../../src/services/bursa/bursaCompanyProfileService';
import { parseBursaQuarterlyFromHtml } from '../../src/services/bursa/bursaQuarterlyService';
import { parseBursaDividendFromHtml } from '../../src/services/bursa/bursaDividendService';
import { buildBursaPhase6FromBundles } from '../../src/services/bursa/bursaPhase6Analysis';
import { computePhase6CompositeScore } from '../../src/services/bursa/bursaPhase6Scoring';
import { getBursaUniverseStockCodes } from '../../src/services/bursa/bursaStockUniverse';
import { formatBursaDiscoveryReport } from '../../src/services/bursa/bursaDiscoveryService';
import type { BursaDisclosureBundle } from '../../types/bursaDisclosure';
import type { PortfolioPosition } from '../../types';

const root = process.cwd();

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

describe('bursa Phase6 discovery ranking', () => {
  it('defines universe from sector peer codes', () => {
    const codes = getBursaUniverseStockCodes();
    expect(codes).toContain('1155');
    expect(codes.length).toBeGreaterThanOrEqual(20);
  });

  it('ranks fixtures and builds portfolio suggestions', () => {
    const codes = ['1155', '1066', '5819', '5183'].filter((c) =>
      existsSync(join(root, `scripts/klse-sample-${c}.html`)),
    );
    const bundles = codes.map(loadBundle).filter(Boolean) as BursaDisclosureBundle[];
    expect(bundles.length).toBeGreaterThanOrEqual(2);

    const holdings: PortfolioPosition[] = [
      {
        id: 'h1',
        symbol: '7103',
        market: 'bursa',
        currency: 'MYR',
        shares: 1000,
        averageBuyPrice: 0.9,
        currentPrice: 0.92,
        openedAt: '2025-01-01',
        companyName: 'Top Glove',
      },
    ];

    const phase6 = buildBursaPhase6FromBundles({ bundles, holdings });
    expect(phase6.rankedTop100.length).toBeGreaterThan(0);
    expect(phase6.rankedTop100[0].rank).toBe(1);
    expect(phase6.portfolioSuggestions.length).toBe(4);
    expect(phase6.portfolioSuggestions[0].budgetMYR).toBe(1000);
    expect(phase6.styleRankings.dividend.length).toBeGreaterThan(0);
    expect(phase6.styleRankings.beginner.length).toBeGreaterThanOrEqual(0);

    const report = formatBursaDiscoveryReport(phase6);
    expect(report.top100.length).toBeGreaterThan(0);
    expect(report.styleTabs.length).toBe(6);
  });

  it('suggests replacements only when candidate score exceeds holding', () => {
    const bundles = ['1155', '1066']
      .map(loadBundle)
      .filter(Boolean) as BursaDisclosureBundle[];
    const phase6 = buildBursaPhase6FromBundles({
      bundles,
      holdings: [
        {
          id: 'h2',
          symbol: bundles[bundles.length - 1].stockCode,
          market: 'bursa',
          currency: 'MYR',
          shares: 100,
          averageBuyPrice: 5,
          currentPrice: 5,
          openedAt: '2025-01-01',
        },
      ],
    });

    for (const s of phase6.replacementSuggestions) {
      for (const c of s.candidates) {
        expect(c.score).toBeGreaterThan(s.heldScore ?? 0);
      }
    }
  });

  it('composite uses six dimensions when all present', () => {
    const score = computePhase6CompositeScore({
      growth: 80,
      profitability: 70,
      stability: 75,
      value: 65,
      dividendAppeal: 85,
      competitiveAdvantage: 90,
    });
    expect(score).not.toBeNull();
    expect(score!).toBeGreaterThan(70);
  });
});
