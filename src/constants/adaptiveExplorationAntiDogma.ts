import type {
  AdaptiveExplorationFeatureId,
  ExplorationAuditTargetId,
  ExplorationState,
} from '../types/adaptiveExplorationAntiDogma';

export const ADAPTIVE_EXPLORATION_REGULATORY_JA =
  'Adaptive Exploration & Anti-Dogma — 過度固定化の検出・緩和（autonomy・実験・strategy mutationではない）。Paper Trading・realTradingEnabled=false。';

export const ADAPTIVE_EXPLORATION_AI_PROMPT_JA = `
【Adaptive Exploration & Anti-Dogma】
- 安全性を壊さず過度な固定化のみ緩和。同じ思考への閉じ込みを防ぐ（新規実験・autonomyではない）。
- governance最優先・human intent override禁止・unsupported exploration・hidden experimentation禁止。
`.trim();

export const REAL_TRADING_ENABLED = false as const;
export const DOGMA_PRESSURE_RIGID_THRESHOLD = 60;
export const DOGMA_PRESSURE_STAGNANT_THRESHOLD = 75;
export const EXPLORATION_HEALTH_OVERCLAMPED_THRESHOLD = 40;
export const UNCERTAINTY_ACCEPTANCE_UNCERTAIN_THRESHOLD = 35;
export const UNSUPPORTED_EXPLORATION_RISK_THRESHOLD = 70;
export const BUDGET_EXPLORATION_BALANCED = 90;
export const BUDGET_EXPLORATION_RIGID = 82;
export const BUDGET_EXPLORATION_STAGNANT = 74;
export const BUDGET_EXPLORATION_RISK = 58;
export const EXPLORATION_TIMELINE_MAX = 48;

export const EXPLORATION_HEALTH_FORMULA_JA =
  'explorationHealth = (adaptiveFlexibility + safeVariationCapacity + multiPathTolerance + uncertaintyAcceptance) / 4';

export const DOGMA_PRESSURE_FORMULA_JA =
  'dogmaPressure = strategyRigidity + consensusStagnation + epistemicRigidity + orchestrationFixation';

export const SAFE_EXPLORATION_MARGIN_FORMULA_JA =
  'safeExplorationMargin = explorationHealth − dogmaPressure';

export const NOVELTY_BALANCE_FORMULA_JA =
  'noveltyBalance = (safeVariationCapacity + epistemicIntegrity + governanceAlignment + humanIntentAlignment) / 4';

export const EXPLORATION_FLOW_JA = [
  'Collect rigidity signals → Score dogma pressure & exploration health',
  'Detect over-clamping → Apply controlled flexibility hints only',
  'Persist exploration snapshot',
];

export const EXPLORATION_STATE_LABELS_JA: Record<ExplorationState, string> = {
  EXPLORATION_BALANCED: '探索バランス',
  EXPLORATION_RIGID: '探索硬直',
  EXPLORATION_STAGNANT: '探索停滞',
  EXPLORATION_OVERCLAMPED: '過度クランプ',
  EXPLORATION_UNCERTAIN: '探索不確実',
  EXPLORATION_UNSUPPORTED: '探索未支持',
};

export const EXPLORATION_AUDIT_LABELS_JA: Record<ExplorationAuditTargetId, string> = {
  strategyRigidity: 'Strategy Rigidity',
  consensusStagnation: 'Consensus Stagnation',
  explanationRepetition: 'Explanation Repetition',
  epistemicRigidity: 'Epistemic Rigidity',
  orchestrationFixation: 'Orchestration Fixation',
  reflectionLooping: 'Reflection Looping',
  noveltyResistance: 'Novelty Resistance',
  explorationSuppression: 'Exploration Suppression',
  adaptiveFlexibility: 'Adaptive Flexibility',
  safeVariationCapacity: 'Safe Variation Capacity',
  multiPathTolerance: 'Multi-Path Tolerance',
  uncertaintyAcceptance: 'Uncertainty Acceptance',
};

export const ADAPTIVE_EXPLORATION_UI_LABELS_JA = {
  panelTitle: 'Adaptive Exploration Dashboard',
  health: 'Exploration Health',
  dogma: 'Dogma Pressure',
  strategyRigidity: 'Strategy Rigidity',
  consensusStagnation: 'Consensus Stagnation',
  epistemicRigidity: 'Epistemic Rigidity',
  novelty: 'Novelty Balance',
  flexibility: 'Adaptive Flexibility',
  margin: 'Safe Exploration Margin',
  state: 'Exploration State',
} as const;

export const ADAPTIVE_EXPLORATION_FEATURE_LABELS: Record<AdaptiveExplorationFeatureId, string> = {
  rigidity_analyzer: 'Rigidity Analyzer',
  repetition_cache: 'Repetition Cache',
  dogma_pressure_meter: 'Dogma Pressure Meter',
  novelty_scorer: 'Novelty Scorer',
  perspective_widener: 'Perspective Widener',
  safe_alternative_generator: 'Safe Alternative Generator',
  clamp_relaxation_hint: 'Clamp Relaxation Hint',
  uncertainty_acknowledgment: 'Uncertainty Acknowledgment',
  fallback_freeze: 'Fallback Freeze',
  exploration_timeline: 'Exploration Timeline',
  no_autonomous_experiment: 'No Autonomous Experiment',
  no_hidden_exploration: 'No Hidden Exploration',
  no_strategy_mutation: 'No Strategy Mutation',
  no_human_intent_override: 'No Human Intent Override',
  mobile_lite_rigidity: 'Mobile Lite Rigidity',
  cached_repetition_metrics: 'Cached Repetition Metrics',
  adaptive_exploration_dashboard: 'Adaptive Exploration Dashboard',
  paper_trading_safety: 'Paper Trading Safety',
};
