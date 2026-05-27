import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildRuntimeAdaptiveObservationExportBundle,
  getRuntimeAdaptiveObservationDashboard,
  initRuntimeAdaptiveObservation,
  observeRuntimeAdaptiveObservation,
  resetRuntimeAdaptiveObservationForTest,
  shouldRunRuntimeAdaptiveObservationSample,
} from '../../../src/runtimeAdaptiveObservation';

function baseInput() {
  return {
    semanticPhaseVolatility: 0.72,
    semanticStateTransitionVelocity: 0.7,
    meaningPhaseInstability: 0.7,
    ontologyStateShiftRisk: 0.68,
    semanticCrystallizationPressure: 0.66,
    semanticFluidityIndex: 0.34,
    ontologyRigidityGradient: 0.66,
    observerStateSynchronizationRisk: 0.7,
    observerPhaseLockRisk: 0.68,
    semanticStateCollapseRisk: 0.66,
    semanticFlowTurbulence: 0.72,
    semanticCirculationStress: 0.7,
    recursiveMeaningCurrent: 0.7,
    semanticPressureFlow: 0.7,
    observerInterpretationConvection: 0.68,
    worldviewDiffusionInstability: 0.68,
    ontologyCollectiveDrift: 0.66,
    semanticStatePersistence: 0.7,
    recursiveOntologyElasticity: 0.32,
    dashboardHeatRetention: 0.7,
    recursiveEnergyFeedback: 0.72,
    replayHeatAmplification: 0.72,
    semanticNoiseDominance: 0.7,
    ontologyFlowFragmentation: 0.68,
    observerThermalFatigue: 0.7,
    cognitiveHeatOverload: 0.72,
    metricThermalEquilibriumFailure: 0.68,
    observerDependencyLoopRisk: 0.68,
    topologyCollapseRisk: 0.66,
    compressionRatio: 0.34,
    boundednessConfidence: 0.34,
    metricContainmentRatio: 0.32,
    dashboardSemanticCrowding: 0.72,
    operatorSemanticFatigue: 0.7,
    replayAmplificationRisk: 0.72,
    observerChainDepth: 8,
    dashboardAttentionStressBase: 0.72,
    runtimeSignalJitterBase: 0.68,
    recursiveTelemetryDensityBase: 0.7,
    semanticMonitoringFatigueBase: 0.72,
    semanticHotPathIntensityBase: 0.7,
    semanticQueueFragmentationBase: 0.68,
    semanticPriorityCollapseBase: 0.66,
  };
}

describe('runtimeAdaptiveObservation', () => {
  beforeEach(() => resetRuntimeAdaptiveObservationForTest());

  it('observes adaptive observation profile and dashboard', () => {
    initRuntimeAdaptiveObservation();
    const p = observeRuntimeAdaptiveObservation(baseInput());
    expect(p.observerAttentionLoad).toBeGreaterThan(0);
    expect(p.runtimeObservationPressure).toBeGreaterThan(0);
    expect(p.recursiveTelemetryDensity).toBeGreaterThan(0);
    expect(p.dashboardAttentionStress).toBeGreaterThan(0);
    expect(p.semanticHotPathIntensity).toBeGreaterThan(0);
    expect(p.observationRoutingComplexity).toBeGreaterThan(0);
    expect(p.telemetryFloodRisk).toBeGreaterThan(0);
    expect(p.semanticLoadSheddingPressure).toBeGreaterThan(0);

    const dash = getRuntimeAdaptiveObservationDashboard();
    expect(dash?.observationPressureHeatmap.length).toBeGreaterThan(0);
    expect(dash?.semanticHotPathGraph.nodes.length).toBeGreaterThan(0);
    expect(dash?.observerAttentionRadar.length).toBeGreaterThan(0);
    expect(dash?.telemetryCongestionTimeline.length).toBeGreaterThan(0);
    expect(dash?.recursiveSignalTopology.nodes.length).toBeGreaterThan(0);
    expect(dash?.dashboardOverloadMonitor.length).toBeGreaterThan(0);
    expect(dash?.semanticRoutingMap.nodes.length).toBeGreaterThan(0);
    expect(dash?.observationQueueVisualization.length).toBeGreaterThan(0);
  });

  it('records observe-only suggestions', () => {
    initRuntimeAdaptiveObservation();
    observeRuntimeAdaptiveObservation(baseInput());
    const dash = getRuntimeAdaptiveObservationDashboard();
    expect(dash?.suggestions.every((s) => s.observeOnly)).toBe(true);
  });

  it('throttles samples', () => {
    initRuntimeAdaptiveObservation();
    expect(shouldRunRuntimeAdaptiveObservationSample(baseInput())).toBe(true);
    expect(shouldRunRuntimeAdaptiveObservationSample(baseInput())).toBe(false);
  });

  it('exports adaptive observation sections', () => {
    initRuntimeAdaptiveObservation();
    observeRuntimeAdaptiveObservation(baseInput());
    const bundle = buildRuntimeAdaptiveObservationExportBundle();
    expect(bundle.observationLoadAnalysis).toBeTruthy();
    expect(bundle.adaptiveRoutingReport).toBeTruthy();
    expect(bundle.telemetryCongestionAnalysis).toBeTruthy();
    expect(bundle.semanticOverloadReport).toBeTruthy();
    expect(bundle.observerFatigueAnalysis).toBeTruthy();
    expect(bundle.recursiveMonitoringTopology).toBeTruthy();
  });
});
