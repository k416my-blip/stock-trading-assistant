/**
 * npx vitest run tests/unit/forwardValidationCompoundingAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  lotPerSlotForCapital,
  resolveSizingBase,
  simulateCompoundingPath,
} from '../../src/services/forwardValidation/forwardValidationCompoundingAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

function trade(
  id: string,
  entry: string,
  exit: string,
  ret: number,
): ForwardPassedTradeRecord {
  return {
    id,
    symbol: 'HDV' as ForwardPassedTradeRecord['symbol'],
    signalDate: entry,
    entryDate: entry,
    exitDate: exit,
    entryPrice: 100,
    exitPrice: 100 + ret,
    returnPct: ret,
    holdDays: 5,
    exitReason: 'take_profit',
    adx14: 25,
    macdHistPct: 0.2,
    dist52wPct: -3,
    bucket: 'deep',
    spyRegime: 'down',
  };
}

describe('forwardValidationCompoundingAudit', () => {
  it('scales lot with capital', () => {
    expect(lotPerSlotForCapital(3000)).toBe(700);
    expect(lotPerSlotForCapital(10000)).toBe(2333);
  });

  it('compound_no keeps sizing base at initial', () => {
    expect(
      resolveSizingBase({
        modeId: 'compound_no',
        equity: 4000,
        initial: 3000,
        sizingBase: 3000,
      }),
    ).toBe(3000);
  });

  it('compound_yes grows final equity vs compound_no on wins', () => {
    const trades = [
      trade('a', '2020-01-02', '2020-01-10', 4),
      trade('b', '2020-02-02', '2020-02-10', 4),
      trade('c', '2020-03-02', '2020-03-10', 4),
    ];
    const yes = simulateCompoundingPath({
      trades,
      modeId: 'compound_yes',
      initialCapitalMYR: 3000,
      lotPerSlotMYR: 700,
    });
    const no = simulateCompoundingPath({
      trades,
      modeId: 'compound_no',
      initialCapitalMYR: 3000,
      lotPerSlotMYR: 700,
    });
    expect(yes.finalEquity).toBeGreaterThan(no.finalEquity);
  });
});
