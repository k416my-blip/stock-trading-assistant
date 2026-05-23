let lastInteractionAt = Date.now();
let idleMsThreshold = 120_000;

export function resetIdleOnlyHeavyExportForTest(): void {
  lastInteractionAt = Date.now();
}

export function noteTelemetryUserInteraction(now = Date.now()): void {
  lastInteractionAt = now;
}

export function canRunHeavyExport(appForeground: boolean, now = Date.now()): boolean {
  if (!appForeground) return false;
  return now - lastInteractionAt >= idleMsThreshold;
}

export function setIdleExportThresholdMs(ms: number): void {
  idleMsThreshold = ms;
}
