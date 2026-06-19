import { describe, expect, it } from 'vitest';
import { formatMaterialAnalysisReport } from '../../src/services/bursa/bursaMaterialAnalysisService';
import { buildConciergeEnhancedAnalysis } from '../../src/services/buildConciergeEnhancedAnalysis';
import type { BursaPhase11Analysis, BursaStockMaterialAnalysis } from '../../src/types/bursaDisclosure';

function minimalStock(overrides: Partial<BursaStockMaterialAnalysis> = {}): BursaStockMaterialAnalysis {
  return {
    stockCode: '1155',
    companyName: 'Maybank',
    materialScore: 10,
    scoreBreakdown: [],
    positiveMaterials: [],
    negativeMaterials: [],
    neutralMaterials: [],
    summaryLines: ['a', 'b', 'c'],
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
    analystConsensusIntelligence: {
      availability: 'available',
      availabilityLabelJa: 'ok',
      analystCount: 12,
      buyCount: 8,
      holdCount: 3,
      sellCount: 1,
      consensusRating: 'Buy',
      targetPrice: 11.5,
      currentPrice: 10.2,
      impliedUpsidePct: 12.7,
      targetRevisionDirection: 'Upgraded',
      targetRevisionPct: 3.2,
      ratingRevisionDirection: 'Stable',
      consensusDispersion: 0.12,
      confidence: 'High',
      consensusScore: 14,
      warnings: [],
      source: 'yahoo_finance',
      updatedAt: '2026-06-19',
      displayJa: {
        analystCount: '12',
        buyCount: '8',
        holdCount: '3',
        sellCount: '1',
        consensusRating: 'Buy',
        targetPrice: '11.50',
        currentPrice: '10.20',
        impliedUpsidePct: '+12.7%',
        targetRevisionDirection: 'Upgraded',
        targetRevisionPct: '+3.2%',
        ratingRevisionDirection: 'Stable',
        consensusDispersion: '0.12',
        confidence: 'High',
        consensusScore: '+14',
        warnings: '—',
        source: 'yahoo_finance',
        updatedAt: '2026-06-19',
      },
      evaluationJa: 'Phase24 consensus ok',
      hasExtractableData: true,
      fieldAcquisitionCount: 10,
      fieldAcquisitionTotal: 12,
      fetchedAt: '2026-06-19T00:00:00.000Z',
    },
    earningsRevisionCrossSignal: {
      availability: 'available',
      availabilityLabelJa: 'ok',
      crossSignalDirection: 'Bullish',
      crossSignalScore: 10,
      revisionBias: 'bullish',
      insiderBias: 'bullish',
      institutionalBias: 'neutral',
      alignmentCount: 2,
      availableComponentCount: 3,
      crossSignalConfidence: 'Medium',
      unavailableReason: null,
      displayJa: {
        crossSignalDirection: 'Bullish（強気クロスシグナル）',
        crossSignalScore: '+10',
        revisionBias: '強気',
        insiderBias: '強気',
        institutionalBias: '中立',
        alignmentCount: '2',
        confidence: 'Medium',
        unavailableReason: '—',
      },
      evaluationJa: 'Phase23.1 cross signal ok',
      hasExtractableData: true,
      fetchedAt: '2026-06-19T00:00:00.000Z',
    },
    ...overrides,
  };
}

describe('material analysis UI mapping for Phase24 and Phase23.1', () => {
  it('maps Phase24 and Phase23.1 fields on MaterialStockRow', () => {
    const phase11: BursaPhase11Analysis = {
      stocks: [minimalStock()],
      topMaterial: minimalStock(),
      monitoringNotifications: [],
      fetchedFields: [],
      missingFields: [],
    };
    const report = formatMaterialAnalysisReport(phase11);
    const row = report.stocks[0]!;
    expect(row.analystConsensusIntelligenceDisplayJa?.source).toBe('yahoo_finance');
    expect(row.analystConsensusIntelligenceDisplayJa?.consensusRating).toBe('Buy');
    expect(row.analystConsensusIntelligenceDisplayJa?.consensusScore).toBe('+14');
    expect(row.earningsRevisionCrossSignalDisplayJa?.crossSignalDirection).toContain('Bullish');
    expect(row.earningsRevisionCrossSignalMaterialImpactJa).toBe('+6');
  });
});
