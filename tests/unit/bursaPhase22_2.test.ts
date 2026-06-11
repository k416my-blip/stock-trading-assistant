import { describe, expect, it } from 'vitest';
import {
  buildConvictionIntelligenceAnalysis,
  computeConvictionScore,
  resolveConvictionConfidence,
  resolveDcfUsed,
  resolveDdmUsed,
  resolveTrustedSource,
} from '../../src/services/bursa/bursaConvictionIntelligenceService';
import { enrichStockWithConvictionIntelligence } from '../../src/services/bursa/bursaPhase22_2Analysis';
import { convictionLevelFromScore } from '../../src/constants/bursaConvictionIntelligence';
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

describe('bursaPhase22.2 conviction intelligence', () => {
  it('resolveTrustedSource picks Fair Value on Model Premium with DDM', () => {
    expect(
      resolveTrustedSource({
        gapClassification: 'Model Premium',
        dcfUsed: false,
        ddmUsed: true,
        valuationConfidence: 'Medium',
        coverageCount: 19,
        gapPct: -21.2,
      }),
    ).toBe('Fair Value');
  });

  it('resolveTrustedSource picks Analyst Target on Strong Analyst Premium', () => {
    expect(
      resolveTrustedSource({
        gapClassification: 'Strong Analyst Premium',
        dcfUsed: false,
        ddmUsed: true,
        valuationConfidence: 'Medium',
        coverageCount: 13,
        gapPct: 77.5,
      }),
    ).toBe('Analyst Target');
  });

  it('resolveTrustedSource picks Blended on Consensus', () => {
    expect(
      resolveTrustedSource({
        gapClassification: 'Consensus',
        dcfUsed: true,
        ddmUsed: false,
        valuationConfidence: 'High',
        coverageCount: 19,
        gapPct: 16.7,
      }),
    ).toBe('Blended');
  });

  it('convictionLevelFromScore maps tiers', () => {
    expect(convictionLevelFromScore(13)).toBe('Strong Buy');
    expect(convictionLevelFromScore(6)).toBe('Buy');
    expect(convictionLevelFromScore(0)).toBe('Hold');
    expect(convictionLevelFromScore(-8)).toBe('Reduce');
    expect(convictionLevelFromScore(-15)).toBe('Avoid');
  });

  it('buildConvictionIntelligenceAnalysis produces 3 reason lines', () => {
    const analysis = buildConvictionIntelligenceAnalysis({
      fairValueIntelligence: {
        fairValueMid: 10.2,
        fairValueScore: 4,
        confidence: 'Medium',
        modelsUsed: ['ddm', 'per'],
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
    });

    expect(analysis.availability).toBe('available');
    expect(analysis.trustedSource).toBe('Blended');
    expect(analysis.reasonSummaryLines).toHaveLength(3);
    expect(analysis.reasonSummaryLines[0]).toContain('Blended');
    expect(resolveDdmUsed({ modelsUsed: ['ddm'], ddm: { fairPrice: 10 } } as never)).toBe(true);
    expect(resolveDcfUsed({ modelsUsed: ['dcf'], dcf: { fairPrice: 9 } } as never)).toBe(true);
  });

  it('resolveConvictionConfidence returns High for aligned consensus', () => {
    const conf = resolveConvictionConfidence({
      hasFairValue: true,
      hasAnalystTarget: true,
      hasGap: true,
      gapClassification: 'Consensus',
      gapPct: 14,
      valuationConfidence: 'High',
      coverageCount: 19,
      dcfUsed: false,
      ddmUsed: true,
      analystTrend: 'Stable',
      trustedSource: 'Blended',
    });
    expect(conf).toBe('High');
  });

  it('computeConvictionScore weights trusted source', () => {
    const analystLed = computeConvictionScore({
      fairValueScore: 2,
      analystScore: 10,
      valuationGapScore: 10,
      trustedSource: 'Analyst Target',
      analystTrend: 'Upgrade',
      coverageCount: 18,
      dcfUsed: false,
      ddmUsed: true,
    });
    expect(analystLed).toBeGreaterThan(8);
  });

  it('enrichStockWithConvictionIntelligence wires pipeline field', () => {
    const stock = minimalStock('6033');
    stock.fairValueIntelligence = { fairValueMid: 10.59, fairValueScore: 5, confidence: 'Medium', modelsUsed: ['ddm'], dcf: { fairPrice: null }, ddm: { fairPrice: 10.59 } } as never;
    stock.analystTargetIntelligence = { targetMedian: 18.8, analystScore: 10, coverageCount: 13, targetRevisionTrend: 'Stable' } as never;
    stock.valuationGapIntelligence = { gapPct: 77.5, gapClassification: 'Strong Analyst Premium', valuationGapScore: 10, displayJa: { gapClassification: 'Strong Analyst Premium' } } as never;

    const enriched = enrichStockWithConvictionIntelligence({ stock });
    expect(enriched.convictionIntelligence?.convictionLevel).toBeDefined();
    expect(enriched.fetchedFields).toContain('phase22_2.conviction_intelligence');
  });
});
