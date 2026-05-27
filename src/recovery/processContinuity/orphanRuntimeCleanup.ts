const orphans: string[] = [];

export function resetOrphanRuntimeCleanupForTest(): void {
  orphans.length = 0;
}

export function registerOrphanRuntime(id: string): void {
  if (!orphans.includes(id)) orphans.push(id);
}

export function runOrphanRuntimeCleanup(max = 16): number {
  const batch = orphans.splice(0, max);
  return batch.length;
}

export function getOrphanPendingCount(): number {
  return orphans.length;
}
