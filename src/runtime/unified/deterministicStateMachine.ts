/** Deterministic State Machine — fixed transitions. */
import type { UnifiedOrchestratorState } from '../../types/runtimeUnifiedOrchestrator';
import { getOrchestratorState, setOrchestratorState } from './unifiedOrchestratorStorage';

export function resetDeterministicStateMachineForTest(): void {
  setOrchestratorState('HEALTHY');
}

export function transitionOrchestratorState(input: {
  pressure: number;
  cascadeRisk: number;
  emergencyBrake: boolean;
  safeMode: boolean;
  recovering: boolean;
}): UnifiedOrchestratorState {
  if (input.safeMode || input.emergencyBrake) {
    setOrchestratorState('SAFE_MODE');
    return 'SAFE_MODE';
  }
  if (input.cascadeRisk >= 0.85 || input.pressure >= 0.92) {
    setOrchestratorState('EMERGENCY');
    return 'EMERGENCY';
  }
  if (input.pressure >= 0.78 || input.cascadeRisk >= 0.72) {
    setOrchestratorState('CRITICAL');
    return 'CRITICAL';
  }
  if (input.pressure >= 0.62) {
    setOrchestratorState('STRESSED');
    return 'STRESSED';
  }
  if (input.recovering) {
    setOrchestratorState('RECOVERING');
    return 'RECOVERING';
  }
  if (input.pressure >= 0.42) {
    setOrchestratorState('DEGRADED');
    return 'DEGRADED';
  }
  setOrchestratorState('HEALTHY');
  return 'HEALTHY';
}

export function getCurrentOrchestratorState(): UnifiedOrchestratorState {
  return getOrchestratorState();
}
