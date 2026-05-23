/** Layer Resource Allocator — distribute budget to layers. */
import type { UnifiedLayerBudget, UnifiedRuntimeTickPhase } from '../../types/runtimeUnifiedOrchestrator';

const PHASE_BUDGET_KEY: Record<UnifiedRuntimeTickPhase, keyof UnifiedLayerBudget> = {
  observability: 'observability',
  self_healing: 'selfHealing',
  evolution: 'evolution',
  constitution: 'constitution',
  metabolism: 'metabolism',
  curiosity: 'curiosity',
  longevity: 'longevity',
  orchestration: 'orchestration',
  ux: 'ux',
};

export function getLayerBudget(budget: UnifiedLayerBudget, phase: UnifiedRuntimeTickPhase): number {
  return budget[PHASE_BUDGET_KEY[phase]] ?? 0;
}

export function sumLayerBudget(budget: UnifiedLayerBudget): number {
  return (
    budget.observability +
    budget.selfHealing +
    budget.evolution +
    budget.constitution +
    budget.metabolism +
    budget.curiosity +
    budget.longevity +
    budget.orchestration +
    budget.ux
  );
}
