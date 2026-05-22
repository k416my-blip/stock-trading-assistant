import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type OpenConciergePanelOptions = {
  seedMessage?: string;
  focusSuggestionId?: string;
};

type AiConciergeContextValue = {
  panelOpen: boolean;
  panelOptions: OpenConciergePanelOptions | null;
  openPanel: (options?: OpenConciergePanelOptions) => void;
  closePanel: () => void;
  togglePanel: () => void;
  clearPanelOptions: () => void;
};

const AiConciergeContext = createContext<AiConciergeContextValue | null>(null);

export function AiConciergeProvider({ children }: { children: ReactNode }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelOptions, setPanelOptions] = useState<OpenConciergePanelOptions | null>(null);

  const openPanel = useCallback((options?: OpenConciergePanelOptions) => {
    if (options) setPanelOptions(options);
    setPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => setPanelOpen(false), []);
  const togglePanel = useCallback(() => setPanelOpen((v) => !v), []);
  const clearPanelOptions = useCallback(() => setPanelOptions(null), []);

  const value = useMemo(
    () => ({
      panelOpen,
      panelOptions,
      openPanel,
      closePanel,
      togglePanel,
      clearPanelOptions,
    }),
    [panelOpen, panelOptions, openPanel, closePanel, togglePanel, clearPanelOptions],
  );

  return <AiConciergeContext.Provider value={value}>{children}</AiConciergeContext.Provider>;
}

export function useAiConcierge(): AiConciergeContextValue {
  const ctx = useContext(AiConciergeContext);
  if (!ctx) {
    throw new Error('useAiConcierge must be used within AiConciergeProvider');
  }
  return ctx;
}

/** Returns null when provider is absent (tests). */
export function useAiConciergeOptional(): AiConciergeContextValue | null {
  return useContext(AiConciergeContext);
}
