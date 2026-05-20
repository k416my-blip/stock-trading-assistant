/**
 * 分析・インテリジェンス層向けの読み取り専用市場データ API。
 * 外部 API は呼ばない — キャッシュ済み正規化データのみを返す。
 *
 * 外部 API 呼び出しは marketDataService のみが行う。
 */
import { EMERGENCY_QUOTE_MAX_AGE_MS, STALE_QUOTE_MAX_AGE_MS } from '../constants/marketData';
import { OHLCV_MIN_HISTORY_DAYS, OHLCV_OUTPUT_SIZE } from '../constants/quantValidation';
import { SAMPLE_STOCKS } from '../data/sampleStocks';
import { getExtendedPriceHistory } from '../data/extendedPriceHistory';
import type { Currency, Market, PortfolioPosition, PriceBar } from '../types';
import type {
  AdjustedOHLCVBar,
  OHLCVDataset,
  QuantDataSource,
  SurvivorshipBiasReport,
  SymbolOHLCVSeries,
} from '../types/quantValidation';
import { getCachedQuote, getEmergencyCachedQuote, type CachedQuoteEntry } from './quoteCache';
import { loadOHLCVCache } from './ohlcvCacheService';
import {
  applyStaleDataConfidencePenalty,
  staleFractionFromFlags,
} from './staleDataConfidence';

export type NormalizedQuoteSource = 'cache' | 'portfolio' | 'unavailable';

export interface NormalizedQuote {
  price: number;
  currency: Currency;
  fetchedAt: string;
  lastSuccessfulFetchAt?: string;
  quoteAgeMs: number;
  isStale: boolean;
  source: NormalizedQuoteSource;
  fromCache: boolean;
  staleByAge: boolean;
  /** 0–1 分析信頼度（ステールで減衰） */
  dataConfidence: number;
}

function extendedToAdjusted(bars: PriceBar[]): AdjustedOHLCVBar[] {
  return bars.map((b) => ({
    date: b.date,
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
    adjClose: b.close,
    volume: b.volume,
    splitAdjFactor: 1,
    dividendAdjFactor: 1,
  }));
}

function buildSurvivorshipReport(series: SymbolOHLCVSeries[]): SurvivorshipBiasReport {
  const included = series.map((s) => s.symbol);
  const allSymbols = SAMPLE_STOCKS.map((s) => s.symbol);
  const excluded = allSymbols
    .filter((sym) => !included.includes(sym))
    .map((sym) => ({
      symbol: sym,
      reasonJa: '履歴不足・キャッシュ未整備・上場廃止の可能性',
    }));

  return {
    pointInTimeSafe: excluded.length === 0,
    currentUniverseOnly: true,
    symbolsIncluded: included,
    symbolsExcluded: excluded,
    warningJa:
      '現在の銘柄リストはサバイバーシップ・バイアスを含みます。除外銘柄はバックテストから外しています（ポイントインタイム・セーフ）。',
  };
}

function alignDates(series: SymbolOHLCVSeries[]): string[] {
  if (series.length === 0) return [];
  const counts = new Map<string, number>();
  for (const s of series) {
    for (const b of s.bars) {
      counts.set(b.date, (counts.get(b.date) ?? 0) + 1);
    }
  }
  const minCount = Math.ceil(series.length * 0.6);
  return [...counts.entries()]
    .filter(([, c]) => c >= minCount)
    .map(([d]) => d)
    .sort();
}

function cachedEntryToSeries(entry: {
  symbol: string;
  market: Market;
  bars: AdjustedOHLCVBar[];
  fetchedAt: string;
  adjustMode: 'all' | 'none';
}): SymbolOHLCVSeries {
  return {
    symbol: entry.symbol,
    market: entry.market,
    bars: entry.bars,
    fetchedAt: entry.fetchedAt,
    adjustMode: entry.adjustMode,
    minHistoryDays: entry.bars.length,
  };
}

function quoteToNormalized(
  row: CachedQuoteEntry,
  maxAgeMs: number,
): NormalizedQuote {
  const isStale = row.isStale ?? row.quoteAgeMs > maxAgeMs;
  const dataConfidence = applyStaleDataConfidencePenalty(1, isStale ? 1 : 0);
  return {
    price: row.price,
    currency: row.currency,
    fetchedAt: row.fetchedAt,
    lastSuccessfulFetchAt: row.lastSuccessfulFetchAt,
    quoteAgeMs: row.quoteAgeMs,
    isStale,
    source: 'cache',
    fromCache: true,
    staleByAge: isStale,
    dataConfidence,
  };
}

/** 保有リストからステール比率に基づく分析信頼度係数（0–1） */
export function portfolioDataConfidence(portfolio?: PortfolioPosition[]): number {
  if (!portfolio?.length) return 1;
  const flags = portfolio
    .filter((p) => p.shares > 0)
    .map((p) => p.isStale === true || p.priceFetchStatus === 'failed');
  return applyStaleDataConfidencePenalty(1, staleFractionFromFlags(flags));
}

/** 正規化クォート（キャッシュ → 保有ポジションの最終価格） */
export async function getNormalizedQuote(
  market: Market,
  symbol: string,
  options?: {
    currency?: Currency;
    portfolio?: PortfolioPosition[];
    maxAgeMs?: number;
    allowEmergencyCache?: boolean;
  },
): Promise<NormalizedQuote | null> {
  const maxAge = options?.maxAgeMs ?? STALE_QUOTE_MAX_AGE_MS;
  const currency = options?.currency ?? (market === 'us' ? 'USD' : market === 'hk' ? 'HKD' : 'MYR');

  const fresh = await getCachedQuote(market, symbol, maxAge);
  if (fresh) return quoteToNormalized(fresh, maxAge);

  if (options?.allowEmergencyCache !== false) {
    const emergency = await getEmergencyCachedQuote(market, symbol);
    if (emergency) {
      const base = quoteToNormalized(emergency, EMERGENCY_QUOTE_MAX_AGE_MS);
      return {
        ...base,
        isStale: true,
        staleByAge: true,
        dataConfidence: applyStaleDataConfidencePenalty(1, 1),
      };
    }
  }

  const pos = options?.portfolio?.find(
    (p) => p.market === market && p.symbol.toUpperCase() === symbol.toUpperCase() && p.shares > 0,
  );
  if (pos && pos.currentPrice > 0) {
    const isStale = pos.isStale === true || pos.priceFetchStatus === 'failed';
    return {
      price: pos.currentPrice,
      currency: pos.currency,
      fetchedAt: pos.currentPriceUpdatedAt ?? pos.openedAt,
      lastSuccessfulFetchAt: pos.lastSuccessfulFetchAt,
      quoteAgeMs: pos.quoteAgeMs ?? 0,
      isStale,
      source: 'portfolio',
      fromCache: false,
      staleByAge: isStale,
      dataConfidence: applyStaleDataConfidencePenalty(1, isStale ? 1 : 0),
    };
  }

  return null;
}

/**
 * 正規化 OHLCV データセット（キャッシュ + ローカル拡張履歴のみ、API 呼び出しなし）
 */
export async function loadNormalizedOHLCVDataset(options?: {
  maxSymbols?: number;
}): Promise<{ dataset: OHLCVDataset; dataSource: QuantDataSource }> {
  const maxSymbols = options?.maxSymbols ?? 12;
  const stocks = SAMPLE_STOCKS.filter((s) => s.volume > 100_000).slice(0, maxSymbols);
  const cache = await loadOHLCVCache();
  let dataSource: QuantDataSource = 'cache';
  const series: SymbolOHLCVSeries[] = [];

  for (const stock of stocks) {
    const key = `${stock.market}:${stock.symbol}`;
    const cached = cache[key];
    if (cached?.bars.length && cached.bars.length >= OHLCV_MIN_HISTORY_DAYS) {
      series.push(cachedEntryToSeries(cached));
    }
  }

  if (series.length < 3) {
    dataSource = 'synthetic_fallback';
    for (const stock of stocks.slice(0, 8)) {
      const bars = extendedToAdjusted(getExtendedPriceHistory(stock.symbol, OHLCV_OUTPUT_SIZE));
      series.push({
        symbol: stock.symbol,
        market: stock.market,
        bars,
        fetchedAt: new Date().toISOString(),
        adjustMode: 'none',
        minHistoryDays: bars.length,
      });
    }
  }

  const survivorship = buildSurvivorshipReport(series);
  const alignedDates = alignDates(series);

  return {
    dataset: { series, alignedDates, survivorship },
    dataSource,
  };
}
