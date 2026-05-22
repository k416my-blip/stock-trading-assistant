/**
 * Runtime Survival & Mobile Resilience — mobile survivability (not intelligence).
 */
import {
  RUNTIME_FLOW_JA,
  RUNTIME_PRESSURE_FORMULA_JA,
  RUNTIME_RECOVERY_FORMULA_JA,
  RUNTIME_STABILITY_FORMULA_JA,
  RUNTIME_STATE_LABELS_JA,
  RUNTIME_SURVIVAL_REGULATORY_JA,
  RUNTIME_FEATURE_LABELS,
  RUNTIME_UI_LABELS_JA,
  REAL_TRADING_ENABLED,
} from '../constants/runtimeSurvivalMobileResilience';
import type {
  BuildRuntimeSurvivalInput,
  RuntimeFeatureId,
  RuntimeFeatureStatus,
  RuntimeSurvivalMobileResilienceBundle,
} from '../types/runtimeSurvivalMobileResilience';
import { loadRuntimeSurvivalState } from './runtimeSurvivalStorage';
import {
  classifyRuntimeState,
  collectRuntimeAuditTargets,
  computeMobileResilienceMetrics,
  resolveRuntimeSurvivalActions,
} from './mobileResilienceEngine';
import { getLastLayerRuntimeSchedule } from './layerRuntimeScheduler';
import { buildMobileRuntimeMetricsSnapshot } from './mobileRuntimeMetrics';
import type { LayerRuntimeSchedulePlan } from '../types/layerRuntimeScheduler';
import type { CrossLayerCascadeEvaluation } from '../types/crossLayerCascade';
import type { AsyncRuntimeEvaluation } from '../types/asyncRuntimeCoordinator';
import type { RuntimeTelemetryEvaluation } from '../types/runtimeTelemetry';
import { TELEMETRY_STATE_LABELS_JA } from '../constants/runtimeTelemetry';
import { evaluateCrossLayerCascade } from './crossLayerCascadeEngine';
import { evaluateAsyncRuntime } from './asyncRuntimeCoordinator';
import { getSessionMinutes } from './longSessionStability';

function buildFeatureStatuses(
  partial: Omit<RuntimeSurvivalMobileResilienceBundle, 'featureStatuses'>,
): RuntimeFeatureStatus[] {
  const s = (
    id: RuntimeFeatureId,
    ok: boolean,
    watch: boolean,
    detail: string,
  ): RuntimeFeatureStatus => ({
    id,
    labelJa: RUNTIME_FEATURE_LABELS[id],
    statusJa: ok ? 'ok' : watch ? 'watch' : 'critical',
    detailJa: detail,
  });

  return [
    s('appstate_lifecycle', true, false, 'AppState'),
    s('netinfo_offline', !partial.offlineSafeFallbackActive, partial.offlineSafeFallbackActive, 'offline'),
    s('hydration_persistence', partial.hydrationIntegrityPct >= 50, false, `${partial.hydrationIntegrityPct}%`),
    s('websocket_reconnect_policy', !partial.websocketPauseActive, partial.websocketPauseActive, 'ws'),
    s('cache_first_orchestration', partial.cacheFirstModeActive, false, 'cache-first'),
    s('suspend_resume_recovery', partial.runtimeRecoveryScorePct >= 50, false, `${partial.runtimeRecoveryScorePct}%`),
    s('offline_fallback', !partial.offlineSafeFallbackActive, partial.offlineSafeFallbackActive, 'fallback'),
    s('stale_dashboard_recovery', partial.dashboardLowRefreshActive, false, 'low-refresh'),
    s('lightweight_timers', true, false, 'lite'),
    s('no_infinite_polling', true, false, 'no poll loop'),
    s('reconnect_backoff', true, false, 'backoff'),
    s('survival_mode', !partial.survivalModeActive, partial.survivalModeActive, 'survival'),
    s('lightweight_mode', !partial.lightweightModeActive, partial.lightweightModeActive, 'lightweight'),
    s('deep_orch_suppression', !partial.deepOrchestrationSuppressionActive, partial.deepOrchestrationSuppressionActive, 'suppress'),
    s('runtime_rebuild_hint', !partial.runtimeRebuildSuggestionActive, partial.runtimeRebuildSuggestionActive, 'rebuild'),
    s('no_stealth_wakelock', partial.hiddenWakeLockForbidden, false, 'forbidden'),
    s('no_hidden_background', partial.hiddenBackgroundExecutionForbidden, false, 'forbidden'),
    s('runtime_timeline', partial.runtimeTimeline.length > 0, false, `${partial.runtimeTimeline.length}`),
    s('mobile_lite_survival', true, false, partial.mobileRuntimeStateJa),
    s('runtime_dashboard', true, false, RUNTIME_UI_LABELS_JA.panelTitle),
    s('paper_trading_safety', partial.realTradingEnabled === false, false, 'paper'),
  ];
}

type RuntimeSurvivalPartial = Omit<
  RuntimeSurvivalMobileResilienceBundle,
  | 'featureStatuses'
  | 'layerSchedulerModeJa'
  | 'mobileRuntimeMetrics'
  | 'crossLayerCascadeMetrics'
  | 'cascadeGuardSummaryJa'
  | 'asyncRuntimeMetrics'
  | 'asyncCoordinatorSummaryJa'
  | 'runtimeTelemetrySummaryJa'
  | 'runtimeTelemetryStateLabelJa'
>;

function mergeLayerScheduleIntoBundle(
  partial: RuntimeSurvivalPartial,
  plan: LayerRuntimeSchedulePlan | null,
  input: BuildRuntimeSurvivalInput,
): Omit<RuntimeSurvivalMobileResilienceBundle, 'featureStatuses'> {
  const schedulePlan = plan ?? input.layerSchedulePlan ?? getLastLayerRuntimeSchedule();
  const metrics =
    schedulePlan?.mobileMetrics ??
    buildMobileRuntimeMetricsSnapshot('LIGHTWEIGHT', {
      memoryPressure: input.memoryPressure,
      queueSize: input.queueSize,
      thermalPressurePct: partial.thermalPressurePct,
    });

  const cascadeEval =
    input.cascadeEvaluation ??
    evaluateCrossLayerCascade({
      renderBurstRate: metrics.renderBurstRate,
      queueSize: input.queueSize,
      memoryPressure: input.memoryPressure,
      thermalPressurePct: partial.thermalPressurePct,
      websocketUnstable: !input.websocketConnected,
      contradictionActive: false,
      confidenceCollapse: false,
    });

  const asyncEval: AsyncRuntimeEvaluation =
    input.asyncEvaluation ??
    evaluateAsyncRuntime({
      cascadePressure: cascadeEval.metrics.cascadePressure,
      renderBurstRate: metrics.renderBurstRate,
      queueSize: input.queueSize,
      memoryPressure: input.memoryPressure,
      batterySaver: input.performance.batterySaverActive,
      appForeground: input.performance.appForeground,
      sessionMinutes: getSessionMinutes(),
    });

  const telemetryEval: RuntimeTelemetryEvaluation | null = input.telemetryEvaluation ?? null;
  const telemetryFields = {
    runtimeTelemetrySummaryJa: telemetryEval?.summaryJa ?? 'テレメトリ未評価',
    runtimeTelemetryStateLabelJa: telemetryEval
      ? TELEMETRY_STATE_LABELS_JA[telemetryEval.state]
      : '—',
  };

  const asyncFields = {
    asyncRuntimeMetrics: asyncEval.metrics,
    asyncCoordinatorSummaryJa: asyncEval.summaryJa,
    ...telemetryFields,
  };

  if (!schedulePlan) {
    return {
      ...partial,
      layerSchedulerModeJa: '軽量モード（デフォルト）',
      mobileRuntimeMetrics: metrics,
      crossLayerCascadeMetrics: cascadeEval.metrics,
      cascadeGuardSummaryJa: cascadeEval.summaryJa,
      ...asyncFields,
    };
  }

  const actions = schedulePlan.actions;
  return {
    ...partial,
    layerSchedulerModeJa: schedulePlan.modeLabelJa,
    mobileRuntimeMetrics: metrics,
    crossLayerCascadeMetrics: cascadeEval.metrics,
    cascadeGuardSummaryJa: cascadeEval.summaryJa,
    ...asyncFields,
    survivalModeActive: partial.survivalModeActive || schedulePlan.mode === 'SURVIVAL',
    lightweightModeActive:
      partial.lightweightModeActive ||
      schedulePlan.mode === 'LIGHTWEIGHT' ||
      schedulePlan.mode === 'SURVIVAL',
    deepOrchestrationSuppressionActive:
      partial.deepOrchestrationSuppressionActive ||
      actions.deepOrchestrationFreeze ||
      cascadeEval.actions.deepOrchestrationHardFreeze,
    cacheFirstModeActive: partial.cacheFirstModeActive || actions.cacheFirstMode,
    deepReflectionStopped: partial.deepReflectionStopped || actions.deepReasoningFreeze,
    speculativeProcessingStopped:
      partial.speculativeProcessingStopped || actions.deepOrchestrationFreeze,
    runtimeSummaryJa: [
      partial.runtimeSummaryJa,
      schedulePlan.summaryJa,
      cascadeEval.summaryJa,
      asyncEval.summaryJa,
      telemetryEval?.summaryJa,
    ]
      .filter(Boolean)
      .join(' · '),
    dashboardLowRefreshActive:
      partial.dashboardLowRefreshActive ||
      actions.dashboardMinimalRender ||
      cascadeEval.actions.minimalDashboardRendering ||
      asyncEval.compactDashboardMode,
  };
}

export async function buildRuntimeSurvivalMobileResilienceBundle(
  input: BuildRuntimeSurvivalInput,
): Promise<RuntimeSurvivalMobileResilienceBundle> {
  const persisted = await loadRuntimeSurvivalState();
  const started = input.auditStartedAt ?? Date.now();
  const metrics = computeMobileResilienceMetrics(input, persisted);
  const runtimeState = classifyRuntimeState(metrics);
  const resolution = resolveRuntimeSurvivalActions(runtimeState, metrics);
  const auditTargets = collectRuntimeAuditTargets(metrics);

  const snapshotPoint = {
    at: new Date().toISOString(),
    runtimeHealthPct: metrics.runtimeHealthPct,
    runtimeState: resolution.runtimeState,
    runtimeStabilityPct: metrics.runtimeStabilityPct,
  };

  const partial: RuntimeSurvivalPartial = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: RUNTIME_SURVIVAL_REGULATORY_JA,
    paperTradingOnly: true,
    realTradingEnabled: REAL_TRADING_ENABLED,
    hiddenBackgroundExecutionForbidden: true,
    stealthPersistenceForbidden: true,
    batteryBypassForbidden: true,
    hiddenWakeLockForbidden: true,
    silentBackgroundTradingForbidden: true,
    autonomousRestartLoopForbidden: true,
    strategyActionChangeForbidden: true,
    runtimeState: resolution.runtimeState,
    runtimeStateLabelJa: RUNTIME_STATE_LABELS_JA[resolution.runtimeState],
    runtimeHealthPct: metrics.runtimeHealthPct,
    runtimeStabilityPct: metrics.runtimeStabilityPct,
    runtimePressurePct: metrics.runtimePressurePct,
    runtimeRecoveryScorePct: metrics.runtimeRecoveryScorePct,
    memoryPressurePct: metrics.memoryPressurePct,
    batteryPressurePct: metrics.batteryPressurePct,
    thermalPressurePct: metrics.thermalPressurePct,
    websocketContinuityPct: metrics.websocketContinuityPct,
    hydrationIntegrityPct: metrics.hydrationIntegrityPct,
    processKillRiskPct: metrics.processKillRiskPct,
    offlineResiliencePct: metrics.offlineResiliencePct,
    backgroundContinuityPct: metrics.backgroundContinuityPct,
    apiTimeoutPressurePct: metrics.apiTimeoutPressurePct,
    runtimeFragmentationPct: metrics.runtimeFragmentationPct,
    mobileSurvivabilityPct: metrics.mobileSurvivabilityPct,
    survivalModeActive: resolution.survivalModeActive,
    lightweightModeActive: resolution.lightweightModeActive,
    deepOrchestrationSuppressionActive: resolution.deepOrchestrationSuppressionActive,
    runtimeRebuildSuggestionActive: resolution.runtimeRebuildSuggestionActive,
    offlineSafeFallbackActive: resolution.offlineSafeFallbackActive,
    websocketPauseActive: resolution.websocketPauseActive,
    cacheFirstModeActive: resolution.cacheFirstModeActive,
    dashboardLowRefreshActive: resolution.dashboardLowRefreshActive,
    speculativeProcessingStopped: resolution.speculativeProcessingStopped,
    deepReflectionStopped: resolution.deepReflectionStopped,
    orchestrationBudgetMax: resolution.orchestrationBudgetMax,
    runtimeSummaryJa: [
      RUNTIME_STATE_LABELS_JA[resolution.runtimeState],
      `health ${metrics.runtimeHealthPct}% · pressure ${metrics.runtimePressurePct}%`,
      resolution.survivalModeActive ? 'サバイバルモード' : resolution.runtimeModeJa,
    ]
      .filter(Boolean)
      .join(' — '),
    runtimeStabilityFormulaJa: RUNTIME_STABILITY_FORMULA_JA,
    runtimePressureFormulaJa: RUNTIME_PRESSURE_FORMULA_JA,
    runtimeRecoveryFormulaJa: RUNTIME_RECOVERY_FORMULA_JA,
    runtimeFlowJa: [...RUNTIME_FLOW_JA],
    auditTargets,
    runtimeTimeline: [...persisted.runtimeTimeline, snapshotPoint].slice(-48),
    mobileRuntimeStateJa: `Redmi-class mobile resilience · ${Date.now() - started}ms`,
    explainRuleBasisJa:
      '実運用生存層。AppState/NetInfo/perf と連携。aggressive polling・stealth background 禁止。strategy変更禁止。',
  };

  const merged = mergeLayerScheduleIntoBundle(
    partial,
    input.layerSchedulePlan ?? null,
    input,
  );
  return { ...merged, featureStatuses: buildFeatureStatuses(merged) };
}
