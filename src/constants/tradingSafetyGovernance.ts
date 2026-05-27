export const TRADING_SAFETY_GOVERNANCE_VERSION = '1.0.0';

export const TRADING_SAFETY_POLL_MS = 25_000;
export const TRADING_SAFETY_TIMELINE_MAX = 400;
export const TRADING_SAFETY_LONG_SESSION_MIN = 120;
export const TRADING_SAFETY_EMERGENCY_RISK = 0.72;
export const TRADING_SAFETY_LOW_MEMORY_PCT = 72;
export const TRADING_SAFETY_THERMAL_SEVERE = ['severe', 'critical', 'emergency', 'shutdown'];

export const TRADING_SAFETY_UI_JA = {
  sectionTitle: 'Trading Safety Governance',
  safety:
    'runtime risk control — recommendation 意味・売買ロジック・policy・AI推論は変更しません',
  runtimeTradingRisk: 'runtimeTradingRisk',
  survivabilityWeightedConfidence: 'survivabilityWeightedConfidence',
  runtimeRecommendationConfidence: 'runtimeRecommendationConfidence',
  websocketTradingRisk: 'websocketTradingRisk',
  thermalTradingPressure: 'thermalTradingPressure',
  executionPacingRisk: 'executionPacingRisk',
  tradingContinuityRisk: 'tradingContinuityRisk',
  runtimeStressConfidence: 'runtimeStressConfidence',
  longSessionTradingFatigue: 'longSessionTradingFatigue',
  tradingSafetyEquilibrium: 'tradingSafetyEquilibrium',
  riskEvolution: 'runtime risk evolution',
  confidenceTimeline: 'confidence degradation timeline',
  executionPacingFlow: 'execution pacing flow',
  suppressionMap: 'runtime suppression map',
  timeline: 'trading safety timeline',
} as const;

export const EMERGENCY_LIGHTWEIGHT_FEATURES = [
  'holdings',
  'prices',
  'alerts',
  'manual_trade_path',
] as const;

export const EMERGENCY_SUPPRESSED_FEATURES = [
  'heavy_observer',
  'high_frequency_polling',
  'proactive_concierge',
  'noncritical_telemetry',
] as const;
