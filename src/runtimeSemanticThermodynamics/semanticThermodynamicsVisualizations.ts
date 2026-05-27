import type {
  RuntimeSemanticThermodynamicsProfile,
  SemanticThermodynamicsGraph,
} from '../types/runtimeSemanticThermodynamics';
import { SEMANTIC_THERMODYNAMIC_LAYERS } from '../constants/runtimeSemanticThermodynamics';

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;

export function resetSemanticThermodynamicsVisualizationsForTest(): void {
  /* stateless */
}

function buildGraph(labels: readonly string[], heat: number, flow: number): SemanticThermodynamicsGraph {
  const nodes = labels.map((label, index) => ({
    id: `${label}_${index}`,
    label,
    heat: round(heat * (0.72 + index * 0.05)),
  }));
  return {
    nodes,
    edges: nodes.slice(0, -1).map((node, index) => ({
      from: node.id,
      to: nodes[index + 1]?.id ?? node.id,
      flow: round(flow),
    })),
    measuredAt: new Date().toISOString(),
  };
}

export function buildSemanticTemperatureHeatmap(profile: RuntimeSemanticThermodynamicsProfile): { layer: string; temperature: number }[] {
  const values = [
    profile.semanticHeatDensity,
    profile.ontologyThermalPressure,
    profile.observerThermalFatigue,
    profile.dashboardThermalSaturation,
    profile.replayHeatAmplification,
    profile.semanticEntropyLevel,
  ];
  return SEMANTIC_THERMODYNAMIC_LAYERS.map((layer, index) => ({
    layer,
    temperature: round(values[index] ?? profile.runtimeMeaningHeatIndex),
  }));
}

export function buildOntologyTurbulenceField(profile: RuntimeSemanticThermodynamicsProfile): SemanticThermodynamicsGraph {
  return buildGraph(['ontology', 'vortex', 'convection', 'pressure-wave', 'fragmentation'], profile.ontologyTurbulenceIntensity, profile.semanticPressureWaveRisk);
}

export function buildObserverThermalSaturationGraph(profile: RuntimeSemanticThermodynamicsProfile): SemanticThermodynamicsGraph {
  return buildGraph(['observer', 'attention', 'interpretation', 'replay', 'cooling-deficit'], profile.observerThermalFatigue, profile.observerCoolingDeficit);
}

export function buildSemanticPressureTopology(profile: RuntimeSemanticThermodynamicsProfile): SemanticThermodynamicsGraph {
  return buildGraph(['entropy', 'heat', 'pressure', 'resonance', 'heat-death'], profile.runtimeMeaningHeatIndex, profile.semanticResonancePressure);
}

export function buildEntropyDissipationFlowMap(profile: RuntimeSemanticThermodynamicsProfile): SemanticThermodynamicsGraph {
  return buildGraph(['source', 'leakage', 'drain', 'dissipation', 'containment'], profile.semanticThermalLeakage, profile.semanticDissipationEfficiency);
}

export function buildSemanticEntropyRadar(profile: RuntimeSemanticThermodynamicsProfile): { axis: string; value: number }[] {
  return [
    { axis: 'entropy', value: profile.semanticEntropyLevel },
    { axis: 'amplification', value: profile.entropyAmplificationRisk },
    { axis: 'containment stress', value: profile.entropyContainmentStress },
    { axis: 'noise dominance', value: profile.semanticNoiseDominance },
    { axis: 'heat death', value: profile.semanticHeatDeathRisk },
  ].map((row) => ({ ...row, value: round(row.value) }));
}

export function buildRuntimeHeatDeathMonitor(profile: RuntimeSemanticThermodynamicsProfile): { label: string; value: number }[] {
  return [
    { label: 'heat death', value: profile.semanticHeatDeathRisk },
    { label: 'signal decay', value: profile.ontologySignalDecay },
    { label: 'resolution collapse', value: profile.meaningResolutionCollapse },
    { label: 'observer blindness', value: profile.observerMeaningBlindness },
  ].map((row) => ({ ...row, value: round(row.value) }));
}

export function buildReplayHeatPropagationTimeline(
  profile: RuntimeSemanticThermodynamicsProfile,
  prior: { at: string; heat: number }[],
): { at: string; heat: number }[] {
  return [...prior, { at: new Date().toISOString(), heat: profile.replayHeatAmplification }].slice(-48);
}
