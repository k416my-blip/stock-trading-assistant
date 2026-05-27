import type { CausalIntelligenceObserveInput } from '../types/runtimeCausalIntelligence';
import { CAUSAL_INTELLIGENCE_CORRELATION_WINDOW_MS } from '../constants/runtimeCausalIntelligence';

type TimedSignal = { at: number; kind: string; magnitude: number };

const signals: TimedSignal[] = [];

export function resetTimelineCorrelationEngineForTest(): void {
  signals.length = 0;
}

export function noteTimelineSignal(kind: string, magnitude: number, now = Date.now()): void {
  signals.push({ at: now, kind, magnitude });
  if (signals.length > 200) signals.shift();
}

export function ingestObserveSignals(input: CausalIntelligenceObserveInput, now = Date.now()): void {
  if (input.eventLoopLagMs > 200) noteTimelineSignal('lag', input.eventLoopLagMs / 1000, now);
  if (input.renderStormRisk > 0.3) noteTimelineSignal('render', input.renderStormRisk, now);
  if (input.reconnectPerMin > 1) noteTimelineSignal('websocket', input.reconnectPerMin / 10, now);
  if (input.miuiAggressiveReclaim) noteTimelineSignal('reclaim', 0.8, now);
  if (input.thermalState !== 'none') noteTimelineSignal('thermal', 0.6, now);
}

export function computeRuntimeCorrelationStrength(now = Date.now()): number {
  const window = signals.filter((s) => now - s.at <= CAUSAL_INTELLIGENCE_CORRELATION_WINDOW_MS);
  if (window.length < 2) return 0.2;
  const kinds = new Set(window.map((s) => s.kind));
  const overlap = kinds.size / 5;
  const magnitude = window.reduce((a, s) => a + s.magnitude, 0) / window.length;
  return Math.round(Math.min(1, overlap * 0.5 + magnitude * 0.3) * 1000) / 1000;
}
