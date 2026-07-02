import { useEffect, useMemo, useState } from 'react';
import type { PortfolioPosition } from '../types';
import type { MaterialAnalysisReport } from '../services/bursa/bursaMaterialAnalysisService';
import type { StrategyExecutionBundle } from '../types/strategyExecution';
import {
  buildBeginnerTodayAdvice,
  resolveTodayAdviceCardLoading,
  TODAY_AI_ADVICE_LOAD_TIMEOUT_MS,
  type BeginnerTodayAdviceCardData,
} from '../services/beginner/beginnerTodayAdviceBuilder';

type MaterialContextSlice = {
  report: MaterialAnalysisReport | null;
  loading: boolean;
  error: string | null;
} | null;

export function useBeginnerTodayAdviceCardData(input: {
  holdings: PortfolioPosition[];
  materialCtx: MaterialContextSlice;
  strategyBundle: StrategyExecutionBundle | null;
}): BeginnerTodayAdviceCardData {
  const [timedOut, setTimedOut] = useState(false);

  const materialPending = resolveTodayAdviceCardLoading({
    materialLoading: input.materialCtx?.loading,
    materialReport: input.materialCtx?.report ?? null,
    materialError: input.materialCtx?.error ?? null,
    materialContextAvailable: input.materialCtx != null,
    timedOut: false,
  });

  useEffect(() => {
    if (!materialPending) {
      setTimedOut(false);
      return;
    }
    setTimedOut(false);
    const timer = setTimeout(() => setTimedOut(true), TODAY_AI_ADVICE_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [materialPending, input.materialCtx?.report, input.materialCtx?.error]);

  return useMemo(
    () =>
      buildBeginnerTodayAdvice({
        holdings: input.holdings,
        materialReport: input.materialCtx?.report ?? null,
        strategyBundle: input.strategyBundle,
        loading: resolveTodayAdviceCardLoading({
          materialLoading: input.materialCtx?.loading,
          materialReport: input.materialCtx?.report ?? null,
          materialError: input.materialCtx?.error ?? null,
          materialContextAvailable: input.materialCtx != null,
          timedOut,
        }),
      }),
    [
      input.holdings,
      input.materialCtx?.report,
      input.materialCtx?.loading,
      input.materialCtx?.error,
      input.materialCtx,
      input.strategyBundle,
      timedOut,
    ],
  );
}
