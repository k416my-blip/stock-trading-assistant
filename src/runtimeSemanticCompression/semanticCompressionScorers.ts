import type {
  RuntimeSemanticCompressionObserveInput,
  RuntimeSemanticCompressionProfile,
} from '../types/runtimeSemanticCompression';

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;
const roundCount = (value: number): number => Math.max(0, Math.round(value));

export function resetSemanticCompressionScorersForTest(): void {
  /* stateless */
}

export function scoreSemanticAliasClusterCount(input: RuntimeSemanticCompressionObserveInput): number {
  return roundCount(input.semanticClusterCount + input.aliasPairCount / Math.max(1, input.crossLayerMetricCount / 6));
}

export function scoreMetricCanonicalizationPressure(input: RuntimeSemanticCompressionObserveInput): number {
  return round(input.aliasPairCount / Math.max(1, input.metricCount) * 0.35 + input.duplicateMetricRatio * 0.3 + input.semanticRedundancyRatio * 0.25 + input.namingDriftScore * 0.1);
}

export function scoreCrossLayerSemanticOverlap(input: RuntimeSemanticCompressionObserveInput): number {
  return round(input.crossLayerMetricCount / Math.max(1, input.metricCount) * 0.35 + input.semanticRedundancyRatio * 0.35 + input.duplicateMetricRatio * 0.3);
}

export function scoreDuplicateMeaningDensity(input: RuntimeSemanticCompressionObserveInput): number {
  return round(input.aliasPairCount / Math.max(1, input.semanticClusterCount * 8) * 0.4 + input.duplicateMetricRatio * 0.35 + input.semanticRedundancyRatio * 0.25);
}

export function scoreCanonicalMetricConfidence(input: RuntimeSemanticCompressionObserveInput): number {
  return round(input.canonicalMetricCount / Math.max(1, input.metricCount) * 0.45 + input.metricContainmentRatio * 0.3 + input.boundednessConfidence * 0.25);
}

export function scoreSemanticCompressionPotential(input: RuntimeSemanticCompressionObserveInput): number {
  return round(scoreDuplicateMeaningDensity(input) * 0.35 + scoreCrossLayerSemanticOverlap(input) * 0.25 + (1 - input.compressionRatio) * 0.25 + input.semanticEntropyBudget * 0.15);
}

export function scoreObserverAliasRisk(input: RuntimeSemanticCompressionObserveInput): number {
  return round(input.observerDependencyCount / 80 * 0.25 + input.observerLoopCount / 12 * 0.35 + scoreCrossLayerSemanticOverlap(input) * 0.25 + input.namingDriftScore * 0.15);
}

export function scoreSemanticNamingDrift(input: RuntimeSemanticCompressionObserveInput): number {
  return round(input.namingDriftScore * 0.45 + input.semanticDivergence * 0.25 + scoreDuplicateMeaningDensity(input) * 0.2 + input.ontologyFragmentationIndex * 0.1);
}

export function scoreOntologyCompressionRatio(input: RuntimeSemanticCompressionObserveInput): number {
  return round(input.compressionRatio * 0.35 + input.metricContainmentRatio * 0.25 + scoreCanonicalMetricConfidence(input) * 0.25 + (1 - input.ontologyCompressionStress) * 0.15);
}

export function scoreMetricVocabularyEntropy(input: RuntimeSemanticCompressionObserveInput): number {
  return round(input.metricCount / 260 * 0.25 + input.semanticClusterCount / 60 * 0.2 + input.aliasPairCount / 180 * 0.25 + input.namingDriftScore * 0.3);
}

export function scoreSemanticClusterIntegrity(input: RuntimeSemanticCompressionObserveInput): number {
  return round(scoreCanonicalMetricConfidence(input) * 0.35 + input.metricContainmentRatio * 0.3 + (1 - scoreSemanticNamingDrift(input)) * 0.2 + input.runtimeFiniteBoundaryIndex * 0.15);
}

export function scoreCrossLayerMeaningCollapse(input: RuntimeSemanticCompressionObserveInput): number {
  return round(scoreCrossLayerSemanticOverlap(input) * 0.3 + input.semanticDivergence * 0.25 + input.ontologyFragmentationIndex * 0.25 + input.semanticEntropyBudget * 0.2);
}

export function scoreMetricIdentityInstability(input: RuntimeSemanticCompressionObserveInput): number {
  return round(scoreSemanticNamingDrift(input) * 0.35 + scoreDuplicateMeaningDensity(input) * 0.3 + input.symbolicClosedLoopRisk * 0.2 + input.ontologyFragmentationIndex * 0.15);
}

export function scoreCanonicalOntologyStress(input: RuntimeSemanticCompressionObserveInput): number {
  return round(input.ontologyCompressionStress * 0.3 + scoreMetricCanonicalizationPressure(input) * 0.25 + scoreMetricVocabularyEntropy(input) * 0.25 + input.semanticEntropyBudget * 0.2);
}

export function scoreDashboardSemanticCrowding(input: RuntimeSemanticCompressionObserveInput): number {
  return round(input.dashboardRowCount / 80 * 0.35 + input.panelCount / 18 * 0.2 + scoreDuplicateMeaningDensity(input) * 0.25 + input.semanticRedundancyRatio * 0.2);
}

export function scoreOperatorSemanticFatigue(input: RuntimeSemanticCompressionObserveInput): number {
  return round(input.operatorInteractionLatencyMs / 3200 * 0.3 + scoreDashboardSemanticCrowding(input) * 0.3 + scoreMetricVocabularyEntropy(input) * 0.25 + input.semanticDivergence * 0.15);
}

export function scoreSemanticPanelRedundancy(input: RuntimeSemanticCompressionObserveInput): number {
  return round(input.panelCount / 18 * 0.25 + input.semanticRedundancyRatio * 0.35 + input.duplicateMetricRatio * 0.25 + input.visualizationCount / 30 * 0.15);
}

export function scoreMetricInterpretationCollision(input: RuntimeSemanticCompressionObserveInput): number {
  return round(scoreDuplicateMeaningDensity(input) * 0.3 + scoreSemanticNamingDrift(input) * 0.3 + scoreCrossLayerMeaningCollapse(input) * 0.25 + input.semanticDivergence * 0.15);
}

export function scoreVisualizationAliasRisk(input: RuntimeSemanticCompressionObserveInput): number {
  return round(input.visualizationCount / 30 * 0.25 + scoreSemanticPanelRedundancy(input) * 0.3 + scoreCrossLayerSemanticOverlap(input) * 0.25 + input.duplicateMetricRatio * 0.2);
}

export function scoreObserverDependencyLoopRisk(input: RuntimeSemanticCompressionObserveInput): number {
  return round(input.observerLoopCount / Math.max(1, input.observerDependencyCount) * 0.45 + input.observerDependencyCount / 90 * 0.25 + scoreObserverAliasRisk(input) * 0.3);
}

export function scoreMetricReferenceCycleDepth(input: RuntimeSemanticCompressionObserveInput): number {
  return round(input.metricReferenceCycleCount / 24 * 0.45 + input.observerChainDepth / 20 * 0.25 + input.recursiveMeaningScore * 0.3);
}

export function scoreSemanticMutualReferenceRisk(input: RuntimeSemanticCompressionObserveInput): number {
  return round(scoreMetricReferenceCycleDepth(input) * 0.3 + scoreMetricIdentityInstability(input) * 0.25 + input.symbolicClosedLoopRisk * 0.25 + input.recursiveMeaningScore * 0.2);
}

export function scoreRecursiveMeaningDependency(input: RuntimeSemanticCompressionObserveInput): number {
  return round(input.recursiveMeaningScore * 0.35 + scoreSemanticMutualReferenceRisk(input) * 0.3 + input.observerChainDepth / 20 * 0.2 + input.ontologyFragmentationIndex * 0.15);
}

export function scoreCanonicalizationDeadlockRisk(input: RuntimeSemanticCompressionObserveInput): number {
  return round(scoreObserverDependencyLoopRisk(input) * 0.3 + scoreSemanticMutualReferenceRisk(input) * 0.25 + scoreMetricCanonicalizationPressure(input) * 0.25 + (1 - input.runtimeFiniteBoundaryIndex) * 0.2);
}

export function buildRuntimeSemanticCompressionProfile(
  input: RuntimeSemanticCompressionObserveInput,
): RuntimeSemanticCompressionProfile {
  return {
    semanticAliasClusterCount: scoreSemanticAliasClusterCount(input),
    metricCanonicalizationPressure: scoreMetricCanonicalizationPressure(input),
    crossLayerSemanticOverlap: scoreCrossLayerSemanticOverlap(input),
    duplicateMeaningDensity: scoreDuplicateMeaningDensity(input),
    canonicalMetricConfidence: scoreCanonicalMetricConfidence(input),
    semanticCompressionPotential: scoreSemanticCompressionPotential(input),
    observerAliasRisk: scoreObserverAliasRisk(input),
    semanticNamingDrift: scoreSemanticNamingDrift(input),
    ontologyCompressionRatio: scoreOntologyCompressionRatio(input),
    metricVocabularyEntropy: scoreMetricVocabularyEntropy(input),
    semanticClusterIntegrity: scoreSemanticClusterIntegrity(input),
    crossLayerMeaningCollapse: scoreCrossLayerMeaningCollapse(input),
    metricIdentityInstability: scoreMetricIdentityInstability(input),
    canonicalOntologyStress: scoreCanonicalOntologyStress(input),
    dashboardSemanticCrowding: scoreDashboardSemanticCrowding(input),
    operatorSemanticFatigue: scoreOperatorSemanticFatigue(input),
    semanticPanelRedundancy: scoreSemanticPanelRedundancy(input),
    metricInterpretationCollision: scoreMetricInterpretationCollision(input),
    visualizationAliasRisk: scoreVisualizationAliasRisk(input),
    observerDependencyLoopRisk: scoreObserverDependencyLoopRisk(input),
    metricReferenceCycleDepth: scoreMetricReferenceCycleDepth(input),
    semanticMutualReferenceRisk: scoreSemanticMutualReferenceRisk(input),
    recursiveMeaningDependency: scoreRecursiveMeaningDependency(input),
    canonicalizationDeadlockRisk: scoreCanonicalizationDeadlockRisk(input),
    measuredAt: new Date().toISOString(),
  };
}
