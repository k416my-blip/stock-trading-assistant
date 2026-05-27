import type { RuntimeResourceStabilityObserveInput } from '../types/runtimeResourceStability';

const signals: string[] = [];

export function resetResourceSignalRegistryForTest(): void {
  signals.length = 0;
}

export function registerResourceSignals(input: RuntimeResourceStabilityObserveInput): void {
  if (input.jsHeapMb > 140) signals.push('heap_pressure');
  if (input.eventLoopLagMs > 200) signals.push('thread_latency');
  if (signals.length > 32) signals.shift();
}
