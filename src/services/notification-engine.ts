/**
 * 自発提案の配信ポリシー（純関数）。実際のプッシュは proactiveNotificationDelivery。
 */
import type { AlertType, NotificationSettings } from '../types';
import type {
  ProactiveSuggestion,
  ProactiveSuggestionCategory,
  ProactiveSuggestionPriority,
} from '../types/proactiveSuggestion';
import { PROACTIVE_PUSH_COOLDOWN_MS } from '../constants/proactiveNotification';
import { isAlertTypeEnabled } from './alertEngine';

export type ProactiveDeliveryChannel = 'local_push' | 'in_app_only' | 'voice' | 'auto_trade';

export type ProactiveDeliveryPayload = {
  suggestion: ProactiveSuggestion;
  channel: ProactiveDeliveryChannel;
};

const CATEGORY_ALERT_MAP: Partial<Record<ProactiveSuggestionCategory, AlertType>> = {
  stop_loss_near: 'stop_loss_near',
  take_profit_near: 'take_profit_near',
  buy_candidate: 'buy_candidate',
  sell_candidate: 'sell_candidate',
  sharp_move: 'sell_candidate',
  allocation_skew: 'allocation_plan',
};

export function mapProactiveCategoryToAlertType(
  category: ProactiveSuggestionCategory,
): AlertType | null {
  return CATEGORY_ALERT_MAP[category] ?? null;
}

export function proactivePushCooldownMs(priority: ProactiveSuggestionPriority): number {
  return PROACTIVE_PUSH_COOLDOWN_MS[priority];
}

export function shouldDeliverProactivePush(
  suggestion: ProactiveSuggestion,
  lastPushByKey: Record<string, number>,
  nowMs = Date.now(),
): boolean {
  if (suggestion.priority === 'low') return false;
  const last = lastPushByKey[suggestion.dedupeKey];
  if (last == null) return true;
  return nowMs - last >= proactivePushCooldownMs(suggestion.priority);
}

export function isProactivePushEnabled(
  settings: NotificationSettings,
  category: ProactiveSuggestionCategory,
): boolean {
  const alertType = mapProactiveCategoryToAlertType(category);
  if (!alertType) return true;
  return isAlertTypeEnabled(settings, alertType);
}

/** 将来: 音声・自動売買はここにチャネル分岐を追加 */
export function planProactiveDelivery(
  suggestion: ProactiveSuggestion,
  channels: ProactiveDeliveryChannel[] = ['in_app_only', 'local_push'],
): ProactiveDeliveryPayload[] {
  return channels.map((channel) => ({ suggestion, channel }));
}
