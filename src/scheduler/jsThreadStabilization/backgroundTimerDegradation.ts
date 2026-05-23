export function degradedTimerIntervalMs(baseMs: number, appForeground: boolean): number {
  if (appForeground) return baseMs;
  return Math.max(baseMs * 3, 45_000);
}
