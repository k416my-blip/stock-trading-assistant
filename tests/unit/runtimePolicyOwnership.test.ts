import { describe, expect, it } from 'vitest';
import {
  mergeKernelOwnedPolicy,
  shouldEmitWsReconnectJitter,
} from '../../src/runtime/kernel/RuntimePolicyOwnership';
import type { RuntimeUnifiedSignals } from '../../src/types/runtimeKernel';

function baseSignals(overrides: Partial<RuntimeUnifiedSignals> = {}): RuntimeUnifiedSignals {
  return {
    memoryPressurePct: 10,
    memoryPressureSource: 'heuristic',
    memoryPressureConfidence: 0.5,
    thermalPressure: 'none',
    thermalSource: 'heuristic',
    queueDepth: 5,
    renderFps: 28,
    wsLatencyMs: 80,
    wsReconnectStorm: false,
    wsJitterScore: 10,
    hydrationCascadeRiskPct: 5,
    hydrationInFlight: false,
    hydrationPaused: false,
    proactivePause: false,
    proactiveThrottle: false,
    miuiAggressiveReclaim: false,
    killRiskScore: 10,
    forceMiuiSurvival: false,
    lifecycleForeground: true,
    memoryWarning: false,
    renderSpikeCount: 0,
    cascadePressure: 10,
    sessionMinutes: 5,
    observedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('runtimePolicyOwnership', () => {
  it('merges memory-class compact policy into STABLE base', () => {
    const policy = mergeKernelOwnedPolicy('STABLE', baseSignals(), {
      compactFirst: true,
      preloadForbidden: true,
      speculativeRenderForbidden: true,
    });
    expect(policy.compactDashboard).toBe(true);
    expect(policy.maxDashboardFps).toBeLessThanOrEqual(12);
  });

  it('enables reconnect jitter command when storm detected', () => {
    const signals = baseSignals({ wsReconnectStorm: true });
    const policy = mergeKernelOwnedPolicy('DEGRADED', signals, {
      compactFirst: false,
      preloadForbidden: false,
      speculativeRenderForbidden: false,
    });
    expect(
      shouldEmitWsReconnectJitter({
        policy,
        signals,
        state: 'DEGRADED',
        heartbeatMs: 20_000,
        wsLightweight: true,
      }),
    ).toBe(true);
  });
});
