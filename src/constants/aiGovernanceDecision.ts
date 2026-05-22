import type { GovernanceLayerId } from '../types/aiGovernanceDecision';

export const GOVERNANCE_REGULATORY_JA =
  'ガバナンスレイヤー — 複数 Intelligence の矛盾を階層で解消し、最終決定を一貫化します。実注文は送信しません。';

export const GOVERNANCE_AI_PROMPT_JA = `
【AI Governance & Decision Hierarchy】
- finalDecision / vetoLayer / consensusScore / contradiction を最優先で説明。
- 下位レイヤー（Capital・Strategy）が上位（Stability・Risk・Data）に拒否された場合は downgrade を明示。
- 緊急時は risk/stability 最優先。推測で strong buy にしない。
`.trim();

export const GOVERNANCE_UI_LABELS_JA = {
  panelTitle: 'AI Governance Panel',
  finalDecision: '最終決定',
  veto: 'Veto Layer',
  consensus: 'Consensus Score',
  contradiction: 'Contradiction',
  hierarchy: 'Active Hierarchy',
  blocked: 'Blocked Decisions',
  summary: '統合サマリー',
  tree: 'Decision Tree',
  audit: 'Audit Trail',
} as const;

/** 決定権 hierarchy（rank 1 = 最高） */
export const DECISION_HIERARCHY: Array<{ rank: number; id: GovernanceLayerId; labelJa: string }> = [
  { rank: 1, id: 'system_stability', labelJa: 'System Stability' },
  { rank: 2, id: 'portfolio_risk', labelJa: 'Portfolio Risk' },
  { rank: 3, id: 'data_reliability', labelJa: 'Data Reliability' },
  { rank: 4, id: 'macro', labelJa: 'Macro Intelligence' },
  { rank: 5, id: 'execution', labelJa: 'Execution Intelligence' },
  { rank: 6, id: 'capital_allocation', labelJa: 'Capital Allocation' },
  { rank: 7, id: 'ai_recommendation', labelJa: 'AI Recommendation' },
];

/** hierarchy 重み（合計 1.0） */
export const HIERARCHY_WEIGHT_BY_ID: Record<GovernanceLayerId, number> = {
  system_stability: 0.22,
  portfolio_risk: 0.2,
  data_reliability: 0.18,
  macro: 0.14,
  execution: 0.12,
  capital_allocation: 0.09,
  ai_recommendation: 0.05,
};

export const CONSENSUS_FORMULA_JA =
  'consensus = clamp(50 + 35 × Σ(stanceValue × hierarchyWeight × healthWeight) / Σ(hierarchyWeight × healthWeight))；stance: bullish=+1, neutral=0, bearish=-1, block=-1.5';

export const CONTRADICTION_FORMULA_JA =
  'contradiction = 上位(1-3)と下位(5-7)が逆方向 かつ bullish層≥1 かつ bearish/block層≥1 かつ |bullW-bearW| < 0.35×totalW';

export const DOWNGRADE_CONDITIONS_JA = [
  'contradictionDetected かつ final=buy → watch',
  'veto 発動 かつ 下位が buy → watch または hold',
  'data gate 閉鎖 かつ strategy buy → watch',
  'emergencyOverride かつ buy/reduce → hold または avoid',
  'confidence < 55 かつ buy → watch',
];

export const DECISION_FLOW_STEPS_JA = [
  '各 Intelligence bundle → LayerDecisionSignal 抽出',
  'healthWeight・stale isolation → 加重',
  'Conflict Resolver + Veto Engine（上位が下位を拒否）',
  'Consensus + Contradiction → Arbitration → finalDecision',
  'Downgrade + Audit Trail 永続化 → UI / AI context',
];

export const VETO_FLOW_STEPS_JA = [
  'rank 1→7 の順に active 層を評価',
  '上位が block/bearish かつ下位が bullish → veto 記録',
  'blockedDecisions に下位の元判断を列挙',
  'Arbitration が finalDecision を再計算',
];

export const GOVERNANCE_FEATURE_LABELS: Record<
  import('../types/aiGovernanceDecision').GovernanceFeatureId,
  string
> = {
  decision_hierarchy_engine: 'Decision Hierarchy Engine',
  ai_conflict_resolver: 'AI Conflict Resolver',
  veto_engine: 'Veto Engine',
  confidence_aggregator: 'Confidence Aggregator',
  consensus_score: 'Consensus Score',
  contradiction_detector: 'Contradiction Detector',
  emergency_override: 'Emergency Override',
  ai_arbitration_engine: 'AI Arbitration Engine',
  explainable_decision_tree: 'Explainable Decision Tree',
  human_override_layer: 'Human Override Layer',
  recommendation_downgrade: 'Recommendation Downgrade',
  layer_health_weight: 'Layer Health Weight',
  stale_layer_isolation: 'Stale Layer Isolation',
  recursive_decision_guard: 'Recursive Decision Guard',
  decision_cooldown: 'Decision Cooldown',
  strategy_consistency_checker: 'Strategy Consistency Checker',
  exposure_consensus_guard: 'Exposure Consensus Guard',
  global_risk_consensus: 'Global Risk Consensus',
  unified_ai_summary: 'Unified AI Summary',
  decision_audit_trail: 'Decision Audit Trail',
};

export const DECISION_COOLDOWN_MS = 5 * 60 * 1000;
export const STALE_LAYER_MS = 30 * 60 * 1000;
