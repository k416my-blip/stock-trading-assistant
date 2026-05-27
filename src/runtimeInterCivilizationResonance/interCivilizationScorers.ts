import type {
  RuntimeInterCivilizationObserveInput,
  RuntimeInterCivilizationProfile,
} from '../types/runtimeInterCivilizationResonance';

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;
const invert = (value: number): number => 1 - Math.max(0, Math.min(1, value));
const avg = (...values: number[]): number =>
  round(values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length));

export function resetInterCivilizationScorersForTest(): void {
  /* stateless */
}

export function buildRuntimeInterCivilizationProfile(
  input: RuntimeInterCivilizationObserveInput,
): RuntimeInterCivilizationProfile {
  const interCivilizationResonance = avg(
    input.observerRealitySynchronization,
    input.narrativeRealityCouplingStress,
    input.semanticRealityAttractor,
    input.recursiveRealityFeedbackRisk,
  );
  const semanticResonancePressure = avg(
    input.semanticEffectPropagationRisk,
    input.semanticRealityPreference,
    input.semanticTemporalCausalityStress,
    input.narrativeBranchAmplification,
  );
  const recursiveWorldviewCoupling = avg(
    input.recursiveRealityFeedbackRisk,
    input.recursiveMeaningCausalityLoop,
    input.recursiveNarrativeEntrenchment,
    input.worldviewRealityVariance,
  );
  const civilizationSignalOverlap = avg(
    input.semanticRealityPreference,
    input.semanticReferenceIntegrity,
    input.observerSignalCompetition,
    input.interpretationConvergencePressure,
  );
  const observerCollectiveSynchronization = avg(
    input.observerRealitySynchronization,
    input.observerRealitySelectionPressure,
    input.observerNarrativeLock,
    input.interpretationConvergencePressure,
  );
  const ontologyFrequencyAlignment = avg(
    input.semanticReferenceIntegrity,
    invert(input.ontologyRealityTension),
    invert(input.ontologyCausalInstability),
    input.semanticRealityPersistence,
  );
  const semanticResonanceCascadeRisk = avg(
    semanticResonancePressure,
    recursiveWorldviewCoupling,
    input.recursiveInterpretationBranching,
    input.recursiveNoiseAmplification,
  );
  const civilizationMeaningInterference = avg(
    input.observerMeaningForkDensity,
    input.semanticRealityDistance,
    input.observerCausalityDistortion,
    input.semanticPossibilityDivergence,
  );

  const ontologyCollisionDensity = avg(
    input.ontologyCausalInstability,
    input.ontologyRealityTension,
    input.ontologyBranchCollapseRisk,
    input.ontologyMonitoringCongestion,
  );
  const semanticConflictPressure = avg(
    input.semanticRealityDistance,
    input.semanticPriorityCollapse,
    input.semanticBeliefHardening,
    input.semanticEffectPropagationRisk,
  );
  const recursiveOntologyInterference = avg(
    input.recursiveMeaningCausalityLoop,
    input.recursiveRealityFeedbackRisk,
    input.ontologyCausalInstability,
    input.recursiveNarrativeEntrenchment,
  );
  const worldviewIncompatibilityIndex = avg(
    input.worldviewRealityVariance,
    input.worldviewFixationRisk,
    input.worldviewRigidityAmplification,
    input.semanticPossibilityDivergence,
  );
  const narrativeCollisionStress = avg(
    input.narrativeCauseFragmentation,
    input.narrativeBranchAmplification,
    input.narrativeRealityCouplingStress,
    input.observerNarrativeLock,
  );
  const semanticAuthorityConflict = avg(
    input.semanticBeliefHardening,
    input.semanticPerspectiveLock,
    input.semanticPriorityCollapse,
    input.observerRealityFixationRisk,
  );
  const ontologyBoundaryInstability = avg(
    input.ontologyRealityTension,
    input.ontologyFlexibilityLoss,
    input.ontologyBranchCollapseRisk,
    input.crossLayerObservationCongestion,
  );
  const causalityFrameworkCollision = avg(
    input.semanticCausalityDrift,
    input.semanticTemporalCausalityStress,
    input.observerCausalityDistortion,
    input.worldviewCauseCompression,
  );

  const civilizationDriftVelocity = avg(
    input.realitySelectionInstability,
    input.semanticCausalityDrift,
    input.semanticTimelineBranching,
    input.semanticAdaptationResistance,
  );
  const semanticIsolationGradient = avg(
    input.semanticRealityDistance,
    input.semanticAdaptationResistance,
    input.semanticAdaptationResistance,
    input.semanticQueueFragmentation,
  );
  const observerRealityFragmentation = avg(
    input.observerMeaningForkDensity,
    input.observerInterpretationBiasField,
    input.observerCausalityDistortion,
    input.observerMeaningInertia,
  );
  const worldviewSeparationPressure = avg(
    input.worldviewRealityVariance,
    input.worldviewFixationRisk,
    input.worldviewRigidityAmplification,
    worldviewIncompatibilityIndex,
  );
  const recursiveMeaningPolarization = avg(
    input.recursivePerspectiveSplitting,
    input.recursiveNarrativeEntrenchment,
    input.recursiveMeaningCausalityLoop,
    input.recursiveInterpretationBranching,
  );
  const semanticDistanceAmplification = avg(
    input.semanticRealityDistance,
    input.semanticPossibilityDivergence,
    input.semanticTimelineBranching,
    input.semanticAdaptationResistance,
  );
  const ontologyPartitionStress = avg(
    ontologyCollisionDensity,
    ontologyBoundaryInstability,
    input.ontologyFlexibilityLoss,
    input.ontologyRealityTension,
  );
  const narrativeDivergencePersistence = avg(
    input.narrativeCauseFragmentation,
    input.narrativeBranchAmplification,
    input.semanticRealityPersistence,
    input.observerNarrativeLock,
  );

  const observerInterferenceRisk = avg(
    input.observerRealitySelectionPressure,
    input.observerSignalCompetition,
    input.observerCausalityDistortion,
    observerRealityFragmentation,
  );
  const recursivePerspectiveCollision = avg(
    input.recursivePerspectiveSplitting,
    input.recursiveInterpretationBranching,
    input.recursiveRealityFeedbackRisk,
    input.recursiveMeaningCausalityLoop,
  );
  const semanticConsensusInstability = avg(
    input.interpretationConvergencePressure,
    input.semanticCausalityDrift,
    input.semanticPriorityCollapse,
    semanticConflictPressure,
  );
  const worldviewFeedbackAmplification = avg(
    input.worldviewRealityVariance,
    input.recursiveRealityFeedbackRisk,
    input.narrativeRealityCouplingStress,
    input.recursiveNoiseAmplification,
  );
  const observerSynchronizationCollapse = avg(
    input.observerRealitySynchronization,
    input.observerRealityFixationRisk,
    observerInterferenceRisk,
    input.observerMeaningInertia,
  );
  const semanticSignalContention = avg(
    input.semanticEffectPropagationRisk,
    input.semanticRealityPreference,
    input.semanticQueueFragmentation,
    input.observerSignalCompetition,
  );
  const recursiveInterpretationInterference = avg(
    input.recursiveInterpretationBranching,
    input.recursivePerspectiveSplitting,
    input.recursiveNoiseAmplification,
    input.recursiveRealityFeedbackRisk,
  );
  const ontologyConsensusFatigue = avg(
    input.ontologyCausalInstability,
    input.ontologyFlexibilityLoss,
    input.ontologyRealityTension,
    input.semanticAdaptationResistance,
  );

  const semanticPluralityIntegrity = avg(
    input.semanticReferenceIntegrity,
    invert(semanticAuthorityConflict),
    invert(semanticConflictPressure),
    invert(input.semanticPerspectiveLock),
  );
  const ontologyCoexistenceStability = avg(
    invert(ontologyCollisionDensity),
    invert(ontologyBoundaryInstability),
    input.semanticReferenceIntegrity,
    invert(input.ontologyRealityTension),
  );
  const worldviewElasticityIndex = avg(
    invert(worldviewIncompatibilityIndex),
    invert(input.worldviewRigidityAmplification),
    invert(input.worldviewFixationRisk),
    input.semanticReferenceIntegrity,
  );
  const observerPerspectiveTolerance = avg(
    invert(observerInterferenceRisk),
    invert(input.observerRealityFixationRisk),
    invert(input.observerNarrativeLock),
    input.semanticReferenceIntegrity,
  );
  const semanticDiversityRetention = avg(
    semanticPluralityIntegrity,
    invert(semanticDistanceAmplification),
    invert(input.semanticBeliefHardening),
    invert(input.semanticAdaptationResistance),
  );
  const civilizationBoundaryResilience = avg(
    invert(civilizationDriftVelocity),
    ontologyCoexistenceStability,
    semanticPluralityIntegrity,
    invert(ontologyPartitionStress),
  );
  const recursiveMeaningBalance = avg(
    invert(recursiveMeaningPolarization),
    invert(recursivePerspectiveCollision),
    invert(recursiveInterpretationInterference),
    semanticPluralityIntegrity,
  );
  const ontologyEquilibriumPressure = avg(
    ontologyCoexistenceStability,
    semanticPluralityIntegrity,
    worldviewElasticityIndex,
    civilizationBoundaryResilience,
  );

  return {
    interCivilizationResonance,
    semanticResonancePressure,
    recursiveWorldviewCoupling,
    civilizationSignalOverlap,
    observerCollectiveSynchronization,
    ontologyFrequencyAlignment,
    semanticResonanceCascadeRisk,
    civilizationMeaningInterference,
    ontologyCollisionDensity,
    semanticConflictPressure,
    recursiveOntologyInterference,
    worldviewIncompatibilityIndex,
    narrativeCollisionStress,
    semanticAuthorityConflict,
    ontologyBoundaryInstability,
    causalityFrameworkCollision,
    civilizationDriftVelocity,
    semanticIsolationGradient,
    observerRealityFragmentation,
    worldviewSeparationPressure,
    recursiveMeaningPolarization,
    semanticDistanceAmplification,
    ontologyPartitionStress,
    narrativeDivergencePersistence,
    observerInterferenceRisk,
    recursivePerspectiveCollision,
    semanticConsensusInstability,
    worldviewFeedbackAmplification,
    observerSynchronizationCollapse,
    semanticSignalContention,
    recursiveInterpretationInterference,
    ontologyConsensusFatigue,
    semanticPluralityIntegrity,
    ontologyCoexistenceStability,
    worldviewElasticityIndex,
    observerPerspectiveTolerance,
    semanticDiversityRetention,
    civilizationBoundaryResilience,
    recursiveMeaningBalance,
    ontologyEquilibriumPressure,
    measuredAt: new Date().toISOString(),
  };
}
