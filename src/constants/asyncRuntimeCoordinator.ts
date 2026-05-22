import type { AsyncTaskKind, AsyncTaskQueue, EventLoopState } from '../types/asyncRuntimeCoordinator';

export const ASYNC_CONCURRENT_LIMIT = 2;
export const ASYNC_BURST_WINDOW_MS = 1000;
export const ASYNC_MAX_BURST_PER_WINDOW = 12;
export const ASYNC_QUEUE_AGING_MS = 8000;
export const ASYNC_STARVATION_BOOST_MS = 4000;
export const COOPERATIVE_YIELD_MS = 4;
export const DASHBOARD_MAX_FPS_STABLE = 30;
export const DASHBOARD_MAX_FPS_COMPACT = 12;
export const FRAME_COALESCE_MS = 32;
export const HYDRATION_PAUSE_WINDOW_MS = 900;
export const ASYNC_RESUME_COOLDOWN_MS = 1500;
export const POST_RESUME_LIGHTWEIGHT_MS = 20_000;
export const LONG_SESSION_ASYNC_MINUTES = 30;
export const EXTENDED_SESSION_ASYNC_MINUTES = 60;

export const ASYNC_BUDGET_PER_SECOND: Record<AsyncTaskKind, number> = {
  orchestration: 3,
  explanation: 4,
  dashboard: 8,
  websocket: 2,
  memory_graph: 2,
  hydration: 3,
  metrics: 10,
};

export const EVENTLOOP_BUSY_THRESHOLD = 42;
export const EVENTLOOP_SATURATED_THRESHOLD = 62;
export const EVENTLOOP_CRITICAL_THRESHOLD = 82;

export const EVENTLOOP_STATE_LABELS_JA: Record<EventLoopState, string> = {
  EVENTLOOP_OK: 'イベントループ安定',
  EVENTLOOP_BUSY: 'イベントループ負荷',
  EVENTLOOP_SATURATED: 'イベントループ飽和',
  EVENTLOOP_CRITICAL: 'イベントループ危機',
};

export const ASYNC_UI_LABELS_JA = {
  panelSection: 'Async Runtime Coordinator',
  eventLoopPressure: 'Event Loop Pressure',
  asyncQueueDepth: 'Async Queue Depth',
  taskLatency: 'Task Latency (ms)',
  renderBlockRisk: 'Render Block Risk',
  websocketFrameDelay: 'WS Frame Delay (ms)',
  hydrationCollisionRisk: 'Hydration Collision Risk',
  state: 'Event Loop State',
} as const;

export const QUEUE_PRIORITY: Record<AsyncTaskQueue, number> = {
  HIGH: 0,
  NORMAL: 1,
  LOW: 2,
  IDLE_ONLY: 3,
};
