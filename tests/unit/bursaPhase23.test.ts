import { describe, expect, it } from 'vitest';
import {
  applyEarningsRevisionConvictionAdjustment,
  buildConvictionIntelligenceAnalysis,
} from '../../src/services/bursa/bursaConvictionIntelligenceService';
import {
  computeEarningsRevisionScore,
  computeRevisionDirection,
  resolveRevisionConfidence,
} from '../../src/services/bursa/bursaEarningsRevisionIntelligenceService';
import { mergeEarningsRevisionPartials } from '../../src/services/bursa/bursaEarningsRevisionIntelligenceProviders';
import { enrichStockWithEarningsRevisionIntelligence } from '../../src/services/bursa/bursaPhase23Analysis';
import { EARNINGS_REVISION_SCORE_MAX, EARNINGS_REVISION_SCORE_MIN } from '../../src/constants/bursaEarningsRevisionIntelligence';
import type { BursaStockMaterialAnalysis } from '../../src/types/bursaDisclosure';

function minimalStock(code = '1155'): BursaStockMaterialAnalysis {
  return {
    stockCode: code,
    companyName: 'Maybank',
    materialScore: 0,
    scoreBreakdown: [],
    positiveMaterials: [],
    negativeMaterials: [],
    neutralMaterials: [],
    summaryLines: ['', '', ''],
    buyReasonsToday: [],
    sellReasonsToday: [],
    sourceStatus: {
      news_api: 'skipped',
      rss: 'skipped',
      bursa_announcement: 'skipped',
      x: 'skipped',
      reddit: 'skipped',
    },
    fetchedFields: [],
    missingFields: [],
  };
}

describe('bursaPhase23 earnings revision intelligence', () => {
  it('computeEarningsRevisionScore applies upward revision rules', () => {
    const score = computeEarningsRevisionScore({
      epsRevision90d: 12,
      epsRevision30d: 6,
      revenueRevision30d: 2,
      upgradeCount: 5,
      downgradeCount: 1,
    });
    expect(score).toBeGreaterThan(10);
    expect(score).toBeLessThanOrEqual(EARNINGS_REVISION_SCORE_MAX);
  });

  it('computeEarningsRevisionScore applies downward revision rules', () => {
    const score = computeEarningsRevisionScore({
      epsRevision90d: -12,
      epsRevision30d: -6,
      revenueRevision30d: -3,
      upgradeCount: 1,
      downgradeCount: 6,
    });
    expect(score).toBeLessThan(-10);
    expect(score).toBeGreaterThanOrEqual(EARNINGS_REVISION_SCORE_MIN);
  });

  it('computeRevisionDirection maps strong tiers', () => {
    expect(computeRevisionDirection(15)).toBe('Strong Upward');
    expect(computeRevisionDirection(-15)).toBe('Strong Downward');
    expect(computeRevisionDirection(0)).toBe('Stable');
  });

  it('resolveRevisionConfidence returns High for rich Yahoo data', () => {
    expect(
      resolveRevisionConfidence({
        fieldCount: 9,
        source: 'yahoo_finance',
        hasEpsRevision90d: true,
        hasUpgradeDowngrade: true,
      }),
    ).toBe('High');
  });

  it('mergeEarningsRevisionPartials prefers Yahoo revisions over consensus estimates', () => {
    const merged = mergeEarningsRevisionPartials([
      {
        source: 'analyst_consensus',
        epsEstimateCurrentFy: 1.1,
        epsEstimateNextFy: 1.2,
        epsRevision7d: null,
        epsRevision30d: null,
        epsRevision90d: null,
        revenueEstimateCurrentFy: null,
        revenueEstimateNextFy: null,
        revenueRevision30d: null,
        netProfitEstimateCurrentFy: null,
        netProfitRevision30d: null,
        upgradeCount: null,
        downgradeCount: null,
        unavailableReason: null,
      },
      {
        source: 'yahoo_finance',
        epsEstimateCurrentFy: 1.15,
        epsEstimateNextFy: 1.25,
        epsRevision7d: 1,
        epsRevision30d: 5.5,
        epsRevision90d: 8,
        revenueEstimateCurrentFy: 1_000_000,
        revenueEstimateNextFy: 1_100_000,
        revenueRevision30d: 2,
        netProfitEstimateCurrentFy: null,
        netProfitRevision30d: null,
        upgradeCount: 3,
        downgradeCount: 1,
        unavailableReason: null,
      },
    ]);
    expect(merged?.source).toBe('yahoo_finance');
    expect(merged?.epsRevision30d).toBe(5.5);
    expect(merged?.epsEstimateCurrentFy).toBe(1.15);
  });

  it('applyEarningsRevisionConvictionAdjustment strengthens analyst premium + upward', () => {
    const adjusted = applyEarningsRevisionConvictionAdjustment({
      convictionScore: 6,
      convictionConfidence: 'Medium',
      trustedSource: 'Analyst Target',
      gapClassification: 'Analyst Premium',
      earningsRevision: {
        hasRevisionSeriesData: true,
        revisionDirection: 'Upward',
        revisionScore: 8,
      } as never,
    });
    expect(adjusted.convictionScore).toBeGreaterThan(6);
    expect(adjusted.convictionConfidence).toBe('High');
    expect(adjusted.revisionNote).toContain('強化');
  });

  it('applyEarningsRevisionConvictionAdjustment lowers analyst trust on downward', () => {
    const adjusted = applyEarningsRevisionConvictionAdjustment({
      convictionScore: 9,
      convictionConfidence: 'High',
      trustedSource: 'Analyst Target',
      gapClassification: 'Strong Analyst Premium',
      earningsRevision: {
        hasRevisionSeriesData: true,
        revisionDirection: 'Downward',
        revisionScore: -6,
      } as never,
    });
    expect(adjusted.convictionScore).toBeLessThan(9);
    expect(adjusted.convictionConfidence).toBe('Medium');
    expect(adjusted.trustedSource).toBe('Blended');
  });

  it('buildConvictionIntelligenceAnalysis integrates earnings revision', () => {
    const analysis = buildConvictionIntelligenceAnalysis({
      fairValueIntelligence: {
        fairValueMid: 10.2,
        fairValueScore: 4,
        confidence: 'Medium',
        modelsUsed: ['ddm'],
        dcf: { fairPrice: null },
        ddm: { fairPrice: 10.2 },
      } as never,
      analystTargetIntelligence: {
        targetMedian: 11.9,
        analystScore: 4,
        coverageCount: 19,
        targetRevisionTrend: 'Stable',
      } as never,
      valuationGapIntelligence: {
        gapPct: 16.7,
        gapClassification: 'Consensus',
        valuationGapScore: 2,
        displayJa: { gapClassification: 'Consensus（概ね一致）' },
      } as never,
      earningsRevisionIntelligence: {
        hasRevisionSeriesData: true,
        revisionDirection: 'Upward',
        revisionScore: 7,
        displayJa: { revisionDirection: 'Upward（上方修正）' },
      } as never,
    });
    expect(analysis.evaluationJa).toContain('Revision');
  });

  it('enrichStockWithEarningsRevisionIntelligence wires pipeline without crash when offline', async () => {
    const stock = minimalStock('1023');
    stock.analystConsensus = {
      availability: 'available',
      epsForecast: { currentFy: 0.85, nextFy: 0.92 },
      revenueForecast: { currentFy: 5_000_000_000, nextFy: 5_200_000_000 },
    } as never;

    const enriched = await enrichStockWithEarningsRevisionIntelligence({
      stock,
      fetchLiveExternal: false,
    });
    expect(enriched.earningsRevisionIntelligence).toBeDefined();
    expect(enriched.fetchedFields).toContain('phase23.earnings_revision_intelligence');
    expect(enriched.earningsRevisionIntelligence?.displayJa.epsEstimateCurrentFy).not.toBe('undefined');
  });
});
