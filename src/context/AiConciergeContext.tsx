import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type AiConciergeContextValue = {
  panelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
};

const AiConciergeContext = createContext<AiConciergeContextValue | null>(null);

export function AiConciergeProvider({ children }: { children: ReactNode }) {
  const [panelOpen, setPanelOpen] = useState(false);

  const openPanel = useCallback(() => setPanelOpen(true), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);
  const togglePanel = useCallback(() => setPanelOpen((v) => !v), []);

  const value = useMemo(
    () => ({ panelOpen, openPanel, closePanel, togglePanel }),
    [panelOpen, openPanel, closePanel, togglePanel],
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
