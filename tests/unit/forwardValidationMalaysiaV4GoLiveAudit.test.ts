import { describe, expect, it } from 'vitest';
import {
  buildAllStockSearchProbes,
  buildRakutenRealHoldings,
} from '../../src/services/forwardValidation/forwardValidationMalaysiaV4GoLiveAudit';

describe('forwardValidationMalaysiaV4GoLiveAudit', () => {
  it('buildAllStockSearchProbes marks GAMUDA queries as hits after fix', () => {
    const probes = buildAllStockSearchProbes();
    const gamuda = probes.filter((p) => p.symbol === '5398' && ['GAMUDA', '5398', 'Gamuda'].includes(p.query));
    expect(gamuda.length).toBeGreaterThanOrEqual(3);
    expect(gamuda.every((p) => p.hit)).toBe(true);
  });

  it('buildRakutenRealHoldings creates 5 registrable positions', () => {
    const bundle = {
      etfBars: {
        '5347': [{ date: '2026-06-01', open: 13, high: 14, low: 12, close: 13.5, volume: 1 }],
        '1023': [{ date: '2026-06-01', open: 7, high: 8, low: 6, close: 7.2, volume: 1 }],
        '5398': [{ date: '2026-06-01', open: 6, high: 7, low: 5, close: 6.1, volume: 1 }],
        '6742': [{ date: '2026-06-01', open: 3, high: 4, low: 2, close: 3.4, volume: 1 }],
        '3336': [{ date: '2026-06-01', open: 3, high: 4, low: 2, close: 3.2, volume: 1 }],
      },
      tradingDates: ['2026-06-01'],
      latestDate: '2026-06-01',
      fetchedSymbols: ['5347', '1023', '5398', '6742', '3336'],
      failedSymbols: [],
      firstBarDates: {},
      spyBars: [],
      vixBars: [],
    };
    const { holdings, rows } = buildRakutenRealHoldings(bundle as never, 100_000);
    expect(holdings).toHaveLength(5);
    expect(rows.every((r) => r.registrableViaFindStock)).toBe(true);
  });
});
