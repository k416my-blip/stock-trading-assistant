/**
 * Pure stability → effect command mapping (kernel emits only).
 */
import type { RuntimeEffect } from '../effects/RuntimeEffectTypes';
import type { RuntimeStabilitySnapshot } from '../../types/runtimeStability';
import { createEffectId } from '../effects/RuntimeEffectQueue';
import { priorityForEffectKind } from '../effects/RuntimeEffectRegistry';

function makeEffect(
  kind: RuntimeEffect['kind'],
  dedupeKey: string,
  payload: unknown,
): RuntimeEffect {
  return {
    id: createEffectId(),
    kind,
    priority: priorityForEffectKind(kind),
    dedupeKey,
    emittedAt: new Date().toISOString(),
    payload,
  };
}

const ANOMALY_EFFECT_KIND: Partial<
  Record<RuntimeStabilitySnapshot['anomalies'][0]['kind'], RuntimeEffect['kind']>
> = {
  reconnect_storm: 'STABILITY_RECONNECT_GUARD',
  ws_duplicate: 'STABILITY_RECONNECT_GUARD',
  silent_ws_disconnect: 'STABILITY_RECONNECT_GUARD',
  hydration_collision: 'STABILITY_HYDRATION_ENFORCE',
  async_starvation: 'STABILITY_ASYNC_STARVATION_WARN',
  miui_battery_kill: 'STABILITY_MIUI_DIAGNOSTIC',
  resume_race: 'STABILITY_MIUI_DIAGNOSTIC',
  heartbeat_gap: 'STABILITY_MIUI_DIAGNOSTIC',
};

export function buildStabilityEffects(snapshot: RuntimeStabilitySnapshot): RuntimeEffect[] {
  const effects: RuntimeEffect[] = [
    makeEffect('STABILITY_OBSERVE', `stab-obs-${snapshot.measuredAt}`, { snapshot }),
  ];

  const emittedKinds = new Set<RuntimeEffect['kind']>();

  for (const anomaly of snapshot.anomalies) {
    const kind = ANOMALY_EFFECT_KIND[anomaly.kind];
    if (!kind || emittedKinds.has(kind)) continue;
    emittedKinds.add(kind);

    switch (kind) {
      case 'STABILITY_RECONNECT_GUARD':
        effects.push(
          makeEffect('STABILITY_RECONNECT_GUARD', 'stab-ws-coalesced', {
            snapshot,
            delayMs: snapshot.reconnectCooldownUntil,
          }),
        );
        break;
      case 'STABILITY_HYDRATION_ENFORCE':
        effects.push(makeEffect('STABILITY_HYDRATION_ENFORCE', 'stab-hyd-lock', { snapshot }));
        break;
      case 'STABILITY_ASYNC_STARVATION_WARN':
        effects.push(
          makeEffect('STABILITY_ASYNC_STARVATION_WARN', 'stab-async', { snapshot, anomaly }),
        );
        break;
      case 'STABILITY_MIUI_DIAGNOSTIC':
        effects.push(
          makeEffect('STABILITY_MIUI_DIAGNOSTIC', 'stab-miui-coalesced', { snapshot, anomaly }),
        );
        break;
      default:
        break;
    }
  }

  return effects;
}
