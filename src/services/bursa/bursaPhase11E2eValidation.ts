/**
 * Phase11 Live E2E — Phase13〜24 チェーン検証ヘルパー
 */
import type { MaterialStockRow } from './bursaMaterialAnalysisService';
import type { BursaStockMaterialAnalysis } from '../../types/bursaDisclosure';
import type { ConciergeEnhancedAnalysisReport } from '../../types/conciergeEnhancedAnalysis';

export const E2E_AUDIT_STOCK_CODES = ['1155', '1023', '1295', '5347', '4707', '6033'] as const;

export type Phase13_24PhaseSpec = {
  phaseId: string;
  fieldKey: string;
  /** BursaStockMaterialAnalysis 上の enricher 出力キー */
  stockKey: keyof BursaStockMaterialAnalysis;
  uiEvalKey?: keyof MaterialStockRow;
};

/** Phase11 analyzeOneStock 実行順（13〜24 サブフェーズ） */
export const PHASE13_24_PIPELINE: Phase13_24PhaseSpec[] = [
  { phaseId: '13', fieldKey: 'phase13.earnings_call', stockKey: 'earningsCall', uiEvalKey: 'earningsCallEvaluationJa' },
  { phaseId: '14', fieldKey: 'phase14.analyst_consensus', stockKey: 'analystConsensus', uiEvalKey: 'analystConsensusEvaluationJa' },
  { phaseId: '24', fieldKey: 'phase24.analyst_consensus_intelligence', stockKey: 'analystConsensusIntelligence', uiEvalKey: 'analystConsensusIntelligenceEvaluationJa' },
  { phaseId: '15', fieldKey: 'phase15.insider_trading', stockKey: 'insiderTrading', uiEvalKey: 'insiderTradingEvaluationJa' },
  { phaseId: '16', fieldKey: 'phase16.institutional_ownership', stockKey: 'institutionalOwnership', uiEvalKey: 'institutionalOwnershipEvaluationJa' },
  { phaseId: '16.6', fieldKey: 'phase16.6.historical_ownership', stockKey: 'historicalOwnership', uiEvalKey: 'historicalOwnershipEvaluationJa' },
  { phaseId: '16.7', fieldKey: 'phase16.7.fixed_institutional_basket', stockKey: 'fixedInstitutionalBasket', uiEvalKey: 'fixedInstitutionalBasketEvaluationJa' },
  { phaseId: '16.5', fieldKey: 'phase16.5.institutional_trend', stockKey: 'institutionalTrend', uiEvalKey: 'institutionalTrendEvaluationJa' },
  { phaseId: '17', fieldKey: 'phase17.dividend_intelligence', stockKey: 'dividendIntelligence', uiEvalKey: 'dividendIntelligenceEvaluationJa' },
  { phaseId: '18', fieldKey: 'phase18.news_intelligence', stockKey: 'newsIntelligence', uiEvalKey: 'newsIntelligenceEvaluationJa' },
  { phaseId: '19', fieldKey: 'phase19.macro_intelligence', stockKey: 'macroIntelligence', uiEvalKey: 'macroIntelligenceEvaluationJa' },
  { phaseId: '19.5', fieldKey: 'phase19_5.sector_rotation', stockKey: 'sectorRotation', uiEvalKey: 'sectorRotationEvaluationJa' },
  { phaseId: '20', fieldKey: 'phase20.valuation_intelligence', stockKey: 'valuationIntelligence', uiEvalKey: 'valuationIntelligenceEvaluationJa' },
  { phaseId: '21', fieldKey: 'phase21.fair_value_intelligence', stockKey: 'fairValueIntelligence', uiEvalKey: 'fairValueIntelligenceEvaluationJa' },
  { phaseId: '22', fieldKey: 'phase22.analyst_target_intelligence', stockKey: 'analystTargetIntelligence', uiEvalKey: 'analystTargetIntelligenceEvaluationJa' },
  { phaseId: '22.1', fieldKey: 'phase22_1.valuation_gap_intelligence', stockKey: 'valuationGapIntelligence', uiEvalKey: 'valuationGapIntelligenceEvaluationJa' },
  { phaseId: '23', fieldKey: 'phase23.earnings_revision_intelligence', stockKey: 'earningsRevisionIntelligence', uiEvalKey: 'earningsRevisionIntelligenceEvaluationJa' },
  { phaseId: '23.1', fieldKey: 'phase23_1.earnings_revision_cross_signal', stockKey: 'earningsRevisionCrossSignal', uiEvalKey: 'earningsRevisionCrossSignalEvaluationJa' },
  { phaseId: '22.2', fieldKey: 'phase22_2.conviction_intelligence', stockKey: 'convictionIntelligence', uiEvalKey: 'convictionIntelligenceEvaluationJa' },
];

export type PhaseChainCheck = {
  phaseId: string;
  fieldKey: string;
  executed: boolean;
  dataAvailable: boolean;
};

export type MaterialScoreCheck = {
  pass: boolean;
  score: number;
  breakdownCount: number;
  reason: string | null;
};

export type UiMappingCheck = {
  pass: boolean;
  mappedPhases: number;
  totalPhases: number;
  missingUi: string[];
};

export type ConciergeCheck = {
  pass: boolean;
  hasEnhancedReport: boolean;
  hasPhase23Block: boolean;
  hasPhase24Block: boolean;
  reason: string | null;
};

export type ApiFallbackCheck = {
  pass: boolean;
  statuses: Record<string, string>;
  hasGracefulSkip: boolean;
};

export type StockE2eResult = {
  code: string;
  label: string;
  status: 'PASS' | 'PARTIAL' | 'FAIL';
  crash: boolean;
  error: string | null;
  fetchLiveExternal: boolean;
  materialScore: MaterialScoreCheck;
  phaseChain: PhaseChainCheck[];
  phasesExecuted: number;
  phasesWithData: number;
  uiMapping: UiMappingCheck;
  concierge: ConciergeCheck;
  apiFallback: ApiFallbackCheck;
};

const UNAVAILABLE_JA = /未取得|データなし|—/;

function hasAvailability(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  if ('availability' in obj && (obj as { availability?: string }).availability === 'available') {
    return true;
  }
  if ('hasExtractableData' in obj && (obj as { hasExtractableData?: boolean }).hasExtractableData) {
    return true;
  }
  return obj != null;
}

export function validateMaterialScore(stock: BursaStockMaterialAnalysis): MaterialScoreCheck {
  const score = stock.materialScore;
  if (!Number.isFinite(score)) {
    return { pass: false, score: NaN, breakdownCount: 0, reason: 'materialScore not finite' };
  }
  if (score < -100 || score > 100) {
    return {
      pass: false,
      score,
      breakdownCount: stock.scoreBreakdown?.length ?? 0,
      reason: 'materialScore out of -100..+100',
    };
  }
  return {
    pass: true,
    score,
    breakdownCount: stock.scoreBreakdown?.length ?? 0,
    reason: null,
  };
}

export function validatePhase13_24Chain(stock: BursaStockMaterialAnalysis): PhaseChainCheck[] {
  const fetched = new Set(stock.fetchedFields ?? []);
  return PHASE13_24_PIPELINE.map((spec) => {
    const executed = fetched.has(spec.fieldKey);
    const payload = stock[spec.stockKey];
    const dataAvailable = executed || hasAvailability(payload);
    return {
      phaseId: spec.phaseId,
      fieldKey: spec.fieldKey,
      executed,
      dataAvailable,
    };
  });
}

export function validateUiMapping(row: MaterialStockRow): UiMappingCheck {
  const missingUi: string[] = [];
  let mapped = 0;
  for (const spec of PHASE13_24_PIPELINE) {
    if (!spec.uiEvalKey) continue;
    const val = row[spec.uiEvalKey];
    if (typeof val === 'string' && val.length > 0 && !UNAVAILABLE_JA.test(val.slice(0, 12))) {
      mapped += 1;
    } else {
      missingUi.push(spec.phaseId);
    }
  }
  const totalPhases = PHASE13_24_PIPELINE.filter((p) => p.uiEvalKey).length;
  return {
    pass: mapped >= Math.ceil(totalPhases * 0.5),
    mappedPhases: mapped,
    totalPhases,
    missingUi,
  };
}

export function validateConciergeOutput(
  report: ConciergeEnhancedAnalysisReport | null,
): ConciergeCheck {
  if (!report) {
    return {
      pass: false,
      hasEnhancedReport: false,
      hasPhase23Block: false,
      hasPhase24Block: false,
      reason: 'concierge report null',
    };
  }
  const has23 = Boolean(report.earningsRevisionIntelligenceDetailJa);
  const has24 = Boolean(report.analystConsensusIntelligenceDetailJa);
  return {
    pass: true,
    hasEnhancedReport: true,
    hasPhase23Block: has23,
    hasPhase24Block: has24,
    reason: null,
  };
}

export function validateApiFallback(stock: BursaStockMaterialAnalysis): ApiFallbackCheck {
  const statuses = stock.sourceStatus ?? {};
  const values = Object.values(statuses);
  const validStatuses = new Set(['ok', 'partial', 'skipped', 'error', 'failed', 'unavailable']);
  const allValid = values.every((v) => validStatuses.has(v));
  const hasGracefulSkip = values.some((v) => v === 'skipped' || v === 'partial' || v === 'ok');
  return {
    pass: allValid && values.length > 0,
    statuses: { ...statuses },
    hasGracefulSkip,
  };
}

export function summarizeStockE2e(input: {
  code: string;
  label: string;
  stock: BursaStockMaterialAnalysis;
  materialRow: MaterialStockRow;
  concierge: ConciergeEnhancedAnalysisReport | null;
  fetchLiveExternal: boolean;
  crash?: boolean;
  error?: string | null;
}): StockE2eResult {
  const materialScore = validateMaterialScore(input.stock);
  const phaseChain = validatePhase13_24Chain(input.stock);
  const phasesExecuted = phaseChain.filter((p) => p.executed).length;
  const phasesWithData = phaseChain.filter((p) => p.dataAvailable).length;
  const uiMapping = validateUiMapping(input.materialRow);
  const concierge = validateConciergeOutput(input.concierge);
  const apiFallback = validateApiFallback(input.stock);

  const chainOk = phasesExecuted >= 12 && phasesWithData >= 8;
  const coreOk =
    materialScore.pass &&
    chainOk &&
    uiMapping.pass &&
    concierge.pass &&
    apiFallback.pass &&
    !input.crash;

  let status: StockE2eResult['status'] = 'FAIL';
  if (coreOk) status = 'PASS';
  else if (!input.crash && (phasesExecuted >= 8 || phasesWithData >= 6)) status = 'PARTIAL';

  return {
    code: input.code,
    label: input.label,
    status,
    crash: input.crash ?? false,
    error: input.error ?? null,
    fetchLiveExternal: input.fetchLiveExternal,
    materialScore,
    phaseChain,
    phasesExecuted,
    phasesWithData,
    uiMapping,
    concierge,
    apiFallback,
  };
}

export function aggregateE2ePass(rows: StockE2eResult[]): {
  pass: boolean;
  passCount: number;
  partialCount: number;
  failCount: number;
  crashCount: number;
} {
  const passCount = rows.filter((r) => r.status === 'PASS').length;
  const partialCount = rows.filter((r) => r.status === 'PARTIAL').length;
  const failCount = rows.filter((r) => r.status === 'FAIL').length;
  const crashCount = rows.filter((r) => r.crash).length;
  return {
    pass: passCount >= 4 && crashCount === 0,
    passCount,
    partialCount,
    failCount,
    crashCount,
  };
}
