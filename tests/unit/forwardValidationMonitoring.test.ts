/**
 * npx vitest run tests/unit/forwardValidationMonitoring.test.ts
 */
import { describe, expect, it } from 'vitest';
import { buildLatestSignalsCsv, LATEST_SIGNALS_CSV_LIMIT } from '../../src/services/forwardValidation/forwardValidationCsv';
import {
  buildEquityCurve,
  buildJudgmentDayStats,
  buildOperationalSnapshot,
  estimateNextJudgmentAt,
} from '../../src/services/forwardValidation/forwardValidationMonitoring';
import { defaultForwardValidationState } from '../../src/services/forwardValidation/forwardValidationStorage';

describe('forwardValidationMonitoring', () => {
  it('buildEquityCurve tracks daily returns from initial capital', () => {
    const curve = buildEquityCurve({
      initialCapitalUsd: 10_000,
      dailyReturns: [
        { date: '2024-06-01', returnPct: 3, tradeIds: ['t1'] },
        { date: '2024-06-15', returnPct: -1, tradeIds: ['t2'] },
      ],
    });
    expect(curve).toHaveLength(3);
    expect(curve[0]!.equityUsd).toBe(10_000);
    expect(curve[2]!.equityUsd).toBe(10_200);
  });

  it('buildJudgmentDayStats counts signals and closes on judgment date', () => {
    const state = {
      ...defaultForwardValidationState(),
      lastRunDate: '2024-06-10',
      signals: [
        {
          id: '2024-06-10_DGRO',
          date: '2024-06-10',
          symbol: 'DGRO' as const,
          adx14: 30,
          macdHistPct: 0.2,
          dist52wPct: -5,
          bucket: 'up',
          entryPrice: 50,
          entryDate: '2024-06-11',
          status: 'open' as const,
          createdAt: '2024-06-10T12:00:00.000Z',
        },
      ],
      openPositions: [
        {
          id: 'pos1',
          signalId: '2024-06-10_DGRO',
          signalDate: '2024-06-10',
          symbol: 'DGRO' as const,
          entryDate: '2024-06-11',
          entryPrice: 50,
          weight: 1,
          adx14: 30,
          macdHistPct: 0.2,
          barsHeld: 2,
        },
      ],
      closedTrades: [
        {
          id: 't0',
          signalId: 'old',
          signalDate: '2024-06-01',
          exitDate: '2024-06-10',
          symbol: 'VYM' as const,
          entryPrice: 100,
          exitPrice: 103,
          returnPct: 3,
          weight: 1,
          exitReason: 'take_profit' as const,
          adx14: 30,
          macdHistPct: 0.2,
        },
      ],
    };
    const stats = buildJudgmentDayStats(state, '2024-06-10');
    expect(stats.newSignalCount).toBe(1);
    expect(stats.closeCount).toBe(1);
    expect(stats.holdingCount).toBe(1);
  });

  it('estimateNextJudgmentAt schedules next trading day when up to date', () => {
    const dates = ['2024-06-07', '2024-06-10', '2024-06-11'];
    const next = estimateNextJudgmentAt('2024-06-10', dates, '2024-06-10');
    expect(next.at).toBe('2024-06-11T22:00:00.000Z');
  });

  it('buildOperationalSnapshot aggregates monitoring fields', () => {
    const state = {
      ...defaultForwardValidationState(),
      lastRunDate: '2024-06-10',
      yahooLatestDate: '2024-06-10',
      dailyReturns: [{ date: '2024-06-01', returnPct: 3, tradeIds: ['t1'] }],
      yahooFetchLog: {
        fetchedAt: '2024-06-10T22:00:00.000Z',
        successCount: 5,
        failureCount: 0,
        symbols: [],
      },
    };
    const snap = buildOperationalSnapshot({
      state,
      bundle: {
        etfBars: {} as never,
        spyBars: [],
        latestDate: '2024-06-10',
        tradingDates: ['2024-06-07', '2024-06-10', '2024-06-11'],
        fetchLog: state.yahooFetchLog!,
        symbolLatestDates: {},
      },
      fetchLog: state.yahooFetchLog,
    });
    expect(snap.yahooSuccessCount).toBe(5);
    expect(snap.yahooFailureCount).toBe(0);
    expect(snap.isUpToDate).toBe(true);
    expect(snap.equityStartUsd).toBe(10_000);
    expect(snap.equityCurrentUsd).toBe(10_300);
  });

  it('buildLatestSignalsCsv exports up to 30 rows sorted by date desc', () => {
    const state = {
      ...defaultForwardValidationState(),
      signals: Array.from({ length: 40 }, (_, i) => ({
        id: `s${i}`,
        date: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
        symbol: 'DGRO' as const,
        adx14: 30,
        macdHistPct: 0.2,
        dist52wPct: -5,
        bucket: 'up',
        entryPrice: 50,
        entryDate: '2024-01-02',
        status: 'closed' as const,
        createdAt: `2024-01-01T${String(i).padStart(2, '0')}:00:00.000Z`,
      })),
    };
    const csv = buildLatestSignalsCsv(state);
    const dataLines = csv.split('\n').filter((l) => l.startsWith('s'));
    expect(dataLines.length).toBe(LATEST_SIGNALS_CSV_LIMIT);
  });
});
