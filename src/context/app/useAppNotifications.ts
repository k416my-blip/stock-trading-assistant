import { useCallback } from 'react';
import type { AlertPayload } from '../../services/alertEngine';
import { prepareAlertDispatch } from '../../services/alertEngine';
import {
  initNotificationService,
  presentLocalNotification,
} from '../../services/notificationService';
import type { NotificationSettings } from '../../types';
import type { AppContextRefs, AppStateApi } from './appContextShared';

type Params = Pick<AppStateApi, 'setState'> & Pick<AppContextRefs, 'stateRef'>;

export function useAppNotifications({ stateRef, setState }: Params) {
  const updateNotificationSettings = useCallback((partial: Partial<NotificationSettings>) => {
    setState((prev) => ({
      ...prev,
      notificationSettings: { ...prev.notificationSettings, ...partial },
    }));
  }, [setState]);

  const dispatchAlert = useCallback(async (payload: AlertPayload): Promise<boolean> => {
    const current = stateRef.current;
    const { nextState, shouldSend } = prepareAlertDispatch(current, payload);
    if (!shouldSend) return false;

    setState(nextState);
    stateRef.current = nextState;

    await presentLocalNotification({
      title: payload.title,
      body: payload.body,
      sound: nextState.notificationSettings.sound,
      vibrationEnabled: nextState.notificationSettings.vibrationEnabled,
      alertType: payload.type,
      symbol: payload.symbol,
      market: payload.market,
    });
    return true;
  }, [setState, stateRef]);

  const dispatchAlerts = useCallback(
    async (payloads: AlertPayload[]) => {
      for (const payload of payloads) {
        await dispatchAlert(payload);
      }
    },
    [dispatchAlert],
  );

  const sendTestNotification = useCallback(async () => {
    const settings = stateRef.current.notificationSettings;
    await presentLocalNotification({
      title: 'テスト通知',
      body: '選択した通知音のテストです。実際の売買は行われません。',
      sound: settings.sound,
      vibrationEnabled: settings.vibrationEnabled,
      alertType: 'buy_candidate',
    });
  }, [stateRef]);

  const clearNotificationHistory = useCallback(() => {
    setState((prev) => ({ ...prev, notificationHistory: [] }));
  }, [setState]);

  const requestNotificationsPermission = useCallback(async () => {
    return initNotificationService();
  }, []);

  return {
    updateNotificationSettings,
    dispatchAlert,
    dispatchAlerts,
    sendTestNotification,
    clearNotificationHistory,
    requestNotificationsPermission,
  };
}
