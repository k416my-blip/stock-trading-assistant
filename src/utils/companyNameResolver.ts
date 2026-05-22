import { findStock } from '../data/sampleStocks';
import type { Market } from '../types';
import { displaySymbolCore } from './formatSymbolDisplay';
import { getYahooChartResult } from './yahooChartParser';

export function parseYahooCompanyName(json: unknown): string | undefined {
  const meta = getYahooChartResult(json)?.meta;
  const raw = meta?.longName ?? meta?.shortName;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function resolveCompanyNameFromStock(symbol: string, market: Market): string | undefined {
  const core = displaySymbolCore(symbol);
  const stock = findStock(core) ?? findStock(symbol);
  if (stock && stock.market === market) {
    return stock.name;
  }
  if (stock?.name) return stock.name;
  return undefined;
}

export function mergeCompanyName(
  symbol: string,
  market: Market,
  incoming?: string | null,
  existing?: string | null,
): string | undefined {
  const fromIncoming = incoming?.trim();
  if (fromIncoming) return fromIncoming;
  const fromExisting = existing?.trim();
  if (fromExisting) return fromExisting;
  return resolveCompanyNameFromStock(symbol, market);
}
