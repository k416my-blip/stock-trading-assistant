import { describe, expect, it } from 'vitest';
import { normalizeBursaSymbol } from '../../src/utils/normalizeBursaSymbol';
import { normalizeYahooSymbol } from '../../src/utils/normalizeYahooSymbol';

describe('normalizeYahooSymbol', () => {
  it('appends .KL for numeric Bursa tickers', () => {
    expect(normalizeYahooSymbol('5183', 'bursa')).toBe('5183.KL');
    expect(normalizeYahooSymbol('1155', 'bursa')).toBe('1155.KL');
    expect(normalizeYahooSymbol('4707', 'bursa')).toBe('4707.KL');
  });

  it('normalizes prefixed and suffixed Bursa symbols', () => {
    expect(normalizeYahooSymbol('5183.KL', 'bursa')).toBe('5183.KL');
    expect(normalizeYahooSymbol('BURSA:1155', 'bursa')).toBe('1155.KL');
    expect(normalizeYahooSymbol('0820EA', 'bursa')).toBe('0820EA.KL');
  });

  it('normalizeBursaSymbol delegates to normalizeYahooSymbol', () => {
    expect(normalizeBursaSymbol('5183')).toBe('5183.KL');
    expect(normalizeBursaSymbol('1155')).toBe('1155.KL');
  });
});
