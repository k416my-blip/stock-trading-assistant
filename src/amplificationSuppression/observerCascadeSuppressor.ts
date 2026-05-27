const suppressionHistory: Record<string, unknown>[] = [];

export function resetObserverCascadeSuppressorForTest(): void {
  suppressionHistory.length = 0;
}

export function scoreObserverCascadeRisk(density: number, overhead: number): number {
  return Math.round(Math.min(1, density * 0.55 + overhead * 0.45) * 1000) / 1000;
}

export function suppressObserverCascade(density: number): string[] {
  if (density < 0.5) return [];
  const stopped = ['heavy_observer', 'noncritical_tracing', 'graph_tracing'];
  for (const s of stopped) {
    suppressionHistory.push({ at: new Date().toISOString(), observer: s, reason: 'cascade' });
  }
  if (suppressionHistory.length > 100) suppressionHistory.shift();
  return stopped;
}

export function getObserverSuppressionHistory(): Record<string, unknown>[] {
  return [...suppressionHistory];
}
