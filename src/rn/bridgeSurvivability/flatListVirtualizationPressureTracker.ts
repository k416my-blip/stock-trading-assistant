let scrollBursts = 0;
let renderItems = 0;

export function resetFlatListVirtualizationPressureTrackerForTest(): void {
  scrollBursts = 0;
  renderItems = 0;
}

export function noteFlatListScrollBurst(): void {
  scrollBursts += 1;
}

export function noteFlatListItemRender(count = 1): void {
  renderItems += count;
}

export function virtualizationPressure(): number {
  if (renderItems === 0) return 0;
  return Math.min(1, Math.round((scrollBursts / Math.max(1, renderItems)) * 20 * 1000) / 1000);
}
