import type { AppResumeRecoverySnapshot } from '../../types/nativeDeviceTelemetry';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import { getResumeTransitionCount } from '../../services/mobileRedmiRuntime';

let fgBgOscillations = 0;
let lastFg = true;

export function resetAppResumeRecoveryMetricsForTest(): void {
  fgBgOscillations = 0;
  lastFg = true;
}

export function noteForegroundOscillation(isForeground: boolean): void {
  if (isForeground !== lastFg) {
    fgBgOscillations += 1;
    lastFg = isForeground;
  }
}

export function observeAppResumeRecovery(
  metrics: RuntimeTelemetryMetricsSnapshot,
  appForeground: boolean,
): AppResumeRecoverySnapshot {
  noteForegroundOscillation(appForeground);
  return {
    resumeRecoveryMs: metrics.hydrationResume.resumeRecoveryTimeMs,
    foregroundOscillationCount: Math.max(fgBgOscillations, getResumeTransitionCount()),
    postResumePressurePct: metrics.hydrationResume.postResumePressurePct,
  };
}
