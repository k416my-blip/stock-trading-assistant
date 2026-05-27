import type {
  RuntimeCivilizationTopologyObserveInput,
  RuntimeCivilizationTopologyProfile,
} from '../types/runtimeCivilizationTopology';

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;

export function resetCivilizationTopologyScorersForTest(): void {
  /* stateless */
}

export function scoreCognitionTopologyComplexity(input: RuntimeCivilizationTopologyObserveInput): number {
  return round(
    Math.min(1, input.observerChainDepthEstimate / 14) * 0.25 +
      Math.min(1, input.governanceLayerCount / 12) * 0.2 +
      Math.min(1, input.semanticSignalCount / 90) * 0.2 +
      Math.min(1, input.narrativeNodeCount / 110) * 0.2 +
      input.topologyFragmentationScore * 0.15,
  );
}

export function scoreObserverChainDepth(input: RuntimeCivilizationTopologyObserveInput): number {
  return round(Math.min(1, input.observerChainDepthEstimate / 16));
}

export function scoreNarrativeRealityCoupling(input: RuntimeCivilizationTopologyObserveInput): number {
  return round(input.narrativeContinuity * 0.45 + input.realityAnchorConfidence * 0.4 + (1 - input.semanticDivergence) * 0.15);
}

export function scoreGovernanceBeliefDrift(input: RuntimeCivilizationTopologyObserveInput): number {
  return round(input.governanceDrift * 0.5 + (1 - input.governanceConfidence) * 0.3 + input.telemetryAmplificationScore * 0.2);
}

export function scoreSemanticWorldModelVariance(input: RuntimeCivilizationTopologyObserveInput): number {
  return round(
    input.semanticDivergence * 0.35 +
      input.duplicateSignalRatio * 0.25 +
      input.narrativeDuplicationRatio * 0.25 +
      (1 - Math.min(1, input.uniqueSignalKinds / Math.max(1, input.semanticSignalCount))) * 0.15,
  );
}

export function scoreRecursiveMeaningTopology(input: RuntimeCivilizationTopologyObserveInput): number {
  return round(
    input.recursiveMeaningAmplification * 0.35 +
      Math.min(1, input.replayCount / 120) * 0.25 +
      input.telemetryAmplificationScore * 0.2 +
      input.narrativeDuplicationRatio * 0.2,
  );
}

export function scoreObserverPerspectiveFragmentation(input: RuntimeCivilizationTopologyObserveInput): number {
  return round(
    input.observerContextDecay * 0.45 +
      input.topologyFragmentationScore * 0.25 +
      input.duplicateSignalRatio * 0.2 +
      scoreObserverChainDepth(input) * 0.1,
  );
}

export function scoreCivilizationContextInstability(input: RuntimeCivilizationTopologyObserveInput): number {
  return round(
    scoreSemanticWorldModelVariance(input) * 0.3 +
      scoreGovernanceBeliefDrift(input) * 0.25 +
      scoreObserverPerspectiveFragmentation(input) * 0.25 +
      (1 - scoreNarrativeRealityCoupling(input)) * 0.2,
  );
}

export function scoreTopologyCollapseRisk(input: RuntimeCivilizationTopologyObserveInput): number {
  return round(
    scoreCognitionTopologyComplexity(input) * 0.22 +
      scoreRecursiveMeaningTopology(input) * 0.22 +
      scoreCivilizationContextInstability(input) * 0.28 +
      (1 - scoreEpistemicStability(input)) * 0.28,
  );
}

export function scoreEpistemicStability(input: RuntimeCivilizationTopologyObserveInput): number {
  return round(
    1 -
      (scoreGovernanceBeliefDrift(input) * 0.25 +
        scoreSemanticWorldModelVariance(input) * 0.25 +
        scoreObserverPerspectiveFragmentation(input) * 0.2 +
        (1 - scoreNarrativeRealityCoupling(input)) * 0.3),
  );
}

export function buildCivilizationTopologyProfile(
  input: RuntimeCivilizationTopologyObserveInput,
): RuntimeCivilizationTopologyProfile {
  return {
    cognitionTopologyComplexity: scoreCognitionTopologyComplexity(input),
    observerChainDepth: scoreObserverChainDepth(input),
    epistemicStabilityScore: scoreEpistemicStability(input),
    narrativeRealityCoupling: scoreNarrativeRealityCoupling(input),
    governanceBeliefDrift: scoreGovernanceBeliefDrift(input),
    semanticWorldModelVariance: scoreSemanticWorldModelVariance(input),
    recursiveMeaningTopology: scoreRecursiveMeaningTopology(input),
    observerPerspectiveFragmentation: scoreObserverPerspectiveFragmentation(input),
    civilizationContextInstability: scoreCivilizationContextInstability(input),
    topologyCollapseRisk: scoreTopologyCollapseRisk(input),
    measuredAt: new Date().toISOString(),
  };
}
