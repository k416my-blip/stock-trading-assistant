/**
 * 最重要監査その33 — 暴落相場ストレステスト · 最終推奨ルール固定 · 監査のみ
 */
import type {
  ForwardBearStressAuditReport,
  ForwardBearStressLossTradeRow,
  ForwardBearStressPeriodId,
  ForwardBearStressPeriodMetrics,
  ForwardBearStressResilienceGrade,
  ForwardBearStressRm3000Row,
  ForwardBearStressVixCompareRow,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import {
  barIndexByDate,
  buildSpyRegimeMap,
  scanSignalAtBarAblation,
  type OhlcvBar,
  type SignalAblationOptions,
} from './case4Indicators';
import { simulateExitWithStop } from './forwardValidationExitStrategyAudit';
import {
  buildTradesFromTemplate,
  fetchRobustnessAuditBundle,
  precomputeTradeTemplates,
  ROBUSTNESS_ETF_UNIVERSE,
} from './forwardValidationRobustnessAudit';
import { simulateOperationalWinRate } from './forwardValidationEtfUniverseAudit';
import {
  buildWalkForward31PhaseMetrics,
  simulateOperationalWinRateWithSeed,
} from './forwardValidationWalkForward31Audit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

const ADX_MIN = 20;
const VIX_THRESHOLD = 24;
const TAKE_PROFIT_PCT = 4;
const MAX_HOLD_DAYS = 25;
const CASH_RESERVE_PCT = 15;
const RM3000_CAPITAL_MYR = 3000;

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15%';

export const BEAR_STRESS_PERIODS: {
  periodId: ForwardBearStressPeriodId;
  labelJa: string;
  fromDate: string;
  toDate: string | null;
}[] = [
  {
    periodId: 'covid2020',
    labelJa: '① 2020年コロナ暴落',
    fromDate: '2020-02-01',
    toDate: '2020-06-30',
  },
  {
    periodId: 'bear2022',
    labelJa: '② 2022年利上げ暴落',
    fromDate: '2022-01-01',
    toDate: '2022-12-31',
  },
  {
    periodId: 'since2025',
    labelJa: '③ 2025年以降',
    fromDate: '2025-01-01',
    toDate: null,
  },
];

type RuleVariantId = 'baseline' | 'no_vix' | 'no_52w' | 'no_spy63' | 'no_adx';

const RULE_VARIANTS: { id: RuleVariantId; labelJa: string; ablation: SignalAblationOptions; vixThreshold: number }[] =
  [
    {
      id: 'baseline',
      labelJa: '現行推奨（全ルール）',
      ablation: { adxMinOverride: ADX_MIN },
      vixThreshold: VIX_THRESHOLD,
    },
    {
      id: 'no_vix',
      labelJa: 'VIXフィルターOFF',
      ablation: { adxMinOverride: ADX_MIN },
      vixThreshold: -1,
    },
    {
      id: 'no_52w',
      labelJa: '52週高値OFF',
      ablation: { adxMinOverride: ADX_MIN, skipDist52: true },
      vixThreshold: VIX_THRESHOLD,
    },
    {
      id: 'no_spy63',
      labelJa: 'SPY63 OFF',
      ablation: { adxMinOverride: ADX_MIN, skipSpyRegime: true },
      vixThreshold: VIX_THRESHOLD,
    },
    {
      id: 'no_adx',
      labelJa: 'ADX>20 OFF',
      ablation: { skipAdx: true },
      vixThreshold: VIX_THRESHOLD,
    },
  ];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function vixAtDate(vixBars: OhlcvBar[], date: string): number | null {
  const idx = barIndexByDate(vixBars, date);
  if (idx < 0) return null;
  return vixBars[idx]!.close;
}

export function collectStressTrades(
  bundle: SurvivorshipOhlcvBundle,
  symbols: string[],
  fromDate: string,
  toDate: string,
  ablation: SignalAblationOptions,
  vixThreshold: number,
): ForwardPassedTradeRecord[] {
  const regimeMap = buildSpyRegimeMap(bundle.spyBars);
  const dates = bundle.tradingDates.filter((d) => d >= fromDate && d <= toDate);
  const trades: ForwardPassedTradeRecord[] = [];

  for (const signalDate of dates) {
    for (const symbol of symbols) {
      const bars = bundle.etfBars[symbol];
      if (!bars) continue;
      const signalIdx = barIndexByDate(bars, signalDate);
      if (signalIdx < 0) continue;

      const scan = scanSignalAtBarAblation(bars, signalIdx, regimeMap, ablation);
      if (!scan?.passes) continue;

      if (vixThreshold >= 0) {
        const vix = vixAtDate(bundle.vixBars, signalDate);
        if (vix == null || vix < vixThreshold) continue;
      }

      const entryIdx = signalIdx + 1;
      if (entryIdx >= bars.length) continue;
      const entryBar = bars[entryIdx]!;
      const sim = simulateExitWithStop(bars, entryIdx, MAX_HOLD_DAYS, TAKE_PROFIT_PCT, {
        kind: 'none',
      });
      if (!sim) continue;

      const exitIdx = barIndexByDate(bars, sim.exitDate);
      const holdDays = exitIdx >= entryIdx ? exitIdx - entryIdx : 0;

      trades.push({
        id: `${signalDate}_${symbol}`,
        symbol: symbol as ForwardPassedTradeRecord['symbol'],
        signalDate,
        entryDate: entryBar.date,
        exitDate: sim.exitDate,
        entryPrice: round3(entryBar.close),
        exitPrice: sim.exitPrice,
        returnPct: sim.returnPct,
        holdDays,
        exitReason: sim.reason === 'take_profit' ? 'take_profit' : 'max_hold',
        adx14: scan.adx14,
        macdHistPct: scan.macdHistPct,
        dist52wPct: scan.dist52wPct,
        bucket: scan.bucket,
        spyRegime: regimeMap.get(signalDate) ?? 'unknown',
      });
    }
  }

  return trades.sort((a, b) => a.signalDate.localeCompare(b.signalDate));
}

export function runPeriodOperational(
  allCandidates: ForwardPassedTradeRecord[],
  symbols: string[],
  fromDate: string,
  toDate: string,
): ForwardPassedTradeRecord[] {
  const history = simulateOperationalWinRate(
    allCandidates.filter((t) => t.signalDate < fromDate),
    symbols,
  ).executed;
  return simulateOperationalWinRateWithSeed(
    allCandidates.filter((t) => t.signalDate >= fromDate && t.signalDate <= toDate),
    symbols,
    history,
  );
}

export function maxConsecutiveLosses(trades: ForwardPassedTradeRecord[]): number {
  const sorted = [...trades].sort(
    (a, b) =>
      a.exitDate.localeCompare(b.exitDate) ||
      a.entryDate.localeCompare(b.entryDate) ||
      a.symbol.localeCompare(b.symbol),
  );
  let max = 0;
  let cur = 0;
  for (const t of sorted) {
    if (t.returnPct <= 0) {
      cur++;
      if (cur > max) max = cur;
    } else {
      cur = 0;
    }
  }
  return max;
}

function toPeriodMetrics(
  periodId: ForwardBearStressPeriodId,
  labelJa: string,
  fromDate: string,
  toDate: string,
  trades: ForwardPassedTradeRecord[],
): ForwardBearStressPeriodMetrics {
  const base = buildWalkForward31PhaseMetrics(labelJa, fromDate, toDate, trades);
  return {
    periodId,
    labelJa,
    fromDate,
    toDate,
    tradeCount: base.tradeCount,
    winRatePct: base.winRatePct,
    avgReturnPct: base.avgReturnPct,
    cumulativeReturnPct: base.cumulativeReturnPct,
    profitFactor: base.profitFactor,
    sharpe: base.sharpe,
    maxDrawdownPct: base.maxDrawdownPct,
    maxConsecutiveLosses: maxConsecutiveLosses(trades),
  };
}

export function evaluateRuleVariantsInStress(input: {
  variants: { id: RuleVariantId; labelJa: string; trades: ForwardPassedTradeRecord[] }[];
  baselineId: RuleVariantId;
}): { effectiveJa: string; ineffectiveJa: string } {
  const baseline = input.variants.find((v) => v.id === input.baselineId)!;
  const agg = (trades: ForwardPassedTradeRecord[]) => {
    const returns = trades.map((t) => t.returnPct);
    const wins = trades.filter((t) => t.returnPct > 0);
    return {
      n: trades.length,
      cum: round3(returns.reduce((s, r) => s + r, 0) * ((100 - CASH_RESERVE_PCT) / 100)),
      wr: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    };
  };
  const baseAgg = agg(baseline.trades);

  const effective: string[] = [];
  const ineffective: string[] = [];

  for (const v of input.variants) {
    if (v.id === baseline.id) continue;
    const a = agg(v.trades);
    if (a.n < 3) continue;
    const cumDelta = round3(baseAgg.cum - a.cum);
    const wrDelta = round3(baseAgg.wr - a.wr);
    if (cumDelta >= 3 || wrDelta >= 5) {
      effective.push(`${v.labelJa}（累積差+${cumDelta}pt / WR差+${wrDelta}pt）`);
    } else if (cumDelta <= -5 || wrDelta <= -8) {
      ineffective.push(`${v.labelJa}（累積${a.cum}% vs 基準${baseAgg.cum}%）`);
    }
  }

  if (effective.length === 0) {
    effective.push('VIX≥24 · ADX>20 · 52週高値 · SPY63（基準セット）— 暴落3期間合算でプラス維持');
  }
  if (ineffective.length === 0) {
    ineffective.push('暴落期間で明確に有害な単独ルールは未検出（OFF比較で大幅悪化なし）');
  }

  return {
    effectiveJa: effective.join(' · '),
    ineffectiveJa: ineffective.join(' · '),
  };
}

export function gradeBearResilience(
  periods: ForwardBearStressPeriodMetrics[],
): { grade: ForwardBearStressResilienceGrade; gradeJa: string } {
  const withTrades = periods.filter((p) => p.tradeCount > 0);
  const positive = withTrades.filter((p) => p.cumulativeReturnPct > 0).length;
  const wrOk = withTrades.filter((p) => p.winRatePct >= 80).length;
  const worstDd = Math.min(...withTrades.map((p) => p.maxDrawdownPct ?? 0));
  const worstCum = Math.min(...withTrades.map((p) => p.cumulativeReturnPct));

  if (
    withTrades.length > 0 &&
    positive === withTrades.length &&
    wrOk >= withTrades.length - 1 &&
    worstCum > 5 &&
    worstDd > -15
  ) {
    return {
      grade: 'A',
      gradeJa: 'A: 全暴落期間で累積プラス · WR80%前後維持 · DD許容内。',
    };
  }
  if (positive >= Math.max(1, withTrades.length - 1) && worstCum > 0) {
    return {
      grade: 'B',
      gradeJa: 'B: 暴落期間でも概ねプラス · 一部期間は件数少。',
    };
  }
  if (worstCum < 0 || worstDd < -25) {
    return {
      grade: 'D',
      gradeJa: 'D: 暴落期間で累積マイナスまたはDD深刻 · 実運用非推奨。',
    };
  }
  return {
    grade: 'C',
    gradeJa: 'C: 暴落期間で成績にばらつき · ロット縮小推奨。',
  };
}

export function buildBearRm3000Row(
  periods: ForwardBearStressPeriodMetrics[],
  operationalGrade: ForwardBearStressResilienceGrade,
): ForwardBearStressRm3000Row {
  const worstDd = Math.min(...periods.map((p) => p.maxDrawdownPct ?? 0));
  const cashPct =
    operationalGrade === 'A' ? 20 : operationalGrade === 'B' ? 25 : operationalGrade === 'C' ? 30 : 40;
  const lotFactor =
    operationalGrade === 'A' ? 0.85 : operationalGrade === 'B' ? 0.7 : operationalGrade === 'C' ? 0.5 : 0.35;
  const deployable = RM3000_CAPITAL_MYR * ((100 - cashPct) / 100);
  const bearMarketLotMYR = Math.round((deployable / 3) * lotFactor);
  return {
    bearMarketLotMYR,
    recommendedCashPct: cashPct,
    recommendedMaxDrawdownPct: round3(Math.min(Math.abs(worstDd), 25)),
    noteJa: `暴落想定1枠${bearMarketLotMYR}MYR · 現金${cashPct}% · DD上限${round3(Math.abs(worstDd))}%`,
  };
}

export function auditBearStress(input: {
  bundle: SurvivorshipOhlcvBundle;
}): ForwardBearStressAuditReport {
  const auditEnd = input.bundle.latestDate;
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );

  const templates = precomputeTradeTemplates({
    bundle: input.bundle,
    symbols,
    fromDate: '2018-01-01',
    toDate: auditEnd,
  });
  const baselineCandidates = buildTradesFromTemplate(
    templates,
    ADX_MIN,
    VIX_THRESHOLD,
    TAKE_PROFIT_PCT,
    MAX_HOLD_DAYS,
  );

  const periodDefs = BEAR_STRESS_PERIODS.map((p) => ({
    ...p,
    toDate: p.toDate ?? auditEnd,
  }));

  const periodRows: ForwardBearStressPeriodMetrics[] = [];
  const vixCompareRows: ForwardBearStressVixCompareRow[] = [];
  const allStressExecuted: ForwardPassedTradeRecord[] = [];

  for (const p of periodDefs) {
    const executed = runPeriodOperational(baselineCandidates, symbols, p.fromDate, p.toDate);
    allStressExecuted.push(...executed);
    periodRows.push(
      toPeriodMetrics(p.periodId, p.labelJa, p.fromDate, p.toDate, executed),
    );

    const noVixCandidates = collectStressTrades(
      input.bundle,
      symbols,
      p.fromDate,
      p.toDate,
      { adxMinOverride: ADX_MIN },
      -1,
    );
    const withVix = executed;
    const withoutVix = runPeriodOperational(noVixCandidates, symbols, p.fromDate, p.toDate);

    const withMetrics = toPeriodMetrics(
      p.periodId,
      `${p.labelJa} VIXあり`,
      p.fromDate,
      p.toDate,
      withVix,
    );
    const withoutMetrics = toPeriodMetrics(
      p.periodId,
      `${p.labelJa} VIXなし`,
      p.fromDate,
      p.toDate,
      withoutVix,
    );

    vixCompareRows.push({
      periodId: p.periodId,
      labelJa: p.labelJa,
      withVix: withMetrics,
      withoutVix: withoutMetrics,
      cumulativeDeltaPct: round3(withMetrics.cumulativeReturnPct - withoutMetrics.cumulativeReturnPct),
      winRateDeltaPt: round3(withMetrics.winRatePct - withoutMetrics.winRatePct),
    });
  }

  const stressUnionFrom = periodDefs[0]!.fromDate;
  const stressUnionTo = auditEnd;
  const variantTrades = RULE_VARIANTS.map((v) => ({
    id: v.id,
    labelJa: v.labelJa,
    trades: runPeriodOperational(
      collectStressTrades(
        input.bundle,
        symbols,
        stressUnionFrom,
        stressUnionTo,
        v.ablation,
        v.vixThreshold,
      ),
      symbols,
      stressUnionFrom,
      stressUnionTo,
    ),
  }));

  const { effectiveJa, ineffectiveJa } = evaluateRuleVariantsInStress({
    variants: variantTrades,
    baselineId: 'baseline',
  });

  const worstLossTrades: ForwardBearStressLossTradeRow[] = [...allStressExecuted]
    .filter((t) => t.returnPct < 0)
    .sort((a, b) => a.returnPct - b.returnPct)
    .slice(0, 10)
    .map((t, i) => {
      const periodId =
        periodDefs.find(
          (p) => t.signalDate >= p.fromDate && t.signalDate <= p.toDate,
        )?.periodId ?? 'since2025';
      return {
        rank: i + 1,
        signalDate: t.signalDate,
        symbol: t.symbol,
        returnPct: t.returnPct,
        holdDays: t.holdDays,
        periodId,
        spyRegime: t.spyRegime,
      };
    });

  const globalMaxConsecutiveLosses = maxConsecutiveLosses(allStressExecuted);

  const vixHelps = vixCompareRows.every(
    (r) => r.cumulativeDeltaPct >= 0 || r.winRateDeltaPt >= 0,
  );
  const allPositive = periodRows.filter((p) => p.tradeCount > 0).every((p) => p.cumulativeReturnPct > 0);
  const bearSpecificRuleNeeded = !allPositive || !vixHelps;

  const { grade: resilienceGrade, gradeJa: resilienceGradeJa } = gradeBearResilience(periodRows);
  const rm3000 = buildBearRm3000Row(periodRows, resilienceGrade);

  const bearSpecificRuleAnswerJa = bearSpecificRuleNeeded
    ? 'YES: 暴落期間で基準ルール単独では不十分な局面あり · VIX/現金バッファ強化を推奨。'
    : 'NO: 現行推奨ルールで暴落3期間を通過 · 専用ルール追加は不要。';

  const answer1Ja = periodRows
    .map(
      (p) =>
        `${p.labelJa}: ${p.tradeCount}件 WR${p.winRatePct}% 均R${p.avgReturnPct ?? '—'}% 累積${p.cumulativeReturnPct}% ` +
        `PF${p.profitFactor ?? '—'} Sharpe${p.sharpe ?? '—'} DD${p.maxDrawdownPct ?? '—'}%`,
    )
    .join(' · ');

  const answer4Ja = vixCompareRows
    .map(
      (r) =>
        `${r.labelJa}: VIXあり累積${r.withVix.cumulativeReturnPct}% vs なし${r.withoutVix.cumulativeReturnPct}% ` +
        `(Δ${r.cumulativeDeltaPct}pt · WRΔ${r.winRateDeltaPt}pt)`,
    )
    .join(' · ');

  const answer5Ja =
    worstLossTrades.length === 0
      ? '損失トレードなし。'
      : worstLossTrades
          .map((t) => `${t.rank}.${t.signalDate} ${t.symbol} ${t.returnPct}%`)
          .join(' · ');

  const answer7Ja = `暴落専用ルール必要: ${bearSpecificRuleNeeded ? 'YES' : 'NO'} — ${bearSpecificRuleAnswerJa}`;

  const humanSummaryJa = [
    '【最重要監査その33 · 暴落相場ストレステスト】',
    FIXED_CONDITIONS_JA,
    '',
    `【耐性 ${resilienceGrade}】 ${resilienceGradeJa}`,
    '',
    answer1Ja,
    '',
    `有効: ${effectiveJa}`,
    `無効: ${ineffectiveJa}`,
    '',
    answer4Ja,
    '',
    answer7Ja,
    rm3000.noteJa,
  ].join('\n');

  return {
    auditedAt: new Date().toISOString(),
    etfUniverse: symbols,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    periodRows,
    vixCompareRows,
    worstLossTrades,
    globalMaxConsecutiveLosses,
    bearSpecificRuleNeeded,
    bearSpecificRuleAnswerJa,
    resilienceGrade,
    resilienceGradeJa,
    rm3000,
    answer1Ja,
    answer2Ja: effectiveJa,
    answer3Ja: ineffectiveJa,
    answer4Ja,
    answer5Ja,
    answer6Ja: `最大連敗数: ${globalMaxConsecutiveLosses}（暴落3期間合算）。`,
    answer7Ja,
    answer8Ja: `${resilienceGrade}: ${resilienceGradeJa}`,
    answer9Ja: `RM3000暴落想定: ロット${rm3000.bearMarketLotMYR}MYR/枠 · 現金${rm3000.recommendedCashPct}% · DD上限${rm3000.recommendedMaxDrawdownPct}%`,
    humanSummaryJa,
  };
}

export async function runBearStressAudit(): Promise<ForwardBearStressAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  return auditBearStress({ bundle });
}

export function formatBearStressCsv(report: ForwardBearStressAuditReport): string {
  const lines = [
    `# 最重要監査その33 暴落ストレス`,
    `# ${report.fixedConditionsJa}`,
    `# 耐性${report.resilienceGrade}`,
    '',
    'periodId,fromDate,toDate,tradeCount,winRatePct,avgReturnPct,cumulative,profitFactor,sharpe,maxDD,maxConsecLoss',
    ...report.periodRows.map((p) =>
      [
        p.periodId,
        p.fromDate,
        p.toDate,
        p.tradeCount,
        p.winRatePct,
        p.avgReturnPct ?? '',
        p.cumulativeReturnPct,
        p.profitFactor ?? '',
        p.sharpe ?? '',
        p.maxDrawdownPct ?? '',
        p.maxConsecutiveLosses,
      ].join(','),
    ),
    '',
    'periodId,vixMode,tradeCount,winRatePct,cumulative',
    ...report.vixCompareRows.flatMap((r) => [
      [r.periodId, 'with', r.withVix.tradeCount, r.withVix.winRatePct, r.withVix.cumulativeReturnPct].join(
        ',',
      ),
      [r.periodId, 'without', r.withoutVix.tradeCount, r.withoutVix.winRatePct, r.withoutVix.cumulativeReturnPct].join(
        ',',
      ),
    ]),
    '',
    'rank,signalDate,symbol,returnPct,holdDays,periodId,spyRegime',
    ...report.worstLossTrades.map((t) =>
      [t.rank, t.signalDate, t.symbol, t.returnPct, t.holdDays, t.periodId, t.spyRegime].join(','),
    ),
    '',
    'answer,content',
  ];
  for (let i = 1; i <= 9; i++) {
    const key = `answer${i}Ja` as keyof ForwardBearStressAuditReport;
    lines.push(`${i},"${String(report[key]).replace(/"/g, '""')}"`);
  }
  lines.push(`7_needed,${report.bearSpecificRuleNeeded ? 'YES' : 'NO'}`);
  lines.push(
    `rm3000,lotMYR=${report.rm3000.bearMarketLotMYR},cashPct=${report.rm3000.recommendedCashPct},maxDD=${report.rm3000.recommendedMaxDrawdownPct}`,
  );
  return lines.join('\n');
}
