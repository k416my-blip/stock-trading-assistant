import { describe, expect, it } from 'vitest';
import {
  INITIAL_RESUME_COORDINATOR_STATE,
  isResumeGlobalGateActive,
  transitionResumeCoordinator,
} from '../../../src/runtime/coordinator/RuntimeResumeCoordinator';
import { RESUME_BURST_BUDGET_PER_TICK } from '../../../src/constants/runtimeResumeCoordinator';
import { STABILITY_RESUME_RACE_MS } from '../../../src/constants/runtimeStability';

describe('RuntimeResumeCoordinator', () => {
  it('serializes foreground resume into resume_gate with budget reset', () => {
    const t = transitionResumeCoordinator(INITIAL_RESUME_COORDINATOR_STATE, {
      foregroundResume: true,
      resumeLatencyMs: STABILITY_RESUME_RACE_MS + 100,
      hydrationLockActive: false,
      hydrationOverlap: 0,
      reconnectPerMin: 0,
      asyncQueueDepth: 0,
      asyncQueueLagMs: 0,
      telemetryBurst: false,
      now: 1_000,
    });
    expect(t.state.phase).toBe('resume_gate');
    expect(t.state.resumeTickId).toBe(1);
    expect(t.state.resumeBudgetRemaining).toBe(RESUME_BURST_BUDGET_PER_TICK);
    expect(isResumeGlobalGateActive(t.state, 1_500)).toBe(true);
    expect(t.events).toContain('foreground_resume');
  });

  it('orders hydration before ws_restore on overlap', () => {
    let state = transitionResumeCoordinator(INITIAL_RESUME_COORDINATOR_STATE, {
      foregroundResume: true,
      resumeLatencyMs: 1200,
      hydrationLockActive: true,
      hydrationOverlap: 2,
      reconnectPerMin: 5,
      asyncQueueDepth: 0,
      asyncQueueLagMs: 0,
      telemetryBurst: false,
      now: 2_000,
    }).state;
    expect(state.phase).toBe('resume_gate');

    state = transitionResumeCoordinator(state, {
      foregroundResume: false,
      resumeLatencyMs: 0,
      hydrationLockActive: true,
      hydrationOverlap: 2,
      reconnectPerMin: 5,
      asyncQueueDepth: 0,
      asyncQueueLagMs: 0,
      telemetryBurst: false,
      now: 2_100,
    }).state;
    expect(state.phase).toBe('hydration');

    state = transitionResumeCoordinator(state, {
      foregroundResume: false,
      resumeLatencyMs: 0,
      hydrationLockActive: false,
      hydrationOverlap: 0,
      reconnectPerMin: 5,
      asyncQueueDepth: 0,
      asyncQueueLagMs: 0,
      telemetryBurst: false,
      now: 3_000,
    }).state;
    expect(state.phase).toBe('ws_restore');
  });

  it('consumes resume budget once per ws_restore tick', () => {
    let state = transitionResumeCoordinator(INITIAL_RESUME_COORDINATOR_STATE, {
      foregroundResume: true,
      resumeLatencyMs: 900,
      hydrationLockActive: false,
      hydrationOverlap: 0,
      reconnectPerMin: 4,
      asyncQueueDepth: 0,
      asyncQueueLagMs: 0,
      telemetryBurst: false,
      now: 5_000,
    }).state;
    state = transitionResumeCoordinator(state, {
      foregroundResume: false,
      resumeLatencyMs: 0,
      hydrationLockActive: false,
      hydrationOverlap: 0,
      reconnectPerMin: 4,
      asyncQueueDepth: 0,
      asyncQueueLagMs: 0,
      telemetryBurst: false,
      now: 5_100,
    }).state;
    expect(state.phase).toBe('ws_restore');

    const after = transitionResumeCoordinator(state, {
      foregroundResume: false,
      resumeLatencyMs: 0,
      hydrationLockActive: false,
      hydrationOverlap: 0,
      reconnectPerMin: 4,
      asyncQueueDepth: 0,
      asyncQueueLagMs: 0,
      telemetryBurst: false,
      now: 5_200,
    }).state;
    expect(after.wsRestoreScheduled).toBe(true);
    expect(after.resumeBudgetRemaining).toBe(RESUME_BURST_BUDGET_PER_TICK - 1);
    expect(after.phase).toBe('complete');
  });
});
