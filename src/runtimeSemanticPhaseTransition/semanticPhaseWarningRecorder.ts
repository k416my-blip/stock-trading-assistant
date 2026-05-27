import type {
  RuntimeSemanticPhaseProfile,
  SemanticPhaseWarning,
  SemanticPhaseWarningKind,
} from '../types/runtimeSemanticPhaseTransition';

const warnings: SemanticPhaseWarning[] = [];

export function resetSemanticPhaseWarningRecorderForTest(): void {
  warnings.length = 0;
}

function recordWarning(kind: SemanticPhaseWarningKind, target: string, warningJa: string): SemanticPhaseWarning {
  const row: SemanticPhaseWarning = {
    at: new Date().toISOString(),
    kind,
    target,
    warningJa,
    observeOnly: true,
  };
  warnings.push(row);
  if (warnings.length > 48) warnings.shift();
  return row;
}

export function recordSemanticPhaseWarnings(profile: RuntimeSemanticPhaseProfile): SemanticPhaseWarning[] {
  const fresh: SemanticPhaseWarning[] = [];
  if (profile.semanticPhaseVolatility >= 0.5) {
    fresh.push(recordWarning('phase_transition', 'semantic phase', 'semantic phase transition を記録（semantic phase forcing 禁止）'));
  }
  if (profile.ontologyStateShiftRisk >= 0.5) {
    fresh.push(recordWarning('ontology_state_shift', 'ontology state', 'ontology state shift を記録（automatic ontology correction 禁止）'));
  }
  if (profile.recursiveMeaningCrystalRisk >= 0.5) {
    fresh.push(recordWarning('meaning_crystallization', 'recursive meaning', 'recursive meaning crystallization を記録（ontology freezing intervention 禁止）'));
  }
  if (profile.observerPhaseLockRisk >= 0.5) {
    fresh.push(recordWarning('observer_phase_lock', 'observer sync', 'observer phase lock risk を記録（observer synchronization enforcement 禁止）'));
  }
  if (profile.semanticStateCollapseRisk >= 0.46) {
    fresh.push(recordWarning('semantic_state_collapse', 'semantic state', 'semantic state collapse risk を記録（recursive collapse suppression 禁止）'));
  }
  return fresh;
}

export function getSemanticPhaseWarningsRecent(limit = 12): SemanticPhaseWarning[] {
  return warnings.slice(-limit);
}
