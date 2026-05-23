export type JsSchedulerMode =
  | 'full'
  | 'low_refresh'
  | 'screen_off'
  | 'thermal_suppressed'
  | 'freeze_safe'
  | 'battery_lightweight'
  | 'background_degraded';

export type JsThreadStabilizationProfile = {
  eventLoopLagMs: number;
  schedulerDriftMs: number;
  gcSpikeMs: number;
  jsFramePressure: number;
  callbackDensity: number;
  timerSkew: number;
  idleBudgetUsage: number;
  renderFrameCost: number;
  cooperativeYieldCount: number;
  schedulerRecoveryLatency: number;
  survivalScore: number;
  mode: JsSchedulerMode;
  measuredAt: string;
};

export type JsThreadStabilizationDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: JsThreadStabilizationProfile;
};

export type StabilizationObserveInput = {
  eventLoopLagMs: number;
  renderFps: number;
  jsHeapMb: number;
  thermalState: string;
  appForeground: boolean;
  screenOff: boolean;
  batterySaver: boolean;
  memoryTrendPct: number;
};
