import type { ReconnectSource } from '../../types/reconnectEntry';

export type ReconnectTracePhase =
  | 'request'
  | 'coalesce'
  | 'schedule'
  | 'budget_block'
  | 'defer'
  | 'execute'
  | 'stable';

export type ReconnectTraceEvent = {
  at: string;
  phase: ReconnectTracePhase;
  delayMs: number;
  allowed: boolean;
  storm: boolean;
  heartbeatDriftMs: number;
  detailJa: string;
  source?: ReconnectSource;
  token?: string;
};

const MAX_EVENTS = 48;
const events: ReconnectTraceEvent[] = [];
let lastHeartbeatDriftMs = 0;

export function resetReconnectSequenceTraceForTest(): void {
  events.length = 0;
  lastHeartbeatDriftMs = 0;
}

export function noteHeartbeatDrift(driftMs: number): void {
  lastHeartbeatDriftMs = driftMs;
}

export function recordReconnectTrace(
  partial: Omit<ReconnectTraceEvent, 'at' | 'heartbeatDriftMs'> & { heartbeatDriftMs?: number },
): void {
  events.push({
    at: new Date().toISOString(),
    heartbeatDriftMs: partial.heartbeatDriftMs ?? lastHeartbeatDriftMs,
    ...partial,
  });
  if (events.length > MAX_EVENTS) events.shift();
}

export function getReconnectSequenceTrace(): ReconnectTraceEvent[] {
  return [...events];
}

export function getLastReconnectTrace(): ReconnectTraceEvent | null {
  return events.at(-1) ?? null;
}

/** Ordered timeline for diagnostics / replay. */
export function getReconnectTraceTimeline(limit = MAX_EVENTS): ReconnectTraceEvent[] {
  return events.slice(-limit);
}

export function getReconnectTraceBySource(source: ReconnectSource): ReconnectTraceEvent[] {
  return events.filter((e) => e.source === source);
}
