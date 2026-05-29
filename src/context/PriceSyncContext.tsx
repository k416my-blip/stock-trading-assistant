import { createContext, useContext } from 'react';
import type { PriceRefreshOptions, PriceSyncResult } from '../types/marketData';
import type { PortfolioPriceSyncState } from '../types/marketData';
import { useContextValueTrace } from '../utils/renderDiagnostics';

export interface PriceSyncActionsContextValue {
  refreshPortfolioPrices: (options?: PriceRefreshOptions) => Promise<PriceSyncResult>;
  syncPriceSyncForEmptyHoldings: () => void;
  reloadTwelveDataApiKeyFromStorage: () => Promise<void>;
  saveTwelveDataApiKey: (apiKey: string) => Promise<void>;
  testTwelveDataConnection: () => Promise<{ ok: boolean; message: string }>;
}

export interface PriceSyncStateContextValue {
  priceSync: PortfolioPriceSyncState;
}

export type PriceSyncContextValue = PriceSyncStateContextValue & PriceSyncActionsContextValue;

const PriceSyncStateContext = createContext<PriceSyncStateContextValue | null>(null);
const PriceSyncActionsContext = createContext<PriceSyncActionsContextValue | null>(null);

export function PriceSyncProvider({
  stateValue,
  actionsValue,
  children,
}: {
  stateValue: PriceSyncStateContextValue;
  actionsValue: PriceSyncActionsContextValue;
  children: React.ReactNode;
}) {
  useContextValueTrace('PriceSyncStateContext', stateValue, ['priceSync']);
  useContextValueTrace('PriceSyncActionsContext', actionsValue, ['refreshPortfolioPrices']);

  return (
    <PriceSyncActionsContext.Provider value={actionsValue}>
      <PriceSyncStateContext.Provider value={stateValue}>{children}</PriceSyncStateContext.Provider>
    </PriceSyncActionsContext.Provider>
  );
}

export function usePriceSyncState(): PriceSyncStateContextValue {
  const ctx = useContext(PriceSyncStateContext);
  if (!ctx) throw new Error('usePriceSyncState must be used within PriceSyncProvider');
  return ctx;
}

/** 株価同期の操作のみ（priceSync 更新で再レンダーしない） */
export function usePriceSyncActions(): PriceSyncActionsContextValue {
  const ctx = useContext(PriceSyncActionsContext);
  if (!ctx) throw new Error('usePriceSyncActions must be used within PriceSyncProvider');
  return ctx;
}

export function usePriceSync(): PriceSyncContextValue {
  return { ...usePriceSyncState(), ...usePriceSyncActions() };
}

export function usePriceSyncOptional(): PriceSyncContextValue | null {
  const state = useContext(PriceSyncStateContext);
  const actions = useContext(PriceSyncActionsContext);
  if (!state || !actions) return null;
  return { ...state, ...actions };
}
