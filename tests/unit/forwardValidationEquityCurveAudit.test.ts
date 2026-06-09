/**
 * npx vitest run tests/unit/forwardValidationEquityCurveAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import {
  buildOperationalEquityCurve,
  buildRollingSeries,
  buildRm3000StopRow,
  detectBrokenEpisodes,
  evaluateStopCandidate,
  gradeStopCandidate,
  buildRollingSeries,
} from '../../src/services/forwardValidation/forwardValidationEquityCurveAudit';
import type { ForwardPassedTradeRecord } from '../../src/types/forwardValidation';

function trade(
  id: string,
  signalDate: string,
  entryDate: string,
  exitDate: string,
  returnPct: number,
): ForwardPassedTradeRecord {
  return {
    id,
    symbol: 'HDV' as ForwardPassedTradeRecord['symbol'],
    signalDate,
    entryDate,
    exitDate,
    entryPrice: 100,
    exitPrice: 100 + returnPct,
    returnPct,
    holdDays: 5,
    exitReason: 'take_profit',
    adx14: 25,
    macdHistPct: 0.2,
    dist52wPct: -3,
    bucket: 'deep',
    spyRegime: 'down',
  };
}

describe('forwardValidationEquityCurveAudit', () => {
  it('builds equity curve on exits', () => {
    const trades = [
      trade('a', '2020-01-01', '2020-01-02', '2020-01-10', 4),
      trade('b', '2020-02-01', '2020-02-02', '2020-02-10', 4),
    ];
    const { curve, exits } = buildOperationalEquityCurve({
      trades,
      symbols: ['HDV', 'DGRO', 'QQQ', 'SCHD'],
    });
    expect(exits.length).toBe(2);
    expect(curve.length).toBeGreaterThanOrEqual(2);
    expect(exits[1]!.equity).toBeGreaterThan(exits[0]!.equity);
  });

  it('builds rolling series from exits', () => {
    const exits = [
      {
        date: '2020-01-10',
        tradeIndex: 1,
        equity: 104,
        equityPct: 104,
        peakEquityPct: 104,
        drawdownPct: 0,
        equityReturnPct: 4,
        tradeReturnPct: 4,
      },
      {
        date: '2020-02-10',
        tradeIndex: 2,
        equity: 108,
        equityPct: 108,
        peakEquityPct: 108,
        drawdownPct: 0,
        equityReturnPct: 3.8,
        tradeReturnPct: 4,
      },
    ];
    const rolling = buildRollingSeries(exits);
    expect(rolling[1]?.rollingWinRatePct).toBeNull();
    expect(rolling.length).toBe(2);
  });

  it('detects broken episode when drawdown and win rate degrade', () => {
    const exits = Array.from({ length: 12 }, (_, i) => ({
      date: `2022-03-${String(10 + i).padStart(2, '0')}`,
      tradeIndex: i + 1,
      equity: 100 - i * 2,
      equityPct: 100 - i * 2,
      peakEquityPct: 100,
      drawdownPct: i >= 6 ? -6 : -1,
      equityReturnPct: i >= 6 ? -2 : 1,
      tradeReturnPct: i >= 6 ? -4 : 2,
    }));
    const episodes = detectBrokenEpisodes(exits);
    expect(episodes.length).toBeGreaterThan(0);
  });

  it('grades DD -15 as A when detection strong', () => {
    const grade = gradeStopCandidate({
      kind: 'dd',
      threshold: -15,
      falseStopRatePct: 20,
      medianDetectionDays: 12,
      detectedEpisodeCount: 2,
      brokenEpisodeCount: 2,
      stopSignalCount: 3,
    });
    expect(grade).toBe('A');
  });

  it('builds RM3000 stop from drawdown pct', () => {
    const row = buildRm3000StopRow(-15);
    expect(row.stopLossAmountMYR).toBe(450);
  });

  it('evaluates stop candidate with zero trades safely', () => {
    const rolling = buildRollingSeries([]);
    const c = evaluateStopCandidate({
      kind: 'dd',
      threshold: -15,
      labelJa: 'test',
      exits: [],
      rollingSeries: rolling,
      brokenEpisodes: [],
    });
    expect(c.stopSignalCount).toBe(0);
  });
});
