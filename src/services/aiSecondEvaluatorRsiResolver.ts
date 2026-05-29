/**
 * AI第二評価 — RSI（Twelve Data 非依存）
 * 優先: Yahoo Finance 日足 → Bursa シンボル解決 → ローカルサンプル履歴
 */
import { getSamplePriceHistory } from '../data/sampleStocks';
import type { ConciergeSymbolEvidence } from '../types/conciergeEvidence';
import type { PriceBar } from '../types';
import type { AiSecondEvaluatorRsiSource } from '../types/aiSecondEvaluator';
import { normalizeBursaCoreSymbol } from './bursaSymbolFormat';
import { fetchYahooFinancePriceHistory } from './quoteProviders/yahooFinancePriceHistory';
import { analyzeTechnicals } from './technicalAnalysis';
import { resolveYahooSymbolsToTry } from './yahooSymbolAliasCache';
import { isMalaysiaMarket } from '../utils/normalizeBursaSymbol';
import { normalizeYahooSymbol } from '../utils/normalizeYahooSymbol';

const MIN_BARS_FOR_RSI = 15;

export type AiEvaluatorRsiPack = {
  rsi14: number | null;
  rsiSource: AiSecondEvaluatorRsiSource;
  rsiValue: number | null;
  priceHistoryBars: number;
  volume: number | null;
  volumeSurgeRatio: number | null;
  volumeSource: string;
};

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/\.(KL|HK)$/i, '');
}

function volumeSurgeFromBars(bars: PriceBar[]): number | null {
  if (bars.length < 10) return null;
  const volumes = bars.map((b) => b.volume);
  const recent = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const prior = volumes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
  if (prior <= 0) return null;
  return recent / prior;
}

function packFromBars(
  bars: PriceBar[],
  rsiSource: AiSecondEvaluatorRsiSource,
  sym: ConciergeSymbolEvidence,
  volumeSource: string,
): AiEvaluatorRsiPack {
  const tech = analyzeTechnicals(bars);
  const rsi14 = Number.isFinite(tech.rsi14) ? Math.round(tech.rsi14) : null;
  const lastVol = bars.at(-1)?.volume ?? null;
  return {
    rsi14,
    rsiValue: rsi14,
    rsiSource,
    priceHistoryBars: bars.length,
    volume: lastVol ?? sym.volume,
    volumeSurgeRatio: volumeSurgeFromBars(bars) ?? sym.volumeSurgeRatio,
    volumeSource,
  };
}

function localSampleBars(sym: ConciergeSymbolEvidence): PriceBar[] {
  return getSamplePriceHistory(normalizeSymbol(sym.symbol));
}

export async function resolveRsiForAiEvaluator(
  sym: ConciergeSymbolEvidence,
  allowApi: boolean,
): Promise<AiEvaluatorRsiPack> {
  const sampleBars = localSampleBars(sym);

  if (!allowApi) {
    return packFromBars(sampleBars, 'local_price_history', sym, 'local_price_history');
  }

  const yahooSymbol = normalizeYahooSymbol(sym.symbol, sym.market);
  try {
    const yahooBars = await fetchYahooFinancePriceHistory(yahooSymbol);
    if (yahooBars.length >= MIN_BARS_FOR_RSI) {
      return packFromBars(yahooBars, 'yahoo_finance', sym, 'yahoo_finance');
    }
  } catch {
    /* fall through */
  }

  if (isMalaysiaMarket(sym.market)) {
    const core = normalizeBursaCoreSymbol(sym.symbol);
    const candidates = await resolveYahooSymbolsToTry(core, yahooSymbol);
    for (const candidate of candidates) {
      if (candidate === yahooSymbol) continue;
      try {
        const bursaBars = await fetchYahooFinancePriceHistory(candidate);
        if (bursaBars.length >= MIN_BARS_FOR_RSI) {
          return packFromBars(bursaBars, 'bursa_malaysia', sym, 'bursa_malaysia');
        }
      } catch {
        /* try next candidate */
      }
    }
  }

  if (sampleBars.length >= MIN_BARS_FOR_RSI) {
    return packFromBars(sampleBars, 'local_price_history', sym, 'local_price_history');
  }

  const tech = analyzeTechnicals(sampleBars);
  const rsi14 = Number.isFinite(tech.rsi14) ? Math.round(tech.rsi14) : null;
  return {
    rsi14,
    rsiValue: rsi14,
    rsiSource: 'insufficient_bars',
    priceHistoryBars: sampleBars.length,
    volume: sym.volume ?? sampleBars.at(-1)?.volume ?? null,
    volumeSurgeRatio: sym.volumeSurgeRatio,
    volumeSource: 'insufficient_bars',
  };
}
