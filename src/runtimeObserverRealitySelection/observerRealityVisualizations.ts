import { OBSERVER_REALITY_LAYERS } from '../constants/runtimeObserverRealitySelection';
import type {
  ObserverRealityGraph,
  RuntimeObserverRealityProfile,
} from '../types/runtimeObserverRealitySelection';

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;

export function resetObserverRealityVisualizationsForTest(): void {
  /* stateless */
}

function buildGraph(labels: readonly string[], drift: number, coupling: number): ObserverRealityGraph {
  const nodes = labels.map((label, index) => ({
    id: `${label}_${index}`,
    label,
    drift: round(drift * (0.72 + index * 0.04)),
  }));
  return {
    nodes,
    edges: nodes.slice(0, -1).map((node, index) => ({
      from: node.id,
      to: nodes[index + 1]?.id ?? node.id,
      coupling: round(coupling),
    })),
    measuredAt: new Date().toISOString(),
  };
}

export function buildRealitySelectionTopology(profile: RuntimeObserverRealityProfile): ObserverRealityGraph {
  return buildGraph(
    ['observer', 'preference', 'attractor', 'narrative-lock', 'fixation', 'instability'],
    profile.observerRealitySelectionPressure,
    profile.realitySelectionInstability,
  );
}

export function buildSemanticCausalityGraph(profile: RuntimeObserverRealityProfile): ObserverRealityGraph {
  return buildGraph(
    ['cause', 'meaning', 'ontology', 'effect', 'observer', 'temporal'],
    profile.semanticCausalityDrift,
    profile.semanticEffectPropagationRisk,
  );
}

export function buildRecursiveInterpretationTree(profile: RuntimeObserverRealityProfile): ObserverRealityGraph {
  return buildGraph(
    ['root', 'branch', 'fork', 'perspective', 'timeline', 'convergence'],
    profile.recursiveInterpretationBranching,
    profile.narrativeBranchAmplification,
  );
}

export function buildWorldviewDivergenceRadar(profile: RuntimeObserverRealityProfile): { axis: string; value: number }[] {
  return [
    { axis: 'fixation', value: profile.worldviewFixationRisk },
    { axis: 'variance', value: profile.worldviewRealityVariance },
    { axis: 'compression', value: profile.worldviewCauseCompression },
    { axis: 'rigidity', value: profile.worldviewRigidityAmplification },
    { axis: 'divergence', value: profile.semanticPossibilityDivergence },
  ].map((row) => ({ ...row, value: round(row.value) }));
}

export function buildNarrativeRealityCouplingHeatmap(
  profile: RuntimeObserverRealityProfile,
): { layer: string; coupling: number }[] {
  const values = [
    profile.observerRealitySelectionPressure,
    profile.semanticRealityDistance,
    profile.worldviewRealityVariance,
    profile.narrativeRealityCouplingStress,
    profile.ontologyRealityTension,
    profile.semanticCausalityDrift,
    profile.recursiveInterpretationBranching,
    profile.observerRealityFixationRisk,
  ];
  return OBSERVER_REALITY_LAYERS.map((layer, index) => ({
    layer,
    coupling: round(values[index] ?? profile.narrativeRealityCouplingStress),
  }));
}

export function buildObserverFixationMonitor(profile: RuntimeObserverRealityProfile): { label: string; value: number }[] {
  return [
    { label: 'fixation', value: profile.observerRealityFixationRisk },
    { label: 'belief hardening', value: profile.semanticBeliefHardening },
    { label: 'entrenchment', value: profile.recursiveNarrativeEntrenchment },
    { label: 'perspective lock', value: profile.semanticPerspectiveLock },
    { label: 'adaptation resistance', value: profile.semanticAdaptationResistance },
  ].map((row) => ({ ...row, value: round(row.value) }));
}

export function buildCausalityDriftTopology(profile: RuntimeObserverRealityProfile): ObserverRealityGraph {
  return buildGraph(
    ['semantic', 'narrative', 'recursive', 'ontology', 'observer', 'worldview'],
    profile.semanticCausalityDrift,
    profile.observerCausalityDistortion,
  );
}

export function buildSemanticBranchingTimeline(
  profile: RuntimeObserverRealityProfile,
  prior: { at: string; branching: number }[],
): { at: string; branching: number }[] {
  return [
    ...prior,
    { at: new Date().toISOString(), branching: profile.recursiveInterpretationBranching },
  ].slice(-48);
}
