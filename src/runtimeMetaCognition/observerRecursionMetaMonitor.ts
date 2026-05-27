import type { RuntimeMetaCognitionObserveInput } from '../types/runtimeMetaCognition';

export function resetObserverRecursionMetaMonitorForTest(): void {
  /* stateless */
}

export function monitorObserverRecursionMeta(input: RuntimeMetaCognitionObserveInput): number {
  return Math.round(
    (input.observerDensityScore * 0.4 + input.observerOverheadRatio * 0.35 + input.metaRecursionRisk * 0.25) *
      1000,
  ) / 1000;
}
