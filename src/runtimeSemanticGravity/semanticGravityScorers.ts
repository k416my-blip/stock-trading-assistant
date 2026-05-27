import type {
  RuntimeSemanticGravityObserveInput,
  RuntimeSemanticGravityProfile,
} from '../types/runtimeSemanticGravity';

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;

export function resetSemanticGravityScorersForTest(): void {
  /* stateless */
}

export function scoreMetricMeaningMass(input: RuntimeSemanticGravityObserveInput): number {
  return round(input.metricCount / 280 * 0.25 + input.metricVocabularyEntropy * 0.25 + input.duplicateMeaningDensity * 0.25 + input.semanticCompressionPotential * 0.25);
}

export function scoreCanonicalGravityCenter(input: RuntimeSemanticGravityObserveInput): number {
  return round(input.canonicalMetricConfidence * 0.35 + input.metricCanonicalizationPressure * 0.25 + input.canonicalMetricCount / Math.max(1, input.metricCount) * 0.25 + input.ontologyCompressionRatio * 0.15);
}

export function scoreCanonicalCenterAttraction(input: RuntimeSemanticGravityObserveInput): number {
  return round(scoreCanonicalGravityCenter(input) * 0.35 + input.crossLayerSemanticOverlap * 0.25 + input.semanticClusterIntegrity * 0.2 + input.metricContainmentRatio * 0.2);
}

export function scoreOntologyDensityPressure(input: RuntimeSemanticGravityObserveInput): number {
  return round(input.ontologyFragmentationIndex * 0.25 + input.canonicalOntologyStress * 0.25 + input.recursiveOntologyDepth * 0.25 + input.ontologyCompressionRatio * 0.25);
}

export function scoreSemanticGravityMass(input: RuntimeSemanticGravityObserveInput): number {
  return round(scoreMetricMeaningMass(input) * 0.25 + scoreCanonicalGravityCenter(input) * 0.25 + scoreOntologyDensityPressure(input) * 0.25 + input.crossLayerMeaningCollapse * 0.25);
}

export function scoreOntologyOverCentralizationRisk(input: RuntimeSemanticGravityObserveInput): number {
  return round(scoreCanonicalCenterAttraction(input) * 0.3 + input.canonicalOntologyStress * 0.25 + input.crossLayerMeaningCollapse * 0.25 + (1 - input.semanticClusterIntegrity) * 0.2);
}

export function scoreSemanticAnchorDivergence(input: RuntimeSemanticGravityObserveInput): number {
  return round((1 - input.semanticAnchorIntegrity) * 0.25 + input.narrativeRealityDistance * 0.25 + input.semanticNamingDrift * 0.25 + input.ontologyFragmentationIndex * 0.25);
}

export function scoreObserverAnchorVariance(input: RuntimeSemanticGravityObserveInput): number {
  return round(input.observerAliasRisk * 0.25 + input.observerContextDecay * 0.25 + input.observerDependencyLoopRisk * 0.25 + input.observerChainDepth / 22 * 0.25);
}

export function scoreNarrativeAnchorDrift(input: RuntimeSemanticGravityObserveInput): number {
  return round((1 - input.narrativeContinuity) * 0.35 + input.narrativeRealityDistance * 0.3 + input.semanticNamingDrift * 0.2 + input.recursiveMeaningDependency * 0.15);
}

export function scoreWorldviewAnchorFragmentation(input: RuntimeSemanticGravityObserveInput): number {
  return round(input.ontologyFragmentationIndex * 0.3 + scoreObserverAnchorVariance(input) * 0.25 + input.governanceDrift * 0.2 + input.topologyCollapseRisk * 0.25);
}

export function scoreRecursiveAnchorInstability(input: RuntimeSemanticGravityObserveInput): number {
  return round(input.recursiveOntologyDepth * 0.3 + input.symbolicClosedLoopRisk * 0.25 + input.recursiveMeaningDependency * 0.25 + input.semanticMutualReferenceRisk * 0.2);
}

export function scoreSemanticOrbitInstability(input: RuntimeSemanticGravityObserveInput): number {
  return round(scoreSemanticAnchorDivergence(input) * 0.3 + scoreCanonicalCenterAttraction(input) * 0.25 + scoreWorldviewAnchorFragmentation(input) * 0.25 + input.semanticEntropyBudget * 0.2);
}

export function scoreAnchorCouplingStress(input: RuntimeSemanticGravityObserveInput): number {
  return round(scoreSemanticAnchorDivergence(input) * 0.3 + input.crossLayerSemanticOverlap * 0.25 + input.metricIdentityInstability * 0.25 + input.canonicalizationDeadlockRisk * 0.2);
}

export function scoreAnchorIsolationRisk(input: RuntimeSemanticGravityObserveInput): number {
  return round((1 - input.runtimeRealityAnchorScore) * 0.3 + scoreWorldviewAnchorFragmentation(input) * 0.25 + input.observerDependencyLoopRisk * 0.2 + input.semanticMutualReferenceRisk * 0.25);
}

export function scoreSemanticCollapsePotential(input: RuntimeSemanticGravityObserveInput): number {
  return round(scoreSemanticGravityMass(input) * 0.25 + scoreOntologyOverCentralizationRisk(input) * 0.25 + scoreSemanticAnchorDivergence(input) * 0.25 + input.crossLayerMeaningCollapse * 0.25);
}

export function scoreSemanticSingularityRisk(input: RuntimeSemanticGravityObserveInput): number {
  return round(scoreCanonicalCenterAttraction(input) * 0.3 + scoreOntologyOverCentralizationRisk(input) * 0.3 + input.canonicalizationDeadlockRisk * 0.2 + input.symbolicClosedLoopRisk * 0.2);
}

export function scoreCanonicalTruthPressure(input: RuntimeSemanticGravityObserveInput): number {
  return round(scoreCanonicalGravityCenter(input) * 0.35 + input.metricCanonicalizationPressure * 0.25 + input.canonicalOntologyStress * 0.25 + input.metricContainmentRatio * 0.15);
}

export function scoreSemanticHierarchyRigidity(input: RuntimeSemanticGravityObserveInput): number {
  return round(scoreCanonicalTruthPressure(input) * 0.3 + scoreOntologyDensityPressure(input) * 0.25 + input.semanticClusterIntegrity * 0.2 + input.boundednessConfidence * 0.25);
}

export function scoreOntologyAuthorityConcentration(input: RuntimeSemanticGravityObserveInput): number {
  return round(input.ontologyCompressionRatio * 0.25 + scoreCanonicalGravityCenter(input) * 0.25 + input.canonicalOntologyStress * 0.25 + scoreOntologyOverCentralizationRisk(input) * 0.25);
}

export function scoreMetricBeliefConvergence(input: RuntimeSemanticGravityObserveInput): number {
  return round(input.canonicalMetricConfidence * 0.3 + input.metricContainmentRatio * 0.25 + scoreCanonicalCenterAttraction(input) * 0.25 + (1 - input.metricIdentityInstability) * 0.2);
}

export function scoreObserverConsensusGravity(input: RuntimeSemanticGravityObserveInput): number {
  return round(scoreMetricBeliefConvergence(input) * 0.3 + scoreCanonicalTruthPressure(input) * 0.25 + (1 - scoreObserverAnchorVariance(input)) * 0.2 + input.observerAliasRisk * 0.25);
}

export function scoreTopologyCentralizationStress(input: RuntimeSemanticGravityObserveInput): number {
  return round(input.topologyComplexity * 0.25 + input.topologyCollapseRisk * 0.25 + scoreOntologyAuthorityConcentration(input) * 0.25 + scoreCanonicalCenterAttraction(input) * 0.25);
}

export function scoreSemanticMonocultureRisk(input: RuntimeSemanticGravityObserveInput): number {
  return round(scoreCanonicalTruthPressure(input) * 0.25 + scoreOntologyAuthorityConcentration(input) * 0.25 + scoreMetricBeliefConvergence(input) * 0.25 + (1 - scoreWorldviewAnchorFragmentation(input)) * 0.25);
}

export function scoreCanonicalDogmatizationRisk(input: RuntimeSemanticGravityObserveInput): number {
  return round(scoreCanonicalTruthPressure(input) * 0.35 + scoreSemanticHierarchyRigidity(input) * 0.25 + scoreSemanticMonocultureRisk(input) * 0.25 + input.canonicalizationDeadlockRisk * 0.15);
}

export function scoreSemanticFaithLoopRisk(input: RuntimeSemanticGravityObserveInput): number {
  return round(input.symbolicClosedLoopRisk * 0.3 + input.semanticMutualReferenceRisk * 0.25 + scoreCanonicalDogmatizationRisk(input) * 0.25 + input.recursiveMeaningDependency * 0.2);
}

export function scoreRecursiveTruthAmplification(input: RuntimeSemanticGravityObserveInput): number {
  return round(input.recursiveMeaningDependency * 0.3 + scoreCanonicalTruthPressure(input) * 0.25 + input.recursiveOntologyDepth * 0.25 + input.symbolicClosedLoopRisk * 0.2);
}

export function scoreObserverDoctrineFormation(input: RuntimeSemanticGravityObserveInput): number {
  return round(scoreObserverConsensusGravity(input) * 0.3 + scoreSemanticFaithLoopRisk(input) * 0.25 + input.observerDependencyLoopRisk * 0.25 + input.observerAliasRisk * 0.2);
}

export function scoreMetricSacralizationRisk(input: RuntimeSemanticGravityObserveInput): number {
  return round(scoreMetricBeliefConvergence(input) * 0.3 + input.canonicalMetricConfidence * 0.25 + scoreCanonicalCenterAttraction(input) * 0.25 + input.metricIdentityInstability * 0.2);
}

export function scoreSemanticOrthodoxyPressure(input: RuntimeSemanticGravityObserveInput): number {
  return round(scoreCanonicalDogmatizationRisk(input) * 0.3 + scoreObserverDoctrineFormation(input) * 0.25 + scoreMetricSacralizationRisk(input) * 0.25 + scoreSemanticMonocultureRisk(input) * 0.2);
}

export function scoreMetricMeaningDistribution(input: RuntimeSemanticGravityObserveInput): number {
  return round((1 - input.duplicateMeaningDensity) * 0.25 + (1 - scoreCanonicalCenterAttraction(input)) * 0.25 + (1 - input.crossLayerSemanticOverlap) * 0.25 + input.semanticClusterIntegrity * 0.25);
}

export function scoreOntologyPluralityIntegrity(input: RuntimeSemanticGravityObserveInput): number {
  return round((1 - scoreOntologyOverCentralizationRisk(input)) * 0.3 + (1 - scoreSemanticMonocultureRisk(input)) * 0.25 + input.runtimeFiniteBoundaryIndex * 0.25 + input.semanticAnchorIntegrity * 0.2);
}

export function scoreSemanticDiversityRetention(input: RuntimeSemanticGravityObserveInput): number {
  return round(scoreMetricMeaningDistribution(input) * 0.3 + scoreOntologyPluralityIntegrity(input) * 0.3 + (1 - scoreCanonicalTruthPressure(input)) * 0.2 + (1 - input.semanticNamingDrift) * 0.2);
}

export function scoreObserverPerspectiveBalance(input: RuntimeSemanticGravityObserveInput): number {
  return round((1 - scoreObserverAnchorVariance(input)) * 0.35 + (1 - scoreObserverConsensusGravity(input)) * 0.25 + input.boundednessConfidence * 0.2 + (1 - input.observerDependencyLoopRisk) * 0.2);
}

export function scoreNarrativeEntropyBalance(input: RuntimeSemanticGravityObserveInput): number {
  return round(input.narrativeContinuity * 0.3 + (1 - scoreNarrativeAnchorDrift(input)) * 0.25 + (1 - input.semanticEntropyBudget) * 0.25 + input.runtimeFiniteBoundaryIndex * 0.2);
}

export function scoreSemanticTensionStability(input: RuntimeSemanticGravityObserveInput): number {
  return round((1 - scoreSemanticOrbitInstability(input)) * 0.3 + scoreSemanticDiversityRetention(input) * 0.25 + scoreObserverPerspectiveBalance(input) * 0.25 + scoreNarrativeEntropyBalance(input) * 0.2);
}

export function scoreSemanticEquilibriumScore(input: RuntimeSemanticGravityObserveInput): number {
  return round(scoreOntologyPluralityIntegrity(input) * 0.25 + scoreMetricMeaningDistribution(input) * 0.2 + scoreSemanticDiversityRetention(input) * 0.2 + scoreObserverPerspectiveBalance(input) * 0.2 + scoreSemanticTensionStability(input) * 0.15);
}

export function buildRuntimeSemanticGravityProfile(input: RuntimeSemanticGravityObserveInput): RuntimeSemanticGravityProfile {
  return {
    semanticGravityMass: scoreSemanticGravityMass(input),
    canonicalGravityCenter: scoreCanonicalGravityCenter(input),
    ontologyDensityPressure: scoreOntologyDensityPressure(input),
    semanticCollapsePotential: scoreSemanticCollapsePotential(input),
    metricMeaningMass: scoreMetricMeaningMass(input),
    semanticSingularityRisk: scoreSemanticSingularityRisk(input),
    canonicalCenterAttraction: scoreCanonicalCenterAttraction(input),
    ontologyOverCentralizationRisk: scoreOntologyOverCentralizationRisk(input),
    semanticAnchorDivergence: scoreSemanticAnchorDivergence(input),
    observerAnchorVariance: scoreObserverAnchorVariance(input),
    narrativeAnchorDrift: scoreNarrativeAnchorDrift(input),
    worldviewAnchorFragmentation: scoreWorldviewAnchorFragmentation(input),
    recursiveAnchorInstability: scoreRecursiveAnchorInstability(input),
    semanticOrbitInstability: scoreSemanticOrbitInstability(input),
    anchorCouplingStress: scoreAnchorCouplingStress(input),
    anchorIsolationRisk: scoreAnchorIsolationRisk(input),
    canonicalTruthPressure: scoreCanonicalTruthPressure(input),
    semanticHierarchyRigidity: scoreSemanticHierarchyRigidity(input),
    ontologyAuthorityConcentration: scoreOntologyAuthorityConcentration(input),
    semanticMonocultureRisk: scoreSemanticMonocultureRisk(input),
    metricBeliefConvergence: scoreMetricBeliefConvergence(input),
    observerConsensusGravity: scoreObserverConsensusGravity(input),
    topologyCentralizationStress: scoreTopologyCentralizationStress(input),
    canonicalDogmatizationRisk: scoreCanonicalDogmatizationRisk(input),
    semanticFaithLoopRisk: scoreSemanticFaithLoopRisk(input),
    recursiveTruthAmplification: scoreRecursiveTruthAmplification(input),
    observerDoctrineFormation: scoreObserverDoctrineFormation(input),
    metricSacralizationRisk: scoreMetricSacralizationRisk(input),
    semanticOrthodoxyPressure: scoreSemanticOrthodoxyPressure(input),
    semanticEquilibriumScore: scoreSemanticEquilibriumScore(input),
    ontologyPluralityIntegrity: scoreOntologyPluralityIntegrity(input),
    metricMeaningDistribution: scoreMetricMeaningDistribution(input),
    semanticDiversityRetention: scoreSemanticDiversityRetention(input),
    observerPerspectiveBalance: scoreObserverPerspectiveBalance(input),
    narrativeEntropyBalance: scoreNarrativeEntropyBalance(input),
    semanticTensionStability: scoreSemanticTensionStability(input),
    measuredAt: new Date().toISOString(),
  };
}
