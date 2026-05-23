/**
 * Pure effect commands from resume coordinator plan (kernel emits only).
 */
import type { RuntimeEffect } from '../effects/RuntimeEffectTypes';
import type { ResumeCoordinatorSnapshot } from '../../types/runtimeResumeCoordinator';
import { createEffectId } from '../effects/RuntimeEffectQueue';
import { priorityForEffectKind } from '../effects/RuntimeEffectRegistry';

function fx(kind: RuntimeEffect['kind'], dedupeKey: string, payload: unknown): RuntimeEffect {
  return {
    id: createEffectId(),
    kind,
    priority: priorityForEffectKind(kind),
    dedupeKey,
    emittedAt: new Date().toISOString(),
    payload,
  };
}

export function buildResumeCoordinatorEffects(
  snapshot: ResumeCoordinatorSnapshot | null,
): RuntimeEffect[] {
  if (!snapshot || snapshot.phase === 'idle') return [];

  const { plan } = snapshot;
  const effects: RuntimeEffect[] = [
    fx('RESUME_COORDINATOR_OBSERVE', `resume-obs-${snapshot.resumeTickId}`, { snapshot }),
  ];

  if (plan.globalGateMs > 0) {
    effects.push(
      fx('RESUME_GLOBAL_GATE', `resume-gate-${snapshot.resumeTickId}`, {
        gateMs: plan.globalGateMs,
        snapshot,
      }),
    );
  }

  if (plan.hydrationPauseMs > 0 || snapshot.phase === 'hydration') {
    effects.push(
      fx('RESUME_SERIALIZE_HYDRATION', `resume-hyd-${snapshot.resumeTickId}`, { snapshot }),
    );
  }

  if (plan.deferTelemetry) {
    effects.push(
      fx('RESUME_DEFER_TELEMETRY', `resume-tel-${snapshot.resumeTickId}`, { snapshot }),
    );
  }

  if (plan.suppressAsyncBurst) {
    effects.push(
      fx('RESUME_ASYNC_BURST_CLAMP', `resume-async-${snapshot.resumeTickId}`, { snapshot }),
    );
  }

  if (plan.allowWsRestore && plan.coalesceReconnect) {
    effects.push(
      fx('RESUME_WS_RESTORE_SEQUENCE', `resume-ws-${snapshot.resumeTickId}`, { snapshot }),
    );
  }

  return effects;
}
