import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { parseBursaCompanyProfileFromHtml } from '../../src/services/bursa/bursaCompanyProfileService';
import { parseBursaQuarterlyFromHtml } from '../../src/services/bursa/bursaQuarterlyService';
import { buildBursaPhase3FromSnapshots } from '../../src/services/bursa/bursaPhase3Analysis';
import { filterCompleteFyAnnual } from '../../src/services/bursa/bursaTrendAnalysis';
import type { BursaDisclosureBundle, BursaPeerSnapshot } from '../../src/types/bursaDisclosure';

function snapshotFromFixture(code: string): BursaPeerSnapshot {
  const html = readFileSync(join(process.cwd(), `scripts/klse-sample-${code}.html`), 'utf8');
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

function loadMaybankBundle(): BursaDisclosureBundle {
  const html = readFileSync(join(process.cwd(), 'scripts/klse-sample-1155.html'), 'utf8');
  return {
    stockCode: '1155',
    profile: parseBursaCompanyProfileFromHtml(html, '1155'),
    quarterly: parseBursaQuarterlyFromHtml(html, '1155'),
    dividend: { stockCode: '1155', history: [], fetchedFields: [], missingFields: [], status: 'ok', source: 'klse_screener', fetchedAt: '' },
    dataSource: 'klse_screener',
    fetchedFields: [],
    missingFields: [],
    apiNotes: [],
  };
}

describe('bursa Phase3 peer comparison', () => {
  it('ranks Maybank among banking peers from fixtures', () => {
    const bundle = loadMaybankBundle();
    const peers = ['1155', '1066', '5819'].map(snapshotFromFixture);
    const phase3 = buildBursaPhase3FromSnapshots(bundle, peers);

    expect(phase3.sectorLabelJa).toBe('銀行業');
    expect(phase3.industryCompanyCount).toBeGreaterThanOrEqual(3);
    expect(phase3.industryRanks.marketCap).toBe(1);
    expect(phase3.comparisonMetrics.length).toBe(6);
    expect(phase3.competitiveAdvantage.brandPower.score).not.toBeNull();
    expect(phase3.buffettScore.totalScore).not.toBeNull();
    expect(phase3.enhancedInvestmentType).toBeTruthy();

    console.log('Maybank Phase3 (fixture peers):', {
      type: phase3.enhancedInvestmentType,
      ranks: phase3.industryRanks,
      buffett: phase3.buffettScore.totalScore,
      competitive: {
        entry: phase3.competitiveAdvantage.entryBarrier.score,
        brand: phase3.competitiveAdvantage.brandPower.score,
        share: phase3.competitiveAdvantage.marketShare.score,
        price: phase3.competitiveAdvantage.priceCompetitiveness.score,
        overseas: phase3.competitiveAdvantage.overseasExpansion.score,
      },
    });
  });

  it('uses データ未取得 for debt in buffett score', () => {
    const bundle = loadMaybankBundle();
    const peers = ['1155'].map(snapshotFromFixture);
    const phase3 = buildBursaPhase3FromSnapshots(bundle, peers);
    const debt = phase3.buffettScore.components.find((c) => c.labelJa === '負債');
    expect(debt?.score).toBeNull();
    expect(debt?.reasonJa).toContain('データ未取得');
  });
});
