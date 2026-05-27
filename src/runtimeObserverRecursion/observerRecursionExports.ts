import type { RuntimeObserverRecursionExportBundle } from '../types/runtimeObserverRecursion';
import { RUNTIME_OBSERVER_RECURSION_VERSION } from '../constants/runtimeObserverRecursion';
import { getLastRuntimeObserverRecursionProfile } from './observerRecursionCoordinator';
import { getRecursionEvolution } from './runtimeObserverRecursionCoordinator';
import { buildObserveGraph, scoreObserverRecursionRisk } from './recursiveObserverCascadeModel';
import { scoreTelemetryAmplificationRisk } from './telemetryEchoInflationDetector';
import { buildDependencyGraph } from './observerDependencyGraphBuilder';
import { buildRecursionHeatmap } from './observerHeatmapBuilder';
import { getObserverRecursionTimeline } from './observerRecursionTimeline';

export function buildRuntimeObserverRecursionExportBundle(): RuntimeObserverRecursionExportBundle {
  const profile = getLastRuntimeObserverRecursionProfile();
  const input = {
    eventLoopLagMs: 0,
    renderFps: 30,
    jsHeapMb: 80,
    sessionMinutes: 0,
    observerOverheadRatio: 0.2,
    governanceConfidence: 0.8,
    governanceMode: 'full_observe',
    telemetryAmplificationScore: 0.15,
    runtimeAmplificationRisk: 0.15,
    observerDensityScore: 0.2,
    runtimeAuditCoverage: 0.5,
    orchestrationEdgeCount: 8,
    interventionDensity: 0.15,
    metaRecursionRisk: 0.1,
    bridgeTrafficRate: 2,
    reconnectPerMin: 0,
    runtimeTradingSuppression: 0.1,
  };
  return {
    version: RUNTIME_OBSERVER_RECURSION_VERSION,
    exportedAt: new Date().toISOString(),
    observerRecursionReport: { profile, evolution: getRecursionEvolution() },
    recursionAnalysis: { risk: scoreObserverRecursionRisk(input) },
    telemetryEchoReport: { risk: scoreTelemetryAmplificationRisk(input) },
    observeGraphExport: { graph: buildObserveGraph(input) },
    dependencyGraphExport: { graph: buildDependencyGraph(input) },
    amplificationHeatmap: { heatmap: buildRecursionHeatmap(input) },
    profile,
  };
}

export function formatRuntimeObserverRecursionExportJson(): string {
  return JSON.stringify(buildRuntimeObserverRecursionExportBundle(), null, 2);
}
