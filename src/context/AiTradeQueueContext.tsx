import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getActivePortfolio } from '../services/portfolioPriceUpdate';
import {
  ensureQueue,
  logAppPerf,
  refreshQueue,
  type AiTradeQueueSnapshot,
  type AiTradeQueueSource,
} from '../services/aiTradeQueueService';
import { getStartupMs } from '../services/appStartupPerf';
import type { AiStrategyBriefing, AiTradeQueueItem } from '../types/aiStrategyBriefing';
import { useApp } from './AppContext';
import { usePriceSyncActions } from './PriceSyncContext';

type AiTradeQueueContextValue = {
  queue: AiTradeQueueItem[];
  briefing: AiStrategyBriefing | null;
  source: AiTradeQueueSource | null;
  fetchedAt: string | null;
  loading: boolean;
  errorJa: string | null;
  /** Prices only — delegates to AppContext (not OpenAI queue). */
  refreshPrices: () => Promise<unknown>;
  /** Manual queue refresh (UI must not call on mount — Provider uses ensureQueue). */
  refreshQueueManual: (force?: boolean) => Promise<void>;
};

const AiTradeQueueContext = createContext<AiTradeQueueContextValue | null>(null);

export function AiTradeQueueProvider({ children }: { children: ReactNode }) {
  const { state, marketRegime, degradedMode } = useApp();
  const { refreshPortfolioPrices } = usePriceSyncActions();
  const [snapshot, setSnapshot] = useState<AiTradeQueueSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorJa, setErrorJa] = useState<string | null>(null);
  const ensureStartedRef = useRef(false);

  const buildInput = useMemo(() => {
    const portfolio = getActivePortfolio(state);
    return {
      marketRegime,
      degradedMode,
      holdings: portfolio
        .filter((p) => (p.shares ?? 0) > 0)
        .slice(0, 20)
        .map((p) => ({
          symbol: p.symbol,
          market: p.market,
          shares: p.shares ?? 0,
          isStale: Boolean(p.isStale),
        })),
    };
  }, [state, marketRegime, degradedMode]);

  const applySnapshot = useCallback((snap: AiTradeQueueSnapshot) => {
    setSnapshot(snap);
    setErrorJa(null);
  }, []);

  useEffect(() => {
    if (ensureStartedRef.current) return;
    ensureStartedRef.current = true;
    let cancelled = false;
    setLoading(true);
    void ensureQueue(buildInput)
      .then((snap) => {
        if (!cancelled) {
          applySnapshot(snap);
          logAppPerf(getStartupMs());
          if (typeof __DEV__ !== 'undefined' && __DEV__) {
            console.log('[ai-trade-queue-provider] ensureQueue settled', {
              source: snap.source,
              items: snap.queue.length,
            });
          }
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setErrorJa(e instanceof Error ? e.message : 'キュー取得に失敗しました');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applySnapshot, buildInput]);

  const refreshQueueManual = useCallback(
    async (force = true) => {
      setLoading(true);
      try {
        const snap = await refreshQueue(buildInput, { force });
        applySnapshot(snap);
      } catch (e) {
        setErrorJa(e instanceof Error ? e.message : 'キュー更新に失敗しました');
      } finally {
        setLoading(false);
      }
    },
    [applySnapshot, buildInput],
  );

  const refreshPrices = useCallback(() => refreshPortfolioPrices(), [refreshPortfolioPrices]);

  const value = useMemo((): AiTradeQueueContextValue => {
    const queue = snapshot?.queue ?? [];
    return {
      queue,
      briefing: snapshot?.briefing ?? null,
      source: snapshot?.source ?? null,
      fetchedAt: snapshot?.fetchedAt ?? null,
      loading,
      errorJa,
      refreshPrices,
      refreshQueueManual,
    };
  }, [snapshot, loading, errorJa, refreshPrices, refreshQueueManual]);

  return (
    <AiTradeQueueContext.Provider value={value}>{children}</AiTradeQueueContext.Provider>
  );
}

export function useAiTradeQueue(): AiTradeQueueContextValue {
  const ctx = useContext(AiTradeQueueContext);
  if (!ctx) {
    throw new Error('useAiTradeQueue must be used within AiTradeQueueProvider');
  }
  return ctx;
}
