import type {
  RuntimeAdaptiveObservationObserveInput,
  RuntimeAdaptiveObservationProfile,
} from '../types/runtimeAdaptiveObservation';

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;
const invert = (value: number): number => 1 - Math.max(0, Math.min(1, value));
const chainPressure = (input: RuntimeAdaptiveObservationObserveInput): number =>
  round(Math.min(1, input.observerChainDepth / 10));

export function resetAdaptiveObservationScorersForTest(): void {
  /* stateless */
}

export function scoreObserverAttentionLoad(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(input.cognitiveHeatOverload * 0.25 + input.observerThermalFatigue * 0.25 + input.observerStateSynchronizationRisk * 0.25 + input.dashboardAttentionStressBase * 0.25);
}

export function scoreRuntimeObservationPressure(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(input.semanticStateTransitionVelocity * 0.25 + input.runtimeSignalJitterBase * 0.25 + input.dashboardSemanticCrowding * 0.25 + input.topologyCollapseRisk * 0.25);
}

export function scoreRecursiveTelemetryDensity(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(input.recursiveEnergyFeedback * 0.25 + input.replayAmplificationRisk * 0.25 + input.recursiveMeaningCurrent * 0.25 + chainPressure(input) * 0.25);
}

export function scoreDashboardAttentionStress(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(input.dashboardHeatRetention * 0.3 + input.dashboardSemanticCrowding * 0.25 + input.cognitiveHeatOverload * 0.25 + input.semanticNoiseDominance * 0.2);
}

export function scoreSemanticHotPathIntensity(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(input.semanticPressureFlow * 0.25 + input.semanticCirculationStress * 0.25 + input.semanticFlowTurbulence * 0.25 + input.semanticPhaseVolatility * 0.25);
}

export function scoreObserverCognitiveQueueDepth(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(input.operatorSemanticFatigue * 0.3 + input.observerInterpretationConvection * 0.25 + scoreObserverAttentionLoad(input) * 0.25 + chainPressure(input) * 0.2);
}

export function scoreMetricObservationBurstRisk(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(input.metricThermalEquilibriumFailure * 0.25 + input.metricContainmentRatio * -0.2 + 0.2 + input.recursiveTelemetryDensityBase * 0.25 + input.semanticStateTransitionVelocity * 0.3);
}

export function scoreSemanticMonitoringFatigue(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(input.operatorSemanticFatigue * 0.3 + input.semanticMonitoringFatigueBase * 0.25 + input.observerThermalFatigue * 0.25 + input.semanticNoiseDominance * 0.2);
}

export function scoreObservationRoutingComplexity(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(scoreRuntimeObservationPressure(input) * 0.25 + input.observerDependencyLoopRisk * 0.25 + input.topologyCollapseRisk * 0.25 + input.ontologyCollectiveDrift * 0.25);
}

export function scoreSemanticPriorityRoutingPressure(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(input.semanticCrystallizationPressure * 0.25 + input.semanticHotPathIntensityBase * 0.25 + input.semanticPressureFlow * 0.25 + input.ontologyRigidityGradient * 0.25);
}

export function scoreObserverSignalCompetition(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(scoreObserverAttentionLoad(input) * 0.3 + scoreSemanticHotPathIntensity(input) * 0.25 + input.semanticNoiseDominance * 0.25 + input.dashboardAttentionStressBase * 0.2);
}

export function scoreRecursiveAttentionCollision(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(scoreRecursiveTelemetryDensity(input) * 0.3 + input.recursiveEnergyFeedback * 0.25 + input.observerDependencyLoopRisk * 0.25 + input.observerPhaseLockRisk * 0.2);
}

export function scoreMetricRoutingInstability(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(input.metricThermalEquilibriumFailure * 0.3 + input.metricContainmentRatio * -0.25 + 0.25 + input.semanticQueueFragmentationBase * 0.25 + input.runtimeSignalJitterBase * 0.2);
}

export function scoreCrossLayerObservationCongestion(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(scoreObservationRoutingComplexity(input) * 0.25 + input.dashboardSemanticCrowding * 0.25 + input.ontologyFlowFragmentation * 0.25 + input.topologyCollapseRisk * 0.25);
}

export function scoreSemanticQueueFragmentation(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(input.worldviewDiffusionInstability * 0.25 + input.semanticNoiseDominance * 0.25 + input.ontologyFlowFragmentation * 0.25 + input.meaningPhaseInstability * 0.25);
}

export function scoreObserverFocusDrift(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(input.observerInterpretationConvection * 0.25 + input.operatorSemanticFatigue * 0.25 + input.semanticNoiseDominance * 0.25 + input.observerStateSynchronizationRisk * 0.25);
}

export function scoreTelemetryFloodRisk(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(scoreRecursiveTelemetryDensity(input) * 0.3 + input.replayAmplificationRisk * 0.25 + input.replayHeatAmplification * 0.25 + input.semanticStateTransitionVelocity * 0.2);
}

export function scoreRecursiveReplayPressure(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(input.replayAmplificationRisk * 0.3 + input.replayHeatAmplification * 0.25 + input.recursiveEnergyFeedback * 0.25 + input.recursiveMeaningCurrent * 0.2);
}

export function scoreDashboardSignalOverflow(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(scoreDashboardAttentionStress(input) * 0.3 + input.dashboardSemanticCrowding * 0.25 + input.dashboardHeatRetention * 0.25 + input.semanticNoiseDominance * 0.2);
}

export function scoreSemanticBandwidthExhaustion(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(scoreSemanticHotPathIntensity(input) * 0.25 + input.semanticNoiseDominance * 0.25 + input.semanticStateCollapseRisk * 0.25 + invert(input.semanticFluidityIndex) * 0.25);
}

export function scoreObserverInterpretationBacklog(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(scoreObserverCognitiveQueueDepth(input) * 0.3 + input.observerInterpretationConvection * 0.25 + input.operatorSemanticFatigue * 0.25 + input.observerThermalFatigue * 0.2);
}

export function scoreOntologyMonitoringCongestion(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(input.ontologyStateShiftRisk * 0.25 + input.ontologyFlowFragmentation * 0.25 + input.ontologyRigidityGradient * 0.25 + input.ontologyCollectiveDrift * 0.25);
}

export function scoreRuntimeSignalJitter(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(input.semanticStateTransitionVelocity * 0.25 + input.semanticPhaseVolatility * 0.25 + input.semanticFlowTurbulence * 0.25 + input.runtimeSignalJitterBase * 0.25);
}

export function scoreRecursiveNoiseAmplification(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(input.semanticNoiseDominance * 0.3 + scoreRecursiveTelemetryDensity(input) * 0.25 + input.replayAmplificationRisk * 0.25 + input.recursiveEnergyFeedback * 0.2);
}

export function scoreSemanticLoadSheddingPressure(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(scoreTelemetryFloodRisk(input) * 0.25 + scoreSemanticBandwidthExhaustion(input) * 0.25 + scoreRuntimeAttentionExhaustion(input) * 0.25 + scoreDashboardSignalOverflow(input) * 0.25);
}

export function scoreMetricRetentionStress(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(input.metricThermalEquilibriumFailure * 0.3 + invert(input.metricContainmentRatio) * 0.25 + scoreMetricObservationBurstRisk(input) * 0.25 + input.dashboardSemanticCrowding * 0.2);
}

export function scoreObserverDiscardConflict(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(scoreObserverSignalCompetition(input) * 0.25 + scoreObserverFocusDrift(input) * 0.25 + scoreObserverInterpretationBacklog(input) * 0.25 + input.semanticPriorityCollapseBase * 0.25);
}

export function scoreSemanticPriorityCollapse(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(input.semanticStateCollapseRisk * 0.25 + scoreSemanticBandwidthExhaustion(input) * 0.25 + input.semanticCrystallizationPressure * 0.25 + input.semanticPriorityCollapseBase * 0.25);
}

export function scoreRecursiveSignalSuppressionRisk(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(scoreRecursiveAttentionCollision(input) * 0.25 + scoreRecursiveNoiseAmplification(input) * 0.25 + input.recursiveEnergyFeedback * 0.25 + input.observerDependencyLoopRisk * 0.25);
}

export function scoreDashboardCompressionPressure(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(scoreDashboardSignalOverflow(input) * 0.3 + invert(input.compressionRatio) * 0.25 + input.dashboardSemanticCrowding * 0.25 + input.dashboardHeatRetention * 0.2);
}

export function scoreSemanticSignalDecayRisk(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(input.semanticStateCollapseRisk * 0.25 + invert(input.semanticFluidityIndex) * 0.25 + input.semanticNoiseDominance * 0.25 + invert(input.boundednessConfidence) * 0.25);
}

export function scoreRuntimeAttentionExhaustion(input: RuntimeAdaptiveObservationObserveInput): number {
  return round(scoreObserverAttentionLoad(input) * 0.3 + scoreSemanticMonitoringFatigue(input) * 0.25 + scoreDashboardAttentionStress(input) * 0.25 + scoreObserverCognitiveQueueDepth(input) * 0.2);
}

export function buildRuntimeAdaptiveObservationProfile(
  input: RuntimeAdaptiveObservationObserveInput,
): RuntimeAdaptiveObservationProfile {
  return {
    observerAttentionLoad: scoreObserverAttentionLoad(input),
    runtimeObservationPressure: scoreRuntimeObservationPressure(input),
    recursiveTelemetryDensity: scoreRecursiveTelemetryDensity(input),
    dashboardAttentionStress: scoreDashboardAttentionStress(input),
    semanticHotPathIntensity: scoreSemanticHotPathIntensity(input),
    observerCognitiveQueueDepth: scoreObserverCognitiveQueueDepth(input),
    metricObservationBurstRisk: scoreMetricObservationBurstRisk(input),
    semanticMonitoringFatigue: scoreSemanticMonitoringFatigue(input),
    observationRoutingComplexity: scoreObservationRoutingComplexity(input),
    semanticPriorityRoutingPressure: scoreSemanticPriorityRoutingPressure(input),
    observerSignalCompetition: scoreObserverSignalCompetition(input),
    recursiveAttentionCollision: scoreRecursiveAttentionCollision(input),
    metricRoutingInstability: scoreMetricRoutingInstability(input),
    crossLayerObservationCongestion: scoreCrossLayerObservationCongestion(input),
    semanticQueueFragmentation: scoreSemanticQueueFragmentation(input),
    observerFocusDrift: scoreObserverFocusDrift(input),
    telemetryFloodRisk: scoreTelemetryFloodRisk(input),
    recursiveReplayPressure: scoreRecursiveReplayPressure(input),
    dashboardSignalOverflow: scoreDashboardSignalOverflow(input),
    semanticBandwidthExhaustion: scoreSemanticBandwidthExhaustion(input),
    observerInterpretationBacklog: scoreObserverInterpretationBacklog(input),
    ontologyMonitoringCongestion: scoreOntologyMonitoringCongestion(input),
    runtimeSignalJitter: scoreRuntimeSignalJitter(input),
    recursiveNoiseAmplification: scoreRecursiveNoiseAmplification(input),
    semanticLoadSheddingPressure: scoreSemanticLoadSheddingPressure(input),
    metricRetentionStress: scoreMetricRetentionStress(input),
    observerDiscardConflict: scoreObserverDiscardConflict(input),
    semanticPriorityCollapse: scoreSemanticPriorityCollapse(input),
    recursiveSignalSuppressionRisk: scoreRecursiveSignalSuppressionRisk(input),
    dashboardCompressionPressure: scoreDashboardCompressionPressure(input),
    semanticSignalDecayRisk: scoreSemanticSignalDecayRisk(input),
    runtimeAttentionExhaustion: scoreRuntimeAttentionExhaustion(input),
    measuredAt: new Date().toISOString(),
  };
}
