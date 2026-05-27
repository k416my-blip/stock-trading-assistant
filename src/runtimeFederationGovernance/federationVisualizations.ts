import type {
  FederationGraph,
  RuntimeFederationObserveInput,
  RuntimeFederationProfile,
} from '../types/runtimeFederationGovernance';
import { FEDERATION_CAUSAL_CHAIN, FEDERATION_STACK_GROUPS } from '../constants/runtimeFederationGovernance';

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;

export function resetFederationVisualizationsForTest(): void {
  /* stateless */
}

function buildGraph(labels: readonly string[], risk: number): FederationGraph {
  const nodes = labels.map((label, index) => ({
    id: `${label}_${index}`,
    label,
    weight: round(risk * (0.7 + index * 0.06)),
  }));
  return {
    nodes,
    edges: nodes.slice(0, -1).map((node, index) => ({
      from: node.id,
      to: nodes[index + 1]?.id ?? node.id,
      risk: round(risk),
    })),
    measuredAt: new Date().toISOString(),
  };
}

export function buildCrossLayerCausalGraph(profile: RuntimeFederationProfile): FederationGraph {
  return buildGraph(FEDERATION_CAUSAL_CHAIN, profile.crossLayerCouplingRisk);
}

export function buildStackFederationMap(profile: RuntimeFederationProfile): FederationGraph {
  return buildGraph(FEDERATION_STACK_GROUPS, profile.stackFederationComplexity);
}

export function buildTelemetryFederationGraph(profile: RuntimeFederationProfile): FederationGraph {
  return buildGraph(['raw', 'clustered', 'compressed', 'dashboard', 'export'], profile.metricExplosionRisk);
}

export function buildCivilizationLayerAggregationMap(profile: RuntimeFederationProfile): FederationGraph {
  return buildGraph(['resource', 'recursion', 'entropy', 'cognition', 'topology', 'meta-limit'], profile.recursiveLayerOverlap);
}

export function buildFederationSaturationRadar(profile: RuntimeFederationProfile): { axis: string; value: number }[] {
  return [
    { axis: 'metricExplosion', value: profile.metricExplosionRisk },
    { axis: 'dashboard', value: profile.dashboardSaturationPressure },
    { axis: 'coupling', value: profile.crossLayerCouplingRisk },
    { axis: 'overlap', value: profile.recursiveLayerOverlap },
    { axis: 'integrityLoss', value: 1 - profile.federationIntegrityScore },
  ].map((row) => ({ ...row, value: round(row.value) }));
}

export function buildMetricRedundancyHeatmap(
  input: RuntimeFederationObserveInput,
  profile: RuntimeFederationProfile,
): { metric: string; redundancy: number }[] {
  return [
    { metric: 'semantic', redundancy: profile.semanticMetricRedundancy },
    { metric: 'duplicate', redundancy: input.duplicateMetricRatio },
    { metric: 'replay', redundancy: Math.min(1, input.replayChainCount / 80) },
    { metric: 'dashboard', redundancy: profile.dashboardSaturationPressure },
    { metric: 'observer', redundancy: profile.observerFederationDrift },
  ].map((row) => ({ ...row, redundancy: round(row.redundancy) }));
}

export function buildObserverDependencyMatrix(
  input: RuntimeFederationObserveInput,
  profile: RuntimeFederationProfile,
): { observer: string; dependencies: number; risk: number }[] {
  return ['observer', 'audit', 'governance', 'telemetry'].map((observer, index) => ({
    observer,
    dependencies: Math.max(1, Math.round(input.observerDependencyCount / (index + 2))),
    risk: round(profile.observerFederationDrift * (0.75 + index * 0.07)),
  }));
}

export function buildStackCompressionGauge(profile: RuntimeFederationProfile): { label: string; value: number }[] {
  return [
    { label: 'compression', value: profile.federationCompressionRatio },
    { label: 'integrity', value: profile.federationIntegrityScore },
    { label: 'coordination', value: profile.governanceCoordinationStability },
    { label: 'redundancyReduced', value: 1 - profile.semanticMetricRedundancy },
  ].map((row) => ({ ...row, value: round(row.value) }));
}

export function buildGovernanceHierarchyLadder(profile: RuntimeFederationProfile): { rung: string; stability: number }[] {
  return ['metric', 'layer', 'stack', 'federation', 'civilization'].map((rung, index) => ({
    rung,
    stability: round(profile.governanceCoordinationStability * (0.72 + index * 0.06)),
  }));
}

export function buildFederationStabilityTimeline(
  profile: RuntimeFederationProfile,
  prior: { at: string; level: number }[],
): { at: string; level: number }[] {
  return [...prior, { at: new Date().toISOString(), level: profile.federationIntegrityScore }].slice(-48);
}
