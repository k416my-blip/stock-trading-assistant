export const RUNTIME_GOVERNANCE_FREEZE_VERSION = '1.0.0';
export const RUNTIME_GOVERNANCE_FREEZE_POLL_MS = 73_000;
export const RUNTIME_GOVERNANCE_FREEZE_TIMELINE_MAX = 360;

export const GOVERNANCE_FREEZE_LAYERS = [
  'runtime-stack',
  'verify',
  'dashboard',
  'telemetry',
  'soak',
  'docs',
  'indexing',
  'finalization',
] as const;

export const RUNTIME_GOVERNANCE_FREEZE_UI_JA = {
  sectionTitle: 'Runtime Governance Freeze & Operational Convergence Stability',
  safety:
    'observe-only governance freeze analysis — automatic cleanup/forced consolidation/runtime pruning/metric deletion/auto compression/semantic rewrite/dashboard auto reduction/architecture mutation 禁止',
  runtimeExpansionEntropy: 'runtimeExpansionEntropy',
  recursiveLayerProliferationRisk: 'recursiveLayerProliferationRisk',
  stackObservabilityOverhead: 'stackObservabilityOverhead',
  governanceStabilizationReadiness: 'governanceStabilizationReadiness',
  operationalConvergenceScore: 'operationalConvergenceScore',
  stackMaintainabilityIndex: 'stackMaintainabilityIndex',
  verifyExecutionStress: 'verifyExecutionStress',
  architectureConvergencePressure: 'architectureConvergencePressure',
  expansionFreezeConfidence: 'expansionFreezeConfidence',
  governanceLockRecommendation: 'governanceLockRecommendation',
  stackFinalizationReadiness: 'stackFinalizationReadiness',
  architectureClosureIntegrity: 'architectureClosureIntegrity',
} as const;
