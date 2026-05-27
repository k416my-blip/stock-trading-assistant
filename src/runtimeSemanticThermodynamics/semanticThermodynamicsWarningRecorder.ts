import type {
  RuntimeSemanticThermodynamicsProfile,
  SemanticThermodynamicsWarning,
  SemanticThermodynamicsWarningKind,
} from '../types/runtimeSemanticThermodynamics';

const warnings: SemanticThermodynamicsWarning[] = [];

export function resetSemanticThermodynamicsWarningRecorderForTest(): void {
  warnings.length = 0;
}

function recordWarning(
  kind: SemanticThermodynamicsWarningKind,
  target: string,
  warningJa: string,
): SemanticThermodynamicsWarning {
  const row: SemanticThermodynamicsWarning = {
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

export function recordSemanticThermodynamicsWarnings(
  profile: RuntimeSemanticThermodynamicsProfile,
): SemanticThermodynamicsWarning[] {
  const fresh: SemanticThermodynamicsWarning[] = [];
  if (profile.semanticHeatAccumulation >= 0.5) {
    fresh.push(recordWarning('semantic_heat_accumulation', 'semantic heat', 'semantic heat accumulation を記録（semantic cooling intervention 禁止）'));
  }
  if (profile.ontologyTurbulenceIntensity >= 0.5) {
    fresh.push(recordWarning('ontology_turbulence', 'ontology flow', 'ontology turbulence を記録（ontology normalization 禁止）'));
  }
  if (profile.dashboardThermalSaturation >= 0.5) {
    fresh.push(recordWarning('observer_thermal_saturation', 'observer/dashboard heat', 'observer thermal saturation を記録（observer throttling 禁止）'));
  }
  if (profile.entropyAmplificationRisk >= 0.5) {
    fresh.push(recordWarning('entropy_propagation', 'semantic entropy', 'entropy propagation を記録（entropy suppression 禁止）'));
  }
  if (profile.semanticHeatDeathRisk >= 0.46) {
    fresh.push(recordWarning('semantic_heat_death', 'runtime meaning', 'semantic heat death risk を記録（automatic stabilization 禁止）'));
  }
  return fresh;
}

export function getSemanticThermodynamicsWarningsRecent(limit = 12): SemanticThermodynamicsWarning[] {
  return warnings.slice(-limit);
}
