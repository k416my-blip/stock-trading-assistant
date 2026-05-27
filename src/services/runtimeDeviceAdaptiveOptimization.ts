import type { AppStateStatus } from 'react-native';
import { getAdaptiveRuntimeGovernorReport, type RuntimeHydrationPriority } from './adaptiveRuntimeGovernor';
import { getPerformanceCostSnapshot } from './performanceCostRuntime';
import { getProductionRuntimeProfilingReport } from './productionRuntimeProfiler';
import { getRuntimeChaosResilienceReport } from './runtimeChaosResilience';
import { evaluateRuntimeAnomalies } from './runtimeSelfHealingSystem';
import { getRuntimeFrameTelemetryReport } from './runtimeFrameTelemetry';
import { getRuntimeMemoryPressureDefenseReport } from './runtimeMemoryPressureDefense';
import { getLastNativeRuntimeSnapshot } from '../native/runtime/nativeRuntimeBridge';

export type DeviceAdaptiveRuntimeTier = 'flagship' | 'standard' | 'constrained' | 'degraded';
export type DeviceRamTier = 'high' | 'standard' | 'low' | 'unknown';
export type DevicePerformanceClass = 'flagship' | 'standard' | 'constrained' | 'degraded';

export type DeviceAdaptiveEventKind =
  | 'device_profile_sample'
  | 'thermal_slowdown_mode'
  | 'battery_degradation_mode'
  | 'bridge_congestion_protection'
  | 'hydration_pacing'
  | 'reconnect_pacing'
  | 'appstate_resume_pacing'
  | 'adaptive_recovery_scaling'
  | 'background_hydration_suppression'
  | 'interaction_priority_recovery';

export type DeviceAdaptiveEvent = {
  at: string;
  kind: DeviceAdaptiveEventKind;
  label: string;
  tier: DeviceAdaptiveRuntimeTier;
  value?: number;
  detail?: string;
};

export type DeviceCapabilityProfile = {
  ramTier: DeviceRamTier;
  androidPerformanceClass: DevicePerformanceClass;
  runtimeAdaptiveTier: DeviceAdaptiveRuntimeTier;
  thermalStateEstimate: string;
  batterySaverDetected: boolean;
  backgroundRestrictionDetected: boolean;
  frameBudgetMs: number;
  bridgeCongestionEstimate: number;
  hydrationThroughputEstimate: number;
  source: 'native' | 'heuristic';
};

export type DeviceAdaptiveDecision = {
  allow: boolean;
  delayMs: number;
  batchSize: number;
  tier: DeviceAdaptiveRuntimeTier;
  reason: string;
};

export type RuntimeDeviceAdaptiveOptimizationReport = {
  deviceCapabilityReport: DeviceCapabilityProfile;
  adaptiveRuntimeReport: DeviceAdaptiveEvent[];
  thermalRecoveryReport: DeviceAdaptiveEvent[];
  hydrationPacingReport: DeviceAdaptiveEvent[];
  bridgeCongestionReport: DeviceAdaptiveEvent[];
  batteryDegradationReport: DeviceAdaptiveEvent[];
  metrics: {
    thermalRiskScore: number;
    batteryPressureScore: number;
    bridgeCongestionScore: number;
    frameStarvationRiskScore: number;
    hydrationThroughputScore: number;
    recoveryScalingScore: number;
    adaptiveOptimizationScore: number;
  };
};

const MAX_EVENTS = 220;
const events: DeviceAdaptiveEvent[] = [];
let hydrationPacingCount = 0;
let reconnectPacingCount = 0;
let recoveryScalingCount = 0;
let thermalSlowdownCount = 0;
let batteryDegradationCount = 0;
let bridgeProtectionCount = 0;

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function record(
  kind: DeviceAdaptiveEventKind,
  label: string,
  tier: DeviceAdaptiveRuntimeTier,
  value?: number,
  detail?: string,
): void {
  events.push({ at: new Date().toISOString(), kind, label, tier, value, detail });
  if (events.length > MAX_EVENTS) events.shift();
}

function ramTier(memoryClassMb?: number, lowRam?: boolean): DeviceRamTier {
  if (lowRam) return 'low';
  if (typeof memoryClassMb !== 'number' || memoryClassMb <= 0) return 'unknown';
  if (memoryClassMb >= 384) return 'high';
  if (memoryClassMb >= 192) return 'standard';
  return 'low';
}

function tierFromRisks(
  thermalRisk: number,
  batteryRisk: number,
  bridgeRisk: number,
  frameRisk: number,
  memoryRisk: number,
): DeviceAdaptiveRuntimeTier {
  const risk = Math.max(thermalRisk, batteryRisk, bridgeRisk, frameRisk, memoryRisk);
  if (risk >= 0.75) return 'degraded';
  if (risk >= 0.5) return 'constrained';
  if (risk >= 0.25) return 'standard';
  return 'flagship';
}

function thermalRiskFor(status: string | undefined): number {
  if (status === 'shutdown' || status === 'emergency' || status === 'critical' || status === 'severe') return 0.9;
  if (status === 'moderate') return 0.6;
  if (status === 'light') return 0.25;
  return 0;
}

function frameBudgetForTier(tier: DeviceAdaptiveRuntimeTier): number {
  if (tier === 'flagship') return 16.7;
  if (tier === 'standard') return 24;
  if (tier === 'constrained') return 33.4;
  return 48;
}

function hydrationThroughputForTier(tier: DeviceAdaptiveRuntimeTier): number {
  if (tier === 'flagship') return 4;
  if (tier === 'standard') return 3;
  if (tier === 'constrained') return 2;
  return 1;
}

export function getDeviceCapabilityProfile(): DeviceCapabilityProfile {
  const native = getLastNativeRuntimeSnapshot();
  const performance = getPerformanceCostSnapshot();
  const production = getProductionRuntimeProfilingReport();
  const memory = getRuntimeMemoryPressureDefenseReport();
  const frame = getRuntimeFrameTelemetryReport();
  const selfHealing = evaluateRuntimeAnomalies();
  const ram = ramTier(native?.memoryClass.memoryClassMb, native?.memoryClass.isLowRamDevice);
  const thermalRisk = Math.max(
    thermalRiskFor(native?.thermalStatus),
    selfHealing.androidDegradationReport.bridgeCongestionRisk * 0.3,
  );
  const batteryRisk = performance.batterySaverActive || native?.batterySaverActive ? 0.75 : 0;
  const bridgeRisk = Math.max(
    production.expoRuntimeReport.bridgeCongestionEstimates / 12,
    (native?.bridgePendingEstimate ?? 0) / 20,
  );
  const frameRisk = Math.max(
    1 - production.metrics.frameStabilityScore,
    frame.mobileFramePressureReport.longTaskCount / 30,
    (native?.droppedFramesEstimate ?? 0) / 60,
  );
  const memoryRisk = Math.max(
    1 - memory.metrics.mobileMemoryResilienceScore,
    (native?.nativeMemoryPressurePct ?? 0) / 100,
    native?.memoryClass.isLowRamDevice ? 0.65 : 0,
  );
  const tier = tierFromRisks(
    clamp01(thermalRisk),
    clamp01(batteryRisk),
    clamp01(bridgeRisk),
    clamp01(frameRisk),
    clamp01(memoryRisk),
  );
  const performanceClass: DevicePerformanceClass =
    ram === 'high' && tier === 'flagship'
      ? 'flagship'
      : ram === 'low' || tier === 'degraded'
        ? 'degraded'
        : tier === 'constrained'
          ? 'constrained'
          : 'standard';
  const profile: DeviceCapabilityProfile = {
    ramTier: ram,
    androidPerformanceClass: performanceClass,
    runtimeAdaptiveTier: tier,
    thermalStateEstimate: native?.thermalStatus ?? (thermalRisk >= 0.6 ? 'moderate' : 'none'),
    batterySaverDetected: performance.batterySaverActive || native?.batterySaverActive === true,
    backgroundRestrictionDetected:
      !performance.appForeground ||
      native?.backgroundReclaimDetected === true ||
      native?.miuiAggressiveReclaim === true,
    frameBudgetMs: frameBudgetForTier(tier),
    bridgeCongestionEstimate: round(clamp01(bridgeRisk)),
    hydrationThroughputEstimate: hydrationThroughputForTier(tier),
    source: native?.source === 'native' ? 'native' : 'heuristic',
  };
  record('device_profile_sample', 'device-capability', tier, profile.frameBudgetMs, `ram=${ram};source=${profile.source}`);
  return profile;
}

function baseDelayForTier(tier: DeviceAdaptiveRuntimeTier, priority: RuntimeHydrationPriority): number {
  if (priority === 'interaction') return tier === 'degraded' ? 120 : 0;
  if (tier === 'flagship') return 0;
  if (tier === 'standard') return priority === 'archive' ? 900 : priority === 'analytics' ? 500 : 240;
  if (tier === 'constrained') return priority === 'archive' ? 2_400 : priority === 'analytics' ? 1_400 : 800;
  return priority === 'archive' ? 7_500 : priority === 'analytics' ? 4_500 : 2_400;
}

export function decideDeviceAdaptiveHydration(
  label: string,
  priority: RuntimeHydrationPriority,
  appState: AppStateStatus,
): DeviceAdaptiveDecision {
  const profile = getDeviceCapabilityProfile();
  const lowPriority = priority === 'archive' || priority === 'analytics' || priority === 'proactive';
  const background = appState !== 'active' || profile.backgroundRestrictionDetected;
  const thermalSlowdown =
    profile.thermalStateEstimate === 'moderate' ||
    profile.thermalStateEstimate === 'severe' ||
    profile.thermalStateEstimate === 'critical' ||
    profile.thermalStateEstimate === 'emergency' ||
    profile.thermalStateEstimate === 'shutdown';
  let delayMs = baseDelayForTier(profile.runtimeAdaptiveTier, priority);
  if (profile.batterySaverDetected && lowPriority) delayMs = Math.max(delayMs, 6_000);
  if (thermalSlowdown && lowPriority) delayMs = Math.max(delayMs, 8_000);
  if (profile.bridgeCongestionEstimate >= 0.5 && lowPriority) delayMs = Math.max(delayMs, 3_000);
  const allow = !(lowPriority && background && profile.runtimeAdaptiveTier !== 'flagship');
  const reason = [
    `tier=${profile.runtimeAdaptiveTier}`,
    `ram=${profile.ramTier}`,
    `thermal=${profile.thermalStateEstimate}`,
    `battery=${profile.batterySaverDetected}`,
    `bridge=${profile.bridgeCongestionEstimate}`,
    `background=${background}`,
  ].join(';');

  hydrationPacingCount += 1;
  record('hydration_pacing', label, profile.runtimeAdaptiveTier, delayMs, reason);
  if (!allow) record('background_hydration_suppression', label, profile.runtimeAdaptiveTier, delayMs, reason);
  if (thermalSlowdown) {
    thermalSlowdownCount += 1;
    record('thermal_slowdown_mode', label, profile.runtimeAdaptiveTier, delayMs, reason);
  }
  if (profile.batterySaverDetected) {
    batteryDegradationCount += 1;
    record('battery_degradation_mode', label, profile.runtimeAdaptiveTier, delayMs, reason);
  }
  if (profile.bridgeCongestionEstimate >= 0.5) {
    bridgeProtectionCount += 1;
    record('bridge_congestion_protection', label, profile.runtimeAdaptiveTier, profile.bridgeCongestionEstimate, reason);
  }

  return {
    allow,
    delayMs,
    batchSize: Math.max(1, Math.floor(profile.hydrationThroughputEstimate)),
    tier: profile.runtimeAdaptiveTier,
    reason,
  };
}

export function shouldPaceDeviceAwareRuntimeActivity(scope: string): DeviceAdaptiveDecision {
  const profile = getDeviceCapabilityProfile();
  const lowPriority =
    scope.includes('proactive') ||
    scope.includes('deferred') ||
    scope.includes('dashboard') ||
    scope.includes('analytics') ||
    scope.includes('archive');
  if (!lowPriority) {
    return { allow: true, delayMs: 0, batchSize: 1, tier: profile.runtimeAdaptiveTier, reason: 'priority preserved' };
  }
  const delayMs =
    profile.runtimeAdaptiveTier === 'degraded'
      ? 12_000
      : profile.runtimeAdaptiveTier === 'constrained'
        ? 6_000
        : profile.batterySaverDetected
          ? 4_000
          : 0;
  const allow = !(profile.runtimeAdaptiveTier === 'degraded' && profile.backgroundRestrictionDetected);
  reconnectPacingCount += 1;
  record('reconnect_pacing', scope, profile.runtimeAdaptiveTier, delayMs, `allow=${allow}`);
  return { allow, delayMs, batchSize: 1, tier: profile.runtimeAdaptiveTier, reason: `device-aware runtime pacing;allow=${allow}` };
}

export function noteDeviceAdaptiveAppState(nextState: AppStateStatus): void {
  const profile = getDeviceCapabilityProfile();
  if (nextState === 'active') {
    recoveryScalingCount += 1;
    record('appstate_resume_pacing', 'AppState', profile.runtimeAdaptiveTier, profile.frameBudgetMs, 'foreground staged recovery');
    record('adaptive_recovery_scaling', 'AppState', profile.runtimeAdaptiveTier, profile.hydrationThroughputEstimate);
    record('interaction_priority_recovery', 'AppState', profile.runtimeAdaptiveTier);
  } else {
    record('background_hydration_suppression', 'AppState', profile.runtimeAdaptiveTier, undefined, nextState);
  }
}

export function getRuntimeDeviceAdaptiveOptimizationReport(): RuntimeDeviceAdaptiveOptimizationReport {
  const profile = getDeviceCapabilityProfile();
  const production = getProductionRuntimeProfilingReport();
  const governor = getAdaptiveRuntimeGovernorReport();
  const chaos = getRuntimeChaosResilienceReport();
  const thermalRiskScore = round(clamp01(thermalRiskFor(profile.thermalStateEstimate) + thermalSlowdownCount / 80));
  const batteryPressureScore = round(clamp01((profile.batterySaverDetected ? 0.7 : 0) + batteryDegradationCount / 80));
  const bridgeCongestionScore = round(
    clamp01(Math.max(profile.bridgeCongestionEstimate, production.expoRuntimeReport.bridgeCongestionEstimates / 20)),
  );
  const frameStarvationRiskScore = round(
    clamp01(1 - production.metrics.frameStabilityScore + production.frameStabilityReport.frameStarvationEvents / 20),
  );
  const hydrationThroughputScore = round(
    clamp01(profile.hydrationThroughputEstimate / 4 - governor.hydrationSuppressionDiagnostics.length / 80),
  );
  const recoveryScalingScore = round(clamp01(1 - chaos.retryStormReport.retryCascadeCount / 20 + recoveryScalingCount / 100));
  const adaptiveOptimizationScore = round(
    1 -
      Math.min(
        0.9,
        (thermalRiskScore +
          batteryPressureScore +
          bridgeCongestionScore +
          frameStarvationRiskScore +
          (1 - hydrationThroughputScore) +
          (1 - recoveryScalingScore)) /
          6,
      ),
  );

  return {
    deviceCapabilityReport: profile,
    adaptiveRuntimeReport: [...events],
    thermalRecoveryReport: events.filter((event) => event.kind === 'thermal_slowdown_mode' || event.kind === 'adaptive_recovery_scaling'),
    hydrationPacingReport: events.filter((event) => event.kind === 'hydration_pacing' || event.kind === 'background_hydration_suppression'),
    bridgeCongestionReport: events.filter((event) => event.kind === 'bridge_congestion_protection'),
    batteryDegradationReport: events.filter((event) => event.kind === 'battery_degradation_mode'),
    metrics: {
      thermalRiskScore,
      batteryPressureScore,
      bridgeCongestionScore,
      frameStarvationRiskScore,
      hydrationThroughputScore,
      recoveryScalingScore,
      adaptiveOptimizationScore,
    },
  };
}

export function resetRuntimeDeviceAdaptiveOptimizationForTest(): void {
  events.length = 0;
  hydrationPacingCount = 0;
  reconnectPacingCount = 0;
  recoveryScalingCount = 0;
  thermalSlowdownCount = 0;
  batteryDegradationCount = 0;
  bridgeProtectionCount = 0;
}
