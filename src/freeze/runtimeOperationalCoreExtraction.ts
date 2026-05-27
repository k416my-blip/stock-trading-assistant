import type { AutomatedSoakScenarioId } from '../types/automatedSoakRunner';
import { AUTOMATED_SOAK_SCENARIO_IDS } from '../types/automatedSoakRunner';
import {
  FROZEN_FULL_RUNTIME_VERIFY_COUNT,
  FROZEN_RUNTIME_LIGHT_SCRIPTS,
  buildObservabilityCostMetrics,
  buildReplayCostEstimation,
  buildScenarioDependencyMap,
} from './runtimeStabilizationOptimization';
import {
  buildFailureSurfaceMetrics,
  buildObservabilityEconomicsMetrics,
  buildOperationalFragilityAnalysis,
} from './runtimeObservabilityEconomics';

export type OperationalCoreCandidate = {
  id: string;
  runtimeEssentialityScore: number;
  operationalDependencyPriority: number;
  runtimeSurvivabilityIndex: number;
  freezeCoreIntegrity: number;
};

export type OperationalCoreClassification = {
  coreRuntimeCandidates: OperationalCoreCandidate[];
  extendedAnalysisCandidates: OperationalCoreCandidate[];
  archiveCandidates: OperationalCoreCandidate[];
  criticalObservabilityPaths: string[];
};

export type ScenarioReductionTier = 'core' | 'extended' | 'optional' | 'archived';
export type VerifyReductionTier = 'critical' | 'integration' | 'nightly' | 'archived';

export type ScenarioReductionMetric = {
  scenario: AutomatedSoakScenarioId;
  classification: ScenarioReductionTier;
  scenarioOperationalValue: number;
  scenarioExecutionCost: number;
  scenarioMaintenanceWeight: number;
  scenarioDependencyPressure: number;
  scenarioFailureCoverage: number;
  scenarioRedundancyIndex: number;
};

export type VerifyReductionMetric = {
  script: string;
  classification: VerifyReductionTier;
  verifyOperationalNecessity: number;
  verifyCascadeCost: number;
  verifyExecutionWeight: number;
  verifyCoverageEfficiency: number;
  verifyMaintenancePressure: number;
  verifyCriticalityIndex: number;
};

export type ObservabilityReductionMetrics = {
  observabilityReductionPotential: number;
  telemetryNoiseRatio: number;
  dashboardSignalEfficiency: number;
  operatorAttentionEfficiency: number;
  runtimeSignalValueDensity: number;
  maintenanceReductionGain: number;
  runtimeComplexityCompression: number;
  operationalSimplicityScore: number;
};

export type ArchivePlanningAnalysis = {
  archiveMigrationCandidates: string[];
  frozenDocumentationCandidates: string[];
  simulationArchiveTargets: string[];
  deferredExecutionCandidates: string[];
  runtimeColdStoragePotential: number;
  observabilityRetentionPolicy: string[];
};

export type OperationalSustainabilityAnalysis = {
  longTermMaintainabilityProjection: number;
  operationalBurnoutRisk: number;
  runtimeOwnershipComplexity: number;
  freezeLongevityEstimate: number;
  stabilizationSustainability: number;
  operationalRecoveryCapacity: number;
};

export type DashboardOperationalReduction = {
  executiveDashboardCandidates: string[];
  engineeringDashboardCandidates: string[];
  archiveDashboardCandidates: string[];
  lowValueVisualizationDetection: string[];
  renderCostReductionOpportunities: string[];
  operatorFocusOptimization: string[];
};

export type OperationalCoreSimulationResult = {
  name: string;
  projectedCostDelta: number;
  projectedRiskDelta: number;
  projectedCoverageRetention: number;
  observeOnly: true;
};

export type OperationalCoreExportBundle = {
  freezeTag: 'runtime-freeze-v1';
  operationalCoreReport: OperationalCoreClassification;
  scenarioReductionAnalysis: ScenarioReductionMetric[];
  verifyReductionAnalysis: VerifyReductionMetric[];
  observabilityReductionReport: ObservabilityReductionMetrics;
  archivePlanningReport: ArchivePlanningAnalysis;
  operationalSustainabilityReport: OperationalSustainabilityAnalysis;
  dashboardOperationalReduction: DashboardOperationalReduction;
  simulationResults: OperationalCoreSimulationResult[];
};

const clamp = (value: number): number => Math.max(0, Math.min(1, value));
const round = (value: number): number => Math.round(clamp(value) * 1000) / 1000;
const roundSigned = (value: number): number => Math.round(value * 1000) / 1000;
const avg = (...values: number[]): number => round(values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length));

const CORE_SCENARIOS: AutomatedSoakScenarioId[] = [
  'foreground_background',
  'websocket_disconnect',
  'thermal_stress',
  'battery_saver',
  'memory_pressure',
  'native_kill_recovery',
];

const EXTENDED_SCENARIOS: AutomatedSoakScenarioId[] = [
  'async_flood',
  'replay_flood',
  'dashboard_render_storm',
  'android_lifecycle_stress',
  'runtime_self_recursion_endurance',
  'runtime_telemetry_entropy',
  'runtime_cognitive_governance',
  'runtime_civilization_topology',
];

const OPTIONAL_SCENARIOS: AutomatedSoakScenarioId[] = AUTOMATED_SOAK_SCENARIO_IDS.filter(
  (scenario) => !CORE_SCENARIOS.includes(scenario) && !EXTENDED_SCENARIOS.includes(scenario),
);

export function classifyOperationalCore(): OperationalCoreClassification {
  const essential = (id: string, index: number): OperationalCoreCandidate => ({
    id,
    runtimeEssentialityScore: round(0.92 - index * 0.025),
    operationalDependencyPriority: round(0.86 - index * 0.02),
    runtimeSurvivabilityIndex: round(0.9 - index * 0.018),
    freezeCoreIntegrity: round(0.94 - index * 0.015),
  });
  const extended = (id: string, index: number): OperationalCoreCandidate => ({
    id,
    runtimeEssentialityScore: round(0.68 - index * 0.018),
    operationalDependencyPriority: round(0.62 - index * 0.012),
    runtimeSurvivabilityIndex: round(0.64 - index * 0.014),
    freezeCoreIntegrity: round(0.72 - index * 0.01),
  });
  const archive = (id: string, index: number): OperationalCoreCandidate => ({
    id,
    runtimeEssentialityScore: round(0.42 - index * 0.012),
    operationalDependencyPriority: round(0.36 - index * 0.01),
    runtimeSurvivabilityIndex: round(0.38 - index * 0.01),
    freezeCoreIntegrity: round(0.58 - index * 0.008),
  });
  return {
    coreRuntimeCandidates: [
      'foreground_background',
      'websocket_disconnect',
      'thermal_stress',
      'battery_saver',
      'memory_pressure',
      'native_kill_recovery',
    ].map(essential),
    extendedAnalysisCandidates: FROZEN_RUNTIME_LIGHT_SCRIPTS.slice(0, 10).map(extended),
    archiveCandidates: FROZEN_RUNTIME_LIGHT_SCRIPTS.slice(10).map(archive),
    criticalObservabilityPaths: [
      'native survival telemetry',
      'websocket recovery',
      'thermal and memory pressure',
      'runtime-light registry integrity',
      'freeze-state verification',
    ],
  };
}

function classifyScenario(scenario: AutomatedSoakScenarioId): ScenarioReductionTier {
  if (CORE_SCENARIOS.includes(scenario)) return 'core';
  if (EXTENDED_SCENARIOS.includes(scenario)) return 'extended';
  if (OPTIONAL_SCENARIOS.includes(scenario)) return 'optional';
  return 'archived';
}

export function buildScenarioReductionAnalysis(): ScenarioReductionMetric[] {
  const replayCost = buildReplayCostEstimation();
  const dependencyMap = buildScenarioDependencyMap();
  return AUTOMATED_SOAK_SCENARIO_IDS.map((scenario) => {
    const classification = classifyScenario(scenario);
    const coreWeight = classification === 'core' ? 0.9 : classification === 'extended' ? 0.68 : 0.44;
    const dependencyPressure = round(dependencyMap[scenario].length / 3);
    const executionCost = replayCost[scenario];
    const failureCoverage = round(coreWeight - dependencyPressure * 0.12 + executionCost * 0.08);
    return {
      scenario,
      classification,
      scenarioOperationalValue: round(coreWeight),
      scenarioExecutionCost: executionCost,
      scenarioMaintenanceWeight: avg(executionCost, dependencyPressure),
      scenarioDependencyPressure: dependencyPressure,
      scenarioFailureCoverage: failureCoverage,
      scenarioRedundancyIndex: round(1 - failureCoverage + dependencyPressure * 0.2),
    };
  });
}

function classifyVerify(script: string, index: number): VerifyReductionTier {
  if (index < 8 || script.includes('self-recursion') || script.includes('telemetry')) return 'critical';
  if (index < 18 || script.includes('observer') || script.includes('resource')) return 'integration';
  if (index < 32) return 'nightly';
  return 'archived';
}

export function buildVerifyReductionAnalysis(): VerifyReductionMetric[] {
  const scripts = [
    ...FROZEN_RUNTIME_LIGHT_SCRIPTS,
    ...Array.from({ length: FROZEN_FULL_RUNTIME_VERIFY_COUNT - FROZEN_RUNTIME_LIGHT_SCRIPTS.length }, (_, index) => `full-runtime-verify-${index + 1}`),
  ];
  return scripts.map((script, index) => {
    const classification = classifyVerify(script, index);
    const necessity = classification === 'critical' ? 0.92 : classification === 'integration' ? 0.72 : classification === 'nightly' ? 0.52 : 0.34;
    const cascadeCost = round(0.38 + index / (scripts.length * 1.8));
    const executionWeight = round(0.34 + index / (scripts.length * 1.6));
    const coverageEfficiency = round(necessity - executionWeight * 0.18);
    const maintenancePressure = avg(cascadeCost, executionWeight);
    return {
      script,
      classification,
      verifyOperationalNecessity: round(necessity),
      verifyCascadeCost: cascadeCost,
      verifyExecutionWeight: executionWeight,
      verifyCoverageEfficiency: coverageEfficiency,
      verifyMaintenancePressure: maintenancePressure,
      verifyCriticalityIndex: avg(necessity, coverageEfficiency, 1 - maintenancePressure * 0.35),
    };
  });
}

export function buildObservabilityReductionMetrics(): ObservabilityReductionMetrics {
  const economics = buildObservabilityEconomicsMetrics();
  const cost = buildObservabilityCostMetrics();
  const fragility = buildOperationalFragilityAnalysis();
  const scenarioAnalysis = buildScenarioReductionAnalysis();
  const optionalRatio = scenarioAnalysis.filter((row) => row.classification === 'optional').length / scenarioAnalysis.length;
  const dashboardSignalEfficiency = round(1 - economics.dashboardAttentionCost * 0.42);
  const operatorAttentionEfficiency = round(1 - economics.operatorAttentionConsumption * 0.4);
  const runtimeSignalValueDensity = avg(dashboardSignalEfficiency, operatorAttentionEfficiency, cost.stabilizationReadinessScore);
  const observabilityReductionPotential = avg(optionalRatio, economics.observabilityCostIndex, fragility.observabilityOverextensionRisk);
  const maintenanceReductionGain = avg(observabilityReductionPotential, 1 - fragility.maintainabilityFragilityScore * 0.35);
  return {
    observabilityReductionPotential,
    telemetryNoiseRatio: round(economics.telemetryStoragePressure * 0.42),
    dashboardSignalEfficiency,
    operatorAttentionEfficiency,
    runtimeSignalValueDensity,
    maintenanceReductionGain,
    runtimeComplexityCompression: avg(observabilityReductionPotential, maintenanceReductionGain),
    operationalSimplicityScore: avg(operatorAttentionEfficiency, runtimeSignalValueDensity, maintenanceReductionGain),
  };
}

export function buildArchivePlanningAnalysis(): ArchivePlanningAnalysis {
  const scenarioAnalysis = buildScenarioReductionAnalysis();
  const verifyAnalysis = buildVerifyReductionAnalysis();
  return {
    archiveMigrationCandidates: scenarioAnalysis
      .filter((row) => row.classification === 'optional' && row.scenarioRedundancyIndex >= 0.5)
      .map((row) => row.scenario),
    frozenDocumentationCandidates: [
      'historical runtime review docs',
      'phase-by-phase expansion reports',
      'long-form semantic analysis docs',
    ],
    simulationArchiveTargets: [
      'operator overload simulation histories',
      'scenario explosion simulation histories',
      'dashboard minimization simulation histories',
    ],
    deferredExecutionCandidates: verifyAnalysis
      .filter((row) => row.classification === 'nightly' || row.classification === 'archived')
      .slice(0, 12)
      .map((row) => row.script),
    runtimeColdStoragePotential: round(
      (scenarioAnalysis.filter((row) => row.classification === 'optional').length + verifyAnalysis.filter((row) => row.classification === 'archived').length) /
        (scenarioAnalysis.length + verifyAnalysis.length),
    ),
    observabilityRetentionPolicy: [
      'retain critical production survival paths',
      'retain runtime-light frozen registry checks',
      'defer optional scenario execution to manual/scheduled windows',
      'archive historical reports without deleting source behavior',
    ],
  };
}

export function buildOperationalSustainabilityAnalysis(): OperationalSustainabilityAnalysis {
  const reduction = buildObservabilityReductionMetrics();
  const fragility = buildOperationalFragilityAnalysis();
  const economics = buildObservabilityEconomicsMetrics();
  const longTermMaintainabilityProjection = avg(
    reduction.maintenanceReductionGain,
    reduction.operationalSimplicityScore,
    1 - fragility.maintainabilityFragilityScore * 0.35,
  );
  const operationalBurnoutRisk = avg(economics.operatorAttentionConsumption, fragility.operationalDriftRisk);
  const runtimeOwnershipComplexity = avg(economics.runtimeCognitiveCost, fragility.observabilityOverextensionRisk);
  const freezeLongevityEstimate = avg(longTermMaintainabilityProjection, 1 - operationalBurnoutRisk * 0.45);
  const stabilizationSustainability = avg(freezeLongevityEstimate, reduction.runtimeSignalValueDensity);
  const operationalRecoveryCapacity = avg(stabilizationSustainability, 1 - fragility.runtimeRecoveryDifficulty * 0.35);
  return {
    longTermMaintainabilityProjection,
    operationalBurnoutRisk,
    runtimeOwnershipComplexity,
    freezeLongevityEstimate,
    stabilizationSustainability,
    operationalRecoveryCapacity,
  };
}

export function buildDashboardOperationalReduction(): DashboardOperationalReduction {
  return {
    executiveDashboardCandidates: ['survival status', 'freeze integrity', 'operational cost delta', 'critical recovery status'],
    engineeringDashboardCandidates: ['runtime-light registry', 'soak tier map', 'verify critical path', 'dependency pressure'],
    archiveDashboardCandidates: ['semantic expansion history', 'long-form phase panels', 'low-frequency topology retrospectives'],
    lowValueVisualizationDetection: ['duplicated semantic timelines', 'historical resonance panels', 'rarely changing archive reports'],
    renderCostReductionOpportunities: ['group archived panels', 'defer optional dashboard hydration', 'batch engineering-only sections'],
    operatorFocusOptimization: ['default to executive summary', 'surface critical path failures first', 'hide optional archive planning by default'],
  };
}

function simulation(
  name: string,
  reductionFactor: number,
  riskFactor: number,
  coverageRetention: number,
): OperationalCoreSimulationResult {
  return {
    name,
    projectedCostDelta: roundSigned(-Math.abs(reductionFactor)),
    projectedRiskDelta: round(riskFactor),
    projectedCoverageRetention: round(coverageRetention),
    observeOnly: true,
  };
}

export function runOperationalCoreSimulations(): OperationalCoreSimulationResult[] {
  const reduction = buildObservabilityReductionMetrics();
  const sustainability = buildOperationalSustainabilityAnalysis();
  return [
    simulation('reduced-core operation simulation', reduction.observabilityReductionPotential * 0.42, 0.08, 0.91),
    simulation('archive migration simulation', reduction.maintenanceReductionGain * 0.38, 0.06, 0.88),
    simulation('verify reduction simulation', reduction.runtimeComplexityCompression * 0.34, 0.1, 0.9),
    simulation('telemetry reduction simulation', reduction.telemetryNoiseRatio * 0.32, 0.07, 0.87),
    simulation('dashboard minimization simulation', sustainability.operationalRecoveryCapacity * 0.26, 0.05, 0.89),
  ];
}

export function buildOperationalCoreExportBundle(): OperationalCoreExportBundle {
  return {
    freezeTag: 'runtime-freeze-v1',
    operationalCoreReport: classifyOperationalCore(),
    scenarioReductionAnalysis: buildScenarioReductionAnalysis(),
    verifyReductionAnalysis: buildVerifyReductionAnalysis(),
    observabilityReductionReport: buildObservabilityReductionMetrics(),
    archivePlanningReport: buildArchivePlanningAnalysis(),
    operationalSustainabilityReport: buildOperationalSustainabilityAnalysis(),
    dashboardOperationalReduction: buildDashboardOperationalReduction(),
    simulationResults: runOperationalCoreSimulations(),
  };
}
