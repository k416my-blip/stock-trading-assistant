/**
 * Pure resume orchestration state machine — no I/O, no service mutations.
 * At most one phase advance per tick (resume entry may reset the pipeline).
 */
import type {
  ResumeCoordinatorEvent,
  ResumeCoordinatorInput,
  ResumeCoordinatorPhase,
  ResumeCoordinatorPlan,
  ResumeCoordinatorState,
  ResumeCoordinatorTransition,
} from '../../types/runtimeResumeCoordinator';
import {
  RESUME_BURST_BUDGET_PER_TICK,
  RESUME_COORDINATOR_ASYNC_DRAIN_MS,
  RESUME_COORDINATOR_GLOBAL_GATE_MS,
  RESUME_COORDINATOR_HYDRATION_PAUSE_MS,
  RESUME_COORDINATOR_TELEMETRY_DEFER_MS,
  RESUME_COORDINATOR_WS_RESTORE_DELAY_MS,
} from '../../constants/runtimeResumeCoordinator';
import { STABILITY_RESUME_RACE_MS } from '../../constants/runtimeStability';

export const INITIAL_RESUME_COORDINATOR_STATE: ResumeCoordinatorState = {
  phase: 'idle',
  resumeTickId: 0,
  globalGateUntil: 0,
  resumeBudgetRemaining: RESUME_BURST_BUDGET_PER_TICK,
  hydrationPauseUntil: 0,
  telemetryDeferred: false,
  asyncBurstSuppressed: false,
  reconnectCoalescePending: false,
  wsRestoreScheduled: false,
  observedAt: new Date(0).toISOString(),
};

function planForPhase(phase: ResumeCoordinatorPhase, summaryJa: string): ResumeCoordinatorPlan {
  return {
    phase,
    globalGateMs: phase === 'resume_gate' ? RESUME_COORDINATOR_GLOBAL_GATE_MS : 0,
    deferTelemetry: phase === 'telemetry_defer' || phase === 'resume_gate',
    suppressAsyncBurst: phase === 'async_drain' || phase === 'resume_gate' || phase === 'hydration',
    allowWsRestore: phase === 'ws_restore' || phase === 'complete',
    coalesceReconnect: phase === 'ws_restore' || phase === 'complete',
    hydrationPauseMs: phase === 'hydration' ? RESUME_COORDINATOR_HYDRATION_PAUSE_MS : 0,
    summaryJa,
  };
}

function buildTransition(
  state: ResumeCoordinatorState,
  events: ResumeCoordinatorEvent[],
  now: number,
): ResumeCoordinatorTransition {
  return {
    state: { ...state, observedAt: new Date(now).toISOString() },
    plan: planForPhase(state.phase, `resume tick ${state.resumeTickId} · ${state.phase}`),
    events,
  };
}

/** Pure transition — deterministic given state + input. One phase step per tick. */
export function transitionResumeCoordinator(
  prev: ResumeCoordinatorState,
  input: ResumeCoordinatorInput,
): ResumeCoordinatorTransition {
  const now = input.now ?? Date.now();
  const events: ResumeCoordinatorEvent[] = [];
  const state: ResumeCoordinatorState = { ...prev };

  const reconnectBurst = input.reconnectPerMin >= 3;
  const hydrationOverlap = input.hydrationOverlap >= 1;
  const asyncPressure =
    input.asyncQueueDepth >= 35 || input.asyncQueueLagMs >= 200;

  if (input.foregroundResume) {
    events.push('foreground_resume');
    state.resumeTickId += 1;
    state.resumeBudgetRemaining = RESUME_BURST_BUDGET_PER_TICK;
    state.phase = 'resume_gate';
    state.globalGateUntil = now + RESUME_COORDINATOR_GLOBAL_GATE_MS;
    state.telemetryDeferred = true;
    state.asyncBurstSuppressed = true;
    state.reconnectCoalescePending = true;
    state.wsRestoreScheduled = false;
    return buildTransition(state, events, now);
  }

  switch (state.phase) {
    case 'idle':
      break;
    case 'resume_gate':
      if (hydrationOverlap || input.hydrationLockActive) {
        events.push('hydration_start');
        state.phase = 'hydration';
        state.hydrationPauseUntil = now + RESUME_COORDINATOR_HYDRATION_PAUSE_MS;
      } else if (input.telemetryBurst) {
        events.push('telemetry_burst');
        state.phase = 'telemetry_defer';
      } else if (asyncPressure) {
        events.push('async_pressure');
        state.phase = 'async_drain';
      } else if (reconnectBurst || state.reconnectCoalescePending) {
        state.phase = 'ws_restore';
      }
      break;
    case 'hydration':
      if (!input.hydrationLockActive && now >= state.hydrationPauseUntil) {
        events.push('hydration_end');
        state.phase = input.telemetryBurst
          ? 'telemetry_defer'
          : asyncPressure
            ? 'async_drain'
            : 'ws_restore';
      }
      break;
    case 'telemetry_defer':
      if (!input.telemetryBurst) {
        state.phase = asyncPressure ? 'async_drain' : 'ws_restore';
      }
      break;
    case 'async_drain':
      if (!asyncPressure) {
        events.push('ws_restore_ready');
        state.phase = 'ws_restore';
      }
      break;
    case 'ws_restore':
      if (state.resumeBudgetRemaining > 0) {
        state.wsRestoreScheduled = true;
        state.reconnectCoalescePending = false;
        state.resumeBudgetRemaining -= 1;
        state.phase = 'complete';
        events.push('tick_complete');
      }
      break;
    case 'complete':
      if (now > state.globalGateUntil) {
        state.phase = 'idle';
        state.telemetryDeferred = false;
        state.asyncBurstSuppressed = false;
      }
      break;
    default:
      break;
  }

  return buildTransition(state, events, now);
}

export function isResumeGlobalGateActive(state: ResumeCoordinatorState, now = Date.now()): boolean {
  return state.phase !== 'idle' && now < state.globalGateUntil;
}

export function shouldCoalesceReconnect(state: ResumeCoordinatorState): boolean {
  return state.reconnectCoalescePending || state.phase === 'ws_restore';
}

export function shouldDeferTelemetry(state: ResumeCoordinatorState): boolean {
  return state.telemetryDeferred;
}

export function shouldSuppressAsyncBurst(state: ResumeCoordinatorState): boolean {
  return state.asyncBurstSuppressed;
}

export {
  RESUME_COORDINATOR_TELEMETRY_DEFER_MS,
  RESUME_COORDINATOR_ASYNC_DRAIN_MS,
  RESUME_COORDINATOR_WS_RESTORE_DELAY_MS,
  STABILITY_RESUME_RACE_MS,
};
