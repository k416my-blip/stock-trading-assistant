import { TELEMETRY_COALESCE_WINDOW_MS } from '../../../constants/telemetryOverhead';

type Pending = { kind: string; detailJa: string; count: number; firstAt: number; lastAt: number };

const pending = new Map<string, Pending>();

export function resetEventCoalescingForTest(): void {
  pending.clear();
}

export function coalesceEvent(kind: string, detailJa: string, now = Date.now()): boolean {
  const key = kind;
  const cur = pending.get(key);
  if (!cur || now - cur.lastAt > TELEMETRY_COALESCE_WINDOW_MS) {
    pending.set(key, { kind, detailJa, count: 1, firstAt: now, lastAt: now });
    return true;
  }
  cur.count += 1;
  cur.lastAt = now;
  cur.detailJa = detailJa;
  return false;
}

export function flushCoalescedEvents(): Array<{ kind: string; detailJa: string; count: number }> {
  const out = [...pending.values()].map((p) => ({
    kind: p.kind,
    detailJa: `${p.detailJa} (×${p.count})`,
    count: p.count,
  }));
  pending.clear();
  return out;
}

export function coalescedPendingCount(): number {
  return pending.size;
}
