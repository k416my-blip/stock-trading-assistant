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

export function buildStabilityEffects(snapshot: RuntimeStabilitySnapshot): RuntimeEffect[] {
  const effects: RuntimeEffect[] = [
    makeEffect('STABILITY_OBSERVE', `stab-obs-${snapshot.measuredAt}`, { snapshot }),
  ];

  for (const anomaly of snapshot.anomalies) {
    switch (anomaly.kind) {
      case 'reconnect_storm':
      case 'ws_duplicate':
      case 'silent_ws_disconnect':
        effects.push(
          makeEffect('STABILITY_RECONNECT_GUARD', `stab-ws-${anomaly.kind}`, {
            snapshot,
            delayMs: snapshot.reconnectCooldownUntil,
          }),
        );
        break;
      case 'hydration_collision':
        effects.push(
          makeEffect('STABILITY_HYDRATION_ENFORCE', 'stab-hyd-lock', { snapshot }),
        );
        break;
      case 'async_starvation':
        effects.push(
          makeEffect('STABILITY_ASYNC_STARVATION_WARN', 'stab-async', { snapshot, anomaly }),
        );
        break;
      case 'miui_battery_kill':
      case 'resume_race':
      case 'heartbeat_gap':
        effects.push(
          makeEffect('STABILITY_MIUI_DIAGNOSTIC', `stab-miui-${anomaly.kind}`, {
            snapshot,
            anomaly,
          }),
        );
        break;
      default:
        break;
    }
  }

  return effects;
}
