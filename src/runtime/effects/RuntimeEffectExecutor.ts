/**
 * Executes individual runtime effects — failures never propagate to kernel state.
 */
import { beginHydrationPauseWindow } from '../../services/hydrationCollisionGuard';
import {
  setDashboardCompactMode,
  setDashboardFpsCap,
  setMetricsSamplingRate,
} from '../../services/dashboardFrameStabilizer';
import {
  noteOfflineForDebounce,
  scheduleHeartbeatBackoff,
  scheduleWebsocketReconnectWithJitter,
  setWebsocketHeartbeatIntervalMs,
  setWebsocketLightweightMode,
} from '../../services/websocketStabilityGuard';
import { scheduleDedupedTimer } from '../../services/mobileRedmiRuntime';
import { setOrchestratorProactiveGates } from '../../services/productionStability/productionStabilityRuntime';
import { setAsyncConcurrentLimit } from '../../services/asyncRuntimeCoordinator';
import { persistTelemetryCycle } from '../../services/runtimeTelemetryStorage';
import { observeMemoryPressure } from '../orchestrator/memoryPressureGuardian';
import { runLongSessionSurvivabilityPass } from '../orchestrator/longSessionSurvivability';
import { applyAsyncSchedulerPolicy } from '../orchestrator/asyncPriorityScheduler';
import {
  shouldRedmiAggressiveRenderSuppression,
  shouldRedmiCompactFirstRecovery,
} from '../orchestrator/redmiOrchestratorGuard';
import { buildNativeDashboardExtension } from '../../native/runtime/nativeRuntimeIntegration';
import { recordLifecycleEvent } from '../../native/runtime/lifecycleTimeline';
import { setKernelGuardState } from '../kernel/runtimeKernelGuards';
import type {
  RuntimeEffect,
  RuntimeEffectTrace,
  DashboardPolicyPayload,
  WsPolicyPayload,
  WsReconnectJitterPayload,
  WsOfflineDebouncePayload,
  WsHeartbeatBackoffPayload,
  ProactiveGatesPayload,
  HydrationDeferPayload,
  TelemetryPersistPayload,
  NativeExtensionBuildPayload,
  ImminentKillPayload,
  LongSessionPassPayload,
  KernelGuardSyncPayload,
} from './RuntimeEffectTypes';
import type { RuntimeOrchestratorPolicy } from '../../types/runtimeOrchestrator';

export function executeRuntimeEffect(effect: RuntimeEffect): RuntimeEffectTrace {
  const started = Date.now();
  try {
    switch (effect.kind) {
      case 'KERNEL_GUARD_SYNC':
        setKernelGuardState((effect.payload as KernelGuardSyncPayload).guards);
        break;
      case 'DASHBOARD_POLICY': {
        const p = effect.payload as DashboardPolicyPayload;
        const compact = p.compact || shouldRedmiCompactFirstRecovery();
        setDashboardCompactMode(compact);
        setDashboardFpsCap(
          shouldRedmiAggressiveRenderSuppression() ? Math.min(p.maxFps, 10) : p.maxFps,
        );
        setMetricsSamplingRate(p.metricsSamplingRate);
        break;
      }
      case 'WS_HEARTBEAT_MS':
        setWebsocketHeartbeatIntervalMs((effect.payload as { heartbeatMs: number }).heartbeatMs);
        break;
      case 'WS_LIGHTWEIGHT_MODE':
        setWebsocketLightweightMode((effect.payload as WsPolicyPayload).lightweight);
        break;
      case 'WS_HEARTBEAT_BACKOFF':
        scheduleHeartbeatBackoff((effect.payload as WsHeartbeatBackoffPayload).intervalMs);
        break;
      case 'WS_RECONNECT_JITTER': {
        const r = effect.payload as WsReconnectJitterPayload;
        scheduleWebsocketReconnectWithJitter(r.baseMs, r.maxMs);
        break;
      }
      case 'WS_RECONNECT_DEFER': {
        const d = effect.payload as { baseMs: number };
        scheduleDedupedTimer('ws-reconnect-deferred', () => {}, d.baseMs);
        break;
      }
      case 'WS_OFFLINE_DEBOUNCE':
        noteOfflineForDebounce((effect.payload as WsOfflineDebouncePayload).durationMs);
        break;
      case 'WS_BATCH_MODE':
        if ((effect.payload as { enabled: boolean }).enabled) setWebsocketLightweightMode(true);
        break;
      case 'PROACTIVE_PAUSE':
      case 'PROACTIVE_COOLDOWN': {
        const g = effect.payload as ProactiveGatesPayload;
        setOrchestratorProactiveGates({
          pauseProactive: g.pauseProactive,
          throttleProactive: g.throttleProactive,
        });
        break;
      }
      case 'HYDRATION_DEFER': {
        const h = effect.payload as HydrationDeferPayload;
        beginHydrationPauseWindow();
        recordLifecycleEvent('hydration_start', h.reasonJa, true);
        break;
      }
      case 'HYDRATION_SERIALIZE':
        if ((effect.payload as { enabled: boolean }).enabled) beginHydrationPauseWindow();
        break;
      case 'QUEUE_COMPACTION':
        applyAsyncSchedulerPolicy((effect.payload as { policy: RuntimeOrchestratorPolicy }).policy);
        break;
      case 'SURVIVAL_MINIMAL_UI':
        if ((effect.payload as { enabled: boolean }).enabled) setDashboardCompactMode(true);
        break;
      case 'TELEMETRY_PERSIST': {
        const t = effect.payload as TelemetryPersistPayload;
        void persistTelemetryCycle({
          metrics: t.metrics,
          state: t.state,
          summaryJa: t.summaryJa,
          longSession: t.metrics.longSession,
        });
        break;
      }
      case 'MEMORY_PRESSURE_OBSERVE':
        observeMemoryPressure((effect.payload as { metrics: import('../../types/runtimeTelemetry').RuntimeTelemetryMetricsSnapshot }).metrics);
        break;
      case 'LONG_SESSION_PASS': {
        const l = effect.payload as LongSessionPassPayload;
        runLongSessionSurvivabilityPass(l.sessionMinutes, l.metrics);
        break;
      }
      case 'NATIVE_EXTENSION_BUILD': {
        const n = effect.payload as NativeExtensionBuildPayload;
        buildNativeDashboardExtension(n.metrics, n.sessionMinutes, n.orchEval);
        break;
      }
      case 'IMMINENT_KILL_MITIGATION': {
        const k = effect.payload as ImminentKillPayload;
        setOrchestratorProactiveGates({ pauseProactive: true, throttleProactive: true });
        setWebsocketLightweightMode(true);
        setAsyncConcurrentLimit(1);
        beginHydrationPauseWindow();
        recordLifecycleEvent('hydration_start', 'deferred — imminent kill risk', true);
        void persistTelemetryCycle({
          metrics: k.metrics,
          state: 'TELEMETRY_CRITICAL',
          summaryJa: 'IMMINENT kill risk — effect layer clamp',
          longSession: k.metrics.longSession,
        });
        break;
      }
      default:
        break;
    }
    return {
      effectId: effect.id,
      kind: effect.kind,
      status: 'ok',
      durationMs: Date.now() - started,
    };
  } catch (err) {
    return {
      effectId: effect.id,
      kind: effect.kind,
      status: 'failed',
      durationMs: Date.now() - started,
      errorJa: err instanceof Error ? err.message : 'effect failed',
    };
  }
}
