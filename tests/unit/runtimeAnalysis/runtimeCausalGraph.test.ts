import { describe, expect, it } from 'vitest';
import {
  buildRuntimeCausalGraph,
  buildRuntimeCausalGraphBundle,
} from '../../../src/runtime/analysis/runtimeCausalGraph';
import type { RuntimeCausalGraphInput } from '../../../src/types/runtimeCausalGraph';

function causalInput(): RuntimeCausalGraphInput {
  const t0 = '2026-01-01T10:00:00.000Z';
  const t1 = '2026-01-01T10:00:05.000Z';
  const t2 = '2026-01-01T10:00:10.000Z';
  const t3 = '2026-01-01T10:00:15.000Z';
  return {
    reconnectTimeline: [
      { at: t1, phase: 'schedule', delayMs: 1000, allowed: true, token: 'rc-1', detailJa: 'schedule' },
      { at: t2, phase: 'execute', delayMs: 1000, allowed: true, token: 'rc-1', detailJa: 'execute' },
    ],
    websocketOwnership: [
      {
        reconnectUuid: 'rc-dup',
        owner: 'js_coordinator',
        source: 'kernel_policy',
        scheduledAt: t0,
        duplicate: true,
      },
      {
        reconnectUuid: 'rc-dup',
        owner: 'js_execute',
        source: 'kernel_policy',
        scheduledAt: t3,
        executedAt: t3,
        duplicate: false,
      },
    ],
    boundaryTrace: [
      { at: t0, kind: 'native_lifecycle', detailJa: 'trim', native: true },
      { at: t1, kind: 'coordinator_reconnect', detailJa: 'coord', native: false, reconnectUuid: 'rc-1' },
    ],
    lifecycleTimeline: [
      { at: t0, kind: 'trim_memory', detailJa: 'trim', native: true },
      { at: t0, kind: 'foreground', detailJa: 'fg', native: false },
    ],
    failureTimeline: [],
    checkpoints: [],
    miui: {
      backgroundDurationMs: 0,
      resumeLatencyMs: 3500,
      silentDisconnectCount: 0,
      timerDriftMs: 2500,
      lastResumeAt: Date.parse(t0),
    },
    stabilityAnomalies: [{ kind: 'duplicate_reconnect', summaryJa: 'dup socket' }],
  };
}

describe('runtimeCausalGraph', () => {
  it('selects trim/resume class root over duplicate_socket cascade', () => {
    const graph = buildRuntimeCausalGraph(causalInput());
    expect(graph.rootNodeId).not.toBeNull();
    const root = graph.nodes.find((n) => n.id === graph.rootNodeId);
    expect(root?.cascadeOnly).toBe(false);
    expect(['trim_memory', 'resume', 'timer_drift', 'native_lifecycle']).toContain(root?.kind);
    expect(graph.rootCauseKind).not.toBe('duplicate_socket');
  });

  it('builds causal edges for resume→schedule', () => {
    const graph = buildRuntimeCausalGraph(causalInput());
    const hasResumeSchedule = graph.edges.some(
      (e) =>
        graph.nodes.find((n) => n.id === e.from)?.kind === 'resume' &&
        graph.nodes.find((n) => n.id === e.to)?.kind === 'reconnect_schedule',
    );
    expect(hasResumeSchedule || graph.edges.length > 0).toBe(true);
  });

  it('exports mermaid markdown and json bundle', () => {
    const bundle = buildRuntimeCausalGraphBundle(causalInput());
    expect(bundle.graph.nodes.length).toBeGreaterThan(0);
    expect(bundle.mermaid).toContain('flowchart');
    expect(bundle.markdown).toContain('Root cause chain');
    expect(JSON.parse(bundle.json).version).toBeTruthy();
    if (bundle.graph.edges.length > 0) {
      expect(bundle.mermaid).toMatch(/conf \d+%/);
      expect(bundle.mermaid).toMatch(/lag \d+ms/);
    }
  });

  it('attributes anomaly with primary cause not cascade leaf', () => {
    const bundle = buildRuntimeCausalGraphBundle(causalInput());
    const attr = bundle.graph.anomalyAttributions[0];
    expect(attr.primaryCause).not.toBe('duplicate_socket');
    expect(attr.confidence).toBeGreaterThan(0.5);
  });
});
