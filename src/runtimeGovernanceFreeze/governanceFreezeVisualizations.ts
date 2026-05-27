import { GOVERNANCE_FREEZE_LAYERS } from '../constants/runtimeGovernanceFreeze';
import type {
  GovernanceFreezeGraph,
  RuntimeGovernanceFreezeProfile,
} from '../types/runtimeGovernanceFreeze';

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;

export function resetGovernanceFreezeVisualizationsForTest(): void {
  /* stateless */
}

function buildGraph(labels: readonly string[], pressure: number, load: number): GovernanceFreezeGraph {
  const nodes = labels.map((label, index) => ({
    id: `${label}_${index}`,
    label,
    pressure: round(pressure * (0.72 + index * 0.04)),
  }));
  return {
    nodes,
    edges: nodes.slice(0, -1).map((node, index) => ({
      from: node.id,
      to: nodes[index + 1]?.id ?? node.id,
      load: round(load),
    })),
    measuredAt: new Date().toISOString(),
  };
}

export function buildExpansionEntropyGraph(profile: RuntimeGovernanceFreezeProfile): GovernanceFreezeGraph {
  return buildGraph(
    ['layers', 'verify', 'dashboard', 'telemetry', 'soak', 'docs'],
    profile.runtimeExpansionEntropy,
    profile.runtimeComplexityAcceleration,
  );
}

export function buildArchitectureConvergenceRadar(profile: RuntimeGovernanceFreezeProfile): { axis: string; value: number }[] {
  return [
    { axis: 'convergence', value: profile.architectureConvergencePressure },
    { axis: 'necessity', value: profile.stabilizationNecessityIndex },
    { axis: 'readiness', value: profile.governanceStabilizationReadiness },
    { axis: 'steady-state', value: profile.operationalSteadyStateScore },
    { axis: 'closure', value: profile.architectureClosureIntegrity },
  ].map((row) => ({ ...row, value: round(row.value) }));
}

export function buildRuntimeOperationalPressureHeatmap(
  profile: RuntimeGovernanceFreezeProfile,
): { layer: string; pressure: number }[] {
  const values = [
    profile.runtimeExpansionEntropy,
    profile.verifyExecutionStress,
    profile.dashboardOperationalWeight,
    profile.telemetryMaintenanceLoad,
    profile.soakScenarioExpansionPressure,
    profile.runtimeIndexingOverhead,
    profile.recursiveGovernanceStress,
    profile.stackFinalizationReadiness,
  ];
  return GOVERNANCE_FREEZE_LAYERS.map((layer, index) => ({
    layer,
    pressure: round(values[index] ?? profile.observabilityCostGradient),
  }));
}

export function buildGovernanceFreezeReadinessMonitor(
  profile: RuntimeGovernanceFreezeProfile,
): { label: string; value: number }[] {
  return [
    { label: 'freeze confidence', value: profile.expansionFreezeConfidence },
    { label: 'lock recommendation', value: profile.governanceLockRecommendation },
    { label: 'finalization', value: profile.stackFinalizationReadiness },
    { label: 'closure', value: profile.architectureClosureIntegrity },
    { label: 'equilibrium', value: profile.observabilityEquilibriumState },
  ].map((row) => ({ ...row, value: round(row.value) }));
}

export function buildRecursiveExpansionTopology(profile: RuntimeGovernanceFreezeProfile): GovernanceFreezeGraph {
  return buildGraph(
    ['observer', 'layer', 'verify', 'soak', 'docs', 'indexing', 'closure'],
    profile.recursiveLayerProliferationRisk,
    profile.recursiveInstrumentationPressure,
  );
}

export function buildStabilizationEquilibriumGraph(profile: RuntimeGovernanceFreezeProfile): GovernanceFreezeGraph {
  return buildGraph(
    ['maintainability', 'convergence', 'steady-state', 'equilibrium', 'closure'],
    profile.operationalConvergenceScore,
    profile.observabilityEquilibriumState,
  );
}

export function buildStackSaturationDashboard(profile: RuntimeGovernanceFreezeProfile): { label: string; value: number }[] {
  return [
    { label: 'observability cost', value: profile.observabilityCostGradient },
    { label: 'fragility', value: profile.runtimeOperationalFragility },
    { label: 'density', value: profile.civilizationLayerDensity },
    { label: 'fatigue', value: profile.semanticExpansionFatigue },
    { label: 'maintainability', value: profile.stackMaintainabilityIndex },
  ].map((row) => ({ ...row, value: round(row.value) }));
}

export function buildObservabilityCostTimeline(
  profile: RuntimeGovernanceFreezeProfile,
  prior: { at: string; cost: number }[],
): { at: string; cost: number }[] {
  return [...prior, { at: new Date().toISOString(), cost: profile.observabilityCostGradient }].slice(-48);
}
