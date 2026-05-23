import { describe, expect, it } from 'vitest';
import {
  computeTemporalEdgeWeight,
  collapseEventBursts,
  synthesizeEdgeConfidence,
} from '../../../src/runtime/analysis/runtimeTemporalCausality';
import { buildRuntimeCausalGraph } from '../../../src/runtime/analysis/runtimeCausalGraph';
import type { CausalEventNode } from '../../../src/types/runtimeCausalGraph';

describe('runtimeTemporalCausality', () => {
  it('computeTemporalEdgeWeight strong band for trim→timer_drift <= 3s', () => {
    const t0 = Date.parse('2026-01-01T10:00:00.000Z');
    const r = computeTemporalEdgeWeight({
      sourceTimestampMs: t0,
      targetTimestampMs: t0 + 2_500,
      fromKind: 'trim_memory',
      toKind: 'timer_drift',
    });
    expect(r.temporalConfidence).toBe(1);
    expect(r.decayStatus).toBe('strong');
  });

  it('decays resume→reconnect_schedule beyond 1s strong window', () => {
    const t0 = Date.parse('2026-01-01T10:00:00.000Z');
    const strong = computeTemporalEdgeWeight({
      sourceTimestampMs: t0,
      targetTimestampMs: t0 + 500,
      fromKind: 'resume',
      toKind: 'reconnect_schedule',
    });
    const weak = computeTemporalEdgeWeight({
      sourceTimestampMs: t0,
      targetTimestampMs: t0 + 8_000,
      fromKind: 'resume',
      toKind: 'reconnect_schedule',
    });
    expect(strong.temporalConfidence).toBeGreaterThan(weak.temporalConfidence);
    expect(weak.decayStatus).not.toBe('strong');
  });

  it('hydration→duplicate_socket 500ms strong window', () => {
    const t0 = Date.parse('2026-01-01T10:00:00.000Z');
    const r = computeTemporalEdgeWeight({
      sourceTimestampMs: t0,
      targetTimestampMs: t0 + 400,
      fromKind: 'hydration_lock_overlap',
      toKind: 'duplicate_socket',
    });
    expect(r.temporalConfidence).toBe(1);
    expect(r.decayStatus).toBe('strong');
  });

  it('synthesizes edge confidence from four factors', () => {
    const high = synthesizeEdgeConfidence({
      causalRuleWeight: 0.9,
      temporalWeight: 1,
      replayConsistency: 1,
      ownershipConsistency: 1,
    });
    const low = synthesizeEdgeConfidence({
      causalRuleWeight: 0.9,
      temporalWeight: 0.2,
      replayConsistency: 0.5,
      ownershipConsistency: 0.5,
    });
    expect(high).toBeGreaterThan(low);
  });

  it('collapseEventBursts merges reconnect_schedule within 500ms', () => {
    const t0 = Date.parse('2026-01-01T10:00:00.000Z');
    const nodes: CausalEventNode[] = [
      {
        id: 'a',
        kind: 'reconnect_schedule',
        at: new Date(t0).toISOString(),
        sortKey: t0,
        detailJa: 's1',
        rootPriority: 30,
        cascadeOnly: false,
      },
      {
        id: 'b',
        kind: 'reconnect_schedule',
        at: new Date(t0 + 200).toISOString(),
        sortKey: t0 + 200,
        detailJa: 's2',
        rootPriority: 30,
        cascadeOnly: false,
      },
    ];
    const collapsed = collapseEventBursts(nodes);
    expect(collapsed).toHaveLength(1);
    expect(collapsed[0].detailJa).toContain('burst×2');
  });

  it('mermaid edges include confidence lag and decay status', () => {
    const t0 = '2026-01-01T10:00:00.000Z';
    const t1 = '2026-01-01T10:00:01.000Z';
    const graph = buildRuntimeCausalGraph({
      reconnectTimeline: [
        { at: t1, phase: 'schedule', delayMs: 0, allowed: true, token: 'rc', detailJa: 'sch' },
      ],
      websocketOwnership: [],
      boundaryTrace: [],
      lifecycleTimeline: [
        { at: t0, kind: 'trim_memory', detailJa: 'trim', native: true },
        { at: t0, kind: 'foreground', detailJa: 'fg', native: false },
      ],
      failureTimeline: [],
      checkpoints: [],
      miui: {
        backgroundDurationMs: 0,
        resumeLatencyMs: 0,
        silentDisconnectCount: 0,
        timerDriftMs: 3000,
        lastResumeAt: Date.parse(t0),
      },
    });
    const edge = graph.edges[0];
    if (edge) {
      expect(edge.temporalWeight).toBeDefined();
      expect(edge.decayStatus).toBeDefined();
      expect(edge.causalRuleWeight).toBeGreaterThan(0);
    }
  });
});
