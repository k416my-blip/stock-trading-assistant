import { buildYahooChartUrl } from '../quoteProviders/yahooFinanceQuote';
import { fetchHttpWithRetry } from '../quoteProviders/providerFetchUtil';
import { parseYahooChartBars } from '../../utils/yahooChartParser';
import type { PriceBar } from '../../types';
import type { ForwardYahooSymbolFetchResult } from '../../types/forwardValidation';
import { priceBarsToOhlcv, type OhlcvBar } from './case4Indicators';

const HISTORY_START_SEC = Math.floor(new Date('2023-01-01T00:00:00Z').getTime() / 1000);

function period1SecFromDate(isoDate: string): number {
  return Math.floor(new Date(`${isoDate}T00:00:00Z`).getTime() / 1000);
}

export function buildYahooOhlcvUrl(yahooSymbol: string, startDate?: string): string {
  const period1 = startDate ? period1SecFromDate(startDate) : HISTORY_START_SEC;
  const period2 = Math.floor(Date.now() / 1000);
  const url = new URL(buildYahooChartUrl(yahooSymbol));
  url.searchParams.set('interval', '1d');
  url.searchParams.set('period1', String(period1));
  url.searchParams.set('period2', String(period2));
  return url.toString();
}

export async function fetchForwardOhlcvDetailed(
  yahooSymbol: string,
  timeoutMs = 15_000,
  startDate?: string,
): Promise<{ bars: OhlcvBar[]; result: ForwardYahooSymbolFetchResult }> {
  const url = buildYahooOhlcvUrl(yahooSymbol, startDate);
  const base: ForwardYahooSymbolFetchResult = {
    symbol: yahooSymbol,
    ok: false,
    barCount: 0,
    latestDate: null,
    httpStatus: null,
    error: null,
  };

  try {
    const { response, bodyText } = await fetchHttpWithRetry(url, {
      timeoutMs,
      logLabel: 'forward_validation_ohlcv',
      symbol: yahooSymbol,
    });
    base.httpStatus = response.status;
    if (!response.ok) {
      return {
        bars: [],
        result: {
          ...base,
          error: `HTTP ${response.status}: ${bodyText.slice(0, 200)}`,
        },
      };
    }
    const bars = priceBarsToOhlcv(parseYahooChartBars(JSON.parse(bodyText) as unknown) as PriceBar[]);
    const latestDate = bars.length > 0 ? bars[bars.length - 1]!.date : null;
    if (bars.length < 80) {
      return {
        bars,
        result: {
          ...base,
          barCount: bars.length,
          latestDate,
          error: `bars不足 (${bars.length} < 80)`,
        },
      };
    }
    return {
      bars,
      result: {
        ...base,
        ok: true,
        barCount: bars.length,
        latestDate,
      },
    };
  } catch (e) {
    return {
      bars: [],
      result: {
        ...base,
        error: e instanceof Error ? e.message : String(e),
      },
    };
  }
}

export async function fetchForwardOhlcv(yahooSymbol: string, timeoutMs = 15_000): Promise<OhlcvBar[]> {
  const { bars } = await fetchForwardOhlcvDetailed(yahooSymbol, timeoutMs);
  return bars;
}
