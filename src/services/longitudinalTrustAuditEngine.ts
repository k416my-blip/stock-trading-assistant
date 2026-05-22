import {
  BUDGET_DIVERGENCE,
  BUDGET_TRUST_CRITICAL,
  BUDGET_TRUST_DECAYING,
  BUDGET_TRUST_STABLE,
  BUDGET_TRUST_UNSTABLE,
  CONFIDENCE_CLAMP_CRITICAL,
  CONFIDENCE_CLAMP_DECAYING,
  CONFIDENCE_CLAMP_UNSTABLE,
  HALLUCINATION_UNSUPPORTED_THRESHOLD,
  META_RELIABILITY_CRITICAL_THRESHOLD,
  META_RELIABILITY_DECAYING_THRESHOLD,
  META_RELIABILITY_UNSTABLE_THRESHOLD,
  SEMANTIC_DRIFT_DIVERGENCE_THRESHOLD,
  TRUST_STATE_LABELS_JA,
} from '../constants/metaReliabilityLongitudinalTrust';
import type { BuildMetaReliabilityInput } from '../types/metaReliabilityLongitudinalTrust';
import type { LongitudinalTrustState } from '../types/metaReliabilityLongitudinalTrust';
import type { MetaReliabilityPersisted } from './metaReliabilityLongitudinalTrustStorage';

export type LongitudinalMetrics = {
  trustDecayPct: number;
  semanticDriftPct: number;
  confidenceInflationPct: number;
  recursiveInstabilityPct: number;
  hallucinationRiskPct: number;
  governanceDeviationPct: number;
  orchestrationVolatilityPct: number;
  metaReliabilityPct: number;
  longitudinalConsistencyPct: number;
  explanationIntegrityPct: number;
  staleReasoningRiskPct: number;
  confidenceMeanPct: number;
  actualReliabilityTrendPct: number;
};

export type TrustResolution = {
  trustState: LongitudinalTrustState;
  confidenceClampPct: number;
  orchestrationBudgetMax: number;
  explanationOnlyMode: boolean;
  watchHoldOnly: boolean;
  freezeAdaptiveLearning: boolean;
  governancePriorityOnly: boolean;
  downgradeReasonJa: string;
  orchestrationInteractionJa: string;
  mobileRuntimeStateJa: string;
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function computeLongitudinalMetrics(
  input: BuildMetaReliabilityInput,
  persisted: MetaReliabilityPersisted,
): LongitudinalMetrics {
  const rollbackFrequency = clamp(
    (input.recovery?.rollbackDependencyPct ?? 0) * 0.4 +
      (input.consensus?.contradictionRiskPct ?? 0) * 0.15 +
      (input.mockTrustDecayBoost ?? 0) * 0.2,
  );
  const freezeFrequency = clamp(
    (input.consensus?.uncertaintyPct ?? 0) * 0.2 +
      (input.regime?.freezeAdaptiveLayers ? 35 : 0) +
      (input.systemic?.recursiveFreezeActive ? 25 : 0),
  );
  const contradictionPersistence = clamp(
    (input.consensus?.contradictionRiskPct ?? 0) * 0.55 +
      (input.semantic?.contradictionLanguageJa?.length ?? 0) * 6,
  );
  const staleConsensus = clamp(
    persisted.refreshCount > 20 && (input.consensus?.finalConsensusPct ?? 50) < 45 ? 30 : 10,
  );
  const replayInstability = clamp(
    (input.recovery?.oscillationRiskPct ?? 0) * 0.35 +
      (input.systemic?.oscillationRiskPct ?? 0) * 0.25,
  );

  const trustDecayPct = clamp(
    rollbackFrequency +
      freezeFrequency * 0.25 +
      contradictionPersistence * 0.2 +
      staleConsensus * 0.15 +
      replayInstability * 0.2 +
      (input.mockTrustDecayBoost ?? 0),
  );

  const currentDecision = input.finalDecision;
  const recommendationChangeRate =
    persisted.lastFinalDecision !== currentDecision ? 35 : 5;
  const explanationMismatch = clamp(
    (input.semantic?.unsupportedClaimsJa?.length ?? 0) * 10 +
      (input.consensus?.explanationOnlyMode ? 20 : 0),
  );
  const regimeNarrativeShift =
    persisted.lastRegimeId !== (input.regime?.currentRegime ?? 'neutral') ? 28 : 4;

  const semanticDriftPct = clamp(
    recommendationChangeRate +
      explanationMismatch * 0.35 +
      regimeNarrativeShift +
      (input.mockSemanticDriftBoost ?? 0),
  );

  const confidenceMeanPct = clamp(
    input.consensus?.finalConsensusPct ??
      input.governance?.consensusScore ??
      input.strategy?.todayRecommendations[0]?.confidencePct ??
      55,
  );
  const trend =
    persisted.longitudinalTimeline.length > 0
      ? persisted.longitudinalTimeline.reduce((s, p) => s + p.metaReliabilityPct, 0) /
        persisted.longitudinalTimeline.length
      : persisted.lastMetaReliabilityPct;
  const actualReliabilityTrendPct = clamp(trend);
  const confidenceInflationPct = clamp(
    (input.mockConfidenceInflation ?? confidenceMeanPct - actualReliabilityTrendPct + 15),
  );

  const recursiveInstabilityPct = clamp(
    (input.systemic?.oscillationRiskPct ?? 0) * 0.4 +
      (input.reflection?.confidenceDriftPct ?? 0) * 0.35 +
      (input.consensus?.contradictionRiskPct ?? 0) * 0.15,
  );

  const hallucinationRiskPct = clamp(
    (input.semantic?.unsupportedClaimsJa?.length ?? 0) * 12 +
      (input.reflection?.unsupportedTrendPct ?? 0) * 0.4 +
      confidenceInflationPct * 0.25 +
      (input.mockHallucinationRisk ?? 0),
  );

  const governanceDeviationPct = clamp(
    (input.governance?.vetoLayer ? 30 : 0) +
      (input.consensus?.governanceOverrideActive ? 40 : 0) +
      (input.systemic?.governanceSaturationPct ?? 0) * 0.35,
  );

  const orchBudgetPct =
    input.orchestration && input.orchestration.computeBudgetMax > 0
      ? (input.orchestration.computeBudgetUsed / input.orchestration.computeBudgetMax) * 100
      : 0;
  const orchestrationVolatilityPct = clamp(
    (input.orchestration?.skippedLayerCount ?? 0) * 8 + orchBudgetPct * 0.15,
  );

  let metaReliabilityPct = clamp(
    100 -
      trustDecayPct * 0.2 -
      semanticDriftPct * 0.2 -
      confidenceInflationPct * 0.15 -
      recursiveInstabilityPct * 0.15 -
      hallucinationRiskPct * 0.1 -
      governanceDeviationPct * 0.1 -
      orchestrationVolatilityPct * 0.1,
  );
  if (typeof input.mockMetaReliabilityPct === 'number') {
    metaReliabilityPct = clamp(input.mockMetaReliabilityPct);
  }

  const longitudinalConsistencyPct = clamp(
    100 - semanticDriftPct * 0.35 - trustDecayPct * 0.25 - replayInstability * 0.2,
  );
  const explanationIntegrityPct = clamp(
    100 - explanationMismatch * 0.5 - semanticDriftPct * 0.2,
  );
  const staleReasoningRiskPct = clamp(
    staleConsensus + (input.reflection?.fatigueScore ?? 0) * 0.4,
  );

  return {
    trustDecayPct,
    semanticDriftPct,
    confidenceInflationPct,
    recursiveInstabilityPct,
    hallucinationRiskPct,
    governanceDeviationPct,
    orchestrationVolatilityPct,
    metaReliabilityPct,
    longitudinalConsistencyPct,
    explanationIntegrityPct,
    staleReasoningRiskPct,
    confidenceMeanPct,
    actualReliabilityTrendPct,
  };
}

export function classifyTrustState(
  metrics: LongitudinalMetrics,
  governanceBlocks: boolean,
): LongitudinalTrustState {
  if (governanceBlocks) return 'TRUST_CRITICAL';
  if (metrics.hallucinationRiskPct > HALLUCINATION_UNSUPPORTED_THRESHOLD) {
    return 'LONGITUDINAL_UNSUPPORTED';
  }
  if (metrics.semanticDriftPct > SEMANTIC_DRIFT_DIVERGENCE_THRESHOLD) {
    return 'EXPLANATION_DIVERGENCE';
  }
  if (metrics.metaReliabilityPct < META_RELIABILITY_CRITICAL_THRESHOLD) {
    return 'TRUST_CRITICAL';
  }
  if (metrics.metaReliabilityPct < META_RELIABILITY_UNSTABLE_THRESHOLD) {
    return 'TRUST_UNSTABLE';
  }
  if (metrics.metaReliabilityPct < META_RELIABILITY_DECAYING_THRESHOLD) {
    return 'TRUST_DECAYING';
  }
  return 'TRUST_STABLE';
}

export function resolveTrustActions(
  state: LongitudinalTrustState,
  metrics: LongitudinalMetrics,
): TrustResolution {
  const base: TrustResolution = {
    trustState: state,
    confidenceClampPct: 70,
    orchestrationBudgetMax: BUDGET_TRUST_STABLE,
    explanationOnlyMode: false,
    watchHoldOnly: false,
    freezeAdaptiveLearning: false,
    governancePriorityOnly: false,
    downgradeReasonJa: '—',
    orchestrationInteractionJa: '通常 — 全レイヤー監査継続',
    mobileRuntimeStateJa: 'snapshot compression · trust cache retain',
  };

  switch (state) {
    case 'TRUST_STABLE':
      return {
        ...base,
        downgradeReasonJa: '長期信頼は安定域',
      };
    case 'TRUST_DECAYING':
      return {
        ...base,
        confidenceClampPct: CONFIDENCE_CLAMP_DECAYING,
        orchestrationBudgetMax: BUDGET_TRUST_DECAYING,
        downgradeReasonJa: `metaReliability ${metrics.metaReliabilityPct}% — confidence自動減衰`,
        orchestrationInteractionJa: 'compute budget 抑制 · adaptive layers 監視',
      };
    case 'TRUST_UNSTABLE':
      return {
        ...base,
        confidenceClampPct: CONFIDENCE_CLAMP_UNSTABLE,
        orchestrationBudgetMax: BUDGET_TRUST_UNSTABLE,
        watchHoldOnly: false,
        downgradeReasonJa: `buy→watch · reduce→hold（meta ${metrics.metaReliabilityPct}%）`,
        orchestrationInteractionJa: 'trust unstable — budget 65 · adaptive 抑制',
      };
    case 'TRUST_CRITICAL':
      return {
        ...base,
        confidenceClampPct: CONFIDENCE_CLAMP_CRITICAL,
        orchestrationBudgetMax: BUDGET_TRUST_CRITICAL,
        watchHoldOnly: true,
        governancePriorityOnly: true,
        downgradeReasonJa: 'watch/hold only — governance/stability 優先',
        orchestrationInteractionJa: 'trust critical — governance/stability のみ',
        mobileRuntimeStateJa: 'lightweight audit · background batch',
      };
    case 'EXPLANATION_DIVERGENCE':
      return {
        ...base,
        confidenceClampPct: CONFIDENCE_CLAMP_DECAYING,
        orchestrationBudgetMax: BUDGET_DIVERGENCE,
        explanationOnlyMode: true,
        downgradeReasonJa: `semantic drift ${metrics.semanticDriftPct}% — 説明のみ`,
        orchestrationInteractionJa: 'last trusted snapshot retain · escalation freeze',
      };
    case 'LONGITUDINAL_UNSUPPORTED':
      return {
        ...base,
        confidenceClampPct: CONFIDENCE_CLAMP_CRITICAL,
        orchestrationBudgetMax: BUDGET_TRUST_CRITICAL,
        explanationOnlyMode: true,
        watchHoldOnly: true,
        freezeAdaptiveLearning: true,
        downgradeReasonJa: `hallucination risk ${metrics.hallucinationRiskPct}% — adaptive learning freeze`,
        orchestrationInteractionJa: 'longitudinal unsupported — explanation-only safe mode',
        mobileRuntimeStateJa: 'stale trust persistence · lightweight audit',
      };
    default:
      return base;
  }
}

export function trustStateLabelJa(state: LongitudinalTrustState): string {
  return TRUST_STATE_LABELS_JA[state];
}
