/** Unified Orchestrator Dashboard builder. */
import type { UnifiedOrchestratorDashboard } from '../../types/runtimeUnifiedOrchestrator';

export function buildUnifiedOrchestratorDashboard(
  partial: UnifiedOrchestratorDashboard,
): UnifiedOrchestratorDashboard {
  return { ...partial };
}
