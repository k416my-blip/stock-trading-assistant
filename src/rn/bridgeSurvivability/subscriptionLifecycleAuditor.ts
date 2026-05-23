type Sub = { id: string; at: number; disposed: boolean };

const subs = new Map<string, Sub>();

export function resetSubscriptionLifecycleAuditorForTest(): void {
  subs.clear();
}

export function auditSubscriptionRegister(id: string): void {
  subs.set(id, { id, at: Date.now(), disposed: false });
}

export function auditSubscriptionDispose(id: string): void {
  const s = subs.get(id);
  if (s) s.disposed = true;
}

export function getActiveSubscriptionCount(): number {
  return [...subs.values()].filter((s) => !s.disposed).length;
}

export function getUndisposedSubscriptionCount(): number {
  return [...subs.values()].filter((s) => !s.disposed && Date.now() - s.at > 60_000).length;
}
