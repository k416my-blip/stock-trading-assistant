import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetFailureRecoveryForTest,
  observeFailureRecovery,
  shouldRunFailureRecoverySample,
  getFailureRecoveryDashboard,
  buildFailureRecoveryExportBundle,
  setFailureRecoverySoakHook,
} from '../../../src/recovery/failureRecovery';

function baseInput() {
  return {
    eventLoopLagMs: 80,
    renderFps: 18,
    renderBurstRate: 4,
    jsHeapMb: 110,
    memoryTrendPct: 25,
    thermalState: 'none',
    appForeground: true,
    screenOff: false,
    batterySaver: false,
    asyncQueueDepth: 3,
    reconnectPerMin: 1,
    wsDuplicateCount: 0,
    heartbeatAgeMs: 5_000,
    bridgeTrafficRate: 2,
    renderStormRisk: 0.2,
    miuiAggressiveReclaim: false,
  };
}

describe('failureRecovery', () => {
  beforeEach(() => {
    resetFailureRecoveryForTest();
    setFailureRecoverySoakHook(false);
  });

  it('observes self-healing profile', () => {
    const p = observeFailureRecovery(baseInput());
    expect(p.continuousRecoveryScore).toBeGreaterThan(0);
    expect(getFailureRecoveryDashboard()?.profile.degradationState).toBeDefined();
  });

  it('throttles recovery samples', () => {
    expect(shouldRunFailureRecoverySample(baseInput())).toBe(true);
    expect(shouldRunFailureRecoverySample(baseInput())).toBe(false);
  });

  it('enters freeze_safe on high lag', () => {
    const p = observeFailureRecovery({ ...baseInput(), eventLoopLagMs: 500 });
    expect(['freeze_safe', 'recovery', 'degraded', 'quarantine', 'emergency']).toContain(
      p.degradationState,
    );
  });

  it('exports recovery bundle', () => {
    observeFailureRecovery(baseInput());
    const exp = buildFailureRecoveryExportBundle();
    expect(exp.version).toBe('1.0.0');
    expect(exp.recoveryHeatmap).toBeDefined();
  });
});
