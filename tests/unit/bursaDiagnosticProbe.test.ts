import { describe, expect, it } from 'vitest';
import { getTwelveDataQuoteAttempts } from '../../src/services/marketDataSymbols';
import { normalizeBursaSymbol } from '../../src/utils/normalizeBursaSymbol';

describe('Bursa Twelve Data symbol format', () => {
  it('always uses .KL suffix for API', () => {
    expect(normalizeBursaSymbol('4707')).toBe('4707.KL');
    expect(normalizeBursaSymbol('0820EA')).toBe('0820EA.KL');

    const attempts = getTwelveDataQuoteAttempts('bursa', '4707');
    expect(attempts.map((a) => a.symbol)).toContain('4707.KL');
    expect(attempts[0]?.symbol).toBe('4707.KL');
  });
});
