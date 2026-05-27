import type { RuntimeCrossStackCompressionObserveInput } from '../types/runtimeCrossStackCompression';

export function resetTelemetryDeduplicatorForTest(): void {
  /* stateless */
}

export function scoreTelemetryDedupRatio(input: RuntimeCrossStackCompressionObserveInput): number {
  const raw = input.rawSignalCount;
  const unique = Math.max(1, Math.round(raw * (0.55 + input.runtimeCompressionEfficiency * 0.35)));
  return Math.round((1 - unique / Math.max(1, raw)) * 1000) / 1000;
}
