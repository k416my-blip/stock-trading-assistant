import type { ComplexityCompressionObserveInput } from '../types/complexityCompression';

export function resetRuntimeRecursionSuppressorForTest(): void {
  /* stateless */
}

export function shouldSuppressRecursion(input: ComplexityCompressionObserveInput): boolean {
  return (
    input.runtimeAmplificationRisk > 0.45 ||
    input.recoveryChainLength > 5 ||
    (input.interventionDensity > 0.55 && input.runtimeEntropyScore > 0.4)
  );
}

export function scoreRecursionSuppressionEffect(input: ComplexityCompressionObserveInput): number {
  if (!shouldSuppressRecursion(input)) return 0;
  return Math.round(Math.min(1, input.runtimeAmplificationRisk * 0.6 + input.recoveryChainLength / 10) * 1000) / 1000;
}
