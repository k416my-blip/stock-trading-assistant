/** Deterministic Tick Scheduler — fixed phase order, no parallelism. */
import type { UnifiedRuntimeTickPhase } from '../../types/runtimeUnifiedOrchestrator';
import { UNIFIED_RUNTIME_TICK_PHASES } from '../../types/runtimeUnifiedOrchestrator';

export function getFixedTickPhaseOrder(): readonly UnifiedRuntimeTickPhase[] {
  return UNIFIED_RUNTIME_TICK_PHASES;
}

export function isValidPhaseSequence(completed: UnifiedRuntimeTickPhase[]): boolean {
  const order = UNIFIED_RUNTIME_TICK_PHASES;
  let idx = -1;
  for (const p of completed) {
    const next = order.indexOf(p);
    if (next <= idx) return false;
    idx = next;
  }
  return true;
}
