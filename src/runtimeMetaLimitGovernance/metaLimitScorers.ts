import type {
  RuntimeMetaLimitObserveInput,
  RuntimeMetaLimitProfile,
} from '../types/runtimeMetaLimitGovernance';

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;

export function resetMetaLimitScorersForTest(): void {
  /* stateless */
}

export function scoreMetaRecursionDepth(input: RuntimeMetaLimitObserveInput): number {
  return round(
    Math.min(1, input.observerChainDepthEstimate / 18) * 0.3 +
      Math.min(1, input.governanceLayerCount / 14) * 0.25 +
      input.recursiveMeaningAmplification * 0.25 +
      input.semanticSelfReferenceScore * 0.2,
  );
}

export function scoreObserverOfObserverDepth(input: RuntimeMetaLimitObserveInput): number {
  return round(Math.min(1, input.observerChainDepthEstimate / 16) * 0.65 + input.observerContextDecay * 0.35);
}

export function scoreMonitoringChainExpansionRisk(input: RuntimeMetaLimitObserveInput): number {
  return round(
    Math.min(1, input.monitoringLayerCount / 18) * 0.45 +
      Math.min(1, input.dashboardRowCount / 70) * 0.25 +
      input.telemetryAmplificationScore * 0.3,
  );
}

export function scoreSemanticInfiniteLoopRisk(input: RuntimeMetaLimitObserveInput): number {
  return round(
    input.semanticSelfReferenceScore * 0.35 +
      input.narrativeDuplicationRatio * 0.25 +
      input.recursiveMeaningAmplification * 0.25 +
      Math.min(1, input.replayCount / 140) * 0.15,
  );
}

export function scoreGovernanceMetaCascadeRisk(input: RuntimeMetaLimitObserveInput): number {
  return round(
    Math.min(1, input.governanceLayerCount / 14) * 0.35 +
      input.governanceDrift * 0.35 +
      input.telemetryAmplificationScore * 0.3,
  );
}

export function scoreTopologySelfReference(input: RuntimeMetaLimitObserveInput): number {
  return round(
    input.topologyFragmentationScore * 0.28 +
      input.topologyCollapseRisk * 0.28 +
      input.cognitionTopologyComplexity * 0.24 +
      input.semanticSelfReferenceScore * 0.2,
  );
}

export function scoreRecursionBoundaryStability(input: RuntimeMetaLimitObserveInput): number {
  return round(
    1 -
      (scoreMetaRecursionDepth(input) * 0.28 +
        scoreMonitoringChainExpansionRisk(input) * 0.24 +
        scoreSemanticInfiniteLoopRisk(input) * 0.24 +
        scoreTopologySelfReference(input) * 0.24),
  );
}

export function scoreEpistemicBoundaryIntegrity(input: RuntimeMetaLimitObserveInput): number {
  return round(
    input.epistemicStabilityScore * 0.45 +
      scoreRecursionBoundaryStability(input) * 0.35 +
      (1 - scoreGovernanceMetaCascadeRisk(input)) * 0.2,
  );
}

export function scoreObserverTerminationConfidence(input: RuntimeMetaLimitObserveInput): number {
  return round(
    (1 - scoreObserverOfObserverDepth(input)) * 0.35 +
      (1 - scoreMonitoringChainExpansionRisk(input)) * 0.25 +
      scoreRecursionBoundaryStability(input) * 0.4,
  );
}

export function scoreFiniteObservation(input: RuntimeMetaLimitObserveInput): number {
  return round(
    scoreRecursionBoundaryStability(input) * 0.35 +
      scoreEpistemicBoundaryIntegrity(input) * 0.3 +
      scoreObserverTerminationConfidence(input) * 0.35,
  );
}

export function buildRuntimeMetaLimitProfile(input: RuntimeMetaLimitObserveInput): RuntimeMetaLimitProfile {
  return {
    metaRecursionDepth: scoreMetaRecursionDepth(input),
    observerOfObserverDepth: scoreObserverOfObserverDepth(input),
    monitoringChainExpansionRisk: scoreMonitoringChainExpansionRisk(input),
    semanticInfiniteLoopRisk: scoreSemanticInfiniteLoopRisk(input),
    governanceMetaCascadeRisk: scoreGovernanceMetaCascadeRisk(input),
    topologySelfReferenceScore: scoreTopologySelfReference(input),
    recursionBoundaryStability: scoreRecursionBoundaryStability(input),
    epistemicBoundaryIntegrity: scoreEpistemicBoundaryIntegrity(input),
    observerTerminationConfidence: scoreObserverTerminationConfidence(input),
    finiteObservationScore: scoreFiniteObservation(input),
    measuredAt: new Date().toISOString(),
  };
}

