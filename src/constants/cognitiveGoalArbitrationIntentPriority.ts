import type { ArbitrationFeatureId, ArbitrationGoalId } from '../types/cognitiveGoalArbitrationIntentPriority';

export const ARBITRATION_REGULATORY_JA =
  'Cognitive Goal Arbitration & Intent Priority — 複数 layer 間の目的衝突を調停し最終優先順位を決定します。Paper Trading のみ・realTradingEnabled=false・priority arbitration 専用・新規売買禁止。';

export const ARBITRATION_AI_PROMPT_JA = `
【Cognitive Goal Arbitration & Intent Priority】
- governance が最上位 authority。semantic freeze / temporal rollback / reliability safe mode を尊重。
- 新規 buy/sell は出さない。downgrade/freeze/hold/watch のみ。emergency 時は watch/hold only。
`.trim();

export const ARBITRATION_UI_LABELS_JA = {
  panelTitle: 'Arbitration Dashboard',
  health: 'Arbitration Health',
  goals: 'Active Goals',
  priority: 'Priority Order',
  conflicts: 'Arbitration Conflicts',
  override: 'Override Reason',
  freeze: 'Freeze Source',
  downgrade: 'Downgrade Reason',
  governance: 'Governance Authority',
  semanticVeto: 'Semantic Veto',
  reliability: 'Reliability Override',
  stack: 'Goal Stack',
  timeline: 'Arbitration Timeline',
  safeMode: 'Emergency Safe Mode',
} as const;

export const REAL_TRADING_ENABLED = false as const;
export const RELIABILITY_SAFE_MODE_THRESHOLD = 40;
export const CONFIDENCE_PRIORITY_CLAMP = 35;
export const ARBITRATION_TIMELINE_MAX = 48;
export const GOVERNANCE_SUPREME_RANK = 1;
export const SAFETY_FIRST_RANK = 0;

export const PRIORITY_FORMULA_JA =
  'priorityScore = (100 − rank×8) + layerBoost − conflictPenalty；rank 0=safety, 1=governance';

export const OVERRIDE_HIERARCHY_JA = [
  '0. Safety-first override',
  '1. Governance supreme authority',
  '2. Replay integrity freeze',
  '3. Semantic freeze (buy forbidden)',
  '4. Temporal rollback (downgrade required)',
  '5. Reliability safe mode (health<40)',
  '6. Resource emergency',
  '7. Reactive emergency',
  '8. Unsupported claim veto',
  '9. Contradiction arbitration',
];

export const GOVERNANCE_PRIORITY_FORMULA_JA =
  'if governance.vetoLayer → winner=governance；reactive は常に governance より下位';

export const SEMANTIC_VETO_FLOW_JA = [
  'semanticFreeze → buy blocked → watch/hold only',
  'unsupported claims → veto narrative + confidence clamp',
];

export const ROLLBACK_ARBITRATION_FLOW_JA = [
  'temporal.rollbackApplied → mandatory downgrade buy→watch reduce→hold',
  'governance narrative sync with rollback reason',
];

export const CONFLICT_RESOLVER_FORMULA_JA =
  'winner = min(rank) among conflicting goals；governance vs reactive → governance';

export const DEADLOCK_RESOLVER_FORMULA_JA =
  'deadlock = conflicting winners with equal rank → safe mode + hold';

export const DOWNGRADE_FLOW_JA = [
  'intent_downgrade: buy→watch, reduce→hold only',
  'no new sell/buy ideas generated',
];

export const EMERGENCY_SAFE_MODE_FLOW_JA = [
  'safe mode when: reliability health<40 OR replay corrupt OR emergency freeze',
  'allowed actions: watch, hold only',
];

export const ARBITRATION_FLOW_STEPS_JA = [
  'Collect layer intents → Global priority engine',
  'Goal arbitration matrix + conflict resolver',
  'Apply override hierarchy → Intent downgrade / freeze',
  'Consensus arbitration → Arbitration health + timeline',
];

export const GOAL_BASE_RANK: Record<ArbitrationGoalId, number> = {
  safety: 0,
  governance: 1,
  replay: 2,
  semantic: 3,
  temporal: 4,
  reliability: 5,
  resource: 6,
  reactive: 7,
  performance: 8,
  consensus: 9,
};

export const ARBITRATION_FEATURE_LABELS: Record<ArbitrationFeatureId, string> = {
  global_intent_priority_engine: 'Global Intent Priority Engine',
  goal_arbitration_matrix: 'Goal Arbitration Matrix',
  safety_first_override: 'Safety-first Override',
  governance_supreme_authority: 'Governance Supreme Authority',
  semantic_freeze_priority: 'Semantic Freeze Priority',
  temporal_rollback_priority: 'Temporal Rollback Priority',
  reliability_override: 'Reliability Override',
  resource_emergency_priority: 'Resource Emergency Priority',
  replay_integrity_priority: 'Replay Integrity Priority',
  contradiction_arbitration: 'Contradiction Arbitration',
  unsupported_claim_suppression: 'Unsupported Claim Suppression',
  confidence_priority_clamp: 'Confidence Priority Clamp',
  reactive_emergency_arbitration: 'Reactive Emergency Arbitration',
  multi_layer_conflict_resolver: 'Multi-layer Conflict Resolver',
  governance_vs_reactive_resolver: 'Governance vs Reactive Resolver',
  temporal_vs_semantic_resolver: 'Temporal vs Semantic Resolver',
  reliability_vs_performance_resolver: 'Reliability vs Performance Resolver',
  consensus_arbitration: 'Consensus Arbitration',
  intent_downgrade_engine: 'Intent Downgrade Engine',
  emergency_intent_freeze: 'Emergency Intent Freeze',
  ai_goal_stack: 'AI Goal Stack',
  priority_escalation_engine: 'Priority Escalation Engine',
  decision_deadlock_detector: 'Decision Deadlock Detector',
  arbitration_replay_timeline: 'Arbitration Replay Timeline',
  priority_drift_detector: 'Priority Drift Detector',
  explainability_priority_narrator: 'Explainability Priority Narrator',
  goal_isolation_guard: 'Goal Isolation Guard',
  arbitration_health_score: 'Arbitration Health Score',
  arbitration_dashboard: 'Arbitration Dashboard',
  emergency_safe_mode: 'Emergency Safe Mode',
};
