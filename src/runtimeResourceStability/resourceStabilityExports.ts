import type { RuntimeResourceStabilityExportBundle } from '../types/runtimeResourceStability';
import { RUNTIME_RESOURCE_STABILITY_VERSION } from '../constants/runtimeResourceStability';
import { getLastRuntimeResourceStabilityProfile } from './resourceStabilityCoordinator';
import { buildSaturationGauge } from './resourceSaturationGaugeBuilder';
import { buildDriftRadar } from './resourceDriftRadarBuilder';

const empty = {
  eventLoopLagMs: 0,
  renderFps: 30,
  jsHeapMb: 80,
  memoryTrendPct: 0,
  sessionMinutes: 0,
  bridgeTrafficRate: 0,
  renderStormRisk: 0,
  reconnectPerMin: 0,
  hydrationOverlapCount: 0,
  batterySaver: false,
  appForeground: true,
  screenOff: false,
  observerOverheadRatio: 0.2,
  telemetryAmplificationScore: 0.15,
  thermalState: 'none',
};

export function buildRuntimeResourceStabilityExportBundle(): RuntimeResourceStabilityExportBundle {
  const profile = getLastRuntimeResourceStabilityProfile();
  return {
    version: RUNTIME_RESOURCE_STABILITY_VERSION,
    exportedAt: new Date().toISOString(),
    resourceStabilityReport: { profile },
    memoryPressureReport: { gauge: buildSaturationGauge(empty) },
    threadLatencyReport: { radar: buildDriftRadar(empty) },
    renderStormReport: {},
    telemetryPayloadReport: {},
    batteryRiskReport: {},
    resourceDriftReport: {},
    profile,
  };
}

export function formatRuntimeResourceStabilityExportJson(): string {
  return JSON.stringify(buildRuntimeResourceStabilityExportBundle(), null, 2);
}
