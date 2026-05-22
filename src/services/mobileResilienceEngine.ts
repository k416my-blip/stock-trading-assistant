import {
  BUDGET_RUNTIME_CRITICAL,
  BUDGET_RUNTIME_DEGRADED,
  BUDGET_RUNTIME_FRAGMENTED,
  BUDGET_RUNTIME_OFFLINE,
  BUDGET_RUNTIME_STABLE,
  BUDGET_RUNTIME_STRESSED,
  OFFLINE_RESILIENCE_OFFLINE_THRESHOLD,
  RUNTIME_AUDIT_LABELS_JA,
  RUNTIME_FRAGMENTATION_FRAGMENTED_THRESHOLD,
  RUNTIME_HEALTH_CRITICAL_THRESHOLD,
  RUNTIME_PRESSURE_DEGRADED_THRESHOLD,
  RUNTIME_PRESSURE_STRESSED_THRESHOLD,
} from '../constants/runtimeSurvivalMobileResilience';
import type {
  BuildRuntimeSurvivalInput,
  RuntimeAuditSnapshot,
  RuntimeAuditTargetId,
  RuntimeState,
} from '../types/runtimeSurvivalMobileResilience';
import type { RuntimeSurvivalPersisted } from './runtimeSurvivalStorage';

export type MobileResilienceMetrics = {
  runtimeHealthPct: number;
  backgroundContinuityPct: number;
  memoryPressurePct: number;
  thermalPressurePct: number;
  batteryPressurePct: number;
  offlineResiliencePct: number;
  websocketContinuityPct: number;
  hydrationIntegrityPct: number;
  resumeRecoveryIntegrityPct: number;
  apiTimeoutPressurePct: number;
  runtimeFragmentationPct: number;
  processKillRiskPct: number;
  mobileSurvivabilityPct: number;
  runtimeStabilityPct: number;
  runtimePressurePct: number;
  runtimeRecoveryScorePct: number;
};

export type RuntimeSurvivalResolution = {
  runtimeState: RuntimeState;
  orchestrationBudgetMax: number;
  survivalModeActive: boolean;
  lightweightModeActive: boolean;
  deepOrchestrationSuppressionActive: boolean;
  runtimeRebuildSuggestionActive: boolean;
  offlineSafeFallbackActive: boolean;
  websocketPauseActive: boolean;
  cacheFirstModeActive: boolean;
  dashboardLowRefreshActive: boolean;
  speculativeProcessingStopped: boolean;
  deepReflectionStopped: boolean;
  runtimeModeJa: string;
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function audit(
  id: RuntimeAuditTargetId,
  score: number,
  detail: string,
): RuntimeAuditSnapshot {
  return {
    id,
    labelJa: RUNTIME_AUDIT_LABELS_JA[id],
    scorePct: clamp(score),
    detailJa: detail,
  };
}

export function collectRuntimeAuditTargets(metrics: MobileResilienceMetrics): RuntimeAuditSnapshot[] {
  return [
    audit('runtimeHealth', metrics.runtimeHealthPct, 'health'),
    audit('backgroundContinuity', metrics.backgroundContinuityPct, 'background'),
    audit('memoryPressure', 100 - metrics.memoryPressurePct, 'memory'),
    audit('thermalPressure', 100 - metrics.thermalPressurePct, 'thermal'),
    audit('batteryPressure', 100 - metrics.batteryPressurePct, 'battery'),
    audit('offlineResilience', metrics.offlineResiliencePct, 'offline'),
    audit('websocketContinuity', metrics.websocketContinuityPct, 'websocket'),
    audit('hydrationIntegrity', metrics.hydrationIntegrityPct, 'hydration'),
    audit('resumeRecoveryIntegrity', metrics.resumeRecoveryIntegrityPct, 'resume'),
    audit('apiTimeoutPressure', 100 - metrics.apiTimeoutPressurePct, 'api timeout'),
    audit('runtimeFragmentation', 100 - metrics.runtimeFragmentationPct, 'fragmentation'),
    audit('processKillRisk', 100 - metrics.processKillRiskPct, 'process kill'),
    audit('mobileSurvivability', metrics.mobileSurvivabilityPct, 'survivability'),
  ];
}

export function computeMobileResilienceMetrics(
  input: BuildRuntimeSurvivalInput,
  persisted: RuntimeSurvivalPersisted,
): MobileResilienceMetrics {
  const perf = input.performance;
  const economy = input.cognitiveResourceEconomy;
  const orch = input.orchestration;

  const memoryPressurePct = clamp(
    (input.memoryPressure ? 55 : 0) +
      Math.min(40, input.queueSize * 0.6) +
      (economy?.mobilePressurePct ?? 0) * 0.25 +
      (input.mockRuntimePressurePct ? input.mockRuntimePressurePct * 0.2 : 0),
  );

  const batteryPressurePct = clamp(
    (perf.batterySaverActive ? 45 : 10) + (perf.pollingPaused ? 15 : 0),
  );

  const thermalPressurePct = clamp(
    (economy?.mobilePressurePct ?? 0) * 0.5 +
      (economy?.batteryPressurePct ?? 0) * 0.35 +
      (input.mockThermalPressurePct ?? 0),
  );

  const apiTimeoutPressurePct = clamp(
    (perf.networkPaused ? 35 : 0) +
      (perf.offlineMode ? 25 : 0) +
      (orch?.refreshLatencyMs && orch.refreshLatencyMs > 8000 ? 20 : 0),
  );

  let runtimeFragmentationPct = clamp(
    (orch?.skippedLayerCount ?? 0) * 5 +
      persisted.lastRuntimePressurePct * 0.2 +
      (input.explainableGovernance?.explanationRiskPct ?? 0) * 0.1,
  );
  if (typeof input.mockRuntimeFragmentationPct === 'number') {
    runtimeFragmentationPct = clamp(input.mockRuntimeFragmentationPct);
  }

  const processKillRiskPct = clamp(
    (!perf.appForeground ? 40 : 0) +
      memoryPressurePct * 0.25 +
      (persisted.lastRuntimeState === 'RUNTIME_CRITICAL' ? 20 : 0) +
      (input.mockProcessKillRiskPct ?? 0),
  );

  const websocketContinuityPct = clamp(
    input.websocketConnected === false ? 25 : perf.offlineMode ? 40 : 88,
  );

  const backgroundContinuityPct = clamp(
    perf.appForeground ? 85 : 35 - (perf.appStateLabel === 'background' ? 10 : 0),
  );

  let offlineResiliencePct = clamp(
    perf.offlineMode ? 30 : 85 - apiTimeoutPressurePct * 0.3,
  );
  if (typeof input.mockOfflineResiliencePct === 'number') {
    offlineResiliencePct = clamp(input.mockOfflineResiliencePct);
  }

  const hydrationIntegrityPct = clamp(
    (perf.appForeground ? 75 : 45) -
      (orch ? 0 : 15) +
      (input.lastResumeAt ? 10 : 0),
  );

  const resumeRecoveryIntegrityPct = clamp(
    input.lastResumeAt || persisted.lastResumeAt
      ? 78 - processKillRiskPct * 0.2
      : 55 - (perf.appForeground ? 0 : 25),
  );

  let runtimeHealthPct = clamp(
    100 -
      memoryPressurePct * 0.25 -
      batteryPressurePct * 0.15 -
      thermalPressurePct * 0.15 -
      processKillRiskPct * 0.2 -
      runtimeFragmentationPct * 0.15 -
      (perf.offlineMode ? 15 : 0),
  );
  if (typeof input.mockRuntimeHealthPct === 'number') {
    runtimeHealthPct = clamp(input.mockRuntimeHealthPct);
  }

  const mobileSurvivabilityPct = clamp(
    (runtimeHealthPct + offlineResiliencePct + resumeRecoveryIntegrityPct) / 3 -
      apiTimeoutPressurePct * 0.1,
  );

  const runtimeStabilityPct = clamp(
    (runtimeHealthPct +
      backgroundContinuityPct +
      websocketContinuityPct +
      hydrationIntegrityPct +
      mobileSurvivabilityPct) /
      5,
  );

  let runtimePressurePct = clamp(
    (memoryPressurePct +
      thermalPressurePct +
      batteryPressurePct +
      apiTimeoutPressurePct +
      runtimeFragmentationPct +
      processKillRiskPct) /
      6,
  );
  if (typeof input.mockRuntimePressurePct === 'number') {
    runtimePressurePct = clamp(input.mockRuntimePressurePct);
  }

  const runtimeRecoveryScorePct = clamp(
    (offlineResiliencePct + resumeRecoveryIntegrityPct) / 2,
  );

  return {
    runtimeHealthPct,
    backgroundContinuityPct,
    memoryPressurePct,
    thermalPressurePct,
    batteryPressurePct,
    offlineResiliencePct,
    websocketContinuityPct,
    hydrationIntegrityPct,
    resumeRecoveryIntegrityPct,
    apiTimeoutPressurePct,
    runtimeFragmentationPct,
    processKillRiskPct,
    mobileSurvivabilityPct,
    runtimeStabilityPct,
    runtimePressurePct,
    runtimeRecoveryScorePct,
  };
}

export function classifyRuntimeState(metrics: MobileResilienceMetrics): RuntimeState {
  if (metrics.runtimeHealthPct < RUNTIME_HEALTH_CRITICAL_THRESHOLD) {
    return 'RUNTIME_CRITICAL';
  }
  if (metrics.offlineResiliencePct < OFFLINE_RESILIENCE_OFFLINE_THRESHOLD) {
    return 'RUNTIME_OFFLINE';
  }
  if (metrics.runtimeFragmentationPct > RUNTIME_FRAGMENTATION_FRAGMENTED_THRESHOLD) {
    return 'RUNTIME_FRAGMENTED';
  }
  if (metrics.runtimePressurePct > RUNTIME_PRESSURE_DEGRADED_THRESHOLD) {
    return 'RUNTIME_DEGRADED';
  }
  if (metrics.runtimePressurePct > RUNTIME_PRESSURE_STRESSED_THRESHOLD) {
    return 'RUNTIME_STRESSED';
  }
  return 'RUNTIME_STABLE';
}

export function resolveRuntimeSurvivalActions(
  state: RuntimeState,
  _metrics: MobileResilienceMetrics,
): RuntimeSurvivalResolution {
  const base: RuntimeSurvivalResolution = {
    runtimeState: state,
    orchestrationBudgetMax: BUDGET_RUNTIME_STABLE,
    survivalModeActive: false,
    lightweightModeActive: false,
    deepOrchestrationSuppressionActive: false,
    runtimeRebuildSuggestionActive: false,
    offlineSafeFallbackActive: false,
    websocketPauseActive: false,
    cacheFirstModeActive: false,
    dashboardLowRefreshActive: false,
    speculativeProcessingStopped: false,
    deepReflectionStopped: false,
    runtimeModeJa: 'runtime stable — full mobile resilience',
  };

  switch (state) {
    case 'RUNTIME_STRESSED':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_RUNTIME_STRESSED,
        lightweightModeActive: true,
        cacheFirstModeActive: true,
        runtimeModeJa: 'lightweight mode',
      };
    case 'RUNTIME_DEGRADED':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_RUNTIME_DEGRADED,
        lightweightModeActive: true,
        deepOrchestrationSuppressionActive: true,
        speculativeProcessingStopped: true,
        deepReflectionStopped: true,
        dashboardLowRefreshActive: true,
        cacheFirstModeActive: true,
        runtimeModeJa: 'deep orchestration suppression',
      };
    case 'RUNTIME_FRAGMENTED':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_RUNTIME_FRAGMENTED,
        runtimeRebuildSuggestionActive: true,
        cacheFirstModeActive: true,
        dashboardLowRefreshActive: true,
        runtimeModeJa: 'runtime rebuild suggestion',
      };
    case 'RUNTIME_OFFLINE':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_RUNTIME_OFFLINE,
        offlineSafeFallbackActive: true,
        websocketPauseActive: true,
        cacheFirstModeActive: true,
        dashboardLowRefreshActive: true,
        runtimeModeJa: 'offline-safe fallback — cached governance summary only',
      };
    case 'RUNTIME_CRITICAL':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_RUNTIME_CRITICAL,
        survivalModeActive: true,
        lightweightModeActive: true,
        deepOrchestrationSuppressionActive: true,
        offlineSafeFallbackActive: true,
        websocketPauseActive: true,
        cacheFirstModeActive: true,
        dashboardLowRefreshActive: true,
        speculativeProcessingStopped: true,
        deepReflectionStopped: true,
        runtimeModeJa: 'survival mode — dashboard-only minimal orchestration',
      };
    default:
      return base;
  }
}
