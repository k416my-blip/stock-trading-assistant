import { describe, expect, it } from 'vitest';
import { buildBursaPhase7FromBundles } from '../../src/services/bursa/bursaPhase7Analysis';
import { filterCompleteFyAnnual } from '../../src/services/bursa/bursaTrendAnalysis';
import {
  normalizeCompanyProfile,
  normalizeDisclosureBundle,
  normalizeDividendBundle,
  normalizeQuarterlyBundle,
} from '../../src/services/bursa/bursaPayloadNormalize';
import { mapBursaAnalysisError } from '../../src/services/bursa/bursaAnalysisDiagnostics';

describe('bursaPayloadNormalize (corrupted cache)', () => {
  it('normalizes profile without fetchedFields', () => {
    const p = normalizeCompanyProfile({ companyName: 'TEST' } as never, '1155');
    expect(p.fetchedFields).toEqual([]);
    expect(p.missingFields).toEqual([]);
  });

  it('normalizes quarterly without annualRecords / quarterlyHistory', () => {
    const q = normalizeQuarterlyBundle({ latestQuarter: null } as never, '1155');
    expect(q.annualRecords).toEqual([]);
    expect(q.quarterlyHistory).toEqual([]);
  });

  it('filterCompleteFyAnnual accepts undefined', () => {
    expect(filterCompleteFyAnnual(undefined)).toEqual([]);
  });

  it('normalizeDisclosureBundle prevents spread crash on bundle', () => {
    const bundle = normalizeDisclosureBundle({
      stockCode: '1155',
      profile: { companyName: 'X' } as never,
      quarterly: {} as never,
      dividend: {} as never,
      dataSource: 'none',
      fetchedFields: undefined as never,
      missingFields: undefined as never,
      apiNotes: undefined as never,
    });
    expect(bundle.fetchedFields).toEqual([]);
    expect(bundle.quarterly.annualRecords).toEqual([]);
  });
});

describe('bursa phase7 with normalized partial bundle', () => {
  it('buildBursaPhase7FromBundles does not throw', () => {
    const bundle = normalizeDisclosureBundle({
      stockCode: '1155',
      profile: normalizeCompanyProfile({ companyName: 'MAYBANK', sector: 'Banking' } as never, '1155'),
      quarterly: normalizeQuarterlyBundle({} as never, '1155'),
      dividend: normalizeDividendBundle({} as never, '1155'),
      dataSource: 'klse_screener',
      fetchedFields: [],
      missingFields: [],
      apiNotes: [],
    });
    const phase7 = buildBursaPhase7FromBundles({
      bundles: [bundle],
      holdings: [
        {
          id: 'h1',
          symbol: '1155',
          market: 'bursa',
          shares: 100,
          averageBuyPrice: 9,
          currentPrice: 9.5,
          companyName: 'Maybank',
          currency: 'MYR',
          openedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    expect(phase7.fetchedFields).toContain('phase7.offline');
    expect(phase7.holdingsDiagnosis.length).toBeGreaterThanOrEqual(0);
  });
});

describe('bursaAnalysisDiagnostics', () => {
  it('maps Hermes undefined-object to Japanese fallback', () => {
    const msg = mapBursaAnalysisError(
      'MaterialAnalysis',
      new Error('Cannot convert undefined value to object'),
      '材料データ未取得',
    );
    expect(msg).toContain('材料分析');
    expect(msg).not.toContain('Cannot convert undefined');
  });
});
