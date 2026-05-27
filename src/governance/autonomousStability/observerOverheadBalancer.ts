const ranks: { id: string; cost: number; benefit: number }[] = [];

export function resetObserverOverheadBalancerForTest(): void {
  ranks.length = 0;
}

export function rankObserver(id: string, cost: number, benefit: number): void {
  const existing = ranks.find((r) => r.id === id);
  if (existing) {
    existing.cost = cost;
    existing.benefit = benefit;
    return;
  }
  ranks.push({ id, cost, benefit });
}

export function getObserverOverheadRatio(): number {
  if (ranks.length === 0) return 0.2;
  const totalCost = ranks.reduce((s, r) => s + r.cost, 0);
  const totalBenefit = ranks.reduce((s, r) => s + r.benefit, 0.01);
  return Math.round(Math.min(1, totalCost / (totalCost + totalBenefit)) * 1000) / 1000;
}

export function selectLowValueObservers(max = 3): string[] {
  return [...ranks]
    .sort((a, b) => a.benefit / Math.max(0.01, a.cost) - b.benefit / Math.max(0.01, b.cost))
    .slice(0, max)
    .map((r) => r.id);
}
