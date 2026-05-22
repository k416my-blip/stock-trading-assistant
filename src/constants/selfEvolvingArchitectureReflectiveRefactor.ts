import type {
  ArchitectureAuditTargetId,
  ArchitectureStructureState,
  SelfArchitectureFeatureId,
} from '../types/selfEvolvingArchitectureReflectiveRefactor';

export const SELF_ARCHITECTURE_REGULATORY_JA =
  'Self-Evolving Architecture & Reflective Refactor — 構造監査・提案のみ（自動リファクタ・自己書き換え禁止）。Paper Trading・realTradingEnabled=false。';

export const SELF_ARCHITECTURE_AI_PROMPT_JA = `
【Self-Evolving Architecture & Reflective Refactor】
- 構造肥大・重複・不要layerを監査し、最適化は governance 承認待ちの提案のみ。自動コード生成・自動リファクタ禁止。
- sandbox only · proposal-only · 断定予測禁止。
`.trim();

export const REAL_TRADING_ENABLED = false as const;
export const ARCH_HEALTH_REDUNDANT_THRESHOLD = 65;
export const ARCH_HEALTH_FRAGMENTED_THRESHOLD = 50;
export const ARCH_HEALTH_OVEREXPANDED_THRESHOLD = 35;
export const RECURSIVE_INFLATION_RISK_THRESHOLD = 75;
export const MOBILE_PRESSURE_THRESHOLD = 80;
export const LATENCY_FRAGMENTATION_UNSUPPORTED_THRESHOLD = 70;
export const BUDGET_ARCH_STABLE = 92;
export const BUDGET_ARCH_REDUNDANT = 80;
export const BUDGET_ARCH_FRAGMENTED = 70;
export const BUDGET_ARCH_OVEREXPANDED = 60;
export const BUDGET_ARCH_RECURSIVE = 65;
export const BUDGET_ARCH_MOBILE = 58;
export const BUDGET_ARCH_UNSUPPORTED = 50;
export const ARCHITECTURE_TIMELINE_MAX = 48;

export const ARCHITECTURE_HEALTH_FORMULA_JA =
  'architectureHealth = 100 − redundancy×0.2 − fragmentation×0.15 − recursiveInflation×0.2 − orchestrationComplexity×0.15 − latencyPenalty×0.1 − mobilePressure×0.1 − reflectionDensity×0.1';

export const RECURSIVE_INFLATION_FORMULA_JA =
  'recursiveInflation = recursiveDepth × reflectionLoops × arbitrationLoops';

export const MOBILE_PRESSURE_FORMULA_JA =
  'mobilePressure = computeBudgetRatio + memoryPressure + hydrationCost + orchestrationWakeups';

export const REDUNDANCY_FORMULA_JA =
  'redundancy = semanticOverlap + duplicatedGovernance + stalePipelines';

export const ARCHITECTURE_FLOW_JA = [
  'Collect architecture metrics → Detect overlap & fragmentation',
  'Estimate mobile pressure → Generate optimization proposals (sandbox)',
  'Governance validation → Orchestration review → Persist proposals only',
];

export const UNCERTAINTY_DISCLAIMER_JA =
  '構造最適化提案は監査ラベルであり、自動適用・コード変更・将来予測の断定ではありません。';

export const STRUCTURE_STATE_LABELS_JA: Record<ArchitectureStructureState, string> = {
  ARCH_STABLE: '構造安定',
  ARCH_REDUNDANT: '構造冗長',
  ARCH_FRAGMENTED: '構造断片化',
  ARCH_OVEREXPANDED: '構造過拡張',
  ARCH_RECURSIVE_RISK: '再帰リスク',
  ARCH_MOBILE_PRESSURE: 'モバイル負荷',
  ARCH_UNSUPPORTED_STRUCTURE: '未対応構造',
};

export const AUDIT_TARGET_LABELS_JA: Record<ArchitectureAuditTargetId, string> = {
  layerRedundancy: 'Layer Redundancy',
  orchestrationComplexity: 'Orchestration Complexity',
  semanticOverlap: 'Semantic Overlap',
  unusedGovernancePaths: 'Unused Governance Paths',
  staleRecoveryPaths: 'Stale Recovery Paths',
  recursiveDepthInflation: 'Recursive Depth Inflation',
  dashboardBloat: 'Dashboard Bloat',
  memoryFragmentation: 'Memory Fragmentation',
  reflectionLoopDensity: 'Reflection Loop Density',
  orchestrationLatency: 'Orchestration Latency',
  mobileBudgetPressure: 'Mobile Budget Pressure',
  adaptiveConflictDensity: 'Adaptive Conflict Density',
};

export const SELF_ARCHITECTURE_UI_LABELS_JA = {
  panelTitle: 'Self Architecture Dashboard',
  health: 'Architecture Health',
  redundancy: 'Redundancy',
  recursive: 'Recursive Inflation',
  complexity: 'Orchestration Complexity',
  fragmentation: 'Fragmentation',
  mobile: 'Mobile Pressure',
  reflection: 'Reflection Density',
  stale: 'Stale Pipelines',
  proposals: 'Optimization Proposals',
  governance: 'Governance Approval',
  unsupported: 'Unsupported Structure Risk',
  state: 'Structure State',
  orchestration: 'Orchestration Review',
} as const;

export const SELF_ARCHITECTURE_FEATURE_LABELS: Record<SelfArchitectureFeatureId, string> = {
  architecture_metrics_collector: 'Architecture Metrics Collector',
  overlap_detector: 'Overlap Detector',
  fragmentation_detector: 'Fragmentation Detector',
  recursive_inflation_scanner: 'Recursive Inflation Scanner',
  mobile_pressure_estimator: 'Mobile Pressure Estimator',
  optimization_proposal_generator: 'Optimization Proposal Generator',
  governance_validation_gate: 'Governance Validation Gate',
  orchestration_review_handoff: 'Orchestration Review Handoff',
  proposal_only_guard: 'Proposal Only Guard',
  no_auto_refactor_guard: 'No Auto Refactor Guard',
  no_runtime_mutation_guard: 'No Runtime Mutation Guard',
  sandbox_reflective_optimizer: 'Sandbox Reflective Optimizer',
  architecture_timeline: 'Architecture Timeline',
  stale_pipeline_detector: 'Stale Pipeline Detector',
  dashboard_bloat_meter: 'Dashboard Bloat Meter',
  memory_fragmentation_probe: 'Memory Fragmentation Probe',
  reflection_density_meter: 'Reflection Density Meter',
  latency_penalty_tracker: 'Latency Penalty Tracker',
  governance_approval_tracker: 'Governance Approval Tracker',
  unsupported_structure_guard: 'Unsupported Structure Guard',
  mobile_lite_scan: 'Mobile Lite Scan',
  lazy_dashboard_hydration_hint: 'Lazy Dashboard Hydration Hint',
  background_proposal_batch: 'Background Proposal Batch',
  self_architecture_dashboard: 'Self Architecture Dashboard',
  paper_trading_safety: 'Paper Trading Safety',
  structure_audit_only: 'Structure Audit Only',
};
