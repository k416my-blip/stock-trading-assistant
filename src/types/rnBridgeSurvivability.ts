export type RnSurvivabilityMode =
  | 'full'
  | 'render_degraded'
  | 'low_memory_reuse'
  | 'thermal_bridge_cooldown'
  | 'screen_off_suppressed'
  | 'background_suppressed';

export type RnBridgeSurvivabilityProfile = {
  bridgeTrafficRate: number;
  nativeBurstDensity: number;
  renderStormRisk: number;
  rerenderPerMinute: number;
  objectChurnRate: number;
  listenerLeakRisk: number;
  closureRetentionRisk: number;
  asyncFragmentationScore: number;
  memoizationEfficiency: number;
  virtualizationPressure: number;
  immutableReuseRatio: number;
  bridgeRecoveryLatency: number;
  survivalScore: number;
  mode: RnSurvivabilityMode;
  measuredAt: string;
};

export type RnBridgeSurvivabilityDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: RnBridgeSurvivabilityProfile;
};

export type RnBridgeObserveInput = {
  renderFps: number;
  renderBurstRate: number;
  jsHeapMb: number;
  memoryTrendPct: number;
  thermalState: string;
  appForeground: boolean;
  screenOff: boolean;
  batterySaver: boolean;
  asyncQueueDepth: number;
};
