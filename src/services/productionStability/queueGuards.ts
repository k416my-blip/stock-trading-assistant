import {
  NOTIFICATION_FLOOD_MAX,
  NOTIFICATION_FLOOD_WINDOW_MS,
  PROACTIVE_QUEUE_MAX_ITEMS,
} from '../../constants/productionStability';
import type { ProactiveSuggestion } from '../../types/proactiveSuggestion';

let notificationFloodBlocked = 0;
let lastQueueTrimmed = 0;

export function trimProactiveQueueOverflow(
  suggestions: ProactiveSuggestion[],
  max = PROACTIVE_QUEUE_MAX_ITEMS,
): ProactiveSuggestion[] {
  if (suggestions.length <= max) return suggestions;
  const trimmed = suggestions.length - max;
  lastQueueTrimmed = trimmed;
  return suggestions.slice(0, max);
}

export function getLastQueueTrimmedCount(): number {
  return lastQueueTrimmed;
}

export function canSendNotificationFloodGuard(nowMs = Date.now()): boolean {
  const recent = countRecentNotificationAttempts(nowMs);
  if (recent >= NOTIFICATION_FLOOD_MAX) {
    notificationFloodBlocked += 1;
    return false;
  }
  notificationAttempts.push(nowMs);
  return true;
}

const notificationAttempts: number[] = [];

function countRecentNotificationAttempts(nowMs: number): number {
  const cutoff = nowMs - NOTIFICATION_FLOOD_WINDOW_MS;
  while (notificationAttempts.length && notificationAttempts[0] < cutoff) {
    notificationAttempts.shift();
  }
  return notificationAttempts.length;
}

export function noteNotificationAttempt(nowMs = Date.now()): void {
  notificationAttempts.push(nowMs);
}

export function getNotificationFloodBlockedCount(): number {
  return notificationFloodBlocked;
}

export function resetQueueGuardsForTest(): void {
  notificationFloodBlocked = 0;
  lastQueueTrimmed = 0;
  notificationAttempts.length = 0;
}
