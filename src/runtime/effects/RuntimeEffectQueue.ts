import type { RuntimeEffect, RuntimeEffectPriority } from './RuntimeEffectTypes';

const PRIORITY_RANK: Record<RuntimeEffectPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
};

type QueueState = {
  pending: RuntimeEffect[];
  lastDedupeKeys: Map<string, number>;
};

const state: QueueState = {
  pending: [],
  lastDedupeKeys: new Map(),
};

let effectSeq = 0;

export function resetRuntimeEffectQueueForTest(): void {
  state.pending = [];
  state.lastDedupeKeys.clear();
  effectSeq = 0;
}

export function createEffectId(): string {
  effectSeq += 1;
  return `fx-${effectSeq}-${Date.now()}`;
}

export function enqueueRuntimeEffect(effect: RuntimeEffect, dedupeWindowMs = 400): boolean {
  const last = state.lastDedupeKeys.get(effect.dedupeKey);
  if (last != null && Date.now() - last < dedupeWindowMs) {
    return false;
  }
  state.lastDedupeKeys.set(effect.dedupeKey, Date.now());
  state.pending.push(effect);
  return true;
}

export function flushRuntimeEffectQueue(dropLowPriority: boolean): RuntimeEffect[] {
  let batch = state.pending.splice(0, state.pending.length);
  if (dropLowPriority) {
    batch = batch.filter((e) => e.priority !== 'LOW');
  }
  batch.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  return batch;
}

export function getPendingEffectCount(): number {
  return state.pending.length;
}
