import { describe, expect, it } from 'vitest';
import { formatSymbolDisplay } from '../../src/utils/formatSymbolDisplay';
import { normalizeBursaSymbol } from '../../src/utils/normalizeBursaSymbol';

describe('formatSymbolDisplay', () => {
  it('formats symbol with market and company name', () => {
    expect(
      formatSymbolDisplay({
        symbol: '7103',
        market: 'bursa',
        companyName: 'Spritzer',
      }),
    ).toBe('7103・マレーシア（Spritzer）');
  });

  it('formats without company name', () => {
    expect(formatSymbolDisplay({ symbol: 'AAPL', market: 'us' })).toBe('AAPL・アメリカ');
  });
});

describe('normalizeBursaSymbol', () => {
  it('appends .KL for numeric tickers', () => {
    expect(normalizeBursaSymbol('7103')).toBe('7103.KL');
    expect(normalizeBursaSymbol('1818')).toBe('1818.KL');
  });
});
