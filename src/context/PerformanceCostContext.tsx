import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ApiCostDashboard } from '../types/performanceCost';
import type { PerformanceCostRuntimeSnapshot } from '../types/performanceCost';
import {
  getPerformanceCostSnapshot,
  initPerformanceCostRuntime,
  setBatterySaverMode,
  subscribePerformanceCost,
} from '../services/performanceCostRuntime';
import { buildApiCostDashboard } from '../services/apiCostTracker';
import { unifiedCacheSummaryJa } from '../services/unifiedCacheLayer';
import { useApp } from './AppContext';

type PerformanceCostContextValue = {
  runtime: PerformanceCostRuntimeSnapshot;
  costDashboard: ApiCostDashboard;
  cacheSummaryJa: string;
  batterySaverEnabled: boolean;
  setBatterySaverEnabled: (enabled: boolean) => Promise<void>;
  refreshCostDashboard: () => void;
};

const PerformanceCostContext = createContext<PerformanceCostContextValue | null>(null);

export function PerformanceCostProvider({ children }: { children: ReactNode }) {
  const { aiPreferences, saveAiPreferences } = useApp();
  const [runtime, setRuntime] = useState(getPerformanceCostSnapshot);
  const [costDashboard, setCostDashboard] = useState(buildApiCostDashboard);

  useEffect(() => {
    initPerformanceCostRuntime();
    void import('../services/networkReachability').then(({ initNetworkReachability }) => {
      initNetworkReachability();
    });
    void import('../services/mobileRedmiRuntime').then(({ initMobileRedmiRuntime }) => {
      initMobileRedmiRuntime();
    });
    return subscribePerformanceCost(setRuntime);
  }, []);

  useEffect(() => {
    setBatterySaverMode(aiPreferences.batterySaverEnabled);
  }, [aiPreferences.batterySaverEnabled]);

  const setBatterySaverEnabled = useCallback(
    async (enabled: boolean) => {
      setBatterySaverMode(enabled);
      await saveAiPreferences({ batterySaverEnabled: enabled });
    },
    [saveAiPreferences],
  );

  const refreshCostDashboard = useCallback(() => {
    setCostDashboard(buildApiCostDashboard());
  }, []);

  const value = useMemo<PerformanceCostContextValue>(
    () => ({
      runtime,
      costDashboard,
      cacheSummaryJa: unifiedCacheSummaryJa(),
      batterySaverEnabled: aiPreferences.batterySaverEnabled,
      setBatterySaverEnabled,
      refreshCostDashboard,
    }),
    [
      runtime,
      costDashboard,
      aiPreferences.batterySaverEnabled,
      setBatterySaverEnabled,
      refreshCostDashboard,
    ],
  );

  return (
    <PerformanceCostContext.Provider value={value}>{children}</PerformanceCostContext.Provider>
  );
}

export function usePerformanceCost(): PerformanceCostContextValue {
  const ctx = useContext(PerformanceCostContext);
  if (!ctx) {
    throw new Error('usePerformanceCost must be used within PerformanceCostProvider');
  }
  return ctx;
}

export function usePerformanceCostOptional(): PerformanceCostContextValue | null {
  return useContext(PerformanceCostContext);
}
