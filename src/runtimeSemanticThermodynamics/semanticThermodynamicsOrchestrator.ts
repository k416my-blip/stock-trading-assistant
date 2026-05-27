import type {
  RuntimeSemanticThermodynamicsObserveInput,
  RuntimeSemanticThermodynamicsTimelineEntry,
} from '../types/runtimeSemanticThermodynamics';
import { buildRuntimeSemanticThermodynamicsProfile } from './semanticThermodynamicsScorers';
import { recordSemanticThermodynamicsTimeline } from './semanticThermodynamicsTimeline';

export type SemanticThermodynamicsFlowResult = {
  flow: RuntimeSemanticThermodynamicsTimelineEntry['flow'];
  detailJa: string;
};

export function runSemanticThermodynamicsFlows(
  input: RuntimeSemanticThermodynamicsObserveInput,
): SemanticThermodynamicsFlowResult[] {
  const profile = buildRuntimeSemanticThermodynamicsProfile(input);
  const results: SemanticThermodynamicsFlowResult[] = [
    {
      flow: 'semantic_temperature',
      detailJa: `heat ${profile.runtimeMeaningHeatIndex} · entropy ${profile.semanticEntropyLevel}`,
    },
    {
      flow: 'entropy_dissipation',
      detailJa: `dissipation ${profile.semanticDissipationEfficiency} · leakage ${profile.semanticThermalLeakage}`,
    },
    {
      flow: 'ontology_turbulence',
      detailJa: `turbulence ${profile.ontologyTurbulenceIntensity} · vortex ${profile.semanticVortexFormation}`,
    },
    {
      flow: 'observer_thermal_saturation',
      detailJa: `fatigue ${profile.observerThermalFatigue} · burnout ${profile.semanticAttentionBurnout}`,
    },
    {
      flow: 'semantic_heat_death',
      detailJa: `heat death ${profile.semanticHeatDeathRisk} · exhaustion ${profile.semanticExhaustionPotential}`,
    },
    {
      flow: 'energy_propagation',
      detailJa: `loop ${profile.semanticEnergyLoopRisk} · resonance ${profile.semanticResonancePressure}`,
    },
    {
      flow: 'thermal_pressure',
      detailJa: 'thermal observations recorded only; no cooling/throttling/suppression',
    },
  ];
  for (const result of results) recordSemanticThermodynamicsTimeline(result.flow, result.detailJa);
  return results;
}
