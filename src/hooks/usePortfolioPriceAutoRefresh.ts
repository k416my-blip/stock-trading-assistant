import { useCallback, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { effectivePriceRefreshMs } from '../services/performanceCostRuntime';
import { useAppForeground } from './useAppForeground';
import {
  restartPortfolioPriceRefresh,
  stopPortfolioPriceRefresh,
} from './portfolioPriceRefreshScheduler';

/**
 * 保有銘柄画面を開いている間のみ、設定間隔（既定15分）で株価を自動更新。
 * 即時更新は「株価を自動更新」ボタン（手動）のみ。
 */
export function usePortfolioPriceAutoRefresh(enabled: boolean) {
  const { refreshPortfolioPrices, state, killSwitches, aiPreferences } = useApp();
  const appForeground = useAppForeground();
  const refreshMs = effectivePriceRefreshMs(
    state.settings.priceRefreshMinutes,
    aiPreferences.batterySaverEnabled,
  );
  const refreshRef = useRef(refreshPortfolioPrices);
  refreshRef.current = refreshPortfolioPrices;

  const tick = useCallback(() => {
    void refreshRef.current({ silent: true, debounceMs: 2500 });
  }, []);

  useEffect(() => {
    if (!enabled || !appForeground || killSwitches.disableMarketRefresh) {
      stopPortfolioPriceRefresh();
      return;
    }

    restartPortfolioPriceRefresh(refreshMs, tick);

    return () => {
      stopPortfolioPriceRefresh();
    };
  }, [enabled, appForeground, killSwitches.disableMarketRefresh, refreshMs, tick]);
}
