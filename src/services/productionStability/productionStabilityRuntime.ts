/**
 * Production Stability Layer — 統合ランタイム
 */
import { AppState, type AppStateStatus } from 'react-native';
import {
  LONG_SESSION_TEST_MINUTES,
  LONG_SESSION_WARN_MINUTES,
} from '../../constants/productionStability';
import type {
  ProductionStabilityBundle,
  ProductionStabilitySnapshot,
} from '../../types/productionStability';
import type { ApiCostDashboard } from '../../types/performanceCost';
import type { PerformanceCostRuntimeSnapshot } from '../../types/performanceCost';
import { buildApiCostDashboard } from '../apiCostTracker';
import {
  getPerformanceCostSnapshot,
  registerNetworkFailureHook,
  shouldPauseApiRequests,
} from '../performanceCostRuntime';
import { registerListener } from './resourceRegistry';
import { getAllCircuitStatuses } from './apiCircuitBreaker';
import {
  getEmergencySafeModeLevel,
  getEmergencySafeModeReasonJa,
  recomputeEmergencySafeMode,
} from './emergencySafeMode';
import {
  canSpendOpenAiTokens,
  getTokenBudgetSummaryJa,
  getOpenAiTokensUsed24h,
  getXCallsUsed24h,
} from './tokenBudget';
import { isCircuitOpen } from './apiCircuitBreaker';
import { runOfflineRecoverySync, markOfflinePending } from './offlineRecovery';
import { forceEmergencyLevel } from './emergencySafeMode';
import { getNotificationFloodBlockedCount, getLastQueueTrimmedCount } from './queueGuards';
import { getStaleAsyncBlockedCount } from './asyncRaceGuard';
import { getRenderBudgetBlockedCount } from './renderBudget';
import { getEffectLoopWarnings } from './effectLoopDetector';
import { getProfilerMetrics } from './productionProfiler';
import { buildStateAuditFindings } from './stateAudit';
import { isOfflineRecoveryPending } from './offlineRecovery';
import { getDebugLogCount } from './debugConsole';
import { runProductionReadinessChecklist, DEPENDENCY_AUDIT_HINTS_JA } from './productionReadiness';
import { getResourceRegistryCounts } from './resourceRegistry';
import { productionDebugLog } from './debugConsole';
import { runStorageIntegrityCheck } from './storageIntegrity';
import { verboseLog } from '../productionLogger';

type Listener = (snap: ProductionStabilitySnapshot) => void;

const listeners = new Set<Listener>();
const flushHandlers = new Set<() => void | Promise<void>>();

let proactiveQueueSize = 0;
let proactiveRefreshCount = 0;
let runtimeOverlay: PerformanceCostRuntimeSnapshot | null = null;
let costOverlay: ApiCostDashboard | null = null;
let initDone = false;
let orchestratorPauseProactive = false;
let orchestratorThrottleProactive = false;

export function subscribeProductionStability(listener: Listener): () => void {
  listeners.add(listener);
  listener(buildSnapshot());
  return () => listeners.delete(listener);
}

function emit(): void {
  const snap = buildSnapshot();
  for (const l of listeners) l(snap);
}

export function buildSnapshot(): ProductionStabilitySnapshot {
  recomputeEmergencySafeMode();
  const resources = getResourceRegistryCounts();
  const emergency = getEmergencySafeModeLevel();
  return {
    generatedAt: new Date().toISOString(),
    emergencyLevel: emergency,
    emergencyReasonJa: getEmergencySafeModeReasonJa(),
    backgroundAiPaused: shouldPauseConciergeAi(),
    circuits: getAllCircuitStatuses(),
    tokenBudgetJa: getTokenBudgetSummaryJa(),
    openAiTokensUsed24h: getOpenAiTokensUsed24h(),
    xCallsUsed24h: getXCallsUsed24h(),
    proactiveQueueSize,
    proactiveQueueTrimmed: getLastQueueTrimmedCount(),
    notificationFloodBlocked: getNotificationFloodBlockedCount(),
    staleAsyncResponsesBlocked: getStaleAsyncBlockedCount(),
    renderBudgetBlocked: getRenderBudgetBlockedCount(),
    effectLoopWarnings: getEffectLoopWarnings(),
    stateAuditFindings: buildStateAuditFindings({
      proactiveRefreshCount,
      contextProviderCount: 7,
    }),
    profiler: getProfilerMetrics(),
    registeredIntervals: resources.intervals,
    registeredListeners: resources.listeners,
    offlineRecoveryPending: isOfflineRecoveryPending(),
    runtime: runtimeOverlay ?? getPerformanceCostSnapshot(),
    costDashboard: costOverlay ?? buildApiCostDashboard(),
    debugLogCount: getDebugLogCount(),
  };
}

export function setOrchestratorProactiveGates(input: {
  pauseProactive: boolean;
  throttleProactive: boolean;
}): void {
  orchestratorPauseProactive = input.pauseProactive;
  orchestratorThrottleProactive = input.throttleProactive;
  emit();
}

/** バックグラウンド / オフライン / 緊急モード時は AI 処理を止める */
export function shouldPauseConciergeAi(): boolean {
  if (shouldPauseApiRequests()) return true;
  const level = getEmergencySafeModeLevel();
  if (level >= 2) return true;
  return orchestratorPauseProactive;
}

/** レベル1+: 自発刷新間隔を延ばす */
export function shouldThrottleConciergeAi(): boolean {
  return (
    getEmergencySafeModeLevel() >= 1 ||
    shouldPauseConciergeAi() ||
    orchestratorThrottleProactive
  );
}

export function shouldAllowOpenAiRequest(estimatedTokens = 800): boolean {
  if (shouldPauseConciergeAi()) return false;
  if (!canSpendOpenAiTokens(estimatedTokens)) {
    recomputeEmergencySafeMode();
    return false;
  }
  return !isCircuitOpen('openai');
}

export function setProactiveQueueMetrics(size: number): void {
  proactiveQueueSize = size;
  emit();
}

export function noteProactiveRefresh(): void {
  proactiveRefreshCount += 1;
  if (proactiveRefreshCount > 1000) proactiveRefreshCount = 0;
}

export function setStabilityRuntimeOverlay(
  runtime: PerformanceCostRuntimeSnapshot | null,
  cost: ApiCostDashboard | null,
): void {
  runtimeOverlay = runtime;
  costOverlay = cost;
  emit();
}

export function registerCrashSafeFlush(handler: () => void | Promise<void>): () => void {
  flushHandlers.add(handler);
  return () => flushHandlers.delete(handler);
}

async function flushCrashSafePersistence(): Promise<void> {
  productionDebugLog('crash-safe flush', 'info');
  for (const h of flushHandlers) {
    try {
      await h();
    } catch {
      /* ignore */
    }
  }
}

export async function buildProductionStabilityBundle(): Promise<ProductionStabilityBundle> {
  const snapshot = buildSnapshot();
  const readiness = await runProductionReadinessChecklist();
  const uptime = snapshot.profiler.sessionUptimeMinutes;
  let longSessionNoteJa = `セッション ${uptime} 分`;
  if (uptime >= LONG_SESSION_TEST_MINUTES) {
    longSessionNoteJa += ' — 長時間安定テスト範囲（6h）';
  } else if (uptime >= LONG_SESSION_WARN_MINUTES) {
    longSessionNoteJa += ' — メモリ・キューを監視推奨（2h+）';
  }

  return {
    snapshot,
    readiness,
    longSessionNoteJa,
    dependencyHintsJa: [...DEPENDENCY_AUDIT_HINTS_JA],
  };
}

export function recordUiCrash(message: string): void {
  productionDebugLog(`UI crash: ${message}`, 'error');
  forceEmergencyLevel(2, 'UI例外 — AIを段階停止');
  emit();
}

export { markOfflinePending };

export function initProductionStabilityRuntime(): void {
  if (initDone) return;
  initDone = true;

  registerListener(
    AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        void flushCrashSafePersistence();
      }
      if (next === 'active') {
        void runOfflineRecoverySync();
      }
      emit();
    }).remove,
    'app-state-stability',
  );

  void runStorageIntegrityCheck().then((r) => {
    if (!r.ok) productionDebugLog(`storage corrupt: ${r.corrupted.join(',')}`, 'warn');
  });

  registerNetworkFailureHook(() => markOfflinePending());

  void import('../systemStabilityIntegrityIntegration').then((m) => m.initSystemStabilityIntegrity());
  void import('../reactiveEventOrchestrationIntegration').then((m) =>
    m.initReactiveEventOrchestration(),
  );

  verboseLog('[production] stability runtime init');
  emit();
}

export function resetProductionStabilityRuntimeForTest(): void {
  initDone = false;
  proactiveQueueSize = 0;
  proactiveRefreshCount = 0;
  runtimeOverlay = null;
  costOverlay = null;
  orchestratorPauseProactive = false;
  orchestratorThrottleProactive = false;
  flushHandlers.clear();
  listeners.clear();
}

export { recomputeEmergencySafeMode };
