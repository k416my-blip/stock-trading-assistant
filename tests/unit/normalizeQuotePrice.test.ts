import { describe, expect, it } from 'vitest';
import { parseYahooPrice } from '../../src/utils/yahooChartParser';
import { isValidQuotePrice, normalizeQuotePrice } from '../../src/utils/safeNumeric';

describe('normalizeQuotePrice', () => {
  it('accepts positive numbers including 95', () => {
    expect(normalizeQuotePrice(95)).toBe(95);
    expect(isValidQuotePrice(95)).toBe(true);
  });

  it('accepts numeric strings from JSON APIs', () => {
    expect(normalizeQuotePrice('95')).toBe(95);
    expect(normalizeQuotePrice('95.50')).toBe(95.5);
    expect(isValidQuotePrice('95')).toBe(true);
  });

  it('rejects falsy-looking but invalid values', () => {
    expect(normalizeQuotePrice(0)).toBeNull();
    expect(normalizeQuotePrice('')).toBeNull();
    expect(normalizeQuotePrice(null)).toBeNull();
    expect(normalizeQuotePrice(undefined)).toBeNull();
    expect(normalizeQuotePrice(Number.NaN)).toBeNull();
    expect(normalizeQuotePrice([])).toBeNull();
    expect(normalizeQuotePrice({})).toBeNull();
  });

  it('parses Yahoo chart meta string prices', () => {
    const price = parseYahooPrice({
      chart: {
        result: [
          {
            meta: { regularMarketPrice: '95' },
            indicators: { quote: [{ close: [null, 94.5, 95] }] },
          },
        ],
      },
    });
    expect(price).toBe(95);
  });
});
