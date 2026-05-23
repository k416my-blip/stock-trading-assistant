/**
 * Recovery dashboard aggregation.
 */
import type {
  RecoveryDashboard,
  RuntimeSelfHealingBundle,
  SelfHealingActionRecord,
} from '../../types/runtimeSelfHealing';
import { getTotalReclaimedBytes } from './memoryReclamationEngine';
import { getTotalZombiesCleared } from './zombieTaskCleaner';
import { getLastTimerDriftMs, getLastDriftRecoveryScore } from './timerDriftCorrector';
import { getWebSocketRebuildCount } from './websocketZombieRecovery';
import { getObserverLeakStats } from './observerLeakPrevention';

const recentActions: SelfHealingActionRecord[] = [];

export function resetRecoveryDashboardForTest(): void {
  recentActions.length = 0;
}

export function recordSelfHealingAction(phase: RecoveryDashboard['phase'], actionJa: string, reclaimedBytes?: number): void {
  recentActions.push({
    at: new Date().toISOString(),
    phase,
    actionJa,
    reclaimedBytes,
  });
  if (recentActions.length > 32) recentActions.shift();
}

export function buildRecoveryDashboard(bundle: Omit<RuntimeSelfHealingBundle, 'dashboard'>): RecoveryDashboard {
  const obs = getObserverLeakStats();
  const heapStabilizationScore =
    bundle.signals.heapGrowthVelocityPct <= 12
      ? 0.95
      : Math.max(0.35, 1 - bundle.signals.heapGrowthVelocityPct / 50);

  return {
    heapStabilizationScore: Math.round(heapStabilizationScore * 1000) / 1000,
    reclaimedMemoryKb: Math.round(getTotalReclaimedBytes() / 1024),
    zombieCleanupCount: getTotalZombiesCleared(),
    timerDriftMs: getLastTimerDriftMs(),
    driftRecoveryScore: getLastDriftRecoveryScore(),
    reconnectRebuildCount: getWebSocketRebuildCount(),
    observerLeakPrevented:
      obs.duplicateRemoved + obs.staleDetached + obs.dashboardCapped + obs.hydrationPruned,
    thermalRecovery: bundle.thermalRecovery,
    adaptiveGraphCompactionPct: Math.round(bundle.graphCompaction.compactionRatio * 100),
    phase: bundle.phase,
    recentActions: [...recentActions],
  };
}

export function formatRecoveryDashboardMarkdown(dashboard: RecoveryDashboard): string {
  return [
    '# Runtime Self-Healing Dashboard',
    '',
    `**Phase:** ${dashboard.phase}`,
    `**Heap stabilization:** ${dashboard.heapStabilizationScore}`,
    `**Reclaimed memory:** ${dashboard.reclaimedMemoryKb} KB`,
    `**Zombie cleanups:** ${dashboard.zombieCleanupCount}`,
    `**Timer drift:** ${dashboard.timerDriftMs}ms (recovery ${dashboard.driftRecoveryScore})`,
    `**WS rebuilds:** ${dashboard.reconnectRebuildCount}`,
    `**Observer leaks prevented:** ${dashboard.observerLeakPrevented}`,
    `**Graph compact:** ${dashboard.adaptiveGraphCompactionPct}%`,
    '',
    '## Thermal',
    `- Deep freeze: ${dashboard.thermalRecovery.deepAnalysisFrozen}`,
    `- Staged recovery: ${dashboard.thermalRecovery.stagedRecoveryActive}`,
    '',
    '## Recent actions',
    ...dashboard.recentActions.slice(-8).map((a) => `- [${a.at}] ${a.actionJa}`),
  ].join('\n');
}
