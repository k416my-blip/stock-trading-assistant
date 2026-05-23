/**
 * Kernel-side effect coalescing — one command per kind per tick (dispatcher dedupe is secondary).
 */
import type { RuntimeEffect } from '../effects/RuntimeEffectTypes';

const COALESCE_BY_KIND_ONLY: Set<RuntimeEffect['kind']> = new Set([
  'STABILITY_RECONNECT_GUARD',
  'STABILITY_HYDRATION_ENFORCE',
  'STABILITY_ASYNC_STARVATION_WARN',
  'STABILITY_MIUI_DIAGNOSTIC',
  'STABILITY_OBSERVE',
  'WS_RECONNECT_JITTER',
  'WS_RECONNECT_DEFER',
  'MEMORY_PRESSURE_CLEANUP',
  'IMMINENT_KILL_MITIGATION',
]);

export function coalesceRuntimeEffects(effects: RuntimeEffect[]): RuntimeEffect[] {
  const kindEmitted = new Set<RuntimeEffect['kind']>();
  const dedupeSeen = new Set<string>();
  const out: RuntimeEffect[] = [];

  for (const effect of effects) {
    if (COALESCE_BY_KIND_ONLY.has(effect.kind)) {
      if (kindEmitted.has(effect.kind)) continue;
      kindEmitted.add(effect.kind);
      out.push(effect);
      continue;
    }
    if (dedupeSeen.has(effect.dedupeKey)) continue;
    dedupeSeen.add(effect.dedupeKey);
    out.push(effect);
  }

  return out;
}
