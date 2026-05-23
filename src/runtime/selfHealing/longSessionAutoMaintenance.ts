/**
 * Long session auto-maintenance — 30/60/120/180 minute passes.
 */
import type { LongSessionMaintenanceResult } from '../../types/runtimeSelfHealing';
import { MAINTENANCE_WINDOWS_MIN } from '../../constants/runtimeSelfHealing';
import { runMemoryReclamation } from './memoryReclamationEngine';
import { compactAdaptiveGraph } from './adaptiveGraphCompactor';
import { runObserverLeakPrevention } from './observerLeakPrevention';
import { compactStalePriorityQueue } from '../orchestrator/asyncPriorityScheduler';
import { releaseHydrationLock } from '../stability/hydrationLock';
import { setHydrationRestorePhase } from '../stability/hydrationReconnectGate';

const completedWindows = new Set<number>();

export function resetLongSessionAutoMaintenanceForTest(): void {
  completedWindows.clear();
}

export function runLongSessionAutoMaintenance(
  sessionMinutes: number,
  signals: { observerAccumulation: number; hydrationResidueCount: number },
): LongSessionMaintenanceResult[] {
  const results: LongSessionMaintenanceResult[] = [];

  for (const window of MAINTENANCE_WINDOWS_MIN) {
    if (sessionMinutes < window) continue;
    const windowKey = window;
    const alreadyRan = completedWindows.has(windowKey);

    const actionsJa: string[] = [];
    let replayCompacted = false;
    let observerPruned = false;
    let adaptiveThinned = false;
    let queueRebalanced = false;
    let selfRestartPhase = false;

    if (window === 30) {
      const reclaim = runMemoryReclamation({ force: !alreadyRan });
      replayCompacted = reclaim.journalCompacted > 0;
      const obs = runObserverLeakPrevention(signals.observerAccumulation);
      observerPruned = obs.hydrationListenersPruned + obs.duplicateSubscriptionsRemoved > 0;
      actionsJa.push(`30m: journal compact ${reclaim.journalCompacted}, observer prune`);
    }

    if (window === 60) {
      const compact = compactAdaptiveGraph(!alreadyRan);
      adaptiveThinned = compact.edgesAfter < compact.edgesBefore;
      const pruned = compactStalePriorityQueue(120_000);
      queueRebalanced = pruned > 0;
      actionsJa.push(`60m: adaptive thin ${compact.compactionRatio}, queue rebalance ${pruned}`);
    }

    if (window === 120) {
      runMemoryReclamation({ force: true });
      compactAdaptiveGraph(true);
      if (signals.hydrationResidueCount > 0) {
        releaseHydrationLock();
        setHydrationRestorePhase('idle');
      }
      selfRestartPhase = true;
      actionsJa.push('120m: lightweight self-restart phase, hydration sweep');
    }

    if (window === 180) {
      runMemoryReclamation({ force: true });
      compactAdaptiveGraph(true);
      compactStalePriorityQueue(60_000);
      selfRestartPhase = true;
      actionsJa.push('180m: orchestration rebuild prep, deep compact');
    }

    if (!alreadyRan) completedWindows.add(windowKey);

    results.push({
      windowMinutes: window,
      actionsJa,
      replayCompacted,
      observerPruned,
      adaptiveThinned,
      queueRebalanced,
      selfRestartPhase,
    });
  }

  return results;
}
