import type {
  HumanIntentFeatureId,
  IntentAlignmentState,
  IntentAuditTargetId,
} from '../types/humanIntentContinuityAlignmentPreservation';

export const HUMAN_INTENT_CONTINUITY_REGULATORY_JA =
  'Human Intent Continuity & Alignment Preservation — ユーザー意図整合監査（人格形成・目標生成ではない）。Paper Trading・realTradingEnabled=false。';

export const HUMAN_INTENT_CONTINUITY_AI_PROMPT_JA = `
【Human Intent Continuity & Alignment Preservation】
- ユーザー意図との整合を監査。明示指示最優先。勝手に解釈・目標拡張・hidden agenda禁止。
- persuasion・emotion steering・manipulation・autonomous goal creation禁止。governance最優先。
`.trim();

export const REAL_TRADING_ENABLED = false as const;
export const INTENT_HEALTH_DRIFTING_THRESHOLD = 70;
export const INTENT_HEALTH_FRAGMENTED_THRESHOLD = 55;
export const ALIGNMENT_INTEGRITY_UNCERTAIN_THRESHOLD = 50;
export const REINTERPRETATION_PRESSURE_THRESHOLD = 60;
export const UNSUPPORTED_INTENT_INFERENCE_THRESHOLD = 70;
export const BUDGET_INTENT_ALIGNED = 91;
export const BUDGET_INTENT_DRIFTING = 79;
export const BUDGET_INTENT_FRAGMENTED = 67;
export const BUDGET_INTENT_RISK = 53;
export const INTENT_TIMELINE_MAX = 48;

export const INTENT_HEALTH_FORMULA_JA =
  'intentHealth = (instructionContinuity + semanticConsistency + goalIntegrity + contextIntegrity + intentCoherence + governanceAlignment) / 6';

export const INTENT_DRIFT_FORMULA_JA =
  'intentDrift = conversationDrift + reinterpretationPressure + contextCorruption + orchestrationDeviation';

export const ALIGNMENT_INTEGRITY_FORMULA_JA =
  'alignmentIntegrity = (directivePreservation + memoryAlignment + strategyAlignment + explanationConsistency) / 4';

export const SAFE_ALIGNMENT_FORMULA_JA = 'safeAlignment = intentHealth − intentDrift';

export const ALIGNMENT_FLOW_JA = [
  'Collect layer states → Normalize integrity → Calculate alignment',
  'Detect drift & reinterpretation → Determine safe alignment & orchestration mode',
  'Persist intent snapshot',
];

export const ALIGNMENT_STATE_LABELS_JA: Record<IntentAlignmentState, string> = {
  INTENT_ALIGNED: '意図整合',
  INTENT_DRIFTING: '意図漂移',
  INTENT_FRAGMENTED: '意図断片化',
  INTENT_REINTERPRETING: '意図再解釈',
  INTENT_UNCERTAIN: '意図不確実',
  INTENT_UNSUPPORTED: '意図未支持',
};

export const INTENT_AUDIT_LABELS_JA: Record<IntentAuditTargetId, string> = {
  instructionContinuity: 'Instruction Continuity',
  semanticConsistency: 'Semantic Consistency',
  goalIntegrity: 'Goal Integrity',
  contextIntegrity: 'Context Integrity',
  intentCoherence: 'Intent Coherence',
  memoryAlignment: 'Memory Alignment',
  directivePreservation: 'Directive Preservation',
  conversationDrift: 'Conversation Drift',
  strategyAlignment: 'Strategy Alignment',
  governanceAlignment: 'Governance Alignment',
  userPriorityIntegrity: 'User Priority Integrity',
  predictionAlignment: 'Prediction Alignment',
  explanationConsistency: 'Explanation Consistency',
  orchestrationAlignment: 'Orchestration Alignment',
};

export const HUMAN_INTENT_UI_LABELS_JA = {
  panelTitle: 'Human Intent Continuity Dashboard',
  health: 'Intent Health',
  integrity: 'Alignment Integrity',
  reinterpretation: 'Reinterpretation Pressure',
  semantic: 'Semantic Continuity',
  strategy: 'Strategy Alignment',
  context: 'Context Integrity',
  instruction: 'Instruction Continuity',
  deviation: 'Orchestration Deviation',
  unsupported: 'Unsupported Inference Risk',
  state: 'Alignment State',
  safe: 'Safe Alignment',
} as const;

export const HUMAN_INTENT_FEATURE_LABELS: Record<HumanIntentFeatureId, string> = {
  alignment_collector: 'Alignment Collector',
  semantic_continuity_checker: 'Semantic Continuity Checker',
  goal_integrity_guard: 'Goal Integrity Guard',
  context_integrity_probe: 'Context Integrity Probe',
  reinterpretation_suppressor: 'Reinterpretation Suppressor',
  instruction_reinforcer: 'Instruction Reinforcer',
  context_rebuild: 'Context Rebuild',
  clarification_downgrade: 'Clarification Downgrade',
  explanation_only_fallback: 'Explanation Only Fallback',
  semantic_freeze: 'Semantic Freeze',
  orchestration_deviation_clamp: 'Orchestration Deviation Clamp',
  intent_timeline: 'Intent Timeline',
  no_hidden_agenda: 'No Hidden Agenda',
  no_goal_mutation: 'No Goal Mutation',
  no_persuasion_optimization: 'No Persuasion Optimization',
  mobile_lite_alignment: 'Mobile Lite Alignment',
  cached_intent_snapshots: 'Cached Intent Snapshots',
  human_intent_dashboard: 'Human Intent Dashboard',
  paper_trading_safety: 'Paper Trading Safety',
};
