import type { BackgroundKillSnapshot } from '../../types/nativeDeviceTelemetry';
import { getLastNativeRuntimeSnapshot } from '../runtime/nativeRuntimeBridge';
import { detectMiuiAggressiveReclaim } from '../runtime/miuiReclaimDetector';
import { predictRuntimeKill } from '../runtime/runtimeKillPredictor';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';

export function observeBackgroundKill(metrics: RuntimeTelemetryMetricsSnapshot): BackgroundKillSnapshot {
  const native = getLastNativeRuntimeSnapshot();
  const miui = detectMiuiAggressiveReclaim();
  const kill = predictRuntimeKill({ metrics, sessionMinutes: metrics.longSession.sessionMinutes });
  return {
    trimBurstCount: native?.trimMemoryBurstCount ?? 0,
    lowMemoryWarning: metrics.native.memoryWarning,
    miuiReclaim: miui.value || metrics.native.miuiAggressiveReclaim,
    killRiskScore: kill.score,
  };
}
