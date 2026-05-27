import type {
  RuntimeSemanticGravityProfile,
  SemanticGravityWarning,
  SemanticGravityWarningKind,
} from '../types/runtimeSemanticGravity';

const warnings: SemanticGravityWarning[] = [];

export function resetSemanticGravityWarningRecorderForTest(): void {
  warnings.length = 0;
}

function recordWarning(
  kind: SemanticGravityWarningKind,
  target: string,
  warningJa: string,
): SemanticGravityWarning {
  const row: SemanticGravityWarning = {
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

export function recordSemanticGravityWarnings(profile: RuntimeSemanticGravityProfile): SemanticGravityWarning[] {
  const fresh: SemanticGravityWarning[] = [];
  if (profile.semanticSingularityRisk >= 0.48) {
    fresh.push(recordWarning('semantic_singularity', 'semantic gravity', 'semantic singularity risk を記録（ontology enforcement 禁止）'));
  }
  if (profile.canonicalTruthPressure >= 0.5) {
    fresh.push(recordWarning('canonical_truth_pressure', 'canonical center', 'canonical truth pressure を記録（canonical truth override 禁止）'));
  }
  if (profile.semanticAnchorDivergence >= 0.48) {
    fresh.push(recordWarning('anchor_divergence', 'semantic anchors', 'anchor divergence を記録（automatic anchor correction 禁止）'));
  }
  if (profile.semanticMonocultureRisk >= 0.48) {
    fresh.push(recordWarning('semantic_monoculture', 'ontology plurality', 'semantic monoculture risk を記録（forced semantic convergence 禁止）'));
  }
  if (profile.observerDoctrineFormation >= 0.48) {
    fresh.push(recordWarning('observer_doctrine', 'observer worldview', 'observer doctrine formation を記録（observer belief normalization 禁止）'));
  }
  return fresh;
}

export function getSemanticGravityWarningsRecent(limit = 12): SemanticGravityWarning[] {
  return warnings.slice(-limit);
}
