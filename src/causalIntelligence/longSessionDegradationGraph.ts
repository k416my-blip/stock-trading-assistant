import type { CausalGraphEdge, CausalIntelligenceObserveInput } from '../types/runtimeCausalIntelligence';
import { CAUSAL_INTELLIGENCE_LONG_SESSION_MIN } from '../constants/runtimeCausalIntelligence';

const earlyWeights: Record<string, number> = {};
const lateWeights: Record<string, number> = {};

export function resetLongSessionDegradationGraphForTest(): void {
  for (const k of Object.keys(earlyWeights)) delete earlyWeights[k];
  for (const k of Object.keys(lateWeights)) delete lateWeights[k];
}

export function noteSessionPhase(input: CausalIntelligenceObserveInput): void {
  const bucket = input.sessionMinutes >= CAUSAL_INTELLIGENCE_LONG_SESSION_MIN ? lateWeights : earlyWeights;
  bucket.thermal = (bucket.thermal ?? 0) + (input.thermalState !== 'none' ? 0.1 : 0);
  bucket.bridge = (bucket.bridge ?? 0) + input.bridgeTrafficRate / 100;
  bucket.observer = (bucket.observer ?? 0) + input.observerOverheadRatio / 10;
  bucket.reclaim = (bucket.reclaim ?? 0) + (input.miuiAggressiveReclaim ? 0.08 : 0);
}

export function computeCausalDrift(): number {
  const keys = new Set([...Object.keys(earlyWeights), ...Object.keys(lateWeights)]);
  if (keys.size === 0) return 0;
  let drift = 0;
  for (const k of keys) {
    drift += Math.abs((lateWeights[k] ?? 0) - (earlyWeights[k] ?? 0));
  }
  return Math.round(Math.min(1, drift / keys.size) * 1000) / 1000;
}

export function longSessionDegradationEdges(input: CausalIntelligenceObserveInput): CausalGraphEdge[] {
  if (input.sessionMinutes < CAUSAL_INTELLIGENCE_LONG_SESSION_MIN) return [];
  return [
    { from: 'session_aging', to: 'observer_fatigue', weight: 0.5, correlationMs: 3000 },
    { from: 'observer_fatigue', to: 'bridge_drift', weight: 0.4, correlationMs: 2500 },
    { from: 'bridge_drift', to: 'trading_pacing', weight: 0.35, correlationMs: 4000 },
  ];
}
