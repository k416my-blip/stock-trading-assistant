import { useEffect, useMemo, useState } from 'react';
import {
  buildAiAnalystReportAsync,
  buildEmptyAnalystReport,
} from '../services/aiAnalystReportBuilder';
import type { PortfolioAiEvaluationBundle } from '../types/portfolioAiEvaluation';
import type { PortfolioPosition } from '../types';
import type { AiAnalystReportBundle } from '../types/aiStockReport';

export function useAiAnalystReport(input: {
  portfolio: PortfolioAiEvaluationBundle | null;
  holdings: PortfolioPosition[];
  twelveDataApiKey?: string;
  newsApiKey?: string;
}): AiAnalystReportBundle {
  const holdingKey = useMemo(
    () =>
      input.holdings
        .filter((p) => (p.shares ?? 0) > 0)
        .map((p) => `${p.market}:${p.symbol}:${p.currentPrice}`)
        .join('|'),
    [input.holdings],
  );
  const portfolioScore = input.portfolio?.portfolioScore ?? 50;

  const [report, setReport] = useState<AiAnalystReportBundle>(() =>
    buildEmptyAnalystReport({
      portfolio: input.portfolio,
      holdings: input.holdings,
    }),
  );

  useEffect(() => {
    setReport(
      buildEmptyAnalystReport({
        portfolio: input.portfolio,
        holdings: input.holdings,
      }),
    );
    let cancelled = false;
    void buildAiAnalystReportAsync({
      portfolio: input.portfolio,
      holdings: input.holdings,
      twelveDataApiKey: input.twelveDataApiKey,
      newsApiKey: input.newsApiKey,
    }).then((r) => {
      if (!cancelled) setReport(r);
    });
    return () => {
      cancelled = true;
    };
  }, [
    holdingKey,
    portfolioScore,
    input.twelveDataApiKey,
    input.newsApiKey,
    input.portfolio,
    input.holdings,
  ]);

  return report;
}
