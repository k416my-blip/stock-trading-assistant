import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  buildInstitutionalHolderRecords,
  isInstitutionalName,
  normalizeInstitutionLabel,
  parseInstitutionalOwnershipFromHtml,
} from '../../src/services/bursa/bursaInstitutionalOwnershipParser';
import {
  buildInstitutionalOwnershipAnalysis,
  institutionalMaterialScoreAdjustment,
} from '../../src/services/bursa/bursaInstitutionalOwnershipService';
import { INSTITUTIONAL_OWNERSHIP_UNAVAILABLE_JA } from '../../src/types/bursaInstitutionalOwnership';

const stockFixture = readFileSync(join(process.cwd(), 'scripts/klse-sample-1155.html'), 'utf8');
const shareholdingsFixture = readFileSync(
  join(process.cwd(), 'scripts/klse-shareholdings-1155.html'),
  'utf8',
);

describe('bursaInstitutionalOwnershipParser Phase16', () => {
  it('detects known institutional names', () => {
    expect(isInstitutionalName('KUMPULAN WANG PERSARAAN (DIPERBADANKAN) ("KWAP")')).toBe(true);
    expect(isInstitutionalName('EMPLOYEES PROVIDENT FUND BOARD')).toBe(true);
    expect(isInstitutionalName('Random Retail Investor')).toBe(false);
    expect(normalizeInstitutionLabel('EMPLOYEES PROVIDENT FUND BOARD')).toBe('EPF');
    expect(normalizeInstitutionLabel('KUMPULAN WANG PERSARAAN (DIPERBADANKAN)')).toBe('KWAP');
  });

  it('parses institutional snapshots from fixtures', () => {
    const snapshots = parseInstitutionalOwnershipFromHtml({
      stockCode: '1155',
      stockHtml: stockFixture,
      shareholdingsHtml: shareholdingsFixture,
    });
    expect(snapshots.length).toBeGreaterThan(5);
    expect(snapshots.some((s) => s.name === 'KWAP')).toBe(true);
  });

  it('builds holder records sorted by holding pct', () => {
    const snapshots = parseInstitutionalOwnershipFromHtml({
      stockCode: '1155',
      stockHtml: stockFixture,
      shareholdingsHtml: shareholdingsFixture,
    });
    const holders = buildInstitutionalHolderRecords(snapshots);
    expect(holders.length).toBeGreaterThan(2);
    expect(holders[0]?.holdingPct).toBeGreaterThan(0);
    if (holders.length >= 2) {
      expect((holders[0]?.holdingPct ?? 0) >= (holders[1]?.holdingPct ?? 0)).toBe(true);
    }
  });
});

describe('bursaInstitutionalOwnershipService Phase16', () => {
  it('builds analysis from fixture without live fetch for unavailable path', async () => {
    const result = await buildInstitutionalOwnershipAnalysis({
      stockCode: '1155',
      stockHtml: stockFixture,
      fetchLiveExternal: false,
    });
    expect(result.availability).toBe('unavailable');
    expect(result.evaluationJa).toBe(INSTITUTIONAL_OWNERSHIP_UNAVAILABLE_JA);
  });

  it('builds analysis from fixtures with embedded html', async () => {
    const result = await buildInstitutionalOwnershipAnalysis({
      stockCode: '1155',
      stockHtml: stockFixture,
      shareholdingsHtml: shareholdingsFixture,
      fetchLiveExternal: true,
    });
    expect(result.hasExtractableData).toBe(true);
    expect(result.holderCount).toBeGreaterThan(0);
    expect(result.evaluationJa).toContain('Institutional Ownership');
    expect(result.displayJa.netFlow).toBeTruthy();
    expect(result.displayJa.holders.length).toBeGreaterThan(0);
  });

  it('applies material score per net flow without auto-sell', () => {
    expect(
      institutionalMaterialScoreAdjustment({
        availability: 'available',
        availabilityLabelJa: '取得済',
        holderCount: 3,
        holders: [],
        netInstitutionalFlow: 'Strong Buying',
        institutionalConfidenceScore: 80,
        source: 'klse_major_shareholders',
        unavailableReason: null,
        displayJa: {
          holderCount: '3',
          topHolders: 'KWAP',
          recentChange: '—',
          netFlow: 'Strong Buying',
          confidence: '80',
          holders: [],
        },
        evaluationJa: 'test',
        hasExtractableData: true,
        fetchedAt: null,
      }),
    ).toBe(15);

    expect(
      institutionalMaterialScoreAdjustment({
        availability: 'available',
        availabilityLabelJa: '取得済',
        holderCount: 3,
        holders: [],
        netInstitutionalFlow: 'Strong Selling',
        institutionalConfidenceScore: 80,
        source: 'klse_major_shareholders',
        unavailableReason: null,
        displayJa: {
          holderCount: '3',
          topHolders: 'KWAP',
          recentChange: '—',
          netFlow: 'Strong Selling',
          confidence: '80',
          holders: [],
        },
        evaluationJa: 'test',
        hasExtractableData: true,
        fetchedAt: null,
      }),
    ).toBe(-15);
  });
});
