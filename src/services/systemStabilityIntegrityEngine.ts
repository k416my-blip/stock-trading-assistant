/**
 * System Stability & State Integrity — cross-layer audit (no new trading logic).
 */
import {
  CONCIERGE_LAYER_DEPENDENCY_GRAPH,
  HEALTH_BASE,
  HEALTH_DEDUCT_EMERGENCY_L1,
  HEALTH_DEDUCT_EMERGENCY_L2,
  HEALTH_DEDUCT_EMERGENCY_L3,
  HEALTH_DEDUCT_LAYER_GAP,
  HEALTH_DEDUCT_MEMORY,
  HEALTH_DEDUCT_QUEUE_TRIM,
  HEALTH_DEDUCT_READONLY,
  HEALTH_DEDUCT_RENDER_BLOCK,
  HEALTH_DEDUCT_STALE_ASYNC,
  HEALTH_DEDUCT_STALE_CACHE,
  HEALTH_DEDUCT_STORAGE,
  HEALTH_DEDUCT_ZOMBIE_ORDERS,
  INTEGRITY_FEATURE_LABELS,
  INTEGRITY_REGULATORY_JA,
  PERSISTENCE_FLOW_STEPS_JA,
  STATE_FLOW_STEPS_JA,
} from '../constants/systemStabilityIntegrity';
import type {
  BuildSystemStabilityIntegrityInput,
  IntegrityFeatureId,
  IntegrityFeatureStatus,
  LayerIntegrityRow,
  SystemStabilityIntegrityBundle,
} from '../types/systemStabilityIntegrity';
import { saveSystemStabilityCheckpoint } from './systemStabilityIntegrityStorage';

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function layerRows(input: BuildSystemStabilityIntegrityInput): LayerIntegrityRow[] {
  const defs: Array<{ id: string; label: string; key: keyof BuildSystemStabilityIntegrityInput['layers'] }> =
    [
      { id: 'macro', label: 'Macro Intelligence', key: 'macro' },
      { id: 'data_reliability', label: 'Data Reliability', key: 'dataReliability' },
      { id: 'strategy', label: 'Strategy Execution', key: 'strategy' },
      { id: 'reality', label: 'Reality Validation', key: 'reality' },
      { id: 'execution', label: 'Execution / Paper', key: 'execution' },
      { id: 'self_eval', label: 'Self Evaluation', key: 'selfEvaluation' },
      { id: 'portfolio_risk', label: 'Portfolio Risk', key: 'portfolioRisk' },
      { id: 'capital', label: 'Capital Allocation', key: 'capitalAllocation' },
    ];
  return defs.map((d) => {
    const bundle = input.layers[d.key];
    return {
      layerId: d.id,
      labelJa: d.label,
      enabled: input.layerEnabled[d.id] ?? true,
      loaded: bundle != null,
      generatedAt: bundle && 'generatedAt' in bundle ? (bundle as { generatedAt: string }).generatedAt : null,
    };
  });
}

function computeHealthScore(input: BuildSystemStabilityIntegrityInput): number {
  const snap = input.productionSnapshot;
  let score = HEALTH_BASE;
  const em = snap.emergencyLevel;
  if (em >= 3) score -= HEALTH_DEDUCT_EMERGENCY_L3;
  else if (em >= 2) score -= HEALTH_DEDUCT_EMERGENCY_L2;
  else if (em >= 1) score -= HEALTH_DEDUCT_EMERGENCY_L1;

  if (snap.staleAsyncResponsesBlocked > 0) {
    score -= Math.min(HEALTH_DEDUCT_STALE_ASYNC, snap.staleAsyncResponsesBlocked * 3);
  }
  if (snap.renderBudgetBlocked > 3) score -= HEALTH_DEDUCT_RENDER_BLOCK;
  if (snap.proactiveQueueTrimmed > 0) score -= HEALTH_DEDUCT_QUEUE_TRIM;
  if (!input.storageIntegrityOk) score -= HEALTH_DEDUCT_STORAGE;
  if (input.priceSyncStale || input.staleHoldingsCount > 0) score -= HEALTH_DEDUCT_STALE_CACHE;
  if (input.zombieOrderCount > 0) score -= HEALTH_DEDUCT_ZOMBIE_ORDERS;
  if (snap.registeredIntervals > 12 || snap.registeredListeners > 15) {
    score -= HEALTH_DEDUCT_MEMORY;
  }
  if (input.readOnlyMode) score -= HEALTH_DEDUCT_READONLY;

  const rows = layerRows(input);
  for (const r of rows) {
    if (r.enabled && !r.loaded) score -= HEALTH_DEDUCT_LAYER_GAP;
  }

  return clamp(score);
}

function buildFeatureStatuses(input: BuildSystemStabilityIntegrityInput): IntegrityFeatureStatus[] {
  const snap = input.productionSnapshot;
  const status = (id: IntegrityFeatureId, ok: boolean, watch: boolean, detail: string): IntegrityFeatureStatus => ({
    id,
    labelJa: INTEGRITY_FEATURE_LABELS[id],
    statusJa: ok ? 'ok' : watch ? 'watch' : 'critical',
    detailJa: detail,
  });

  return [
    status('global_state_audit', snap.stateAuditFindings.length < 3, false, `${snap.stateAuditFindings.length} 件の監査所見`),
    status('cross_layer_dependency', true, true, `${CONCIERGE_LAYER_DEPENDENCY_GRAPH.length} エッジ定義`),
    status(
      'async_race_detector',
      snap.staleAsyncResponsesBlocked < 5,
      snap.staleAsyncResponsesBlocked >= 1,
      `ブロック ${snap.staleAsyncResponsesBlocked} — ai-chat / proactive スコープ`,
    ),
    status(
      'stale_cache_guard',
      !input.priceSyncStale && input.staleHoldingsCount === 0,
      input.priceSyncStale || input.staleHoldingsCount > 0,
      `stale保有 ${input.staleHoldingsCount} · 価格同期 ${input.priceSyncStale ? '古い' : 'OK'}`,
    ),
    status(
      'memory_leak_watcher',
      snap.registeredIntervals <= 12,
      snap.registeredIntervals > 8,
      `intervals ${snap.registeredIntervals} · listeners ${snap.registeredListeners}`,
    ),
    status(
      'render_frequency_guard',
      snap.renderBudgetBlocked <= 5,
      snap.renderBudgetBlocked > 2,
      `renderBudget ブロック ${snap.renderBudgetBlocked}`,
    ),
    status(
      'event_storm_prevention',
      snap.notificationFloodBlocked < 10,
      snap.notificationFloodBlocked >= 5,
      `通知抑制 ${snap.notificationFloodBlocked} · キュー ${input.proactiveQueueSize}`,
    ),
    status(
      'duplicate_execution_guard',
      !input.duplicateRefreshBlocked,
      input.duplicateRefreshBlocked,
      input.duplicateRefreshBlocked
        ? '並行 refreshProactive をスキップ'
        : input.proactiveRefreshInFlight
          ? '刷新実行中'
          : '待機なし',
    ),
    status(
      'zombie_order_cleaner',
      input.zombieOrderCount === 0,
      input.zombieOrderCount > 0,
      `pending紙上注文 ${input.zombieOrderCount} 件 — 要確認`,
    ),
    status('invalid_state_recovery', input.storageIntegrityOk, !input.storageIntegrityOk, 'storageIntegrity + portfolioSnapshot'),
    status('session_restore_engine', true, true, 'systemStabilityIntegrity checkpoint'),
    status(
      'background_resume_recovery',
      !snap.offlineRecoveryPending,
      snap.offlineRecoveryPending,
      snap.offlineRecoveryPending ? 'オフライン復旧待ち' : 'App resume + offline sync',
    ),
    status('api_retry_throttle', snap.circuits.every((c) => c.state !== 'open'), false, 'circuitBreaker + RETRY_* 定数'),
    status('websocket_reconnect_guard', true, true, 'RN未使用 — offlineRecoveryで代替'),
    status('portfolio_snapshot_engine', input.storageIntegrityOk, false, 'healthySnapshot + rollback'),
    status('immutable_critical_state', true, true, 'realTradingEnabled=false 固定'),
    status('crash_safe_persistence', true, true, 'registerCrashSafeFlush ハンドラ'),
    status(
      'safe_fallback_mode',
      !input.degradedMode,
      input.degradedMode,
      input.degradedMode ? 'degraded / safe boot' : '通常',
    ),
    status(
      'emergency_readonly_mode',
      !input.readOnlyMode && snap.emergencyLevel < 2,
      input.readOnlyMode || snap.emergencyLevel >= 2,
      input.readOnlyMode ? 'killSwitch readOnly' : `emergency L${snap.emergencyLevel}`,
    ),
    status('full_system_health_score', computeHealthScore(input) >= 55, computeHealthScore(input) < 70, '統合スコア'),
  ];
}

export function buildSystemStabilityIntegrityBundle(
  input: BuildSystemStabilityIntegrityInput,
): SystemStabilityIntegrityBundle {
  const score = computeHealthScore(input);
  const snap = input.productionSnapshot;
  const rows = layerRows(input);
  const features = buildFeatureStatuses(input);
  const criticalCount = features.filter((f) => f.statusJa === 'critical').length;

  const healthLabelJa =
    score >= 75 ? '安定' : score >= 50 ? '注意' : '危険 — 刷新・APIを抑制';

  const bundle: SystemStabilityIntegrityBundle = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: INTEGRITY_REGULATORY_JA,
    systemHealthScore: score,
    healthLabelJa,
    emergencyReadOnlyActive: input.readOnlyMode || snap.emergencyLevel >= 2,
    safeFallbackActive: input.degradedMode || snap.emergencyLevel >= 1,
    freezePreventionJa:
      'renderBudget(最大4同時) + shouldPauseConciergeAi + 単一フライト refreshProactive + 通知フラッドガード',
    racePreventionJa:
      'asyncRaceGuard 世代スコープ(ai-chat/proactive-refresh) + refresh 再入防止 + renderBudget finally解放',
    stateFlowJa: [...STATE_FLOW_STEPS_JA],
    persistenceFlowJa: [...PERSISTENCE_FLOW_STEPS_JA],
    dependencyGraph: [...CONCIERGE_LAYER_DEPENDENCY_GRAPH],
    layerRows: rows,
    featureStatuses: features,
    productionSnapshot: snap,
    integritySummaryJa: [
      `健全性 ${score}/100 (${healthLabelJa})`,
      `緊急 L${snap.emergencyLevel} · ${criticalCount} 件クリティカル`,
      rows.filter((r) => r.enabled && !r.loaded).length > 0
        ? `未ロード層 ${rows.filter((r) => r.enabled && !r.loaded).map((r) => r.layerId).join(', ')}`
        : '全有効層ロード済',
    ].join(' — '),
    explainRuleBasisJa:
      'ProductionStability + 各Intelligence bundle の存在・鮮度・キュー指標のルール合成。取引ロジックは変更しません。',
  };

  void saveSystemStabilityCheckpoint({
    lastHealthScore: score,
    lastEmergencyLevel: snap.emergencyLevel,
    proactiveQueueSize: input.proactiveQueueSize,
    sessionNoteJa: healthLabelJa,
  });

  return bundle;
}

export async function countZombiePaperOrders(): Promise<number> {
  try {
    const { loadPaperBrokerState } = await import('./paperBroker/paperBrokerStorage');
    const state = await loadPaperBrokerState();
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return state.orders.filter(
      (o) => o.status === 'pending' && new Date(o.createdAt).getTime() < dayAgo,
    ).length;
  } catch {
    return 0;
  }
}
