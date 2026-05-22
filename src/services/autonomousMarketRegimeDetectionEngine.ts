/**
 * Market regime detection — current-state classification only (no prediction).
 */
import {
  ADAPTATION_HEALTH_FORMULA_JA,
  CLASSIFICATION_DISCLAIMER_JA,
  PANIC_RISK_FORMULA_JA,
  REGIME_CONFIDENCE_FORMULA_JA,
  REGIME_FEATURE_LABELS,
  REGIME_FLOW_JA,
  REGIME_LABELS_JA,
  REGIME_REGULATORY_JA,
  REAL_TRADING_ENABLED,
  UNCERTAINTY_FORMULA_JA,
} from '../constants/autonomousMarketRegimeDetection';
import type {
  AutonomousMarketRegimeDetectionBundle,
  BuildMarketRegimeInput,
  MarketRegimeCategory,
  RegimeFeatureId,
  RegimeFeatureStatus,
} from '../types/autonomousMarketRegimeDetection';
import { loadMarketRegimeState } from './autonomousMarketRegimeDetectionStorage';
import { buildRegimeAdaptation } from './autonomousMarketRegimeAdaptationEngine';

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export type RegimeMetrics = {
  volatilityRiskPct: number;
  volatilityTrendPct: number;
  macroShockPct: number;
  spreadRiskPct: number;
  liquidityRiskPct: number;
  sentimentDriftPct: number;
  correlationBreakPct: number;
  trendStrengthPct: number;
  volumeAnomalyPct: number;
  governanceStressPct: number;
  stabilityHealthPct: number;
  recoveryHealthPct: number;
  confidenceDriftPct: number;
  contradictionTrendPct: number;
  unsupportedRiskPct: number;
  instabilityDrift: number;
  uncertaintyPct: number;
  panicRiskPct: number;
  adaptationHealthPct: number;
  regimeConfidencePct: number;
  entropyPct: number;
  replayNoisePct: number;
  volatilityShiftPct: number;
};

export function computeRegimeMetrics(input: BuildMarketRegimeInput): RegimeMetrics {
  const scores = input.macro?.marketScores;
  const fear = scores?.fearScore ?? 50;
  const risk = scores?.marketRiskScore ?? 50;
  const momentum = scores?.momentumScore ?? 50;
  const liquidity = scores?.liquidityScore ?? 50;

  const volatilityRiskPct = clamp(
    input.mockVolatilityPct ??
      fear * 0.45 +
        Math.abs(input.macro?.vix?.changePct ?? 0) * 4 +
        (input.macro?.regimeId === 'panic' ? 25 : 0),
  );

  const macroShockPct = clamp(
    Math.abs(input.macro?.vix?.changePct ?? 0) * 5 +
      (input.macro?.insufficientData ? 30 : 0) +
      (input.systemic?.cascadeRiskPct ?? 0) * 0.2,
  );

  const liquidityRiskPct = clamp(100 - liquidity + (input.systemic?.freezeChainCount ?? 0) * 8);
  const spreadRiskPct = clamp((100 - liquidity) * 0.6 + risk * 0.2);
  const sentimentDriftPct = input.reflection?.confidenceDriftPct ?? 0;
  const correlationBreakPct = clamp(
    (input.macro?.correlations.length ?? 0) < 2 ? 25 : fear > 60 ? 20 : 8,
  );
  const trendStrengthPct = clamp(Math.abs(momentum - 50) * 1.4);
  const volumeAnomalyPct = clamp(risk > 65 ? 22 : 10);

  const governanceStressPct = clamp(
    (input.governance?.vetoLayer ? 20 : 0) +
      (input.systemic?.governanceSaturationPct ?? 0) * 0.5 +
      (input.systemic?.governanceCooldownActive ? 15 : 0),
  );

  const stabilityHealthPct = clamp(
    input.systemic?.stabilityHealthScore ?? input.stability?.systemHealthScore ?? 60,
  );

  const recoveryHealthPct = clamp(input.recovery?.recoveryHealthPct ?? 55);
  const confidenceDriftPct = input.reflection?.confidenceDriftPct ?? 0;
  const contradictionTrendPct = input.reflection?.contradictionTrendPct ?? 0;
  const unsupportedRiskPct = clamp(
    (input.macro?.insufficientData ? 40 : 0) +
      (input.epistemic?.unsupportedClaimsJa?.length ?? 0) * 8,
  );
  const instabilityDrift = input.epistemic?.reliabilityDriftPct ?? 0;

  const entropyPct = clamp((input.macro?.dataGapsJa.length ?? 0) * 12 + 5);
  const replayNoisePct = clamp(
    input.epistemic?.replayTrustPct !== undefined && input.epistemic.replayTrustPct < 40 ? 35 : 0,
  );
  const volatilityShiftPct = clamp(Math.abs(volatilityRiskPct - 45));

  const uncertaintyPct = clamp(
    entropyPct * 0.3 +
      correlationBreakPct * 0.25 +
      volatilityShiftPct * 0.25 +
      replayNoisePct * 0.2,
  );

  const panicRiskPct = clamp(
    volatilityRiskPct * 0.35 +
      liquidityRiskPct * 0.25 +
      macroShockPct * 0.2 +
      contradictionTrendPct * 0.2,
  );

  const adaptationHealthPct = clamp(
    stabilityHealthPct * 0.3 +
      (input.governance?.consensusScore ?? 50) * 0.3 +
      recoveryHealthPct * 0.2 +
      (input.orchestration?.orchestrationHealthScore ?? 50) * 0.2,
  );

  let regimeConfidencePct = clamp(
    100 -
      volatilityRiskPct * 0.25 -
      uncertaintyPct * 0.2 -
      contradictionTrendPct * 0.15 -
      unsupportedRiskPct * 0.15 -
      governanceStressPct * 0.1 -
      instabilityDrift * 0.05,
  );

  const prev = input.macro?.regimeConfidencePct ?? regimeConfidencePct;
  const volatilityTrendPct = clamp(volatilityRiskPct - (100 - prev) * 0.3);

  return {
    volatilityRiskPct,
    volatilityTrendPct,
    macroShockPct,
    spreadRiskPct,
    liquidityRiskPct,
    sentimentDriftPct,
    correlationBreakPct,
    trendStrengthPct,
    volumeAnomalyPct,
    governanceStressPct,
    stabilityHealthPct,
    recoveryHealthPct,
    confidenceDriftPct,
    contradictionTrendPct,
    unsupportedRiskPct,
    instabilityDrift,
    uncertaintyPct,
    panicRiskPct,
    adaptationHealthPct,
    regimeConfidencePct,
    entropyPct,
    replayNoisePct,
    volatilityShiftPct,
  };
}

/** Classify current regime from metrics — not a forecast */
export function classifyMarketRegime(
  metrics: RegimeMetrics,
  input: BuildMarketRegimeInput,
): MarketRegimeCategory {
  if (metrics.panicRiskPct > 70) return 'PANIC';
  if (metrics.uncertaintyPct > 75 || input.macro?.insufficientData) return 'UNSUPPORTED_ENVIRONMENT';
  if (metrics.governanceStressPct > 80) return 'LIQUIDITY_STRESS';
  if (metrics.stabilityHealthPct < 35) return 'PANIC';
  if (input.recovery?.partialRestoreActive && metrics.volatilityRiskPct < 55) {
    return 'RECOVERY_TRANSITION';
  }
  if (metrics.liquidityRiskPct > 65) return 'LIQUIDITY_STRESS';
  if (metrics.volatilityRiskPct > 55) {
    const bull =
      (input.macro?.regimeId === 'bullish' ||
        input.macro?.regimeId === 'risk_on' ||
        input.macro?.regimeId === 'recovery') &&
      (input.macro?.marketScores.momentumScore ?? 0) > 52;
    return bull ? 'VOLATILE_BULL' : 'VOLATILE_BEAR';
  }
  if (metrics.trendStrengthPct < 25 && metrics.volatilityRiskPct < 40) return 'SIDEWAYS';
  const calmBull =
    input.macro?.regimeId === 'bullish' ||
    input.macro?.regimeId === 'risk_on' ||
    (input.macro?.marketScores.momentumScore ?? 0) > 55;
  if (metrics.volatilityRiskPct < 35) return calmBull ? 'CALM_BULL' : 'CALM_BEAR';
  return calmBull ? 'CALM_BULL' : 'CALM_BEAR';
}

function buildFeatureStatuses(
  partial: Omit<AutonomousMarketRegimeDetectionBundle, 'featureStatuses'>,
): RegimeFeatureStatus[] {
  const s = (
    id: RegimeFeatureId,
    ok: boolean,
    watch: boolean,
    detail: string,
  ): RegimeFeatureStatus => ({
    id,
    labelJa: REGIME_FEATURE_LABELS[id],
    statusJa: ok ? 'ok' : watch ? 'watch' : 'critical',
    detailJa: detail,
  });

  return [
    s('regime_detection_engine', partial.regimeConfidencePct >= 45, partial.regimeConfidencePct < 35, partial.currentRegime),
    s('volatility_normalizer', partial.volatilityRiskPct < 70, partial.volatilityRiskPct >= 55, `${partial.volatilityRiskPct}%`),
    s('regime_clustering', true, false, partial.currentRegime),
    s('confidence_weighting', partial.regimeConfidencePct >= 50, false, `${partial.regimeConfidencePct}`),
    s('uncertainty_estimator', partial.uncertaintyPct < 75, partial.uncertaintyPct >= 75, `${partial.uncertaintyPct}`),
    s('adaptation_recommender', true, false, partial.adaptationMode),
    s('orchestration_handoff', partial.orchestrationBudgetMax > 0, false, `${partial.orchestrationBudgetMax}`),
    s('panic_risk_scanner', partial.panicRiskPct < 70, partial.panicRiskPct >= 70, `${partial.panicRiskPct}`),
    s('liquidity_stress_detector', partial.currentRegime !== 'LIQUIDITY_STRESS', partial.currentRegime === 'LIQUIDITY_STRESS', 'stress'),
    s('sideways_suppressor', partial.currentRegime !== 'SIDEWAYS', false, 'sideways'),
    s('volatile_clamp', partial.confidenceClampPct <= 55, partial.confidenceClampPct > 55, `${partial.confidenceClampPct}`),
    s('calm_standard_mode', partial.currentRegime.startsWith('CALM'), false, 'calm'),
    s('unsupported_guard', !partial.explanationOnlyMode, partial.explanationOnlyMode, 'unsupported'),
    s('recovery_transition_bridge', partial.currentRegime !== 'RECOVERY_TRANSITION', false, 'recovery'),
    s('governance_priority_mode', !partial.governancePriorityMode, partial.governancePriorityMode, 'gov'),
    s('stability_freeze_gate', !partial.freezeAdaptiveLayers, partial.freezeAdaptiveLayers, 'freeze'),
    s('confidence_drift_cooldown', partial.confidenceDriftPct < 60, partial.confidenceDriftPct >= 60, 'drift'),
    s('macro_shock_detector', partial.macroShockPct < 60, partial.macroShockPct >= 60, `${partial.macroShockPct}`),
    s('correlation_break_detector', true, false, 'corr'),
    s('sentiment_drift_tracker', true, false, 'sentiment'),
    s('trend_strength_analyzer', true, false, 'trend'),
    s('volume_anomaly_detector', true, false, 'volume'),
    s('mobile_regime_optimizer', true, false, partial.mobileRuntimeStateJa),
    s('orchestration_budget_adapter', true, false, `${partial.orchestrationBudgetMax}`),
    s('layer_priority_shifter', true, false, 'priority'),
    s('explanation_only_mode', !partial.explanationOnlyMode, partial.explanationOnlyMode, 'explain'),
    s('regime_timeline', partial.regimeTimeline.length > 0, false, `${partial.regimeTimeline.length}`),
    s('market_regime_dashboard', true, false, 'panel'),
    s('paper_trading_safety', partial.realTradingEnabled === false, false, 'paper'),
    s('classification_not_prediction', true, false, 'no forecast'),
  ];
}

export async function buildAutonomousMarketRegimeDetectionBundle(
  input: BuildMarketRegimeInput,
): Promise<AutonomousMarketRegimeDetectionBundle> {
  const persisted = await loadMarketRegimeState();
  const metrics = computeRegimeMetrics(input);
  const currentRegime = classifyMarketRegime(metrics, input);
  const adaptation = buildRegimeAdaptation(currentRegime, metrics, input);

  const partial: Omit<AutonomousMarketRegimeDetectionBundle, 'featureStatuses'> = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: REGIME_REGULATORY_JA,
    paperTradingOnly: true,
    realTradingEnabled: REAL_TRADING_ENABLED,
    currentRegime,
    regimeLabelJa: REGIME_LABELS_JA[currentRegime],
    regimeConfidencePct: metrics.regimeConfidencePct,
    uncertaintyPct: metrics.uncertaintyPct,
    panicRiskPct: metrics.panicRiskPct,
    adaptationHealthPct: metrics.adaptationHealthPct,
    adaptationMode: adaptation.adaptationMode,
    confidenceClampPct: adaptation.confidenceClampPct,
    orchestrationBudgetMax: adaptation.orchestrationBudgetMax,
    governancePriorityMode: adaptation.governancePriorityMode,
    freezeAdaptiveLayers: adaptation.freezeAdaptiveLayers,
    explanationOnlyMode: adaptation.explanationOnlyMode,
    volatilityRiskPct: metrics.volatilityRiskPct,
    volatilityTrendPct: metrics.volatilityTrendPct,
    macroShockPct: metrics.macroShockPct,
    liquidityRiskPct: metrics.liquidityRiskPct,
    governanceStressPct: metrics.governanceStressPct,
    confidenceDriftPct: metrics.confidenceDriftPct,
    activeLayersSummaryJa: 'pending orchestration handoff',
    suspendedLayersSummaryJa: '—',
    governanceOverrideJa: adaptation.governancePriorityMode ? 'priority' : 'none',
    recoveryInteractionJa: input.recovery?.partialRestoreActive
      ? `stage ${input.recovery.recoveryStage} · ${input.recovery.thawState}`
      : 'standard',
    mobileRuntimeStateJa: adaptation.mobileRuntimeStateJa,
    regimeSummaryJa: [
      `${REGIME_LABELS_JA[currentRegime]}`,
      `confidence ${metrics.regimeConfidencePct}% uncertainty ${metrics.uncertaintyPct}%`,
      adaptation.summaryJa,
      metrics.uncertaintyPct > 50 ? '（不確実性あり — 断定禁止）' : null,
    ]
      .filter(Boolean)
      .join(' — '),
    classificationDisclaimerJa: CLASSIFICATION_DISCLAIMER_JA,
    regimeConfidenceFormulaJa: REGIME_CONFIDENCE_FORMULA_JA,
    uncertaintyFormulaJa: UNCERTAINTY_FORMULA_JA,
    adaptationHealthFormulaJa: ADAPTATION_HEALTH_FORMULA_JA,
    panicRiskFormulaJa: PANIC_RISK_FORMULA_JA,
    regimeFlowJa: [...REGIME_FLOW_JA],
    adaptationFlowJa: adaptation.adaptationFlowJa,
    orchestrationHandoffJa: adaptation.orchestrationHandoffJa,
    regimeTimeline: [
      ...persisted.regimeTimeline,
      {
        at: new Date().toISOString(),
        regime: currentRegime,
        regimeConfidence: metrics.regimeConfidencePct,
        uncertainty: metrics.uncertaintyPct,
      },
    ].slice(-8),
    explainRuleBasisJa:
      '現在局面の分類のみ。safety/governance を bypass しない。攻撃的売買は生成しない。',
  };

  return { ...partial, featureStatuses: buildFeatureStatuses(partial) };
}
