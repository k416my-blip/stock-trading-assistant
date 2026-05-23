export type ReconnectTraceEvent = {
  at: string;
  phase: 'schedule' | 'budget_block' | 'defer' | 'execute' | 'stable';
  delayMs: number;
  allowed: boolean;
  storm: boolean;
  heartbeatDriftMs: number;
  detailJa: string;
};

const MAX_EVENTS = 32;
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
