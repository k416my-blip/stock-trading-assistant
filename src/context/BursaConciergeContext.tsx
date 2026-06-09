import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useApp } from './AppContext';
import { formatConciergeNotificationReport } from '../services/bursa/bursaConciergeNotificationService';
import {
  markAllConciergeNotificationsRead,
  markConciergeNotificationRead,
  writeConciergeSoundEnabled,
} from '../services/bursa/bursaConciergeNotificationStorage';
import { refreshBursaConciergeOnBoot } from '../services/bursa/bursaPhase10Analysis';
import type { ConciergeNotificationReport } from '../services/bursa/bursaConciergeNotificationService';

type BursaConciergeContextValue = {
  report: ConciergeNotificationReport | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  setSoundEnabled: (enabled: boolean) => Promise<void>;
};

const BursaConciergeContext = createContext<BursaConciergeContextValue | null>(null);

export function BursaConciergeProvider({ children }: { children: ReactNode }) {
  const { state, loading: appLoading } = useApp();
  const [report, setReport] = useState<ConciergeNotificationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const phase10 = await refreshBursaConciergeOnBoot({ holdings: state.portfolio });
      setReport(formatConciergeNotificationReport(phase10));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [state.portfolio]);

  useEffect(() => {
    if (appLoading) return;
    void refresh();
  }, [appLoading, refresh]);

  const markRead = useCallback(
    async (id: string) => {
      await markConciergeNotificationRead(id);
      await refresh();
    },
    [refresh],
  );

  const markAllRead = useCallback(async () => {
    await markAllConciergeNotificationsRead();
    await refresh();
  }, [refresh]);

  const setSoundEnabled = useCallback(
    async (enabled: boolean) => {
      await writeConciergeSoundEnabled(enabled);
      await refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({ report, loading, error, refresh, markRead, markAllRead, setSoundEnabled }),
    [report, loading, error, refresh, markRead, markAllRead, setSoundEnabled],
  );

  return (
    <BursaConciergeContext.Provider value={value}>{children}</BursaConciergeContext.Provider>
  );
}

export function useBursaConcierge(): BursaConciergeContextValue {
  const ctx = useContext(BursaConciergeContext);
  if (!ctx) {
    throw new Error('useBursaConcierge must be used within BursaConciergeProvider');
  }
  return ctx;
}
