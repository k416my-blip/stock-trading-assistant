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
import { isTwelveHourTestMonitorActive } from '../services/twelveHourTestMonitor';
import {
  formatMaterialAnalysisReport,
  MATERIAL_ANALYSIS_MISSING_JA,
  type MaterialAnalysisReport,
} from '../services/bursa/bursaMaterialAnalysisService';
import {
  runMaterialApiAudit,
  type MaterialApiAuditReport,
} from '../services/bursa/bursaMaterialApiAudit';
import { buildBursaPhase11Analysis } from '../services/bursa/bursaPhase11Analysis';
import { mapBursaAnalysisError } from '../services/bursa/bursaAnalysisDiagnostics';

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
      const { noteTwelveHourNewsFetch } = await import('../services/twelveHourTestMonitor');
      noteTwelveHourNewsFetch({
        stockCount: phase11.stocks.length,
        sources: phase11.stocks.map((s) => s.stockCode),
      });
    } catch (e) {
      setError(mapBursaAnalysisError('MaterialAnalysis', e, MATERIAL_ANALYSIS_MISSING_JA));
    } finally {
      setLoading(false);
    }
  }, [state.portfolio]);

  useEffect(() => {
    if (appLoading) return;
    void refresh();
  }, [appLoading, refresh]);

  useEffect(() => {
    if (!isTwelveHourTestMonitorActive()) return;
    const timer = setInterval(() => {
      void refresh();
    }, 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, [refresh]);

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
