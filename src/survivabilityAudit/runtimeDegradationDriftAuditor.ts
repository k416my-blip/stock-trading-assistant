import type { SurvivabilityAuditObserveInput } from '../types/survivabilityAuditValidation';

const driftSamples: number[] = [];

export function resetRuntimeDegradationDriftAuditorForTest(): void {
  driftSamples.length = 0;
}

export function noteDegradationSample(input: SurvivabilityAuditObserveInput): void {
  const sample =
    input.eventLoopLagMs / 500 +
    input.memoryTrendPct / 100 +
    (1 - input.recoverySuccessRate);
  driftSamples.push(sample);
  if (driftSamples.length > 48) driftSamples.shift();
}

export function computeDegradationDrift(): number {
  if (driftSamples.length < 3) return 0;
  const recent = driftSamples.slice(-6);
  return Math.round((recent[recent.length - 1] - recent[0]) * 1000) / 1000;
}
