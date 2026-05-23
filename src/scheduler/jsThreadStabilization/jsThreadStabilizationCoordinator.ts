/**
 * JS Thread Contention & Scheduler Drift Stabilization — monitoring/scheduling only.
 * Does not alter runtime policy layers or telemetry metric meanings.
 */
import type {
  JsSchedulerMode,
  JsThreadStabilizationDashboard,
  JsThreadStabilizationProfile,
  StabilizationObserveInput,
} from '../../types/jsThreadSchedulerStabilization';
import { JS_STABILIZATION_UI_JA } from '../../constants/jsThreadSchedulerStabilization';
import { profileEventLoopStall, resetEventLoopStallProfilerForTest } from './eventLoopStallProfiler';
import { noteSchedulerTick, getSchedulerDriftMs, resetSchedulerDriftTrackerForTest } from './schedulerDriftTracker';
import { reconcileMonotonicNow, getTimerSkewMs, resetMonotonicClockReconciliationForTest } from './monotonicClockReconciliation';
import { resetTimerCoalescingForTest } from './timerCoalescing';
import { getIdleBudgetUsage, resetIdleBudgetWindow, resetIdleCallbackSchedulingForTest } from './idleCallbackScheduling';
import { resetInteractionAwareSchedulingForTest } from './interactionAwareScheduling';
import { observeGcSpike, resetGcSpikeDetectorForTest } from './gcSpikeDetector';
import {
  trackHermesHeapPressure,
  isHermesGcCooldownActive,
  resetHermesHeapPressureTrackerForTest,
} from './hermesHeapPressureTracker';
import { resetJsTaskBudgetAllocatorForTest } from './jsTaskBudgetAllocator';
import { getRenderFrameCost, resetDashboardFrameBudgetForTest } from './dashboardFrameBudget';
import { getCallbackDensity, noteChoreographerCallback, resetChoreographerCallbackLimiterForTest } from './choreographerCallbackLimiter';
import {
  shouldThrottleAnimationFrame,
  degradeFrameObserver,
  resetAnimationFrameThrottlingForTest,
} from './animationFrameThrottling';
import { degradedTimerIntervalMs } from './backgroundTimerDegradation';
import { resolveScreenOffMode, screenOffTimerReductionFactor } from './screenOffSchedulerMode';
import { resolveAdaptivePollingMs } from './adaptivePollingInterval';
import { maybeResyncLongSessionTimers, noteLongSessionStart, resetLongSessionTimerResyncForTest } from './longSessionTimerResync';
import {
  beginFreezeRecovery,
  completeFreezeRecovery,
  getSchedulerRecoveryLatency,
  resetFreezeSafeSchedulerRecoveryForTest,
} from './freezeSafeSchedulerRecovery';
import { attachSurvivalScore } from './jsThreadSurvivalScoring';
import { getCooperativeYieldCount, resetCooperativeYieldCounterForTest } from './cooperativeYieldCounter';

let lastProfile: JsThreadStabilizationProfile | null = null;
let lastMode: JsSchedulerMode = 'full';
let lastPollMs = 15_000;
let lastThrottleAt = 0;

export function resetJsThreadStabilizationForTest(): void {
  lastProfile = null;
  lastMode = 'full';
  lastPollMs = 15_000;
  lastThrottleAt = 0;
  resetEventLoopStallProfilerForTest();
  resetSchedulerDriftTrackerForTest();
  resetMonotonicClockReconciliationForTest();
  resetTimerCoalescingForTest();
  resetIdleCallbackSchedulingForTest();
  resetInteractionAwareSchedulingForTest();
  resetGcSpikeDetectorForTest();
  resetHermesHeapPressureTrackerForTest();
  resetJsTaskBudgetAllocatorForTest();
  resetDashboardFrameBudgetForTest();
  resetChoreographerCallbackLimiterForTest();
  resetAnimationFrameThrottlingForTest();
  resetLongSessionTimerResyncForTest();
  resetFreezeSafeSchedulerRecoveryForTest();
  resetCooperativeYieldCounterForTest();
}

export { noteCooperativeYield } from './cooperativeYieldCounter';
export { exportWithCooperativeYield } from './exportCooperativeYielding';

function resolveMode(input: StabilizationObserveInput): JsSchedulerMode {
  if (input.eventLoopLagMs >= 480) return 'freeze_safe';
  if (['severe', 'critical', 'emergency', 'shutdown'].includes(input.thermalState)) {
    return 'thermal_suppressed';
  }
  const screenOff = resolveScreenOffMode(input.screenOff);
  if (screenOff) return screenOff;
  if (input.batterySaver) return 'battery_lightweight';
  if (!input.appForeground) return 'background_degraded';
  if (input.memoryTrendPct > 75 || input.renderFps < 14) return 'low_refresh';
  return 'full';
}

export function getStabilizationPollingIntervalMs(input: StabilizationObserveInput): number {
  const mode = resolveMode(input);
  lastMode = mode;
  const base = 15_000;
  let ms = resolveAdaptivePollingMs(mode, base);
  if (!input.appForeground) ms = degradedTimerIntervalMs(ms, false);
  if (input.screenOff) ms *= screenOffTimerReductionFactor();
  lastPollMs = ms;
  return ms;
}

export function shouldRunStabilizationSample(input: StabilizationObserveInput, now = Date.now()): boolean {
  const interval = getStabilizationPollingIntervalMs(input);
  if (now - lastThrottleAt < interval) return false;
  lastThrottleAt = now;
  return true;
}

export function observeJsThreadStabilization(input: StabilizationObserveInput): JsThreadStabilizationProfile {
  reconcileMonotonicNow();
  maybeResyncLongSessionTimers();

  const stall = profileEventLoopStall(input.eventLoopLagMs);
  if (stall.frozen) beginFreezeRecovery();
  else if (getSchedulerRecoveryLatency() === 0 && stall.lagMs < 200) completeFreezeRecovery();

  const drift = noteSchedulerTick(lastPollMs);
  const gcSpike = observeGcSpike(input.jsHeapMb);
  const heapPressure = trackHermesHeapPressure(input.jsHeapMb, input.memoryTrendPct);
  if (isHermesGcCooldownActive()) {
    /* Hermes GC cooldown — stabilization paths only */
  }

  const mode = resolveMode(input);
  if (mode === 'thermal_suppressed') noteChoreographerCallback();
  if (mode !== 'full') degradeFrameObserver();
  if (shouldThrottleAnimationFrame()) {
    /* dashboard observer degradation */
  }

  const jsFramePressure = Math.min(
    1,
    (input.renderFps < 12 ? 0.9 : input.renderFps < 16 ? 0.5 : 0.15) +
      getRenderFrameCost() / 32,
  );

  const profile = attachSurvivalScore({
    eventLoopLagMs: stall.lagMs,
    schedulerDriftMs: Math.max(getSchedulerDriftMs(), drift),
    gcSpikeMs: gcSpike,
    jsFramePressure: Math.round(jsFramePressure * 1000) / 1000,
    callbackDensity: Math.round(getCallbackDensity() * 1000) / 1000,
    timerSkew: getTimerSkewMs(),
    idleBudgetUsage: Math.round(getIdleBudgetUsage() * 1000) / 1000,
    renderFrameCost: getRenderFrameCost(),
    cooperativeYieldCount: getCooperativeYieldCount(),
    schedulerRecoveryLatency: getSchedulerRecoveryLatency(),
    mode,
    measuredAt: new Date().toISOString(),
  });

  lastProfile = profile;
  resetIdleBudgetWindow();
  return profile;
}

export function initJsThreadStabilization(): void {
  noteLongSessionStart();
}

export function getLastJsThreadStabilizationProfile(): JsThreadStabilizationProfile | null {
  return lastProfile;
}

export function getJsThreadStabilizationDashboard(): JsThreadStabilizationDashboard | null {
  if (!lastProfile) return null;
  return {
    titleJa: JS_STABILIZATION_UI_JA.sectionTitle,
    safetyBannerJa: JS_STABILIZATION_UI_JA.safety,
    profile: lastProfile,
  };
}

export function shouldAllowIdleOnlyExportContinuation(input: StabilizationObserveInput): boolean {
  return input.appForeground && input.eventLoopLagMs < 200 && lastMode !== 'thermal_suppressed';
}
