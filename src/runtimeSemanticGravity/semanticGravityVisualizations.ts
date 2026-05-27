import type {
  RuntimeSemanticGravityProfile,
  SemanticGravityGraph,
} from '../types/runtimeSemanticGravity';
import {
  SEMANTIC_GRAVITY_LAYERS,
  SEMANTIC_PLURALITY_NODES,
} from '../constants/runtimeSemanticGravity';

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;

export function resetSemanticGravityVisualizationsForTest(): void {
  /* stateless */
}

function buildGraph(labels: readonly string[], gravity: number, divergence: number): SemanticGravityGraph {
  const nodes = labels.map((label, index) => ({
    id: `${label}_${index}`,
    label,
    gravity: round(gravity * (0.7 + index * 0.06)),
  }));
  return {
    nodes,
    edges: nodes.slice(0, -1).map((node, index) => ({
      from: node.id,
      to: nodes[index + 1]?.id ?? node.id,
      divergence: round(divergence),
    })),
    measuredAt: new Date().toISOString(),
  };
}

export function buildSemanticGravityFieldMap(profile: RuntimeSemanticGravityProfile): SemanticGravityGraph {
  return buildGraph(SEMANTIC_GRAVITY_LAYERS, profile.semanticGravityMass, profile.semanticAnchorDivergence);
}

export function buildAnchorDivergenceTopology(profile: RuntimeSemanticGravityProfile): SemanticGravityGraph {
  return buildGraph(['anchor', 'observer', 'narrative', 'worldview', 'orbit', 'isolation'], profile.anchorCouplingStress, profile.semanticAnchorDivergence);
}

export function buildSemanticPluralityGraph(profile: RuntimeSemanticGravityProfile): SemanticGravityGraph {
  return buildGraph(SEMANTIC_PLURALITY_NODES, profile.semanticDiversityRetention, 1 - profile.ontologyPluralityIntegrity);
}

export function buildObserverBeliefClusteringMap(profile: RuntimeSemanticGravityProfile): SemanticGravityGraph {
  return buildGraph(['observer-a', 'observer-b', 'consensus', 'doctrine', 'orthodoxy'], profile.observerConsensusGravity, profile.observerAnchorVariance);
}

export function buildOntologyCentralizationRadar(profile: RuntimeSemanticGravityProfile): { axis: string; value: number }[] {
  return [
    { axis: 'truth pressure', value: profile.canonicalTruthPressure },
    { axis: 'hierarchy rigidity', value: profile.semanticHierarchyRigidity },
    { axis: 'authority', value: profile.ontologyAuthorityConcentration },
    { axis: 'monoculture', value: profile.semanticMonocultureRisk },
    { axis: 'topology stress', value: profile.topologyCentralizationStress },
  ].map((row) => ({ ...row, value: round(row.value) }));
}

export function buildCanonicalAttractionHeatmap(profile: RuntimeSemanticGravityProfile): { layer: string; attraction: number }[] {
  const values = [
    profile.canonicalCenterAttraction,
    profile.ontologyOverCentralizationRisk,
    profile.canonicalTruthPressure,
    profile.metricBeliefConvergence,
    profile.observerConsensusGravity,
    profile.semanticOrthodoxyPressure,
  ];
  return SEMANTIC_GRAVITY_LAYERS.map((layer, index) => ({
    layer,
    attraction: round(values[index] ?? profile.canonicalCenterAttraction),
  }));
}

export function buildSemanticEquilibriumTimeline(
  profile: RuntimeSemanticGravityProfile,
  prior: { at: string; equilibrium: number }[],
): { at: string; equilibrium: number }[] {
  return [...prior, { at: new Date().toISOString(), equilibrium: profile.semanticEquilibriumScore }].slice(-48);
}
