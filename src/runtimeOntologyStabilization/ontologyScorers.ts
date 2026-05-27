import type {
  RuntimeOntologyObserveInput,
  RuntimeOntologyProfile,
} from '../types/runtimeOntologyStabilization';

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;

export function resetOntologyScorersForTest(): void {
  /* stateless */
}

export function scoreSymbolicAnchorDensity(input: RuntimeOntologyObserveInput): number {
  return round(input.groundedReferenceCount / Math.max(1, input.symbolicReferenceCount));
}

export function scoreSemanticGroundingStrength(input: RuntimeOntologyObserveInput): number {
  return round(
    input.realityAnchorConfidence * 0.35 +
      scoreSymbolicAnchorDensity(input) * 0.25 +
      input.epistemicStabilityScore * 0.25 +
      input.federationIntegrityScore * 0.15,
  );
}

export function scoreSemanticOntologyDrift(input: RuntimeOntologyObserveInput): number {
  return round(
    input.semanticDivergence * 0.3 +
      input.governanceDrift * 0.2 +
      input.observerContextDecay * 0.2 +
      input.duplicateSignalRatio * 0.15 +
      input.semanticMetricRedundancy * 0.15,
  );
}

export function scoreNarrativeRealityDistance(input: RuntimeOntologyObserveInput): number {
  return round((1 - input.narrativeContinuity) * 0.45 + (1 - input.realityAnchorConfidence) * 0.35 + input.semanticDivergence * 0.2);
}

export function scoreObserverGeneratedRealityRisk(input: RuntimeOntologyObserveInput): number {
  return round(input.observerContextDecay * 0.3 + input.semanticSelfReferenceScore * 0.3 + input.recursiveMeaningAmplification * 0.25 + input.governanceDrift * 0.15);
}

export function scoreOntologyFragmentationIndex(input: RuntimeOntologyObserveInput): number {
  return round(input.topologyComplexity * 0.25 + input.topologyCollapseRisk * 0.25 + input.semanticDivergence * 0.25 + input.semanticMetricRedundancy * 0.25);
}

export function scoreSymbolicReferenceInstability(input: RuntimeOntologyObserveInput): number {
  return round((1 - scoreSymbolicAnchorDensity(input)) * 0.45 + input.duplicateSignalRatio * 0.25 + scoreSemanticOntologyDrift(input) * 0.3);
}

export function scoreReferenceChainIntegrity(input: RuntimeOntologyObserveInput): number {
  return round(scoreSymbolicAnchorDensity(input) * 0.35 + input.realityAnchorConfidence * 0.35 + (1 - Math.min(1, input.observerReferenceDepth / 16)) * 0.3);
}

export function scoreReplayMeaningPersistence(input: RuntimeOntologyObserveInput): number {
  return round(input.narrativeContinuity * 0.35 + input.compressionRatio * 0.25 + (1 - Math.min(1, input.replayCount / 140)) * 0.25 + scoreReferenceChainIntegrity(input) * 0.15);
}

export function scoreSemanticPersistenceHalfLife(input: RuntimeOntologyObserveInput): number {
  return round(scoreReplayMeaningPersistence(input) * 0.45 + scoreSemanticGroundingStrength(input) * 0.35 + input.finiteObservationScore * 0.2);
}

export function scoreOntologySelfGenerationRisk(input: RuntimeOntologyObserveInput): number {
  return round(input.semanticSelfReferenceScore * 0.35 + input.observerContextDecay * 0.25 + input.recursiveMeaningAmplification * 0.25 + input.topologyComplexity * 0.15);
}

export function scoreObserverRealityFeedbackLoop(input: RuntimeOntologyObserveInput): number {
  return round(input.observerContextDecay * 0.3 + input.governanceDrift * 0.25 + input.recursiveMeaningAmplification * 0.25 + Math.min(1, input.observerReferenceDepth / 16) * 0.2);
}

export function scoreSemanticUniverseIsolationRisk(input: RuntimeOntologyObserveInput): number {
  return round((1 - input.realityAnchorConfidence) * 0.3 + input.semanticSelfReferenceScore * 0.3 + input.topologyCollapseRisk * 0.25 + (1 - input.federationIntegrityScore) * 0.15);
}

export function scoreSymbolicClosedLoopRisk(input: RuntimeOntologyObserveInput): number {
  return round(input.semanticSelfReferenceScore * 0.35 + input.duplicateSignalRatio * 0.2 + input.recursiveMeaningAmplification * 0.3 + input.semanticMetricRedundancy * 0.15);
}

export function scoreRecursiveOntologyDepth(input: RuntimeOntologyObserveInput): number {
  return round(Math.min(1, input.observerReferenceDepth / 18) * 0.3 + input.semanticSelfReferenceScore * 0.3 + input.recursiveMeaningAmplification * 0.25 + input.topologyComplexity * 0.15);
}

export function scoreRecursiveMeaningCollapseRisk(input: RuntimeOntologyObserveInput): number {
  return round(scoreSemanticUniverseIsolationRisk(input) * 0.25 + scoreSymbolicClosedLoopRisk(input) * 0.25 + scoreOntologyFragmentationIndex(input) * 0.25 + (1 - scoreSemanticGroundingStrength(input)) * 0.25);
}

export function scoreSemanticAnchorIntegrity(input: RuntimeOntologyObserveInput): number {
  return round(scoreSemanticGroundingStrength(input) * 0.35 + scoreReferenceChainIntegrity(input) * 0.3 + (1 - scoreNarrativeRealityDistance(input)) * 0.2 + input.finiteObservationScore * 0.15);
}

export function scoreOntologyCompressionStress(input: RuntimeOntologyObserveInput): number {
  return round((1 - input.compressionRatio) * 0.35 + input.semanticMetricRedundancy * 0.25 + scoreOntologyFragmentationIndex(input) * 0.25 + input.cognitionLoad * 0.15);
}

export function scoreRuntimeRealityAnchor(input: RuntimeOntologyObserveInput): number {
  return round(scoreSemanticAnchorIntegrity(input) * 0.4 + input.realityAnchorConfidence * 0.3 + input.epistemicStabilityScore * 0.2 + input.federationIntegrityScore * 0.1);
}

export function buildRuntimeOntologyProfile(input: RuntimeOntologyObserveInput): RuntimeOntologyProfile {
  return {
    runtimeRealityAnchorScore: scoreRuntimeRealityAnchor(input),
    semanticOntologyDrift: scoreSemanticOntologyDrift(input),
    observerGeneratedRealityRisk: scoreObserverGeneratedRealityRisk(input),
    recursiveMeaningCollapseRisk: scoreRecursiveMeaningCollapseRisk(input),
    ontologyFragmentationIndex: scoreOntologyFragmentationIndex(input),
    narrativeRealityDistance: scoreNarrativeRealityDistance(input),
    symbolicReferenceInstability: scoreSymbolicReferenceInstability(input),
    semanticAnchorIntegrity: scoreSemanticAnchorIntegrity(input),
    ontologyCompressionStress: scoreOntologyCompressionStress(input),
    recursiveOntologyDepth: scoreRecursiveOntologyDepth(input),
    semanticGroundingStrength: scoreSemanticGroundingStrength(input),
    symbolicAnchorDensity: scoreSymbolicAnchorDensity(input),
    referenceChainIntegrity: scoreReferenceChainIntegrity(input),
    replayMeaningPersistence: scoreReplayMeaningPersistence(input),
    semanticPersistenceHalfLife: scoreSemanticPersistenceHalfLife(input),
    ontologySelfGenerationRisk: scoreOntologySelfGenerationRisk(input),
    observerRealityFeedbackLoop: scoreObserverRealityFeedbackLoop(input),
    semanticUniverseIsolationRisk: scoreSemanticUniverseIsolationRisk(input),
    recursiveMeaningAmplification: input.recursiveMeaningAmplification,
    symbolicClosedLoopRisk: scoreSymbolicClosedLoopRisk(input),
    measuredAt: new Date().toISOString(),
  };
}

