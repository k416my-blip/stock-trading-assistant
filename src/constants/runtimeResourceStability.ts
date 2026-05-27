export const RUNTIME_RESOURCE_STABILITY_VERSION = '1.0.0';
export const RUNTIME_RESOURCE_STABILITY_POLL_MS = 25_000;
export const RUNTIME_RESOURCE_STABILITY_TIMELINE_MAX = 400;

export const RUNTIME_RESOURCE_STABILITY_UI_JA = {
  sectionTitle: 'Resource Stability',
  safety: 'resource stability — observe-only。kill/GC/cleanup 禁止',
  runtimeMemoryPressure: 'runtimeMemoryPressure',
  runtimeThreadLatencyRisk: 'runtimeThreadLatencyRisk',
  runtimeRenderStormRisk: 'runtimeRenderStormRisk',
  runtimeEventQueueRisk: 'runtimeEventQueueRisk',
  runtimeTelemetryPayloadRisk: 'runtimeTelemetryPayloadRisk',
  runtimeBatteryRisk: 'runtimeBatteryRisk',
  runtimeBackgroundObserverRisk: 'runtimeBackgroundObserverRisk',
  timeline: 'resource stability timeline',
} as const;
