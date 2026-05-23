/**
 * Runtime Self-Healing Orchestrator — phase machine and signal evaluation.
 */
import type {
  SelfHealingPhase,
  SelfHealingSignals,
} from '../../types/runtimeSelfHealing';
import {
  HEAP_VELOCITY_CRITICAL_PCT,
  HEAP_VELOCITY_WARNING_PCT,
  OBSERVER_ACCUMULATION_CRITICAL,
  OBSERVER_ACCUMULATION_WARNING,
  QUEUE_STAGNATION_CRITICAL_MS,
  QUEUE_STAGNATION_WARNING_MS,
  RECONNECT_LOOP_CRITICAL,
  RECONNECT_LOOP_WARNING,
  SELF_HEALING_COOLDOWN_MS,
  THERMAL_DEEP_FREEZE_PCT,
} from '../../constants/runtimeSelfHealing';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import type { PerformanceCostRuntimeSnapshot } from '../../types/performanceCost';
import { getJournalStats } from '../observability/runtimeEventJournal';
import { getAdaptiveLearningStore } from '../analysis/adaptiveRuntimeLearningStorage';
import { getHydrationLockState } from '../stability/hydrationLock';
import { getMemoryGuardianStats } from '../orchestrator/memoryPressureGuardian';
import { evaluateThermalRecovery } from './thermalRecoveryLayer';

let phase: SelfHealingPhase = 'HEALTHY';
let lastHealAt = 0;
let heapVelocityPct = 0;
const heapSamples: { at: number; mb: number }[] = [];

export function resetSelfHealingOrchestratorForTest(): void {
  phase = 'HEALTHY';
  lastHealAt = 0;
  heapVelocityPct = 0;
  heapSamples.length = 0;
}

function computeHeapVelocity(metrics: RuntimeTelemetryMetricsSnapshot): number {
  const now = Date.now();
  heapSamples.push({ at: now, mb: metrics.jsHeapEstimateMb });
  if (heapSamples.length > 12) heapSamples.shift();
  if (heapSamples.length < 2) return metrics.memoryTrendPct;
  const first = heapSamples[0];
  const last = heapSamples.at(-1)!;
  const dtMin = Math.max(0.5, (last.at - first.at) / 60_000);
  const slope = ((last.mb - first.mb) / Math.max(1, first.mb)) * 100 / dtMin;
  heapVelocityPct = Math.round(slope * 10) / 10;
  return heapVelocityPct;
}

export function collectSelfHealingSignals(
  metrics: RuntimeTelemetryMetricsSnapshot,
  performance: PerformanceCostRuntimeSnapshot,
): SelfHealingSignals {
  const guardian = getMemoryGuardianStats();
  const journal = getJournalStats();
  const store = getAdaptiveLearningStore();
  const hyd = getHydrationLockState();
  const thermal = evaluateThermalRecovery(
    metrics.thermalState,
    metrics.memoryTrendPct,
    metrics.native.batterySaverActive || performance.batterySaverActive,
  );

  return {
    heapGrowthVelocityPct: computeHeapVelocity(metrics),
    queueStagnationMs: metrics.asyncQueueLatencyMs,
    reconnectLoopCount: metrics.websocket.reconnectAttempts,
    observerAccumulation:
      guardian.orphanSubscriptions + guardian.staleTimers + hyd.overlapCount + hyd.wsMutationBlocked,
    timerDriftMs: metrics.longSession.websocketDegradationPct * 32,
    journalEventCount: journal.count,
    hydrationResidueCount: hyd.overlapCount + (hyd.active ? 1 : 0),
    adaptiveEdgeCount: Object.keys(store.edges).length,
    thermalPressurePct: thermal.thermalPressurePct,
    appForeground: performance.appForeground,
  };
}

export function resolveSelfHealingPhase(signals: SelfHealingSignals): SelfHealingPhase {
  if (!signals.appForeground) return 'HEALTHY';

  let severity = 0;
  if (signals.heapGrowthVelocityPct >= HEAP_VELOCITY_CRITICAL_PCT) severity += 2;
  else if (signals.heapGrowthVelocityPct >= HEAP_VELOCITY_WARNING_PCT) severity += 1;

  if (signals.queueStagnationMs >= QUEUE_STAGNATION_CRITICAL_MS) severity += 2;
  else if (signals.queueStagnationMs >= QUEUE_STAGNATION_WARNING_MS) severity += 1;

  if (signals.reconnectLoopCount >= RECONNECT_LOOP_CRITICAL) severity += 2;
  else if (signals.reconnectLoopCount >= RECONNECT_LOOP_WARNING) severity += 1;

  if (signals.observerAccumulation >= OBSERVER_ACCUMULATION_CRITICAL) severity += 2;
  else if (signals.observerAccumulation >= OBSERVER_ACCUMULATION_WARNING) severity += 1;

  if (signals.thermalPressurePct >= THERMAL_DEEP_FREEZE_PCT) severity += 2;
  if (signals.journalEventCount > 4000) severity += 1;

  if (severity >= 5) return 'EMERGENCY_RECOVERY';
  if (severity >= 3) return 'SELF_HEALING';
  if (severity >= 1) return 'RECOVERING';
  return 'HEALTHY';
}

export function getSelfHealingPhase(): SelfHealingPhase {
  return phase;
}

export function shouldRunSelfHealingPass(nowMs = Date.now()): boolean {
  return nowMs - lastHealAt >= SELF_HEALING_COOLDOWN_MS;
}

export function noteSelfHealingPassComplete(nowMs = Date.now()): void {
  lastHealAt = nowMs;
}

export function updateSelfHealingPhase(next: SelfHealingPhase): void {
  phase = next;
}

export function getHeapGrowthVelocityPct(): number {
  return heapVelocityPct;
}
