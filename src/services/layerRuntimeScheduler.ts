import {
  ANALYSIS_MODE_DURATION_MS,
  ANALYSIS_REQUEST_KEYWORDS_JA,
  BATTERY_SURVIVAL_THRESHOLD_PCT,
  LAYER_MODE_LABELS_JA,
  MEMORY_PRESSURE_SCHEDULER_THRESHOLD,
  THERMAL_DEEP_FREEZE_THRESHOLD,
  UI_THROTTLE_MS_LIGHTWEIGHT,
  UI_THROTTLE_MS_SURVIVAL,
  WEBSOCKET_SLOW_POLL_MULTIPLIER,
} from '../constants/layerRuntimeScheduler';
import type {
  LayerRuntimeActions,
  LayerRuntimeFlags,
  LayerRuntimeMode,
  LayerRuntimeSchedulePlan,
  ResolveLayerRuntimeScheduleInput,
} from '../types/layerRuntimeScheduler';
import type { RuntimeState } from '../types/runtimeSurvivalMobileResilience';
import { buildMobileRuntimeMetricsSnapshot } from './mobileRuntimeMetrics';
import { isCacheFirstModeActive } from './mobileRedmiRuntime';

let analysisExpiresAt = 0;
let lastPlan: LayerRuntimeSchedulePlan | null = null;

export function resetLayerRuntimeSchedulerForTest(): void {
  analysisExpiresAt = 0;
  lastPlan = null;
}

export function detectAnalysisRequestJa(text: string): boolean {
  const lower = text.toLowerCase();
  return ANALYSIS_REQUEST_KEYWORDS_JA.some((kw) => lower.includes(kw.toLowerCase()));
}

export function activateAnalysisMode(durationMs = ANALYSIS_MODE_DURATION_MS): void {
  analysisExpiresAt = Date.now() + durationMs;
}

export function isAnalysisModeActive(): boolean {
  return Date.now() < analysisExpiresAt;
}

export function deactivateAnalysisMode(): void {
  analysisExpiresAt = 0;
}

function isSurvivalContext(input: ResolveLayerRuntimeScheduleInput): boolean {
  if (!input.performance.appForeground) return true;
  if (input.performance.batterySaverActive) return true;
  if (input.performance.offlineMode) return true;
  if (input.websocketUnstable) return true;
  if (input.memoryPressure) return true;
  if (input.thermalPressurePct >= THERMAL_DEEP_FREEZE_THRESHOLD) return true;
  if (
    typeof input.batteryLevelPct === 'number' &&
    input.batteryLevelPct < BATTERY_SURVIVAL_THRESHOLD_PCT
  ) {
    return true;
  }
  const rs = input.runtimeState;
  if (
    rs === 'RUNTIME_CRITICAL' ||
    rs === 'RUNTIME_OFFLINE' ||
    rs === 'RUNTIME_DEGRADED' ||
    rs === 'RUNTIME_FRAGMENTED'
  ) {
    return true;
  }
  return false;
}

function resolveMode(input: ResolveLayerRuntimeScheduleInput): LayerRuntimeMode {
  if (isSurvivalContext(input)) return 'SURVIVAL';
  if (isAnalysisModeActive() || input.analysisExplicit) return 'ANALYSIS';
  return 'LIGHTWEIGHT';
}

function buildLayerFlags(mode: LayerRuntimeMode): LayerRuntimeFlags {
  const base: LayerRuntimeFlags = {
    runtimeSurvival: true,
    constitutionalGovernance: true,
    explainableGovernance: true,
    unifiedCognitiveState: true,
    epistemicIntegrity: false,
    strategicMemoryGraph: false,
    adaptiveExploration: false,
  };

  if (mode === 'ANALYSIS') {
    return {
      ...base,
      epistemicIntegrity: true,
      strategicMemoryGraph: true,
      adaptiveExploration: true,
    };
  }

  if (mode === 'SURVIVAL') {
    return { ...base };
  }

  return { ...base };
}

function shouldForceDeepLayers(input: ResolveLayerRuntimeScheduleInput): boolean {
  return (
    input.analysisExplicit ||
    isAnalysisModeActive() ||
    input.confidenceCollapse ||
    input.contradictionActive
  );
}

export function resolveDeepLayerActivation(
  layer: keyof Pick<
    LayerRuntimeFlags,
    'epistemicIntegrity' | 'strategicMemoryGraph' | 'adaptiveExploration'
  >,
  plan: LayerRuntimeSchedulePlan,
  input: ResolveLayerRuntimeScheduleInput,
): boolean {
  if (plan.mode === 'SURVIVAL') return false;
  if (plan.mode === 'ANALYSIS' || shouldForceDeepLayers(input)) {
    return plan.layers[layer];
  }
  return false;
}

function buildActions(mode: LayerRuntimeMode, input: ResolveLayerRuntimeScheduleInput): LayerRuntimeActions {
  const thermalHigh = input.thermalPressurePct >= THERMAL_DEEP_FREEZE_THRESHOLD;
  const batteryLow =
    typeof input.batteryLevelPct === 'number' &&
    input.batteryLevelPct < BATTERY_SURVIVAL_THRESHOLD_PCT;
  const survival = mode === 'SURVIVAL' || batteryLow;

  if (survival) {
    return {
      deepOrchestrationFreeze: true,
      websocketPollingSlowdown: true,
      memoryGraphPause: true,
      adaptiveExplorationPause: true,
      uiUpdateThrottle: true,
      animationSuppression: true,
      dashboardMinimalRender: true,
      explanationSimplification: true,
      deepReasoningFreeze: true,
      cacheFirstMode: true,
      delayedOrchestrationRestart: !input.performance.appForeground,
    };
  }

  if (mode === 'ANALYSIS') {
    return {
      deepOrchestrationFreeze: false,
      websocketPollingSlowdown: false,
      memoryGraphPause: false,
      adaptiveExplorationPause: false,
      uiUpdateThrottle: false,
      animationSuppression: input.performance.batterySaverActive,
      dashboardMinimalRender: false,
      explanationSimplification: false,
      deepReasoningFreeze: thermalHigh,
      cacheFirstMode: isCacheFirstModeActive(),
      delayedOrchestrationRestart: false,
    };
  }

  return {
    deepOrchestrationFreeze: false,
    websocketPollingSlowdown: input.performance.batterySaverActive,
    memoryGraphPause: true,
    adaptiveExplorationPause: true,
    uiUpdateThrottle: input.memoryPressure || input.queueSize > MEMORY_PRESSURE_SCHEDULER_THRESHOLD,
    animationSuppression: input.performance.batterySaverActive,
    dashboardMinimalRender: false,
    explanationSimplification: input.performance.batterySaverActive,
    deepReasoningFreeze: thermalHigh,
    cacheFirstMode: isCacheFirstModeActive(),
    delayedOrchestrationRestart: false,
  };
}

export function getUiThrottleIntervalMs(plan: LayerRuntimeSchedulePlan | null): number {
  if (!plan) return UI_THROTTLE_MS_LIGHTWEIGHT;
  if (plan.actions.uiUpdateThrottle) {
    return plan.mode === 'SURVIVAL' ? UI_THROTTLE_MS_SURVIVAL : UI_THROTTLE_MS_LIGHTWEIGHT;
  }
  return 0;
}

export function getWebsocketPollMultiplier(plan: LayerRuntimeSchedulePlan | null): number {
  if (plan?.actions.websocketPollingSlowdown) return WEBSOCKET_SLOW_POLL_MULTIPLIER;
  return 1;
}

export function resolveLayerRuntimeSchedule(
  input: ResolveLayerRuntimeScheduleInput,
): LayerRuntimeSchedulePlan {
  const mode = resolveMode(input);
  let layers = buildLayerFlags(mode);

  if (mode === 'LIGHTWEIGHT' && shouldForceDeepLayers(input)) {
    layers = {
      ...layers,
      epistemicIntegrity: true,
      strategicMemoryGraph: true,
      adaptiveExploration: true,
    };
  }

  if (mode === 'SURVIVAL') {
    layers = {
      ...layers,
      epistemicIntegrity: false,
      strategicMemoryGraph: false,
      adaptiveExploration: false,
    };
  }

  const actions = buildActions(mode, input);
  const mobileMetrics = buildMobileRuntimeMetricsSnapshot(mode, {
    memoryPressure: input.memoryPressure,
    queueSize: input.queueSize,
    thermalPressurePct: input.thermalPressurePct,
    jsPressureBoost: input.renderBurstRate,
  });

  const plan: LayerRuntimeSchedulePlan = {
    mode,
    modeLabelJa: LAYER_MODE_LABELS_JA[mode],
    layers,
    actions,
    analysisExpiresAt:
      mode === 'ANALYSIS' && analysisExpiresAt > Date.now()
        ? new Date(analysisExpiresAt).toISOString()
        : null,
    mobileMetrics,
    summaryJa: [
      LAYER_MODE_LABELS_JA[mode],
      `deep layers: epistemic=${layers.epistemicIntegrity} graph=${layers.strategicMemoryGraph} explore=${layers.adaptiveExploration}`,
      actions.deepOrchestrationFreeze ? 'orchestration frozen' : 'orchestration normal',
    ].join(' · '),
  };

  lastPlan = plan;
  return plan;
}

export function getLastLayerRuntimeSchedule(): LayerRuntimeSchedulePlan | null {
  return lastPlan;
}

export function shouldRunSchedulableLayer(
  layer: keyof LayerRuntimeFlags,
  plan: LayerRuntimeSchedulePlan,
): boolean {
  return plan.layers[layer];
}

export function mapRuntimeStateToSchedulerInput(
  runtimeState: RuntimeState | null,
): Partial<ResolveLayerRuntimeScheduleInput> {
  if (!runtimeState) return {};
  return {
    thermalPressurePct: runtimeState === 'RUNTIME_STRESSED' ? 50 : 0,
  };
}
