/**
 * Tracker state export/import for deterministic replay and debug.
 */
import type { RuntimeStabilitySnapshot } from '../../types/runtimeStability';
import { getReconnectSequenceTrace, resetReconnectSequenceTraceForTest } from './reconnectSequenceTrace';
import { getReconnectPerMin, resetRuntimeReconnectTrackerForTest } from './RuntimeReconnectTracker';
import { getHydrationLockState, resetHydrationLockForTest } from './hydrationLock';
import { resetHydrationReconnectGateForTest, getHydrationRestorePhase } from './hydrationReconnectGate';
import { getMiuiDiagnostics, resetMiuiBatteryDiagnosticsForTest } from './miuiBatteryDiagnostics';
import { getAsyncQueueMetrics, resetRuntimeAsyncQueueTrackerForTest } from './RuntimeAsyncQueueTracker';
import { getLastRuntimeStabilitySnapshot } from './RuntimeHealthMonitor';
import { resetHydrationRestoreSequencerForTest } from './hydrationRestoreSequencer';
import { resetReconnectCoordinatorForTest } from './reconnectCoordinator';
import { resetReconnectStormGuardForTest } from './reconnectStormGuard';
import { resetRuntimeHeartbeatTrackerForTest } from './RuntimeHeartbeatTracker';
import { resetRuntimeMemoryPressureTrackerForTest } from './RuntimeMemoryPressureTracker';
import { resetRuntimeThermalTrackerForTest } from './RuntimeThermalTracker';

export type TrackerReplaySnapshot = {
  stability: RuntimeStabilitySnapshot | null;
  reconnectPerMin: number;
  hydrationLock: ReturnType<typeof getHydrationLockState>;
  hydrationPhase: ReturnType<typeof getHydrationRestorePhase>;
  asyncQueue: ReturnType<typeof getAsyncQueueMetrics>;
  miui: ReturnType<typeof getMiuiDiagnostics>;
  reconnectTraceCount: number;
  exportedAt: string;
};

export function exportTrackerReplaySnapshot(): TrackerReplaySnapshot {
  return {
    stability: getLastRuntimeStabilitySnapshot(),
    reconnectPerMin: getReconnectPerMin(),
    hydrationLock: getHydrationLockState(),
    hydrationPhase: getHydrationRestorePhase(),
    asyncQueue: getAsyncQueueMetrics(),
    miui: getMiuiDiagnostics(),
    reconnectTraceCount: getReconnectSequenceTrace().length,
    exportedAt: new Date().toISOString(),
  };
}

export function resetAllRuntimeTrackersForReplay(): void {
  resetRuntimeReconnectTrackerForTest();
  resetReconnectStormGuardForTest();
  resetReconnectSequenceTraceForTest();
  resetHydrationLockForTest();
  resetHydrationReconnectGateForTest();
  resetHydrationRestoreSequencerForTest();
  resetReconnectCoordinatorForTest();
  resetMiuiBatteryDiagnosticsForTest();
  resetRuntimeAsyncQueueTrackerForTest();
  resetRuntimeHeartbeatTrackerForTest();
  resetRuntimeMemoryPressureTrackerForTest();
  resetRuntimeThermalTrackerForTest();
}

/** Replay helper — reset trackers then optionally validate snapshot shape. */
export function prepareReplayFromSnapshot(_snapshot: TrackerReplaySnapshot): void {
  resetAllRuntimeTrackersForReplay();
}
