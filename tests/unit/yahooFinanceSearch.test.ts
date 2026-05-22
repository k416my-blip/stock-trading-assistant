import { describe, expect, it } from 'vitest';
import { BURSA_SYMBOL_MAP, BURSA_YAHOO_SYMBOL_SEED } from '../../src/constants/yahooFinance';
import {
  isBursaMalaysiaQuote,
  pickBursaMalaysiaSearchQuote,
  type YahooSearchQuote,
} from '../../src/services/quoteProviders/yahooFinanceSearch';
import {
  resetYahooSymbolAliasCacheForTests,
  resolveYahooSymbolsToTry,
} from '../../src/services/yahooSymbolAliasCache';
import { formatQuoteErrorForUser } from '../../src/utils/formatQuoteError';
import { MarketDataError } from '../../src/services/marketDataService';
import { YAHOO_SYMBOL_NOT_FOUND_MESSAGE } from '../../src/constants/yahooFinance';

describe('yahooFinanceSearch', () => {
  it('picks KLS .KL quote for 4707 over Japan/Taiwan', () => {
    const quotes: YahooSearchQuote[] = [
      { symbol: '4707.KL', exchange: 'KLS', shortname: 'NESTLE', longname: 'Nestlé (Malaysia) Berhad' },
      { symbol: '4707.T', exchange: 'JPX', shortname: 'KITAC CORP' },
      { symbol: '4707.TWO', exchange: 'TWO', shortname: 'PAN ASIA' },
    ];
    const pick = pickBursaMalaysiaSearchQuote(quotes, '4707');
    expect(pick?.symbol).toBe('4707.KL');
    expect(pick?.exchange).toBe('KLS');
    expect(pick?.longname).toContain('Nestlé');
  });

  it('identifies Bursa quotes by .KL or KLS', () => {
    expect(isBursaMalaysiaQuote({ symbol: '4707.KL', exchange: 'KLS', shortname: 'NESTLE' })).toBe(true);
    expect(isBursaMalaysiaQuote({ symbol: '4707.T', exchange: 'JPX', shortname: 'X' })).toBe(false);
  });

  it('Nestlé Malaysia seed alias is 4707.KL', () => {
    expect(BURSA_YAHOO_SYMBOL_SEED['4707'].yahooSymbol).toBe('4707.KL');
    expect(BURSA_YAHOO_SYMBOL_SEED['4707'].longName).toContain('Nestlé');
  });

  it('BURSA_SYMBOL_MAP hardcodes Nestlé Malaysia to 4707.KL', () => {
    expect(BURSA_SYMBOL_MAP['4707']).toBe('4707.KL');
  });

  it('resolveYahooSymbolsToTry prefers hardcoded map and includes fallbacks', async () => {
    resetYahooSymbolAliasCacheForTests();
    const list = await resolveYahooSymbolsToTry('4707', '4707.KL');
    expect(list[0]).toBe('4707.KL');
    expect(list).toContain('NESM.KL');
    expect(list).toContain('NESTLE.KL');
    expect(list).toContain('4707');
  });

  it('formatQuoteError shows Yahoo symbol not found message', () => {
    const err = new MarketDataError('symbol_invalid', YAHOO_SYMBOL_NOT_FOUND_MESSAGE, {
      rawMessage: YAHOO_SYMBOL_NOT_FOUND_MESSAGE,
    });
    expect(formatQuoteErrorForUser(err, 'bursa')).toBe(YAHOO_SYMBOL_NOT_FOUND_MESSAGE);
  });
});
