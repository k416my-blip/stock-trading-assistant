export const RUNTIME_FINITE_BOUNDARY_VERSION = '1.0.0';
export const RUNTIME_FINITE_BOUNDARY_POLL_MS = 45_000;
export const RUNTIME_FINITE_BOUNDARY_TIMELINE_MAX = 360;

export const FINITE_BOUNDARY_STACK_LAYERS = [
  'observer',
  'telemetry',
  'governance',
  'ontology',
  'federation',
  'boundary',
] as const;

export const FINITE_BOUNDARY_RECURSION_LADDER = [
  'signal',
  'observer',
  'observer-of-observer',
  'semantic recursion',
  'ontology recursion',
  'finite boundary',
] as const;

export const RUNTIME_FINITE_BOUNDARY_UI_JA = {
  sectionTitle: 'Finite Boundary Governance & Observation Budgeting',
  safety:
    'observe-only finite boundary — forced stopping/runtime cutoff/auto pruning/semantic deletion/observer cleanup/forced simplification/runtime intervention 禁止',
  observerBudgetConsumption: 'observerBudgetConsumption',
  semanticEntropyBudget: 'semanticEntropyBudget',
  recursionBudgetUsage: 'recursionBudgetUsage',
  dashboardAttentionBudget: 'dashboardAttentionBudget',
  ontologyComplexityBudget: 'ontologyComplexityBudget',
  replayAmplificationBudget: 'replayAmplificationBudget',
  governanceExpansionBudget: 'governanceExpansionBudget',
  symbolicDensityBudget: 'symbolicDensityBudget',
  telemetryNoiseBudget: 'telemetryNoiseBudget',
  civilizationStackMassIndex: 'civilizationStackMassIndex',
  finiteObservationScore: 'finiteObservationScore',
  boundednessConfidence: 'boundednessConfidence',
  recursionTerminationProbability: 'recursionTerminationProbability',
  observerClosureIntegrity: 'observerClosureIntegrity',
  semanticCollapseThreshold: 'semanticCollapseThreshold',
  dashboardCognitiveCeiling: 'dashboardCognitiveCeiling',
  runtimeFiniteBoundaryIndex: 'runtimeFiniteBoundaryIndex',
  semanticEntropyContainment: 'semanticEntropyContainment',
  metricContainmentRatio: 'metricContainmentRatio',
  observerCascadeContainment: 'observerCascadeContainment',
  replayContainmentIntegrity: 'replayContainmentIntegrity',
  topologyContainmentStress: 'topologyContainmentStress',
} as const;
