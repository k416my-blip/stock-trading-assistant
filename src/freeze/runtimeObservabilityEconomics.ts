import type { AutomatedSoakScenarioId } from '../types/automatedSoakRunner';
import { AUTOMATED_SOAK_SCENARIO_IDS } from '../types/automatedSoakRunner';
import {
  FROZEN_FULL_RUNTIME_VERIFY_COUNT,
  FROZEN_RUNTIME_LIGHT_SCRIPTS,
  buildObservabilityCostMetrics,
  buildReplayCostEstimation,
  buildScenarioDependencyMap,
} from './runtimeStabilizationOptimization';

export type ObservabilityEconomicsMetrics = {
  observabilityCostIndex: number;
  runtimeMaintenanceEntropy: number;
  telemetryStoragePressure: number;
  dashboardAttentionCost: number;
  scenarioExecutionExpense: number;
  verificationScalabilityIndex: number;
  runtimeCognitiveCost: number;
  operatorAttentionConsumption: number;
};

export type FailureSurfaceMetrics = {
  registryFailurePropagationRisk: number;
  verifyCascadeFailureRisk: number;
  telemetryFloodCollapseRisk: number;
  dashboardHydrationFailureRisk: number;
  recursiveDependencyBreakRisk: number;
  soakExecutionDeadlockRisk: number;
  scenarioIsolationFailureRisk: number;
  runtimeFragmentationRisk: number;
};

export type ProjectionPoint = {
  step: string;
  projectedValue: number;
};

export type ScalabilityAnalysis = {
  registryGrowthCurve: ProjectionPoint[];
  verifyTimeProjection: ProjectionPoint[];
  scenarioExpansionProjection: ProjectionPoint[];
  telemetryGrowthProjection: ProjectionPoint[];
  dashboardComplexityProjection: ProjectionPoint[];
  dependencyGrowthPressure: ProjectionPoint[];
};

export type BottleneckTopologyAnalysis = {
  importHotspotMap: { target: string; pressure: number }[];
  verifyCriticalPath: { script: string; pressure: number }[];
  telemetryPressureZones: { zone: string; pressure: number }[];
  dashboardRenderHotspots: { panel: string; pressure: number }[];
  scenarioDependencyClusters: { scenario: AutomatedSoakScenarioId; dependencies: AutomatedSoakScenarioId[]; pressure: number }[];
  runtimeCouplingHeatmap: { module: string; coupling: number }[];
};

export type OperationalFragilityAnalysis = {
  maintainabilityFragilityScore: number;
  freezeIntegrityRisk: number;
  runtimeRecoveryDifficulty: number;
  stabilizationPressure: number;
  operationalDriftRisk: number;
  observabilityOverextensionRisk: number;
};

export type RuntimeEconomicsSimulationResult = {
  name: string;
  peakPressure: number;
  collapsePointEstimate: number;
  outcome: 'stable' | 'watch' | 'fragile';
  observeOnly: true;
};

export type RuntimeEconomicsExportBundle = {
  freezeTag: 'runtime-freeze-v1';
  observabilityEconomicsReport: ObservabilityEconomicsMetrics;
  failureSurfaceReport: FailureSurfaceMetrics;
  runtimeBottleneckAnalysis: BottleneckTopologyAnalysis;
  scalabilityProjectionReport: ScalabilityAnalysis;
  operationalFragilityReport: OperationalFragilityAnalysis;
  simulationResults: RuntimeEconomicsSimulationResult[];
};

const clamp = (value: number): number => Math.max(0, Math.min(1, value));
const round = (value: number): number => Math.round(clamp(value) * 1000) / 1000;
const roundValue = (value: number): number => Math.round(value * 1000) / 1000;
const avg = (...values: number[]): number => round(values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length));

function projection(seed: number, growth: number, steps: string[]): ProjectionPoint[] {
  return steps.map((step, index) => ({
    step,
    projectedValue: roundValue(seed * (1 + growth * index)),
  }));
}

export function buildObservabilityEconomicsMetrics(): ObservabilityEconomicsMetrics {
  const cost = buildObservabilityCostMetrics();
  const replayCosts = Object.values(buildReplayCostEstimation());
  const scenarioExecutionExpense = round(
    replayCosts.reduce((sum, value) => sum + value, 0) / Math.max(1, replayCosts.length),
  );
  const operatorAttentionConsumption = avg(
    cost.dashboardRenderPressure,
    cost.scenarioManagementComplexity,
    cost.runtimeOperationalWeight,
  );
  const runtimeCognitiveCost = avg(
    operatorAttentionConsumption,
    cost.observabilityBudgetUsage,
    cost.dashboardRenderPressure,
  );
  const observabilityCostIndex = avg(
    cost.runtimeMaintenanceCost,
    cost.observabilityBudgetUsage,
    scenarioExecutionExpense,
    runtimeCognitiveCost,
  );
  const runtimeMaintenanceEntropy = avg(
    cost.runtimeMaintenanceCost,
    cost.verifyExecutionPressure,
    cost.scenarioManagementComplexity,
  );
  const verificationScalabilityIndex = round(1 - cost.verifyExecutionPressure * 0.35);
  return {
    observabilityCostIndex,
    runtimeMaintenanceEntropy,
    telemetryStoragePressure: cost.telemetryExpansionCost,
    dashboardAttentionCost: avg(cost.dashboardRenderPressure, operatorAttentionConsumption),
    scenarioExecutionExpense,
    verificationScalabilityIndex,
    runtimeCognitiveCost,
    operatorAttentionConsumption,
  };
}

export function buildFailureSurfaceMetrics(): FailureSurfaceMetrics {
  const economics = buildObservabilityEconomicsMetrics();
  const cost = buildObservabilityCostMetrics();
  const dependencyMap = buildScenarioDependencyMap();
  const dependencyEdges = Object.values(dependencyMap).reduce((sum, dependencies) => sum + dependencies.length, 0);
  const dependencyPressure = round(dependencyEdges / Math.max(1, AUTOMATED_SOAK_SCENARIO_IDS.length * 2));
  return {
    registryFailurePropagationRisk: avg(economics.runtimeMaintenanceEntropy, cost.scenarioManagementComplexity),
    verifyCascadeFailureRisk: avg(cost.verifyExecutionPressure, economics.verificationScalabilityIndex),
    telemetryFloodCollapseRisk: avg(economics.telemetryStoragePressure, economics.observabilityCostIndex),
    dashboardHydrationFailureRisk: avg(economics.dashboardAttentionCost, cost.dashboardRenderPressure),
    recursiveDependencyBreakRisk: avg(dependencyPressure, economics.runtimeMaintenanceEntropy),
    soakExecutionDeadlockRisk: avg(economics.scenarioExecutionExpense, dependencyPressure),
    scenarioIsolationFailureRisk: avg(dependencyPressure, cost.scenarioManagementComplexity),
    runtimeFragmentationRisk: avg(economics.runtimeCognitiveCost, economics.runtimeMaintenanceEntropy),
  };
}

export function buildScalabilityAnalysis(): ScalabilityAnalysis {
  const steps = ['freeze-v1', 'plus-10%', 'plus-25%', 'plus-50%', 'plus-100%'];
  return {
    registryGrowthCurve: projection(FROZEN_RUNTIME_LIGHT_SCRIPTS.length, 0.1, steps),
    verifyTimeProjection: projection(FROZEN_FULL_RUNTIME_VERIFY_COUNT, 0.18, steps),
    scenarioExpansionProjection: projection(AUTOMATED_SOAK_SCENARIO_IDS.length, 0.12, steps),
    telemetryGrowthProjection: projection(1, 0.22, steps),
    dashboardComplexityProjection: projection(1, 0.2, steps),
    dependencyGrowthPressure: projection(1, 0.24, steps),
  };
}

export function buildBottleneckTopologyAnalysis(): BottleneckTopologyAnalysis {
  const cost = buildObservabilityCostMetrics();
  const economics = buildObservabilityEconomicsMetrics();
  const replayCost = buildReplayCostEstimation();
  const dependencyMap = buildScenarioDependencyMap();
  const scenarioDependencyClusters = AUTOMATED_SOAK_SCENARIO_IDS.map((scenario) => ({
    scenario,
    dependencies: dependencyMap[scenario],
    pressure: round((replayCost[scenario] + dependencyMap[scenario].length / 3) / 2),
  }));
  return {
    importHotspotMap: [
      { target: 'automatedScenarioRotator deferred imports', pressure: 0.18 },
      { target: 'runtime dashboard imports', pressure: cost.dashboardRenderPressure },
      { target: 'verify registry imports', pressure: cost.verifyExecutionPressure },
    ],
    verifyCriticalPath: FROZEN_RUNTIME_LIGHT_SCRIPTS.map((script, index) => ({
      script,
      pressure: round(0.42 + index / (FROZEN_RUNTIME_LIGHT_SCRIPTS.length * 3)),
    })),
    telemetryPressureZones: [
      { zone: 'runtime snapshots', pressure: economics.telemetryStoragePressure },
      { zone: 'dashboard hydration', pressure: economics.dashboardAttentionCost },
      { zone: 'soak timeline', pressure: economics.scenarioExecutionExpense },
    ],
    dashboardRenderHotspots: [
      { panel: 'stability dashboard', pressure: cost.dashboardRenderPressure },
      { panel: 'collapse radar', pressure: economics.operatorAttentionConsumption },
      { panel: 'freeze readiness summaries', pressure: economics.observabilityCostIndex },
    ],
    scenarioDependencyClusters,
    runtimeCouplingHeatmap: [
      { module: 'freeze reports', coupling: 0.22 },
      { module: 'soak registry', coupling: cost.scenarioManagementComplexity },
      { module: 'verify chain', coupling: cost.verifyExecutionPressure },
      { module: 'dashboard summaries', coupling: cost.dashboardRenderPressure },
    ],
  };
}

export function buildOperationalFragilityAnalysis(): OperationalFragilityAnalysis {
  const economics = buildObservabilityEconomicsMetrics();
  const failure = buildFailureSurfaceMetrics();
  const maintainabilityFragilityScore = avg(
    economics.runtimeMaintenanceEntropy,
    failure.registryFailurePropagationRisk,
    failure.recursiveDependencyBreakRisk,
  );
  const freezeIntegrityRisk = avg(
    failure.runtimeFragmentationRisk,
    failure.registryFailurePropagationRisk,
    1 - economics.verificationScalabilityIndex,
  );
  const runtimeRecoveryDifficulty = avg(
    failure.telemetryFloodCollapseRisk,
    failure.dashboardHydrationFailureRisk,
    failure.soakExecutionDeadlockRisk,
  );
  const stabilizationPressure = avg(maintainabilityFragilityScore, runtimeRecoveryDifficulty);
  const operationalDriftRisk = avg(freezeIntegrityRisk, economics.runtimeCognitiveCost);
  const observabilityOverextensionRisk = avg(
    economics.observabilityCostIndex,
    economics.operatorAttentionConsumption,
    failure.runtimeFragmentationRisk,
  );
  return {
    maintainabilityFragilityScore,
    freezeIntegrityRisk,
    runtimeRecoveryDifficulty,
    stabilizationPressure,
    operationalDriftRisk,
    observabilityOverextensionRisk,
  };
}

function simulation(
  name: string,
  base: number,
  multiplier: number,
): RuntimeEconomicsSimulationResult {
  const peakPressure = round(base * multiplier);
  const collapsePointEstimate = round(1 - peakPressure * 0.42);
  const outcome: RuntimeEconomicsSimulationResult['outcome'] =
    peakPressure >= 0.72 ? 'fragile' : peakPressure >= 0.48 ? 'watch' : 'stable';
  return { name, peakPressure, collapsePointEstimate, outcome, observeOnly: true };
}

export function runRuntimeEconomicsSimulations(): RuntimeEconomicsSimulationResult[] {
  const economics = buildObservabilityEconomicsMetrics();
  const failure = buildFailureSurfaceMetrics();
  return [
    simulation('verify overload simulation', failure.verifyCascadeFailureRisk, 1.18),
    simulation('telemetry flood simulation', failure.telemetryFloodCollapseRisk, 1.16),
    simulation('scenario explosion simulation', failure.scenarioIsolationFailureRisk, 1.2),
    simulation('dashboard saturation simulation', failure.dashboardHydrationFailureRisk, 1.14),
    simulation('dependency cascade simulation', failure.recursiveDependencyBreakRisk, 1.22),
    simulation('operator overload simulation', economics.operatorAttentionConsumption, 1.18),
  ];
}

export function buildRuntimeEconomicsExportBundle(): RuntimeEconomicsExportBundle {
  return {
    freezeTag: 'runtime-freeze-v1',
    observabilityEconomicsReport: buildObservabilityEconomicsMetrics(),
    failureSurfaceReport: buildFailureSurfaceMetrics(),
    runtimeBottleneckAnalysis: buildBottleneckTopologyAnalysis(),
    scalabilityProjectionReport: buildScalabilityAnalysis(),
    operationalFragilityReport: buildOperationalFragilityAnalysis(),
    simulationResults: runRuntimeEconomicsSimulations(),
  };
}
