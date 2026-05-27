import type {
  RecursiveBoundaryGraph,
  RuntimeMetaLimitProfile,
} from '../types/runtimeMetaLimitGovernance';
import { META_LIMIT_RECURSION_CHAIN } from '../constants/runtimeMetaLimitGovernance';

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;

export function resetMetaLimitVisualizationsForTest(): void {
  /* stateless */
}

function buildBoundaryGraph(labels: readonly string[], depth: number): RecursiveBoundaryGraph {
  const nodes = labels.map((label, index) => ({
    id: `${label}_${index}`,
    label,
    depth: round(depth * (0.65 + index * 0.08)),
  }));
  return {
    nodes,
    edges: nodes.slice(0, -1).map((node, index) => ({
      from: node.id,
      to: nodes[index + 1]?.id ?? node.id,
      recursion: round(depth),
    })),
    measuredAt: new Date().toISOString(),
  };
}

export function buildRecursionBoundaryGraph(profile: RuntimeMetaLimitProfile): RecursiveBoundaryGraph {
  return buildBoundaryGraph(META_LIMIT_RECURSION_CHAIN, profile.metaRecursionDepth);
}

export function buildTopologySelfReferenceMap(profile: RuntimeMetaLimitProfile): RecursiveBoundaryGraph {
  return buildBoundaryGraph(
    ['topology', 'topology_model', 'topology_observer', 'topology_report', 'topology'],
    profile.topologySelfReferenceScore,
  );
}

export function buildObserverDepthLadder(profile: RuntimeMetaLimitProfile): { rung: string; depth: number }[] {
  return ['observer', 'observer-of-observer', 'meta-observer', 'boundary-observer', 'finite-observer'].map(
    (rung, index) => ({
      rung,
      depth: round(profile.observerOfObserverDepth * (0.7 + index * 0.07)),
    }),
  );
}

export function buildMonitoringExpansionTimeline(
  profile: RuntimeMetaLimitProfile,
  prior: { at: string; level: number }[],
): { at: string; level: number }[] {
  return [...prior, { at: new Date().toISOString(), level: profile.monitoringChainExpansionRisk }].slice(-48);
}

export function buildSemanticInfinityRadar(profile: RuntimeMetaLimitProfile): { axis: string; value: number }[] {
  return [
    { axis: 'semanticLoop', value: profile.semanticInfiniteLoopRisk },
    { axis: 'metaCascade', value: profile.governanceMetaCascadeRisk },
    { axis: 'selfReference', value: profile.topologySelfReferenceScore },
    { axis: 'boundary', value: 1 - profile.recursionBoundaryStability },
    { axis: 'finite', value: 1 - profile.finiteObservationScore },
  ].map((row) => ({ ...row, value: round(row.value) }));
}

export function buildBoundednessStabilityGauge(profile: RuntimeMetaLimitProfile): { label: string; value: number }[] {
  return [
    { label: 'boundary', value: profile.recursionBoundaryStability },
    { label: 'epistemic', value: profile.epistemicBoundaryIntegrity },
    { label: 'termination', value: profile.observerTerminationConfidence },
    { label: 'finite', value: profile.finiteObservationScore },
  ];
}
