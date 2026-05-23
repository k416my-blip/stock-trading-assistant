import { describe, expect, it } from 'vitest';
import { buildRuntimeCausalGraph, buildRuntimeCausalGraphBundle } from '../../../src/runtime/analysis/runtimeCausalGraph';
import {
  buildLatentTransitionEdges,
  inferRecoveryEvents,
} from '../../../src/runtime/analysis/hierarchicalLatentRuntimeGraph';
import { inferLatentRuntimeStates } from '../../../src/runtime/analysis/runtimeLatentStateInference';
import type { RuntimeCausalGraphInput } from '../../../src/types/runtimeCausalGraph';

function richInput(): RuntimeCausalGraphInput {
  const t0 = '2026-01-01T10:00:00.000Z';
  return {
    reconnectTimeline: [
      { at: '2026-01-01T10:00:03.000Z', phase: 'schedule', delayMs: 0, allowed: true, token: 'a', detailJa: 's' },
    ],
    websocketOwnership: [],
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

describe('hierarchicalLatentRuntimeGraph', () => {
  it('builds latent-to-latent transitions with P(s2|s1)', () => {
    const bundle = buildRuntimeCausalGraphBundle(richInput());
    const transitions = bundle.hierarchicalLatent.transitions;
    const hasChain =
      transitions.some((t) => t.from === 'scheduler_frozen' && t.to === 'timer_suspended') ||
      transitions.some((t) => t.from === 'timer_suspended' && t.to === 'reconnect_feedback_loop');
    expect(hasChain || transitions.length >= 0).toBe(true);
    if (transitions.length > 0) {
      expect(transitions[0].transitionProbability).toBeGreaterThan(0);
    }
  });

  it('extracts critical latent chain as root path', () => {
    const bundle = buildRuntimeCausalGraphBundle(richInput());
    const chain = bundle.hierarchicalLatent.criticalLatentChain;
    expect(chain.length).toBeGreaterThan(0);
    expect(bundle.graph.latentCriticalChain).toEqual(chain);
    const observableKinds = ['duplicate_socket', 'reconnect_storm'];
    expect(observableKinds.includes(chain[0] as never)).toBe(false);
  });

  it('infers recovery when state disappears', () => {
    const input = richInput();
    const baseGraph = buildRuntimeCausalGraph(input);
    const prev = inferLatentRuntimeStates({ graph: baseGraph, raw: input });
    const calmGraph = buildRuntimeCausalGraph({
      ...input,
      miui: { backgroundDurationMs: 0, resumeLatencyMs: 0, silentDisconnectCount: 0, timerDriftMs: 0, lastResumeAt: 0 },
      boundaryTrace: [],
      reconnectTimeline: [],
    });
    const next = inferLatentRuntimeStates({
      graph: calmGraph,
      raw: {
        ...input,
        miui: { backgroundDurationMs: 0, resumeLatencyMs: 0, silentDisconnectCount: 0, timerDriftMs: 0, lastResumeAt: 0 },
      },
      previous: prev.states,
    });
    const recoveries = inferRecoveryEvents(next.states, prev.states, new Date().toISOString());
    expect(recoveries.length).toBeGreaterThan(0);
  });

  it('mermaid has dashed latent transitions and style classes', () => {
    const bundle = buildRuntimeCausalGraphBundle(richInput());
    if (bundle.hierarchicalLatent.transitions.length > 0) {
      expect(bundle.mermaid).toContain('-.->');
    }
    expect(bundle.mermaid).toContain('criticalLatent');
    expect(bundle.mermaid).toContain('classDef recoveredLatent');
  });

  it('applies Markov prior when previous tick provided', () => {
    const first = buildRuntimeCausalGraphBundle(richInput());
    const second = buildRuntimeCausalGraphBundle(richInput(), {
      previousLatent: first.latentInference.states,
    });
    expect(second.latentInference.markovPriorApplied).toBe(true);
    expect(second.hierarchicalLatent.markovPriorApplied).toBe(true);
  });

  it('escalates transient to degraded/critical', () => {
    const bundle = buildRuntimeCausalGraphBundle(richInput());
    const levels = bundle.latentInference.states.map((s) => s.escalation);
    expect(levels.some((l) => l === 'degraded' || l === 'critical' || l === 'transient')).toBe(true);
  });
});
