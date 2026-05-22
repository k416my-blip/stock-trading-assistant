import {
  BUDGET_EPISTEMIC_DRIFTING,
  BUDGET_EPISTEMIC_RISK,
  BUDGET_EPISTEMIC_STABLE,
  BUDGET_EPISTEMIC_UNCERTAIN,
  CONFIDENCE_CLAMP_DRIFTING,
  CONFIDENCE_CLAMP_HALLUCINATION,
  CONFIDENCE_CLAMP_SPECULATIVE,
  CONFIDENCE_CLAMP_UNCERTAIN,
  CONFIDENCE_CLAMP_UNSUPPORTED,
  CONTRADICTION_CRITICAL_THRESHOLD,
  EPISTEMIC_HEALTH_DRIFTING_THRESHOLD,
  EPISTEMIC_HEALTH_UNCERTAIN_THRESHOLD,
  EPISTEMIC_STATE_LABELS_JA,
  HALLUCINATION_RISK_THRESHOLD,
  SPECULATIVE_EXPANSION_THRESHOLD,
  UNSUPPORTED_CLAIMS_THRESHOLD,
} from '../constants/epistemicIntegrityTruthCalibration';
import type { BuildEpistemicIntegrityInput } from '../types/epistemicIntegrityTruthCalibration';
import type { EpistemicIntegrityState } from '../types/epistemicIntegrityTruthCalibration';

export type EpistemicMetrics = {
  confidenceInflationPct: number;
  hallucinationDensityPct: number;
  contradictionPct: number;
  staleAssumptionsPct: number;
  temporalDriftPct: number;
  unsupportedClaimsPct: number;
  speculativeExpansionPct: number;
  epistemicHealthPct: number;
  rawConfidencePct: number;
  evidenceDensityPct: number;
  temporalConsistencyPct: number;
  crossLayerAgreementPct: number;
  confidenceCalibrationPct: number;
  hallucinationRiskPct: number;
  narrativeMutationPct: number;
  recursiveBeliefLoopsPct: number;
  evidenceScarcityPct: number;
  truthStabilityPct: number;
  unknownStateRatioPct: number;
};

export type EpistemicResolution = {
  epistemicState: EpistemicIntegrityState;
  confidenceClampPct: number;
  explanationOnlyMode: boolean;
  explanationDowngradeActive: boolean;
  speculationSuppressed: boolean;
  predictionThrottleActive: boolean;
  consensusRevalidationRequested: boolean;
  orchestrationBudgetMax: number;
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function computeEpistemicMetrics(input: BuildEpistemicIntegrityInput): EpistemicMetrics {
  const rawConfidencePct = clamp(
    input.consensus?.finalConsensusPct ??
      input.governance?.consensusScore ??
      input.strategy?.todayRecommendations[0]?.confidencePct ??
      55,
  );

  const layerRows = input.epistemicWeight?.layerReliability ?? [];
  const layerAvg =
    layerRows.length > 0
      ? layerRows.reduce((s, r) => s + r.reliabilityScore, 0) / layerRows.length
      : 60;
  const evidenceDensityPct = clamp(input.epistemicWeight?.reliabilityConsensusPct ?? layerAvg);

  const temporalConsistencyPct = clamp(
    input.temporal?.consistencyScore ?? 100 - (input.temporal?.staleStateCount ?? 0) * 8,
  );

  const crossLayerAgreementPct = clamp(
    100 -
      (input.consensus?.contradictionRiskPct ?? 0) * 0.5 -
      (input.metaReliability?.semanticDriftPct ?? 0) * 0.25,
  );

  const confidenceCalibrationPct = clamp(
    rawConfidencePct *
      (evidenceDensityPct / 100) *
      (temporalConsistencyPct / 100) *
      (crossLayerAgreementPct / 100),
  );

  const confidenceInflationPct = clamp(
    (input.mockConfidenceInflation ?? rawConfidencePct - confidenceCalibrationPct + 10) +
      (input.metaReliability?.confidenceInflationPct ?? 0) * 0.25,
  );

  const unsupportedClaimsPct = clamp(
    (input.semantic?.unsupportedClaimsJa?.length ?? 0) * 12 +
      (input.epistemicWeight?.unsupportedClaimsJa?.length ?? 0) * 6 +
      (input.mockUnsupportedClaimsBoost ?? 0),
  );

  const narrativeMutationPct = clamp(
    (input.semantic?.driftedNarrativeJa ? 35 : 0) +
      (input.semantic?.contradictionLanguageJa?.length ?? 0) * 8,
  );

  const recursiveBeliefLoopsPct = clamp(
    (input.reflection?.contradictionTrendPct ?? 0) * 0.35 +
      (input.memory?.recursiveDepth ?? 0) * 8 +
      (input.selfArchitecture?.recursiveInflationPct ?? 0) * 0.2,
  );

  const speculativeExpansionPct = clamp(
    (input.regime?.uncertaintyPct ?? 0) * 0.25 +
      narrativeMutationPct * 0.35 +
      (input.mockSpeculativeExpansionBoost ?? 0),
  );

  const hallucinationDensityPct = clamp(
    unsupportedClaimsPct * 0.35 +
      narrativeMutationPct * 0.25 +
      (input.mockHallucinationDensityBoost ?? 0),
  );

  const hallucinationRiskPct = clamp(
    unsupportedClaimsPct * 0.3 +
      recursiveBeliefLoopsPct * 0.25 +
      narrativeMutationPct * 0.25 +
      speculativeExpansionPct * 0.2 +
      (input.mockHallucinationDensityBoost ?? 0),
  );

  const contradictionPct = clamp(
    (input.consensus?.contradictionRiskPct ?? 0) * 0.55 +
      (input.semantic?.contradictionLanguageJa?.length ?? 0) * 10 +
      (input.mockContradictionBoost ?? 0),
  );

  const staleAssumptionsPct = clamp(
    (input.semantic?.staleExplanationJa?.length ?? 0) * 10 +
      (input.temporal?.staleStateCount ?? 0) * 12 +
      (input.recovery?.rollbackDependencyPct ?? 0) * 0.2,
  );

  const temporalDriftPct = clamp(
    100 - temporalConsistencyPct + (input.metaReliability?.semanticDriftPct ?? 0) * 0.15,
  );

  const evidenceScarcityPct = clamp(100 - evidenceDensityPct);

  const contradictionPenalty = contradictionPct * 0.4;
  const truthStabilityPct = clamp(
    crossLayerAgreementPct * 0.35 +
      evidenceDensityPct * 0.35 +
      temporalConsistencyPct * 0.3 -
      contradictionPenalty,
  );

  let epistemicHealthPct = clamp(
    100 -
      confidenceInflationPct * 0.2 -
      hallucinationDensityPct * 0.2 -
      contradictionPct * 0.15 -
      staleAssumptionsPct * 0.1 -
      temporalDriftPct * 0.1 -
      unsupportedClaimsPct * 0.15 -
      speculativeExpansionPct * 0.1,
  );
  if (typeof input.mockEpistemicHealthPct === 'number') {
    epistemicHealthPct = clamp(input.mockEpistemicHealthPct);
  }

  const unknownStateRatioPct = clamp(
    evidenceScarcityPct * 0.4 +
      (100 - confidenceCalibrationPct) * 0.35 +
      (epistemicHealthPct < EPISTEMIC_HEALTH_UNCERTAIN_THRESHOLD ? 25 : 8),
  );

  return {
    confidenceInflationPct,
    hallucinationDensityPct,
    contradictionPct,
    staleAssumptionsPct,
    temporalDriftPct,
    unsupportedClaimsPct,
    speculativeExpansionPct,
    epistemicHealthPct,
    rawConfidencePct,
    evidenceDensityPct,
    temporalConsistencyPct,
    crossLayerAgreementPct,
    confidenceCalibrationPct,
    hallucinationRiskPct,
    narrativeMutationPct,
    recursiveBeliefLoopsPct,
    evidenceScarcityPct,
    truthStabilityPct,
    unknownStateRatioPct,
  };
}

export function classifyEpistemicState(
  metrics: EpistemicMetrics,
  governanceBlocks: boolean,
): EpistemicIntegrityState {
  if (governanceBlocks) return 'EPISTEMIC_UNSUPPORTED';
  if (metrics.hallucinationRiskPct > HALLUCINATION_RISK_THRESHOLD) {
    return 'EPISTEMIC_HALLUCINATION_RISK';
  }
  if (metrics.unsupportedClaimsPct > UNSUPPORTED_CLAIMS_THRESHOLD) {
    return 'EPISTEMIC_UNSUPPORTED';
  }
  if (metrics.contradictionPct > CONTRADICTION_CRITICAL_THRESHOLD) {
    return 'EPISTEMIC_CONTRADICTED';
  }
  if (metrics.speculativeExpansionPct > SPECULATIVE_EXPANSION_THRESHOLD) {
    return 'EPISTEMIC_SPECULATIVE';
  }
  if (metrics.epistemicHealthPct < EPISTEMIC_HEALTH_DRIFTING_THRESHOLD) {
    return 'EPISTEMIC_DRIFTING';
  }
  if (metrics.epistemicHealthPct < EPISTEMIC_HEALTH_UNCERTAIN_THRESHOLD) {
    return 'EPISTEMIC_UNCERTAIN';
  }
  return 'EPISTEMIC_STABLE';
}

export function resolveEpistemicActions(
  state: EpistemicIntegrityState,
  metrics: EpistemicMetrics,
): EpistemicResolution {
  const base: EpistemicResolution = {
    epistemicState: state,
    confidenceClampPct: 70,
    explanationOnlyMode: false,
    explanationDowngradeActive: false,
    speculationSuppressed: false,
    predictionThrottleActive: false,
    consensusRevalidationRequested: false,
    orchestrationBudgetMax: BUDGET_EPISTEMIC_STABLE,
  };

  switch (state) {
    case 'EPISTEMIC_UNCERTAIN':
      return {
        ...base,
        confidenceClampPct: CONFIDENCE_CLAMP_UNCERTAIN,
        orchestrationBudgetMax: BUDGET_EPISTEMIC_UNCERTAIN,
      };
    case 'EPISTEMIC_DRIFTING':
      return {
        ...base,
        confidenceClampPct: CONFIDENCE_CLAMP_DRIFTING,
        explanationDowngradeActive: true,
        orchestrationBudgetMax: BUDGET_EPISTEMIC_DRIFTING,
      };
    case 'EPISTEMIC_HALLUCINATION_RISK':
      return {
        ...base,
        confidenceClampPct: CONFIDENCE_CLAMP_HALLUCINATION,
        speculationSuppressed: true,
        predictionThrottleActive: true,
        orchestrationBudgetMax: BUDGET_EPISTEMIC_RISK,
      };
    case 'EPISTEMIC_UNSUPPORTED':
      return {
        ...base,
        confidenceClampPct: CONFIDENCE_CLAMP_UNSUPPORTED,
        explanationOnlyMode: true,
        explanationDowngradeActive: true,
        speculationSuppressed: true,
        predictionThrottleActive: true,
        orchestrationBudgetMax: BUDGET_EPISTEMIC_RISK,
      };
    case 'EPISTEMIC_CONTRADICTED':
      return {
        ...base,
        confidenceClampPct: CONFIDENCE_CLAMP_DRIFTING,
        consensusRevalidationRequested: true,
        explanationDowngradeActive: true,
        orchestrationBudgetMax: BUDGET_EPISTEMIC_DRIFTING,
      };
    case 'EPISTEMIC_SPECULATIVE':
      return {
        ...base,
        confidenceClampPct: CONFIDENCE_CLAMP_SPECULATIVE,
        speculationSuppressed: true,
        predictionThrottleActive: true,
        orchestrationBudgetMax: BUDGET_EPISTEMIC_RISK,
      };
    default:
      return base;
  }
}

export function epistemicStateLabelJa(state: EpistemicIntegrityState): string {
  return EPISTEMIC_STATE_LABELS_JA[state];
}
