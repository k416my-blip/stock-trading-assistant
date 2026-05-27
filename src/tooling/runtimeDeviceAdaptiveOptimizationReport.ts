import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export type RuntimeDeviceAdaptiveOptimizationStaticReport = {
  freezeTag: 'runtime-freeze-v1';
  detectedDeviceTiers: string[];
  thermalThrottlingBehavior: string[];
  batterySaverBehavior: string[];
  hydrationPacingBehavior: string[];
  bridgeCongestionProtection: string[];
  frameStarvationPrevention: string[];
  adaptiveRecoveryScaling: string[];
  instrumentationCoverage: Array<{
    file: string;
    bytes: number;
    deviceAdaptiveReferences: number;
    thermalReferences: number;
    batteryReferences: number;
    bridgeReferences: number;
    hydrationReferences: number;
    recoveryReferences: number;
  }>;
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

const root = process.cwd();
const files = [
  'src/services/runtimeDeviceAdaptiveOptimization.ts',
  'src/hooks/useDeferredRenderActivation.ts',
  'App.tsx',
  'src/context/ProactiveConciergeContext.tsx',
  'src/services/runtimeSelfHealingSystem.ts',
  'src/services/adaptiveRuntimeGovernor.ts',
  'src/services/productionRuntimeProfiler.ts',
  'src/services/runtimeMemoryPressureDefense.ts',
  'src/services/runtimeChaosResilience.ts',
  'src/services/mobileStabilityWatchdog.ts',
];

function sourceFor(file: string): string {
  const absolute = join(root, file);
  return existsSync(absolute) ? readFileSync(absolute, 'utf8') : '';
}

function count(source: string, pattern: RegExp): number {
  return source.match(pattern)?.length ?? 0;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function buildRuntimeDeviceAdaptiveOptimizationReport(): RuntimeDeviceAdaptiveOptimizationStaticReport {
  const rows = files.map((file) => {
    const absolute = join(root, file);
    const source = sourceFor(file);
    return {
      file: relative(root, absolute).replace(/\\/g, '/'),
      bytes: existsSync(absolute) ? statSync(absolute).size : 0,
      deviceAdaptiveReferences: count(source, /runtimeDeviceAdaptiveOptimization|DeviceAdaptive|device-aware|device adaptive/gi),
      thermalReferences: count(source, /thermal|thermal_slowdown|thermalRiskScore/gi),
      batteryReferences: count(source, /battery|batterySaver|batteryPressureScore/gi),
      bridgeReferences: count(source, /bridge|bridgeCongestion|bridge_congestion/gi),
      hydrationReferences: count(source, /hydration|deferred|throughput/gi),
      recoveryReferences: count(source, /recovery|resume|pacing|scaling/gi),
    };
  });
  const joined = files.map(sourceFor).join('\n');
  const deviceRefs = count(joined, /getDeviceCapabilityProfile|decideDeviceAdaptiveHydration|shouldPaceDeviceAwareRuntimeActivity/g);
  const thermalRefs = count(joined, /thermal_slowdown_mode|thermalRiskScore|thermalStateEstimate|thermal/g);
  const batteryRefs = count(joined, /battery_degradation_mode|batteryPressureScore|batterySaverDetected|battery/g);
  const bridgeRefs = count(joined, /bridge_congestion_protection|bridgeCongestionScore|bridgeCongestionEstimate|bridge/g);
  const hydrationRefs = count(joined, /hydration_pacing|hydrationThroughput|background_hydration_suppression|decideDeviceAdaptiveHydration/g);
  const frameRefs = count(joined, /frameStarvation|frameBudget|frame starvation|frame/g);
  const recoveryRefs = count(joined, /adaptive_recovery_scaling|noteDeviceAdaptiveAppState|recoveryScalingScore|reconnect_pacing/g);

  return {
    freezeTag: 'runtime-freeze-v1',
    detectedDeviceTiers: [
      'RAM tier: high / standard / low / unknown from native memory class or heuristic fallback.',
      'Android performance class: flagship / standard / constrained / degraded.',
      'Runtime adaptive tier: flagship / standard / constrained / degraded from thermal, battery, bridge, frame, and memory risk.',
    ],
    thermalThrottlingBehavior: [
      'Moderate or worse thermal estimate increases low-priority hydration delay.',
      'Thermal slowdown mode is diagnostic and scoped to hydration/background pacing.',
      'Thermal risk contributes to degraded/constrained device tiering.',
    ],
    batterySaverBehavior: [
      'Battery saver triggers low-power hydration pacing for analytics/archive/proactive work.',
      'Battery saver can extend low-priority runtime pacing and reconnect pacing diagnostics.',
      'Interaction priority is preserved under battery-aware mode.',
    ],
    hydrationPacingBehavior: [
      'Hydration batch size is estimated from runtime adaptive tier.',
      'Background hydration is suppressed for low-priority work on constrained/degraded devices.',
      'Frame-safe hydration scheduling is layered before self-healing/governor activation.',
    ],
    bridgeCongestionProtection: [
      'Bridge congestion is estimated from production profiler and native bridge pending estimate.',
      'High bridge congestion delays heavy dashboard and analytics hydration.',
      'Navigation and interaction priority remain protected.',
    ],
    frameStarvationPrevention: [
      'Frame budget estimate expands on constrained/degraded devices.',
      'Frame starvation risk feeds adaptive tiering through production profiler.',
      'Mount burst prevention is applied through deferred hydration pacing.',
    ],
    adaptiveRecoveryScaling: [
      'AppState active records foreground staged recovery and interaction-priority recovery.',
      'Reconnect/proactive scopes are paced when device tier is constrained/degraded.',
      'Queue backpressure recovery is represented through hydration throughput and retry pacing.',
    ],
    instrumentationCoverage: rows,
    metrics: {
      thermalRiskScore: round(Math.min(1, thermalRefs / 14)),
      batteryPressureScore: round(Math.min(1, batteryRefs / 14)),
      bridgeCongestionScore: round(Math.min(1, bridgeRefs / 14)),
      frameStarvationRiskScore: round(Math.min(1, frameRefs / 18)),
      hydrationThroughputScore: round(Math.min(1, hydrationRefs / 18)),
      recoveryScalingScore: round(Math.min(1, recoveryRefs / 12)),
      adaptiveOptimizationScore: round(Math.min(1, deviceRefs / 10)),
    },
  };
}

if (require.main === module) {
  console.log(JSON.stringify(buildRuntimeDeviceAdaptiveOptimizationReport(), null, 2));
}
