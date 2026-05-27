export {
  initRuntimeTelemetryEntropy,
  observeRuntimeTelemetryEntropy,
  shouldRunRuntimeTelemetryEntropySample,
  getLastRuntimeTelemetryEntropyProfile,
  getRuntimeTelemetryEntropyDashboard,
  resetRuntimeTelemetryEntropyForTest,
  setRuntimeTelemetryEntropySoakHookEnabled,
} from './telemetryEntropyCoordinator';

export { runTelemetryEntropyFlows } from './telemetryEntropyOrchestrator';
export {
  buildRuntimeTelemetryEntropyExportBundle,
  formatRuntimeTelemetryEntropyExportJson,
} from './telemetryEntropyExports';
export { getTelemetryEntropyTimeline } from './telemetryEntropyTimeline';
export {
  simulateRecursiveSignalDuplicationReplay,
  simulateExportStormReplay,
  simulateReplayAmplificationBurstReplay,
  simulateDashboardSaturationFloodReplay,
  simulateTelemetryOrphanAccumulationReplay,
  simulateTimelineFragmentationReplay,
  simulateStaleMetricPersistenceReplay,
  simulateCompressionFailureCascadeReplay,
} from './telemetryEntropySoakIntegration';
