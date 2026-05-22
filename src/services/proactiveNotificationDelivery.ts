/**
 * 自発提案のローカル通知配信（React Native 依存）
 */
import type { AppState } from '../types';
import type { ProactiveSuggestion } from '../types/proactiveSuggestion';
import { prepareAlertDispatch } from './alertEngine';
import {
  isProactivePushEnabled,
  mapProactiveCategoryToAlertType,
  shouldDeliverProactivePush,
} from './notification-engine';
import { presentLocalNotification } from './notificationService';

export type DeliverProactiveResult = {
  sent: boolean;
  skippedReason?: 'cooldown' | 'settings' | 'unsupported' | 'low_priority';
  nextLastPushByKey: Record<string, number>;
  nextState?: AppState;
};

export async function deliverProactiveLocalPush(
  state: AppState,
  suggestion: ProactiveSuggestion,
  lastPushByKey: Record<string, number>,
  options: { notificationsSupported: boolean; nowMs?: number },
): Promise<DeliverProactiveResult> {
  const nowMs = options.nowMs ?? Date.now();
  const nextLastPush = { ...lastPushByKey };

  if (!options.notificationsSupported) {
    return { sent: false, skippedReason: 'unsupported', nextLastPushByKey: nextLastPush };
  }
  if (!shouldDeliverProactivePush(suggestion, lastPushByKey, nowMs)) {
    return { sent: false, skippedReason: 'cooldown', nextLastPushByKey: nextLastPush };
  }
  const settings = state.notificationSettings;
  if (!isProactivePushEnabled(settings, suggestion.category)) {
    return { sent: false, skippedReason: 'settings', nextLastPushByKey: nextLastPush };
  }

  const alertType = mapProactiveCategoryToAlertType(suggestion.category) ?? 'buy_candidate';
  const payload = {
    type: alertType,
    cooldownKey: `proactive:${suggestion.dedupeKey}`,
    title: suggestion.titleJa,
    body: suggestion.bodyJa,
    symbol: suggestion.symbol,
    market: suggestion.market,
  };

  const { nextState, shouldSend } = prepareAlertDispatch(state, payload, nowMs);
  if (!shouldSend) {
    return {
      sent: false,
      skippedReason: 'settings',
      nextLastPushByKey: nextLastPush,
      nextState,
    };
  }

  await presentLocalNotification({
    title: suggestion.titleJa,
    body: suggestion.bodyJa,
    sound: settings.sound,
    vibrationEnabled: settings.vibrationEnabled,
    alertType,
    symbol: suggestion.symbol,
    market: suggestion.market,
  });

  nextLastPush[suggestion.dedupeKey] = nowMs;
  return { sent: true, nextLastPushByKey: nextLastPush, nextState };
}
