import { describe, expect, it } from 'vitest';
import { getTwelveDataQuoteAttempts } from '../../src/services/marketDataSymbols';
import { validatePositionSymbol } from '../../src/services/marketDataValidation';
import {
  isBareBursaTicker,
  isMalaysiaMarket,
  normalizeBursaSymbol,
} from '../../src/utils/normalizeBursaSymbol';

describe('normalizeBursaSymbol', () => {
  it('converts numeric and ETF tickers to .KL', () => {
    expect(normalizeBursaSymbol('4707')).toBe('4707.KL');
    expect(normalizeBursaSymbol('5183')).toBe('5183.KL');
    expect(normalizeBursaSymbol('1155')).toBe('1155.KL');
    expect(normalizeBursaSymbol('0820EA')).toBe('0820EA.KL');
    expect(normalizeBursaSymbol('4707.KL')).toBe('4707.KL');
    expect(normalizeBursaSymbol('BURSA:4707')).toBe('4707.KL');
  });

  it('rejects bare tickers for API guard', () => {
    expect(isBareBursaTicker('4707')).toBe(true);
    expect(isBareBursaTicker('0820EA')).toBe(true);
    expect(isBareBursaTicker('4707.KL')).toBe(false);
  });

  it('validatePositionSymbol returns apiSymbol with .KL', () => {
    const v = validatePositionSymbol('bursa', '4707');
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.apiSymbol).toBe('4707.KL');
      expect(v.normalizedSymbol).toBe('4707');
    }
    const etf = validatePositionSymbol('bursa', '0820EA');
    expect(etf.ok).toBe(true);
    if (etf.ok) {
      expect(etf.apiSymbol).toBe('0820EA.KL');
    }
  });

  it('rejects null undefined and empty', () => {
    expect(validatePositionSymbol('bursa', null).ok).toBe(false);
    expect(validatePositionSymbol('bursa', undefined).ok).toBe(false);
    expect(validatePositionSymbol('bursa', '').ok).toBe(false);
  });

  it('isMalaysiaMarket includes bursa and Malaysia', () => {
    expect(isMalaysiaMarket('bursa')).toBe(true);
    expect(isMalaysiaMarket('Malaysia')).toBe(true);
    expect(isMalaysiaMarket('us')).toBe(false);
  });

  it('getTwelveDataQuoteAttempts sends only .KL for bursa', () => {
    const attempts = getTwelveDataQuoteAttempts('bursa', '4707');
    expect(attempts).toHaveLength(1);
    expect(attempts[0]?.symbol).toBe('4707.KL');
  });
});
