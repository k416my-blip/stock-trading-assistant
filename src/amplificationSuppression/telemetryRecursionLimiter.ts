import type { AmplificationSuppressionObserveInput } from '../types/amplificationSuppression';

const recursionMap: Record<string, number> = {};

export function resetTelemetryRecursionLimiterForTest(): void {
  for (const k of Object.keys(recursionMap)) delete recursionMap[k];
}

export function noteTelemetryRecursion(layer: string): void {
  recursionMap[layer] = (recursionMap[layer] ?? 0) + 1;
}

export function scoreTelemetryRecursionRisk(input: AmplificationSuppressionObserveInput): number {
  let risk = input.telemetryAmplificationScore * 0.5;
  risk += input.observerOverheadRatio * 0.3;
  const depth = Object.values(recursionMap).reduce((a, b) => a + b, 0);
  risk += Math.min(0.2, depth / 50);
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}

export function getTelemetryRecursionMap(): Record<string, number> {
  return { ...recursionMap };
}
