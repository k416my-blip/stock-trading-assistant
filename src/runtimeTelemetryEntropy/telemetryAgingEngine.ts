import type { RuntimeTelemetryEntropyObserveInput } from '../types/runtimeTelemetryEntropy';
import { RUNTIME_TELEMETRY_ENTROPY_LONG_SESSION_MIN } from '../constants/runtimeTelemetryEntropy';

export type TelemetryAgingMetrics = {
  staleTelemetryRatio: number;
  orphanMetricCount: number;
  zombieReplayHookCount: number;
  unusedExportChainCount: number;
};

export function resetTelemetryAgingEngineForTest(): void {
  /* stateless */
}

export function scoreTelemetryAging(input: RuntimeTelemetryEntropyObserveInput): TelemetryAgingMetrics {
  if (input.sessionMinutes < RUNTIME_TELEMETRY_ENTROPY_LONG_SESSION_MIN) {
    return {
      staleTelemetryRatio: Math.round(Math.min(0.25, input.memoryTrendPct / 400) * 1000) / 1000,
      orphanMetricCount: Math.max(0, Math.round(input.telemetrySampleCount * 0.02)),
      zombieReplayHookCount: 0,
      unusedExportChainCount: 0,
    };
  }

  const sessionFactor = Math.min(1, (input.sessionMinutes - RUNTIME_TELEMETRY_ENTROPY_LONG_SESSION_MIN) / 360);
  const staleTelemetryRatio = Math.round(
    Math.min(1, sessionFactor * 0.5 + input.duplicateSignalRatio * 0.3 + (1 - input.compressionRatio) * 0.2) *
      1000,
  ) / 1000;

  return {
    staleTelemetryRatio,
    orphanMetricCount: Math.round(
      Math.max(0, input.telemetrySampleCount * 0.08 * sessionFactor + input.uniqueSignalKinds * 0.04),
    ),
    zombieReplayHookCount: Math.round(
      Math.max(0, input.soakReplayHooksActive * sessionFactor + input.replayCount * 0.02),
    ),
    unusedExportChainCount: Math.round(
      Math.max(
        0,
        (input.exportBytesEstimate / 50_000) * sessionFactor +
          (input.exportBytesEstimate > 200_000 && input.compressionRatio < 0.4 ? 2 : 0),
      ),
    ),
  };
}
