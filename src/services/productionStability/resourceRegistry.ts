/**
 * Memory leak protection — intervals / listeners / async 登録の追跡と cleanup
 */
type IntervalEntry = { id: ReturnType<typeof setInterval>; label: string };
type ListenerEntry = { remove: () => void; label: string };

const intervals = new Map<number, IntervalEntry>();
const listeners = new Map<number, ListenerEntry>();
let intervalSeq = 0;
let listenerSeq = 0;

export function registerInterval(
  fn: () => void,
  ms: number,
  label: string,
): ReturnType<typeof setInterval> {
  const id = setInterval(fn, ms);
  const key = ++intervalSeq;
  intervals.set(key, { id, label });
  return id;
}

export function clearRegisteredInterval(id: ReturnType<typeof setInterval>): void {
  clearInterval(id);
  for (const [key, entry] of intervals) {
    if (entry.id === id) {
      intervals.delete(key);
      break;
    }
  }
}

export function registerListener(remove: () => void, label: string): () => void {
  const key = ++listenerSeq;
  listeners.set(key, { remove, label });
  return () => {
    remove();
    listeners.delete(key);
  };
}

export function getResourceRegistryCounts(): { intervals: number; listeners: number } {
  return { intervals: intervals.size, listeners: listeners.size };
}

export function disposeAllRegisteredResources(): void {
  for (const entry of intervals.values()) {
    clearInterval(entry.id);
  }
  intervals.clear();
  for (const entry of listeners.values()) {
    try {
      entry.remove();
    } catch {
      /* ignore */
    }
  }
  listeners.clear();
}

export function resetResourceRegistryForTest(): void {
  disposeAllRegisteredResources();
}
