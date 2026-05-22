import {
  EVENTLOOP_BUSY_THRESHOLD,
  EVENTLOOP_CRITICAL_THRESHOLD,
  EVENTLOOP_SATURATED_THRESHOLD,
} from '../constants/asyncRuntimeCoordinator';
import type {
  AsyncRuntimeMetricsSnapshot,
  EvaluateAsyncRuntimeInput,
  EventLoopState,
} from '../types/asyncRuntimeCoordinator';

export type EventLoopMonitorInput = EvaluateAsyncRuntimeInput & {
  asyncQueueDepth: number;
  taskExecutionLatencyMs: number;
  microtaskBurstCount: number;
  websocketFrameDelayMs: number;
  hydrationCollisionRisk: number;
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function classifyEventLoopState(pressure: number): EventLoopState {
  if (pressure >= EVENTLOOP_CRITICAL_THRESHOLD) return 'EVENTLOOP_CRITICAL';
  if (pressure >= EVENTLOOP_SATURATED_THRESHOLD) return 'EVENTLOOP_SATURATED';
  if (pressure >= EVENTLOOP_BUSY_THRESHOLD) return 'EVENTLOOP_BUSY';
  return 'EVENTLOOP_OK';
}

export function evaluateEventLoopPressure(input: EventLoopMonitorInput): AsyncRuntimeMetricsSnapshot {
  const eventLoopPressure = clamp(
    input.asyncQueueDepth * 6 +
      input.taskExecutionLatencyMs / 12 +
      input.microtaskBurstCount * 5 +
      input.renderBurstRate * 4 +
      input.cascadePressure * 0.35 +
      (input.memoryPressure ? 12 : 0),
  );

  const microtaskBurstRisk = clamp(input.microtaskBurstCount * 12 + input.renderBurstRate * 3);
  const renderBlockRisk = clamp(
    input.renderBurstRate * 6 +
      input.taskExecutionLatencyMs / 15 +
      (input.cascadePressure > 58 ? 20 : 0),
  );

  return {
    eventLoopPressure,
    microtaskBurstRisk,
    renderBlockRisk,
    asyncQueueDepth: input.asyncQueueDepth,
    taskExecutionLatencyMs: input.taskExecutionLatencyMs,
    websocketFrameDelayMs: input.websocketFrameDelayMs,
    hydrationCollisionRisk: input.hydrationCollisionRisk,
    eventLoopState: classifyEventLoopState(eventLoopPressure),
    measuredAt: new Date().toISOString(),
  };
}
