const suppressionLog: Record<string, unknown>[] = [];

export function resetHeavyAnalysisSuppressionControllerForTest(): void {
  suppressionLog.length = 0;
}

export function suppressHeavyAnalysis(kinds: string[], reason: string): number {
  for (const kind of kinds) {
    suppressionLog.push({ at: new Date().toISOString(), kind, reason });
  }
  if (suppressionLog.length > 100) suppressionLog.splice(0, suppressionLog.length - 100);
  return kinds.length;
}

export function getConciergeSuppressionReport(): Record<string, unknown>[] {
  return [...suppressionLog];
}

export function selectHeavyAnalysisToSuppress(pressure: number): string[] {
  if (pressure < 0.4) return [];
  if (pressure < 0.65) return ['historical_replay', 'visual_analytics'];
  return ['historical_replay', 'visual_analytics', 'regime_dashboard', 'meta_consensus'];
}
