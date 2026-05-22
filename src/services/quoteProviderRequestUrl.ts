import { TWELVE_DATA_EXCHANGE } from '../constants/marketData';
import type { Market } from '../types';
import type { QuoteProviderId } from '../types/quoteProvider';
import { buildYahooChartUrl } from './quoteProviders/yahooFinanceQuote';
import { buildStooqUrl, toStooqSymbol } from './quoteProviders/stooqQuote';

/** プロバイダー失敗ログ用（APIキーはマスク） */
export function buildProviderRequestUrl(
  provider: QuoteProviderId,
  yahooSymbol: string,
  market: Market,
): string {
  switch (provider) {
    case 'yahoo_finance':
      return buildYahooChartUrl(yahooSymbol);
    case 'stooq':
      return buildStooqUrl(toStooqSymbol(yahooSymbol));
    case 'alpha_vantage':
      return `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(yahooSymbol)}`;
    case 'twelve_data': {
      const exchange = TWELVE_DATA_EXCHANGE[market];
      const params = new URLSearchParams({ symbol: yahooSymbol });
      if (exchange) params.set('exchange', exchange);
      return `https://api.twelvedata.com/quote?${params.toString()}&apikey=***`;
    }
    case 'rapidapi_yahoo':
      return `rapidapi:yahoo:${yahooSymbol}`;
    default:
      return yahooSymbol;
  }
}
