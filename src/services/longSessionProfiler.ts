import type { LongSessionProfilerSnapshot } from '../types/runtimeTelemetry';
import { TELEMETRY_LONG_SESSION_CHECKPOINTS_MIN } from '../constants/runtimeTelemetry';
import { getExplanationCacheSize } from './explanationStormGuard';

type ProfilerSample = {
  at: number;
  jsHeapEstimateMb: number;
  asyncQueueDepth: number;
  renderFPS: number;
  wsLatencyMs: number;
  orchestrationMs: number;
};

const samples: ProfilerSample[] = [];
let sessionStartedAt = Date.now();

export function resetLongSessionProfilerForTest(): void {
  samples.length = 0;
  sessionStartedAt = Date.now();
}

export function markProfilerSessionStart(now = Date.now()): void {
  sessionStartedAt = now;
  samples.length = 0;
}

export function recordLongSessionSample(input: {
  jsHeapEstimateMb: number;
  asyncQueueDepth: number;
  renderFPS: number;
  wsLatencyMs: number;
  orchestrationMs: number;
}): void {
  samples.push({ at: Date.now(), ...input });
  if (samples.length > 200) samples.shift();
}

function trendPct(first: number, last: number): number {
  if (first <= 0) return Math.round(last);
  return Math.min(100, Math.max(-20, Math.round(((last - first) / first) * 100)));
}

function checkpoint(sessionMinutes: number): LongSessionProfilerSnapshot['checkpoint'] {
  if (sessionMinutes >= 90) return '90m';
  if (sessionMinutes >= 60) return '60m';
  if (sessionMinutes >= 30) return '30m';
  return 'under_30m';
}

export function observeLongSession(sessionMinutes: number): LongSessionProfilerSnapshot {
  const first = samples[0];
  const last = samples.at(-1);
  const memFirst = first?.jsHeapEstimateMb ?? 32;
  const memLast = last?.jsHeapEstimateMb ?? memFirst;
  const queueFirst = first?.asyncQueueDepth ?? 0;
  const queueLast = last?.asyncQueueDepth ?? queueFirst;
  const fpsFirst = first?.renderFPS ?? 60;
  const fpsLast = last?.renderFPS ?? fpsFirst;
  const wsFirst = first?.wsLatencyMs ?? 50;
  const wsLast = last?.wsLatencyMs ?? wsFirst;
  const orchFirst = first?.orchestrationMs ?? 100;
  const orchLast = last?.orchestrationMs ?? orchFirst;

  const cp = checkpoint(sessionMinutes);
  void TELEMETRY_LONG_SESSION_CHECKPOINTS_MIN;

  return {
    sessionMinutes,
    memoryGrowthTrendPct: trendPct(memFirst, memLast),
    asyncQueueGrowthTrend: Math.max(0, queueLast - queueFirst),
    renderDegradationPct: trendPct(fpsFirst, Math.max(1, fpsLast)) * -1,
    websocketDegradationPct: trendPct(wsFirst, wsLast),
    orchestrationSlowdownPct: trendPct(orchFirst, orchLast),
    explanationCacheGrowth: getExplanationCacheSize(),
    checkpoint: cp,
  };
}

export function getProfilerSessionElapsedMinutes(): number {
  return Math.floor((Date.now() - sessionStartedAt) / 60_000);
}
