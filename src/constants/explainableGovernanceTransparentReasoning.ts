import type {
  ExplainableAuditTargetId,
  ExplainableFeatureId,
  ExplainableState,
} from '../types/explainableGovernanceTransparentReasoning';

export const EXPLAINABLE_GOVERNANCE_REGULATORY_JA =
  'Explainable Governance & Transparent Reasoning — 安全な監査説明のみ（Chain-of-Thought・内部推論開示禁止）。Paper Trading・realTradingEnabled=false。';

export const EXPLAINABLE_GOVERNANCE_AI_PROMPT_JA = `
【Explainable Governance & Transparent Reasoning】
- 内部推論・CoT・hidden prompt/governance は開示禁止。safe summary・layer explanation・governance reason のみ。
- unsupported・persuasion・fabricated rationale 禁止。downgrade/freeze/override は監査可能な理由のみ添付。
`.trim();

export const REAL_TRADING_ENABLED = false as const;
export const TRANSPARENCY_PARTIAL_THRESHOLD = 70;
export const TRANSPARENCY_OPAQUE_THRESHOLD = 55;
export const EXPLANATION_RISK_THRESHOLD = 65;
export const UNSUPPORTED_EXPLANATION_RISK_THRESHOLD = 75;
export const EXPLANATION_CONSISTENCY_CONTRADICTED_THRESHOLD = 45;
export const BUDGET_EXPLAINABLE_OK = 94;
export const BUDGET_EXPLAINABLE_PARTIAL = 86;
export const BUDGET_EXPLAINABLE_OPAQUE = 76;
export const BUDGET_EXPLAINABLE_RISK = 62;
export const EXPLAINABLE_TIMELINE_MAX = 48;

export const EXPLAINABILITY_HEALTH_FORMULA_JA =
  'explainabilityHealth = (governanceExplainability + reasoningTransparency + decisionTraceability + constitutionalAuditability) / 4';

export const SAFE_EXPLANATION_INTEGRITY_FORMULA_JA =
  'safeExplanationIntegrity = (safeSummaryIntegrity + uncertaintyDisclosureIntegrity + explanationConsistency + overrideAccountability) / 4';

export const EXPLANATION_RISK_FORMULA_JA =
  'explanationRisk = (hallucinatedExplanationRisk + unsupportedExplanationRisk) / 2';

export const TRANSPARENCY_SCORE_FORMULA_JA =
  'transparencyScore = explainabilityHealth + safeExplanationIntegrity − explanationRisk';

export const FORBIDDEN_EXPLANATION_PHRASES = [
  'I secretly think',
  'my hidden reasoning',
  'internal prompt says',
  'real reason is',
  'I actually believe',
  'hidden chain-of-thought',
  '秘密に思う',
  '隠れた推論',
  '内部プロンプト',
  '本当の理由は',
  '実際には信じ',
] as const;

export const SAFE_EXPLANATION_TEMPLATES_JA = {
  confidenceReduced: 'confidence was reduced due to insufficient evidence',
  predictionDepthLimited: 'prediction depth was limited by governance policy',
  resourceSpeculativeReduced: 'resource economy reduced speculative processing',
  constitutionalOverridePrevented: 'constitutional governance prevented override',
  humanIntentClarification: 'human intent continuity requested clarification-safe mode',
  epistemicUnsupported: 'epistemic integrity detected unsupported inference',
} as const;

export const EXPLAINABLE_FLOW_JA = [
  'Collect layer governance signals → Build safe rationales only',
  'Score transparency & explanation risk → Apply safe explanation mode',
  'Persist explainable snapshot (no raw reasoning)',
];

export const EXPLAINABLE_STATE_LABELS_JA: Record<ExplainableState, string> = {
  EXPLAINABLE_OK: '説明可能',
  EXPLAINABLE_PARTIAL: '説明部分',
  EXPLAINABLE_OPAQUE: '説明不透明',
  EXPLAINABLE_CONTRADICTED: '説明矛盾',
  EXPLAINABLE_UNSUPPORTED: '説明未支持',
  EXPLAINABLE_RISK: '説明リスク',
};

export const EXPLAINABLE_AUDIT_LABELS_JA: Record<ExplainableAuditTargetId, string> = {
  governanceExplainability: 'Governance Explainability',
  reasoningTransparency: 'Reasoning Transparency',
  decisionTraceability: 'Decision Traceability',
  downgradeExplainability: 'Downgrade Explainability',
  freezeExplainability: 'Freeze Explainability',
  overrideAccountability: 'Override Accountability',
  constitutionalAuditability: 'Constitutional Auditability',
  uncertaintyDisclosureIntegrity: 'Uncertainty Disclosure Integrity',
  safeSummaryIntegrity: 'Safe Summary Integrity',
  hallucinatedExplanationRisk: 'Hallucinated Explanation Risk',
  unsupportedExplanationRisk: 'Unsupported Explanation Risk',
  explanationConsistency: 'Explanation Consistency',
};

export const EXPLAINABLE_UI_LABELS_JA = {
  panelTitle: 'Explainable Governance Dashboard',
  health: 'Explainability Health',
  transparency: 'Transparency Score',
  consistency: 'Explanation Consistency',
  risk: 'Explanation Risk',
  state: 'Explanation State',
  downgrade: 'Downgrade Reasons',
  freeze: 'Freeze Reasons',
  orchestration: 'Orchestration Rationale',
  override: 'Override Accountability',
  uncertainty: 'Uncertainty Disclosure',
} as const;

export const EXPLAINABLE_FEATURE_LABELS: Record<ExplainableFeatureId, string> = {
  safe_summary_cache: 'Safe Summary Cache',
  rationale_generator: 'Rationale Generator',
  downgrade_reason_attacher: 'Downgrade Reason Attacher',
  freeze_reason_attacher: 'Freeze Reason Attacher',
  orchestration_summary: 'Orchestration Summary',
  override_accountability: 'Override Accountability',
  uncertainty_disclosure: 'Uncertainty Disclosure',
  constitutional_precedence_explain: 'Constitutional Precedence Explain',
  no_raw_cot: 'No Raw CoT',
  no_hidden_reasoning: 'No Hidden Reasoning',
  no_latent_exposure: 'No Latent Exposure',
  explanation_suppression: 'Explanation Suppression',
  fallback_explanation: 'Fallback Explanation',
  consistency_rebuild: 'Consistency Rebuild',
  minimal_governance_summary: 'Minimal Governance Summary',
  explainable_timeline: 'Explainable Timeline',
  mobile_lite_rationale: 'Mobile Lite Rationale',
  explainable_dashboard: 'Explainable Dashboard',
  paper_trading_safety: 'Paper Trading Safety',
};
