import type { FailureRecoveryTimelineEntry } from '../../types/failureRecoveryOrchestrator';
import { beginRecovery, completeRecovery } from '../../native/soak/recoveryTimeTracker';
import { recordSoakTimeline } from '../../native/soak/sessionTimelineRecorder';

const clusters: { pattern: string; count: number; lastAt: number }[] = [];
let soakHookEnabled = false;

export function setSoakIntegrationEnabled(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function resetFailureRecoverySoakIntegrationForTest(): void {
  clusters.length = 0;
}

export function recordFailureRecoverySoakEvent(
  entry: FailureRecoveryTimelineEntry,
  recovered: boolean,
): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('recovery', `self-heal ${entry.flow} · ${entry.to} · ${entry.detailJa}`);
  const kind =
    entry.flow === 'network'
      ? 'websocket'
      : entry.flow === 'background'
        ? 'background'
        : 'lifecycle';
  beginRecovery(kind);
  completeRecovery(kind, recovered, entry.detailJa);
  clusterFailurePattern(`${entry.flow}:${entry.to}`);
}

function clusterFailurePattern(pattern: string, now = Date.now()): void {
  const existing = clusters.find((c) => c.pattern === pattern);
  if (existing) {
    existing.count += 1;
    existing.lastAt = now;
    return;
  }
  clusters.push({ pattern, count: 1, lastAt: now });
  if (clusters.length > 80) clusters.shift();
}

export function getRepeatedFailurePatterns(minCount = 3): { pattern: string; count: number }[] {
  return clusters
    .filter((c) => c.count >= minCount)
    .map((c) => ({ pattern: c.pattern, count: c.count }))
    .sort((a, b) => b.count - a.count);
}

export function getRecoveryClusterSummary(): string {
  const top = getRepeatedFailurePatterns(2);
  if (top.length === 0) return 'no repeated failure clusters';
  return top.map((t) => `${t.pattern}×${t.count}`).join(' · ');
}
