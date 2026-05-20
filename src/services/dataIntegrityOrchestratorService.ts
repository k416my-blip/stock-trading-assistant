import { SAMPLE_STOCKS } from '../data/sampleStocks';
import { getExtendedPriceHistory } from '../data/extendedPriceHistory';
import type { PortfolioPosition } from '../types';
import type { DataIntegrityReport } from '../types/dataIntegrity';
import { buildDataIntegrityReport } from './dataIntegrityEngine';
import { getMarketDataDiagnosticsSnapshot } from './marketDataDiagnostics';
import { barsToAdjustedOHLCV } from './priceAdjustmentService';
import {
  getNormalizedQuote,
  loadNormalizedOHLCVDataset,
  portfolioDataConfidence,
} from './normalizedMarketData';
import type { DataIntegrityInput } from '../types/dataIntegrity';

function extendedToBars(symbol: string) {
  return barsToAdjustedOHLCV(
    getExtendedPriceHistory(symbol, 120).map((b) => ({
      datetime: b.date,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: b.volume,
    })),
    false,
  );
}

export async function runDataIntegrityAudit(params: {
  portfolio?: PortfolioPosition[];
  maxSymbols?: number;
}): Promise<DataIntegrityReport> {
  const diag = getMarketDataDiagnosticsSnapshot();
  const apiDiagnostics = {
    successRatePct: diag.successRatePercent,
    timeoutCount: diag.timeoutCount,
    rateLimitCount: diag.rateLimitCount,
  };

  let survivorship = null;
  const inputs: DataIntegrityInput[] = [];

  const holdings =
    params.portfolio && params.portfolio.length > 0
      ? params.portfolio.filter((p) => p.shares > 0)
      : SAMPLE_STOCKS.slice(0, params.maxSymbols ?? 8).map((s) => ({
          symbol: s.symbol,
          market: s.market,
          currency: s.currency,
          shares: 1,
          averageBuyPrice: s.price,
          currentPrice: s.price,
        }));

  try {
    const { dataset } = await loadNormalizedOHLCVDataset({
      maxSymbols: params.maxSymbols ?? 10,
    });
    survivorship = dataset.survivorship;

    for (const series of dataset.series) {
      const pos = holdings.find((h) => h.symbol === series.symbol);
      const currency =
        pos?.currency ?? (series.market === 'us' ? 'USD' : series.market === 'hk' ? 'HKD' : 'MYR');
      const normalized = await getNormalizedQuote(series.market, series.symbol, {
        currency,
        portfolio: params.portfolio,
      });
      const quote = normalized
        ? {
            symbol: series.symbol,
            exchange: series.market,
            currency: normalized.currency,
            price: normalized.price,
            datetime: normalized.fetchedAt,
            isDelayed: normalized.staleByAge,
          }
        : null;
      inputs.push({
        symbol: series.symbol,
        market: series.market,
        bars: series.bars,
        quote,
        quoteFetchedAt: normalized?.fetchedAt,
        referenceBarClose: series.bars[series.bars.length - 1]?.close,
        apiDiagnostics,
      });
    }
  } catch {
    /* fallback below */
  }

  if (inputs.length === 0) {
    for (const h of holdings.slice(0, params.maxSymbols ?? 8)) {
      const bars = extendedToBars(h.symbol);
      inputs.push({
        symbol: h.symbol,
        market: h.market,
        bars,
        referenceBarClose: bars[bars.length - 1]?.close ?? h.currentPrice,
        apiDiagnostics,
      });
    }
  }

  const dataConfidence = portfolioDataConfidence(params.portfolio);
  return buildDataIntegrityReport({
    inputs,
    survivorship,
    apiDiagnostics,
    dataConfidence,
  });
}

export async function runDemoDataIntegrityAudit(): Promise<DataIntegrityReport> {
  const inputs: DataIntegrityInput[] = SAMPLE_STOCKS.slice(0, 6).map((s) => {
    const bars = extendedToBars(s.symbol);
    return {
      symbol: s.symbol,
      market: s.market,
      bars,
      referenceBarClose: bars[bars.length - 1]?.close,
    };
  });
  return buildDataIntegrityReport({ inputs, survivorship: null });
}
