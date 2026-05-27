const suppressionLog: Record<string, unknown>[] = [];

export function resetObserverSuppressionOptimizerForTest(): void {
  suppressionLog.length = 0;
}

export function suppressObservers(ids: string[], reason: string): number {
  for (const id of ids) {
    suppressionLog.push({ at: new Date().toISOString(), id, reason });
  }
  if (suppressionLog.length > 120) suppressionLog.splice(0, suppressionLog.length - 120);
  return ids.length;
}

export function getSuppressionEfficiency(
  overheadBefore: number,
  overheadAfter: number,
): number {
  if (overheadBefore <= 0) return 1;
  const saved = Math.max(0, overheadBefore - overheadAfter);
  return Math.round(Math.min(1, saved / overheadBefore) * 1000) / 1000;
}

export function getObserverSuppressionLog(): Record<string, unknown>[] {
  return [...suppressionLog];
}
