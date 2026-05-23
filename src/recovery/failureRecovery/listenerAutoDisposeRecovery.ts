import { auditSubscriptionDispose } from '../../rn/bridgeSurvivability';

const staleListeners: string[] = [];

export function resetListenerAutoDisposeRecoveryForTest(): void {
  staleListeners.length = 0;
}

export function registerStaleListener(id: string): void {
  if (!staleListeners.includes(id)) staleListeners.push(id);
}

export function runListenerAutoDispose(max = 12): number {
  const batch = staleListeners.splice(0, max);
  for (const id of batch) auditSubscriptionDispose(id);
  return batch.length;
}
