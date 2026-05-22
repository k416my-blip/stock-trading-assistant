import type { TraceFeatureId, TraceLayerId } from '../types/explainableCognitiveTrace';

export const TRACE_REGULATORY_JA =
  'Explainable Cognitive Trace — 全AI判断の因果・順序・影響を記録します。Paper Trading のみ・実注文なし・reasoning trace 専用。';

export const TRACE_AI_PROMPT_JA = `
【Explainable Cognitive Trace】
- reasoningChain / causalChain / veto / downgrade / contradiction を時系列で説明。
- 数値は governance・stability のスコアを引用。推測で新しい売買理由を作らない。
`.trim();

export const TRACE_UI_LABELS_JA = {
  panelTitle: 'Explainability Dashboard',
  finalDecision: '最終決定',
  reasoning: 'Reasoning Chain',
  influence: 'Influence Graph',
  veto: 'Veto',
  downgrade: 'Downgrade',
  contradiction: 'Contradiction',
  confidence: 'Confidence Evolution',
  freshness: 'Evidence Freshness',
  drift: 'Strategy Drift',
  replay: 'Replay Timeline',
  health: 'Explainability Health',
} as const;

export const EXPLAINABLE_SCORE_FORMULA_JA =
  '100 − (governance欠落20) − (因果3未満15) − (証拠不足10) − (鮮度問題10) − (reason loop15) − (trace欠損8)';

export const CONFIDENCE_EVOLUTION_FORMULA_JA =
  '各 layer の confidencePct を時系列で保存；Δ = current − previous（同一 layerId）';

export const CONTRADICTION_TRACE_FORMULA_JA =
  'governance.contradictionDetected → timeline 追記；contradictionDetail + veto/downgrade で解消経路を記録';

export const REASONING_FLOW_STEPS_JA = [
  '各 Intelligence layer → Timeline step（順序・影響）',
  'Governance hierarchy → Influence graph + Consensus breakdown',
  'Veto / Conflict / Downgrade → 因果チェーンに連結',
  'Market + State snapshot → 判断時コンテキスト固定',
  'Explainable summary + Self reflection → Dashboard / AI context',
];

export const CAUSAL_GRAPH_EDGES: Array<{ from: TraceLayerId; to: TraceLayerId; noteJa: string }> = [
  { from: 'system_stability', to: 'portfolio_risk', noteJa: '健全性がリスク許容を制限' },
  { from: 'portfolio_risk', to: 'data_reliability', noteJa: 'エクスポーザがデータ要求を変化' },
  { from: 'data_reliability', to: 'macro', noteJa: 'ゲートがマクロ解釈を制約' },
  { from: 'macro', to: 'ai_recommendation', noteJa: 'レジームが戦略方向を補正' },
  { from: 'execution', to: 'capital_allocation', noteJa: 'DDがサイズ上限' },
  { from: 'capital_allocation', to: 'ai_recommendation', noteJa: '資金が買いサイズを決定' },
  { from: 'governance', to: 'ai_recommendation', noteJa: '最終裁定' },
  { from: 'reactive_orchestration', to: 'governance', noteJa: '更新タイミングが再計算を誘発' },
];

export const TRACE_FEATURE_LABELS: Record<TraceFeatureId, string> = {
  cognitive_trace_engine: 'Cognitive Trace Engine',
  decision_timeline: 'Decision Timeline',
  influence_graph: 'Influence Graph',
  reason_weight_tree: 'Reason Weight Tree',
  consensus_breakdown: 'Consensus Breakdown',
  veto_explanation: 'Veto Explanation',
  conflict_explanation: 'Conflict Explanation',
  downgrade_reason_chain: 'Downgrade Reason Chain',
  health_impact_trace: 'Health Impact Trace',
  confidence_evolution: 'Confidence Evolution',
  state_snapshot_link: 'State Snapshot Link',
  market_context_capture: 'Market Context Capture',
  ai_recommendation_diff: 'AI Recommendation Diff',
  strategy_drift_tracker: 'Strategy Drift Tracker',
  human_override_trace: 'Human Override Trace',
  emergency_override_trace: 'Emergency Override Trace',
  recursive_reason_guard: 'Recursive Reason Guard',
  contradiction_timeline: 'Contradiction Timeline',
  explainable_score: 'Explainable Score',
  missing_evidence_detector: 'Missing Evidence Detector',
  weak_signal_isolation: 'Weak Signal Isolation',
  data_freshness_trace: 'Data Freshness Trace',
  source_reliability_weight: 'Source Reliability Weight',
  causal_chain_builder: 'Causal Chain Builder',
  explainable_summary_generator: 'Explainable Summary Generator',
  ai_self_reflection: 'AI Self Reflection',
  explainability_health_score: 'Explainability Health Score',
  replay_engine: 'Replay Engine',
  decision_comparator: 'Decision Comparator',
  explainability_dashboard: 'Explainability Dashboard',
};
