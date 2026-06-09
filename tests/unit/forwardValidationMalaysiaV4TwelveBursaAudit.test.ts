import { describe, expect, it } from 'vitest';
import {
  gradeTwelveBursaProduction,
  buildTwelveUrl,
} from '../../src/services/forwardValidation/forwardValidationMalaysiaV4TwelveBursaAudit';
import { V4_YAHOO_QUALITY_SYMBOLS } from '../../src/services/forwardValidation/forwardValidationMalaysiaV4YahooQualityAudit';
import { getTwelveDataQuoteAttempts } from '../../src/services/marketDataSymbols';

describe('forwardValidationMalaysiaV4TwelveBursaAudit', () => {
  it('covers five v4 symbols', () => {
    expect(V4_YAHOO_QUALITY_SYMBOLS).toHaveLength(5);
  });

  it('primary bursa attempt uses dotKL format', () => {
    const [first] = getTwelveDataQuoteAttempts('bursa', '5347.KL');
    expect(first.symbol).toBe('5347.KL');
    expect(first.exchange).toBe('XKLS');
  });

  it('buildTwelveUrl includes exchange and mic for quote', () => {
    const url = buildTwelveUrl('quote', 'test-key', {
      symbol: '5347.KL',
      exchange: 'XKLS',
      mic_code: 'XKLS',
    });
    expect(url).toContain('symbol=5347.KL');
    expect(url).toContain('exchange=XKLS');
    expect(url).toContain('mic_code=XKLS');
  });

  it('gradeTwelveBursaProduction returns A for full success', () => {
    const { grade } = gradeTwelveBursaProduction({
      apiKeyAvailable: true,
      productionQuoteSuccessRatePct: 100,
      productionTimeSeriesSuccessRatePct: 100,
      maxPriceDiffPct: 1,
      rateLimitHitCount: 0,
    });
    expect(grade).toBe('A');
  });

  it('gradeTwelveBursaProduction returns C without api key', () => {
    const { grade } = gradeTwelveBursaProduction({
      apiKeyAvailable: false,
      productionQuoteSuccessRatePct: 0,
      productionTimeSeriesSuccessRatePct: 0,
      maxPriceDiffPct: null,
      rateLimitHitCount: 0,
    });
    expect(grade).toBe('C');
  });
});
