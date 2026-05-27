import type {
  OntologyGraph,
  RuntimeOntologyObserveInput,
  RuntimeOntologyProfile,
} from '../types/runtimeOntologyStabilization';
import { ONTOLOGY_ANCHOR_CHAIN, ONTOLOGY_GROUNDING_LAYERS } from '../constants/runtimeOntologyStabilization';

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;

export function resetOntologyVisualizationsForTest(): void {
  /* stateless */
}

function buildGraph(labels: readonly string[], anchor: number, drift: number): OntologyGraph {
  const nodes = labels.map((label, index) => ({
    id: `${label}_${index}`,
    label,
    anchor: round(anchor * (0.72 + index * 0.06)),
  }));
  return {
    nodes,
    edges: nodes.slice(0, -1).map((node, index) => ({
      from: node.id,
      to: nodes[index + 1]?.id ?? node.id,
      drift: round(drift),
    })),
    measuredAt: new Date().toISOString(),
  };
}

export function buildRealityAnchorGraph(profile: RuntimeOntologyProfile): OntologyGraph {
  return buildGraph(ONTOLOGY_ANCHOR_CHAIN, profile.runtimeRealityAnchorScore, profile.semanticOntologyDrift);
}

export function buildObserverReferenceTopology(profile: RuntimeOntologyProfile): OntologyGraph {
  return buildGraph(['observer', 'reference', 'symbol', 'narrative', 'observer'], profile.referenceChainIntegrity, profile.observerGeneratedRealityRisk);
}

export function buildRealityAnchorMap(profile: RuntimeOntologyProfile): OntologyGraph {
  return buildGraph(['telemetry', 'event', 'metric', 'meaning', 'anchor'], profile.semanticAnchorIntegrity, profile.narrativeRealityDistance);
}

export function buildSemanticGroundingGraph(profile: RuntimeOntologyProfile): OntologyGraph {
  return buildGraph(ONTOLOGY_GROUNDING_LAYERS, profile.semanticGroundingStrength, profile.symbolicReferenceInstability);
}

export function buildNarrativeRealityDivergenceGraph(profile: RuntimeOntologyProfile): OntologyGraph {
  return buildGraph(['narrative', 'replay', 'observer', 'metric', 'reality'], 1 - profile.narrativeRealityDistance, profile.narrativeRealityDistance);
}

export function buildOntologyStabilityRadar(profile: RuntimeOntologyProfile): { axis: string; value: number }[] {
  return [
    { axis: 'anchor', value: profile.runtimeRealityAnchorScore },
    { axis: 'integrity', value: profile.semanticAnchorIntegrity },
    { axis: 'drift', value: profile.semanticOntologyDrift },
    { axis: 'collapse', value: profile.recursiveMeaningCollapseRisk },
    { axis: 'fragmentation', value: profile.ontologyFragmentationIndex },
  ].map((row) => ({ ...row, value: round(row.value) }));
}

export function buildSemanticGroundingHeatmap(
  input: RuntimeOntologyObserveInput,
  profile: RuntimeOntologyProfile,
): { layer: string; grounding: number }[] {
  const values = [
    profile.symbolicAnchorDensity,
    profile.referenceChainIntegrity,
    1 - profile.observerGeneratedRealityRisk,
    profile.replayMeaningPersistence,
    input.realityAnchorConfidence,
  ];
  return ONTOLOGY_GROUNDING_LAYERS.map((layer, index) => ({
    layer,
    grounding: round(values[index] ?? profile.semanticGroundingStrength),
  }));
}

export function buildRecursiveMeaningLadder(profile: RuntimeOntologyProfile): { rung: string; depth: number }[] {
  return ['symbol', 'meaning', 'ontology', 'universe', 'closed-loop'].map((rung, index) => ({
    rung,
    depth: round(profile.recursiveOntologyDepth * (0.7 + index * 0.07)),
  }));
}

export function buildSymbolicDriftTimeline(
  profile: RuntimeOntologyProfile,
  prior: { at: string; level: number }[],
): { at: string; level: number }[] {
  return [...prior, { at: new Date().toISOString(), level: profile.symbolicReferenceInstability }].slice(-48);
}
