/** Constitutional Tick Gate — before/after constitution phase. */
import { getConstitutionalState } from '../constitution/runtimeConstitutionCoordinator';
import { getConstitutionalDirectives } from '../constitution/runtimeConstitutionIntegration';

export function preConstitutionGate(): { allowProceed: boolean; reasonJa: string } {
  const state = getConstitutionalState();
  if (state === 'CONSTITUTIONAL_CRISIS') {
    return { allowProceed: true, reasonJa: 'crisis — constitution must arbitrate' };
  }
  return { allowProceed: true, reasonJa: 'ok' };
}

export function postConstitutionGate(): {
  suppressExploration: boolean;
  replayFreeze: boolean;
  sandboxOnly: boolean;
} {
  const d = getConstitutionalDirectives();
  return {
    suppressExploration: d.suppressExploration,
    replayFreeze: d.replayFreeze,
    sandboxOnly: d.sandboxExplorationOnly,
  };
}
