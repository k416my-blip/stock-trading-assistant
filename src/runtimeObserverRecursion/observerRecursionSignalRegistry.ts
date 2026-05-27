import type { RuntimeObserverRecursionObserveInput } from '../types/runtimeObserverRecursion';

const signals: string[] = [];

export function resetObserverRecursionSignalRegistryForTest(): void {
  signals.length = 0;
}

export function registerObserverRecursionSignals(input: RuntimeObserverRecursionObserveInput): void {
  if (input.metaRecursionRisk > 0.55) signals.push('meta_recursion');
  if (input.observerDensityScore > 0.45) signals.push('observer_density');
  if (input.telemetryAmplificationScore > 0.45) signals.push('telemetry_amp');
  if (signals.length > 48) signals.shift();
}

export function getObserverRecursionSignalCount(): number {
  return signals.length;
}
