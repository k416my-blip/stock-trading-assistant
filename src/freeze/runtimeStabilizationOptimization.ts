import type { AutomatedSoakScenarioId } from '../types/automatedSoakRunner';
import { AUTOMATED_SOAK_SCENARIO_IDS } from '../types/automatedSoakRunner';

export type ScenarioTier = 'core' | 'extended' | 'experimental' | 'archived';

export type ObservabilityCostMetrics = {
  runtimeMaintenanceCost: number;
  verifyExecutionPressure: number;
  telemetryExpansionCost: number;
  dashboardRenderPressure: number;
  scenarioManagementComplexity: number;
  runtimeOperationalWeight: number;
  observabilityBudgetUsage: number;
  stabilizationReadinessScore: number;
};

export type RuntimeOptimizationReport = {
  freezeTag: 'runtime-freeze-v1';
  registryLazyLoading: string[];
  scenarioDeferredImports: string[];
  verifyBatching: string[];
  runtimeLightStrictSeparation: string[];
  dashboardModuleSplitting: string[];
  exportChunkPartitioning: string[];
};

export type SoakExecutionCostAnalysis = {
  scenarioTiers: Record<ScenarioTier, AutomatedSoakScenarioId[]>;
  partialSoakExecution: string[];
  selectiveReplayExecution: string[];
  scenarioDependencyMap: Record<AutomatedSoakScenarioId, AutomatedSoakScenarioId[]>;
  replayCostEstimation: Record<AutomatedSoakScenarioId, number>;
};

export type DashboardPerformanceAnalysis = {
  virtualizationReadiness: number;
  renderBatchingAnalysis: string[];
  semanticPanelGrouping: string[];
  dashboardHydrationTiming: string[];
  telemetryRenderBudget: number;
  operatorAttentionOptimization: string[];
};

export type DependencyStabilizationReport = {
  circularImportDetection: string[];
  registryDependencyFlattening: string[];
  runtimeIsolationScoring: number;
  moduleCouplingPressure: number;
  verifyChainOptimization: string[];
};

export type CursorOptimizationReport = {
  indexingExclusionSuggestions: string[];
  archiveRelocationSuggestions: string[];
  generatedArtifactSegregation: string[];
  docsCompressionSuggestions: string[];
  telemetrySnapshotArchiving: string[];
};

export type RuntimeStabilizationExportBundle = {
  runtimeOptimizationReport: RuntimeOptimizationReport;
  observabilityCostReport: ObservabilityCostMetrics;
  soakExecutionCostAnalysis: SoakExecutionCostAnalysis;
  dashboardPerformanceAnalysis: DashboardPerformanceAnalysis;
  dependencyStabilizationReport: DependencyStabilizationReport;
  cursorOptimizationReport: CursorOptimizationReport;
};

export const FROZEN_RUNTIME_LIGHT_SCRIPTS = [
  'verify:runtime-self-recursion-endurance',
  'verify:runtime-telemetry-entropy',
  'verify:runtime-cognitive-governance',
  'verify:runtime-civilization-topology',
  'verify:runtime-meta-limit',
  'verify:runtime-federation',
  'verify:runtime-ontology',
  'verify:runtime-finite-boundary',
  'verify:runtime-semantic-compression',
  'verify:runtime-semantic-gravity',
  'verify:runtime-semantic-thermodynamics',
  'verify:runtime-semantic-phase-transition',
  'verify:runtime-adaptive-observation',
  'verify:runtime-observer-reality',
  'verify:runtime-inter-civilization',
  'verify:runtime-governance-freeze',
] as const;

export const FROZEN_FULL_RUNTIME_VERIFY_COUNT = 41;

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;

export function buildScenarioTiering(): Record<ScenarioTier, AutomatedSoakScenarioId[]> {
  return {
    core: [
      'foreground_background',
      'websocket_disconnect',
      'thermal_stress',
      'battery_saver',
      'memory_pressure',
      'native_kill_recovery',
    ],
    extended: [
      'async_flood',
      'replay_flood',
      'dashboard_render_storm',
      'android_lifecycle_stress',
      'runtime_self_recursion_endurance',
      'runtime_telemetry_entropy',
      'runtime_cognitive_governance',
      'runtime_civilization_topology',
      'runtime_meta_limit_governance',
      'runtime_federation_governance',
    ],
    experimental: [
      'runtime_ontology_stabilization',
      'runtime_finite_boundary',
      'runtime_semantic_compression',
      'runtime_semantic_gravity',
      'runtime_semantic_thermodynamics',
      'runtime_semantic_phase_transition',
      'runtime_adaptive_observation',
      'runtime_observer_reality_selection',
      'runtime_inter_civilization_resonance',
      'runtime_governance_freeze',
    ],
    archived: [],
  };
}

export function buildScenarioDependencyMap(): Record<AutomatedSoakScenarioId, AutomatedSoakScenarioId[]> {
  const tiers = buildScenarioTiering();
  const map = {} as Record<AutomatedSoakScenarioId, AutomatedSoakScenarioId[]>;
  for (const id of AUTOMATED_SOAK_SCENARIO_IDS) map[id] = [];
  for (const id of tiers.extended) map[id] = ['foreground_background'];
  for (const id of tiers.experimental) map[id] = ['runtime_self_recursion_endurance', 'runtime_telemetry_entropy'];
  map.runtime_governance_freeze = ['runtime_inter_civilization_resonance', 'runtime_observer_reality_selection'];
  return map;
}

export function buildReplayCostEstimation(): Record<AutomatedSoakScenarioId, number> {
  const tiers = buildScenarioTiering();
  const cost = Object.fromEntries(AUTOMATED_SOAK_SCENARIO_IDS.map((id) => [id, 0.35])) as Record<
    AutomatedSoakScenarioId,
    number
  >;
  for (const id of tiers.extended) cost[id] = 0.62;
  for (const id of tiers.experimental) cost[id] = 0.82;
  for (const id of tiers.archived) cost[id] = 0.1;
  return cost;
}

export function buildObservabilityCostMetrics(): ObservabilityCostMetrics {
  const runtimeScriptPressure = FROZEN_RUNTIME_LIGHT_SCRIPTS.length / 16;
  const scenarioPressure = AUTOMATED_SOAK_SCENARIO_IDS.length / 26;
  const verifyPressure = FROZEN_FULL_RUNTIME_VERIFY_COUNT / 41;
  const telemetryExpansionCost = round((runtimeScriptPressure + scenarioPressure) / 2);
  const dashboardRenderPressure = round((8 + FROZEN_RUNTIME_LIGHT_SCRIPTS.length) / 32);
  const scenarioManagementComplexity = round(scenarioPressure);
  const verifyExecutionPressure = round(verifyPressure);
  const runtimeMaintenanceCost = round((runtimeScriptPressure + verifyPressure + scenarioPressure) / 3);
  const runtimeOperationalWeight = round((runtimeMaintenanceCost + dashboardRenderPressure + telemetryExpansionCost) / 3);
  const observabilityBudgetUsage = round((runtimeOperationalWeight + scenarioManagementComplexity) / 2);
  const stabilizationReadinessScore = round(1 - observabilityBudgetUsage * 0.32);
  return {
    runtimeMaintenanceCost,
    verifyExecutionPressure,
    telemetryExpansionCost,
    dashboardRenderPressure,
    scenarioManagementComplexity,
    runtimeOperationalWeight,
    observabilityBudgetUsage,
    stabilizationReadinessScore,
  };
}

export function buildRuntimeOptimizationReport(): RuntimeOptimizationReport {
  return {
    freezeTag: 'runtime-freeze-v1',
    registryLazyLoading: [
      'keep runtime-light as registry/import integrity only',
      'avoid adding runtime stack entries after runtime-freeze-v1',
    ],
    scenarioDeferredImports: [
      'automatedScenarioRotator dynamically imports scenario modules only when selected',
      'scenario registry IDs remain frozen at 26',
    ],
    verifyBatching: [
      'use verify:runtime-stabilization for post-freeze optimization checks',
      'keep verify:runtime-full manual/scheduled rather than daily development path',
    ],
    runtimeLightStrictSeparation: [
      'verify:runtime-light checks registry integrity and does not execute full runtime stacks',
      'verify:runtime-stabilization must not be added to allRuntimeStacks as a new stack layer',
    ],
    dashboardModuleSplitting: [
      'group heavy panels by operational domain before virtualizing rows',
      'preserve current dashboard behavior while measuring render pressure',
    ],
    exportChunkPartitioning: [
      'partition optimization reports by runtime, observability, soak, dashboard, and dependency domains',
      'keep export partitioning as report structure only',
    ],
  };
}

export function buildSoakExecutionCostAnalysis(): SoakExecutionCostAnalysis {
  return {
    scenarioTiers: buildScenarioTiering(),
    partialSoakExecution: ['core tier for quick stability checks', 'extended tier for scheduled soak windows'],
    selectiveReplayExecution: ['target scenario replay by tier', 'run experimental tier only for focused diagnostics'],
    scenarioDependencyMap: buildScenarioDependencyMap(),
    replayCostEstimation: buildReplayCostEstimation(),
  };
}

export function buildDashboardPerformanceAnalysis(): DashboardPerformanceAnalysis {
  return {
    virtualizationReadiness: 0.74,
    renderBatchingAnalysis: ['batch domain panels by freeze-era group', 'avoid rendering inactive heavy summaries'],
    semanticPanelGrouping: ['runtime health', 'semantic stability', 'freeze readiness', 'operator cost'],
    dashboardHydrationTiming: ['measure initial panel hydration separately from telemetry refresh'],
    telemetryRenderBudget: 0.68,
    operatorAttentionOptimization: ['surface freeze readiness first', 'collapse low-priority historical panels by default'],
  };
}

export function buildDependencyStabilizationReport(): DependencyStabilizationReport {
  return {
    circularImportDetection: ['verify static import graph before reworking shared runtime modules'],
    registryDependencyFlattening: ['keep frozen registry arrays as source of truth'],
    runtimeIsolationScoring: 0.72,
    moduleCouplingPressure: 0.58,
    verifyChainOptimization: ['preserve full chain coverage', 'route daily checks through runtime-light and stabilization verify'],
  };
}

export function buildCursorOptimizationReport(): CursorOptimizationReport {
  return {
    indexingExclusionSuggestions: ['keep docs/review and generated artifacts excluded from Cursor indexing'],
    archiveRelocationSuggestions: ['move old review exports to archived docs outside active indexing when needed'],
    generatedArtifactSegregation: ['keep reports, artifacts, screenshots, tmp, and caches outside Git tracking'],
    docsCompressionSuggestions: ['summarize long review docs into freeze-era inventories'],
    telemetrySnapshotArchiving: ['archive historical snapshots outside active development paths'],
  };
}

export function buildRuntimeStabilizationExportBundle(): RuntimeStabilizationExportBundle {
  return {
    runtimeOptimizationReport: buildRuntimeOptimizationReport(),
    observabilityCostReport: buildObservabilityCostMetrics(),
    soakExecutionCostAnalysis: buildSoakExecutionCostAnalysis(),
    dashboardPerformanceAnalysis: buildDashboardPerformanceAnalysis(),
    dependencyStabilizationReport: buildDependencyStabilizationReport(),
    cursorOptimizationReport: buildCursorOptimizationReport(),
  };
}
