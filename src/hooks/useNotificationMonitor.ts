import { useEffect, useRef } from 'react';
import { ALERT_MONITOR_INTERVAL_MS } from '../constants/notifications';
import { useApp } from '../context/AppContext';
import { collectPeriodicAlerts } from '../services/alertEngine';
import { shouldPauseApiRequests } from '../services/performanceCostRuntime';
import { useAppForeground } from './useAppForeground';

/** 保有銘柄・市場時間を定期的にチェックして通知（フォアグラウンド時のみ） */
export function useNotificationMonitor(enabled: boolean) {
  const { state, dispatchAlerts } = useApp();
  const appForeground = useAppForeground();
  const stateRef = useRef(state);
  stateRef.current = state;
  const dispatchRef = useRef(dispatchAlerts);
  dispatchRef.current = dispatchAlerts;

  useEffect(() => {
    if (!enabled || !appForeground) return;

    const run = () => {
      if (shouldPauseApiRequests()) return;
      const payloads = collectPeriodicAlerts(stateRef.current);
      if (payloads.length > 0) {
        void dispatchRef.current(payloads);
      }
    };

    const initial = setTimeout(run, 12_000);
    const interval = setInterval(run, ALERT_MONITOR_INTERVAL_MS);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [enabled, appForeground]);
}
