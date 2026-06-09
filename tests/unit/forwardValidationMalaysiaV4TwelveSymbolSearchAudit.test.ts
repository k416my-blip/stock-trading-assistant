import { describe, expect, it } from 'vitest';
import {
  classifyRootCause,
  dedupeOfficialSymbols,
  V4_TWELVE_SEARCH_CODES,
} from '../../src/services/forwardValidation/forwardValidationMalaysiaV4TwelveSymbolSearchAudit';
import type {
  ForwardMalaysiaV4TwelveSymbolSearchQueryRow,
  ForwardMalaysiaV4TwelveSymbolSearchRetryRow,
} from '../../types/forwardValidation';

describe('forwardValidationMalaysiaV4TwelveSymbolSearchAudit', () => {
  it('covers five v4 bursa codes', () => {
    expect(V4_TWELVE_SEARCH_CODES).toHaveLength(5);
  });

  it('dedupeOfficialSymbols keeps Malaysia hits only', () => {
    const rows: ForwardMalaysiaV4TwelveSymbolSearchQueryRow[] = [
      {
        bursaCode: '5347',
        labelJa: 'TENAGA',
        httpStatus: 200,
        matchCount: 2,
        malaysiaMatchCount: 1,
        responseBodyFull: '[]',
        errorMessage: null,
        hits: [
          {
            symbol: '5347',
            instrumentName: 'Tenaga',
            exchange: 'KLSE',
            micCode: 'XKLS',
            country: 'Malaysia',
            currency: 'MYR',
            instrumentType: 'Common Stock',
            access: 'Realtime',
            searchQuery: '5347',
          },
          {
            symbol: '5347',
            instrumentName: 'Other',
            exchange: 'NYSE',
            micCode: 'XNYS',
            country: 'United States',
            currency: 'USD',
            instrumentType: 'Common Stock',
            access: 'Realtime',
            searchQuery: '5347',
          },
        ],
      },
    ];
    const official = dedupeOfficialSymbols(rows);
    expect(official).toHaveLength(1);
    expect(official[0]!.exchange).toBe('KLSE');
  });

  it('classifyRootCause returns available when retry succeeds', () => {
    const retryRows: ForwardMalaysiaV4TwelveSymbolSearchRetryRow[] = [
      {
        bursaCode: '5347',
        labelJa: 'TENAGA',
        officialSymbol: '5347',
        exchange: 'KLSE',
        micCode: 'XKLS',
        endpoint: 'quote',
        httpStatus: 200,
        ok: true,
        responseBodyFull: '{"close":12.34}',
        errorMessage: null,
        quotePrice: 12.34,
        timeSeriesBarCount: 0,
      },
    ];
    const result = classifyRootCause({ searchRows: [], officialSymbols: [], retryRows });
    expect(result.verdict).toBe('available');
  });

  it('classifyRootCause returns bursa_unsupported when no Malaysia matches', () => {
    const searchRows: ForwardMalaysiaV4TwelveSymbolSearchQueryRow[] = [
      {
        bursaCode: '5347',
        labelJa: 'TENAGA',
        httpStatus: 200,
        matchCount: 0,
        malaysiaMatchCount: 0,
        responseBodyFull: '{"data":[]}',
        errorMessage: null,
        hits: [],
      },
    ];
    const result = classifyRootCause({ searchRows, officialSymbols: [], retryRows: [] });
    expect(result.verdict).toBe('bursa_unsupported');
  });
});
