import type {
  CognitiveResourceEconomyFeatureId,
  ResourceAuditTargetId,
  ResourceEconomyState,
} from '../types/cognitiveResourceEconomyAttentionAllocation';

export const COGNITIVE_RESOURCE_ECONOMY_REGULATORY_JA =
  'Cognitive Resource Economy & Attention Allocation — 有限リソース下の思考配分（高コスト≠高品質）。Paper Trading・realTradingEnabled=false。';

export const COGNITIVE_RESOURCE_ECONOMY_AI_PROMPT_JA = `
【Cognitive Resource Economy & Attention Allocation】
- attention・compute budget・再帰圧・layer utility を監査。全部を同時に考えない。重要思考にのみリソース集中。
- hidden compute・background runaway recursion・autonomous escalation禁止。governance最優先。
`.trim();

export const REAL_TRADING_ENABLED = false as const;
export const RESOURCE_HEALTH_STRESSED_THRESHOLD = 70;
export const RESOURCE_HEALTH_FRAGMENTED_THRESHOLD = 55;
export const RESOURCE_HEALTH_OVERLOADED_THRESHOLD = 40;
export const RECURSIVE_PRESSURE_THRESHOLD = 70;
export const COMPUTE_WASTE_THRESHOLD = 60;
export const BUDGET_RESOURCE_BALANCED = 90;
export const BUDGET_RESOURCE_STRESSED = 78;
export const BUDGET_RESOURCE_FRAGMENTED = 68;
export const BUDGET_RESOURCE_RISK = 52;
export const ECONOMY_TIMELINE_MAX = 48;

export const RESOURCE_HEALTH_FORMULA_JA =
  'resourceHealth = 100 − computePressure×0.2 − recursiveCost×0.15 − orchestrationSaturation×0.15 − latencyInflation×0.15 − speculativeWaste×0.1 − reflectionFatigue×0.1 − contradictionProcessingCost×0.15';

export const ATTENTION_EFFICIENCY_FORMULA_JA =
  'attentionEfficiency = usefulInference / totalComputeCost';

export const RECURSIVE_PRESSURE_FORMULA_JA =
  'recursivePressure = recursiveDepth × orchestrationLoops × reflectionCycles';

export const COMPUTE_WASTE_FORMULA_JA =
  'computeWaste = unsupportedReasoning + speculativeExpansion + staleReflection + contradictionThrashing';

export const MOBILE_PRESSURE_FORMULA_JA =
  'mobilePressure = batteryPressure + backgroundLoad + latencyInflation';

export const ECONOMY_FLOW_JA = [
  'Collect compute metrics → Estimate layer utility → Prioritize attention',
  'Suppress low-value recursion → Reduce speculative compute → Allocate mobile budget',
  'Orchestration validation → Persist economy snapshot',
];

export const RESOURCE_STATE_LABELS_JA: Record<ResourceEconomyState, string> = {
  RESOURCE_BALANCED: 'リソース均衡',
  RESOURCE_STRESSED: 'リソース逼迫',
  RESOURCE_FRAGMENTED: 'リソース断片化',
  RESOURCE_OVERLOADED: 'リソース過負荷',
  RESOURCE_WASTEFUL: '計算浪費',
  RESOURCE_RECURSIVE_PRESSURE: '再帰圧迫',
};

export const RESOURCE_AUDIT_LABELS_JA: Record<ResourceAuditTargetId, string> = {
  attentionFocus: 'Attention Focus',
  computePressure: 'Compute Pressure',
  recursiveCost: 'Recursive Cost',
  reflectionFatigue: 'Reflection Fatigue',
  layerUtility: 'Layer Utility',
  speculativeWaste: 'Speculative Waste',
  latencyInflation: 'Latency Inflation',
  batteryPressure: 'Battery Pressure',
  backgroundLoad: 'Background Load',
  contradictionProcessingCost: 'Contradiction Processing',
  hallucinationComputeAmplification: 'Hallucination Compute Amp',
  consensusOverhead: 'Consensus Overhead',
  orchestrationSaturation: 'Orchestration Saturation',
};

export const RESOURCE_ECONOMY_UI_LABELS_JA = {
  panelTitle: 'Cognitive Resource Economy Dashboard',
  health: 'Resource Health',
  attention: 'Attention Efficiency',
  compute: 'Compute Pressure',
  recursive: 'Recursive Pressure',
  saturation: 'Orchestration Saturation',
  speculative: 'Speculative Waste',
  reflection: 'Reflection Fatigue',
  battery: 'Battery Pressure',
  latency: 'Latency Inflation',
  waste: 'Compute Waste',
  mobile: 'Mobile Pressure',
  utility: 'Layer Utility Ranking',
  state: 'Resource State',
} as const;

export const RESOURCE_ECONOMY_FEATURE_LABELS: Record<CognitiveResourceEconomyFeatureId, string> = {
  compute_metric_collector: 'Compute Metric Collector',
  layer_utility_estimator: 'Layer Utility Estimator',
  attention_prioritizer: 'Attention Prioritizer',
  recursion_suppressor: 'Recursion Suppressor',
  speculative_compute_clamp: 'Speculative Compute Clamp',
  mobile_budget_allocator: 'Mobile Budget Allocator',
  orchestration_validator: 'Orchestration Validator',
  economy_timeline: 'Economy Timeline',
  reflection_fatigue_guard: 'Reflection Fatigue Guard',
  hallucination_compute_guard: 'Hallucination Compute Guard',
  background_load_batch: 'Background Load Batch',
  deep_reflection_defer: 'Deep Reflection Defer',
  attention_narrowing: 'Attention Narrowing',
  priority_rebuild: 'Priority Rebuild',
  recursive_throttle: 'Recursive Throttle',
  speculative_freeze: 'Speculative Freeze',
  mobile_hard_clamp: 'Mobile Hard Clamp',
  resource_economy_dashboard: 'Resource Economy Dashboard',
  paper_trading_safety: 'Paper Trading Safety',
  no_hidden_compute: 'No Hidden Compute',
};
