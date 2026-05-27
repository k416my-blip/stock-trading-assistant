import type { RuntimeNarrativeIntegrityObserveInput } from '../types/runtimeNarrativeIntegrity';

const signals: string[] = [];

export function resetNarrativeSignalRegistryForTest(): void {
  signals.length = 0;
}

export function registerNarrativeSignals(input: RuntimeNarrativeIntegrityObserveInput): void {
  if (input.recursiveBeliefReinforcementRisk > 0.4) signals.push('belief_reinforcement');
  if (input.runtimeEpistemicDriftRisk > 0.4) signals.push('semantic_drift');
  if (input.runtimeWorldviewLockRisk > 0.4) signals.push('narrative_lock');
  if (signals.length > 32) signals.shift();
}

export function getNarrativeSignals(): string[] {
  return [...signals];
}
