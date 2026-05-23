import { describe, expect, it } from 'vitest';
import { coalesceRuntimeEffects } from '../../../src/runtime/kernel/effectCoalescing';
import type { RuntimeEffect } from '../../../src/runtime/effects/RuntimeEffectTypes';

function fx(kind: RuntimeEffect['kind'], dedupeKey: string): RuntimeEffect {
  return {
    id: `id-${dedupeKey}`,
    kind,
    priority: 'NORMAL',
    dedupeKey,
    emittedAt: new Date().toISOString(),
    payload: {},
  };
}

describe('effectCoalescing', () => {
  it('coalesces duplicate STABILITY_RECONNECT_GUARD to one', () => {
    const out = coalesceRuntimeEffects([
      fx('STABILITY_RECONNECT_GUARD', 'a'),
      fx('STABILITY_RECONNECT_GUARD', 'b'),
    ]);
    expect(out.filter((e) => e.kind === 'STABILITY_RECONNECT_GUARD').length).toBe(1);
  });
});
