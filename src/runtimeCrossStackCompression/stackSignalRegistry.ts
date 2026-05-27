import type { RuntimeCrossStackCompressionObserveInput } from '../types/runtimeCrossStackCompression';

const registry: string[] = [];

export function resetStackSignalRegistryForTest(): void {
  registry.length = 0;
}

export function registerStackSignals(input: RuntimeCrossStackCompressionObserveInput): number {
  const sig = `${input.stackCount}:${input.rawSignalCount}:${Math.round(input.runtimeNarrativeIntegrityScore * 100)}`;
  if (!registry.includes(sig)) registry.push(sig);
  if (registry.length > 128) registry.shift();
  return registry.length;
}
