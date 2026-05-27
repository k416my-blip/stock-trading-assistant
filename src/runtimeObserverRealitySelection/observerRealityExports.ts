import { RUNTIME_OBSERVER_REALITY_VERSION } from '../constants/runtimeObserverRealitySelection';
import type {
  RuntimeObserverRealityExportBundle,
  RuntimeObserverRealityObserveInput,
} from '../types/runtimeObserverRealitySelection';
import {
  getLastRuntimeObserverRealityProfile,
  getRuntimeObserverRealitySuggestions,
} from './observerRealityCoordinator';
import { buildRuntimeObserverRealityProfile } from './observerRealityScorers';
import { getObserverRealityTimeline } from './observerRealityTimeline';
import {
  buildNarrativeRealityCouplingHeatmap,
  buildObserverFixationMonitor,
  buildRealitySelectionTopology,
  buildRecursiveInterpretationTree,
  buildSemanticCausalityGraph,
  buildWorldviewDivergenceRadar,
} from './observerRealityVisualizations';

const defaultInput = (): RuntimeObserverRealityObserveInput => ({
  observerAttentionLoad: 0.12,
  runtimeObservationPressure: 0.12,
  recursiveTelemetryDensity: 0.1,
  dashboardAttentionStress: 0.12,
  semanticHotPathIntensity: 0.1,
  observerCognitiveQueueDepth: 0.1,
  metricObservationBurstRisk: 0.1,
  semanticMonitoringFatigue: 0.12,
  observationRoutingComplexity: 0.1,
  semanticPriorityRoutingPressure: 0.1,
  observerSignalCompetition: 0.1,
  recursiveAttentionCollision: 0.1,
  metricRoutingInstability: 0.1,
  crossLayerObservationCongestion: 0.1,
  semanticQueueFragmentation: 0.1,
  observerFocusDrift: 0.1,
  telemetryFloodRisk: 0.1,
  recursiveReplayPressure: 0.1,
  dashboardSignalOverflow: 0.1,
  semanticBandwidthExhaustion: 0.1,
  observerInterpretationBacklog: 0.1,
  ontologyMonitoringCongestion: 0.1,
  runtimeSignalJitter: 0.1,
  recursiveNoiseAmplification: 0.1,
  semanticLoadSheddingPressure: 0.1,
  metricRetentionStress: 0.1,
  observerDiscardConflict: 0.1,
  semanticPriorityCollapse: 0.1,
  recursiveSignalSuppressionRisk: 0.1,
  dashboardCompressionPressure: 0.1,
  semanticSignalDecayRisk: 0.1,
  runtimeAttentionExhaustion: 0.1,
  semanticPhaseVolatility: 0.1,
  meaningPhaseInstability: 0.1,
  ontologyStateShiftRisk: 0.1,
  observerPhaseLockRisk: 0.08,
  semanticStateCollapseRisk: 0.08,
  observerStateSynchronizationRisk: 0.1,
  semanticFluidityIndex: 0.72,
  ontologyCollectiveDrift: 0.1,
});

export function buildRuntimeObserverRealityExportBundle(): RuntimeObserverRealityExportBundle {
  const profile = getLastRuntimeObserverRealityProfile();
  const fallback = buildRuntimeObserverRealityProfile(defaultInput());
  const exportProfile = profile ?? fallback;
  return {
    version: RUNTIME_OBSERVER_REALITY_VERSION,
    exportedAt: new Date().toISOString(),
    observerRealityAnalysis: {
      topology: buildRealitySelectionTopology(exportProfile),
      selectionPressure: profile?.observerRealitySelectionPressure,
      timeline: getObserverRealityTimeline(),
    },
    semanticCausalityDriftReport: {
      graph: buildSemanticCausalityGraph(exportProfile),
      drift: profile?.semanticCausalityDrift,
    },
    recursiveInterpretationReport: {
      tree: buildRecursiveInterpretationTree(exportProfile),
      branching: profile?.recursiveInterpretationBranching,
    },
    worldviewDivergenceAnalysis: {
      radar: buildWorldviewDivergenceRadar(exportProfile),
      variance: profile?.worldviewRealityVariance,
    },
    narrativeRealityCouplingReport: {
      heatmap: buildNarrativeRealityCouplingHeatmap(exportProfile),
      stress: profile?.narrativeRealityCouplingStress,
    },
    observerFixationAnalysis: {
      monitor: buildObserverFixationMonitor(exportProfile),
      fixationRisk: profile?.observerRealityFixationRisk,
    },
    suggestions: getRuntimeObserverRealitySuggestions(),
    profile,
  };
}

export function formatRuntimeObserverRealityExportJson(): string {
  return JSON.stringify(buildRuntimeObserverRealityExportBundle(), null, 2);
}
