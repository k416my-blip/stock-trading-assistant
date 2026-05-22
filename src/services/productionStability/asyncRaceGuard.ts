const generations = new Map<string, number>();
let staleBlocked = 0;

export function nextAsyncGeneration(scope: string): number {
  const next = (generations.get(scope) ?? 0) + 1;
  generations.set(scope, next);
  return next;
}

export function getCurrentGeneration(scope: string): number {
  return generations.get(scope) ?? 0;
}

export function isStaleAsyncGeneration(scope: string, generation: number): boolean {
  const stale = generation !== getCurrentGeneration(scope);
  if (stale) staleBlocked += 1;
  return stale;
}

export function getStaleAsyncBlockedCount(): number {
  return staleBlocked;
}

export function resetAsyncRaceGuardForTest(): void {
  generations.clear();
  staleBlocked = 0;
}
