import type { RuntimeTelemetryEntropyExportBundle } from '../types/runtimeTelemetryEntropy';
import { RUNTIME_TELEMETRY_ENTROPY_VERSION } from '../constants/runtimeTelemetryEntropy';
import { getLastRuntimeTelemetryEntropyProfile } from './telemetryEntropyCoordinator';
import { getSignalGovernanceSuggestionsRecent } from './signalGovernanceRecorder';
import { getTelemetryEntropyTimeline } from './telemetryEntropyTimeline';
import {
  buildEntropyHeatmap,
  buildSignalDuplicationGraph,
  buildDashboardSaturationRadar,
  buildExportPayloadHistogram,
} from './entropyVisualizationBuilders';

const defaultInput = (): import('../types/runtimeTelemetryEntropy').RuntimeTelemetryEntropyObserveInput => ({
  eventLoopLagMs: 0,
  renderFps: 30,
  jsHeapMb: 80,
  memoryTrendPct: 0,
  sessionMinutes: 0,
  asyncQueueDepth: 2,
  reconnectPerMin: 0,
  replayCount: 0,
  telemetrySampleCount: 10,
  dashboardRowCount: 8,
  exportBytesEstimate: 32_000,
  timelineEventCount: 20,
  uniqueSignalKinds: 8,
  duplicateSignalRatio: 0.1,
  compressionRatio: 0.7,
  snapshotWriteRate: 8,
  observerOverheadRatio: 0.15,
  telemetryAmplificationScore: 0.12,
  soakReplayHooksActive: 0,
});

export function buildRuntimeTelemetryEntropyExportBundle(): RuntimeTelemetryEntropyExportBundle {
  const profile = getLastRuntimeTelemetryEntropyProfile();
  const input = defaultInput();
  return {
    version: RUNTIME_TELEMETRY_ENTROPY_VERSION,
    exportedAt: new Date().toISOString(),
    telemetryEntropyReport: { profile, heatmap: buildEntropyHeatmap(input), timeline: getTelemetryEntropyTimeline() },
    replayAmplificationReport: { profile, replayCount: input.replayCount },
    signalDuplicationTopology: { graph: buildSignalDuplicationGraph(input) },
    exportPayloadAnalysis: { histogram: buildExportPayloadHistogram(input), profile },
    dashboardSaturationAnalysis: { radar: buildDashboardSaturationRadar(input), profile },
    governanceSuggestions: getSignalGovernanceSuggestionsRecent(24),
    profile,
  };
}

export function formatRuntimeTelemetryEntropyExportJson(): string {
  return JSON.stringify(buildRuntimeTelemetryEntropyExportBundle(), null, 2);
}
