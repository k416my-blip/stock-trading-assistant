import type { MetaOrchestrationExportBundle } from '../types/metaRuntimeOrchestration';
import { META_RUNTIME_ORCHESTRATION_VERSION } from '../constants/metaRuntimeOrchestration';
import { getMetaOrchestrationTimeline } from './metaOrchestrationTimeline';
import {
  getLastMetaOrchestrationProfile,
  getLastMetaInteractionGraph,
} from './metaOrchestrationCoordinator';
import { getEquilibriumEvolution } from './globalSurvivabilityEquilibriumEngine';
import { getRuntimeFatigueEvolution } from './runtimeFatigueCoordinator';
import { scoreSurvivabilityConflict } from './survivabilityConflictDetector';
import { detectActiveConflicts } from './survivabilityConflictDetector';

function emptyInput(): import('../types/metaRuntimeOrchestration').MetaOrchestrationObserveInput {
  return {
    eventLoopLagMs: 0,
    renderFps: 30,
    jsHeapMb: 80,
    memoryTrendPct: 0,
    thermalState: 'none',
    appForeground: true,
    screenOff: false,
    batterySaver: false,
    miuiAggressiveReclaim: false,
    sessionMinutes: 0,
    hydrationOverlapCount: 0,
    bridgeTrafficRate: 0,
    renderStormRisk: 0,
    reconnectPerMin: 0,
    recoverySuccessRate: 1,
    continuityScore: 100,
    jsSurvivalScore: 100,
    governanceConfidence: 1,
    governanceMode: 'full_observe',
    observerOverheadRatio: 0,
    runtimeSafeTradingScore: 100,
    causalConfidence: 1,
    rootCauseScore: 0,
    schedulerDriftMs: 0,
    staleHydrationRisk: 0,
  };
}

export function buildOrchestrationTimelineExport(): MetaOrchestrationExportBundle['orchestrationTimeline'] {
  return getMetaOrchestrationTimeline();
}

export function buildSurvivabilityConflictReportExport(): Record<string, unknown> {
  const profile = getLastMetaOrchestrationProfile();
  const input = emptyInput();
  return {
    survivabilityConflictScore: profile?.survivabilityConflictScore ?? scoreSurvivabilityConflict(input),
    activeConflicts: detectActiveConflicts(input),
    exportedAt: new Date().toISOString(),
  };
}

export function buildPacingGraphExport(): MetaOrchestrationExportBundle['pacingGraph'] {
  return (
    getLastMetaInteractionGraph() ?? {
      nodes: [],
      edges: [],
      measuredAt: new Date().toISOString(),
    }
  );
}

export function buildInterventionHeatmapExport(): Record<string, number> {
  return lastHeatmapFromProfile();
}

export function buildMetaOrchestrationExportBundle(): MetaOrchestrationExportBundle {
  return {
    version: META_RUNTIME_ORCHESTRATION_VERSION,
    exportedAt: new Date().toISOString(),
    orchestrationTimeline: buildOrchestrationTimelineExport(),
    survivabilityConflictReport: buildSurvivabilityConflictReportExport(),
    equilibriumEvolution: getEquilibriumEvolution(),
    pacingGraph: buildPacingGraphExport(),
    interventionHeatmap: lastHeatmapFromProfile(),
    runtimeFatigueEvolution: getRuntimeFatigueEvolution(),
    profile: getLastMetaOrchestrationProfile(),
  };
}

function lastHeatmapFromProfile(): Record<string, number> {
  const graph = getLastMetaInteractionGraph();
  if (!graph) return {};
  const heatmap: Record<string, number> = {};
  for (const n of graph.nodes) heatmap[n.id] = n.pressure;
  for (const e of graph.edges) heatmap[`${e.from}_${e.to}`] = e.contention;
  return heatmap;
}

export function formatMetaOrchestrationExportJson(): string {
  return JSON.stringify(buildMetaOrchestrationExportBundle(), null, 2);
}
