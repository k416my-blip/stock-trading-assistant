import type { SurvivabilityAuditObserveInput } from '../types/survivabilityAuditValidation';
import { TRADING_CONTINUITY_FEATURES } from '../constants/survivabilityAuditValidation';

const continuityTimeline: { at: string; score: number }[] = [];

export function resetTradingContinuityIntegrityValidatorForTest(): void {
  continuityTimeline.length = 0;
}

export function scoreContinuityIntegrity(input: SurvivabilityAuditObserveInput): number {
  let score = input.runtimeSafeTradingScore / 100;
  score += (1 - input.staleHydrationRisk) * 0.15;
  if (input.heartbeatAgeMs < 8000) score += 0.1;
  if (input.recoverySuccessRate > 0.6) score += 0.05;
  const rounded = Math.round(Math.min(1, score) * 1000) / 1000;
  continuityTimeline.push({ at: new Date().toISOString(), score: rounded });
  if (continuityTimeline.length > 64) continuityTimeline.shift();
  return rounded;
}

export function validateTradingContinuityFeatures(input: SurvivabilityAuditObserveInput): Record<string, boolean> {
  const integrity = scoreContinuityIntegrity(input);
  const result: Record<string, boolean> = {};
  for (const f of TRADING_CONTINUITY_FEATURES) {
    if (f === 'websocket_continuity') {
      result[f] = input.heartbeatAgeMs < 10000 && input.reconnectPerMin < 12;
    } else {
      result[f] = integrity > 0.45;
    }
  }
  return result;
}

export function getContinuityIntegrityTimeline(): { at: string; score: number }[] {
  return [...continuityTimeline];
}
