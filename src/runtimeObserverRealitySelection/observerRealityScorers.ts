import type {
  RuntimeObserverRealityObserveInput,
  RuntimeObserverRealityProfile,
} from '../types/runtimeObserverRealitySelection';

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;
const invert = (value: number): number => 1 - Math.max(0, Math.min(1, value));

export function resetObserverRealityScorersForTest(): void {
  /* stateless */
}

export function scoreObserverRealitySelectionPressure(input: RuntimeObserverRealityObserveInput): number {
  return round(input.observerAttentionLoad * 0.25 + input.observerSignalCompetition * 0.25 + input.semanticPriorityRoutingPressure * 0.25 + input.observerPhaseLockRisk * 0.25);
}

export function scoreSemanticRealityPreference(input: RuntimeObserverRealityObserveInput): number {
  return round(input.semanticHotPathIntensity * 0.25 + input.semanticPriorityCollapse * 0.25 + input.semanticBandwidthExhaustion * 0.25 + input.semanticStateCollapseRisk * 0.25);
}

export function scoreWorldviewFixationRisk(input: RuntimeObserverRealityObserveInput): number {
  return round(input.observerPhaseLockRisk * 0.25 + input.semanticPriorityCollapse * 0.25 + input.semanticLoadSheddingPressure * 0.25 + invert(input.semanticFluidityIndex) * 0.25);
}

export function scoreObserverInterpretationBiasField(input: RuntimeObserverRealityObserveInput): number {
  return round(input.observerFocusDrift * 0.25 + input.observerInterpretationBacklog * 0.25 + input.observerDiscardConflict * 0.25 + input.semanticMonitoringFatigue * 0.25);
}

export function scoreRecursiveRealitySelectionDepth(input: RuntimeObserverRealityObserveInput): number {
  return round(input.recursiveTelemetryDensity * 0.25 + input.recursiveAttentionCollision * 0.25 + input.recursiveReplayPressure * 0.25 + input.recursiveNoiseAmplification * 0.25);
}

export function scoreSemanticRealityAttractor(input: RuntimeObserverRealityObserveInput): number {
  return round(scoreSemanticRealityPreference(input) * 0.3 + input.semanticHotPathIntensity * 0.25 + input.semanticPriorityRoutingPressure * 0.25 + input.meaningPhaseInstability * 0.2);
}

export function scoreObserverNarrativeLock(input: RuntimeObserverRealityObserveInput): number {
  return round(input.observerPhaseLockRisk * 0.3 + scoreWorldviewFixationRisk(input) * 0.25 + scoreObserverInterpretationBiasField(input) * 0.25 + input.runtimeAttentionExhaustion * 0.2);
}

export function scoreRealitySelectionInstability(input: RuntimeObserverRealityObserveInput): number {
  return round(input.runtimeSignalJitter * 0.25 + input.semanticPhaseVolatility * 0.25 + scoreObserverRealitySelectionPressure(input) * 0.25 + input.observerFocusDrift * 0.25);
}

export function scoreSemanticCausalityDrift(input: RuntimeObserverRealityObserveInput): number {
  return round(input.runtimeSignalJitter * 0.25 + input.metricRoutingInstability * 0.25 + input.ontologyMonitoringCongestion * 0.25 + input.meaningPhaseInstability * 0.25);
}

export function scoreNarrativeCauseFragmentation(input: RuntimeObserverRealityObserveInput): number {
  return round(input.semanticQueueFragmentation * 0.25 + input.recursiveNoiseAmplification * 0.25 + input.dashboardSignalOverflow * 0.25 + input.observerInterpretationBacklog * 0.25);
}

export function scoreRecursiveMeaningCausalityLoop(input: RuntimeObserverRealityObserveInput): number {
  return round(input.recursiveTelemetryDensity * 0.25 + input.recursiveSignalSuppressionRisk * 0.25 + input.recursiveAttentionCollision * 0.25 + input.recursiveReplayPressure * 0.25);
}

export function scoreOntologyCausalInstability(input: RuntimeObserverRealityObserveInput): number {
  return round(input.ontologyStateShiftRisk * 0.25 + input.ontologyMonitoringCongestion * 0.25 + input.ontologyCollectiveDrift * 0.25 + input.crossLayerObservationCongestion * 0.25);
}

export function scoreSemanticEffectPropagationRisk(input: RuntimeObserverRealityObserveInput): number {
  return round(input.semanticHotPathIntensity * 0.25 + input.telemetryFloodRisk * 0.25 + input.semanticPriorityRoutingPressure * 0.25 + input.runtimeObservationPressure * 0.25);
}

export function scoreObserverCausalityDistortion(input: RuntimeObserverRealityObserveInput): number {
  return round(scoreObserverInterpretationBiasField(input) * 0.3 + input.observerSignalCompetition * 0.25 + input.observerFocusDrift * 0.25 + input.observerDiscardConflict * 0.2);
}

export function scoreWorldviewCauseCompression(input: RuntimeObserverRealityObserveInput): number {
  return round(input.dashboardCompressionPressure * 0.25 + input.semanticLoadSheddingPressure * 0.25 + input.semanticPriorityCollapse * 0.25 + input.metricRetentionStress * 0.25);
}

export function scoreSemanticTemporalCausalityStress(input: RuntimeObserverRealityObserveInput): number {
  return round(input.runtimeSignalJitter * 0.3 + input.semanticPhaseVolatility * 0.25 + input.meaningPhaseInstability * 0.25 + scoreSemanticCausalityDrift(input) * 0.2);
}

export function scoreRecursiveInterpretationBranching(input: RuntimeObserverRealityObserveInput): number {
  return round(input.semanticQueueFragmentation * 0.25 + input.recursiveTelemetryDensity * 0.25 + input.recursiveNoiseAmplification * 0.25 + scoreRealitySelectionInstability(input) * 0.25);
}

export function scoreSemanticPossibilityDivergence(input: RuntimeObserverRealityObserveInput): number {
  return round(input.semanticPhaseVolatility * 0.25 + input.semanticQueueFragmentation * 0.25 + input.meaningPhaseInstability * 0.25 + input.semanticBandwidthExhaustion * 0.25);
}

export function scoreObserverMeaningForkDensity(input: RuntimeObserverRealityObserveInput): number {
  return round(input.observerSignalCompetition * 0.25 + input.observerInterpretationBacklog * 0.25 + input.observerFocusDrift * 0.25 + scoreRecursiveInterpretationBranching(input) * 0.25);
}

export function scoreOntologyBranchCollapseRisk(input: RuntimeObserverRealityObserveInput): number {
  return round(input.ontologyMonitoringCongestion * 0.25 + input.ontologyStateShiftRisk * 0.25 + input.semanticStateCollapseRisk * 0.25 + input.crossLayerObservationCongestion * 0.25);
}

export function scoreNarrativeBranchAmplification(input: RuntimeObserverRealityObserveInput): number {
  return round(input.telemetryFloodRisk * 0.25 + input.recursiveReplayPressure * 0.25 + input.dashboardSignalOverflow * 0.25 + scoreNarrativeCauseFragmentation(input) * 0.25);
}

export function scoreRecursivePerspectiveSplitting(input: RuntimeObserverRealityObserveInput): number {
  return round(scoreRecursiveInterpretationBranching(input) * 0.3 + input.recursiveAttentionCollision * 0.25 + input.recursiveNoiseAmplification * 0.25 + input.observerFocusDrift * 0.2);
}

export function scoreSemanticTimelineBranching(input: RuntimeObserverRealityObserveInput): number {
  return round(input.runtimeSignalJitter * 0.25 + input.semanticPhaseVolatility * 0.25 + scoreSemanticTemporalCausalityStress(input) * 0.25 + scoreSemanticPossibilityDivergence(input) * 0.25);
}

export function scoreInterpretationConvergencePressure(input: RuntimeObserverRealityObserveInput): number {
  return round(input.observerPhaseLockRisk * 0.25 + input.semanticPriorityCollapse * 0.25 + input.semanticLoadSheddingPressure * 0.25 + scoreObserverNarrativeLock(input) * 0.25);
}

export function scoreNarrativeRealityCouplingStress(input: RuntimeObserverRealityObserveInput): number {
  return round(scoreSemanticCausalityDrift(input) * 0.25 + scoreRealitySelectionInstability(input) * 0.25 + input.ontologyCollectiveDrift * 0.25 + input.observerStateSynchronizationRisk * 0.25);
}

export function scoreSemanticRealityDistance(input: RuntimeObserverRealityObserveInput): number {
  return round(input.semanticSignalDecayRisk * 0.25 + input.semanticBandwidthExhaustion * 0.25 + input.meaningPhaseInstability * 0.25 + invert(input.semanticFluidityIndex) * 0.25);
}

export function scoreObserverRealitySynchronization(input: RuntimeObserverRealityObserveInput): number {
  return round(input.observerStateSynchronizationRisk * 0.3 + input.observerPhaseLockRisk * 0.25 + input.observerSignalCompetition * 0.25 + input.observerAttentionLoad * 0.2);
}

export function scoreWorldviewRealityVariance(input: RuntimeObserverRealityObserveInput): number {
  return round(input.semanticQueueFragmentation * 0.25 + input.ontologyCollectiveDrift * 0.25 + input.meaningPhaseInstability * 0.25 + input.runtimeSignalJitter * 0.25);
}

export function scoreSemanticReferenceIntegrity(input: RuntimeObserverRealityObserveInput): number {
  return round(invert(input.semanticSignalDecayRisk) * 0.3 + invert(scoreSemanticCausalityDrift(input)) * 0.25 + input.semanticFluidityIndex * 0.25 + invert(input.metricRoutingInstability) * 0.2);
}

export function scoreRecursiveRealityFeedbackRisk(input: RuntimeObserverRealityObserveInput): number {
  return round(input.recursiveTelemetryDensity * 0.25 + input.recursiveNoiseAmplification * 0.25 + scoreRecursiveMeaningCausalityLoop(input) * 0.25 + input.recursiveSignalSuppressionRisk * 0.25);
}

export function scoreOntologyRealityTension(input: RuntimeObserverRealityObserveInput): number {
  return round(input.ontologyMonitoringCongestion * 0.25 + input.ontologyStateShiftRisk * 0.25 + input.ontologyCollectiveDrift * 0.25 + scoreSemanticRealityDistance(input) * 0.25);
}

export function scoreSemanticRealityPersistence(input: RuntimeObserverRealityObserveInput): number {
  return round(scoreSemanticRealityAttractor(input) * 0.25 + scoreObserverNarrativeLock(input) * 0.25 + scoreWorldviewFixationRisk(input) * 0.25 + input.semanticPriorityCollapse * 0.25);
}

export function scoreObserverRealityFixationRisk(input: RuntimeObserverRealityObserveInput): number {
  return round(scoreWorldviewFixationRisk(input) * 0.25 + scoreObserverNarrativeLock(input) * 0.25 + scoreInterpretationConvergencePressure(input) * 0.25 + input.observerPhaseLockRisk * 0.25);
}

export function scoreSemanticBeliefHardening(input: RuntimeObserverRealityObserveInput): number {
  return round(input.semanticPriorityCollapse * 0.25 + input.semanticLoadSheddingPressure * 0.25 + scoreSemanticRealityAttractor(input) * 0.25 + invert(input.semanticFluidityIndex) * 0.25);
}

export function scoreRecursiveNarrativeEntrenchment(input: RuntimeObserverRealityObserveInput): number {
  return round(input.recursiveTelemetryDensity * 0.25 + scoreRecursiveMeaningCausalityLoop(input) * 0.25 + scoreObserverNarrativeLock(input) * 0.25 + input.recursiveAttentionCollision * 0.25);
}

export function scoreOntologyFlexibilityLoss(input: RuntimeObserverRealityObserveInput): number {
  return round(input.ontologyMonitoringCongestion * 0.25 + input.ontologyStateShiftRisk * 0.25 + invert(input.semanticFluidityIndex) * 0.25 + input.semanticStateCollapseRisk * 0.25);
}

export function scoreSemanticPerspectiveLock(input: RuntimeObserverRealityObserveInput): number {
  return round(input.observerPhaseLockRisk * 0.3 + scoreSemanticBeliefHardening(input) * 0.25 + scoreObserverRealityFixationRisk(input) * 0.25 + input.observerFocusDrift * 0.2);
}

export function scoreWorldviewRigidityAmplification(input: RuntimeObserverRealityObserveInput): number {
  return round(scoreWorldviewFixationRisk(input) * 0.3 + scoreOntologyFlexibilityLoss(input) * 0.25 + input.semanticPriorityCollapse * 0.25 + input.dashboardCompressionPressure * 0.2);
}

export function scoreObserverMeaningInertia(input: RuntimeObserverRealityObserveInput): number {
  return round(input.observerAttentionLoad * 0.25 + input.semanticMonitoringFatigue * 0.25 + scoreObserverNarrativeLock(input) * 0.25 + input.runtimeAttentionExhaustion * 0.25);
}

export function scoreSemanticAdaptationResistance(input: RuntimeObserverRealityObserveInput): number {
  return round(scoreSemanticBeliefHardening(input) * 0.25 + scoreOntologyFlexibilityLoss(input) * 0.25 + scoreObserverMeaningInertia(input) * 0.25 + invert(input.semanticFluidityIndex) * 0.25);
}

export function buildRuntimeObserverRealityProfile(
  input: RuntimeObserverRealityObserveInput,
): RuntimeObserverRealityProfile {
  return {
    observerRealitySelectionPressure: scoreObserverRealitySelectionPressure(input),
    semanticRealityPreference: scoreSemanticRealityPreference(input),
    worldviewFixationRisk: scoreWorldviewFixationRisk(input),
    observerInterpretationBiasField: scoreObserverInterpretationBiasField(input),
    recursiveRealitySelectionDepth: scoreRecursiveRealitySelectionDepth(input),
    semanticRealityAttractor: scoreSemanticRealityAttractor(input),
    observerNarrativeLock: scoreObserverNarrativeLock(input),
    realitySelectionInstability: scoreRealitySelectionInstability(input),
    semanticCausalityDrift: scoreSemanticCausalityDrift(input),
    narrativeCauseFragmentation: scoreNarrativeCauseFragmentation(input),
    recursiveMeaningCausalityLoop: scoreRecursiveMeaningCausalityLoop(input),
    ontologyCausalInstability: scoreOntologyCausalInstability(input),
    semanticEffectPropagationRisk: scoreSemanticEffectPropagationRisk(input),
    observerCausalityDistortion: scoreObserverCausalityDistortion(input),
    worldviewCauseCompression: scoreWorldviewCauseCompression(input),
    semanticTemporalCausalityStress: scoreSemanticTemporalCausalityStress(input),
    recursiveInterpretationBranching: scoreRecursiveInterpretationBranching(input),
    semanticPossibilityDivergence: scoreSemanticPossibilityDivergence(input),
    observerMeaningForkDensity: scoreObserverMeaningForkDensity(input),
    ontologyBranchCollapseRisk: scoreOntologyBranchCollapseRisk(input),
    narrativeBranchAmplification: scoreNarrativeBranchAmplification(input),
    recursivePerspectiveSplitting: scoreRecursivePerspectiveSplitting(input),
    semanticTimelineBranching: scoreSemanticTimelineBranching(input),
    interpretationConvergencePressure: scoreInterpretationConvergencePressure(input),
    narrativeRealityCouplingStress: scoreNarrativeRealityCouplingStress(input),
    semanticRealityDistance: scoreSemanticRealityDistance(input),
    observerRealitySynchronization: scoreObserverRealitySynchronization(input),
    worldviewRealityVariance: scoreWorldviewRealityVariance(input),
    semanticReferenceIntegrity: scoreSemanticReferenceIntegrity(input),
    recursiveRealityFeedbackRisk: scoreRecursiveRealityFeedbackRisk(input),
    ontologyRealityTension: scoreOntologyRealityTension(input),
    semanticRealityPersistence: scoreSemanticRealityPersistence(input),
    observerRealityFixationRisk: scoreObserverRealityFixationRisk(input),
    semanticBeliefHardening: scoreSemanticBeliefHardening(input),
    recursiveNarrativeEntrenchment: scoreRecursiveNarrativeEntrenchment(input),
    ontologyFlexibilityLoss: scoreOntologyFlexibilityLoss(input),
    semanticPerspectiveLock: scoreSemanticPerspectiveLock(input),
    worldviewRigidityAmplification: scoreWorldviewRigidityAmplification(input),
    observerMeaningInertia: scoreObserverMeaningInertia(input),
    semanticAdaptationResistance: scoreSemanticAdaptationResistance(input),
    measuredAt: new Date().toISOString(),
  };
}
