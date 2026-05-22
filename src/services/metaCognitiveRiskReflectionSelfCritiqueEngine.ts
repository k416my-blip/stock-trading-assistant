/**
 * Meta-Cognitive Risk Reflection & Self-Critique — paper only, self-audit only.
 */
import {
  BIAS_DETECTION_FLOW_JA,
  CONFIDENCE_DRIFT_FORMULA_JA,
  CONSERVATIVE_RECOVERY_FLOW_JA,
  FATIGUE_FORMULA_JA,
  LONGITUDINAL_AUDIT_FLOW_JA,
  META_CONFIDENCE_SAFE_THRESHOLD,
  NARRATIVE_BEARISH_PATTERNS,
  NARRATIVE_BULLISH_PATTERNS,
  REAL_TRADING_ENABLED,
  REFLECTION_FEATURE_LABELS,
  REFLECTION_FLOW_STEPS_JA,
  REFLECTION_FREEZE_FLOW_JA,
  REFLECTION_REGULATORY_JA,
  ROLLBACK_DEPENDENCY_FORMULA_JA,
  ROLLBACK_DEPENDENCY_WARN_PCT,
  SELF_CRITIQUE_FORMULA_JA,
} from '../constants/metaCognitiveRiskReflectionSelfCritique';
import type {
  BuildMetaCognitiveReflectionInput,
  MetaCognitiveRiskReflectionSelfCritiqueBundle,
  ReflectionFeatureId,
  ReflectionFeatureStatus,
} from '../types/metaCognitiveRiskReflectionSelfCritique';
import {
  appendDriftTimelinePoint,
  loadMetaCognitiveReflectionState,
} from './metaCognitiveRiskReflectionSelfCritiqueStorage';

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function countPatterns(text: string, patterns: readonly string[]): number {
  const lower = text.toLowerCase();
  return patterns.reduce((n, p) => n + (lower.includes(p) ? 1 : 0), 0);
}

function narrativeBiasPct(input: BuildMetaCognitiveReflectionInput): {
  bullish: number;
  bearish: number;
} {
  const text = [
    input.governance?.unifiedAiSummaryJa ?? '',
    input.trace?.reasoningChainJa?.join(' ') ?? '',
    input.semantic?.semanticSummaryJa ?? '',
  ].join(' ');
  const bull = countPatterns(text, NARRATIVE_BULLISH_PATTERNS);
  const bear = countPatterns(text, NARRATIVE_BEARISH_PATTERNS);
  const total = Math.max(1, bull + bear);
  return {
    bullish: clamp((bull / total) * 100),
    bearish: clamp((bear / total) * 100),
  };
}

export async function buildMetaCognitiveRiskReflectionSelfCritiqueBundle(
  input: BuildMetaCognitiveReflectionInput,
): Promise<MetaCognitiveRiskReflectionSelfCritiqueBundle> {
  const persisted = await loadMetaCognitiveReflectionState();
  const bias = narrativeBiasPct(input);

  const traceConf = input.trace?.explainableScore ?? 50;
  const govConf = input.governance?.consensusScore ?? 50;
  const confidenceDriftPct = clamp(Math.abs(traceConf - govConf));

  const freezeSignals =
    (input.semantic?.semanticFreeze ? 1 : 0) +
    (input.epistemic?.reliabilityFreeze ? 1 : 0) +
    (input.arbitration?.intentFreeze ? 1 : 0) +
    (input.temporal?.emergencyStateFreeze ? 1 : 0);
  const freezeFrequencyPct = clamp(
    ((persisted.freezeCount + freezeSignals) / Math.max(1, persisted.driftTimeline.length + 1)) * 25,
  );

  const rollbackApplied = input.temporal?.rollbackApplied === true;
  const rollbackDependencyPct = clamp(
    (persisted.rollbackCount / Math.max(1, persisted.driftTimeline.length + 1)) * 100 +
      (rollbackApplied ? 30 : 0),
  );

  const unsupportedCount =
    (input.semantic?.unsupportedClaimsJa?.length ?? 0) +
    (input.epistemic?.unsupportedClaimsJa?.length ?? 0);
  const unsupportedTrendPct = clamp(unsupportedCount * 12 + (persisted.driftTimeline.length > 5 ? 10 : 0));

  const contradictionCount =
    (input.semantic?.contradictionLanguageJa?.length ?? 0) +
    (input.governance?.contradictionDetected ? 1 : 0);
  const contradictionTrendPct = clamp(contradictionCount * 15);

  const replayFatigue = input.epistemic?.replayTrustPct != null && input.epistemic.replayTrustPct < 40 ? 20 : 0;
  const arbStress =
    (input.arbitration?.arbitrationConflicts.length ?? 0) * 5 +
    (input.arbitration?.deadlockDetected ? 15 : 0);
  const reliabilityDecay = input.epistemic
    ? clamp(100 - input.epistemic.reliabilityHealthScore)
    : 0;

  const fatigueScore = clamp(
    freezeFrequencyPct * 0.25 +
      rollbackDependencyPct * 0.2 +
      arbStress +
      replayFatigue +
      contradictionTrendPct * 0.2,
  );

  const prevMeta = persisted.lastMetaConfidence ?? 60;
  let metaConfidencePct = clamp(
    70 -
      confidenceDriftPct * 0.4 -
      fatigueScore * 0.3 -
      unsupportedTrendPct * 0.2 -
      reliabilityDecay * 0.15,
  );
  if (input.governance?.humanOverrideActive) metaConfidencePct = clamp(metaConfidencePct + 5);

  const confidenceVolatilityPct = clamp(
    confidenceDriftPct + Math.abs(metaConfidencePct - prevMeta) * 0.5,
  );

  const recActions = input.strategy?.todayRecommendations.map((r) => r.action) ?? [];
  const uniqueActions = new Set(recActions).size;
  const recommendationStabilityPct = clamp(
    recActions.length === 0 ? 70 : (uniqueActions <= 2 ? 80 : 50) - confidenceDriftPct * 0.3,
  );

  const longitudinalConsistencyPct = clamp(
    (input.semantic?.finalDecisionCoherenceScore ?? 55) * 0.3 +
      (input.epistemic?.reliabilityHealthScore ?? 55) * 0.25 +
      (input.arbitration?.arbitrationHealthScore ?? 55) * 0.25 +
      recommendationStabilityPct * 0.2,
  );

  const explainRegression =
    (input.trace?.explainableScore ?? 70) < 45 ||
    (input.trace?.missingEvidenceJa?.length ?? 0) > 2;

  const semanticSaturation =
    (input.semantic?.unsupportedClaimsJa?.length ?? 0) +
      (input.semantic?.contradictionLanguageJa?.length ?? 0) >
    4;

  const governanceDependencyPct = clamp(
    input.governance?.vetoLayer ? 75 : 50 + (input.governance?.consensusScore ?? 50) * 0.2,
  );

  const overconfident =
    (input.strategy?.overallConfidencePct ?? 0) > 75 && metaConfidencePct < 50;

  let selfCritiqueScore = clamp(
    100 -
      confidenceDriftPct * 0.25 -
      fatigueScore * 0.2 -
      unsupportedTrendPct * 0.15 -
      contradictionTrendPct * 0.15 -
      rollbackDependencyPct * 0.1 -
      freezeFrequencyPct * 0.1 -
      (bias.bullish > 70 || bias.bearish > 70 ? 8 : 0),
  );

  const reflectionConsensusPct = clamp(
    (selfCritiqueScore + metaConfidencePct + longitudinalConsistencyPct) / 3,
  );

  const conservativeRecoveryActive =
    rollbackDependencyPct >= ROLLBACK_DEPENDENCY_WARN_PCT || rollbackApplied;
  const reflectionSafeMode =
    metaConfidencePct < META_CONFIDENCE_SAFE_THRESHOLD ||
    input.arbitration?.emergencySafeMode === true ||
    input.epistemic?.emergencyFallbackApplied === true;
  const reflectionFreeze =
    fatigueScore >= 70 ||
    input.arbitration?.intentFreeze === true ||
    explainRegression;
  const metaEmergencyShutdown =
    reflectionFreeze ||
    (selfCritiqueScore < 30 && fatigueScore > 60) ||
    input.temporal?.emergencyStateFreeze === true;

  if (metaEmergencyShutdown) selfCritiqueScore = clamp(selfCritiqueScore - 15);

  const timelinePersist = await appendDriftTimelinePoint(
    {
      at: new Date().toISOString(),
      confidenceDriftPct,
      metaConfidencePct,
      fatigueScore,
    },
    {
      rollbackApplied,
      freezeActive: freezeSignals > 0 || reflectionFreeze,
    },
  );

  const metaWarningJa =
    freezeFrequencyPct >= 40
      ? `freeze頻度警告 ${freezeFrequencyPct}%`
      : unsupportedTrendPct >= 30
        ? `unsupported trend 増加 ${unsupportedTrendPct}%`
        : contradictionTrendPct >= 25
          ? `矛盾 trend 増加 ${contradictionTrendPct}%`
          : null;

  const selfCritiqueSummaryJa = [
    `self-critique ${selfCritiqueScore}/100`,
    `meta conf ${metaConfidencePct}%`,
    `fatigue ${fatigueScore}`,
    `drift ${confidenceDriftPct}%`,
    conservativeRecoveryActive ? 'conservative recovery' : null,
    reflectionSafeMode ? 'SAFE MODE' : null,
    metaEmergencyShutdown ? 'META SHUTDOWN' : null,
  ]
    .filter(Boolean)
    .join(' — ');

  const partial: Omit<MetaCognitiveRiskReflectionSelfCritiqueBundle, 'featureStatuses'> = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: REFLECTION_REGULATORY_JA,
    paperTradingOnly: true,
    realTradingEnabled: REAL_TRADING_ENABLED,
    selfCritiqueScore,
    metaConfidencePct,
    fatigueScore,
    healthLabelJa:
      selfCritiqueScore >= 75
        ? '自己監査良好'
        : selfCritiqueScore >= 50
          ? '自己批判注意'
          : '自己修正必要',
    confidenceDriftPct,
    confidenceVolatilityPct,
    bullishBiasPct: bias.bullish,
    bearishBiasPct: bias.bearish,
    rollbackDependencyPct,
    freezeFrequencyPct,
    unsupportedTrendPct,
    contradictionTrendPct,
    recommendationStabilityPct,
    longitudinalConsistencyPct,
    reflectionConsensusPct,
    reflectionSafeMode,
    reflectionFreeze: reflectionFreeze || metaEmergencyShutdown,
    metaEmergencyShutdown,
    conservativeRecoveryActive,
    selfCritiqueSummaryJa,
    metaWarningJa,
    driftTimeline: [
      ...persisted.driftTimeline,
      {
        at: new Date().toISOString(),
        confidenceDriftPct,
        metaConfidencePct,
        fatigueScore,
      },
    ].slice(-12),
    reflectionFormulaJa: SELF_CRITIQUE_FORMULA_JA,
    confidenceDriftFormulaJa: CONFIDENCE_DRIFT_FORMULA_JA,
    fatigueFormulaJa: FATIGUE_FORMULA_JA,
    rollbackDependencyFormulaJa: ROLLBACK_DEPENDENCY_FORMULA_JA,
    biasDetectionFlowJa: [...BIAS_DETECTION_FLOW_JA],
    longitudinalAuditFlowJa: [...LONGITUDINAL_AUDIT_FLOW_JA],
    conservativeRecoveryFlowJa: [...CONSERVATIVE_RECOVERY_FLOW_JA],
    reflectionFreezeFlowJa: [...REFLECTION_FREEZE_FLOW_JA],
    reflectionFlowJa: [...REFLECTION_FLOW_STEPS_JA],
    explainRuleBasisJa:
      '長期的判断傾向を自己監査。説明・confidence のみ調整し新規売買は生成しない。',
  };

  const featureStatuses = buildFeatureStatuses(partial, {
    overconfident,
    explainRegression,
    semanticSaturation,
    governanceDependencyPct,
    timelinePersist,
  });

  return { ...partial, featureStatuses };
}

function buildFeatureStatuses(
  partial: Omit<MetaCognitiveRiskReflectionSelfCritiqueBundle, 'featureStatuses'>,
  ctx: {
    overconfident: boolean;
    explainRegression: boolean;
    semanticSaturation: boolean;
    governanceDependencyPct: number;
    timelinePersist: { driftDelta: number; rollbackCount: number; freezeCount: number };
  },
): ReflectionFeatureStatus[] {
  const s = (
    id: ReflectionFeatureId,
    ok: boolean,
    watch: boolean,
    detail: string,
  ): ReflectionFeatureStatus => ({
    id,
    labelJa: REFLECTION_FEATURE_LABELS[id],
    statusJa: ok ? 'ok' : watch ? 'watch' : 'critical',
    detailJa: detail,
  });

  return [
    s('self_critique_engine', partial.selfCritiqueScore >= 55, partial.selfCritiqueScore < 40, `${partial.selfCritiqueScore}`),
    s('long_term_confidence_drift_detector', partial.confidenceDriftPct < 20, partial.confidenceDriftPct >= 20, `${partial.confidenceDriftPct}`),
    s('overconfidence_clamp', !ctx.overconfident, ctx.overconfident, 'clamp'),
    s('narrative_bias_detector', partial.bullishBiasPct < 75 && partial.bearishBiasPct < 75, partial.bullishBiasPct >= 70 || partial.bearishBiasPct >= 70, `B${partial.bullishBiasPct}/R${partial.bearishBiasPct}`),
    s('freeze_frequency_audit', partial.freezeFrequencyPct < 40, partial.freezeFrequencyPct >= 40, `${partial.freezeFrequencyPct}`),
    s('rollback_dependency_detector', partial.rollbackDependencyPct < 50, partial.rollbackDependencyPct >= 50, `${partial.rollbackDependencyPct}`),
    s('semantic_saturation_detector', !ctx.semanticSaturation, ctx.semanticSaturation, 'saturation'),
    s('governance_dependency_audit', true, ctx.governanceDependencyPct > 80, `${ctx.governanceDependencyPct}`),
    s('replay_trust_fatigue', partial.fatigueScore < 50, false, 'replay'),
    s('contradiction_trend_tracker', partial.contradictionTrendPct < 25, partial.contradictionTrendPct >= 25, `${partial.contradictionTrendPct}`),
    s('unsupported_claim_trend', partial.unsupportedTrendPct < 30, partial.unsupportedTrendPct >= 30, `${partial.unsupportedTrendPct}`),
    s('drift_memory_timeline', partial.driftTimeline.length > 0, false, `${partial.driftTimeline.length}`),
    s('confidence_volatility_score', partial.confidenceVolatilityPct < 25, partial.confidenceVolatilityPct >= 25, `${partial.confidenceVolatilityPct}`),
    s('recommendation_stability_score', partial.recommendationStabilityPct >= 55, false, `${partial.recommendationStabilityPct}`),
    s('longitudinal_consistency_audit', partial.longitudinalConsistencyPct >= 55, false, `${partial.longitudinalConsistencyPct}`),
    s('recursive_bias_reflection', true, ctx.timelinePersist.driftDelta > 15, 'bias'),
    s('explainability_regression_detector', !ctx.explainRegression, ctx.explainRegression, 'regression'),
    s('reliability_decay_audit', partial.longitudinalConsistencyPct >= 50, false, 'decay'),
    s('arbitration_stress_detector', partial.fatigueScore < 60, partial.fatigueScore >= 60, 'stress'),
    s('ai_fatigue_estimator', partial.fatigueScore < 70, partial.fatigueScore >= 70, `${partial.fatigueScore}`),
    s('emergency_reflection_freeze', !partial.reflectionFreeze, partial.reflectionFreeze, 'freeze'),
    s('conservative_recovery_engine', !partial.conservativeRecoveryActive, partial.conservativeRecoveryActive, 'recovery'),
    s('historical_behavior_replay', ctx.timelinePersist.rollbackCount >= 0, false, `rb${ctx.timelinePersist.rollbackCount}`),
    s('meta_confidence_score', partial.metaConfidencePct >= 45, partial.metaConfidencePct < 45, `${partial.metaConfidencePct}`),
    s('reflection_consensus_merge', partial.reflectionConsensusPct >= 50, false, `${partial.reflectionConsensusPct}`),
    s('self_healing_downgrade', true, partial.conservativeRecoveryActive, 'heal'),
    s('reflection_timeline_compression', partial.driftTimeline.length <= 12, false, 'compress'),
    s('meta_audit_dashboard', true, false, 'panel'),
    s('reflection_safe_mode', !partial.reflectionSafeMode, partial.reflectionSafeMode, 'safe'),
    s('meta_emergency_shutdown', !partial.metaEmergencyShutdown, partial.metaEmergencyShutdown, 'shutdown'),
  ];
}
