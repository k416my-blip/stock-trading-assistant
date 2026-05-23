import { getImmutableMetrics } from '../../rn/bridgeSurvivability';
import { auditSubscriptionDispose } from '../../rn/bridgeSurvivability';

const emergencyIds: string[] = [];

export function resetLowMemoryEmergencyCompactionForTest(): void {
  emergencyIds.length = 0;
}

export function runLowMemoryEmergencyCompaction(
  jsHeapMb: number,
  memoryTrendPct: number,
): number {
  if (jsHeapMb < 150 && memoryTrendPct < 70) return 0;
  getImmutableMetrics('recovery-emergency', () => ({ compacted: true, at: Date.now() }));
  const stale = emergencyIds.splice(0, Math.min(8, emergencyIds.length));
  for (const id of stale) auditSubscriptionDispose(id);
  return stale.length;
}

export function registerEmergencySubscription(id: string): void {
  if (!emergencyIds.includes(id)) emergencyIds.push(id);
}
