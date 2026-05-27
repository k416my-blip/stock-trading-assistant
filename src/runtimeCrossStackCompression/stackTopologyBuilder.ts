import { STACK_TOPOLOGY_LAYERS } from '../constants/runtimeCrossStackCompression';

export function resetStackTopologyBuilderForTest(): void {
  /* stateless */
}

export function buildStackTopology(stackCount: number): { id: string; label: string; depth: number }[] {
  return STACK_TOPOLOGY_LAYERS.map((label, i) => ({
    id: label,
    label,
    depth: Math.min(stackCount, i + 1),
  }));
}
