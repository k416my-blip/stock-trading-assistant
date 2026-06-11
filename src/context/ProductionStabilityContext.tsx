import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ProductionStabilityBundle, ProductionStabilitySnapshot } from '../types/productionStability';
import {
  buildProductionStabilityBundle,
  buildSnapshot,
  initProductionStabilityRuntime,
  subscribeProductionStability,
} from '../services/productionStability/productionStabilityRuntime';
import { usePerformanceCostOptional } from './PerformanceCostContext';
import { setStabilityRuntimeOverlay } from '../services/productionStability/productionStabilityRuntime';
import { useTwelveHourTestRuntime } from '../hooks/useTwelveHourTestRuntime';

type ProductionStabilityContextValue = {
  snapshot: ProductionStabilitySnapshot;
  bundle: ProductionStabilityBundle | null;
  refreshBundle: () => Promise<void>;
};

const ProductionStabilityContext = createContext<ProductionStabilityContextValue | null>(null);

export function ProductionStabilityProvider({ children }: { children: ReactNode }) {
  const perf = usePerformanceCostOptional();
  const [snapshot, setSnapshot] = useState(buildSnapshot);
  const [bundle, setBundle] = useState<ProductionStabilityBundle | null>(null);

  useEffect(() => {
    initProductionStabilityRuntime();
    return subscribeProductionStability(setSnapshot);
  }, []);

  useTwelveHourTestRuntime();

  useEffect(() => {
    if (perf) {
      setStabilityRuntimeOverlay(perf.runtime, perf.costDashboard);
    }
  }, [perf?.runtime, perf?.costDashboard]);

  const refreshBundle = useCallback(async () => {
    const b = await buildProductionStabilityBundle();
    setBundle(b);
    setSnapshot(b.snapshot);
  }, []);

  useEffect(() => {
    void refreshBundle();
    const id = setInterval(() => void refreshBundle(), 30_000);
    return () => clearInterval(id);
  }, [refreshBundle]);

  const value = useMemo(
    (): ProductionStabilityContextValue => ({
      snapshot,
      bundle,
      refreshBundle,
    }),
    [snapshot, bundle, refreshBundle],
  );

  return (
    <ProductionStabilityContext.Provider value={value}>{children}</ProductionStabilityContext.Provider>
  );
}

export function useProductionStability(): ProductionStabilityContextValue {
  const ctx = useContext(ProductionStabilityContext);
  if (!ctx) {
    throw new Error('useProductionStability must be used within ProductionStabilityProvider');
  }
  return ctx;
}

export function useProductionStabilityOptional(): ProductionStabilityContextValue | null {
  return useContext(ProductionStabilityContext);
}
