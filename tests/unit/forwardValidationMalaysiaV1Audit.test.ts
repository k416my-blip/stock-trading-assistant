import { describe, expect, it } from 'vitest';
import {
  combinations,
  gradeMalaysiaSymbol,
  gradeMalaysiaV1Adoption,
  MALAYSIA_V1_UNIVERSE,
} from '../../src/services/forwardValidation/forwardValidationMalaysiaV1Audit';

describe('forwardValidationMalaysiaV1Audit', () => {
  it('MALAYSIA_V1_UNIVERSE has 8 symbols', () => {
    expect(MALAYSIA_V1_UNIVERSE).toHaveLength(8);
  });

  it('combinations returns C(n,k) subsets', () => {
    expect(combinations(['a', 'b', 'c'], 2)).toHaveLength(3);
  });

  it('gradeMalaysiaSymbol returns S for strong metrics', () => {
    const { grade } = gradeMalaysiaSymbol({
      tradeCount: 8,
      winRatePct: 90,
      cumulativeReturnPct: 35,
      profitFactor: 3,
      sharpe: 2,
      maxDrawdownPct: -10,
    });
    expect(grade).toBe('S');
  });

  it('gradeMalaysiaV1Adoption returns B for positive MY portfolio', () => {
    const { grade } = gradeMalaysiaV1Adoption({
      bestMy: {
        size: 3,
        symbols: ['1155', '1023', '1295'],
        labelJa: 'test',
        tradeCount: 10,
        cumulativeReturnPct: 15,
        winRatePct: 80,
        profitFactor: 1.5,
        sharpe: 1.2,
        maxDrawdownPct: -12,
        cagr: 5,
        mar: 0.4,
      },
      usBaseline: {
        size: 4,
        symbols: ['HDV', 'DGRO', 'QQQ', 'SCHD'],
        labelJa: 'us',
        tradeCount: 40,
        cumulativeReturnPct: 80,
        winRatePct: 88,
        profitFactor: 4,
        sharpe: 2,
        maxDrawdownPct: -18,
        cagr: 12,
        mar: 0.6,
      },
      topSymbolGrades: ['A', 'A', 'B', 'B', 'C', 'C', 'C', 'C'],
    });
    expect(grade).toBe('B');
  });
});
