import { useCallback, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { usePriceSyncActions } from '../context/PriceSyncContext';
import { useProactiveConciergeOptional } from '../context/ProactiveConciergeContext';
import {
  effectivePriceRefreshMs,
  shouldPauseApiRequests,
} from '../services/performanceCostRuntime';
import {
  shouldPauseConciergeAi,
  shouldThrottleConciergeAi,
} from '../services/productionStability/productionStabilityRuntime';
import { useAppForeground } from './useAppForeground';

const PROACTIVE_EVAL_INTERVAL_MS = 5 * 60 * 1000;
const PROACTIVE_EVAL_BATTERY_MS = 10 * 60 * 1000;

/**
 * アプリ全体: 株価更新 → 自発提案（フォアグラウンド時のみ）
 * 注意: usePortfolioPriceAutoRefresh と同時に有効化すると二重タイマーになる。
 * 現状ルート未接続。実運用では Portfolio 画面の単一 interval のみを使うこと。
 */
export function useProactiveBackgroundMonitor(enabled: boolean) {
  const { state, killSwitches, aiPreferences } = useApp();
  const { refreshPortfolioPrices } = usePriceSyncActions();
  const proactive = useProactiveConciergeOptional();
  const appForeground = useAppForeground();
  const refreshPricesRef = useRef(refreshPortfolioPrices);
  const refreshProactiveRef = useRef(proactive?.refreshProactive);
  refreshPricesRef.current = refreshPortfolioPrices;
  refreshProactiveRef.current = proactive?.refreshProactive;

  const tick = useCallback(async () => {
    if (!appForeground || shouldPauseApiRequests() || shouldPauseConciergeAi()) {
      return;
    }
    if (!aiPreferences.proactiveBriefingsEnabled) return;
    if (killSwitches.disableMarketRefresh) {
      await refreshProactiveRef.current?.();
      return;
    }
    await refreshPricesRef.current({ silent: true, debounceMs: 2000 });
    await refreshProactiveRef.current?.();
  }, [
    aiPreferences.proactiveBriefingsEnabled,
    appForeground,
    killSwitches.disableMarketRefresh,
  ]);

  const priceMs = effectivePriceRefreshMs(
    state.settings.priceRefreshMinutes,
    aiPreferences.batterySaverEnabled,
  );
  let proactiveMs = aiPreferences.batterySaverEnabled
    ? PROACTIVE_EVAL_BATTERY_MS
    : PROACTIVE_EVAL_INTERVAL_MS;
  if (shouldThrottleConciergeAi()) {
    proactiveMs = Math.round(proactiveMs * 1.8);
  }

  useEffect(() => {
    if (!enabled || !proactive || !appForeground) return;

    void tick();

    const priceInterval = setInterval(() => {
      void tick();
    }, priceMs);

    const proactiveInterval = setInterval(() => {
      if (!appForeground || shouldPauseApiRequests()) return;
      void refreshProactiveRef.current?.();
    }, proactiveMs);

    return () => {
      clearInterval(priceInterval);
      clearInterval(proactiveInterval);
    };
  }, [enabled, proactive, appForeground, priceMs, proactiveMs, tick]);
}
