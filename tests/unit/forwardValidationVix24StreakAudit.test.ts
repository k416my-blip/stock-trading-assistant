/**
 * npx vitest run tests/unit/forwardValidationVix24StreakAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  buildCumulativeCurve,
  buildLossStreakEpisodes,
  computeMaxConsecutiveLosses,
  computeMaxConsecutiveWins,
} from '../../src/services/forwardValidation/forwardValidationVix24StreakAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

function mockTrade(returnPct: number, date: string): ForwardPassedTradeRecord & { vix: number } {
  return {
    id: `${date}_SCHD`,
    symbol: 'SCHD',
    signalDate: date,
    entryDate: date,
    exitDate: date,
    entryPrice: 80,
    exitPrice: 80,
    returnPct,
    holdDays: 5,
    exitReason: returnPct > 0 ? 'take_profit' : 'max_hold',
    adx14: 30,
    macdHistPct: 0.3,
    dist52wPct: -8,
    bucket: 'down',
    spyRegime: 'bear',
    vix: 26,
  };
}

describe('forwardValidationVix24StreakAudit', () => {
  it('computes streaks and cumulative curve', () => {
    const trades = [
      mockTrade(3, '2024-03-01'),
      mockTrade(3, '2024-03-02'),
      mockTrade(-1, '2024-03-03'),
      mockTrade(-0.5, '2024-03-04'),
      mockTrade(3, '2024-03-05'),
    ];
    expect(computeMaxConsecutiveWins(trades)).toBe(2);
    expect(computeMaxConsecutiveLosses(trades)).toBe(2);
    const episodes = buildLossStreakEpisodes(trades);
    expect(episodes).toHaveLength(1);
    expect(episodes[0]!.streakLength).toBe(2);
    const curve = buildCumulativeCurve(trades);
    expect(curve[curve.length - 1]!.cumulativeReturnPct).toBe(7.5);
  });
});
