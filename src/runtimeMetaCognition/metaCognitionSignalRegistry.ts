import type { RuntimeMetaCognitionObserveInput } from '../types/runtimeMetaCognition';

const signals: string[] = [];

export function resetMetaCognitionSignalRegistryForTest(): void {
  signals.length = 0;
}

export function registerMetaCognitionSignals(input: RuntimeMetaCognitionObserveInput): void {
  if (input.metaRecursionRisk > 0.4) signals.push('meta_recursion');
  if (input.observerOverheadRatio > 0.45) signals.push('observer_overhead');
  if (input.runtimeAuditCoverage > 0.75) signals.push('audit_saturation');
  if (signals.length > 32) signals.shift();
}

export function getMetaCognitionSignals(): string[] {
  return [...signals];
}
