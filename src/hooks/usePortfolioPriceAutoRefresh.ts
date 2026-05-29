import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { usePriceSyncActions } from '../context/PriceSyncContext';
import { getActivePortfolio } from '../services/portfolioPriceUpdate';
import {
  effectivePriceRefreshMs,
  shouldPauseApiRequests,
} from '../services/performanceCostRuntime';
import {
  logAutoUpdateSkipped,
  logAutoUpdateStart,
} from '../services/productionOpsLog';
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
  const { state, killSwitches, aiPreferences, twelveDataApiKey } = useApp();
  const { refreshPortfolioPrices } = usePriceSyncActions();
  const appForeground = useAppForeground();
  const holdingsCount = useMemo(
    () => getActivePortfolio(state).filter((p) => (p.shares ?? 0) > 0).length,
    [state],
  );
  const refreshMs = effectivePriceRefreshMs(
    state.settings.priceRefreshMinutes,
    aiPreferences.batterySaverEnabled,
  );
  const refreshRef = useRef(refreshPortfolioPrices);
  refreshRef.current = refreshPortfolioPrices;
  const holdingsCountRef = useRef(holdingsCount);
  holdingsCountRef.current = holdingsCount;
  const refreshMsRef = useRef(refreshMs);
  refreshMsRef.current = refreshMs;

  const tick = useCallback(() => {
    const count = holdingsCountRef.current;
    const intervalMs = refreshMsRef.current;
    logAutoUpdateStart({ holdings: count, intervalMs, source: 'portfolio_screen_timer' });
    if (count === 0) {
      logAutoUpdateSkipped('no_holdings');
      return;
    }
    if (shouldPauseApiRequests()) {
      logAutoUpdateSkipped('background_or_offline');
      return;
    }
    if (!twelveDataApiKey.trim()) {
      logAutoUpdateSkipped('missing_api_key');
      return;
    }
    void refreshRef.current({ silent: true, debounceMs: 2500, trigger: 'auto' });
  }, [twelveDataApiKey]);

  useEffect(() => {
    if (!enabled || !appForeground || killSwitches.disableMarketRefresh) {
      stopPortfolioPriceRefresh('disabled_or_background');
      return;
    }

    restartPortfolioPriceRefresh(refreshMs, tick);

    return () => {
      stopPortfolioPriceRefresh('effect_cleanup');
    };
  }, [enabled, appForeground, killSwitches.disableMarketRefresh, refreshMs, tick]);
}
