import type { SurvivabilityLayerId } from '../types/metaRuntimeOrchestration';
import { SURVIVABILITY_LAYER_PRIORITY } from '../constants/metaRuntimeOrchestration';

type QueueEntry = { layer: SurvivabilityLayerId; priority: number; queuedAt: number };

const queue: QueueEntry[] = [];

export function resetPriorityAwareSurvivabilityQueueForTest(): void {
  queue.length = 0;
}

export function enqueueLayer(layer: SurvivabilityLayerId, now = Date.now()): void {
  queue.push({
    layer,
    priority: SURVIVABILITY_LAYER_PRIORITY[layer] ?? 99,
    queuedAt: now,
  });
  queue.sort((a, b) => a.priority - b.priority);
  if (queue.length > 40) queue.splice(20);
}

export function dequeueNext(): SurvivabilityLayerId | null {
  const entry = queue.shift();
  return entry?.layer ?? null;
}

export function peekQueue(): SurvivabilityLayerId[] {
  return queue.map((e) => e.layer);
}
