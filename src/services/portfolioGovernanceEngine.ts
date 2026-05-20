import {
  DO_NOT_TRADE_DISAGREEMENT,
  DO_NOT_TRADE_LIQUIDITY_WARNINGS,
  DO_NOT_TRADE_REGIME_CONFIDENCE,
  DO_NOT_TRADE_REGIME_TRANSITION_PCT,
  HEALTH_GREEN_META_ROBUST,
  HEALTH_YELLOW_META_ROBUST,
} from '../constants/governance';
import { ENSEMBLE_ALLOCATOR_LABEL } from '../constants/metaAllocation';
import type { MarketRegimeResult } from '../types/marketRegime';
import type { PortfolioConstructionReport } from '../types/portfolioConstruction';
import type {
  DoNotTradeWarning,
  GovernanceAuditEntry,
  GovernanceReasonCode,
  ModelGovernanceDashboard,
  PortfolioGovernanceReport,
  SystemHealthStatus,
} from '../types/governance';
import type { MetaAllocationReport } from '../types/metaAllocation';
import { buildAllocationExplanation } from './allocationExplanationEngine';
import { applyAllocatorHysteresis } from './allocatorHysteresisService';
import { appendGovernanceAuditEntry } from './governanceAuditService';
import { computeProbabilisticRegimeMixture } from './probabilisticRegimeService';

function buildDoNotTrade(params: {
  meta: MetaAllocationReport;
  regime: MarketRegimeResult;
  regimeMixture: ReturnType<typeof computeProbabilisticRegimeMixture>;
  constructionReport?: PortfolioConstructionReport;
}): DoNotTradeWarning {
  const reasons: string[] = [];
  const reasonCodes: GovernanceReasonCode[] = [];

  if (params.meta.disagreement.score >= DO_NOT_TRADE_DISAGREEMENT) {
    reasons.push(`アロケーター不一致 ${params.meta.disagreement.score}/100`);
    reasonCodes.push('DISAGREEMENT_HIGH');
  }
  if (params.regimeMixture.transitionPct >= DO_NOT_TRADE_REGIME_TRANSITION_PCT) {
    reasons.push(`レジーム遷移確率 ${params.regimeMixture.transitionPct}%`);
    reasonCodes.push('REGIME_UNCERTAIN');
  }
  if (params.regime.confidenceScore < DO_NOT_TRADE_REGIME_CONFIDENCE) {
    reasons.push(`レジーム信頼度 ${params.regime.confidenceScore}%`);
    reasonCodes.push('CONFIDENCE_LOW');
  }
  if (params.meta.failSafe.triggered) {
    reasons.push(params.meta.failSafe.reasonJa);
    reasonCodes.push('FAILSAFE_TRIGGERED');
  }

  const liqWarnings =
    params.constructionReport?.warnings.filter(
      (w) => w.severity === 'high' || w.severity === 'critical',
    ).length ?? 0;
  if (liqWarnings >= DO_NOT_TRADE_LIQUIDITY_WARNINGS) {
    reasons.push(`流動性/集中リスク警告 ${liqWarnings}件`);
    reasonCodes.push('LIQUIDITY_RISK');
  }

  const active = reasons.length > 0;
  return {
    active,
    severity:
      reasonCodes.includes('FAILSAFE_TRIGGERED') || reasonCodes.includes('DISAGREEMENT_HIGH')
        ? 'critical'
        : 'high',
    reasons,
    reasonCodes: active ? [...reasonCodes, 'DO_NOT_TRADE'] : reasonCodes,
  };
}

function computeHealthStatus(params: {
  meta: MetaAllocationReport;
  doNotTrade: DoNotTradeWarning;
}): { status: SystemHealthStatus; noteJa: string } {
  if (params.doNotTrade.active) {
    return {
      status: 'red',
      noteJa: 'システムヘルス: 赤 — 新規取引は推奨されません',
    };
  }
  if (
    params.meta.metaRobustness.score >= HEALTH_GREEN_META_ROBUST &&
    !params.meta.failSafe.triggered
  ) {
    return {
      status: 'green',
      noteJa: 'システムヘルス: 緑 — ガバナンス・配分は正常範囲',
    };
  }
  if (params.meta.metaRobustness.score >= HEALTH_YELLOW_META_ROBUST) {
    return {
      status: 'yellow',
      noteJa: 'システムヘルス: 黄 — 監視強化・ポジション追加は慎重に',
    };
  }
  return {
    status: 'red',
    noteJa: 'システムヘルス: 赤 — メタ頑健性が低くモデル不確実',
  };
}

/** ガバナンス・説明・監査の統合 */
export async function buildPortfolioGovernanceReport(params: {
  meta: MetaAllocationReport;
  regime: MarketRegimeResult;
  symbols: string[];
  markets: import('../types').Market[];
  maxW: number[];
  currentWeightsPct: Map<string, number>;
  totalPortfolioValueMYR: number;
  constructionReport?: PortfolioConstructionReport;
  blockedTrades?: string[];
}): Promise<PortfolioGovernanceReport> {
  const {
    meta,
    regime,
    symbols,
    markets,
    maxW,
    currentWeightsPct,
    totalPortfolioValueMYR,
    constructionReport,
    blockedTrades = [],
  } = params;

  const regimeMixture = computeProbabilisticRegimeMixture({
    regimeId: regime.regimeId,
    regimeScores: regime.regimeScores,
    regimeConfidence: regime.confidenceScore,
    volatilityProxyPct: regime.indicators.volatilityProxyPct,
    breadthPct: regime.indicators.breadthPctAboveMa50,
  });

  const hysteresis = await applyAllocatorHysteresis({ meta, regimeId: regime.regimeId });

  const explanation = buildAllocationExplanation({
    meta,
    symbols,
    markets,
    maxW,
    currentWeightsPct,
    regimeId: regime.regimeId,
  });

  const confidenceScore = meta.confidenceBlend.effectiveConfidence;
  const entropyScore = Math.round(meta.allocationEntropy.normalizedEntropy * 100);

  const switchReasonJa = hysteresis.switched
    ? hysteresis.noteJa
    : hysteresis.rawRecommended !== hysteresis.governedActive
      ? `生推奨 ${ENSEMBLE_ALLOCATOR_LABEL[hysteresis.rawRecommended]} をヒステリシスで抑制`
      : 'アロケーター切替なし';

  const dashboard: ModelGovernanceDashboard = {
    activeModel: hysteresis.governedActive,
    activeModelLabelJa: ENSEMBLE_ALLOCATOR_LABEL[hysteresis.governedActive],
    previousModel: hysteresis.previousActive,
    switchReasonJa,
    disagreementScore: meta.disagreement.score,
    entropyScore,
    confidenceScore,
    failSafeActive: meta.failSafe.triggered,
    metaRobustnessScore: meta.metaRobustness.score,
  };

  const doNotTrade = buildDoNotTrade({ meta, regime, regimeMixture, constructionReport });
  const { status: healthStatus, noteJa: healthNoteJa } = computeHealthStatus({ meta, doNotTrade });

  const reasonCodes: GovernanceReasonCode[] = [];
  if (meta.metaRobustness.score >= HEALTH_GREEN_META_ROBUST) reasonCodes.push('META_ROBUST_OK');
  else reasonCodes.push('META_ROBUST_LOW');
  if (meta.disagreement.score >= DO_NOT_TRADE_DISAGREEMENT) reasonCodes.push('DISAGREEMENT_HIGH');
  if (meta.failSafe.triggered) reasonCodes.push('FAILSAFE_TRIGGERED');
  if (hysteresis.switched) reasonCodes.push('HYSTERESIS_SWITCH');
  else if (hysteresis.rawRecommended !== hysteresis.governedActive) {
    reasonCodes.push('HYSTERESIS_HOLD');
  }
  if (doNotTrade.active) reasonCodes.push('DO_NOT_TRADE');

  const warnings: string[] = [
    ...doNotTrade.reasons,
    meta.disagreement.noteJa,
    regimeMixture.noteJa,
  ];
  if (meta.regimeSelection.suppressedAllocators.length > 0) {
    warnings.push(
      `抑制モデル: ${meta.regimeSelection.suppressedAllocators.map((id) => ENSEMBLE_ALLOCATOR_LABEL[id]).join(', ')}`,
    );
    reasonCodes.push('ALLOCATOR_SUPPRESSED');
  }

  const auditEntry: GovernanceAuditEntry = {
    id: `gov_${Date.now()}`,
    timestamp: new Date().toISOString(),
    dataSource: meta.dataSource,
    symbols,
    regimeId: regime.regimeId,
    inputsSummary: {
      tradingDays: meta.tradingDays,
      regimeConfidence: regime.confidenceScore,
      volatilityProxyPct: regime.indicators.volatilityProxyPct,
      portfolioValueMYR: Math.round(totalPortfolioValueMYR),
    },
    modelWeights: meta.dynamicModelWeights.map((m) => ({
      allocatorId: m.allocatorId,
      weightPct: m.dynamicWeight,
    })),
    finalWeights: meta.finalWeights.map((w) => ({
      symbol: w.symbol,
      weightPct: w.weightPct,
    })),
    blockedTrades,
    warnings,
    reasonCodes: [...new Set(reasonCodes)],
    healthStatus,
    activeAllocator: hysteresis.governedActive,
  };

  await appendGovernanceAuditEntry(auditEntry);

  const verdictJa = doNotTrade.active
    ? `取引停止 — ${doNotTrade.reasons[0] ?? 'リスク超過'}`
    : healthStatus === 'green'
      ? `ガバナンス承認 — ${dashboard.activeModelLabelJa} · ヘルス緑`
      : `要監視 — ヘルス${healthStatus === 'yellow' ? '黄' : '赤'}`;

  return {
    generatedAt: new Date().toISOString(),
    meta,
    explanation,
    regimeMixture,
    hysteresis,
    dashboard,
    doNotTrade,
    healthStatus,
    healthNoteJa,
    auditEntry,
    verdictJa,
  };
}
