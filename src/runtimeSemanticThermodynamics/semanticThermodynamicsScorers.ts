import type {
  RuntimeSemanticThermodynamicsObserveInput,
  RuntimeSemanticThermodynamicsProfile,
} from '../types/runtimeSemanticThermodynamics';

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;

export function resetSemanticThermodynamicsScorersForTest(): void {
  /* stateless */
}

export function scoreSemanticEntropyLevel(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(input.semanticEntropyBudget * 0.35 + input.metricVocabularyEntropy * 0.25 + input.duplicateMeaningDensity * 0.2 + input.crossLayerMeaningCollapse * 0.2);
}

export function scoreSemanticHeatDensity(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(input.semanticGravityMass * 0.3 + input.semanticCollapsePotential * 0.25 + input.semanticSingularityRisk * 0.25 + scoreSemanticEntropyLevel(input) * 0.2);
}

export function scoreOntologyThermalPressure(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(input.ontologyDensityPressure * 0.3 + input.ontologyOverCentralizationRisk * 0.25 + input.ontologyFragmentationIndex * 0.25 + input.recursiveOntologyDepth * 0.2);
}

export function scoreRecursiveMeaningTemperature(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(input.recursiveMeaningDependency * 0.3 + input.recursiveTruthAmplification * 0.25 + input.recursiveOntologyDepth * 0.25 + input.metricReferenceCycleDepth * 0.2);
}

export function scoreSemanticEnergyPropagation(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(input.semanticOrbitInstability * 0.25 + input.anchorCouplingStress * 0.25 + input.observerDependencyLoopRisk * 0.25 + input.replayAmplificationRisk * 0.25);
}

export function scoreEntropyAmplificationRisk(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(scoreSemanticEntropyLevel(input) * 0.3 + input.replayAmplificationRisk * 0.25 + input.semanticOrthodoxyPressure * 0.2 + input.topologyCollapseRisk * 0.25);
}

export function scoreSemanticHeatAccumulation(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(scoreSemanticHeatDensity(input) * 0.35 + scoreOntologyThermalPressure(input) * 0.25 + input.dashboardSemanticCrowding * 0.2 + input.observerContextDecay * 0.2);
}

export function scoreRuntimeMeaningHeatIndex(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(scoreSemanticHeatAccumulation(input) * 0.35 + scoreEntropyAmplificationRisk(input) * 0.25 + scoreSemanticEnergyPropagation(input) * 0.2 + scoreRecursiveMeaningTemperature(input) * 0.2);
}

export function scoreSemanticDissipationEfficiency(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(input.semanticEquilibriumScore * 0.3 + input.semanticTensionStability * 0.25 + input.compressionRatio * 0.25 + input.runtimeFiniteBoundaryIndex * 0.2);
}

export function scoreOntologyCoolingPotential(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(input.ontologyPluralityIntegrity * 0.3 + input.semanticDiversityRetention * 0.25 + input.boundednessConfidence * 0.25 + (1 - scoreOntologyThermalPressure(input)) * 0.2);
}

export function scoreObserverEntropyDrain(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(input.observerPerspectiveBalance * 0.35 + (1 - input.operatorSemanticFatigue) * 0.25 + input.boundednessConfidence * 0.2 + (1 - input.observerDependencyLoopRisk) * 0.2);
}

export function scoreSemanticThermalLeakage(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round((1 - scoreSemanticDissipationEfficiency(input)) * 0.35 + input.semanticAnchorDivergence * 0.25 + input.semanticOrbitInstability * 0.25 + input.anchorCouplingStress * 0.15);
}

export function scoreReplayEntropyPropagation(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(input.replayAmplificationRisk * 0.35 + input.replayCount / 180 * 0.25 + scoreSemanticEnergyPropagation(input) * 0.25 + input.recursiveMeaningDependency * 0.15);
}

export function scoreDashboardHeatRetention(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(input.dashboardSemanticCrowding * 0.35 + input.operatorSemanticFatigue * 0.25 + scoreSemanticHeatDensity(input) * 0.2 + input.semanticEntropyBudget * 0.2);
}

export function scoreSemanticPressurePersistence(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(scoreRuntimeMeaningHeatIndex(input) * 0.35 + input.canonicalTruthPressure * 0.2 + input.semanticMonocultureRisk * 0.2 + input.semanticOrthodoxyPressure * 0.25);
}

export function scoreEntropyContainmentStress(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round((1 - input.runtimeFiniteBoundaryIndex) * 0.25 + scoreEntropyAmplificationRisk(input) * 0.3 + scoreSemanticThermalLeakage(input) * 0.25 + input.semanticEntropyBudget * 0.2);
}

export function scoreOntologyTurbulenceIntensity(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(input.ontologyFragmentationIndex * 0.25 + input.semanticAnchorDivergence * 0.25 + scoreOntologyThermalPressure(input) * 0.25 + input.topologyCollapseRisk * 0.25);
}

export function scoreSemanticVortexFormation(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(input.semanticOrbitInstability * 0.35 + input.anchorCouplingStress * 0.25 + input.recursiveMeaningDependency * 0.2 + input.observerDependencyLoopRisk * 0.2);
}

export function scoreRecursiveMeaningTurbulence(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(scoreRecursiveMeaningTemperature(input) * 0.35 + input.recursiveTruthAmplification * 0.25 + input.metricReferenceCycleDepth * 0.2 + input.recursiveOntologyDepth * 0.2);
}

export function scoreWorldviewConvectionRisk(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(input.observerDoctrineFormation * 0.25 + input.semanticMonocultureRisk * 0.25 + input.semanticAnchorDivergence * 0.25 + input.observerContextDecay * 0.25);
}

export function scoreObserverInterpretationInstability(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(input.observerContextDecay * 0.3 + input.operatorSemanticFatigue * 0.25 + input.observerDependencyLoopRisk * 0.25 + (1 - input.observerPerspectiveBalance) * 0.2);
}

export function scoreSemanticPressureWaveRisk(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(scoreSemanticEnergyPropagation(input) * 0.3 + scoreEntropyAmplificationRisk(input) * 0.25 + input.replayAmplificationRisk * 0.25 + input.topologyCollapseRisk * 0.2);
}

export function scoreOntologyFlowFragmentation(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(input.ontologyFragmentationIndex * 0.3 + scoreOntologyTurbulenceIntensity(input) * 0.25 + input.semanticAnchorDivergence * 0.2 + input.topologyCollapseRisk * 0.25);
}

export function scoreObserverThermalFatigue(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(input.operatorSemanticFatigue * 0.3 + input.observerContextDecay * 0.25 + input.observerChainDepth / 24 * 0.25 + scoreDashboardHeatRetention(input) * 0.2);
}

export function scoreCognitiveHeatOverload(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(input.dashboardSemanticCrowding * 0.3 + input.operatorSemanticFatigue * 0.3 + scoreSemanticHeatDensity(input) * 0.2 + input.semanticEntropyBudget * 0.2);
}

export function scoreDashboardThermalSaturation(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(scoreDashboardHeatRetention(input) * 0.4 + input.dashboardSemanticCrowding * 0.3 + scoreRuntimeMeaningHeatIndex(input) * 0.3);
}

export function scoreSemanticAttentionBurnout(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(scoreObserverThermalFatigue(input) * 0.35 + scoreCognitiveHeatOverload(input) * 0.3 + input.operatorSemanticFatigue * 0.2 + (1 - input.observerPerspectiveBalance) * 0.15);
}

export function scoreInterpretationHeatStress(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(scoreObserverInterpretationInstability(input) * 0.35 + input.semanticAnchorDivergence * 0.25 + scoreSemanticEntropyLevel(input) * 0.2 + input.metricVocabularyEntropy * 0.2);
}

export function scoreReplayObservationExhaustion(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(scoreReplayEntropyPropagation(input) * 0.4 + input.replayCount / 180 * 0.25 + scoreObserverThermalFatigue(input) * 0.2 + input.replayAmplificationRisk * 0.15);
}

export function scoreObserverCoolingDeficit(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round((1 - scoreObserverEntropyDrain(input)) * 0.4 + scoreObserverThermalFatigue(input) * 0.3 + scoreSemanticAttentionBurnout(input) * 0.3);
}

export function scoreOntologySignalDecay(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round((1 - input.ontologyPluralityIntegrity) * 0.25 + scoreOntologyTurbulenceIntensity(input) * 0.25 + input.crossLayerMeaningCollapse * 0.25 + scoreEntropyAmplificationRisk(input) * 0.25);
}

export function scoreMeaningResolutionCollapse(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round((1 - input.semanticEquilibriumScore) * 0.25 + input.crossLayerMeaningCollapse * 0.25 + input.metricVocabularyEntropy * 0.25 + input.semanticEntropyBudget * 0.25);
}

export function scoreSemanticNoiseDominance(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(scoreSemanticEntropyLevel(input) * 0.35 + input.duplicateMeaningDensity * 0.25 + input.metricVocabularyEntropy * 0.2 + input.semanticEntropyBudget * 0.2);
}

export function scoreMetricThermalEquilibriumFailure(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round((1 - input.metricContainmentRatio) * 0.3 + scoreSemanticHeatDensity(input) * 0.25 + scoreDashboardHeatRetention(input) * 0.2 + input.metricVocabularyEntropy * 0.25);
}

export function scoreObserverMeaningBlindness(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(scoreSemanticAttentionBurnout(input) * 0.3 + scoreInterpretationHeatStress(input) * 0.25 + scoreMeaningResolutionCollapse(input) * 0.25 + input.observerContextDecay * 0.2);
}

export function scoreSemanticExhaustionPotential(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(scoreObserverCoolingDeficit(input) * 0.25 + scoreMeaningResolutionCollapse(input) * 0.25 + scoreSemanticNoiseDominance(input) * 0.25 + (1 - input.semanticDiversityRetention) * 0.25);
}

export function scoreSemanticHeatDeathRisk(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(scoreSemanticExhaustionPotential(input) * 0.25 + scoreOntologySignalDecay(input) * 0.2 + scoreMeaningResolutionCollapse(input) * 0.2 + scoreSemanticNoiseDominance(input) * 0.2 + scoreMetricThermalEquilibriumFailure(input) * 0.15);
}

export function scoreRecursiveEnergyFeedback(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(input.recursiveMeaningDependency * 0.3 + input.recursiveTruthAmplification * 0.25 + scoreSemanticEnergyPropagation(input) * 0.25 + input.metricReferenceCycleDepth * 0.2);
}

export function scoreSemanticEnergyLoopRisk(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(scoreRecursiveEnergyFeedback(input) * 0.3 + input.observerDependencyLoopRisk * 0.25 + input.semanticOrbitInstability * 0.25 + input.replayAmplificationRisk * 0.2);
}

export function scoreOntologyPropagationCascade(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(scoreOntologyTurbulenceIntensity(input) * 0.3 + input.ontologyDensityPressure * 0.25 + input.topologyCollapseRisk * 0.25 + scoreSemanticPressureWaveRisk(input) * 0.2);
}

export function scoreReplayHeatAmplification(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(input.replayAmplificationRisk * 0.35 + scoreReplayEntropyPropagation(input) * 0.3 + input.replayCount / 180 * 0.2 + scoreRecursiveEnergyFeedback(input) * 0.15);
}

export function scoreObserverChainThermalPropagation(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(input.observerChainDepth / 24 * 0.3 + input.observerDependencyLoopRisk * 0.25 + scoreObserverThermalFatigue(input) * 0.25 + scoreSemanticEnergyPropagation(input) * 0.2);
}

export function scoreSemanticResonancePressure(input: RuntimeSemanticThermodynamicsObserveInput): number {
  return round(scoreSemanticEnergyLoopRisk(input) * 0.3 + scoreOntologyPropagationCascade(input) * 0.25 + scoreReplayHeatAmplification(input) * 0.25 + input.semanticSingularityRisk * 0.2);
}

export function buildRuntimeSemanticThermodynamicsProfile(input: RuntimeSemanticThermodynamicsObserveInput): RuntimeSemanticThermodynamicsProfile {
  return {
    semanticEntropyLevel: scoreSemanticEntropyLevel(input),
    semanticHeatDensity: scoreSemanticHeatDensity(input),
    ontologyThermalPressure: scoreOntologyThermalPressure(input),
    recursiveMeaningTemperature: scoreRecursiveMeaningTemperature(input),
    semanticEnergyPropagation: scoreSemanticEnergyPropagation(input),
    entropyAmplificationRisk: scoreEntropyAmplificationRisk(input),
    semanticHeatAccumulation: scoreSemanticHeatAccumulation(input),
    runtimeMeaningHeatIndex: scoreRuntimeMeaningHeatIndex(input),
    semanticDissipationEfficiency: scoreSemanticDissipationEfficiency(input),
    ontologyCoolingPotential: scoreOntologyCoolingPotential(input),
    observerEntropyDrain: scoreObserverEntropyDrain(input),
    semanticThermalLeakage: scoreSemanticThermalLeakage(input),
    replayEntropyPropagation: scoreReplayEntropyPropagation(input),
    dashboardHeatRetention: scoreDashboardHeatRetention(input),
    semanticPressurePersistence: scoreSemanticPressurePersistence(input),
    entropyContainmentStress: scoreEntropyContainmentStress(input),
    ontologyTurbulenceIntensity: scoreOntologyTurbulenceIntensity(input),
    semanticVortexFormation: scoreSemanticVortexFormation(input),
    recursiveMeaningTurbulence: scoreRecursiveMeaningTurbulence(input),
    worldviewConvectionRisk: scoreWorldviewConvectionRisk(input),
    observerInterpretationInstability: scoreObserverInterpretationInstability(input),
    semanticPressureWaveRisk: scoreSemanticPressureWaveRisk(input),
    ontologyFlowFragmentation: scoreOntologyFlowFragmentation(input),
    observerThermalFatigue: scoreObserverThermalFatigue(input),
    cognitiveHeatOverload: scoreCognitiveHeatOverload(input),
    dashboardThermalSaturation: scoreDashboardThermalSaturation(input),
    semanticAttentionBurnout: scoreSemanticAttentionBurnout(input),
    interpretationHeatStress: scoreInterpretationHeatStress(input),
    replayObservationExhaustion: scoreReplayObservationExhaustion(input),
    observerCoolingDeficit: scoreObserverCoolingDeficit(input),
    semanticHeatDeathRisk: scoreSemanticHeatDeathRisk(input),
    ontologySignalDecay: scoreOntologySignalDecay(input),
    meaningResolutionCollapse: scoreMeaningResolutionCollapse(input),
    semanticNoiseDominance: scoreSemanticNoiseDominance(input),
    metricThermalEquilibriumFailure: scoreMetricThermalEquilibriumFailure(input),
    observerMeaningBlindness: scoreObserverMeaningBlindness(input),
    semanticExhaustionPotential: scoreSemanticExhaustionPotential(input),
    recursiveEnergyFeedback: scoreRecursiveEnergyFeedback(input),
    semanticEnergyLoopRisk: scoreSemanticEnergyLoopRisk(input),
    ontologyPropagationCascade: scoreOntologyPropagationCascade(input),
    replayHeatAmplification: scoreReplayHeatAmplification(input),
    observerChainThermalPropagation: scoreObserverChainThermalPropagation(input),
    semanticResonancePressure: scoreSemanticResonancePressure(input),
    measuredAt: new Date().toISOString(),
  };
}

