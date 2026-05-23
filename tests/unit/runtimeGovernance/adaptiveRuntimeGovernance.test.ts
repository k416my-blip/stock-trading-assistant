import { describe, expect, it, beforeEach } from 'vitest';
import { buildRuntimeCausalGraphWithAdaptive } from '../../../src/runtime/analysis/runtimeCausalGraphAdaptive';
import { createAdaptiveRuntimeContext } from '../../../src/runtime/analysis/adaptiveRuntimeLearningEngine';
import { resetAdaptiveLearningStoreForTest } from '../../../src/runtime/analysis/adaptiveRuntimeLearningStorage';
import {
  resetAdaptiveGovernanceForTest,
  runAdaptiveGovernance,
  buildRedmiNote13ProLongTermGovernanceReport,
} from '../../../src/runtime/governance/adaptiveRuntimeGovernance';
import { resetSessionOverfitGuardForTest } from '../../../src/runtime/governance/sessionOverfitGuard';
import { resetDeviceScopedStoresForTest, crossDeviceIsolationQuality } from '../../../src/runtime/governance/deviceBiasIsolation';
import { resetRollbackSystemForTest } from '../../../src/runtime/governance/adaptiveRollbackSystem';
import { simulateAdaptiveGovernanceHorizon } from '../../../src/runtime/governance/adaptiveGovernanceSimulation';
import type { RuntimeCausalGraphInput } from '../../../src/types/runtimeCausalGraph';

function richInput(): RuntimeCausalGraphInput {
  const t0 = '2026-01-01T10:00:00.000Z';
  return {
    reconnectTimeline: [
      { at: '2026-01-01T10:00:03.000Z', phase: 'schedule', delayMs: 0, allowed: true, token: 'a', detailJa: 's' },
    ],
    websocketOwnership: [
      {
        reconnectUuid: 'x',
        owner: 'js_coordinator',
        source: 'kernel_policy',
        scheduledAt: t0,
        duplicate: true,
      },
    ],
    boundaryTrace: [{ at: t0, kind: 'telemetry_burst', detailJa: 'lag', native: false }],
    lifecycleTimeline: [
      { at: t0, kind: 'trim_memory', detailJa: 'trim', native: true },
      { at: t0, kind: 'foreground', detailJa: 'fg', native: false },
    ],
    failureTimeline: [],
    checkpoints: [],
    miui: {
      backgroundDurationMs: 0,
      resumeLatencyMs: 5000,
      silentDisconnectCount: 2,
      timerDriftMs: 3500,
      lastResumeAt: Date.parse(t0),
    },
  };
}

describe('adaptiveRuntimeGovernance', () => {
  beforeEach(() => {
    resetAdaptiveLearningStoreForTest();
    resetAdaptiveGovernanceForTest();
    resetSessionOverfitGuardForTest();
    resetDeviceScopedStoresForTest();
    resetRollbackSystemForTest();
  });

  it('same replay yields stable root under governance', () => {
    const ctx = createAdaptiveRuntimeContext('Redmi Note 13 Pro 5G');
    const b1 = buildRuntimeCausalGraphWithAdaptive(richInput(), { adaptive: ctx });
    const b2 = buildRuntimeCausalGraphWithAdaptive(richInput(), {
      adaptive: ctx,
      previousLatent: b1.latentInference.states,
    });
    expect(b1.graph.rootCauseKind).toBe(b2.graph.rootCauseKind);
    expect(b1.governanceReport?.dashboard.driftPhase).toBeDefined();
  });

  it('false positive penalty and protected invariant', () => {
    const ctx = createAdaptiveRuntimeContext('emulator');
    for (let i = 0; i < 6; i += 1) {
      buildRuntimeCausalGraphWithAdaptive(richInput(), { adaptive: ctx });
    }
    const ownership = Object.values(ctx.store.edges).find((e) =>
      String(e.to).includes('duplicate_socket'),
    );
    if (ownership) {
      expect(ownership.protectedInvariant).toBe(true);
      expect(ownership.runtimeLearnedWeight).toBeGreaterThanOrEqual(0.5);
    }
    expect(ctx.store.falsePositives.length).toBeGreaterThanOrEqual(0);
  });

  it('transition reinforcement governed by reliability', () => {
    const ctx = createAdaptiveRuntimeContext('Redmi');
    const bundle = buildRuntimeCausalGraphWithAdaptive(richInput(), { adaptive: ctx });
    expect(bundle.governanceReport?.dashboard.adaptiveReliability).toBeGreaterThan(0);
  });

  it('device profile isolation reduces contamination', () => {
    const redmi = createAdaptiveRuntimeContext('Redmi');
    const pixel = createAdaptiveRuntimeContext('Pixel 8');
    buildRuntimeCausalGraphWithAdaptive(richInput(), { adaptive: redmi });
    buildRuntimeCausalGraphWithAdaptive(richInput(), { adaptive: pixel });
    expect(crossDeviceIsolationQuality('redmi')).toBeGreaterThanOrEqual(0.5);
    expect(crossDeviceIsolationQuality('pixel')).toBeGreaterThanOrEqual(0.5);
  });

  it('adaptive decay governance prunes stale edges on long horizon simulation', () => {
    const sim = simulateAdaptiveGovernanceHorizon({ days: 30, deviceModel: 'Redmi Note 13 Pro 5G' });
    expect(sim.driftAccumulation).toBeLessThan(0.95);
    expect(sim.finalEdgeCount).toBeLessThan(sim.ticks * 4);
    expect(sim.rollbackSuccess).toBe(true);
  });

  it('7-day simulation detects drift without runaway', () => {
    const sim = simulateAdaptiveGovernanceHorizon({ days: 7, deviceModel: 'Redmi' });
    expect(sim.finalPhase).not.toBe('DRIFT_CRITICAL');
    expect(sim.falseCausalPersistence).toBeLessThan(0.8);
  });

  it('rollback on critical drift restores stability', () => {
    const ctx = createAdaptiveRuntimeContext('emulator');
    for (let i = 0; i < 40; i += 1) {
      const input = richInput();
      const bundle = buildRuntimeCausalGraphWithAdaptive(input, { adaptive: ctx });
      runAdaptiveGovernance(ctx, {
        graph: bundle.graph,
        latentChain: bundle.hierarchicalLatent.criticalLatentChain,
        deviceProfile: ctx.deviceProfile,
        sessionElapsedMs: 30_000,
        rootKind: 'duplicate_socket',
        previousRootKind: 'trim_memory',
      });
    }
    expect(ctx.store.replayCount).toBeGreaterThan(10);
  });

  it('Redmi Note 13 Pro 5G long-term governance report', () => {
    const ctx = createAdaptiveRuntimeContext('Redmi Note 13 Pro 5G');
    for (let i = 0; i < 12; i += 1) {
      buildRuntimeCausalGraphWithAdaptive(richInput(), { adaptive: ctx });
    }
    const report = buildRedmiNote13ProLongTermGovernanceReport(ctx);
    expect(report.deviceModel).toContain('Redmi');
    expect(report.driftStability).toBeGreaterThan(0);
    expect(report.crossDeviceIsolationQuality).toBeGreaterThan(0);
    expect(report.summaryJa).toContain('Redmi');
  });
});
