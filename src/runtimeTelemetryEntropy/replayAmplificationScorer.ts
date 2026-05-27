import type { RuntimeTelemetryEntropyObserveInput } from '../types/runtimeTelemetryEntropy';

export function resetReplayAmplificationScorerForTest(): void {
  /* stateless */
}

export function scoreReplayAmplificationRisk(input: RuntimeTelemetryEntropyObserveInput): number {
  const replay =
    Math.min(1, input.replayCount / 80) * 0.45 +
    Math.min(1, input.soakReplayHooksActive / 12) * 0.35 +
    input.telemetryAmplificationScore * 0.2;
  return Math.round(Math.min(1, replay) * 1000) / 1000;
}
