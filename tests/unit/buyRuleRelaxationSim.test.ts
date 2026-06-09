/**
 * held_stock / momentum_buy 緩和シミュレーション（実装なし・集計のみ）
 * npx vitest run tests/unit/buyRuleRelaxationSim.test.ts
 */
import { describe, expect, it } from 'vitest';
import { buildProbeAppState } from '../helpers/buildProbeAppState';
import {
  AUDIT_BUSINESS_DAYS,
  RULE_PARAMS_BASELINE,
  RULE_PARAMS_MOMENTUM_2,
  RULE_PARAMS_NARROW_HOLD,
  RULE_PARAMS_RELAXED_BOTH,
  computeRsi14At,
  countFinalActions,
  countRuleActions,
  evaluateSymbolDayWithRuleParams,
  fetchYahooDailyBars,
  runRuleBuyBacktest,
  sweepRuleParams,
  toYahooSymbol,
  type ProbeSymbol,
} from '../helpers/buyAction30dAudit';

function fmt(c: ReturnType<typeof countRuleActions>) {
  return `buy=${c.buy} hold=${c.hold} watch=${c.watch} reduce=${c.reduce}`;
}

describe('buy rule relaxation simulation', () => {
  it('outputs hold narrow / momentum / backtest / param sweep', async () => {
    const state = buildProbeAppState(10, 'bursa-first');
    const symbols: ProbeSymbol[] = state.portfolio.map((p) => ({
      symbol: p.symbol,
      market: p.market as ProbeSymbol['market'],
      yahooSymbol: toYahooSymbol(p.symbol, p.market as ProbeSymbol['market']),
    }));
    const weightPct = 100 / symbols.length;
    const barsBySymbol = new Map<string, Awaited<ReturnType<typeof fetchYahooDailyBars>>>();
    const baseInputs: Array<{
      date: string;
      symbol: string;
      market: ProbeSymbol['market'];
      dayChangePct: number;
      rsi14: number | null;
      close: number;
      weightPct: number;
    }> = [];

    for (const s of symbols) {
      const bars = await fetchYahooDailyBars(s.yahooSymbol);
      barsBySymbol.set(s.symbol, bars);
      const closes = bars.map((b) => b.close);
      const window = bars.slice(-AUDIT_BUSINESS_DAYS - 1);
      for (let i = 1; i < window.length; i++) {
        const prev = window[i - 1]!;
        const cur = window[i]!;
        const globalIdx = bars.findIndex((b) => b.date === cur.date);
        baseInputs.push({
          date: cur.date,
          symbol: s.symbol,
          market: s.market,
          dayChangePct: ((cur.close - prev.close) / prev.close) * 100,
          rsi14: computeRsi14At(closes, globalIdx),
          close: cur.close,
          weightPct,
        });
      }
    }

    const total = baseInputs.length;
    expect(total).toBe(300);

    const scenarios = [
      { name: '現行（-2〜+4, momentum≥3%）', params: RULE_PARAMS_BASELINE },
      { name: 'hold狭め（-1〜+2, momentum≥3%）', params: RULE_PARAMS_NARROW_HOLD },
      { name: 'momentum≥2%（hold現行）', params: RULE_PARAMS_MOMENTUM_2 },
      { name: '両方緩和（-1〜+2, momentum≥2%）', params: RULE_PARAMS_RELAXED_BOTH },
    ] as const;

    const simByScenario = scenarios.map((sc) => {
      const rows = baseInputs.map((b) =>
        evaluateSymbolDayWithRuleParams({
          ...b,
          ruleParams: sc.params,
          productionLikeAiConflict: true,
        }),
      );
      return { ...sc, rows };
    });

    const baseline = simByScenario[0]!;
    const narrowHold = simByScenario[1]!;
    const momentum2 = simByScenario[2]!;
    const both = simByScenario[3]!;

    const q1Base = countRuleActions(baseline.rows);
    const q1Narrow = countRuleActions(narrowHold.rows);
    const q2Base = q1Base;
    const q2Mom = countRuleActions(momentum2.rows);

    const backtests = [
      runRuleBuyBacktest(baseline.rows, barsBySymbol, '現行 rule buy', false),
      runRuleBuyBacktest(both.rows, barsBySymbol, '緩和 rule buy', false),
      runRuleBuyBacktest(baseline.rows, barsBySymbol, '現行 final buy', true),
      runRuleBuyBacktest(both.rows, barsBySymbol, '緩和 final buy', true),
    ];

    const sweep = sweepRuleParams(
      baseInputs,
      [
        { min: -2, max: 4, label: '(-2,+4)現行' },
        { min: -1, max: 2, label: '(-1,+2)狭め' },
        { min: -1.5, max: 2.5, label: '(-1.5,+2.5)' },
        { min: -0.5, max: 1.5, label: '(-0.5,+1.5)' },
        { min: -2, max: 3, label: '(-2,+3)' },
      ],
      [1.0, 1.5, 2.0, 2.5, 3.0],
    );

    const inTarget = sweep.filter((r) => r.ruleBuyPct >= 5 && r.ruleBuyPct <= 15);

    const report = {
      observationCount: total,
      noteJa:
        'ルール件数は ruleEffective。final は RSIプロキシ＋conflict≥65（productionLikeAiConflict）。バックテスト: rule/final buy シグナル翌日終値→5営業日後、取引は時系列に累積MDD。',
      q1_holdNarrow: {
        before: q1Base,
        after: q1Narrow,
        delta: {
          buy: q1Narrow.buy - q1Base.buy,
          hold: q1Narrow.hold - q1Base.hold,
          watch: q1Narrow.watch - q1Base.watch,
          reduce: q1Narrow.reduce - q1Base.reduce,
        },
      },
      q2_momentum2: {
        before: q2Base,
        after: q2Mom,
        delta: {
          buy: q2Mom.buy - q2Base.buy,
          hold: q2Mom.hold - q2Base.hold,
          watch: q2Mom.watch - q2Base.watch,
          reduce: q2Mom.reduce - q2Base.reduce,
        },
      },
      allScenariosRule: simByScenario.map((s) => ({
        name: s.name,
        rule: countRuleActions(s.rows),
        final: countFinalActions(s.rows),
      })),
      backtests,
      paramCandidates5to15pct: inTarget.slice(0, 12),
      fullSweepSample: sweep,
    };

    // eslint-disable-next-line no-console
    console.log('\n=== BUY RULE RELAXATION SIM ===\n', JSON.stringify(report, null, 2));

    expect(q1Narrow.buy).toBeGreaterThanOrEqual(q1Base.buy);
    expect(q2Mom.buy).toBeGreaterThanOrEqual(q2Base.buy);
  }, 120_000);
});
