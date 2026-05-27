import type { ComplexityCompressionObserveInput } from '../types/complexityCompression';

export function resetRuntimeSimplificationOrchestratorForTest(): void {
  /* stateless — flow routing in complexityCompressionOrchestrator */
}

export function planSimplificationSteps(input: ComplexityCompressionObserveInput): string[] {
  const steps: string[] = [];
  if (input.observerOverheadRatio > 0.4) steps.push('dedupe_observers');
  if (input.telemetryAmplificationScore > 0.35) steps.push('compress_telemetry');
  if (input.recoveryChainLength > 4) steps.push('dedupe_recovery');
  if (input.pacingLayerCount > 6) steps.push('merge_pacing');
  if (input.runtimeEntropyScore > 0.4) steps.push('compress_entropy');
  return steps;
}
