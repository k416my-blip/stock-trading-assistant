import { describe, expect, it } from 'vitest';
import {
  buildEarningsRevisionCrossSignalAnalysis,
  computeCrossSignalResult,
  resolveInsiderComponentBias,
  resolveInstitutionalComponentBias,
  resolveRevisionComponentBias,
  earningsRevisionCrossSignalMaterialScoreAdjustment,
} from '../../src/services/bursa/bursaEarningsRevisionCrossSignalService';
import { enrichStockWithEarningsRevisionCrossSignal } from '../../src/services/bursa/bursaPhase23_1Analysis';
import type { BursaEarningsRevisionIntelligenceAnalysis } from '../../src/types/bursaEarningsRevisionIntelligence';
import type { BursaInsiderTradingAnalysis } from '../../src/types/bursaInsiderTrading';
import type { BursaInstitutionalOwnershipAnalysis } from '../../src/types/bursaInstitutionalOwnership';
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

function mockRevision(
  direction: BursaEarningsRevisionIntelligenceAnalysis['revisionDirection'],
  score = 12,
): BursaEarningsRevisionIntelligenceAnalysis {
  return {
    availability: 'available',
    availabilityLabelJa: 'ok',
    source: 'yahoo_finance',
    epsEstimateCurrentFy: 1,
    epsEstimateNextFy: 1.1,
    epsRevision7d: 1,
    epsRevision30d: 2,
    epsRevision90d: 5,
    revenueEstimateCurrentFy: 10,
    revenueEstimateNextFy: 11,
    revenueRevision30d: 1,
    netProfitEstimateCurrentFy: 2,
    netProfitRevision30d: 1,
    upgradeCount: 3,
    downgradeCount: 0,
    revisionDirection: direction,
    revisionConfidence: 'High',
    revisionScore: score,
    unavailableReason: null,
    displayJa: {
      epsEstimateCurrentFy: '1.0',
      epsEstimateNextFy: '1.1',
      epsRevision7d: '1',
      epsRevision30d: '2',
      epsRevision90d: '5',
      revenueEstimateCurrentFy: '10',
      revenueEstimateNextFy: '11',
      revenueRevision30d: '1',
      netProfitEstimateCurrentFy: '2',
      netProfitRevision30d: '1',
      upgradeCount: '3',
      downgradeCount: '0',
      revisionDirection: direction ?? 'Stable',
      revisionConfidence: 'High',
      revisionScore: String(score),
      source: 'yahoo_finance',
      unavailableReason: '—',
    },
    evaluationJa: 'revision ok',
    hasRevisionSeriesData: true,
    hasExtractableData: true,
    fieldAcquisitionCount: 10,
    fieldAcquisitionTotal: 14,
    fetchedAt: '2026-06-13T00:00:00.000Z',
  };
}

function mockInsider(activity: BursaInsiderTradingAnalysis['netInsiderActivity']): BursaInsiderTradingAnalysis {
  return {
    availability: 'available',
    availabilityLabelJa: 'ok',
    insiderBuyCount: activity === '買い優勢' ? 4 : 0,
    insiderSellCount: activity === '売り優勢' ? 3 : 0,
    netInsiderActivity: activity,
    latestTransactionDate: '2026-05-01',
    latestTransactionType: activity === '売り優勢' ? 'sell' : 'buy',
    transactionValue: '1M',
    insiderName: 'Director',
    insiderRole: 'Director',
    confidenceScore: 80,
    source: 'klse_shareholding_changes',
    unavailableReason: null,
    displayJa: {
      latestTransactionDate: '2026-05-01',
      transactionType: 'buy',
      insiderName: 'Director',
      insiderRole: 'Director',
      transactionValue: '1M',
      buyCount90d: '4',
      sellCount90d: '0',
      netActivity: activity,
      confidence: '80',
    },
    evaluationJa: 'insider ok',
    hasExtractableData: true,
    fetchedAt: '2026-06-13T00:00:00.000Z',
  };
}

function mockInstitutional(
  flow: BursaInstitutionalOwnershipAnalysis['netInstitutionalFlow'],
): BursaInstitutionalOwnershipAnalysis {
  return {
    availability: 'available',
    availabilityLabelJa: 'ok',
    holderCount: 5,
    holders: [],
    netInstitutionalFlow: flow,
    institutionalConfidenceScore: 75,
    source: 'klse_major_shareholders',
    unavailableReason: null,
    displayJa: {
      holderCount: '5',
      topHolders: 'EPF',
      recentChange: '+1%',
      netFlow: flow,
      confidence: '75',
      holders: [],
    },
    evaluationJa: 'institutional ok',
    hasExtractableData: true,
    fetchedAt: '2026-06-13T00:00:00.000Z',
  };
}

describe('bursaPhase23_1 earnings revision cross signal', () => {
  it('resolveRevisionComponentBias maps upward and downward', () => {
    expect(resolveRevisionComponentBias(mockRevision('Strong Upward'))).toBe('bullish');
    expect(resolveRevisionComponentBias(mockRevision('Strong Downward'))).toBe('bearish');
    expect(resolveRevisionComponentBias(mockRevision('Stable'))).toBe('neutral');
    expect(resolveRevisionComponentBias(null)).toBe('unavailable');
  });

  it('resolveRevisionComponentBias uses revenue revision when EPS direction is Stable', () => {
    const stableWithRevenueUp = mockRevision('Stable', 0);
    stableWithRevenueUp.revenueRevision30d = 8;
    expect(resolveRevisionComponentBias(stableWithRevenueUp)).toBe('bullish');

    const stableWithRevenueDown = mockRevision('Stable', 0);
    stableWithRevenueDown.revenueRevision30d = -8;
    expect(resolveRevisionComponentBias(stableWithRevenueDown)).toBe('bearish');
  });

  it('resolveInsiderComponentBias maps buy and sell dominance', () => {
    expect(resolveInsiderComponentBias(mockInsider('買い優勢'))).toBe('bullish');
    expect(resolveInsiderComponentBias(mockInsider('売り優勢'))).toBe('bearish');
    expect(resolveInsiderComponentBias(mockInsider('中立'))).toBe('neutral');
  });

  it('resolveInstitutionalComponentBias maps flow labels', () => {
    expect(resolveInstitutionalComponentBias(mockInstitutional('Strong Buying'))).toBe('bullish');
    expect(resolveInstitutionalComponentBias(mockInstitutional('Strong Selling'))).toBe('bearish');
    expect(resolveInstitutionalComponentBias(mockInstitutional('Neutral'))).toBe('neutral');
  });

  it('computeCrossSignalResult returns Strong Bullish when all three align upward', () => {
    const result = computeCrossSignalResult({
      revisionBias: 'bullish',
      insiderBias: 'bullish',
      institutionalBias: 'bullish',
    });
    expect(result.direction).toBe('Strong Bullish');
    expect(result.score).toBe(18);
    expect(result.alignmentCount).toBe(3);
  });

  it('computeCrossSignalResult returns Strong Bearish when all three align downward', () => {
    const result = computeCrossSignalResult({
      revisionBias: 'bearish',
      insiderBias: 'bearish',
      institutionalBias: 'bearish',
    });
    expect(result.direction).toBe('Strong Bearish');
    expect(result.score).toBe(-18);
  });

  it('computeCrossSignalResult detects revision-insider divergence', () => {
    const result = computeCrossSignalResult({
      revisionBias: 'bullish',
      insiderBias: 'bearish',
      institutionalBias: 'neutral',
    });
    expect(result.direction).toBe('Neutral');
    expect(result.score).toBeGreaterThan(0);
  });

  it('buildEarningsRevisionCrossSignalAnalysis marks unavailable with single component', () => {
    const analysis = buildEarningsRevisionCrossSignalAnalysis({
      earningsRevisionIntelligence: mockRevision('Upward'),
      insiderTrading: null,
      institutionalOwnership: null,
    });
    expect(analysis.availability).toBe('unavailable');
    expect(analysis.hasExtractableData).toBe(false);
  });

  it('buildEarningsRevisionCrossSignalAnalysis produces Bullish with revision + insider', () => {
    const analysis = buildEarningsRevisionCrossSignalAnalysis({
      earningsRevisionIntelligence: mockRevision('Upward'),
      insiderTrading: mockInsider('買い優勢'),
      institutionalOwnership: mockInstitutional('Neutral'),
    });
    expect(analysis.availability).toBe('available');
    expect(analysis.crossSignalDirection).toBe('Bullish');
    expect(analysis.alignmentCount).toBeGreaterThanOrEqual(2);
  });

  it('earningsRevisionCrossSignalMaterialScoreAdjustment caps at ±12', () => {
    const strong = buildEarningsRevisionCrossSignalAnalysis({
      earningsRevisionIntelligence: mockRevision('Strong Upward'),
      insiderTrading: mockInsider('買い優勢'),
      institutionalOwnership: mockInstitutional('Strong Buying'),
    });
    const adj = earningsRevisionCrossSignalMaterialScoreAdjustment(strong);
    expect(adj).toBeLessThanOrEqual(12);
    expect(adj).toBeGreaterThan(0);
  });

  it('enrichStockWithEarningsRevisionCrossSignal updates materialScore and fetchedFields', async () => {
    const base = {
      ...minimalStock(),
      earningsRevisionIntelligence: mockRevision('Upward'),
      insiderTrading: mockInsider('買い優勢'),
      institutionalOwnership: mockInstitutional('Buying'),
    };
    const enriched = enrichStockWithEarningsRevisionCrossSignal({ stock: base });
    expect(enriched.earningsRevisionCrossSignal?.crossSignalDirection).toBe('Strong Bullish');
    expect(enriched.fetchedFields).toContain('phase23_1.earnings_revision_cross_signal');
    expect(enriched.positiveMaterials.some((m) => m.id?.includes('phase23_1'))).toBe(true);
  });
});
