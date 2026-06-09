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
import {
  formatMaterialAnalysisReport,
  type MaterialAnalysisReport,
} from '../services/bursa/bursaMaterialAnalysisService';
import {
  runMaterialApiAudit,
  type MaterialApiAuditReport,
} from '../services/bursa/bursaMaterialApiAudit';
import { buildBursaPhase11Analysis } from '../services/bursa/bursaPhase11Analysis';

type BursaMaterialContextValue = {
  report: MaterialAnalysisReport | null;
  auditReport: MaterialApiAuditReport | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const BursaMaterialContext = createContext<BursaMaterialContextValue | null>(null);

export function BursaMaterialProvider({ children }: { children: ReactNode }) {
  const { state, loading: appLoading } = useApp();
  const [report, setReport] = useState<MaterialAnalysisReport | null>(null);
  const [auditReport, setAuditReport] = useState<MaterialApiAuditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [phase11, audit] = await Promise.all([
        buildBursaPhase11Analysis({
          holdings: state.portfolio,
          fetchLiveExternal: true,
        }),
        runMaterialApiAudit(),
      ]);
      setReport(formatMaterialAnalysisReport(phase11));
      setAuditReport(audit);
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

  const value = useMemo(
    () => ({ report, auditReport, loading, error, refresh }),
    [report, auditReport, loading, error, refresh],
  );

  return (
    <BursaMaterialContext.Provider value={value}>{children}</BursaMaterialContext.Provider>
  );
}

export function useBursaMaterial(): BursaMaterialContextValue {
  const ctx = useContext(BursaMaterialContext);
  if (!ctx) {
    throw new Error('useBursaMaterial must be used within BursaMaterialProvider');
  }
  return ctx;
}

export function useBursaMaterialOptional(): BursaMaterialContextValue | null {
  return useContext(BursaMaterialContext);
}
