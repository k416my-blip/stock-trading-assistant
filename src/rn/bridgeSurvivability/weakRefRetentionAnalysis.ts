let weakRefCount = 0;
let collected = 0;

export function resetWeakRefRetentionAnalysisForTest(): void {
  weakRefCount = 0;
  collected = 0;
}

export function noteWeakRefAllocated(): void {
  weakRefCount += 1;
}

export function noteWeakRefCollected(): void {
  collected += 1;
}

export function weakRefRetentionRisk(): number {
  if (weakRefCount === 0) return 0;
  const live = Math.max(0, weakRefCount - collected);
  return Math.min(1, live / Math.max(1, weakRefCount));
}
