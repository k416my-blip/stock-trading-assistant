import { KILL_RISK_LABELS_JA } from '../../constants/nativeRuntimeBridge';
import type { RuntimeKillPrediction, RuntimeKillRiskLevel } from '../../types/nativeRuntimeBridge';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import { getLastNativeRuntimeSnapshot } from './nativeRuntimeBridge';
import { detectMiuiAggressiveReclaim } from './miuiReclaimDetector';

export type KillPredictorInput = {
  metrics: RuntimeTelemetryMetricsSnapshot;
  sessionMinutes: number;
};

let lastPrediction: RuntimeKillPrediction | null = null;

export function resetRuntimeKillPredictorForTest(): void {
  lastPrediction = null;
}

function classifyLevel(score: number): RuntimeKillRiskLevel {
  if (score >= 88) return 'IMMINENT';
  if (score >= 68) return 'HIGH';
  if (score >= 42) return 'MODERATE';
  return 'LOW';
}

export function predictRuntimeKill(input: KillPredictorInput): RuntimeKillPrediction {
  const m = input.metrics;
  const native = getLastNativeRuntimeSnapshot();
  const miui = detectMiuiAggressiveReclaim();

  let score = 0;
  if (native?.thermalStatus === 'critical' || native?.thermalStatus === 'severe') score += 22;
  if (m.thermalState === 'critical' || m.thermalState === 'severe') score += 12;
  score += Math.min(25, m.memoryTrendPct / 2);
  score += Math.min(20, m.asyncQueueDepth * 0.35);
  if (m.websocket.reconnectStormDetected) score += 18;
  if (m.render.renderFPS < 10) score += 20;
  if (m.longSession.renderDegradationPct >= 25) score += 12;
  if (miui.value) score += 15;
  if ((native?.nativeMemoryPressurePct ?? 0) >= 70) score += 14;
  if (input.sessionMinutes >= 360) score += 8;

  const nativeBoost = native?.source === 'native' ? 1.08 : 1;
  score = Math.min(100, Math.round(score * nativeBoost));

  const level = classifyLevel(score);
  const prediction: RuntimeKillPrediction = {
    level,
    score,
    summaryJa: `Kill risk ${KILL_RISK_LABELS_JA[level]} (${score}) · thermal ${m.thermalState} · queue ${m.asyncQueueDepth}`,
    confidence: native?.source === 'native' ? 0.86 : 0.52,
    measuredAt: new Date().toISOString(),
  };
  lastPrediction = prediction;
  return prediction;
}

export function getLastKillPrediction(): RuntimeKillPrediction | null {
  return lastPrediction;
}

export function isImminentKillRisk(): boolean {
  return lastPrediction?.level === 'IMMINENT';
}
