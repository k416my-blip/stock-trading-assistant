import { RUNTIME_ADAPTIVE_OBSERVATION_VERSION } from '../constants/runtimeAdaptiveObservation';
import type {
  RuntimeAdaptiveObservationExportBundle,
  RuntimeAdaptiveObservationObserveInput,
} from '../types/runtimeAdaptiveObservation';
import {
  getLastRuntimeAdaptiveObservationProfile,
  getRuntimeAdaptiveObservationSuggestions,
} from './adaptiveObservationCoordinator';
import { buildRuntimeAdaptiveObservationProfile } from './adaptiveObservationScorers';
import { getAdaptiveObservationTimeline } from './adaptiveObservationTimeline';
import {
  buildDashboardOverloadMonitor,
  buildObservationPressureHeatmap,
  buildObservationQueueVisualization,
  buildRecursiveSignalTopology,
  buildSemanticHotPathGraph,
  buildSemanticRoutingMap,
} from './adaptiveObservationVisualizations';

const defaultInput = (): RuntimeAdaptiveObservationObserveInput => ({
  semanticPhaseVolatility: 0.18,
  semanticStateTransitionVelocity: 0.16,
  meaningPhaseInstability: 0.16,
  ontologyStateShiftRisk: 0.14,
  semanticCrystallizationPressure: 0.12,
  semanticFluidityIndex: 0.72,
  ontologyRigidityGradient: 0.14,
  observerStateSynchronizationRisk: 0.12,
  observerPhaseLockRisk: 0.1,
  semanticStateCollapseRisk: 0.08,
  semanticFlowTurbulence: 0.14,
  semanticCirculationStress: 0.12,
  recursiveMeaningCurrent: 0.12,
  semanticPressureFlow: 0.12,
  observerInterpretationConvection: 0.12,
  worldviewDiffusionInstability: 0.1,
  ontologyCollectiveDrift: 0.1,
  semanticStatePersistence: 0.1,
  recursiveOntologyElasticity: 0.72,
  dashboardHeatRetention: 0.12,
  recursiveEnergyFeedback: 0.1,
  replayHeatAmplification: 0.1,
  semanticNoiseDominance: 0.1,
  ontologyFlowFragmentation: 0.1,
  observerThermalFatigue: 0.12,
  cognitiveHeatOverload: 0.12,
  metricThermalEquilibriumFailure: 0.1,
  observerDependencyLoopRisk: 0.1,
  topologyCollapseRisk: 0.08,
  compressionRatio: 0.72,
  boundednessConfidence: 0.74,
  metricContainmentRatio: 0.72,
  dashboardSemanticCrowding: 0.12,
  operatorSemanticFatigue: 0.12,
  replayAmplificationRisk: 0.1,
  observerChainDepth: 2,
  dashboardAttentionStressBase: 0.12,
  runtimeSignalJitterBase: 0.1,
  recursiveTelemetryDensityBase: 0.1,
  semanticMonitoringFatigueBase: 0.12,
  semanticHotPathIntensityBase: 0.1,
  semanticQueueFragmentationBase: 0.1,
  semanticPriorityCollapseBase: 0.08,
});

export function buildRuntimeAdaptiveObservationExportBundle(): RuntimeAdaptiveObservationExportBundle {
  const profile = getLastRuntimeAdaptiveObservationProfile();
  const fallback = buildRuntimeAdaptiveObservationProfile(defaultInput());
  const exportProfile = profile ?? fallback;
  return {
    version: RUNTIME_ADAPTIVE_OBSERVATION_VERSION,
    exportedAt: new Date().toISOString(),
    observationLoadAnalysis: {
      pressureHeatmap: buildObservationPressureHeatmap(exportProfile),
      load: profile?.observerAttentionLoad,
      timeline: getAdaptiveObservationTimeline(),
    },
    adaptiveRoutingReport: {
      routingMap: buildSemanticRoutingMap(exportProfile),
      routingComplexity: profile?.observationRoutingComplexity,
    },
    telemetryCongestionAnalysis: {
      recursiveTopology: buildRecursiveSignalTopology(exportProfile),
      floodRisk: profile?.telemetryFloodRisk,
    },
    semanticOverloadReport: {
      hotPath: buildSemanticHotPathGraph(exportProfile),
      sheddingPressure: profile?.semanticLoadSheddingPressure,
    },
    observerFatigueAnalysis: {
      overloadMonitor: buildDashboardOverloadMonitor(exportProfile),
      fatigue: profile?.semanticMonitoringFatigue,
    },
    recursiveMonitoringTopology: {
      queue: buildObservationQueueVisualization(exportProfile),
      recursiveDensity: profile?.recursiveTelemetryDensity,
    },
    suggestions: getRuntimeAdaptiveObservationSuggestions(),
    profile,
  };
}

export function formatRuntimeAdaptiveObservationExportJson(): string {
  return JSON.stringify(buildRuntimeAdaptiveObservationExportBundle(), null, 2);
}
