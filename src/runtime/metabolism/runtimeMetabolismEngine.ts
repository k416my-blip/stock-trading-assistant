/**
 * Runtime Metabolism Engine — evaluates obsolete state and runs GC passes.
 */
import type { MetabolismGcMode } from '../../types/runtimeMetabolism';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import type { PerformanceCostRuntimeSnapshot } from '../../types/performanceCost';
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { METABOLISM_GC_COOLDOWN_MS, LIGHT_GC_COOLDOWN_MS } from '../../constants/runtimeMetabolism';
import { getConstitutionalDirectives } from '../constitution/runtimeConstitutionIntegration';
import { getConstitutionalState } from '../constitution/runtimeConstitutionCoordinator';
import { getLastGcAtMs, markGcCompleted } from './metabolismStorage';
import { getSessionMinutes } from '../../services/longSessionStability';

export type RedmiMetabolismContext = {
  gcMode: MetabolismGcMode;
  tombstoneOnly: boolean;
  lightOnly: boolean;
  deferGc: boolean;
  sessionMinutes: number;
  nextGcReason: string;
};

export function resolveRedmiMetabolismContext(
  metrics: RuntimeTelemetryMetricsSnapshot,
  performance: PerformanceCostRuntimeSnapshot,
): RedmiMetabolismContext {
  const sessionMinutes = getSessionMinutes();
  const constitution = getConstitutionalDirectives();
  const constState = getConstitutionalState();

  if (constState === 'CONSTITUTIONAL_CRISIS' || constitution.replayFreeze) {
    return {
      gcMode: 'frozen',
      tombstoneOnly: false,
      lightOnly: false,
      deferGc: true,
      sessionMinutes,
      nextGcReason: 'constitutional freeze — GC deferred',
    };
  }

  if (!performance.appForeground) {
    return {
      gcMode: 'deferred',
      tombstoneOnly: false,
      lightOnly: false,
      deferGc: true,
      sessionMinutes,
      nextGcReason: 'background — deep GC prohibited',
    };
  }

  const thermalHigh =
    metrics.thermalState === 'severe' ||
    metrics.thermalState === 'critical' ||
    metrics.native.thermalThrottlingDetected;

  if (thermalHigh) {
    return {
      gcMode: 'deferred',
      tombstoneOnly: false,
      lightOnly: false,
      deferGc: true,
      sessionMinutes,
      nextGcReason: 'thermal high — GC deferred',
    };
  }

  if (performance.batterySaverActive || metrics.native.batterySaverActive) {
    return {
      gcMode: 'tombstone_only',
      tombstoneOnly: true,
      lightOnly: true,
      deferGc: false,
      sessionMinutes,
      nextGcReason: 'battery saver — tombstone only',
    };
  }

  const now = Date.now();
  const sinceGc = now - getLastGcAtMs();
  if (sinceGc < LIGHT_GC_COOLDOWN_MS) {
    return {
      gcMode: 'light',
      tombstoneOnly: false,
      lightOnly: true,
      deferGc: false,
      sessionMinutes,
      nextGcReason: 'foreground light GC',
    };
  }

  if (sinceGc < METABOLISM_GC_COOLDOWN_MS) {
    return {
      gcMode: 'light',
      tombstoneOnly: false,
      lightOnly: true,
      deferGc: true,
      sessionMinutes,
      nextGcReason: 'cooldown — light only',
    };
  }

  return {
    gcMode: 'standard',
    tombstoneOnly: false,
    lightOnly: false,
    deferGc: false,
    sessionMinutes,
    nextGcReason: sessionMinutes >= 120 ? '120m session deep metabolism' : 'standard foreground GC',
  };
}

export function runMetabolismEnginePass(
  store: AdaptiveRuntimeLearningState,
  metrics: RuntimeTelemetryMetricsSnapshot,
  performance: PerformanceCostRuntimeSnapshot,
  runners: {
    runGc: (ctx: RedmiMetabolismContext) => void;
  },
): RedmiMetabolismContext {
  const ctx = resolveRedmiMetabolismContext(metrics, performance);
  if (!ctx.deferGc) {
    runners.runGc(ctx);
    markGcCompleted();
  }
  return ctx;
}
