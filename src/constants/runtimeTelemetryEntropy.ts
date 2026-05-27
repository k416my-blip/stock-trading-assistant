export const RUNTIME_TELEMETRY_ENTROPY_VERSION = '1.0.0';
export const RUNTIME_TELEMETRY_ENTROPY_POLL_MS = 32_000;
export const RUNTIME_TELEMETRY_ENTROPY_TIMELINE_MAX = 400;
export const RUNTIME_TELEMETRY_ENTROPY_LONG_SESSION_MIN = 120;

export const TELEMETRY_SIGNAL_LAYERS = [
  'observe',
  'timeline',
  'dashboard',
  'replay',
  'export',
] as const;

export const RUNTIME_TELEMETRY_ENTROPY_UI_JA = {
  sectionTitle: 'Telemetry Entropy & Signal Governance',
  safety:
    'observe-only signal governance — block/throttle/cleanup/export cancel 禁止。suggestion は記録のみ',
  signalEntropyScore: 'signalEntropyScore',
  telemetryDuplicationRisk: 'telemetryDuplicationRisk',
  replayAmplificationRisk: 'replayAmplificationRisk',
  metricCascadeRisk: 'metricCascadeRisk',
  dashboardSaturationRisk: 'dashboardSaturationRisk',
  exportPayloadRisk: 'exportPayloadRisk',
  timelineFragmentationRisk: 'timelineFragmentationRisk',
  staleTelemetryRatio: 'staleTelemetryRatio',
  orphanMetricCount: 'orphanMetricCount',
  zombieReplayHookCount: 'zombieReplayHookCount',
  unusedExportChainCount: 'unusedExportChainCount',
} as const;
