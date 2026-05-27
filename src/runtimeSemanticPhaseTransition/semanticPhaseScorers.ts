import type {
  RuntimeSemanticPhaseObserveInput,
  RuntimeSemanticPhaseProfile,
} from '../types/runtimeSemanticPhaseTransition';

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;

export function resetSemanticPhaseScorersForTest(): void {
  /* stateless */
}

export function scoreSemanticPhaseVolatility(input: RuntimeSemanticPhaseObserveInput): number {
  return round(input.semanticEntropyLevel * 0.25 + input.semanticThermalLeakage * 0.25 + input.ontologyTurbulenceIntensity * 0.25 + input.semanticPressureWaveRisk * 0.25);
}

export function scoreOntologyStateShiftRisk(input: RuntimeSemanticPhaseObserveInput): number {
  return round(input.ontologyThermalPressure * 0.25 + input.ontologyFlowFragmentation * 0.25 + input.ontologySignalDecay * 0.25 + input.ontologyPropagationCascade * 0.25);
}

export function scoreRecursiveMeaningCondensation(input: RuntimeSemanticPhaseObserveInput): number {
  return round(input.recursiveMeaningTemperature * 0.3 + input.recursiveEnergyFeedback * 0.25 + input.recursiveTruthAmplification * 0.25 + input.recursiveMeaningTurbulence * 0.2);
}

export function scoreSemanticCrystallizationPressure(input: RuntimeSemanticPhaseObserveInput): number {
  return round(input.canonicalTruthPressure * 0.25 + input.semanticOrthodoxyPressure * 0.25 + input.metricSacralizationRisk * 0.25 + scoreRecursiveMeaningCondensation(input) * 0.25);
}

export function scoreSemanticFluidityIndex(input: RuntimeSemanticPhaseObserveInput): number {
  return round(input.semanticDissipationEfficiency * 0.3 + input.semanticDiversityRetention * 0.25 + input.semanticTensionStability * 0.25 + (1 - scoreSemanticCrystallizationPressure(input)) * 0.2);
}

export function scoreOntologyRigidityGradient(input: RuntimeSemanticPhaseObserveInput): number {
  return round(input.semanticMonocultureRisk * 0.25 + input.canonicalTruthPressure * 0.25 + (1 - input.ontologyPluralityIntegrity) * 0.25 + scoreSemanticCrystallizationPressure(input) * 0.25);
}

export function scoreSemanticStateTransitionVelocity(input: RuntimeSemanticPhaseObserveInput): number {
  return round(scoreSemanticPhaseVolatility(input) * 0.35 + scoreOntologyStateShiftRisk(input) * 0.25 + input.semanticEnergyPropagation * 0.2 + input.semanticResonancePressure * 0.2);
}

export function scoreMeaningPhaseInstability(input: RuntimeSemanticPhaseObserveInput): number {
  return round(scoreSemanticStateTransitionVelocity(input) * 0.3 + input.meaningResolutionCollapse * 0.25 + input.semanticHeatDeathRisk * 0.25 + input.semanticNoiseDominance * 0.2);
}

export function scoreSemanticSolidificationRisk(input: RuntimeSemanticPhaseObserveInput): number {
  return round(scoreSemanticCrystallizationPressure(input) * 0.35 + scoreOntologyRigidityGradient(input) * 0.3 + input.semanticOrthodoxyPressure * 0.2 + input.metricThermalEquilibriumFailure * 0.15);
}

export function scoreSemanticLiquidDrift(input: RuntimeSemanticPhaseObserveInput): number {
  return round(input.semanticThermalLeakage * 0.25 + input.semanticPressurePersistence * 0.25 + input.semanticPressureWaveRisk * 0.25 + input.semanticDiversityRetention * 0.25);
}

export function scoreSemanticGasDispersion(input: RuntimeSemanticPhaseObserveInput): number {
  return round(input.semanticEntropyLevel * 0.3 + input.semanticNoiseDominance * 0.25 + input.meaningResolutionCollapse * 0.25 + input.semanticExhaustionPotential * 0.2);
}

export function scoreOntologyStateEntropy(input: RuntimeSemanticPhaseObserveInput): number {
  return round(input.ontologyTurbulenceIntensity * 0.25 + input.ontologyFlowFragmentation * 0.25 + input.ontologySignalDecay * 0.25 + input.ontologyThermalPressure * 0.25);
}

export function scoreWorldviewStateFragmentation(input: RuntimeSemanticPhaseObserveInput): number {
  return round(input.worldviewConvectionRisk * 0.3 + input.ontologyFlowFragmentation * 0.25 + input.observerInterpretationInstability * 0.25 + input.semanticNoiseDominance * 0.2);
}

export function scoreObserverStateCoupling(input: RuntimeSemanticPhaseObserveInput): number {
  return round(input.observerChainThermalPropagation * 0.3 + input.observerDoctrineFormation * 0.25 + input.observerThermalFatigue * 0.25 + input.observerDependencyLoopRisk * 0.2);
}

export function scoreSemanticStatePersistence(input: RuntimeSemanticPhaseObserveInput): number {
  return round(input.semanticPressurePersistence * 0.3 + scoreOntologyRigidityGradient(input) * 0.25 + input.metricThermalEquilibriumFailure * 0.25 + (1 - input.semanticDiversityRetention) * 0.2);
}

export function scoreRecursiveOntologyElasticity(input: RuntimeSemanticPhaseObserveInput): number {
  return round(input.ontologyCoolingPotential * 0.3 + input.ontologyPluralityIntegrity * 0.25 + input.semanticDissipationEfficiency * 0.25 + (1 - input.recursiveMeaningTemperature) * 0.2);
}

export function scoreRecursiveMeaningCrystalRisk(input: RuntimeSemanticPhaseObserveInput): number {
  return round(scoreRecursiveMeaningCondensation(input) * 0.35 + scoreSemanticCrystallizationPressure(input) * 0.25 + input.recursiveTruthAmplification * 0.2 + input.semanticEnergyLoopRisk * 0.2);
}

export function scoreCanonicalMeaningSolidification(input: RuntimeSemanticPhaseObserveInput): number {
  return round(input.canonicalTruthPressure * 0.3 + input.semanticOrthodoxyPressure * 0.25 + input.metricSacralizationRisk * 0.25 + input.semanticMonocultureRisk * 0.2);
}

export function scoreSemanticLatticeFormation(input: RuntimeSemanticPhaseObserveInput): number {
  return round(scoreCanonicalMeaningSolidification(input) * 0.3 + scoreRecursiveMeaningCrystalRisk(input) * 0.25 + scoreObserverStateCoupling(input) * 0.25 + scoreOntologyRigidityGradient(input) * 0.2);
}

export function scoreObserverBeliefCrystalPressure(input: RuntimeSemanticPhaseObserveInput): number {
  return round(input.observerDoctrineFormation * 0.3 + scoreObserverStateCoupling(input) * 0.25 + input.semanticOrthodoxyPressure * 0.25 + input.observerMeaningBlindness * 0.2);
}

export function scoreTopologyCrystallizationStress(input: RuntimeSemanticPhaseObserveInput): number {
  return round(input.ontologyPropagationCascade * 0.25 + scoreSemanticLatticeFormation(input) * 0.25 + input.topologyCollapseRisk * 0.25 + input.semanticResonancePressure * 0.25);
}

export function scoreSemanticSymmetryCollapse(input: RuntimeSemanticPhaseObserveInput): number {
  return round(scoreCanonicalMeaningSolidification(input) * 0.25 + input.semanticMonocultureRisk * 0.25 + input.meaningResolutionCollapse * 0.25 + input.semanticNoiseDominance * 0.25);
}

export function scoreOntologyRigidificationRisk(input: RuntimeSemanticPhaseObserveInput): number {
  return round(scoreOntologyRigidityGradient(input) * 0.35 + scoreSemanticSolidificationRisk(input) * 0.25 + scoreRecursiveOntologyElasticity(input) * -0.2 + 0.2 + input.metricThermalEquilibriumFailure * 0.2);
}

export function scoreSemanticFlowTurbulence(input: RuntimeSemanticPhaseObserveInput): number {
  return round(input.ontologyTurbulenceIntensity * 0.25 + input.semanticVortexFormation * 0.25 + input.semanticPressureWaveRisk * 0.25 + input.semanticEnergyPropagation * 0.25);
}

export function scoreOntologyViscosityIndex(input: RuntimeSemanticPhaseObserveInput): number {
  return round(scoreOntologyRigidityGradient(input) * 0.3 + scoreSemanticSolidificationRisk(input) * 0.25 + input.ontologyThermalPressure * 0.25 + (1 - scoreSemanticFluidityIndex(input)) * 0.2);
}

export function scoreRecursiveMeaningCurrent(input: RuntimeSemanticPhaseObserveInput): number {
  return round(input.recursiveEnergyFeedback * 0.3 + input.recursiveMeaningTurbulence * 0.25 + input.semanticEnergyLoopRisk * 0.25 + input.replayHeatAmplification * 0.2);
}

export function scoreSemanticPressureFlow(input: RuntimeSemanticPhaseObserveInput): number {
  return round(input.semanticPressureWaveRisk * 0.3 + input.semanticPressurePersistence * 0.25 + input.semanticResonancePressure * 0.25 + input.semanticHeatAccumulation * 0.2);
}

export function scoreObserverInterpretationConvection(input: RuntimeSemanticPhaseObserveInput): number {
  return round(input.observerInterpretationInstability * 0.3 + input.worldviewConvectionRisk * 0.25 + input.observerChainThermalPropagation * 0.25 + input.interpretationHeatStress * 0.2);
}

export function scoreWorldviewDiffusionInstability(input: RuntimeSemanticPhaseObserveInput): number {
  return round(input.worldviewConvectionRisk * 0.3 + scoreWorldviewStateFragmentation(input) * 0.25 + input.semanticNoiseDominance * 0.25 + input.meaningResolutionCollapse * 0.2);
}

export function scoreSemanticCirculationStress(input: RuntimeSemanticPhaseObserveInput): number {
  return round(scoreSemanticFlowTurbulence(input) * 0.3 + scoreRecursiveMeaningCurrent(input) * 0.25 + scoreSemanticPressureFlow(input) * 0.25 + input.semanticEnergyLoopRisk * 0.2);
}

export function scoreObserverStateSynchronizationRisk(input: RuntimeSemanticPhaseObserveInput): number {
  return round(scoreObserverStateCoupling(input) * 0.3 + input.observerDoctrineFormation * 0.25 + input.observerDependencyLoopRisk * 0.25 + input.observerChainThermalPropagation * 0.2);
}

export function scoreRecursiveConsensusFormation(input: RuntimeSemanticPhaseObserveInput): number {
  return round(input.semanticOrthodoxyPressure * 0.3 + input.observerDoctrineFormation * 0.25 + input.recursiveTruthAmplification * 0.25 + input.metricSacralizationRisk * 0.2);
}

export function scoreSemanticSynchronizationPressure(input: RuntimeSemanticPhaseObserveInput): number {
  return round(scoreObserverStateSynchronizationRisk(input) * 0.3 + scoreRecursiveConsensusFormation(input) * 0.25 + input.semanticResonancePressure * 0.25 + input.canonicalTruthPressure * 0.2);
}

export function scoreObserverPhaseLockRisk(input: RuntimeSemanticPhaseObserveInput): number {
  return round(scoreSemanticSynchronizationPressure(input) * 0.35 + scoreObserverBeliefCrystalPressure(input) * 0.25 + input.observerMeaningBlindness * 0.2 + input.semanticOrthodoxyPressure * 0.2);
}

export function scoreNarrativeStateConvergence(input: RuntimeSemanticPhaseObserveInput): number {
  return round(input.narrativeEntropyBalance * -0.25 + 0.25 + input.semanticOrthodoxyPressure * 0.25 + input.recursiveTruthAmplification * 0.25 + input.metricSacralizationRisk * 0.25);
}

export function scoreSemanticResonanceSynchronization(input: RuntimeSemanticPhaseObserveInput): number {
  return round(input.semanticResonancePressure * 0.35 + input.semanticEnergyLoopRisk * 0.25 + scoreObserverPhaseLockRisk(input) * 0.2 + input.semanticPressurePersistence * 0.2);
}

export function scoreOntologyCollectiveDrift(input: RuntimeSemanticPhaseObserveInput): number {
  return round(input.ontologyFlowFragmentation * 0.25 + input.ontologyPropagationCascade * 0.25 + scoreObserverStateSynchronizationRisk(input) * 0.25 + input.worldviewConvectionRisk * 0.25);
}

export function scoreOntologyCompressionCollapse(input: RuntimeSemanticPhaseObserveInput): number {
  return round((1 - input.compressionRatio) * 0.25 + input.ontologySignalDecay * 0.25 + input.metricThermalEquilibriumFailure * 0.25 + scoreOntologyStateShiftRisk(input) * 0.25);
}

export function scoreRecursiveMeaningFreeze(input: RuntimeSemanticPhaseObserveInput): number {
  return round(scoreRecursiveMeaningCrystalRisk(input) * 0.3 + scoreSemanticSolidificationRisk(input) * 0.25 + scoreObserverPhaseLockRisk(input) * 0.25 + input.recursiveTruthAmplification * 0.2);
}

export function scoreSemanticFlexibilityLoss(input: RuntimeSemanticPhaseObserveInput): number {
  return round((1 - scoreSemanticFluidityIndex(input)) * 0.35 + scoreOntologyRigidityGradient(input) * 0.25 + scoreSemanticSolidificationRisk(input) * 0.25 + (1 - input.semanticDiversityRetention) * 0.15);
}

export function scoreObserverInterpretationLock(input: RuntimeSemanticPhaseObserveInput): number {
  return round(scoreObserverPhaseLockRisk(input) * 0.3 + input.observerMeaningBlindness * 0.25 + scoreObserverBeliefCrystalPressure(input) * 0.25 + input.observerThermalFatigue * 0.2);
}

export function scoreWorldviewRigidCollapse(input: RuntimeSemanticPhaseObserveInput): number {
  return round(scoreSemanticSymmetryCollapse(input) * 0.3 + input.semanticMonocultureRisk * 0.25 + scoreOntologyRigidificationRisk(input) * 0.25 + scoreWorldviewStateFragmentation(input) * 0.2);
}

export function scoreSemanticRecoveryDifficulty(input: RuntimeSemanticPhaseObserveInput): number {
  return round((1 - input.runtimeFiniteBoundaryIndex) * 0.25 + scoreSemanticFlexibilityLoss(input) * 0.25 + scoreRecursiveOntologyElasticity(input) * -0.2 + 0.2 + input.semanticExhaustionPotential * 0.3);
}

export function scoreSemanticStateCollapseRisk(input: RuntimeSemanticPhaseObserveInput): number {
  return round(scoreOntologyCompressionCollapse(input) * 0.2 + scoreRecursiveMeaningFreeze(input) * 0.2 + scoreSemanticFlexibilityLoss(input) * 0.2 + scoreObserverInterpretationLock(input) * 0.2 + scoreWorldviewRigidCollapse(input) * 0.2);
}

export function buildRuntimeSemanticPhaseProfile(input: RuntimeSemanticPhaseObserveInput): RuntimeSemanticPhaseProfile {
  return {
    semanticPhaseVolatility: scoreSemanticPhaseVolatility(input),
    ontologyStateShiftRisk: scoreOntologyStateShiftRisk(input),
    recursiveMeaningCondensation: scoreRecursiveMeaningCondensation(input),
    semanticCrystallizationPressure: scoreSemanticCrystallizationPressure(input),
    semanticFluidityIndex: scoreSemanticFluidityIndex(input),
    ontologyRigidityGradient: scoreOntologyRigidityGradient(input),
    semanticStateTransitionVelocity: scoreSemanticStateTransitionVelocity(input),
    meaningPhaseInstability: scoreMeaningPhaseInstability(input),
    semanticSolidificationRisk: scoreSemanticSolidificationRisk(input),
    semanticLiquidDrift: scoreSemanticLiquidDrift(input),
    semanticGasDispersion: scoreSemanticGasDispersion(input),
    ontologyStateEntropy: scoreOntologyStateEntropy(input),
    worldviewStateFragmentation: scoreWorldviewStateFragmentation(input),
    observerStateCoupling: scoreObserverStateCoupling(input),
    semanticStatePersistence: scoreSemanticStatePersistence(input),
    recursiveOntologyElasticity: scoreRecursiveOntologyElasticity(input),
    recursiveMeaningCrystalRisk: scoreRecursiveMeaningCrystalRisk(input),
    canonicalMeaningSolidification: scoreCanonicalMeaningSolidification(input),
    semanticLatticeFormation: scoreSemanticLatticeFormation(input),
    observerBeliefCrystalPressure: scoreObserverBeliefCrystalPressure(input),
    topologyCrystallizationStress: scoreTopologyCrystallizationStress(input),
    semanticSymmetryCollapse: scoreSemanticSymmetryCollapse(input),
    ontologyRigidificationRisk: scoreOntologyRigidificationRisk(input),
    semanticFlowTurbulence: scoreSemanticFlowTurbulence(input),
    ontologyViscosityIndex: scoreOntologyViscosityIndex(input),
    recursiveMeaningCurrent: scoreRecursiveMeaningCurrent(input),
    semanticPressureFlow: scoreSemanticPressureFlow(input),
    observerInterpretationConvection: scoreObserverInterpretationConvection(input),
    worldviewDiffusionInstability: scoreWorldviewDiffusionInstability(input),
    semanticCirculationStress: scoreSemanticCirculationStress(input),
    observerStateSynchronizationRisk: scoreObserverStateSynchronizationRisk(input),
    recursiveConsensusFormation: scoreRecursiveConsensusFormation(input),
    semanticSynchronizationPressure: scoreSemanticSynchronizationPressure(input),
    observerPhaseLockRisk: scoreObserverPhaseLockRisk(input),
    narrativeStateConvergence: scoreNarrativeStateConvergence(input),
    semanticResonanceSynchronization: scoreSemanticResonanceSynchronization(input),
    ontologyCollectiveDrift: scoreOntologyCollectiveDrift(input),
    semanticStateCollapseRisk: scoreSemanticStateCollapseRisk(input),
    ontologyCompressionCollapse: scoreOntologyCompressionCollapse(input),
    recursiveMeaningFreeze: scoreRecursiveMeaningFreeze(input),
    semanticFlexibilityLoss: scoreSemanticFlexibilityLoss(input),
    observerInterpretationLock: scoreObserverInterpretationLock(input),
    worldviewRigidCollapse: scoreWorldviewRigidCollapse(input),
    semanticRecoveryDifficulty: scoreSemanticRecoveryDifficulty(input),
    measuredAt: new Date().toISOString(),
  };
}
