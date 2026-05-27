import type { RuntimeEpistemicIntegrityObserveInput } from '../types/runtimeEpistemicIntegrity';
import { detectEpistemicDriftSignals } from './longSessionEpistemicDriftEngine';

export function resetEpistemicSignalRegistryForTest(): void {
  /* stateless */
}

export function registerEpistemicSignals(input: RuntimeEpistemicIntegrityObserveInput): string[] {
  return detectEpistemicDriftSignals(input);
}
