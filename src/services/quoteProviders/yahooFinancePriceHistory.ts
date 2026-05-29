import type { PriceBar } from '../../types';
import { parseYahooChartBars } from '../../utils/yahooChartParser';
import { buildYahooChartUrl } from './yahooFinanceQuote';
import { fetchHttpWithRetry } from './providerFetchUtil';

const DEFAULT_RANGE = '6mo';
const DEFAULT_INTERVAL = '1d';
const MIN_BARS_FOR_RSI = 15;

export function buildYahooChartHistoryUrl(
  yahooSymbol: string,
  range = DEFAULT_RANGE,
  interval = DEFAULT_INTERVAL,
): string {
  const url = new URL(buildYahooChartUrl(yahooSymbol));
  url.searchParams.set('interval', interval);
  url.searchParams.set('range', range);
  return url.toString();
}

export async function fetchYahooFinancePriceHistory(
  yahooSymbol: string,
  timeoutMs = 12_000,
): Promise<PriceBar[]> {
  const url = buildYahooChartHistoryUrl(yahooSymbol);
  const { response, bodyText } = await fetchHttpWithRetry(url, {
    timeoutMs,
    logLabel: 'yahoo_finance_history',
    symbol: yahooSymbol,
  });
  if (!response.ok) return [];
  try {
    const data = JSON.parse(bodyText) as unknown;
    const bars = parseYahooChartBars(data);
    return bars.length >= MIN_BARS_FOR_RSI ? bars : [];
  } catch {
    return [];
  }
}
