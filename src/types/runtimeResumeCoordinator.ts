export type ResumeCoordinatorPhase =
  | 'idle'
  | 'resume_gate'
  | 'hydration'
  | 'telemetry_defer'
  | 'async_drain'
  | 'ws_restore'
  | 'complete';

export type ResumeCoordinatorEvent =
  | 'foreground_resume'
  | 'hydration_start'
  | 'hydration_end'
  | 'telemetry_burst'
  | 'async_pressure'
  | 'ws_restore_ready'
  | 'tick_complete';

export type ResumeCoordinatorState = {
  phase: ResumeCoordinatorPhase;
  resumeTickId: number;
  globalGateUntil: number;
  resumeBudgetRemaining: number;
  hydrationPauseUntil: number;
  telemetryDeferred: boolean;
  asyncBurstSuppressed: boolean;
  reconnectCoalescePending: boolean;
  wsRestoreScheduled: boolean;
  observedAt: string;
};

export type ResumeCoordinatorInput = {
  foregroundResume: boolean;
  resumeLatencyMs: number;
  hydrationLockActive: boolean;
  hydrationOverlap: number;
  reconnectPerMin: number;
  asyncQueueDepth: number;
  asyncQueueLagMs: number;
  telemetryBurst: boolean;
  now?: number;
};

export type ResumeCoordinatorPlan = {
  phase: ResumeCoordinatorPhase;
  globalGateMs: number;
  deferTelemetry: boolean;
  suppressAsyncBurst: boolean;
  allowWsRestore: boolean;
  coalesceReconnect: boolean;
  hydrationPauseMs: number;
  summaryJa: string;
};

export type ResumeCoordinatorTransition = {
  state: ResumeCoordinatorState;
  plan: ResumeCoordinatorPlan;
  events: ResumeCoordinatorEvent[];
};

export type ResumeCoordinatorSnapshot = ResumeCoordinatorState & {
  plan: ResumeCoordinatorPlan;
};
