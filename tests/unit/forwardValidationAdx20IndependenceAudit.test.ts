/**
 * npx vitest run tests/unit/forwardValidationAdx20IndependenceAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  buildConsecutiveStreaks,
  buildPeriodBreakdown,
  calendarDaysBetween,
  canMergeIntoSameEvent,
  clusterIndependenceEvents,
  evaluateAdx20Independence,
} from '../../src/services/forwardValidation/forwardValidationAdx20IndependenceAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

function mockTrade(
  signalDate: string,
  symbol: string,
  returnPct: number,
  spyRegime = 'down',
): ForwardPassedTradeRecord {
  return {
    id: `${signalDate}_${symbol}`,
    symbol: symbol as ForwardPassedTradeRecord['symbol'],
    signalDate,
    entryDate: signalDate,
    exitDate: signalDate,
    entryPrice: 25,
    exitPrice: 25.75,
    returnPct,
    holdDays: 8,
    exitReason: 'take_profit',
    adx14: 22,
    macdHistPct: 0.3,
    dist52wPct: -8,
    bucket: 'down',
    spyRegime,
  };
}

describe('forwardValidationAdx20IndependenceAudit', () => {
  it('computes calendar day gap', () => {
    expect(calendarDaysBetween('2020-10-07', '2020-10-08')).toBe(1);
    expect(calendarDaysBetween('2020-10-07', '2020-10-21')).toBe(14);
    expect(calendarDaysBetween('2020-10-07', '2020-10-22')).toBe(15);
  });

  it('merges same symbol/regime within gap', () => {
    const a = mockTrade('2020-10-07', 'DGRO', 3);
    const b = mockTrade('2020-10-08', 'DGRO', 3);
    expect(canMergeIntoSameEvent(a, b, 14)).toBe(true);
    expect(canMergeIntoSameEvent(a, mockTrade('2020-10-22', 'DGRO', 3), 14)).toBe(false);
    expect(canMergeIntoSameEvent(a, mockTrade('2020-10-08', 'SCHD', 3), 14)).toBe(false);
  });

  it('clusters consecutive trades into events', () => {
    const trades = [
      mockTrade('2020-10-07', 'DGRO', 3),
      mockTrade('2020-10-08', 'DGRO', 3),
      mockTrade('2020-10-13', 'DGRO', 3),
      mockTrade('2020-11-12', 'VYM', 3),
    ];
    const events = clusterIndependenceEvents(trades, 14);
    expect(events).toHaveLength(2);
    expect(events[0]!.tradeCount).toBe(3);
    expect(events[0]!.cumulativeReturnPct).toBe(9);
    expect(buildConsecutiveStreaks(events)).toHaveLength(1);
  });

  it('builds year/month breakdown', () => {
    const trades = [
      mockTrade('2020-04-08', 'DGRO', 3),
      mockTrade('2022-05-25', 'DGRO', -5),
    ];
    const yearly = buildPeriodBreakdown(trades, 'year');
    expect(yearly).toHaveLength(2);
    expect(yearly[0]!.tradeCount).toBe(1);
    expect(yearly[1]!.cumulativeReturnPct).toBe(-5);
  });

  it('evaluates cluster_concentrated for few events', () => {
    const events = clusterIndependenceEvents(
      [
        mockTrade('2020-04-08', 'DGRO', 3),
        mockTrade('2020-04-09', 'DGRO', 3),
        mockTrade('2020-04-10', 'DGRO', 3),
        mockTrade('2020-04-11', 'DGRO', 3),
        mockTrade('2020-04-12', 'DGRO', 3),
        mockTrade('2020-04-13', 'DGRO', 3),
        mockTrade('2020-04-14', 'DGRO', 3),
        mockTrade('2020-04-15', 'DGRO', 3),
        mockTrade('2020-04-16', 'DGRO', 3),
        mockTrade('2020-04-17', 'DGRO', 3),
        mockTrade('2020-04-18', 'DGRO', 3),
        mockTrade('2020-04-19', 'DGRO', 3),
        mockTrade('2020-04-20', 'DGRO', 3),
        mockTrade('2020-04-21', 'DGRO', 3),
        mockTrade('2020-04-22', 'DGRO', 3),
        mockTrade('2020-04-23', 'DGRO', 3),
        mockTrade('2020-04-24', 'DGRO', 3),
        mockTrade('2020-04-25', 'DGRO', 3),
      ],
      14,
    );
    const { verdict } = evaluateAdx20Independence({
      tradeCount: 18,
      events,
      yearly: [{ period: '2020', tradeCount: 18, cumulativeReturnPct: 54 }],
      tradeCumulativeReturnPct: 54,
    });
    expect(verdict).toBe('cluster_concentrated');
  });
});
