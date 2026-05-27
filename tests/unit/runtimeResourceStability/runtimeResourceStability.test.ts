import { beforeEach, describe, expect, it } from 'vitest';
import {
  initRuntimeResourceStability,
  observeRuntimeResourceStability,
  shouldRunRuntimeResourceStabilitySample,
  getRuntimeResourceStabilityDashboard,
  resetRuntimeResourceStabilityForTest,
} from '../../../src/runtimeResourceStability';

function baseInput() {
  return {
    eventLoopLagMs: 90,
    renderFps: 20,
    jsHeapMb: 100,
    memoryTrendPct: 20,
    sessionMinutes: 40,
    bridgeTrafficRate: 3,
    renderStormRisk: 0.12,
    reconnectPerMin: 1,
    hydrationOverlapCount: 0,
    batterySaver: false,
    appForeground: true,
    screenOff: false,
    observerOverheadRatio: 0.22,
    telemetryAmplificationScore: 0.16,
    thermalState: 'none',
  };
}

describe('runtimeResourceStability', () => {
  beforeEach(() => resetRuntimeResourceStabilityForTest());

  it('observes resource profile', () => {
    initRuntimeResourceStability();
    const p = observeRuntimeResourceStability(baseInput());
    expect(p.runtimeMemoryPressure).toBeGreaterThan(0);
    expect(getRuntimeResourceStabilityDashboard()?.saturationGauge.length).toBe(7);
  });

  it('throttles samples', () => {
    initRuntimeResourceStability();
    expect(shouldRunRuntimeResourceStabilitySample(baseInput())).toBe(true);
    expect(shouldRunRuntimeResourceStabilitySample(baseInput())).toBe(false);
  });
});
