/**
 * Runtime Resource Stability — observe-only; no kill/GC/cleanup.
 */
import type {
  RuntimeResourceStabilityDashboard,
  RuntimeResourceStabilityObserveInput,
  RuntimeResourceStabilityProfile,
} from '../types/runtimeResourceStability';
import {
  RUNTIME_RESOURCE_STABILITY_POLL_MS,
  RUNTIME_RESOURCE_STABILITY_UI_JA,
} from '../constants/runtimeResourceStability';
import { scoreResourceStability } from './runtimeResourceStabilityCoordinator';
import { scoreRuntimeMemoryPressure } from './memoryPressureMonitor';
import { scoreRuntimeThreadLatencyRisk } from './threadLatencyMonitor';
import { scoreRuntimeRenderStormRisk } from './renderStormMonitor';
import { scoreRuntimeEventQueueRisk } from './eventQueueSaturationDetector';
import { scoreRuntimeTelemetryPayloadRisk } from './telemetryPayloadExplosionDetector';
import { scoreRuntimeBatteryRisk } from './batteryDegradationRiskTracker';
import { scoreRuntimeBackgroundObserverRisk } from './backgroundObserverAccumulationTracker';
import { buildSaturationGauge } from './resourceSaturationGaugeBuilder';
import { buildDriftRadar } from './resourceDriftRadarBuilder';
import { runResourceStabilityFlows } from './resourceStabilityOrchestrator';
import {
  getResourceStabilityTimelineRecent,
  resetResourceStabilityTimelineForTest,
} from './resourceStabilityTimeline';
import { resetResourceStabilitySoakIntegrationForTest, setResourceStabilitySoakHook } from './resourceStabilitySoakIntegration';

let lastProfile: RuntimeResourceStabilityProfile | null = null;
let lastGauge: { label: string; level: number }[] = [];
let lastRadar: { axis: string; value: number }[] = [];
let lastThrottleAt = 0;

export function resetRuntimeResourceStabilityForTest(): void {
  lastProfile = null;
  lastGauge = [];
  lastRadar = [];
  lastThrottleAt = 0;
  resetResourceStabilityTimelineForTest();
  resetResourceStabilitySoakIntegrationForTest();
}

export function initRuntimeResourceStability(): void {
  lastThrottleAt = 0;
}

export function setRuntimeResourceStabilitySoakHookEnabled(enabled: boolean): void {
  setResourceStabilitySoakHook(enabled);
}

export function shouldRunRuntimeResourceStabilitySample(
  _input: RuntimeResourceStabilityObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < RUNTIME_RESOURCE_STABILITY_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeRuntimeResourceStability(
  input: RuntimeResourceStabilityObserveInput,
): RuntimeResourceStabilityProfile {
  runResourceStabilityFlows(input);
  lastGauge = buildSaturationGauge(input);
  lastRadar = buildDriftRadar(input);

  const profile: RuntimeResourceStabilityProfile = {
    runtimeMemoryPressure: scoreRuntimeMemoryPressure(input),
    runtimeThreadLatencyRisk: scoreRuntimeThreadLatencyRisk(input),
    runtimeRenderStormRisk: scoreRuntimeRenderStormRisk(input),
    runtimeEventQueueRisk: scoreRuntimeEventQueueRisk(input),
    runtimeTelemetryPayloadRisk: scoreRuntimeTelemetryPayloadRisk(input),
    runtimeBatteryRisk: scoreRuntimeBatteryRisk(input),
    runtimeBackgroundObserverRisk: scoreRuntimeBackgroundObserverRisk(input),
    resourceStabilityScore: scoreResourceStability(input),
    measuredAt: new Date().toISOString(),
  };

  lastProfile = profile;
  return profile;
}

export function getLastRuntimeResourceStabilityProfile(): RuntimeResourceStabilityProfile | null {
  return lastProfile;
}

export function getRuntimeResourceStabilityDashboard(): RuntimeResourceStabilityDashboard | null {
  if (!lastProfile) return null;
  return {
    titleJa: RUNTIME_RESOURCE_STABILITY_UI_JA.sectionTitle,
    safetyBannerJa: RUNTIME_RESOURCE_STABILITY_UI_JA.safety,
    profile: lastProfile,
    saturationGauge: lastGauge,
    driftRadar: lastRadar,
    timelineRecent: getResourceStabilityTimelineRecent(6),
  };
}
