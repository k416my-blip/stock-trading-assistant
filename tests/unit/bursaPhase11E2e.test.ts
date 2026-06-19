import { describe, expect, it } from 'vitest';
import {
  aggregateE2ePass,
  E2E_AUDIT_STOCK_CODES,
  PHASE13_24_PIPELINE,
  summarizeStockE2e,
  validateApiFallback,
  validateMaterialScore,
  validatePhase13_24Chain,
  validateUiMapping,
} from '../../src/services/bursa/bursaPhase11E2eValidation';
import type { MaterialStockRow } from '../../src/services/bursa/bursaMaterialAnalysisService';
import { buildConciergeEnhancedAnalysis } from '../../src/services/buildConciergeEnhancedAnalysis';
import type { BursaStockMaterialAnalysis } from '../../src/types/bursaDisclosure';
import type { ConciergeEvidenceBundle } from '../../src/types/conciergeEvidence';

function mockStock(overrides: Partial<BursaStockMaterialAnalysis> = {}): BursaStockMaterialAnalysis {
  return {
    stockCode: '1155',
    companyName: 'Maybank',
    materialScore: 42,
    scoreBreakdown: [{ labelJa: 'Phase23', score: 5 }],
    positiveMaterials: [],
    negativeMaterials: [],
    neutralMaterials: [],
    summaryLines: ['a', 'b', 'c'],
    buyReasonsToday: [],
    sellReasonsToday: [],
    sourceStatus: {
      news_api: 'skipped',
      rss: 'ok',
      bursa_announcement: 'ok',
      x: 'skipped',
      reddit: 'partial',
    },
    fetchedFields: PHASE13_24_PIPELINE.map((p) => p.fieldKey),
    missingFields: [],
    earningsCall: { availability: 'available' } as BursaStockMaterialAnalysis['earningsCall'],
    analystConsensus: { availability: 'available' } as BursaStockMaterialAnalysis['analystConsensus'],
    analystConsensusIntelligence: {
      availability: 'available',
      hasExtractableData: true,
    } as BursaStockMaterialAnalysis['analystConsensusIntelligence'],
    insiderTrading: { availability: 'available' } as BursaStockMaterialAnalysis['insiderTrading'],
    institutionalOwnership: {
      availability: 'available',
    } as BursaStockMaterialAnalysis['institutionalOwnership'],
    historicalOwnership: {
      availability: 'available',
    } as BursaStockMaterialAnalysis['historicalOwnership'],
    fixedInstitutionalBasket: {
      availability: 'available',
    } as BursaStockMaterialAnalysis['fixedInstitutionalBasket'],
    institutionalTrend: { availability: 'available' } as BursaStockMaterialAnalysis['institutionalTrend'],
    dividendIntelligence: {
      availability: 'available',
    } as BursaStockMaterialAnalysis['dividendIntelligence'],
    newsIntelligence: { availability: 'available' } as BursaStockMaterialAnalysis['newsIntelligence'],
    macroIntelligence: { availability: 'available' } as BursaStockMaterialAnalysis['macroIntelligence'],
    sectorRotation: { availability: 'available' } as BursaStockMaterialAnalysis['sectorRotation'],
    valuationIntelligence: {
      availability: 'available',
    } as BursaStockMaterialAnalysis['valuationIntelligence'],
    fairValueIntelligence: {
      availability: 'available',
    } as BursaStockMaterialAnalysis['fairValueIntelligence'],
    analystTargetIntelligence: {
      availability: 'available',
    } as BursaStockMaterialAnalysis['analystTargetIntelligence'],
    valuationGapIntelligence: {
      availability: 'available',
    } as BursaStockMaterialAnalysis['valuationGapIntelligence'],
    earningsRevisionIntelligence: {
      availability: 'available',
    } as BursaStockMaterialAnalysis['earningsRevisionIntelligence'],
    earningsRevisionCrossSignal: {
      availability: 'available',
    } as BursaStockMaterialAnalysis['earningsRevisionCrossSignal'],
    convictionIntelligence: {
      availability: 'available',
    } as BursaStockMaterialAnalysis['convictionIntelligence'],
    ...overrides,
  };
}

function mockMaterialRow(): MaterialStockRow {
  return {
    stockCode: '1155',
    companyNameJa: 'Maybank',
    scoreJa: '+42',
    scoreSign: 'positive',
    summaryLines: ['line1', 'line2', 'line3'],
    breakdown: [],
    sourceScoreBreakdown: [],
    dataQuality: { score: 80, labelJa: 'Good', missingSourcesJa: [] },
    positive: [],
    negative: [],
    neutral: [],
    buyReasons: [],
    sellReasons: [],
    apiConnections: [],
    itemCountBySource: {},
    redditFetchDiagnostics: null,
    sources: [],
    earningsCallEvaluationJa: 'Phase13 ok',
    earningsCallDisplayJa: null,
    analystConsensusEvaluationJa: 'Phase14 ok',
    analystConsensusDisplayJa: null,
    insiderTradingEvaluationJa: 'Phase15 ok',
    insiderTradingDisplayJa: null,
    institutionalOwnershipEvaluationJa: 'Phase16 ok',
    institutionalOwnershipDisplayJa: null,
    institutionalTrendEvaluationJa: 'Phase16.5 ok',
    institutionalTrendDisplayJa: null,
    historicalOwnershipEvaluationJa: 'Phase16.6 ok',
    historicalOwnershipDisplayJa: null,
    fixedInstitutionalBasketEvaluationJa: 'Phase16.7 ok',
    fixedInstitutionalBasketDisplayJa: null,
    dividendIntelligenceEvaluationJa: 'Phase17 ok',
    dividendIntelligenceDisplayJa: null,
    newsIntelligenceEvaluationJa: 'Phase18 ok',
    newsIntelligenceDisplayJa: null,
    macroIntelligenceEvaluationJa: 'Phase19 ok',
    macroIntelligenceDisplayJa: null,
    sectorRotationEvaluationJa: 'Phase19.5 ok',
    sectorRotationDisplayJa: null,
    valuationIntelligenceEvaluationJa: 'Phase20 ok',
    valuationIntelligenceDisplayJa: null,
    fairValueIntelligenceEvaluationJa: 'Phase21 ok',
    fairValueIntelligenceDisplayJa: null,
    analystTargetIntelligenceEvaluationJa: 'Phase22 ok',
    analystTargetIntelligenceDisplayJa: null,
    valuationGapIntelligenceEvaluationJa: 'Phase22.1 ok',
    valuationGapIntelligenceDisplayJa: null,
    convictionIntelligenceEvaluationJa: 'Phase22.2 ok',
    convictionIntelligenceDisplayJa: null,
    earningsRevisionIntelligenceEvaluationJa: 'Phase23 ok',
    earningsRevisionIntelligenceDisplayJa: null,
    analystConsensusIntelligenceEvaluationJa: 'Phase24 ok',
    analystConsensusIntelligenceDisplayJa: null,
    earningsRevisionCrossSignalEvaluationJa: 'Phase23.1 ok',
    earningsRevisionCrossSignalDisplayJa: null,
    earningsRevisionCrossSignalMaterialImpactJa: '+5',
  };
}

function minimalEvidence(): ConciergeEvidenceBundle {
  return {
    generatedAt: new Date().toISOString(),
    analysisMode: 'balanced',
    symbols: [
      {
        symbol: '1155.KL',
        companyName: 'Maybank',
        market: 'bursa',
        displayLabelJa: 'Maybank (1155.KL)',
        currentPrice: 10,
        previousClose: 9.8,
        intradayChangePct: 2,
        volume: 1e6,
        volumeSurgeRatio: 1,
        quoteAgeSeconds: 60,
        quoteIsStale: false,
        portfolioHolding: { shares: 100, averageBuyPrice: 9.5, unrealizedPnlPct: 5 },
        latestFinancialNews: [],
        newsSummaryJa: '',
        newsSource: 'test',
        xSentiment: null,
        trendingKeywords: [],
        unusualActivityFlags: [],
        dataGapsJa: [],
      },
    ],
    globalSummaryJa: '',
    cacheNotesJa: [],
    actionGuide: {
      generatedAt: new Date().toISOString(),
      symbols: [
        {
          symbol: '1155.KL',
          market: 'bursa',
          displayLabelJa: 'Maybank (1155.KL)',
          primaryCategory: 'watch',
          categories: ['watch'],
          marketStance: 'neutral',
          marketStanceLabelJa: '中立',
          reasonBulletsJa: ['test'],
          recommendedActionsJa: [],
          attentionPointsJa: [],
          riskSummaryJa: '',
          confidencePct: 60,
          insufficientData: false,
          insufficientDataLabelJa: null,
          evidenceScores: {
            priceAction: 50,
            volume: 50,
            news: 50,
            xSentiment: 50,
            volatility: 50,
          },
          notificationPriority: 'low',
          notificationWhyJa: '',
        },
      ],
      overallConfidencePct: 60,
      overallStance: 'neutral',
      overallStanceLabelJa: '中立',
      primaryCategory: 'watch',
      aggregatedRecommendationsJa: [],
      aggregatedRisksJa: [],
      aggregatedAttentionJa: [],
    },
    riskControl: {
      generatedAt: new Date().toISOString(),
      overallConfidencePct: 60,
      overallDataQualityScore: 60,
      confidenceGateOpen: true,
      allowSpeculativeAi: true,
      allowActionRecommendations: true,
      analysisBlockedJa: null,
      globalStaleWarningJa: null,
      perSymbolWarningsJa: {},
    },
  };
}

describe('bursaPhase11E2e validation', () => {
  it('defines 6 audit stock codes', () => {
    expect(E2E_AUDIT_STOCK_CODES).toHaveLength(6);
    expect(E2E_AUDIT_STOCK_CODES).toContain('1155');
  });

  it('validates material score bounds', () => {
    expect(validateMaterialScore(mockStock()).pass).toBe(true);
    expect(validateMaterialScore(mockStock({ materialScore: 150 })).pass).toBe(false);
  });

  it('validates phase13-24 chain from fetchedFields', () => {
    const chain = validatePhase13_24Chain(mockStock());
    expect(chain.length).toBe(PHASE13_24_PIPELINE.length);
    expect(chain.every((p) => p.executed)).toBe(true);
  });

  it('validates UI mapping for phase evaluation fields', () => {
    const ui = validateUiMapping(mockMaterialRow());
    expect(ui.pass).toBe(true);
    expect(ui.mappedPhases).toBeGreaterThanOrEqual(10);
  });

  it('validates API fallback statuses', () => {
    const api = validateApiFallback(mockStock());
    expect(api.pass).toBe(true);
    expect(api.hasGracefulSkip).toBe(true);
  });

  it('summarizes stock E2E as PASS when all checks ok', () => {
    const row = mockMaterialRow();
    const concierge = buildConciergeEnhancedAnalysis({
      evidence: minimalEvidence(),
      materialRow: row,
    });
    const result = summarizeStockE2e({
      code: '1155',
      label: 'Maybank',
      stock: mockStock(),
      materialRow: row,
      concierge,
      fetchLiveExternal: true,
    });
    expect(result.status).toBe('PASS');
    expect(result.phasesExecuted).toBe(PHASE13_24_PIPELINE.length);
  });

  it('aggregateE2ePass requires 4+ PASS and zero crashes', () => {
    const ok = summarizeStockE2e({
      code: '1155',
      label: 'Maybank',
      stock: mockStock(),
      materialRow: mockMaterialRow(),
      concierge: buildConciergeEnhancedAnalysis({
        evidence: minimalEvidence(),
        materialRow: mockMaterialRow(),
      }),
      fetchLiveExternal: true,
    });
    const agg = aggregateE2ePass([ok, ok, ok, ok, ok, ok]);
    expect(agg.pass).toBe(true);
    expect(agg.passCount).toBe(6);
  });
});
