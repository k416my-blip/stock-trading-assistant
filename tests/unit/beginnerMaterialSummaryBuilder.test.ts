import { describe, expect, it } from 'vitest';
import { buildBeginnerStockSummary } from '../../src/services/beginner/beginnerMaterialSummaryBuilder';
import type { MaterialStockRow } from '../../src/services/bursa/bursaMaterialAnalysisService';

function minimalMaterialRow(overrides: Partial<MaterialStockRow> = {}): MaterialStockRow {
  return {
    stockCode: '1155',
    companyNameJa: 'Maybank',
    scoreJa: '+12',
    scoreSign: 'positive',
    summaryLines: ['', '', ''],
    breakdown: [],
    sourceScoreBreakdown: [],
    dataQuality: { stars: '★★★', labelJa: '良好' },
    positive: [],
    negative: [],
    neutral: [],
    buyReasons: [],
    sellReasons: [],
    apiConnections: [],
    itemCountBySource: {},
    redditFetchDiagnostics: null,
    sources: [],
    earningsCallEvaluationJa: 'データ未取得',
    earningsCallDisplayJa: null,
    analystConsensusEvaluationJa: 'データ未取得',
    analystConsensusDisplayJa: null,
    insiderTradingEvaluationJa: 'データ未取得',
    insiderTradingDisplayJa: null,
    institutionalOwnershipEvaluationJa: 'データ未取得',
    institutionalOwnershipDisplayJa: null,
    institutionalTrendEvaluationJa: 'データ未取得',
    institutionalTrendDisplayJa: null,
    historicalOwnershipEvaluationJa: 'データ未取得',
    historicalOwnershipDisplayJa: null,
    fixedInstitutionalBasketEvaluationJa: 'データ未取得',
    fixedInstitutionalBasketDisplayJa: null,
    dividendIntelligenceEvaluationJa: 'データ未取得',
    dividendIntelligenceDisplayJa: null,
    newsIntelligenceEvaluationJa: 'データ未取得',
    newsIntelligenceDisplayJa: null,
    macroIntelligenceEvaluationJa: 'データ未取得',
    macroIntelligenceDisplayJa: null,
    sectorRotationEvaluationJa: 'データ未取得',
    sectorRotationDisplayJa: null,
    valuationIntelligenceEvaluationJa: 'データ未取得',
    valuationIntelligenceDisplayJa: null,
    fairValueIntelligenceEvaluationJa: 'データ未取得',
    fairValueIntelligenceDisplayJa: null,
    analystTargetIntelligenceEvaluationJa: 'データ未取得',
    analystTargetIntelligenceDisplayJa: null,
    valuationGapIntelligenceEvaluationJa: 'データ未取得',
    valuationGapIntelligenceDisplayJa: null,
    convictionIntelligenceEvaluationJa: 'データ未取得',
    convictionIntelligenceDisplayJa: null,
    earningsRevisionIntelligenceEvaluationJa: 'データ未取得',
    earningsRevisionIntelligenceDisplayJa: null,
    analystConsensusIntelligenceEvaluationJa: 'データ未取得',
    analystConsensusIntelligenceDisplayJa: null,
    earningsRevisionCrossSignalEvaluationJa: 'データ未取得',
    earningsRevisionCrossSignalDisplayJa: null,
    earningsRevisionCrossSignalMaterialImpactJa: '—',
    ...overrides,
  };
}

describe('buildBeginnerStockSummary', () => {
  it('always produces 3 reason lines even with empty phase data', () => {
    const summary = buildBeginnerStockSummary({
      materialRow: minimalMaterialRow(),
      isHeld: true,
    });
    expect(summary.reasonsJa).toHaveLength(3);
    for (const line of summary.reasonsJa) {
      expect(line.length).toBeGreaterThan(0);
    }
  });

  it('always produces at least one watchpoint', () => {
    const summary = buildBeginnerStockSummary({
      materialRow: minimalMaterialRow(),
      isHeld: true,
    });
    expect(summary.watchpointsJa.length).toBeGreaterThan(0);
    expect(summary.watchpointsJa.length).toBeLessThanOrEqual(3);
  });

  it('extracts positive reasons from dividend evaluation', () => {
    const summary = buildBeginnerStockSummary({
      materialRow: minimalMaterialRow({
        dividendIntelligenceEvaluationJa: '配当は安定しており利回りも良好',
      }),
      isHeld: true,
    });
    expect(summary.reasonsJa.some((l) => l.includes('お金の還元'))).toBe(true);
  });

  it('extracts watchpoints from negative materials', () => {
    const summary = buildBeginnerStockSummary({
      materialRow: minimalMaterialRow({
        negative: [{ title: '業績悪化の懸念', scoreJa: '-8', sourceJa: 'News' }],
        sellReasons: ['決算発表前の値動きに注意'],
      }),
      isHeld: true,
    });
    expect(summary.watchpointsJa.length).toBeGreaterThan(0);
  });

  it('includes next action line', () => {
    const summary = buildBeginnerStockSummary({
      materialRow: minimalMaterialRow(),
      isHeld: true,
      fusedAction: 'hold',
      finalScore: 60,
    });
    expect(summary.nextActionJa.length).toBeGreaterThan(0);
    expect(summary.judgmentLabelJa).toBe('保有');
  });
});
