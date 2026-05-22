import type { MarketRegimeCategory, RegimeFeatureId } from '../types/autonomousMarketRegimeDetection';

export const REGIME_REGULATORY_JA =
  'Autonomous Market Regime Detection & Strategy Adaptation — 現在の市場局面分類（予測断定禁止）に基づく risk-aware 適応。Paper Trading・realTradingEnabled=false。';

export const REGIME_AI_PROMPT_JA = `
【Market Regime Detection】
- 現在の局面分類のみ。未来予言・断定禁止。uncertainty を必ず明示。
- PANIC / UNSUPPORTED 時は watch/hold・説明モード。governance / systemic emergency を bypass しない。
- confidence 上限: calm≤70, volatile≤55, crisis≤35。
`.trim();

export const REAL_TRADING_ENABLED = false as const;
export const CONFIDENCE_CAP_CALM = 70;
export const CONFIDENCE_CAP_VOLATILE = 55;
export const CONFIDENCE_CAP_CRISIS = 35;
export const BUDGET_CALM = 95;
export const BUDGET_VOLATILE = 65;
export const BUDGET_DEFAULT = 85;
export const PANIC_RISK_THRESHOLD = 70;
export const GOVERNANCE_STRESS_THRESHOLD = 80;
export const STABILITY_HEALTH_FREEZE_THRESHOLD = 35;
export const UNCERTAINTY_UNSUPPORTED_THRESHOLD = 75;
export const CONFIDENCE_DRIFT_COOLDOWN_THRESHOLD = 60;
export const REGIME_TIMELINE_MAX = 48;

export const REGIME_CONFIDENCE_FORMULA_JA =
  'regimeConfidence = 100 − volatility×0.25 − uncertainty×0.2 − contradiction×0.15 − unsupported×0.15 − governanceStress×0.1 − drift';

export const UNCERTAINTY_FORMULA_JA =
  'uncertainty = entropy + correlationBreak + volatilityShift + replayNoise';

export const ADAPTATION_HEALTH_FORMULA_JA =
  'adaptationHealth = stability×0.3 + governance×0.3 + recovery×0.2 + orchestration×0.2';

export const PANIC_RISK_FORMULA_JA =
  'panicRisk = volatilitySpike + liquidityRisk + macroShock + contradictionCascade';

export const REGIME_FLOW_JA = [
  'Market metrics → Volatility normalization → Regime clustering',
  'Confidence weighting → Uncertainty estimation → Adaptation recommendation',
  'Orchestration handoff → Dashboard persist',
];

export const ADAPTATION_FLOW_JA = [
  'Regime category → adaptation mode → confidence clamp',
  'Orchestration budget + layer priority shift',
  'Strategy/governance annotate only (no override)',
];

export const ORCHESTRATION_HANDOFF_JA = [
  'calm: budget 95 · standard layers',
  'volatile: budget 65 · selective layers',
  'panic: safety/governance only active',
];

export const REGIME_LABELS_JA: Record<MarketRegimeCategory, string> = {
  CALM_BULL: '穏やかな上昇局面',
  CALM_BEAR: '穏やかな下落局面',
  VOLATILE_BULL: '高ボラ上昇局面',
  VOLATILE_BEAR: '高ボラ下落局面',
  SIDEWAYS: '横ばい・レンジ',
  LIQUIDITY_STRESS: '流動性ストレス',
  PANIC: 'パニック局面',
  UNSUPPORTED_ENVIRONMENT: '未対応環境',
  RECOVERY_TRANSITION: '回復移行局面',
};

export const CLASSIFICATION_DISCLAIMER_JA =
  '本分類は現在の観測に基づく局面ラベルです。将来の価格・相場を予測・断定するものではありません。';

export const REGIME_UI_LABELS_JA = {
  panelTitle: 'Market Regime Dashboard',
  regime: 'Current Regime',
  confidence: 'Regime Confidence',
  uncertainty: 'Uncertainty',
  panicRisk: 'Panic Risk',
  adaptation: 'Adaptation Mode',
  budget: 'Orchestration Budget',
  clamp: 'Confidence Clamp',
  mobile: 'Mobile Runtime',
  governance: 'Governance Override',
  recovery: 'Recovery Interaction',
  volatility: 'Volatility Trend',
} as const;

export const REGIME_FEATURE_LABELS: Record<RegimeFeatureId, string> = {
  regime_detection_engine: 'Regime Detection Engine',
  volatility_normalizer: 'Volatility Normalizer',
  regime_clustering: 'Regime Clustering',
  confidence_weighting: 'Confidence Weighting',
  uncertainty_estimator: 'Uncertainty Estimator',
  adaptation_recommender: 'Adaptation Recommender',
  orchestration_handoff: 'Orchestration Handoff',
  panic_risk_scanner: 'Panic Risk Scanner',
  liquidity_stress_detector: 'Liquidity Stress Detector',
  sideways_suppressor: 'Sideways Suppressor',
  volatile_clamp: 'Volatile Confidence Clamp',
  calm_standard_mode: 'Calm Standard Mode',
  unsupported_guard: 'Unsupported Environment Guard',
  recovery_transition_bridge: 'Recovery Transition Bridge',
  governance_priority_mode: 'Governance Priority Mode',
  stability_freeze_gate: 'Stability Freeze Gate',
  confidence_drift_cooldown: 'Confidence Drift Cooldown',
  macro_shock_detector: 'Macro Shock Detector',
  correlation_break_detector: 'Correlation Break Detector',
  sentiment_drift_tracker: 'Sentiment Drift Tracker',
  trend_strength_analyzer: 'Trend Strength Analyzer',
  volume_anomaly_detector: 'Volume Anomaly Detector',
  mobile_regime_optimizer: 'Mobile Regime Optimizer',
  orchestration_budget_adapter: 'Orchestration Budget Adapter',
  layer_priority_shifter: 'Layer Priority Shifter',
  explanation_only_mode: 'Explanation-only Mode',
  regime_timeline: 'Regime Timeline',
  market_regime_dashboard: 'Market Regime Dashboard',
  paper_trading_safety: 'Paper Trading Safety',
  classification_not_prediction: 'Classification Not Prediction',
};
