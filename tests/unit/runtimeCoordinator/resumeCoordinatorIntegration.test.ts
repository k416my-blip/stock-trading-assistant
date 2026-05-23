import { beforeEach, describe, expect, it } from 'vitest';
import {
  getResumeCoordinatorSnapshot,
  resetRuntimeResumeCoordinatorForTest,
  tickResumeCoordinator,
} from '../../../src/runtime/coordinator/resumeCoordinatorIntegration';
import { buildResumeCoordinatorEffects } from '../../../src/runtime/coordinator/resumeCoordinatorEffects';
import { coalesceRuntimeEffects } from '../../../src/runtime/kernel/effectCoalescing';
import type { RuntimeEffect } from '../../../src/runtime/effects/RuntimeEffectTypes';

function fx(kind: RuntimeEffect['kind']): RuntimeEffect {
  return {
    id: `x-${kind}`,
    kind,
    priority: 'NORMAL',
    dedupeKey: kind,
    emittedAt: new Date().toISOString(),
    payload: {},
  };
}

describe('resumeCoordinatorIntegration', () => {
  beforeEach(() => resetRuntimeResumeCoordinatorForTest());

  it('emits phased effects after resume burst input', () => {
    tickResumeCoordinator({
      foregroundResume: true,
      resumeLatencyMs: 2500,
      hydrationLockActive: true,
      hydrationOverlap: 1,
      reconnectPerMin: 6,
      asyncQueueDepth: 40,
      asyncQueueLagMs: 300,
      telemetryBurst: true,
      now: 10_000,
    });
  let snap = getResumeCoordinatorSnapshot();
    expect(snap?.phase).toBe('resume_gate');
    let effects = buildResumeCoordinatorEffects(snap);
    expect(effects.some((e) => e.kind === 'RESUME_GLOBAL_GATE')).toBe(true);

    tickResumeCoordinator({
      foregroundResume: false,
      resumeLatencyMs: 0,
      hydrationLockActive: true,
      hydrationOverlap: 1,
      reconnectPerMin: 6,
      asyncQueueDepth: 40,
      asyncQueueLagMs: 300,
      telemetryBurst: true,
      now: 10_100,
    });
    snap = getResumeCoordinatorSnapshot();
    effects = buildResumeCoordinatorEffects(snap);
    expect(effects.some((e) => e.kind === 'RESUME_SERIALIZE_HYDRATION')).toBe(true);
  });

  it('coalesces stability reconnect when resume ws sequence is scheduled', () => {
    const merged = coalesceRuntimeEffects([
      fx('RESUME_WS_RESTORE_SEQUENCE'),
      fx('STABILITY_RECONNECT_GUARD'),
      fx('WS_RECONNECT_JITTER'),
    ]);
    expect(merged.some((e) => e.kind === 'RESUME_WS_RESTORE_SEQUENCE')).toBe(true);
    expect(merged.some((e) => e.kind === 'STABILITY_RECONNECT_GUARD')).toBe(false);
    expect(merged.some((e) => e.kind === 'WS_RECONNECT_JITTER')).toBe(false);
  });
});
