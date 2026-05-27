import { beforeEach, describe, expect, it } from 'vitest';
import {
  initRuntimeObserverRecursion,
  observeRuntimeObserverRecursion,
  shouldRunRuntimeObserverRecursionSample,
  getRuntimeObserverRecursionDashboard,
  resetRuntimeObserverRecursionForTest,
} from '../../../src/runtimeObserverRecursion';

function baseInput() {
  return {
    eventLoopLagMs: 90,
    renderFps: 20,
    jsHeapMb: 100,
    sessionMinutes: 40,
    observerOverheadRatio: 0.25,
    governanceConfidence: 0.82,
    governanceMode: 'full_observe',
    telemetryAmplificationScore: 0.18,
    runtimeAmplificationRisk: 0.16,
    observerDensityScore: 0.22,
    runtimeAuditCoverage: 0.55,
    orchestrationEdgeCount: 12,
    interventionDensity: 0.16,
    metaRecursionRisk: 0.14,
    bridgeTrafficRate: 3,
    reconnectPerMin: 1,
    runtimeTradingSuppression: 0.12,
  };
}

describe('runtimeObserverRecursion', () => {
  beforeEach(() => resetRuntimeObserverRecursionForTest());

  it('observes recursion profile and dashboard', () => {
    initRuntimeObserverRecursion();
    const p = observeRuntimeObserverRecursion(baseInput());
    expect(p.observerRecursionRisk).toBeGreaterThan(0);
    expect(getRuntimeObserverRecursionDashboard()?.observeGraph.nodes.length).toBeGreaterThan(0);
  });

  it('throttles samples', () => {
    initRuntimeObserverRecursion();
    expect(shouldRunRuntimeObserverRecursionSample(baseInput())).toBe(true);
    expect(shouldRunRuntimeObserverRecursionSample(baseInput())).toBe(false);
  });
});
