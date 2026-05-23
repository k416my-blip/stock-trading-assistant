/** Layer Priority Arbitration — constitution > metabolism > healing > evolution > curiosity. */
import type { UnifiedRuntimeTickPhase } from '../../types/runtimeUnifiedOrchestrator';

const PRIORITY: Record<UnifiedRuntimeTickPhase, number> = {
  observability: 1,
  self_healing: 2,
  evolution: 3,
  constitution: 5,
  metabolism: 4,
  curiosity: 6,
  longevity: 7,
  orchestration: 8,
  ux: 9,
};

export function compareLayerPriority(a: UnifiedRuntimeTickPhase, b: UnifiedRuntimeTickPhase): number {
  return PRIORITY[a] - PRIORITY[b];
}

export function shouldSkipLowerPriorityLayer(
  phase: UnifiedRuntimeTickPhase,
  emergencyBrake: boolean,
): boolean {
  if (!emergencyBrake) return false;
  return PRIORITY[phase] >= PRIORITY.curiosity;
}
