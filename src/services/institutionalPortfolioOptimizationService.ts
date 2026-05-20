import { OHLCV_MIN_HISTORY_DAYS } from '../constants/quantValidation';
import { DEFAULT_MAX_SINGLE_WEIGHT_PCT } from '../constants/portfolioOptimization';
import { findStock, getSamplePriceHistory } from '../data/sampleStocks';
import { stockToSectorTheme } from './marketIndicators';
import { getExtendedPriceHistory } from '../data/extendedPriceHistory';
import type { Market, PortfolioPosition } from '../types';
import type { MarketRegimeResult } from '../types/marketRegime';
import type { PortfolioConstructionReport } from '../types/portfolioConstruction';
import type {
  PortfolioOptimizationInput,
  PortfolioOptimizationReport,
} from '../types/portfolioOptimization';
import type { QuantDataSource } from '../types/quantValidation';
import { dailyReturns } from './crisisCorrelationEngine';
import { loadNormalizedOHLCVDataset } from './normalizedMarketData';
import type { OHLCVDataset } from '../types/quantValidation';
import { liquidityAdjustedMaxAllocationPct } from './portfolioConstructionEngine';
import { runPortfolioOptimization } from './portfolioOptimizationEngine';
import { toMYR } from './fx';

function alignReturnMatrixFromOHLCV(
  symbols: string[],
  markets: Market[],
  dataset: OHLCVDataset,
): number[][] | null {
  const series = symbols
    .map((sym, idx) => {
      const market = markets[idx];
      const s = dataset.series.find((x) => x.symbol === sym && x.market === market);
      return s ? { sym, bars: s.bars } : null;
    })
    .filter(Boolean) as { sym: string; bars: { date: string; adjClose: number }[] }[];

  if (series.length < symbols.length) return null;

  const dateSets = series.map((s) => new Set(s.bars.map((b) => b.date)));
  const commonDates = [...dateSets[0]].filter((d) =>
    dateSets.every((set) => set.has(d)),
  );
  commonDates.sort();
  if (commonDates.length < OHLCV_MIN_HISTORY_DAYS) return null;

  const matrix: number[][] = [];
  for (const s of series) {
    const byDate = new Map(s.bars.map((b) => [b.date, b.adjClose]));
    const closes = commonDates.map((d) => byDate.get(d) ?? 0);
    const rets: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      if (closes[i - 1] > 0) rets.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }
    matrix.push(rets);
  }
  const minLen = Math.min(...matrix.map((r) => r.length));
  return matrix.map((r) => r.slice(-minLen));
}

function alignReturnMatrixFromSample(symbols: string[]): number[][] {
  const allRets = symbols.map((sym) => {
    try {
      const bars = getExtendedPriceHistory(sym);
      return dailyReturns(bars);
    } catch {
      try {
        return dailyReturns(getSamplePriceHistory(sym));
      } catch {
        return [] as number[];
      }
    }
  });
  const minLen = Math.min(...allRets.map((r) => r.length).filter((l) => l > 0));
  if (!Number.isFinite(minLen) || minLen < OHLCV_MIN_HISTORY_DAYS) {
    return allRets.map((r) => r.slice(-Math.max(60, r.length)));
  }
  return allRets.map((r) => r.slice(-minLen));
}

export async function runInstitutionalPortfolioOptimization(params: {
  apiKey: string;
  portfolio: PortfolioPosition[];
  totalPortfolioValueMYR: number;
  regime: MarketRegimeResult;
  constructionReport?: PortfolioConstructionReport;
  maxSymbols?: number;
}): Promise<PortfolioOptimizationReport> {
  const holdings = params.portfolio.filter((p) => p.shares > 0);
  if (holdings.length === 0) {
    throw new Error('保有銘柄がありません。最適化には1銘柄以上必要です。');
  }

  const symbols = holdings.map((p) => p.symbol);
  const markets = holdings.map((p) => p.market);
  const maxSymbols = params.maxSymbols ?? 12;

  let returnMatrix: number[][] = [];
  let dataSource: QuantDataSource = 'synthetic_fallback';

  try {
    const { dataset, dataSource: ds } = await loadNormalizedOHLCVDataset({ maxSymbols });
    dataSource = ds;
    const ohlcvMatrix = alignReturnMatrixFromOHLCV(symbols, markets, dataset);
    if (ohlcvMatrix && ohlcvMatrix[0]?.length >= OHLCV_MIN_HISTORY_DAYS) {
      returnMatrix = ohlcvMatrix;
    }
  } catch {
    /* fallback below */
  }

  if (returnMatrix.length === 0 || (returnMatrix[0]?.length ?? 0) < OHLCV_MIN_HISTORY_DAYS) {
    returnMatrix = alignReturnMatrixFromSample(symbols);
    dataSource = 'synthetic_fallback';
  }

  const total = Math.max(params.totalPortfolioValueMYR, 1);
  const currentWeightsPct = new Map<string, number>();
  const liquidityMaxPct = new Map<string, number>();
  const betas = new Map<string, number>();
  const sectors = new Map<string, string>();

  for (const p of holdings) {
    const price = p.currentPrice || p.averageBuyPrice;
    const mv = toMYR(price * p.shares, p.currency);
    currentWeightsPct.set(p.symbol, (mv / total) * 100);

    const analysis = params.constructionReport?.positions.find(
      (a) => a.symbol === p.symbol,
    );
    betas.set(p.symbol, analysis?.betaProxy ?? 1);
    sectors.set(p.symbol, analysis?.sector ?? 'unknown');

    const liquidCap =
      params.constructionReport != null
        ? (liquidityAdjustedMaxAllocationPct(p.symbol, params.portfolio, total) ??
          DEFAULT_MAX_SINGLE_WEIGHT_PCT)
        : DEFAULT_MAX_SINGLE_WEIGHT_PCT;
    liquidityMaxPct.set(p.symbol, liquidCap);
  }

  const input: PortfolioOptimizationInput = {
    symbols,
    markets,
    returnMatrix,
    currentWeightsPct,
    liquidityMaxPct,
    betas,
    sectors,
    regimeId: params.regime.regimeId,
  };

  return runPortfolioOptimization(input, dataSource);
}

/** 保有なし — サンプルユニバースでデモ最適化 */
export async function runDemoPortfolioOptimization(params: {
  apiKey: string;
  regime: MarketRegimeResult;
}): Promise<PortfolioOptimizationReport> {
  const demoSymbols = ['AAPL', 'MSFT', 'NVDA', 'VOO', '7203', '9984'];
  const demoMarkets: Market[] = ['us', 'us', 'us', 'us', 'hk', 'hk'];

  let returnMatrix = alignReturnMatrixFromSample(demoSymbols);
  let dataSource: QuantDataSource = 'synthetic_fallback';

  try {
    const { dataset, dataSource: ds } = await loadNormalizedOHLCVDataset({ maxSymbols: 8 });
    const m = alignReturnMatrixFromOHLCV(demoSymbols, demoMarkets, dataset);
    if (m && m[0]?.length >= OHLCV_MIN_HISTORY_DAYS) {
      returnMatrix = m;
      dataSource = ds;
    }
  } catch {
    /* keep synthetic */
  }

  const equal = 100 / demoSymbols.length;
  const input: PortfolioOptimizationInput = {
    symbols: demoSymbols,
    markets: demoMarkets,
    returnMatrix,
    currentWeightsPct: new Map(demoSymbols.map((s) => [s, equal])),
    liquidityMaxPct: new Map(demoSymbols.map((s) => [s, DEFAULT_MAX_SINGLE_WEIGHT_PCT])),
    betas: new Map(demoSymbols.map((s) => [s, 1])),
    sectors: new Map(
      demoSymbols.map((s) => {
        const st = findStock(s);
        return [s, st ? stockToSectorTheme(st) : 'growth'];
      }),
    ),
    regimeId: params.regime.regimeId,
  };

  return runPortfolioOptimization(input, dataSource);
}
