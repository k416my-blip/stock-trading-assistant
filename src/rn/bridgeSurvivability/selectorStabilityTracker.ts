let selectorHits = 0;
let selectorMiss = 0;

export function resetSelectorStabilityTrackerForTest(): void {
  selectorHits = 0;
  selectorMiss = 0;
}

export function noteSelectorHit(): void {
  selectorHits += 1;
}

export function noteSelectorMiss(): void {
  selectorMiss += 1;
}

export function selectorStabilityScore(): number {
  const total = selectorHits + selectorMiss;
  if (total === 0) return 1;
  return Math.round((selectorHits / total) * 1000) / 1000;
}
