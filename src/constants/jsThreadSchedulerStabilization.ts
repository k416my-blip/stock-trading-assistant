export const JS_THREAD_STABILIZATION_VERSION = '1.0.0';

export const JS_STALL_WARN_MS = 200;
export const JS_STALL_FREEZE_MS = 480;
export const JS_SCHEDULER_DRIFT_WARN_MS = 120;
export const JS_GC_SPIKE_HEAP_DROP_MB = 4;
export const JS_GC_COOLDOWN_MS = 8_000;
export const JS_TASK_BUDGET_MS = 12;
export const JS_FRAME_BUDGET_MS = 16;
export const JS_CALLBACK_DENSITY_MAX = 32;
export const JS_TIMER_COALESCE_MS = 250;
export const JS_LONG_SESSION_RESYNC_MS = 30 * 60 * 1000;
export const JS_CHOREOGRAPHER_CALLBACK_CAP = 8;

export const JS_STABILIZATION_UI_JA = {
  sectionTitle: 'JS Thread Stabilization',
  safety: '監視・スケジューラ最適化のみ — runtime policy / telemetry 意味は変更しません',
  survival: 'JS survival',
  eventLoopLag: 'Event loop lag',
  schedulerDrift: 'Scheduler drift',
  gcSpike: 'GC spike',
  framePressure: 'Frame pressure',
} as const;
