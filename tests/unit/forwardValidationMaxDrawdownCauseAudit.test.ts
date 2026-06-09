/**
 * npx vitest run tests/unit/forwardValidationMaxDrawdownCauseAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  buildDdClusterStats,
  extractDrawdownEpisodes,
} from '../../src/services/forwardValidation/forwardValidationMaxDrawdownCauseAudit';
import type { ExitSnapshot } from '../../src/services/forwardValidation/forwardValidationEquityCurveAudit';

function exit(
  date: string,
  tradeIndex: number,
  equityPct: number,
  peakEquityPct: number,
  tradeReturnPct: number,
): ExitSnapshot {
  const drawdownPct =
    peakEquityPct > 0 ? Math.round(((equityPct - peakEquityPct) / peakEquityPct) * 1000) / 10 : 0;
  return {
    date,
    tradeIndex,
    equity: equityPct,
    equityPct,
    peakEquityPct,
    drawdownPct,
    equityReturnPct: tradeReturnPct,
    tradeReturnPct,
  };
}

describe('forwardValidationMaxDrawdownCauseAudit', () => {
  it('extracts drawdown episodes from exit curve', () => {
    const exits: ExitSnapshot[] = [
      exit('2020-01-10', 1, 104, 104, 4),
      exit('2020-02-10', 2, 100, 104, -4),
      exit('2020-03-10', 3, 96, 104, -4),
      exit('2020-04-10', 4, 102, 104, 6),
    ];
    const episodes = extractDrawdownEpisodes(exits);
    expect(episodes.length).toBeGreaterThan(0);
    expect(episodes[0]!.depthPct).toBeLessThan(-3);
  });

  it('counts consecutive loss streak', () => {
    const stats = buildDdClusterStats([
      {
        id: 'a',
        symbol: 'HDV',
        signalDate: '2020-01-01',
        entryDate: '2020-01-01',
        exitDate: '2020-01-10',
        entryPrice: 100,
        exitPrice: 98,
        returnPct: -2,
        holdDays: 5,
        exitReason: 'max_hold',
        adx14: 25,
        macdHistPct: 0.2,
        dist52wPct: -3,
        bucket: 'down',
        spyRegime: 'down',
      },
      {
        id: 'b',
        symbol: 'HDV',
        signalDate: '2020-02-01',
        entryDate: '2020-02-01',
        exitDate: '2020-02-10',
        entryPrice: 100,
        exitPrice: 97,
        returnPct: -3,
        holdDays: 5,
        exitReason: 'max_hold',
        adx14: 25,
        macdHistPct: 0.2,
        dist52wPct: -3,
        bucket: 'down',
        spyRegime: 'down',
      },
      {
        id: 'c',
        symbol: 'HDV',
        signalDate: '2020-03-01',
        entryDate: '2020-03-01',
        exitDate: '2020-03-10',
        entryPrice: 100,
        exitPrice: 104,
        returnPct: 4,
        holdDays: 5,
        exitReason: 'take_profit',
        adx14: 25,
        macdHistPct: 0.2,
        dist52wPct: -3,
        bucket: 'up',
        spyRegime: 'up',
      },
    ]);
    expect(stats.maxConsecutiveLosses).toBe(2);
    expect(stats.maxConsecutiveLossPct).toBeLessThan(0);
  });
});
