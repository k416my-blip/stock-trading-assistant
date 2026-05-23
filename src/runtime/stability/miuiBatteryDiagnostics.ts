let backgroundSince = 0;
let lastResumeAt = 0;
let resumeLatencyMs = 0;
let silentDisconnectCount = 0;
let timerDriftMs = 0;
let lastTimerExpected = 0;
let miuiKillWarningAt = 0;

export function resetMiuiBatteryDiagnosticsForTest(): void {
  backgroundSince = 0;
  lastResumeAt = 0;
  resumeLatencyMs = 0;
  silentDisconnectCount = 0;
  timerDriftMs = 0;
  lastTimerExpected = 0;
  miuiKillWarningAt = 0;
}

export function noteAppBackground(at = Date.now()): void {
  backgroundSince = at;
}

export function noteAppForeground(at = Date.now()): void {
  if (backgroundSince > 0) {
    resumeLatencyMs = at - backgroundSince;
    lastResumeAt = at;
  }
  backgroundSince = 0;
}

export function noteSilentWebsocketDisconnect(): void {
  silentDisconnectCount += 1;
}

export function noteTimerDrift(expectedAt: number, actualAt: number): void {
  lastTimerExpected = expectedAt;
  timerDriftMs = Math.abs(actualAt - expectedAt);
}

export function getMiuiDiagnostics(): {
  backgroundDurationMs: number;
  resumeLatencyMs: number;
  silentDisconnectCount: number;
  timerDriftMs: number;
  lastResumeAt: number;
} {
  const now = Date.now();
  return {
    backgroundDurationMs: backgroundSince > 0 ? now - backgroundSince : 0,
    resumeLatencyMs,
    silentDisconnectCount,
    timerDriftMs,
    lastResumeAt,
  };
}

export function shouldEmitMiuiBatteryKillWarning(
  resumeThresholdMs: number,
  heartbeatGapMs: number,
  heartbeatThresholdMs: number,
  now = Date.now(),
): boolean {
  const resumeRace = resumeLatencyMs >= resumeThresholdMs;
  const heartbeatGap = heartbeatGapMs >= heartbeatThresholdMs;
  const silent = silentDisconnectCount >= 2;
  if (!resumeRace && !heartbeatGap && !silent) return false;
  if (now - miuiKillWarningAt < 20_000) return false;
  miuiKillWarningAt = now;
  return true;
}
