export const TRADING_SURVIVABILITY_ORCHESTRATION_VERSION = '1.0.0';

export const TRADING_SURVIVABILITY_POLL_MS = 24_000;
export const TRADING_SURVIVABILITY_TIMELINE_MAX = 400;
export const TRADING_SURVIVABILITY_LONG_SESSION_MIN = 120;
export const TRADING_SURVIVABILITY_EMERGENCY_HEALTH = 35;
export const TRADING_SURVIVABILITY_THERMAL_SEVERE = ['severe', 'critical', 'emergency', 'shutdown'];
export const TRADING_SURVIVABILITY_LOW_MEMORY_PCT = 72;

export const TRADING_SURVIVABILITY_UI_JA = {
  sectionTitle: 'Trading Survivability',
  safety:
    'runtime-aware orchestration — 売買ロジック・recommendation semantics は変更しません',
  runtimeSafeTradingScore: 'runtimeSafeTradingScore',
  aiConciergePressure: 'aiConciergePressure',
  websocketPressure: 'websocketPressure',
  marketPollingCost: 'marketPollingCost',
  runtimeTradingFatigue: 'runtimeTradingFatigue',
  survivabilityTradingMode: 'survivabilityTradingMode',
  notificationPressure: 'notificationPressure',
  emergencyLightweightScore: 'emergencyLightweightScore',
  tradingHydrationStability: 'tradingHydrationStability',
  bridgeTradingOverhead: 'bridgeTradingOverhead',
  timeline: 'survivability timeline',
} as const;
