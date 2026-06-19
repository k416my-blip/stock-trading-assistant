import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  mergeRevenueRevisionPartials,
  revisionPct,
  applyRevenueRevisionPartialToEarningsPartial,
} from '../../src/services/bursa/bursaRevenueRevisionProviders';
import {
  computeRevisionPctFromSnapshots,
  configureRevenueRevisionSnapshotPathForTest,
  recordRevenueEstimateSnapshot,
  resetRevenueRevisionSnapshotStoreForTest,
} from '../../src/services/bursa/bursaRevenueRevisionSnapshotStore';

describe('bursaRevenueRevisionProviders', () => {
  beforeEach(() => {
    configureRevenueRevisionSnapshotPathForTest(
      join(tmpdir(), `phase23-revenue-snapshot-test-${Date.now()}.json`),
    );
    resetRevenueRevisionSnapshotStoreForTest();
  });

  afterEach(() => {
    resetRevenueRevisionSnapshotStoreForTest();
  });

  it('revisionPct computes percent change', () => {
    expect(revisionPct(110, 100)).toBeCloseTo(10, 5);
    expect(revisionPct(90, 100)).toBeCloseTo(-10, 5);
    expect(revisionPct(100, 0)).toBeNull();
  });

  it('mergeRevenueRevisionPartials prefers Yahoo revenueTrend over snapshot', () => {
    const merged = mergeRevenueRevisionPartials([
      {
        source: 'estimate_snapshot',
        revenueRevision7d: null,
        revenueRevision30d: 2.5,
        revenueRevision90d: null,
        revenueEstimateCurrentFy: 1_000,
        fiscalPeriodEnd: '2026-12-31',
        unavailableReason: null,
      },
      {
        source: 'yahoo_finance',
        revenueRevision7d: 1.2,
        revenueRevision30d: 4.8,
        revenueRevision90d: 6.1,
        revenueEstimateCurrentFy: 1_050,
        fiscalPeriodEnd: '2026-12-31',
        unavailableReason: null,
      },
    ]);
    expect(merged?.source).toBe('yahoo_finance');
    expect(merged?.revenueRevision30d).toBe(4.8);
  });

  it('applyRevenueRevisionPartialToEarningsPartial fills missing revenue revision', () => {
    const base = {
      source: 'yahoo_finance' as const,
      revenueRevision30d: null,
      revenueEstimateCurrentFy: 500,
      unavailableReason: 'missing trend',
    };
    const applied = applyRevenueRevisionPartialToEarningsPartial(base, {
      source: 'estimate_snapshot',
      revenueRevision7d: null,
      revenueRevision30d: -3.2,
      revenueRevision90d: null,
      revenueEstimateCurrentFy: 500,
      fiscalPeriodEnd: '2026-12-31',
      unavailableReason: null,
    });
    expect(applied.revenueRevision30d).toBe(-3.2);
    expect(applied.source).toBe('estimate_snapshot');
  });

  it('computeRevisionPctFromSnapshots derives 30d revision from stored snapshots', () => {
    const now = Date.now();
    const days31Ago = new Date(now - 31 * 24 * 60 * 60 * 1000).toISOString();
    recordRevenueEstimateSnapshot({
      stockCode: '1155',
      fiscalPeriodEnd: '2026-12-31',
      revenueEstimate: 30_000_000_000,
      source: 'yahoo_finance',
      observedAt: days31Ago,
    });
    const result = computeRevisionPctFromSnapshots({
      stockCode: '1155',
      fiscalPeriodEnd: '2026-12-31',
      currentRevenue: 31_500_000_000,
    });
    expect(result.revision30d).toBeCloseTo(5, 1);
    expect(result.priorSnapshot?.revenueEstimate).toBe(30_000_000_000);
  });
});
