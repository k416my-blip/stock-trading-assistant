import { INTER_CIVILIZATION_LAYERS } from '../constants/runtimeInterCivilizationResonance';
import type {
  InterCivilizationGraph,
  RuntimeInterCivilizationProfile,
} from '../types/runtimeInterCivilizationResonance';

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;

export function resetInterCivilizationVisualizationsForTest(): void {
  /* stateless */
}

function buildGraph(labels: readonly string[], resonance: number, collision: number): InterCivilizationGraph {
  const nodes = labels.map((label, index) => ({
    id: `${label}_${index}`,
    label,
    resonance: round(resonance * (0.72 + index * 0.04)),
  }));
  return {
    nodes,
    edges: nodes.slice(0, -1).map((node, index) => ({
      from: node.id,
      to: nodes[index + 1]?.id ?? node.id,
      collision: round(collision),
    })),
    measuredAt: new Date().toISOString(),
  };
}

export function buildCivilizationResonanceTopology(profile: RuntimeInterCivilizationProfile): InterCivilizationGraph {
  return buildGraph(
    ['civilization-a', 'meaning', 'observer', 'worldview', 'ontology', 'civilization-b'],
    profile.interCivilizationResonance,
    profile.civilizationMeaningInterference,
  );
}

export function buildOntologyCollisionGraph(profile: RuntimeInterCivilizationProfile): InterCivilizationGraph {
  return buildGraph(
    ['ontology-a', 'boundary', 'authority', 'causality', 'narrative', 'ontology-b'],
    profile.ontologyCollisionDensity,
    profile.semanticConflictPressure,
  );
}

export function buildWorldviewDivergenceRadar(profile: RuntimeInterCivilizationProfile): { axis: string; value: number }[] {
  return [
    { axis: 'drift', value: profile.civilizationDriftVelocity },
    { axis: 'isolation', value: profile.semanticIsolationGradient },
    { axis: 'fragmentation', value: profile.observerRealityFragmentation },
    { axis: 'separation', value: profile.worldviewSeparationPressure },
    { axis: 'polarization', value: profile.recursiveMeaningPolarization },
  ].map((row) => ({ ...row, value: round(row.value) }));
}

export function buildObserverInterferenceHeatmap(
  profile: RuntimeInterCivilizationProfile,
): { layer: string; interference: number }[] {
  const values = [
    profile.observerInterferenceRisk,
    profile.semanticSignalContention,
    profile.ontologyCollisionDensity,
    profile.worldviewFeedbackAmplification,
    profile.recursivePerspectiveCollision,
    profile.narrativeCollisionStress,
    profile.causalityFrameworkCollision,
    profile.semanticConsensusInstability,
  ];
  return INTER_CIVILIZATION_LAYERS.map((layer, index) => ({
    layer,
    interference: round(values[index] ?? profile.observerInterferenceRisk),
  }));
}

export function buildSemanticPluralityMonitor(profile: RuntimeInterCivilizationProfile): { label: string; value: number }[] {
  return [
    { label: 'plurality', value: profile.semanticPluralityIntegrity },
    { label: 'coexistence', value: profile.ontologyCoexistenceStability },
    { label: 'elasticity', value: profile.worldviewElasticityIndex },
    { label: 'tolerance', value: profile.observerPerspectiveTolerance },
    { label: 'boundary', value: profile.civilizationBoundaryResilience },
  ].map((row) => ({ ...row, value: round(row.value) }));
}

export function buildOntologyPartitionTopology(profile: RuntimeInterCivilizationProfile): InterCivilizationGraph {
  return buildGraph(
    ['partition-a', 'ontology', 'boundary', 'stress', 'partition-b'],
    profile.ontologyPartitionStress,
    profile.ontologyBoundaryInstability,
  );
}

export function buildRecursiveResonanceCascadeGraph(profile: RuntimeInterCivilizationProfile): InterCivilizationGraph {
  return buildGraph(
    ['recursive', 'worldview', 'meaning', 'resonance', 'cascade', 'interference'],
    profile.semanticResonanceCascadeRisk,
    profile.recursiveInterpretationInterference,
  );
}

export function buildCivilizationSynchronizationTimeline(
  profile: RuntimeInterCivilizationProfile,
  prior: { at: string; synchronization: number }[],
): { at: string; synchronization: number }[] {
  return [
    ...prior,
    { at: new Date().toISOString(), synchronization: profile.observerCollectiveSynchronization },
  ].slice(-48);
}
