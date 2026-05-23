const RECONNECT_WINDOW_MS = 60_000;

type ReconnectEvent = { at: number; socketKey: string };

let events: ReconnectEvent[] = [];
let duplicateSocketCount = 0;
const activeSockets = new Set<string>();

export function resetRuntimeReconnectTrackerForTest(): void {
  events = [];
  duplicateSocketCount = 0;
  activeSockets.clear();
}

function prune(now: number): void {
  events = events.filter((e) => now - e.at < RECONNECT_WINDOW_MS);
}

export function noteRuntimeReconnect(socketKey = 'default', at = Date.now()): void {
  prune(at);
  if (activeSockets.has(socketKey)) {
    duplicateSocketCount += 1;
  } else {
    activeSockets.add(socketKey);
  }
  events.push({ at, socketKey });
}

export function noteRuntimeSocketClosed(socketKey = 'default'): void {
  activeSockets.delete(socketKey);
}

export function getReconnectPerMin(now = Date.now()): number {
  prune(now);
  return events.length;
}

export function getWsDuplicateCount(): number {
  return duplicateSocketCount;
}

export function isReconnectStorm(thresholdPerMin: number, now = Date.now()): boolean {
  return getReconnectPerMin(now) >= thresholdPerMin;
}
