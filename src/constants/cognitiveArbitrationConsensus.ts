import type {
  ArbitrationFeatureId,
  ArbitrationParticipantId,
  ConsensusState,
} from '../types/cognitiveArbitrationConsensus';

export const CONSENSUS_REGULATORY_JA =
  'Cognitive Arbitration & Consensus — 分散layerの安全合議（中央支配AIではない）。Paper Trading・realTradingEnabled=false。';

export const CONSENSUS_AI_PROMPT_JA = `
【Cognitive Arbitration & Consensus】
- 複数layerの合議制。断定・未来予言禁止。uncertainty を必ず残す。
- GOVERNANCE_OVERRIDE / PANIC_CONSENSUS 時は safety 優先。HARD_CONFLICT は watch/hold。
- governance override 最優先。systemic emergency を bypass しない。
`.trim();

export const REAL_TRADING_ENABLED = false as const;
export const CONTRADICTION_HARD_THRESHOLD = 70;
export const PANIC_RISK_CONSENSUS_THRESHOLD = 70;
export const GOVERNANCE_STRESS_OVERRIDE_THRESHOLD = 80;
export const UNCERTAINTY_UNSUPPORTED_THRESHOLD = 75;
export const BUDGET_CONSENSUS_OK = 95;
export const BUDGET_SOFT_CONFLICT = 85;
export const BUDGET_HARD_CONFLICT = 65;
export const BUDGET_PANIC_CONSENSUS = 55;
export const CONSENSUS_TIMELINE_MAX = 48;
export const ARBITRATION_DEBOUNCE_MS = 800;

export const FINAL_CONSENSUS_FORMULA_JA =
  'finalConsensus = Σ(layerConfidence × layerPriority × semanticAlignment) ÷ totalWeight';

export const CONTRADICTION_FORMULA_JA =
  'contradictionRisk = semanticConflict + recommendationDivergence + confidenceSpread + rollbackInstability';

export const CONSENSUS_HEALTH_FORMULA_JA =
  'consensusHealth = stability×0.25 + governance×0.25 + orchestration×0.2 + recovery×0.15 + semanticIntegrity×0.15';

export const CONSENSUS_FLOW_JA = [
  'Collect layer outputs → Contradiction mapping → Semantic alignment',
  'Weighted consensus → Governance validation → Downgrade if unstable',
  'Orchestration handoff → Dashboard persist',
];

export const UNCERTAINTY_DISCLAIMER_JA =
  '合議結果は現在の観測に基づく内部整合ラベルです。将来の相場・価格を断定・予測するものではありません。';

export const CONSENSUS_STATE_LABELS_JA: Record<ConsensusState, string> = {
  CONSENSUS_OK: '合議一致',
  SOFT_CONFLICT: '軟衝突（安定スナップショット維持）',
  HARD_CONFLICT: '硬衝突（watch/hold）',
  GOVERNANCE_OVERRIDE: 'ガバナンス優先',
  PANIC_CONSENSUS: 'パニック簡略合議',
  UNSUPPORTED_STATE: '未対応状態（説明のみ）',
};

export const PARTICIPANT_PRIORITY: Record<ArbitrationParticipantId, number> = {
  governance: 10,
  stability: 9,
  recovery: 8,
  regime: 7,
  risk: 6,
  macro: 5,
  memory: 4,
  reflection: 3,
  orchestration: 2,
};

export const PARTICIPANT_LABELS_JA: Record<ArbitrationParticipantId, string> = {
  governance: 'Governance',
  stability: 'Stability',
  recovery: 'Recovery',
  regime: 'Regime',
  risk: 'Risk',
  macro: 'Macro',
  memory: 'Memory',
  reflection: 'Reflection',
  orchestration: 'Orchestration',
};

export const CONSENSUS_UI_LABELS_JA = {
  panelTitle: 'Cognitive Consensus Dashboard',
  state: 'Consensus State',
  contradiction: 'Contradiction Risk',
  alignment: 'Semantic Alignment',
  governance: 'Governance Override',
  participants: 'Active Participants',
  suppressed: 'Suppressed Layers',
  health: 'Consensus Health',
  uncertainty: 'Uncertainty',
  orchestration: 'Orchestration Impact',
  latency: 'Arbitration Latency',
  downgrade: 'Downgrade Reason',
  panic: 'Panic Interaction',
} as const;

export const ARBITRATION_FEATURE_LABELS: Record<ArbitrationFeatureId, string> = {
  layer_output_collector: 'Layer Output Collector',
  contradiction_mapper: 'Contradiction Mapper',
  semantic_alignment_scorer: 'Semantic Alignment Scorer',
  weighted_consensus_engine: 'Weighted Consensus Engine',
  governance_validator: 'Governance Validator',
  unstable_downgrade_gate: 'Unstable Downgrade Gate',
  orchestration_handoff: 'Orchestration Handoff',
  consensus_timeline: 'Consensus Timeline',
  panic_simplified_consensus: 'Panic Simplified Consensus',
  hard_conflict_resolver: 'Hard Conflict Resolver',
  soft_conflict_retainer: 'Soft Conflict Retainer',
  governance_override_guard: 'Governance Override Guard',
  unsupported_explanation_mode: 'Unsupported Explanation Mode',
  freeze_signal_clamp: 'Freeze Signal Clamp',
  recommendation_divergence_scan: 'Recommendation Divergence Scan',
  confidence_spread_analyzer: 'Confidence Spread Analyzer',
  rollback_instability_detector: 'Rollback Instability Detector',
  macro_agreement_checker: 'Macro Agreement Checker',
  semantic_integrity_meter: 'Semantic Integrity Meter',
  mobile_arbitration_debounce: 'Mobile Arbitration Debounce',
  stale_consensus_retain: 'Stale Consensus Retain',
  background_lightweight_mode: 'Background Lightweight Mode',
  cognitive_consensus_dashboard: 'Cognitive Consensus Dashboard',
  paper_trading_safety: 'Paper Trading Safety',
  no_central_ai_dictator: 'No Central AI Dictator',
  uncertainty_preservation: 'Uncertainty Preservation',
  participant_priority_queue: 'Participant Priority Queue',
  orchestration_budget_adapter: 'Orchestration Budget Adapter',
  downgrade_reason_tracker: 'Downgrade Reason Tracker',
};
