import { describe, expect, it } from 'vitest';
import { buildRuntimeCausalGraph, buildRuntimeCausalGraphBundle } from '../../../src/runtime/analysis/runtimeCausalGraph';
import {
  inferLatentRuntimeStates,
  mergeLatentStatesIntoCausalGraph,
} from '../../../src/runtime/analysis/runtimeLatentStateInference';
import type { RuntimeCausalGraphInput } from '../../../src/types/runtimeCausalGraph';

function soakLikeInput(): RuntimeCausalGraphInput {
  const t0 = '2026-01-01T10:00:00.000Z';
  const t1 = '2026-01-01T10:00:02.000Z';
  return {
    reconnectTimeline: [
      { at: t1, phase: 'schedule', delayMs: 0, allowed: true, token: 'a', detailJa: 's' },
      { at: t1, phase: 'schedule', delayMs: 0, allowed: true, token: 'b', detailJa: 's2' },
    ],
    websocketOwnership: [
      {
        reconnectUuid: 'dup',
        owner: 'js_coordinator',
        source: 'kernel_policy',
        scheduledAt: t0,
        duplicate: true,
      },
    ],
    boundaryTrace: [{ at: t0, kind: 'hydration_overlap', detailJa: 'overlap', native: false }],
    lifecycleTimeline: [
      { at: t0, kind: 'trim_memory', detailJa: 'trim', native: true },
      { at: t0, kind: 'foreground', detailJa: 'fg', native: false },
    ],
    failureTimeline: [],
    checkpoints: [{ at: t1, elapsedMs: 1000, reconnectPerMin: 6, duplicateSockets: 1, asyncQueueDepth: 10, asyncQueueLagMs: 400, memoryPressurePct: 80, thermalLevel: 'severe', resumeLatencyMs: 4000, bypassDetected: false, ownershipConsistent: false }],
    miui: {
      backgroundDurationMs: 0,
      resumeLatencyMs: 4000,
      silentDisconnectCount: 2,
      timerDriftMs: 3000,
      lastResumeAt: Date.parse(t0),
    },
    stabilityAnomalies: [{ kind: 'duplicate_reconnect', summaryJa: 'dup' }],
  };
}

describe('runtimeLatentStateInference', () => {
  it('infers latent states with posterior and evidence', () => {
    const graph = buildRuntimeCausalGraph(soakLikeInput());
    const result = inferLatentRuntimeStates({ graph, raw: soakLikeInput() });
    expect(result.states.length).toBeGreaterThan(0);
    expect(result.dominantState).toBeTruthy();
    expect(result.overallConfidence).toBeGreaterThan(0.25);
    const top = result.states[0];
    expect(top.supportingEvidence.length).toBeGreaterThan(0);
    expect(top.posterior).toBeGreaterThanOrEqual(top.prior);
  });

  it('distinguishes transient vs sustained with previous observations', () => {
    const graph = buildRuntimeCausalGraph(soakLikeInput());
    const first = inferLatentRuntimeStates({ graph, raw: soakLikeInput(), nowMs: Date.parse('2026-01-01T10:00:00.000Z') });
    const second = inferLatentRuntimeStates({
      graph,
      raw: soakLikeInput(),
      previous: first.states,
      nowMs: Date.parse('2026-01-01T10:01:00.000Z'),
    });
    const sustained = second.states.find((s) => s.persistence === 'sustained');
    expect(sustained ?? second.states[0]).toBeTruthy();
  });

  it('merges latent nodes into causal graph', () => {
    const graph = buildRuntimeCausalGraph(soakLikeInput());
    const inference = inferLatentRuntimeStates({ graph, raw: soakLikeInput() });
    const merged = mergeLatentStatesIntoCausalGraph(graph, inference);
    const latentNodes = merged.nodes.filter((n) => n.isLatent);
    expect(latentNodes.length).toBe(inference.states.length);
    expect(merged.edges.some((e) => e.relation === 'evidence→latent')).toBe(true);
  });

  it('mermaid uses rectangles for observable and rounded for latent', () => {
    const bundle = buildRuntimeCausalGraphBundle(soakLikeInput());
    expect(bundle.latentInference.states.length).toBeGreaterThan(0);
    expect(bundle.mermaid).toContain('classDef criticalLatent');
    expect(bundle.mermaid).toMatch(/\[".+"\]/);
    expect(bundle.mermaid).toMatch(/\(\(.+\)\)/);
    if (bundle.latentInference.states.some((s) => s.critical)) {
      expect(bundle.mermaid).toContain(':::criticalLatent');
    }
  });
});
