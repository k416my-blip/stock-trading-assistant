/**
 * npx vitest run tests/unit/forwardValidationEtfUniverseAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  dedupOneEtfPerDayWinRate,
  symbolWinRatesBeforeUniverse,
} from '../../src/services/forwardValidation/forwardValidationEtfUniverseAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

function trade(
  signalDate: string,
  symbol: string,
  returnPct: number,
): ForwardPassedTradeRecord {
  return {
    id: `${signalDate}_${symbol}`,
    symbol: symbol as ForwardPassedTradeRecord['symbol'],
    signalDate,
    entryDate: signalDate,
    exitDate: signalDate,
    entryPrice: 100,
    exitPrice: 100 + returnPct,
    returnPct,
    holdDays: 1,
    exitReason: 'take_profit',
    adx14: 25,
    macdHistPct: 0.2,
    dist52wPct: -3,
    bucket: 'deep',
    spyRegime: 'down',
  };
}

describe('forwardValidationEtfUniverseAudit', () => {
  it('defaults win rate to 0.5 for unseen symbols', () => {
    const wr = symbolWinRatesBeforeUniverse([], '2020-06-01', ['SCHD', 'VYM']);
    expect(wr.SCHD).toBe(0.5);
    expect(wr.VYM).toBe(0.5);
  });

  it('picks higher win-rate symbol on same signal day', () => {
    const pool = [
      trade('2020-01-01', 'SCHD', 4),
      trade('2020-01-02', 'SCHD', 4),
      trade('2020-01-03', 'SCHD', -1),
      trade('2020-01-04', 'VYM', 4),
      trade('2020-01-05', 'VYM', 4),
      trade('2020-01-05', 'SCHD', 4),
    ];
    const deduped = dedupOneEtfPerDayWinRate(pool, ['SCHD', 'VYM']);
    const day = deduped.find((t) => t.signalDate === '2020-01-05');
    expect(day?.symbol).toBe('VYM');
  });
});
