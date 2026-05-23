/**
 * Long-Term Evolution Phases — LEARNING → HARDENING → RIGID → DEGRADING → RENEWAL.
 */
import type { LongTermEvolutionPhase } from '../../types/runtimeEvolution';
import type { EvolutionHealthState } from '../../types/runtimeEvolution';
import type { EvolutionMonitorSignals } from '../../types/runtimeEvolution';
import type { EntropyMetrics } from '../../types/runtimeEvolution';
import { restoreEntropyOnLow } from './adaptiveEntropyEngine';
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { clearRelearningPhase, shouldSuppressRollback } from './rollbackDependencyGuard';

let phase: LongTermEvolutionPhase = 'LEARNING';

export function resetLongTermEvolutionPhasesForTest(): void {
  phase = 'LEARNING';
}

export function getLongTermEvolutionPhase(): LongTermEvolutionPhase {
  return phase;
}

export function resolveLongTermEvolutionPhase(
  health: EvolutionHealthState,
  signals: EvolutionMonitorSignals,
  entropy: EntropyMetrics,
): LongTermEvolutionPhase {
  if (health === 'COLLAPSING') {
    phase = 'DEGRADING';
    return phase;
  }
  if (health === 'STAGNATING' || health === 'OVERFITTED') {
    phase = 'RIGID';
    return phase;
  }
  if (health === 'EVOLVING' && entropy.entropyScore >= 0.5) {
    phase = signals.graphMutationRate > 0.12 ? 'LEARNING' : 'HARDENING';
    return phase;
  }
  if (health === 'STABLE' && phase === 'DEGRADING') {
    phase = 'RENEWAL';
    return phase;
  }
  if (phase === 'RIGID' || phase === 'RENEWAL') {
    if (health === 'STABLE' || health === 'EVOLVING') phase = 'HARDENING';
  }
  return phase;
}

export function applyRigidPhaseRemediation(
  store: AdaptiveRuntimeLearningState,
  entropy: EntropyMetrics,
): string[] {
  if (phase !== 'RIGID' && phase !== 'DEGRADING') return [];

  const actions: string[] = [];
  const restored = restoreEntropyOnLow(store, entropy);
  if (restored.reopened > 0) actions.push(`entropy_restore:${restored.reopened}`);
  if (restored.decayed > 0) actions.push(`stale_confidence_decay:${restored.decayed}`);

  if (shouldSuppressRollback()) {
    actions.push('rollback_suppressed');
  } else {
    clearRelearningPhase();
  }

  if (phase === 'DEGRADING') {
    phase = 'RENEWAL';
    actions.push('renewal_phase');
  }

  return actions;
}
