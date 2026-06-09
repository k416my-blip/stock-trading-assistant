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

  it('formats HK market as 香港', () => {
    expect(
      formatSymbolDisplay({
        symbol: '0883',
        market: 'hk',
        companyName: 'CNOOC Limited',
      }),
    ).toBe('0883・香港（CNOOC Limited）');
  });
});

describe('normalizeBursaSymbol', () => {
  it('appends .KL for numeric tickers', () => {
    expect(normalizeBursaSymbol('7103')).toBe('7103.KL');
    expect(normalizeBursaSymbol('1818')).toBe('1818.KL');
  });
});
