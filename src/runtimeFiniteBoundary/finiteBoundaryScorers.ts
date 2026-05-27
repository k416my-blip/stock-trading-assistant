import type {
  RuntimeFiniteBoundaryObserveInput,
  RuntimeFiniteBoundaryProfile,
} from '../types/runtimeFiniteBoundary';

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;

export function resetFiniteBoundaryScorersForTest(): void {
  /* stateless */
}

export function scoreObserverBudgetConsumption(input: RuntimeFiniteBoundaryObserveInput): number {
  return round(input.observerChainDepth / 18 * 0.35 + input.monitoringLayerCount / 28 * 0.35 + input.duplicateSignalRatio * 0.3);
}

export function scoreSemanticEntropyBudget(input: RuntimeFiniteBoundaryObserveInput): number {
  return round(input.semanticDivergence * 0.35 + input.semanticMetricRedundancy * 0.3 + input.duplicateSignalRatio * 0.2 + (1 - input.compressionRatio) * 0.15);
}

export function scoreRecursionBudgetUsage(input: RuntimeFiniteBoundaryObserveInput): number {
  return round(input.recursiveOntologyDepth * 0.35 + input.symbolicClosedLoopRisk * 0.25 + input.topologyCollapseRisk * 0.25 + input.observerChainDepth / 18 * 0.15);
}

export function scoreDashboardAttentionBudget(input: RuntimeFiniteBoundaryObserveInput): number {
  return round(input.dashboardRowCount / 72 * 0.45 + input.metricCount / 220 * 0.25 + input.semanticSignalCount / 180 * 0.2 + input.duplicateSignalRatio * 0.1);
}

export function scoreOntologyComplexityBudget(input: RuntimeFiniteBoundaryObserveInput): number {
  return round(input.ontologyFragmentationIndex * 0.35 + input.recursiveOntologyDepth * 0.25 + input.topologyComplexity * 0.25 + (1 - input.semanticAnchorIntegrity) * 0.15);
}

export function scoreReplayAmplificationBudget(input: RuntimeFiniteBoundaryObserveInput): number {
  return round(input.replayAmplificationRisk * 0.35 + input.replayCount / 180 * 0.35 + input.duplicateSignalRatio * 0.2 + input.symbolicClosedLoopRisk * 0.1);
}

export function scoreGovernanceExpansionBudget(input: RuntimeFiniteBoundaryObserveInput): number {
  return round(input.governanceLayerCount / 16 * 0.4 + input.governanceDrift * 0.35 + input.monitoringLayerCount / 28 * 0.25);
}

export function scoreSymbolicDensityBudget(input: RuntimeFiniteBoundaryObserveInput): number {
  const ungrounded = Math.max(0, input.symbolicReferenceCount - input.groundedReferenceCount) / Math.max(1, input.symbolicReferenceCount);
  return round(input.symbolicReferenceCount / 220 * 0.35 + ungrounded * 0.35 + input.symbolicClosedLoopRisk * 0.3);
}

export function scoreTelemetryNoiseBudget(input: RuntimeFiniteBoundaryObserveInput): number {
  return round(input.telemetrySampleCount / 220 * 0.35 + input.duplicateSignalRatio * 0.35 + input.semanticMetricRedundancy * 0.2 + input.metricCount / 240 * 0.1);
}

export function scoreCivilizationStackMassIndex(input: RuntimeFiniteBoundaryObserveInput): number {
  return round(
    scoreObserverBudgetConsumption(input) * 0.2 +
      scoreDashboardAttentionBudget(input) * 0.15 +
      scoreOntologyComplexityBudget(input) * 0.2 +
      scoreReplayAmplificationBudget(input) * 0.15 +
      scoreGovernanceExpansionBudget(input) * 0.15 +
      scoreTelemetryNoiseBudget(input) * 0.15,
  );
}

export function scoreSemanticEntropyContainment(input: RuntimeFiniteBoundaryObserveInput): number {
  return round((1 - scoreSemanticEntropyBudget(input)) * 0.45 + input.semanticAnchorIntegrity * 0.3 + input.compressionRatio * 0.25);
}

export function scoreMetricContainmentRatio(input: RuntimeFiniteBoundaryObserveInput): number {
  return round(input.compressionRatio * 0.35 + (1 - input.duplicateSignalRatio) * 0.35 + (1 - scoreTelemetryNoiseBudget(input)) * 0.3);
}

export function scoreObserverCascadeContainment(input: RuntimeFiniteBoundaryObserveInput): number {
  return round((1 - scoreObserverBudgetConsumption(input)) * 0.4 + input.finiteObservationScore * 0.3 + (1 - input.topologyCollapseRisk) * 0.3);
}

export function scoreReplayContainmentIntegrity(input: RuntimeFiniteBoundaryObserveInput): number {
  return round((1 - scoreReplayAmplificationBudget(input)) * 0.45 + input.compressionRatio * 0.25 + input.runtimeRealityAnchorScore * 0.3);
}

export function scoreTopologyContainmentStress(input: RuntimeFiniteBoundaryObserveInput): number {
  return round(input.topologyComplexity * 0.25 + input.topologyCollapseRisk * 0.3 + input.recursiveOntologyDepth * 0.25 + scoreObserverBudgetConsumption(input) * 0.2);
}

export function scoreRecursionTerminationProbability(input: RuntimeFiniteBoundaryObserveInput): number {
  return round((1 - scoreRecursionBudgetUsage(input)) * 0.4 + input.finiteObservationScore * 0.3 + input.semanticAnchorIntegrity * 0.2 + input.runtimeRealityAnchorScore * 0.1);
}

export function scoreObserverClosureIntegrity(input: RuntimeFiniteBoundaryObserveInput): number {
  return round(scoreObserverCascadeContainment(input) * 0.35 + scoreRecursionTerminationProbability(input) * 0.3 + (1 - input.symbolicClosedLoopRisk) * 0.2 + input.finiteObservationScore * 0.15);
}

export function scoreSemanticCollapseThreshold(input: RuntimeFiniteBoundaryObserveInput): number {
  return round(1 - (scoreSemanticEntropyBudget(input) * 0.35 + scoreOntologyComplexityBudget(input) * 0.25 + input.semanticDivergence * 0.25 + input.symbolicClosedLoopRisk * 0.15));
}

export function scoreDashboardCognitiveCeiling(input: RuntimeFiniteBoundaryObserveInput): number {
  return round(1 - scoreDashboardAttentionBudget(input));
}

export function scoreBoundednessConfidence(input: RuntimeFiniteBoundaryObserveInput): number {
  return round(
    scoreRecursionTerminationProbability(input) * 0.3 +
      scoreObserverClosureIntegrity(input) * 0.25 +
      scoreSemanticEntropyContainment(input) * 0.2 +
      scoreMetricContainmentRatio(input) * 0.15 +
      input.finiteObservationScore * 0.1,
  );
}

export function scoreRuntimeFiniteBoundaryIndex(input: RuntimeFiniteBoundaryObserveInput): number {
  return round(
    scoreBoundednessConfidence(input) * 0.35 +
      scoreSemanticCollapseThreshold(input) * 0.2 +
      scoreDashboardCognitiveCeiling(input) * 0.15 +
      scoreReplayContainmentIntegrity(input) * 0.15 +
      (1 - scoreTopologyContainmentStress(input)) * 0.15,
  );
}

export function buildRuntimeFiniteBoundaryProfile(input: RuntimeFiniteBoundaryObserveInput): RuntimeFiniteBoundaryProfile {
  return {
    observerBudgetConsumption: scoreObserverBudgetConsumption(input),
    semanticEntropyBudget: scoreSemanticEntropyBudget(input),
    recursionBudgetUsage: scoreRecursionBudgetUsage(input),
    dashboardAttentionBudget: scoreDashboardAttentionBudget(input),
    ontologyComplexityBudget: scoreOntologyComplexityBudget(input),
    replayAmplificationBudget: scoreReplayAmplificationBudget(input),
    governanceExpansionBudget: scoreGovernanceExpansionBudget(input),
    symbolicDensityBudget: scoreSymbolicDensityBudget(input),
    telemetryNoiseBudget: scoreTelemetryNoiseBudget(input),
    civilizationStackMassIndex: scoreCivilizationStackMassIndex(input),
    finiteObservationScore: input.finiteObservationScore,
    boundednessConfidence: scoreBoundednessConfidence(input),
    recursionTerminationProbability: scoreRecursionTerminationProbability(input),
    observerClosureIntegrity: scoreObserverClosureIntegrity(input),
    semanticCollapseThreshold: scoreSemanticCollapseThreshold(input),
    dashboardCognitiveCeiling: scoreDashboardCognitiveCeiling(input),
    runtimeFiniteBoundaryIndex: scoreRuntimeFiniteBoundaryIndex(input),
    semanticEntropyContainment: scoreSemanticEntropyContainment(input),
    metricContainmentRatio: scoreMetricContainmentRatio(input),
    observerCascadeContainment: scoreObserverCascadeContainment(input),
    replayContainmentIntegrity: scoreReplayContainmentIntegrity(input),
    topologyContainmentStress: scoreTopologyContainmentStress(input),
    measuredAt: new Date().toISOString(),
  };
}
