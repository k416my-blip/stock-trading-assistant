/**
 * RN Bridge Survivability — bridge/render/profile optimization only.
 */
import type {
  RnBridgeObserveInput,
  RnBridgeSurvivabilityDashboard,
  RnBridgeSurvivabilityProfile,
  RnSurvivabilityMode,
} from '../../types/rnBridgeSurvivability';
import { RN_SURVIVABILITY_UI_JA } from '../../constants/rnBridgeSurvivability';
import { profileBridgeTraffic, getBridgeTrafficRate } from './bridgeTrafficProfiler';
import { detectNativeBurstDensity } from './nativeToJsBurstDetector';
import { trackJsToNativeCongestion } from './jsToNativeCongestionTracker';
import { profileRenderPressure } from './renderPressureProfiler';
import { detectRenderStormRisk, noteRerenderBurst } from './reactRerenderStormDetector';
import { getObjectChurnRatePerMin } from './objectIdentityChurnTracker';
import { detectListenerLeakRisk } from './listenerLeakDetector';
import { observeClosureRetention } from './hermesClosureRetentionTracker';
import { estimateAsyncFragmentationScore } from './asyncStorageFragmentationEstimator';
import { memoizationEfficiency } from './dashboardMemoizationProfiler';
import { virtualizationPressure } from './flatListVirtualizationPressureTracker';
import { immutableReuseRatio, getImmutableMetrics } from './sharedImmutableMetricsCache';
import { noteMemoHit } from './dashboardMemoizationProfiler';
import { shouldSuppressBridge, resolveBackgroundBridgeMode } from './backgroundBridgeSuppression';
import { attachRnSurvivalScore } from './longSessionRnSurvivabilityScoring';
import { getNativeBoundaryTrace } from '../../native/runtime/nativeBoundaryTrace';

let lastProfile: RnBridgeSurvivabilityProfile | null = null;
let lastThrottleAt = 0;
let bridgeRecoveryMs = 0;

export function resetRnBridgeSurvivabilityForTest(): void {
  lastProfile = null;
  lastThrottleAt = 0;
  bridgeRecoveryMs = 0;
}

function resolveMode(input: RnBridgeObserveInput): RnSurvivabilityMode {
  const bg = resolveBackgroundBridgeMode(input.appForeground, input.screenOff);
  if (bg) return bg;
  if (['severe', 'critical', 'emergency', 'shutdown'].includes(input.thermalState)) {
    return 'thermal_bridge_cooldown';
  }
  if (input.memoryTrendPct > 80 || input.jsHeapMb > 200) return 'low_memory_reuse';
  if (input.renderFps < 14 || input.renderBurstRate > 16) return 'render_degraded';
  return 'full';
}

function pollingMs(mode: RnSurvivabilityMode): number {
  switch (mode) {
    case 'screen_off_suppressed':
    case 'background_suppressed':
      return 60_000;
    case 'thermal_bridge_cooldown':
      return 45_000;
    case 'low_memory_reuse':
      return 30_000;
    case 'render_degraded':
      return 20_000;
    default:
      return 15_000;
  }
}

export function shouldRunRnSurvivabilitySample(input: RnBridgeObserveInput, now = Date.now()): boolean {
  const mode = resolveMode(input);
  if (now - lastThrottleAt < pollingMs(mode)) return false;
  lastThrottleAt = now;
  return true;
}

export function initRnBridgeSurvivability(): void {
  lastThrottleAt = 0;
}

export function observeRnBridgeSurvivability(input: RnBridgeObserveInput): RnBridgeSurvivabilityProfile {
  if (shouldSuppressBridge(input.appForeground, input.screenOff)) {
    bridgeRecoveryMs = 0;
  } else {
    const started = Date.now();
    profileBridgeTraffic();
    bridgeRecoveryMs = Date.now() - started;
  }

  noteRerenderBurst(input.renderBurstRate > 12 ? 2 : 0);
  const storm = detectRenderStormRisk();
  const mode = resolveMode(input);

  const profile = attachRnSurvivalScore({
    bridgeTrafficRate: getBridgeTrafficRate(),
    nativeBurstDensity: Math.round(detectNativeBurstDensity() * 1000) / 1000,
    renderStormRisk: storm.risk,
    rerenderPerMinute: storm.perMinute,
    objectChurnRate: getObjectChurnRatePerMin(),
    listenerLeakRisk: Math.round(detectListenerLeakRisk() * 1000) / 1000,
    closureRetentionRisk: Math.round(observeClosureRetention(input.jsHeapMb) * 1000) / 1000,
    asyncFragmentationScore: Math.round(estimateAsyncFragmentationScore() * 1000) / 1000,
    memoizationEfficiency: memoizationEfficiency(),
    virtualizationPressure: virtualizationPressure(),
    immutableReuseRatio: immutableReuseRatio(),
    bridgeRecoveryLatency: bridgeRecoveryMs,
    mode,
    measuredAt: new Date().toISOString(),
  });

  lastProfile = profile;
  return profile;
}

export function getLastRnBridgeSurvivabilityProfile(): RnBridgeSurvivabilityProfile | null {
  return lastProfile;
}

export function getRnBridgeSurvivabilityDashboard(): RnBridgeSurvivabilityDashboard | null {
  if (!lastProfile) return null;
  return {
    titleJa: RN_SURVIVABILITY_UI_JA.sectionTitle,
    safetyBannerJa: RN_SURVIVABILITY_UI_JA.safety,
    profile: lastProfile,
  };
}

export function shouldDeferAsyncStorageFlush(input: RnBridgeObserveInput): boolean {
  return shouldSuppressBridge(input.appForeground, input.screenOff) || input.thermalState === 'severe';
}

export function getImmutableDashboardMetrics(
  key: string,
  input: RnBridgeObserveInput,
): Readonly<Record<string, unknown>> {
  const metrics = getImmutableMetrics(key, () => ({
    bridgeTrafficRate: getBridgeTrafficRate(),
    renderStormRisk: detectRenderStormRisk().risk,
    traceCount: getNativeBoundaryTrace(20).length,
    renderFps: input.renderFps,
  }));
  noteMemoHit();
  return metrics;
}
