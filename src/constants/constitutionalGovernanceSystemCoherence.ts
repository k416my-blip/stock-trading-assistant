import type {
  ConstitutionalAuditTargetId,
  ConstitutionalFeatureId,
  ConstitutionalState,
} from '../types/constitutionalGovernanceSystemCoherence';

export const CONSTITUTIONAL_GOVERNANCE_REGULATORY_JA =
  'Constitutional Governance & System Coherence — 中央憲法層（autonomy・self-amendment・layer bypass禁止）。Paper Trading・realTradingEnabled=false。';

export const CONSTITUTIONAL_GOVERNANCE_AI_PROMPT_JA = `
【Constitutional Governance & System Coherence】
- 全レイヤー override/clamp は憲法層経由。governance hierarchy 最優先。human intent override・strategy override禁止。
- hidden authority・recursive governance・self-amendment・unsupported governance禁止。
`.trim();

export const REAL_TRADING_ENABLED = false as const;
export const CONFLICT_PRESSURE_CONFLICT_THRESHOLD = 60;
export const CONFLICT_PRESSURE_COLLISION_THRESHOLD = 75;
export const CONSTITUTIONAL_HEALTH_FRAGMENTED_THRESHOLD = 45;
export const EMERGENCY_PRECEDENCE_EMERGENCY_THRESHOLD = 40;
export const UNSUPPORTED_GOVERNANCE_RISK_THRESHOLD = 70;
export const BUDGET_CONSTITUTIONAL_STABLE = 92;
export const BUDGET_CONSTITUTIONAL_CONFLICT = 84;
export const BUDGET_CONSTITUTIONAL_COLLISION = 72;
export const BUDGET_CONSTITUTIONAL_EMERGENCY = 55;
export const CONSTITUTIONAL_TIMELINE_MAX = 48;

export const CONSTITUTIONAL_HEALTH_FORMULA_JA =
  'constitutionalHealth = (governanceHierarchyIntegrity + systemCoherence + orchestrationConsistency + constitutionalAlignment) / 4';

export const CONFLICT_PRESSURE_FORMULA_JA =
  'conflictPressure = (stateConflictPressure + clampCollisionRisk + contradictionPressure + recursiveGovernanceRisk) / 4';

export const PRECEDENCE_INTEGRITY_FORMULA_JA =
  'precedenceIntegrity = (priorityIntegrity + emergencyPrecedenceIntegrity + overrideSuppression + fallbackConsistency) / 4';

export const SYSTEM_STABILITY_INDEX_FORMULA_JA =
  'systemStabilityIndex = constitutionalHealth − conflictPressure';

export const CONSTITUTIONAL_PRECEDENCE_JA = [
  '1. Human safety',
  '2. Governance integrity',
  '3. Human intent continuity',
  '4. Epistemic integrity',
  '5. Constitutional coherence',
  '6. System stability',
  '7. Adaptive flexibility',
  '8. Strategy optimization',
];

export const CONSTITUTIONAL_FLOW_JA = [
  'Collect layer overrides → Score conflicts & coherence',
  'Arbitrate precedence → Enforce constitutional mode',
  'Persist constitutional snapshot',
];

export const CONSTITUTIONAL_STATE_LABELS_JA: Record<ConstitutionalState, string> = {
  CONSTITUTIONAL_STABLE: '憲法安定',
  CONSTITUTIONAL_CONFLICT: '憲法衝突',
  CONSTITUTIONAL_FRAGMENTED: '憲法断片化',
  CONSTITUTIONAL_COLLISION: 'オーバーライド衝突',
  CONSTITUTIONAL_EMERGENCY: '憲法緊急',
  CONSTITUTIONAL_UNSUPPORTED: '憲法未支持',
};

export const CONSTITUTIONAL_AUDIT_LABELS_JA: Record<ConstitutionalAuditTargetId, string> = {
  governanceHierarchyIntegrity: 'Governance Hierarchy Integrity',
  systemCoherence: 'System Coherence',
  orchestrationConsistency: 'Orchestration Consistency',
  stateConflictPressure: 'State Conflict Pressure',
  clampCollisionRisk: 'Clamp Collision Risk',
  priorityIntegrity: 'Priority Integrity',
  constitutionalAlignment: 'Constitutional Alignment',
  overrideSuppression: 'Override Suppression',
  contradictionPressure: 'Contradiction Pressure',
  recursiveGovernanceRisk: 'Recursive Governance Risk',
  fallbackConsistency: 'Fallback Consistency',
  emergencyPrecedenceIntegrity: 'Emergency Precedence Integrity',
};

export const CONSTITUTIONAL_UI_LABELS_JA = {
  panelTitle: 'Constitutional Governance Dashboard',
  health: 'Constitutional Health',
  coherence: 'System Coherence',
  conflict: 'Conflict Pressure',
  collision: 'Clamp Collision Risk',
  hierarchy: 'Governance Hierarchy Integrity',
  precedence: 'Precedence Integrity',
  contradiction: 'Contradiction Pressure',
  orchestration: 'Orchestration Consistency',
  state: 'Constitutional State',
  stability: 'System Stability Index',
} as const;

export const CONSTITUTIONAL_FEATURE_LABELS: Record<ConstitutionalFeatureId, string> = {
  precedence_tree_cache: 'Precedence Tree Cache',
  conflict_arbitrator: 'Conflict Arbitrator',
  override_registry: 'Override Registry',
  clamp_priority_table: 'Clamp Priority Table',
  hierarchy_enforcer: 'Hierarchy Enforcer',
  coherence_scorer: 'Coherence Scorer',
  precedence_arbitration: 'Precedence Arbitration',
  override_freeze: 'Override Freeze',
  hierarchy_rebuild_hint: 'Hierarchy Rebuild Hint',
  constitutional_emergency: 'Constitutional Emergency',
  fallback_freeze: 'Fallback Freeze',
  downgrade_cascade_audit: 'Downgrade Cascade Audit',
  recursive_governance_detector: 'Recursive Governance Detector',
  no_self_amendment: 'No Self Amendment',
  no_layer_bypass: 'No Layer Bypass',
  constitutional_timeline: 'Constitutional Timeline',
  mobile_lite_arbitration: 'Mobile Lite Arbitration',
  constitutional_dashboard: 'Constitutional Dashboard',
  paper_trading_safety: 'Paper Trading Safety',
};
