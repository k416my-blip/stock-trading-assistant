import { describe, expect, it } from 'vitest';
import {
  buildValuationGapIntelligenceAnalysis,
  classifyValuationGap,
  computeValuationGapPct,
  computeValuationGapScore,
  scoreValuationGapMaterialItem,
} from '../../src/services/bursa/bursaValuationGapIntelligenceService';
import { enrichStockWithValuationGapIntelligence } from '../../src/services/bursa/bursaPhase22_1Analysis';
import {
  VALUATION_GAP_SCORE_MAX,
  VALUATION_GAP_SCORE_MIN,
} from '../../src/constants/bursaValuationGapIntelligence';
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

describe('bursaPhase22.1 valuation gap intelligence', () => {
  it('computeValuationGapPct uses (Analyst - FV) / FV', () => {
    const gap = computeValuationGapPct(10.2, 12.01);
    expect(gap).toBeCloseTo(17.75, 1);
  });

  it('classifyValuationGap applies tier thresholds', () => {
    expect(classifyValuationGap(71.5)).toBe('Strong Analyst Premium');
    expect(classifyValuationGap(25)).toBe('Analyst Premium');
    expect(classifyValuationGap(5)).toBe('Consensus');
    expect(classifyValuationGap(-21.2)).toBe('Model Premium');
    expect(classifyValuationGap(null)).toBe('Unavailable');
  });

  it('computeValuationGapScore stays within -10..+10', () => {
    expect(computeValuationGapScore(71.5, 'Strong Analyst Premium')).toBe(10);
    expect(computeValuationGapScore(25, 'Analyst Premium')).toBe(6);
    expect(computeValuationGapScore(5, 'Consensus')).toBe(1);
    expect(computeValuationGapScore(-21.2, 'Model Premium')).toBe(-6);
    const score = computeValuationGapScore(80, 'Strong Analyst Premium');
    expect(score).toBeGreaterThanOrEqual(VALUATION_GAP_SCORE_MIN);
    expect(score).toBeLessThanOrEqual(VALUATION_GAP_SCORE_MAX);
  });

  it('buildValuationGapIntelligenceAnalysis integrates FV and analyst target', () => {
    const analysis = buildValuationGapIntelligenceAnalysis({
      fairValueIntelligence: {
        fairValueMid: 10.2,
      } as never,
      analystTargetIntelligence: {
        targetMedian: 11.9,
        targetMean: 12.0,
      } as never,
    });
    expect(analysis.availability).toBe('available');
    expect(analysis.gapPct).toBeCloseTo(16.67, 0);
    expect(analysis.gapClassification).toBe('Consensus');
    expect(analysis.displayJa.fairValue).toBe('RM 10.20');
    expect(analysis.displayJa.analystTarget).toBe('RM 11.90');
  });

  it('enrichStockWithValuationGapIntelligence adds material and fetched field', () => {
    const stock = minimalStock();
    stock.fairValueIntelligence = {
      availability: 'available',
      fairValueMid: 7.92,
    } as never;
    stock.analystTargetIntelligence = {
      availability: 'available',
      targetMedian: 9.05,
      hasExtractableData: true,
    } as never;

    const enriched = enrichStockWithValuationGapIntelligence({ stock });
    expect(enriched.valuationGapIntelligence?.gapClassification).toBe('Consensus');
    expect(enriched.valuationGapIntelligence?.gapPct).toBeCloseTo(14.3, 0);
    expect(enriched.fetchedFields).toContain('phase22_1.valuation_gap_intelligence');
    const item = [...enriched.positiveMaterials, ...enriched.negativeMaterials].find(
      (m) => m.id === 'phase22_1-valuation-gap',
    );
    expect(item).toBeDefined();
  });

  it('scoreValuationGapMaterialItem weights gap score', () => {
    const analysis = buildValuationGapIntelligenceAnalysis({
      fairValueIntelligence: { fairValueMid: 10.59 } as never,
      analystTargetIntelligence: { targetMedian: 18.8, targetMean: 18.73 } as never,
    });
    const item = scoreValuationGapMaterialItem(analysis, {
      id: 'phase22_1-valuation-gap',
      title: 'test',
      source: 'bursa_announcement',
      sourceLabelJa: 'Phase22.1 Valuation Gap Intelligence',
      url: null,
      publishedAt: null,
    });
    expect(item.score).toBeGreaterThan(0);
  });
});
