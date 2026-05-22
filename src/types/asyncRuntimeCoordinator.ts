export type AsyncTaskQueue = 'HIGH' | 'NORMAL' | 'LOW' | 'IDLE_ONLY';

export type AsyncTaskKind =
  | 'orchestration'
  | 'explanation'
  | 'dashboard'
  | 'websocket'
  | 'memory_graph'
  | 'hydration'
  | 'metrics';

export type EventLoopState =
  | 'EVENTLOOP_OK'
  | 'EVENTLOOP_BUSY'
  | 'EVENTLOOP_SATURATED'
  | 'EVENTLOOP_CRITICAL';

export type AsyncRuntimeMetricsSnapshot = {
  eventLoopPressure: number;
  microtaskBurstRisk: number;
  renderBlockRisk: number;
  asyncQueueDepth: number;
  taskExecutionLatencyMs: number;
  websocketFrameDelayMs: number;
  hydrationCollisionRisk: number;
  eventLoopState: EventLoopState;
  measuredAt: string;
};

export type AsyncRuntimeEvaluation = {
  state: EventLoopState;
  stateLabelJa: string;
  metrics: AsyncRuntimeMetricsSnapshot;
  summaryJa: string;
  compactDashboardMode: boolean;
  maxDashboardFps: number;
  websocketLightweight: boolean;
  hydrationPaused: boolean;
  deferHeavyTasks: boolean;
};

export type EvaluateAsyncRuntimeInput = {
  cascadePressure: number;
  renderBurstRate: number;
  queueSize: number;
  memoryPressure: boolean;
  batterySaver: boolean;
  appForeground: boolean;
  sessionMinutes: number;
};
