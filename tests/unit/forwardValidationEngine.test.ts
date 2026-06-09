/**
 * npx vitest run tests/unit/forwardValidationEngine.test.ts tests/unit/forwardValidationAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import { FORWARD_REPORT_MILESTONES, FORWARD_REPORT_MIN_TRADES, FORWARD_SIGNAL_START } from '../../src/constants/forwardValidation';
import {
  buildSpyRegimeMap,
  scanSignalAtBar,
  type OhlcvBar,
} from '../../src/services/forwardValidation/case4Indicators';
import {
  auditForwardValidation,
  buildOpenPositionViews,
} from '../../src/services/forwardValidation/forwardValidationAudit';
import {
  processForwardValidationRange,
  type ForwardOhlcvBundle,
} from '../../src/services/forwardValidation/forwardValidationEngine';
import {
  compareWithBacktestBaseline,
  computeForwardMetrics,
  computeWeightedDailyReturn,
  maybeGenerateReports,
} from '../../src/services/forwardValidation/forwardValidationMetrics';
import { defaultForwardValidationState } from '../../src/services/forwardValidation/forwardValidationStorage';

function makeFlatBars(symbol: string, start: string, days: number, price: number): OhlcvBar[] {
  const out: OhlcvBar[] = [];
  const d0 = new Date(`${start}T00:00:00Z`);
  for (let i = 0; i < days; i++) {
    const d = new Date(d0);
    d.setUTCDate(d0.getUTCDate() + i);
    const date = d.toISOString().slice(0, 10);
    out.push({
      date,
      open: price,
      high: price * 1.01,
      low: price * 0.99,
      close: price,
    });
  }
  return out;
}

function makeDipThenRecoverBars(start: string, base: number, dipPct: number, dipDay: number): OhlcvBar[] {
  const bars = makeFlatBars('X', start, 400, base);
  for (let i = 0; i < bars.length; i++) {
    if (i >= dipDay && i < dipDay + 5) {
      const mult = 1 + dipPct / 100;
      bars[i] = {
        ...bars[i]!,
        open: base * mult,
        high: base * mult * 1.005,
        low: base * mult * 0.995,
        close: base * mult,
      };
    }
    if (i === dipDay + 6) {
      bars[i] = {
        ...bars[i]!,
        open: base * 0.97,
        high: base * 1.04,
        low: base * 0.96,
        close: base * 1.03,
      };
    }
  }
  return bars;
}

function mockBundle(etfBars: Record<'SCHD' | 'VYM' | 'DGRO' | 'SPLG', OhlcvBar[]>, spy: OhlcvBar[]): ForwardOhlcvBundle {
  const tradingDates = [...new Set(Object.values(etfBars).flatMap((b) => b.map((x) => x.date)))].sort();
  const latestDate = tradingDates[tradingDates.length - 1] ?? '';
  return {
    etfBars,
    spyBars: spy,
    latestDate,
    tradingDates,
    fetchLog: {
      fetchedAt: new Date().toISOString(),
      successCount: 5,
      failureCount: 0,
      symbols: [
        ...Object.keys(etfBars).map((s) => ({
          symbol: s,
          ok: true,
          barCount: etfBars[s as keyof typeof etfBars].length,
          latestDate,
          httpStatus: 200,
          error: null,
        })),
        { symbol: 'SPY', ok: true, barCount: spy.length, latestDate, httpStatus: 200, error: null },
      ],
    },
    symbolLatestDates: Object.fromEntries(
      Object.entries(etfBars).map(([k, v]) => [k, v[v.length - 1]!.date]),
    ),
  };
}

describe('forwardValidationEngine', () => {
  it('computeWeightedDailyReturn normalizes static weights', () => {
    const r = computeWeightedDailyReturn([
      { returnPct: 3, weight: 0.2 },
      { returnPct: -1, weight: 0.8 },
    ]);
    expect(r).toBe(-0.2);
  });

  it('compareWithBacktestBaseline includes delta vs fixed baseline', () => {
    const metrics = computeForwardMetrics({
      closedTrades: [
        {
          id: 't1',
          signalId: 's1',
          signalDate: '2024-06-01',
          exitDate: '2024-06-05',
          symbol: 'DGRO',
          entryPrice: 50,
          exitPrice: 51.5,
          returnPct: 3,
          weight: 1,
          exitReason: 'take_profit',
          adx14: 30,
          macdHistPct: 0.2,
        },
      ],
      openPositions: [],
      dailyReturns: [{ date: '2024-06-01', returnPct: 3, tradeIds: ['t1'] }],
      equityUsd: 10_300,
      initialCapitalUsd: 10_000,
    });
    const cmp = compareWithBacktestBaseline(metrics);
    expect(cmp.backtest.sharpe).toBe(1.702);
    expect(cmp.forward.totalReturnPct).toBe(3);
  });

  it('processForwardValidationRange records signals on synthetic dip', () => {
    const start = '2023-06-01';
    const etfBars = {
      SCHD: makeFlatBars('SCHD', start, 400, 80),
      VYM: makeFlatBars('VYM', start, 400, 110),
      DGRO: makeDipThenRecoverBars(start, 50, -10, 280),
      SPLG: makeFlatBars('SPLG', start, 400, 60),
    };
    const spy = makeFlatBars('SPY', start, 400, 450);
    const bundle = mockBundle(etfBars, spy);

    const regimeMap = buildSpyRegimeMap(spy);
    let signalFound = false;
    for (let i = 200; i < etfBars.DGRO.length; i++) {
      const scan = scanSignalAtBar(etfBars.DGRO, i, regimeMap);
      if (scan?.passes && scan.date >= FORWARD_SIGNAL_START) {
        signalFound = true;
        break;
      }
    }
    expect(signalFound).toBe(true);

    let state = defaultForwardValidationState();
    state = processForwardValidationRange(state, bundle, FORWARD_SIGNAL_START, bundle.latestDate);
    expect(state.signals.length).toBeGreaterThan(0);
    expect(state.lastRunDate).toBe(bundle.latestDate);
    expect(state.yahooLatestDate).toBe(bundle.latestDate);
  });

  it('maybeGenerateReports triggers at 10, 20, 30 milestones', () => {
    for (const n of [10, 20, FORWARD_REPORT_MIN_TRADES]) {
      const closedTrades = Array.from({ length: n }, (_, i) => ({
        id: `t${i}`,
        signalId: `s${i}`,
        signalDate: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
        exitDate: `2024-02-${String((i % 28) + 1).padStart(2, '0')}`,
        symbol: 'DGRO' as const,
        entryPrice: 50,
        exitPrice: 51.5,
        returnPct: 3,
        weight: 1,
        exitReason: 'take_profit' as const,
        adx14: 30,
        macdHistPct: 0.2,
      }));
      const withReports = maybeGenerateReports({
        ...defaultForwardValidationState(),
        closedTrades,
        dailyReturns: closedTrades.map((t) => ({ date: t.signalDate, returnPct: 3, tradeIds: [t.id] })),
      });
      const milestones = withReports.reports.map((r) => r.triggerTradeCount);
      for (const m of FORWARD_REPORT_MILESTONES.filter((x) => x <= n)) {
        expect(milestones).toContain(m);
      }
    }
  });
});

describe('forwardValidationAudit', () => {
  it('flags future signal dates', () => {
    const state = {
      ...defaultForwardValidationState(),
      signals: [
        {
          id: '2099-01-01_DGRO',
          date: '2099-01-01',
          symbol: 'DGRO' as const,
          adx14: 30,
          macdHistPct: 0.2,
          dist52wPct: -5,
          bucket: 'up',
          entryPrice: null,
          entryDate: null,
          status: 'pending_entry' as const,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    const audit = auditForwardValidation({ state, bundle: null, fetchLog: null, processedDates: [] });
    const futureFinding = audit.findings.find((f) => f.id === 'signal_dates_not_future');
    expect(futureFinding?.status).toBe('fail');
  });

  it('buildOpenPositionViews computes unrealized PnL from latest bar', () => {
    const bars = makeFlatBars('DGRO', '2024-01-01', 30, 100);
    bars[29] = { ...bars[29]!, close: 105, high: 106, low: 99, open: 104 };
    const bundle = mockBundle(
      {
        SCHD: makeFlatBars('SCHD', '2024-01-01', 30, 80),
        VYM: makeFlatBars('VYM', '2024-01-01', 30, 80),
        DGRO: bars,
        SPLG: makeFlatBars('SPLG', '2024-01-01', 30, 60),
      },
      makeFlatBars('SPY', '2024-01-01', 30, 400),
    );
    const state = {
      ...defaultForwardValidationState(),
      openPositions: [
        {
          id: 'pos1',
          signalId: 'sig1',
          signalDate: '2024-01-10',
          symbol: 'DGRO' as const,
          entryDate: '2024-01-11',
          entryPrice: 100,
          weight: 1,
          adx14: 30,
          macdHistPct: 0.2,
          barsHeld: 5,
        },
      ],
    };
    const views = buildOpenPositionViews(state, bundle);
    expect(views[0]?.unrealizedPct).toBe(5);
    expect(views[0]?.currentPrice).toBe(105);
  });
});
