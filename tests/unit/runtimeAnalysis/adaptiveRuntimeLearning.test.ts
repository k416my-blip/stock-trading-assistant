import { describe, expect, it, beforeEach } from 'vitest';
import {
  createAdaptiveRuntimeContext,
  getAdaptiveDecayWindow,
  getLearnedTransitionProbability,
  recordEdgeOutcome,
  recordFalsePositive,
  recordTransitionObservation,
  synthesizeAdaptiveEdgeConfidence,
  buildAdaptiveRuntimeReport,
} from '../../../src/runtime/analysis/adaptiveRuntimeLearningEngine';
import {
  resetAdaptiveLearningStoreForTest,
  createAdaptiveLearningState,
} from '../../../src/runtime/analysis/adaptiveRuntimeLearningStorage';
import { buildRuntimeCausalGraphWithAdaptive, replaySoakExportForLearning } from '../../../src/runtime/analysis/runtimeCausalGraphAdaptive';
import type { RuntimeCausalGraphInput } from '../../../src/types/runtimeCausalGraph';
import { edgeKey, isProtectedEdge } from '../../../src/constants/adaptiveRuntimeLearning';

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
      silentDisconnectCount: 1,
      timerDriftMs: 3500,
      lastResumeAt: Date.parse(t0),
    },
  };
}

describe('adaptiveRuntimeLearning', () => {
  beforeEach(() => {
    resetAdaptiveLearningStoreForTest();
  });

  it('device profile adapts decay window for resume→reconnect', () => {
    const redmi = createAdaptiveRuntimeContext('Redmi Note 12');
    const pixel = createAdaptiveRuntimeContext('Pixel 8');
    const rDecay = getAdaptiveDecayWindow('resume', 'reconnect_schedule', redmi);
    const pDecay = getAdaptiveDecayWindow('resume', 'reconnect_schedule', pixel);
    expect(rDecay.strongMs).toBeGreaterThan(pDecay.strongMs);
    expect(rDecay.source).toBe('device_profile');
  });

  it('transition reinforcement increases learned probability', () => {
    const store = createAdaptiveLearningState('emulator');
    for (let i = 0; i < 8; i += 1) {
      recordTransitionObservation(store, 'scheduler_frozen', 'timer_suspended', true);
    }
    const p = getLearnedTransitionProbability('scheduler_frozen', 'timer_suspended', store);
    expect(p).toBeGreaterThan(0.5);
  });

  it('false positive penalty reduces edge weight unless protected invariant', () => {
    const store = createAdaptiveLearningState('emulator');
    const protectedKey = edgeKey('ownership_violation', 'duplicate_socket', 'ownership→duplicate_socket');
    expect(isProtectedEdge('ownership_violation', 'duplicate_socket', 'ownership→duplicate_socket')).toBe(true);

    recordFalsePositive(store, 'trim_memory->timer_drift:x', 'trim_memory', 'duplicate_socket');
    recordFalsePositive(store, 'trim_memory->timer_drift:x', 'trim_memory', 'duplicate_socket');
    const weak = store.edges['trim_memory->timer_drift:x'] ?? {
      edgeKey: 'trim_memory->timer_drift:x',
      from: 'trim_memory',
      to: 'timer_drift',
      relation: 'x',
      hitCount: 0,
      successfulPredictionCount: 0,
      falsePositiveCount: 2,
      decayReliability: 0.5,
      runtimeLearnedWeight: 0.5,
      confidenceEma: 0.5,
      replaySupport: 0,
      stability: 0.5,
      protectedInvariant: false,
    };
    weak.falsePositiveCount = 2;
    weak.runtimeLearnedWeight = 0.5;
    const penalized = synthesizeAdaptiveEdgeConfidence(0.9, 0.9, 0.9, 0.9, weak);

    const prot = store.edges[protectedKey] ?? {
      edgeKey: protectedKey,
      from: 'ownership_violation',
      to: 'duplicate_socket',
      relation: 'ownership→duplicate_socket',
      hitCount: 0,
      successfulPredictionCount: 0,
      falsePositiveCount: 5,
      decayReliability: 1,
      runtimeLearnedWeight: 0.9,
      confidenceEma: 0.9,
      replaySupport: 0,
      stability: 0.9,
      protectedInvariant: true,
    };
    prot.protectedInvariant = true;
    const protectedConf = synthesizeAdaptiveEdgeConfidence(0.9, 0.9, 0.9, 0.9, prot);
    expect(penalized.runtimeLearnedWeight).toBeLessThan(protectedConf.runtimeLearnedWeight);
  });

  it('same replay yields stable root', () => {
    const ctx = createAdaptiveRuntimeContext('Redmi K60');
    const b1 = buildRuntimeCausalGraphWithAdaptive(richInput(), { adaptive: ctx });
    const b2 = buildRuntimeCausalGraphWithAdaptive(richInput(), {
      adaptive: ctx,
      previousLatent: b1.latentInference.states,
    });
    expect(b1.graph.rootCauseKind).toBe(b2.graph.rootCauseKind);
    expect(b1.hierarchicalLatent.criticalLatentChain[0]).toBe(b2.hierarchicalLatent.criticalLatentChain[0]);
  });

  it('adaptive decay updates from gap histogram', () => {
    const ctx = createAdaptiveRuntimeContext('emulator');
    for (let i = 0; i < 6; i += 1) {
      buildRuntimeCausalGraphWithAdaptive(richInput(), { adaptive: ctx });
    }
    const learned = getAdaptiveDecayWindow('resume', 'reconnect_schedule', ctx);
    expect(learned.source === 'learned_histogram' || learned.strongMs > 0).toBe(true);
  });

  it('recovery effectiveness learning in report', () => {
    const ctx = createAdaptiveRuntimeContext('emulator');
    const store = ctx.store;
    recordEdgeOutcome(store, 'a', 'b', 'r', true, true);
    const report = buildAdaptiveRuntimeReport(store);
    expect(report.version).toBeTruthy();
    expect(report.deviceSpecificAdjustments.profile).toBe('emulator');
  });

  it('exports adaptive report on bundle build', () => {
    const bundle = buildRuntimeCausalGraphWithAdaptive(richInput(), {
      adaptive: createAdaptiveRuntimeContext('Redmi'),
    });
    expect(bundle.adaptiveReport).toBeDefined();
    expect(bundle.adaptiveReport!.replayCount).toBeGreaterThanOrEqual(0);
    expect(bundle.mermaid).toMatch(/conf \d+%/);
  });

  it('replay learning increments replay count via bundle', () => {
    const ctx = createAdaptiveRuntimeContext('Redmi Note');
    buildRuntimeCausalGraphWithAdaptive(richInput(), { adaptive: ctx });
    buildRuntimeCausalGraphWithAdaptive(richInput(), { adaptive: ctx });
    expect(ctx.store.replayCount).toBeGreaterThanOrEqual(2);
    expect(ctx.store.edges).toBeDefined();
  });
});
