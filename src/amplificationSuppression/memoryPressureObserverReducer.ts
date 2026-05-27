import type { AmplificationSuppressionObserveInput } from '../types/amplificationSuppression';

export function resetMemoryPressureObserverReducerForTest(): void {
  /* stateless */
}

export function memoryObserverReductionRatio(input: AmplificationSuppressionObserveInput): number {
  if (input.memoryTrendPct > 80) return 0.35;
  if (input.memoryTrendPct > 65) return 0.55;
  if (input.jsHeapMb > 170) return 0.6;
  return 1;
}

export function shouldReduceObserversForMemory(input: AmplificationSuppressionObserveInput): boolean {
  return memoryObserverReductionRatio(input) < 0.7;
}
