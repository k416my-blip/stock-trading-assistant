const suppressionHistory: Record<string, unknown>[] = [];

export function resetObserverOverloadTradingSuppressorForTest(): void {
  suppressionHistory.length = 0;
}

export function computeSuppressionTargets(overhead: number): string[] {
  if (overhead < 0.52) return [];
  return ['proactive_concierge', 'heavy_analytics', 'regime_dashboard'];
}

export function suppressTradingObservers(overhead: number): string[] {
  const suppressed = computeSuppressionTargets(overhead);
  for (const s of suppressed) {
    suppressionHistory.push({ at: new Date().toISOString(), feature: s, reason: 'observer_overload' });
  }
  if (suppressionHistory.length > 100) suppressionHistory.splice(0, suppressionHistory.length - 100);
  return suppressed;
}

export function scoreRuntimeTradingSuppression(overhead: number, suppressedCount: number): number {
  return Math.round(Math.min(1, overhead * 0.5 + suppressedCount * 0.12) * 1000) / 1000;
}

export function getRuntimeSuppressionHistory(): Record<string, unknown>[] {
  return [...suppressionHistory];
}

export function buildSuppressionMap(overhead: number): Record<string, boolean> {
  const suppressed = new Set(computeSuppressionTargets(overhead));
  return {
    heavy_observer: suppressed.has('heavy_analytics'),
    high_frequency_polling: overhead > 0.58,
    proactive_concierge: suppressed.has('proactive_concierge'),
    noncritical_telemetry: overhead > 0.5,
  };
}
