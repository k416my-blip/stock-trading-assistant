import type { EmergencySafeModeLevel } from '../../types/productionStability';
import { isCircuitOpen } from './apiCircuitBreaker';
import { getRenderBudgetBlockedCount } from './renderBudget';
import { getLastQueueTrimmedCount } from './queueGuards';
import { canSpendOpenAiTokens } from './tokenBudget';

let level: EmergencySafeModeLevel = 0;
let reasonJa: string | null = null;

export function getEmergencySafeModeLevel(): EmergencySafeModeLevel {
  return level;
}

export function getEmergencySafeModeReasonJa(): string | null {
  return reasonJa;
}

export function recomputeEmergencySafeMode(): EmergencySafeModeLevel {
  let next: EmergencySafeModeLevel = 0;
  let reason: string | null = null;

  if (isCircuitOpen('openai')) {
    next = 3;
    reason = 'OpenAI API サーキット開放中';
  } else if (!canSpendOpenAiTokens(500)) {
    next = 2;
    reason = 'AIトークン予算上限に接近';
  } else if (getLastQueueTrimmedCount() > 0 || getRenderBudgetBlockedCount() > 5) {
    next = 2;
    reason = 'キュー/描画負荷が高い';
  } else if (isCircuitOpen('market_data') || isCircuitOpen('x')) {
    next = 1;
    reason = '一部APIサーキット開放中';
  }

  level = next;
  reasonJa = reason;
  return next;
}

export function forceEmergencyLevel(l: EmergencySafeModeLevel, reason: string | null): void {
  level = l;
  reasonJa = reason;
}

export function resetEmergencySafeModeForTest(): void {
  level = 0;
  reasonJa = null;
}
