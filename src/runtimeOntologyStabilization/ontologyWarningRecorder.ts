import type {
  OntologyWarning,
  OntologyWarningKind,
  RuntimeOntologyProfile,
} from '../types/runtimeOntologyStabilization';

const warnings: OntologyWarning[] = [];

export function resetOntologyWarningRecorderForTest(): void {
  warnings.length = 0;
}

function recordWarning(kind: OntologyWarningKind, target: string, warningJa: string): OntologyWarning {
  const row: OntologyWarning = {
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

export function recordOntologyWarnings(profile: RuntimeOntologyProfile): OntologyWarning[] {
  const fresh: OntologyWarning[] = [];
  if (profile.semanticOntologyDrift >= 0.42) {
    fresh.push(recordWarning('ontology_drift', 'runtime ontology', 'ontology drift を記録（rewrite 禁止）'));
  }
  if (profile.semanticAnchorIntegrity < 0.55) {
    fresh.push(recordWarning('anchor_erosion', 'reality anchor', 'semantic anchor erosion を記録（forced grounding 禁止）'));
  }
  if (profile.observerGeneratedRealityRisk >= 0.42) {
    fresh.push(recordWarning('observer_generated_reality', 'observer reference', 'observer-generated reality risk を記録（belief mutation 禁止）'));
  }
  if (profile.symbolicClosedLoopRisk >= 0.42) {
    fresh.push(recordWarning('symbolic_closed_loop', 'symbolic loop', 'symbolic closed-loop risk を記録（semantic override 禁止）'));
  }
  if (profile.recursiveOntologyDepth >= 0.42) {
    fresh.push(recordWarning('recursive_ontology', 'ontology recursion', 'recursive ontology depth を記録（auto correction 禁止）'));
  }
  return fresh;
}

export function getOntologyWarningsRecent(limit = 12): OntologyWarning[] {
  return warnings.slice(-limit);
}
