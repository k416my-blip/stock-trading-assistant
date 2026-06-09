/**
 * npx vitest run tests/unit/forwardValidationLosingStreakAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  LOSING_STREAK_POLICIES,
  tagExecutedWithPriorLossStreak,
  simulateStreakPolicy,
} from '../../src/services/forwardValidation/forwardValidationLosingStreakAudit';
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
    exitReason: ret >= 4 ? 'take_profit' : 'max_hold',
    adx14: 25,
    macdHistPct: 0.2,
    dist52wPct: -3,
    bucket: 'up',
    spyRegime: 'up',
  };
}

describe('forwardValidationLosingStreakAudit', () => {
  it('defines 5 streak policies', () => {
    expect(LOSING_STREAK_POLICIES.length).toBe(5);
  });

  it('tags prior loss streak at entry', () => {
    const executed = [
      trade('a', '2020-01-02', '2020-01-10', -2),
      trade('b', '2020-02-02', '2020-02-10', -1),
      trade('c', '2020-03-02', '2020-03-10', 4),
    ];
    const tagged = tagExecutedWithPriorLossStreak(executed);
    const c = tagged.find((t) => t.id === 'c')!;
    expect(c.priorLossStreak).toBe(2);
  });

  it('skips one entry after 2 losses', () => {
    const candidates = [
      trade('a', '2020-01-02', '2020-01-10', -2),
      trade('b', '2020-02-02', '2020-02-10', -1),
      trade('c', '2020-03-02', '2020-03-10', 4),
      trade('d', '2020-04-02', '2020-04-10', 4),
    ];
    const policy = LOSING_STREAK_POLICIES.find((p) => p.policyId === 'skip_after_2')!;
    const { executed, skippedCount } = simulateStreakPolicy({
      candidates,
      symbols: ['HDV'],
      policy,
      historyForSlot: [],
    });
    expect(skippedCount).toBe(1);
    expect(executed.length).toBeLessThan(candidates.length);
  });
});
