let memoHits = 0;
let memoMiss = 0;

export function resetDashboardMemoizationProfilerForTest(): void {
  memoHits = 0;
  memoMiss = 0;
}

export function noteMemoHit(): void {
  memoHits += 1;
}

export function noteMemoMiss(): void {
  memoMiss += 1;
}

export function memoizationEfficiency(): number {
  const total = memoHits + memoMiss;
  if (total === 0) return 1;
  return Math.round((memoHits / total) * 1000) / 1000;
}
