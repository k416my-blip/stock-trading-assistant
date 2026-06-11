/**
 * 12時間テスト中のグローバル株価ポーリング（保有銘柄画面以外でも継続）
 */
import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { usePriceSyncActions } from '../context/PriceSyncContext';
import { getActivePortfolio } from '../services/portfolioPriceUpdate';
import { effectivePriceRefreshMs, shouldPauseApiRequests } from '../services/performanceCostRuntime';
import { restartPortfolioPriceRefresh, stopPortfolioPriceRefresh } from './portfolioPriceRefreshScheduler';
import { isTwelveHourTestMonitorActive } from '../services/twelveHourTestMonitor';

export function useTwelveHourTestRuntime(): void {
  const { state, twelveDataApiKey, aiPreferences } = useApp();
  const { refreshPortfolioPrices } = usePriceSyncActions();
  const refreshRef = useRef(refreshPortfolioPrices);
  const stateRef = useRef(state);
  refreshRef.current = refreshPortfolioPrices;
  stateRef.current = state;

  useEffect(() => {
    if (!isTwelveHourTestMonitorActive()) return;

    const refreshMs = effectivePriceRefreshMs(
      state.settings.priceRefreshMinutes,
      aiPreferences.batterySaverEnabled,
    );

    const priceTick = () => {
      const count = getActivePortfolio(stateRef.current).filter((p) => (p.shares ?? 0) > 0).length;
      if (count === 0 || shouldPauseApiRequests()) return;
      if (!twelveDataApiKey.trim()) return;
      void refreshRef.current({ silent: true, debounceMs: 2500, trigger: 'auto' });
    };

    restartPortfolioPriceRefresh(refreshMs, priceTick);

    return () => {
      stopPortfolioPriceRefresh('twelve_hour_runtime_cleanup');
    };
  }, [
    state.settings.priceRefreshMinutes,
    aiPreferences.batterySaverEnabled,
    twelveDataApiKey,
  ]);
}
