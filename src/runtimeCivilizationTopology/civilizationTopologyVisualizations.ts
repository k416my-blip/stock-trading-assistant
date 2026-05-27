import type {
  CivilizationTopologyGraph,
  RuntimeCivilizationTopologyObserveInput,
  RuntimeCivilizationTopologyProfile,
} from '../types/runtimeCivilizationTopology';
import {
  CIVILIZATION_COGNITION_CHAIN,
  CIVILIZATION_TOPOLOGY_LAYERS,
} from '../constants/runtimeCivilizationTopology';

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;

export function resetCivilizationTopologyVisualizationsForTest(): void {
  /* stateless */
}

function buildGraph(labels: readonly string[], coupling: number): CivilizationTopologyGraph {
  const nodes = labels.map((label, index) => ({
    id: `${label}_${index}`,
    label,
    stability: round(1 - coupling * (0.55 + index * 0.05)),
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

export function buildCognitionTopologyGraph(profile: RuntimeCivilizationTopologyProfile): CivilizationTopologyGraph {
  return buildGraph(CIVILIZATION_TOPOLOGY_LAYERS, profile.cognitionTopologyComplexity);
}

export function buildObserverChainMap(profile: RuntimeCivilizationTopologyProfile): CivilizationTopologyGraph {
  return buildGraph(CIVILIZATION_COGNITION_CHAIN, profile.observerChainDepth);
}

export function buildRecursiveMeaningTopology(profile: RuntimeCivilizationTopologyProfile): CivilizationTopologyGraph {
  return buildGraph(['meaning', 'narrative', 'replay', 'telemetry', 'meaning'], profile.recursiveMeaningTopology);
}

export function buildRealityCouplingGraph(profile: RuntimeCivilizationTopologyProfile): CivilizationTopologyGraph {
  return buildGraph(['narrative', 'telemetry', 'governance', 'reality'], 1 - profile.narrativeRealityCoupling);
}

export function buildEpistemicStabilityRadar(
  profile: RuntimeCivilizationTopologyProfile,
): { axis: string; value: number }[] {
  return [
    { axis: 'epistemic', value: profile.epistemicStabilityScore },
    { axis: 'coupling', value: profile.narrativeRealityCoupling },
    { axis: 'beliefDrift', value: profile.governanceBeliefDrift },
    { axis: 'worldVariance', value: profile.semanticWorldModelVariance },
    { axis: 'collapse', value: profile.topologyCollapseRisk },
  ];
}

export function buildSemanticCivilizationHeatmap(
  input: RuntimeCivilizationTopologyObserveInput,
  profile: RuntimeCivilizationTopologyProfile,
): { layer: string; intensity: number }[] {
  const values = [
    profile.observerPerspectiveFragmentation,
    profile.governanceBeliefDrift,
    input.telemetryAmplificationScore,
    profile.recursiveMeaningTopology,
    profile.semanticWorldModelVariance,
    1 - profile.narrativeRealityCoupling,
  ];
  return CIVILIZATION_TOPOLOGY_LAYERS.map((layer, index) => ({
    layer,
    intensity: round(values[index] ?? profile.topologyCollapseRisk),
  }));
}

export function buildGovernanceWorldviewLadder(
  profile: RuntimeCivilizationTopologyProfile,
): { rung: string; drift: number }[] {
  return ['signal', 'meaning', 'belief', 'worldview', 'civilization'].map((rung, index) => ({
    rung,
    drift: round(profile.governanceBeliefDrift * (0.7 + index * 0.08)),
  }));
}
