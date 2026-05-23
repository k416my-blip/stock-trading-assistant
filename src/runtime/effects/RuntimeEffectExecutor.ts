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
  setWebsocketHeartbeatIntervalMs,
  setWebsocketLightweightMode,
} from '../../services/websocketStabilityGuard';
import { scheduleDedupedTimer } from '../../services/mobileRedmiRuntime';
import { setOrchestratorProactiveGates } from '../../services/productionStability/productionStabilityRuntime';
import { setAsyncConcurrentLimit } from '../../services/asyncRuntimeCoordinator';
import { persistTelemetryCycle } from '../../services/runtimeTelemetryStorage';
import { recordMemoryPressureSample, executeMemoryPressureCleanup } from '../orchestrator/memoryPressureGuardian';
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
  StabilityObservePayload,
  StabilityReconnectGuardPayload,
  StabilityAsyncWarnPayload,
  StabilityMiuiPayload,
  ResumeCoordinatorEffectPayload,
  ResumeGlobalGatePayload,
} from './RuntimeEffectTypes';
import type { RuntimeOrchestratorPolicy } from '../../types/runtimeOrchestrator';
import { setLastRuntimeStabilitySnapshot } from '../stability/RuntimeHealthMonitor';
import { tryAcquireHydrationLock } from '../stability/hydrationLock';
import { applyResumeGlobalGate, requestReconnectSchedule } from '../stability/reconnectCoordinator';
import {
  noteHydrationSequenceStart,
  scheduleDelayedWebsocketRestore,
} from '../stability/hydrationRestoreSequencer';
import { RESUME_COORDINATOR_WS_RESTORE_DELAY_MS } from '../../constants/runtimeResumeCoordinator';

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
        requestReconnectSchedule(
          r.baseMs,
          r.maxMs,
          r.storm ? 'kernel policy reconnect storm' : 'kernel policy reconnect',
          'kernel_policy',
        );
        break;
      }
      case 'WS_RECONNECT_DEFER': {
        const d = effect.payload as { baseMs: number };
        requestReconnectSchedule(d.baseMs * 2, d.baseMs * 4, 'kernel defer reconnect', 'kernel_defer');
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
        recordMemoryPressureSample(
          (effect.payload as { metrics: import('../../types/runtimeTelemetry').RuntimeTelemetryMetricsSnapshot })
            .metrics,
        );
        break;
      case 'MEMORY_PRESSURE_CLEANUP': {
        const m = (effect.payload as { metrics: import('../../types/runtimeTelemetry').RuntimeTelemetryMetricsSnapshot })
          .metrics;
        executeMemoryPressureCleanup(m);
        break;
      }
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
      case 'STABILITY_OBSERVE':
        setLastRuntimeStabilitySnapshot((effect.payload as StabilityObservePayload).snapshot);
        break;
      case 'STABILITY_RECONNECT_GUARD': {
        const p = effect.payload as StabilityReconnectGuardPayload;
        requestReconnectSchedule(
          2500,
          12_000,
          `stability · ${p.snapshot.websocketStatusJa}`,
          'stability_guard',
        );
        setWebsocketLightweightMode(true);
        noteOfflineForDebounce(Math.max(5000, p.delayMs > Date.now() ? p.delayMs - Date.now() : 5000));
        recordLifecycleEvent('reconnect_start', `stability guard · ${p.snapshot.websocketStatusJa}`, false);
        break;
      }
      case 'STABILITY_HYDRATION_ENFORCE':
        tryAcquireHydrationLock('stability-enforce');
        beginHydrationPauseWindow();
        break;
      case 'STABILITY_ASYNC_STARVATION_WARN': {
        const w = effect.payload as StabilityAsyncWarnPayload;
        recordLifecycleEvent('trim_memory', `async: ${w.anomaly.summaryJa}`, false);
        break;
      }
      case 'STABILITY_MIUI_DIAGNOSTIC': {
        const m = effect.payload as StabilityMiuiPayload;
        recordLifecycleEvent('trim_memory', `miui: ${m.anomaly.summaryJa}`, true);
        noteOfflineForDebounce(8000);
        break;
      }
      case 'RESUME_COORDINATOR_OBSERVE': {
        const o = effect.payload as ResumeCoordinatorEffectPayload;
        recordLifecycleEvent('trim_memory', `resume: ${o.snapshot.plan.summaryJa}`, false);
        break;
      }
      case 'RESUME_GLOBAL_GATE': {
        const g = effect.payload as ResumeGlobalGatePayload;
        applyResumeGlobalGate(g.gateMs);
        break;
      }
      case 'RESUME_SERIALIZE_HYDRATION': {
        tryAcquireHydrationLock('resume-coordinator');
        beginHydrationPauseWindow();
        noteHydrationSequenceStart();
        recordLifecycleEvent('hydration_start', 'resume coordinator serialize', true);
        break;
      }
      case 'RESUME_DEFER_TELEMETRY':
        recordLifecycleEvent('trim_memory', 'resume coordinator — telemetry defer', false);
        break;
      case 'RESUME_ASYNC_BURST_CLAMP':
        setAsyncConcurrentLimit(2);
        recordLifecycleEvent('trim_memory', 'resume coordinator — async burst clamp', false);
        break;
      case 'RESUME_WS_RESTORE_SEQUENCE':
        scheduleDelayedWebsocketRestore(RESUME_COORDINATOR_WS_RESTORE_DELAY_MS, () => {
          recordLifecycleEvent('reconnect_start', 'resume coordinator ws restore', false);
        });
        break;
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
