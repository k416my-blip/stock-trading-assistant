import { beforeEach, describe, expect, it } from 'vitest';
import {
  createEffectId,
  enqueueRuntimeEffect,
  flushRuntimeEffectQueue,
  resetRuntimeEffectQueueForTest,
} from '../../src/runtime/effects/RuntimeEffectQueue';
import type { RuntimeEffect } from '../../src/runtime/effects/RuntimeEffectTypes';

function effect(priority: RuntimeEffect['priority'], dedupeKey: string): RuntimeEffect {
  return {
    id: createEffectId(),
    kind: 'DASHBOARD_POLICY',
    priority,
    dedupeKey,
    emittedAt: new Date().toISOString(),
    payload: { compact: false, maxFps: 30, metricsSamplingRate: 1 },
  };
}

describe('runtimeEffectQueue', () => {
  beforeEach(() => {
    resetRuntimeEffectQueueForTest();
  });

  it('sorts batch by priority CRITICAL before LOW', () => {
    enqueueRuntimeEffect(effect('LOW', 'a'));
    enqueueRuntimeEffect(effect('CRITICAL', 'b'));
    const batch = flushRuntimeEffectQueue(false);
    expect(batch[0].priority).toBe('CRITICAL');
  });

  it('drops LOW when flush requests survival drop', () => {
    enqueueRuntimeEffect(effect('LOW', 'low-1'));
    enqueueRuntimeEffect(effect('HIGH', 'high-1'));
    const batch = flushRuntimeEffectQueue(true);
    expect(batch.every((e) => e.priority !== 'LOW')).toBe(true);
    expect(batch.length).toBe(1);
  });

  it('dedupes same dedupeKey within window', () => {
    expect(enqueueRuntimeEffect(effect('NORMAL', 'same'))).toBe(true);
    expect(enqueueRuntimeEffect(effect('NORMAL', 'same'))).toBe(false);
  });
});
