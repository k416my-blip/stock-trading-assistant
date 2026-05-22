import type {
  CausalEdgeKind,
  CausalNodeId,
  GraphStructureState,
  StrategicMemoryGraphFeatureId,
} from '../types/strategicMemoryGraphTemporalCausality';

export const STRATEGIC_MEMORY_GRAPH_REGULATORY_JA =
  'Strategic Memory Graph & Temporal Causality — 時系列因果グラフ監査（記憶保存・自己改変ではない）。Paper Trading・realTradingEnabled=false。';

export const STRATEGIC_MEMORY_GRAPH_AI_PROMPT_JA = `
【Strategic Memory Graph & Temporal Causality】
- 過去判断・layer変化を因果グラフとして監査。因果は常に仮説。相関と因果を区別。確定因果・hidden learning禁止。
- unsupported causal inference禁止。hallucination propagation抑制。governance最優先。
`.trim();

export const REAL_TRADING_ENABLED = false as const;
export const GRAPH_HEALTH_FRAGMENTED_THRESHOLD = 70;
export const GRAPH_HEALTH_DRIFTING_THRESHOLD = 55;
export const UNSUPPORTED_CAUSALITY_THRESHOLD = 60;
export const CONTRADICTION_CRITICAL_THRESHOLD = 65;
export const RECURSIVE_LOOPS_THRESHOLD = 75;
export const BUDGET_GRAPH_STABLE = 88;
export const BUDGET_GRAPH_FRAGMENTED = 76;
export const BUDGET_GRAPH_DRIFTING = 66;
export const BUDGET_GRAPH_RISK = 56;
export const GRAPH_TIMELINE_MAX = 48;
export const CAUSAL_EDGE_MAX = 32;

export const GRAPH_HEALTH_FORMULA_JA =
  'graphHealth = 100 − fragmentation×0.2 − contradiction×0.2 − unsupportedCausality×0.15 − temporalDrift×0.15 − hallucinationPropagation×0.15 − recursiveLoops×0.15';

export const CAUSAL_CONFIDENCE_FORMULA_JA =
  'causalConfidence = eventCorrelation × temporalConsistency × repetitionStrength × crossLayerAgreement';

export const MEMORY_INTEGRITY_FORMULA_JA =
  'memoryIntegrity = snapshotPersistence + timelineContinuity + governanceConsistency − contradictionPenalty';

export const HALLUCINATION_PROPAGATION_FORMULA_JA =
  'hallucinationPropagationRisk = recursiveNarrativeLoops + unsupportedCausality + confidenceEcho + staleBeliefChains';

export const GRAPH_FLOW_JA = [
  'Capture event snapshots → Temporal ordering → Causal edge estimation (hypothesis)',
  'Contradiction detection → Unsupported causality suppression → Governance validation',
  'Persist graph snapshots',
];

export const UNCERTAINTY_DISCLAIMER_JA =
  '因果エッジは推定仮説であり、確定因果・未来予測の断定ではありません。相関（correlatedWith）と因果（causedBy仮説）を区別してください。';

export const GRAPH_STATE_LABELS_JA: Record<GraphStructureState, string> = {
  GRAPH_STABLE: 'グラフ安定',
  GRAPH_FRAGMENTED: 'グラフ断片化',
  GRAPH_OVERCONNECTED: '過接続',
  GRAPH_TEMPORALLY_DRIFTING: '時間漂移',
  GRAPH_CONTRADICTED: '矛盾グラフ',
  GRAPH_CAUSALITY_UNCERTAIN: '因果不確実',
};

export const CAUSAL_NODE_LABELS_JA: Record<CausalNodeId, string> = {
  governanceActions: 'Governance Actions',
  recoveryEvents: 'Recovery Events',
  regimeTransitions: 'Regime Transitions',
  confidenceChanges: 'Confidence Changes',
  hallucinationEvents: 'Hallucination Events',
  consensusConflicts: 'Consensus Conflicts',
  contradictionBursts: 'Contradiction Bursts',
  freezeEscalations: 'Freeze Escalations',
  rollbackEvents: 'Rollback Events',
  macroStateChanges: 'Macro State Changes',
  riskStateChanges: 'Risk State Changes',
  stabilityBreaks: 'Stability Breaks',
  orchestrationDecisions: 'Orchestration Decisions',
  userBehaviorPatterns: 'User Behavior Patterns',
};

export const CAUSAL_EDGE_LABELS_JA: Record<CausalEdgeKind, string> = {
  causedBy: 'causedBy（仮説）',
  correlatedWith: 'correlatedWith',
  precededBy: 'precededBy',
  stabilizedBy: 'stabilizedBy',
  degradedBy: 'degradedBy',
  contradictedBy: 'contradictedBy',
  recoveredBy: 'recoveredBy',
  suppressedBy: 'suppressedBy',
  escalatedBy: 'escalatedBy',
};

export const STRATEGIC_MEMORY_UI_LABELS_JA = {
  panelTitle: 'Strategic Memory Graph Dashboard',
  health: 'Graph Health',
  causal: 'Causal Confidence',
  continuity: 'Timeline Continuity',
  contradiction: 'Contradiction Density',
  recursive: 'Recursive Loop Risk',
  propagation: 'Hallucination Propagation',
  integrity: 'Memory Integrity',
  unsupported: 'Unsupported Causality',
  density: 'Edge Density',
  drift: 'Causal Drift',
  fragmentation: 'Temporal Fragmentation',
  state: 'Graph State',
} as const;

export const STRATEGIC_MEMORY_FEATURE_LABELS: Record<StrategicMemoryGraphFeatureId, string> = {
  event_snapshot_collector: 'Event Snapshot Collector',
  temporal_ordering: 'Temporal Ordering',
  causal_edge_estimator: 'Causal Edge Estimator',
  contradiction_detector: 'Contradiction Detector',
  confidence_decay_tracker: 'Confidence Decay Tracker',
  unsupported_causality_suppressor: 'Unsupported Causality Suppressor',
  governance_validation_gate: 'Governance Validation Gate',
  graph_timeline: 'Graph Timeline',
  correlation_causation_separator: 'Correlation Causation Separator',
  hallucination_propagation_guard: 'Hallucination Propagation Guard',
  recursive_loop_pruner: 'Recursive Loop Pruner',
  timeline_rebuild: 'Timeline Rebuild',
  memory_simplification: 'Memory Simplification',
  causal_freeze: 'Causal Freeze',
  consensus_rebuild_request: 'Consensus Rebuild Request',
  mobile_lite_traversal: 'Mobile Lite Traversal',
  compressed_temporal_edges: 'Compressed Temporal Edges',
  deferred_causal_reconstruction: 'Deferred Causal Reconstruction',
  background_graph_pruning: 'Background Graph Pruning',
  strategic_memory_dashboard: 'Strategic Memory Dashboard',
  paper_trading_safety: 'Paper Trading Safety',
  no_hidden_learning: 'No Hidden Learning',
  hypothesis_only_causality: 'Hypothesis Only Causality',
};
