/**
 * Signal-phase tick + snapshot for kernel (transition is pure).
 */
import type {
  ResumeCoordinatorInput,
  ResumeCoordinatorSnapshot,
} from '../../types/runtimeResumeCoordinator';
import type { PerformanceCostRuntimeSnapshot } from '../../types/performanceCost';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import type { RuntimeStabilitySnapshot } from '../../types/runtimeStability';
import {
  INITIAL_RESUME_COORDINATOR_STATE,
  transitionResumeCoordinator,
} from './RuntimeResumeCoordinator';
import { getHydrationLockState } from '../stability/hydrationLock';
import { getReconnectPerMin } from '../stability/RuntimeReconnectTracker';
import { getMiuiDiagnostics } from '../stability/miuiBatteryDiagnostics';

let currentState = { ...INITIAL_RESUME_COORDINATOR_STATE };
let lastSnapshot: ResumeCoordinatorSnapshot | null = null;

export function resetRuntimeResumeCoordinatorForTest(): void {
  currentState = { ...INITIAL_RESUME_COORDINATOR_STATE };
  lastSnapshot = null;
}

export function getResumeCoordinatorSnapshot(): ResumeCoordinatorSnapshot | null {
  return lastSnapshot;
}

export function tickResumeCoordinator(input: ResumeCoordinatorInput): ResumeCoordinatorSnapshot {
  const result = transitionResumeCoordinator(currentState, input);
  currentState = result.state;
  lastSnapshot = { ...result.state, plan: result.plan };
  return lastSnapshot;
}

export function observeResumeCoordinatorTick(
  metrics: RuntimeTelemetryMetricsSnapshot,
  performance: PerformanceCostRuntimeSnapshot,
  stability: RuntimeStabilitySnapshot,
): ResumeCoordinatorSnapshot {
  const miui = getMiuiDiagnostics();
  const hydration = getHydrationLockState();
  const foregroundResume =
    performance.appForeground &&
    (miui.resumeLatencyMs >= 800 || stability.anomalies.some((a) => a.kind === 'resume_race'));

  return tickResumeCoordinator({
    foregroundResume,
    resumeLatencyMs: miui.resumeLatencyMs || metrics.foregroundResumeDurationMs || 0,
    hydrationLockActive: hydration.active,
    hydrationOverlap: hydration.overlapCount,
    reconnectPerMin: getReconnectPerMin(),
    asyncQueueDepth: metrics.asyncQueueDepth,
    asyncQueueLagMs: metrics.asyncQueueLatencyMs,
    telemetryBurst: stability.anomalies.some(
      (a) => a.kind === 'heartbeat_gap' || a.kind === 'miui_battery_kill',
    ),
  });
}
