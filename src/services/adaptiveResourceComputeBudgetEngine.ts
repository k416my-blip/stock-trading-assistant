/**
 * Adaptive Resource & Compute Budget — mobile compute orchestration (paper only).
 */
import {
  BASE_REFRESH_MS,
  BATTERY_DOWNGRADE_FORMULA_JA,
  BATTERY_REFRESH_MULTIPLIER,
  COMPUTE_FLOW_STEPS_JA,
  EVENT_PRESSURE_FORMULA_JA,
  HIGH_VOLATILITY_REFRESH_MS,
  LAZY_LOADING_FLOW_JA,
  LAYER_SCHEDULE_TIER,
  MEMORY_CLEANUP_FLOW_JA,
  MEMORY_PRESSURE_QUEUE_THRESHOLD,
  RENDER_BUDGET_RESOURCE_FORMULA_JA,
  RESOURCE_FEATURE_LABELS,
  RESOURCE_REGULATORY_JA,
  SCHEDULER_FORMULA_JA,
  TRACE_COMPRESSION_FORMULA_JA,
} from '../constants/adaptiveResourceComputeBudget';
import type {
  AdaptiveResourceComputeBudgetBundle,
  BatteryResourceMode,
  BuildAdaptiveResourceComputeBudgetInput,
  MemoryPressureLevel,
  ResourceFeatureId,
  ResourceFeatureStatus,
  ScheduledIntelligenceLayerId,
  ThermalState,
} from '../types/adaptiveResourceComputeBudget';
import {
  appendComputeTimelinePoint,
  compressTracePayloadSize,
  issueGarbageCollectionHint,
  loadResourceBudgetState,
} from './adaptiveResourceComputeBudgetStorage';
import { getResourceRuntimeMetrics } from './adaptiveResourceComputeBudgetRuntime';

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function resolveMemoryLevel(
  memoryPressure: boolean,
  queueSize: number,
): { level: MemoryPressureLevel; pct: number } {
  if (!memoryPressure && queueSize < 30) return { level: 'low', pct: 15 };
  if (memoryPressure && queueSize < MEMORY_PRESSURE_QUEUE_THRESHOLD) {
    return { level: 'medium', pct: 45 };
  }
  if (memoryPressure && queueSize >= MEMORY_PRESSURE_QUEUE_THRESHOLD) {
    return { level: 'high', pct: 72 };
  }
  if (queueSize > 80) return { level: 'critical', pct: 90 };
  return { level: 'medium', pct: 50 };
}

function resolveBatteryMode(
  batterySaver: boolean,
  foreground: boolean,
  queueSize: number,
): { mode: BatteryResourceMode; labelJa: string } {
  if (batterySaver && (!foreground || queueSize > 40)) {
    return { mode: 'critical', labelJa: '省電力クリティカル' };
  }
  if (batterySaver) return { mode: 'saver', labelJa: '省電力' };
  return { mode: 'normal', labelJa: '通常' };
}

function resolveThermal(
  memoryPct: number,
  aiLoadPct: number,
  eventPressure: number,
): { state: ThermalState; labelJa: string } {
  if (memoryPct >= 85 || aiLoadPct >= 85 || eventPressure >= 80) {
    return { state: 'hot', labelJa: '発熱抑制中' };
  }
  if (memoryPct >= 60 || aiLoadPct >= 65 || eventPressure >= 55) {
    return { state: 'warm', labelJa: '温熱 — 負荷抑制' };
  }
  return { state: 'normal', labelJa: '正常' };
}

function computeEventPressure(input: BuildAdaptiveResourceComputeBudgetInput, memoryPct: number): number {
  const recompute = input.reactiveRecomputePerSec ?? 0;
  const dropped = input.reactiveDroppedTotal ?? 0;
  const queue = input.proactiveQueueSize;
  const raw =
    0.35 * recompute * 10 + 0.25 * Math.min(dropped, 20) + 0.2 * (queue / 60) + 0.2 * (memoryPct / 100);
  return clamp(raw * 100);
}

function computeAiLoadPct(input: BuildAdaptiveResourceComputeBudgetInput): number {
  const enabledCount = Object.values(input.layerEnabled).filter(Boolean).length;
  const base = enabledCount * 6;
  const queue = Math.min(30, input.proactiveQueueSize * 0.4);
  const blocked = Math.min(25, input.renderBudgetBlocked * 2);
  return clamp(base + queue + blocked);
}

function resolveActiveAndSleeping(
  input: BuildAdaptiveResourceComputeBudgetInput,
  ctx: {
    emergencyComputeCut: boolean;
    aiSleepMode: boolean;
    batteryMode: BatteryResourceMode;
    appForeground: boolean;
  },
): { active: string[]; sleeping: string[] } {
  const allLayers = Object.keys(LAYER_SCHEDULE_TIER) as ScheduledIntelligenceLayerId[];
  const active: string[] = [];
  const sleeping: string[] = [];

  for (const id of allLayers) {
    const enabled = input.layerEnabled[id] !== false;
    if (!enabled) {
      sleeping.push(id);
      continue;
    }
    const tier = LAYER_SCHEDULE_TIER[id];
    let runs = true;
    if (ctx.emergencyComputeCut && tier !== 'critical') runs = false;
    else if (ctx.aiSleepMode && (tier === 'normal' || tier === 'low')) runs = false;
    else if (!ctx.appForeground && (tier === 'normal' || tier === 'low')) runs = false;
    else if (ctx.batteryMode === 'critical' && tier === 'low') runs = false;

    if (runs) active.push(id);
    else sleeping.push(id);
  }
  return { active, sleeping };
}

function computeResourceHealth(
  input: BuildAdaptiveResourceComputeBudgetInput,
  memoryPct: number,
  eventPressure: number,
  thermal: ThermalState,
): number {
  let score = 100;
  if (input.renderBudgetBlocked > 5) score -= 10;
  if (memoryPct > 70) score -= 15;
  if (eventPressure > 60) score -= 12;
  if (thermal === 'hot') score -= 18;
  if (thermal === 'warm') score -= 8;
  if (!input.appForeground && input.proactiveQueueSize > 30) score -= 6;
  if (input.offlineMode) score -= 5;
  return clamp(score);
}

function adaptiveRefreshMs(input: BuildAdaptiveResourceComputeBudgetInput): number {
  let ms = BASE_REFRESH_MS;
  if (input.marketVolatilityHigh) ms = HIGH_VOLATILITY_REFRESH_MS;
  if (input.batterySaverEnabled) ms = Math.round(ms * BATTERY_REFRESH_MULTIPLIER);
  if (!input.appForeground) ms = Math.round(ms * 2.5);
  if (input.memoryPressure) ms = Math.round(ms * 1.4);
  return ms;
}

function buildFeatureStatuses(
  partial: Omit<AdaptiveResourceComputeBudgetBundle, 'featureStatuses'>,
  input: BuildAdaptiveResourceComputeBudgetInput,
): ResourceFeatureStatus[] {
  const s = (
    id: ResourceFeatureId,
    ok: boolean,
    watch: boolean,
    detail: string,
  ): ResourceFeatureStatus => ({
    id,
    labelJa: RESOURCE_FEATURE_LABELS[id],
    statusJa: ok ? 'ok' : watch ? 'watch' : 'critical',
    detailJa: detail,
  });

  const metrics = getResourceRuntimeMetrics();

  return [
    s('compute_budget_engine', partial.computeBudgetRemainingPct > 20, partial.computeBudgetRemainingPct < 10, `${partial.computeBudgetRemainingPct}%`),
    s('dynamic_layer_scheduler', partial.activeLayers.length >= 4, partial.sleepingLayers.length > 8, `${partial.activeLayers.length} active`),
    s('priority_based_rendering', partial.renderCostScore < 70, partial.renderCostScore >= 70, `cost ${partial.renderCostScore}`),
    s('adaptive_refresh_rate', true, partial.adaptiveRefreshIntervalMs > 45_000, `${partial.adaptiveRefreshIntervalMs}ms`),
    s('background_downgrade', input.appForeground || partial.sleepingLayers.length < 6, !input.appForeground, input.appForeground ? 'fg' : 'bg downgrade'),
    s('battery_aware_ai', partial.batteryMode === 'normal', partial.batteryMode !== 'normal', partial.batteryModeJa),
    s('thermal_protection', partial.thermalState === 'normal', partial.thermalState === 'warm', partial.thermalStateJa),
    s('memory_pressure_detector', partial.memoryPressureLevel === 'low', partial.memoryPressureLevel === 'high', partial.memoryPressureLevel),
    s('garbage_collection_hint', true, false, 'GC hint ready'),
    s('trace_compression', !partial.explainabilitySamplingActive, partial.explainabilitySamplingActive, `${partial.traceCompressionRatioPct}%`),
    s('incremental_replay', partial.replaySizeBytes > 0, false, `${partial.replaySizeBytes}B`),
    s('snapshot_deduplication', true, false, 'fingerprint dedupe'),
    s('ai_sleep_mode', !partial.aiSleepMode, partial.aiSleepMode, partial.aiSleepMode ? 'sleep' : 'wake'),
    s('emergency_compute_cut', !partial.emergencyComputeCut, partial.emergencyComputeCut, partial.emergencyComputeCut ? 'cut' : 'ok'),
    s('render_priority_queue', input.renderBudgetInFlight < input.renderBudgetMax, input.renderBudgetBlocked > 3, `${input.renderBudgetInFlight}/${input.renderBudgetMax}`),
    s('visibility_aware_rendering', !partial.visibilityPaused, partial.visibilityPaused, partial.visibilityPaused ? 'paused' : 'active'),
    s('lazy_intelligence_loading', partial.sleepingLayers.length > 0, false, `${partial.sleepingLayers.length} sleep`),
    s('progressive_hydration', true, false, 'tier order'),
    s('bundle_fragmentation', true, false, 'slim bundles'),
    s('smart_cache_expiry', partial.traceSizeBytes < 50_000, partial.traceSizeBytes >= 50_000, `${partial.traceSizeBytes}B`),
    s('ai_tick_throttling', metrics.aiTickThrottles < 10, metrics.aiTickThrottles >= 5, `${metrics.aiTickThrottles}`),
    s('event_pressure_score', partial.eventPressureScore < 55, partial.eventPressureScore >= 70, `${partial.eventPressureScore}`),
    s('adaptive_debounce', true, input.batterySaverEnabled, 'battery×2'),
    s('predictive_precompute', input.marketVolatilityHigh === true, false, 'volatility precompute'),
    s('offline_lightweight_mode', !input.offlineMode, input.offlineMode, input.offlineMode ? 'offline' : 'online'),
    s('explainability_sampling', !partial.explainabilitySamplingActive, partial.explainabilitySamplingActive, 'trace sample'),
    s('render_cost_scoring', partial.renderCostScore < 60, partial.renderCostScore >= 60, `${partial.renderCostScore}`),
    s('resource_health_score', partial.resourceHealthScore >= 60, partial.resourceHealthScore < 50, `${partial.resourceHealthScore}`),
    s('compute_timeline', partial.computeTimeline.length > 0, false, `${partial.computeTimeline.length} pts`),
    s('resource_dashboard', true, false, 'panel'),
  ];
}

export async function buildAdaptiveResourceComputeBudgetBundle(
  input: BuildAdaptiveResourceComputeBudgetInput,
): Promise<AdaptiveResourceComputeBudgetBundle> {
  const persisted = await loadResourceBudgetState();
  const runtime = getResourceRuntimeMetrics();

  const memory = resolveMemoryLevel(input.memoryPressure, input.proactiveQueueSize);
  const battery = resolveBatteryMode(
    input.batterySaverEnabled,
    input.appForeground,
    input.proactiveQueueSize,
  );
  const aiLoadPct = computeAiLoadPct(input);
  const eventPressureScore = computeEventPressure(input, memory.pct);
  const thermal = resolveThermal(memory.pct, aiLoadPct, eventPressureScore);

  const resourceHealthScore = computeResourceHealth(
    input,
    memory.pct,
    eventPressureScore,
    thermal.state,
  );
  const emergencyComputeCut = resourceHealthScore < 40 || thermal.state === 'hot';
  const aiSleepMode =
    battery.mode !== 'normal' || !input.appForeground || eventPressureScore > 65;

  const { active, sleeping } = resolveActiveAndSleeping(input, {
    emergencyComputeCut,
    aiSleepMode,
    batteryMode: battery.mode,
    appForeground: input.appForeground,
  });

  const traceLen = input.traceJsonLength ?? persisted.traceBytesEstimate;
  const traceCompress = compressTracePayloadSize(traceLen);
  const replayCount = input.replayEntryCount ?? persisted.replayEntryCount;

  const computeBudgetRemainingPct =
    input.renderBudgetMax > 0
      ? clamp(((input.renderBudgetMax - input.renderBudgetInFlight) / input.renderBudgetMax) * 100)
      : 0;

  const renderCostScore = clamp(
    runtime.renderCostScore +
      input.renderBudgetBlocked * 3 +
      (input.renderBudgetInFlight >= input.renderBudgetMax ? 20 : 0),
  );

  const timelinePoint = {
    at: new Date().toISOString(),
    cpuLoadPct: aiLoadPct,
    memoryPressurePct: memory.pct,
    aiLoadPct,
  };
  await appendComputeTimelinePoint(timelinePoint);
  if (memory.pct >= 70 || traceCompress.samplingActive) {
    await issueGarbageCollectionHint();
  }

  const partial: Omit<AdaptiveResourceComputeBudgetBundle, 'featureStatuses'> = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: RESOURCE_REGULATORY_JA,
    paperTradingOnly: true,
    resourceHealthScore,
    healthLabelJa:
      resourceHealthScore >= 75 ? '端末余裕あり' : resourceHealthScore >= 50 ? '負荷抑制中' : '緊急遮断モード',
    renderBudgetInFlight: input.renderBudgetInFlight,
    renderBudgetMax: input.renderBudgetMax,
    renderBudgetBlocked: input.renderBudgetBlocked,
    aiLoadPct,
    memoryPressureLevel: memory.level,
    memoryPressurePct: memory.pct,
    batteryMode: battery.mode,
    batteryModeJa: battery.labelJa,
    thermalState: thermal.state,
    thermalStateJa: thermal.labelJa,
    activeLayers: active,
    sleepingLayers: sleeping,
    throttledEvents: runtime.throttledEvents + runtime.aiTickThrottles,
    droppedRecomputes: runtime.droppedRecomputes + (input.reactiveDroppedTotal ?? 0),
    traceSizeBytes: traceCompress.compressedLength,
    replaySizeBytes: replayCount * 280,
    eventPressureScore,
    adaptiveRefreshIntervalMs: adaptiveRefreshMs(input),
    aiSleepMode,
    emergencyComputeCut,
    visibilityPaused: runtime.visibilityPaused || !input.appForeground,
    offlineLightweight: input.offlineMode,
    explainabilitySamplingActive: traceCompress.samplingActive,
    traceCompressionRatioPct: traceCompress.ratioPct,
    renderCostScore,
    computeBudgetRemainingPct,
    schedulerFormulaJa: SCHEDULER_FORMULA_JA,
    renderBudgetFormulaJa: RENDER_BUDGET_RESOURCE_FORMULA_JA,
    eventPressureFormulaJa: EVENT_PRESSURE_FORMULA_JA,
    batteryDowngradeFormulaJa: BATTERY_DOWNGRADE_FORMULA_JA,
    traceCompressionFormulaJa: TRACE_COMPRESSION_FORMULA_JA,
    computeFlowJa: [...COMPUTE_FLOW_STEPS_JA],
    memoryCleanupFlowJa: [...MEMORY_CLEANUP_FLOW_JA],
    lazyLoadingFlowJa: [...LAZY_LOADING_FLOW_JA],
    computeTimeline: [...persisted.computeTimeline, timelinePoint].slice(-24),
    resourceSummaryJa: [
      `健全性 ${resourceHealthScore}/100 · AI負荷 ${aiLoadPct}%`,
      `render ${input.renderBudgetInFlight}/${input.renderBudgetMax} · イベント圧力 ${eventPressureScore}`,
      `sleep ${sleeping.length} · throttle ${runtime.throttledEvents}`,
      emergencyComputeCut ? '緊急計算遮断' : aiSleepMode ? 'AIスリープ' : '通常スケジュール',
    ].join(' — '),
    explainRuleBasisJa:
      '端末スナップショット + Reactive metrics + trace サイズから予算を合成。取引執行は行いません。',
  };

  const featureStatuses = buildFeatureStatuses(partial, input);
  return { ...partial, featureStatuses };
}
