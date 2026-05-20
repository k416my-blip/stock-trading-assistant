import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef } from 'react';
import { priceRefreshMs } from '../constants/marketData';
import { useApp } from '../context/AppContext';
import {
  restartPortfolioPriceRefresh,
  stopPortfolioPriceRefresh,
} from './portfolioPriceRefreshScheduler';

/** 保有銘柄画面表示時と設定間隔で株価を自動更新（タイマーは1つに統一） */
export function usePortfolioPriceAutoRefresh(enabled: boolean) {
  const { refreshPortfolioPrices, twelveDataApiKey, state, killSwitches } = useApp();
  const refreshMs = priceRefreshMs(state.settings.priceRefreshMinutes);
  const refreshRef = useRef(refreshPortfolioPrices);
  refreshRef.current = refreshPortfolioPrices;

  const tick = useCallback(() => {
    void refreshRef.current({ silent: true, debounceMs: 2500 });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!enabled || killSwitches.disableMarketRefresh || !twelveDataApiKey.trim()) return;
      void refreshRef.current({ silent: true, debounceMs: 1500 });
    }, [enabled, twelveDataApiKey, killSwitches.disableMarketRefresh]),
  );

  useEffect(() => {
    if (!enabled || killSwitches.disableMarketRefresh || !twelveDataApiKey.trim()) {
      stopPortfolioPriceRefresh();
      return;
    }

    restartPortfolioPriceRefresh(refreshMs, tick);

    return () => {
      stopPortfolioPriceRefresh();
    };
  }, [enabled, twelveDataApiKey, killSwitches.disableMarketRefresh, refreshMs, tick]);
}
