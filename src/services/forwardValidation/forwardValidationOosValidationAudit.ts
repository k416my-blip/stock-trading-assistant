/**
 * 最重要監査その9 — アウトオブサンプル検証 · 実運用ルール固定 · 監査のみ
 */
import type {
  ForwardOosCompareRow,
  ForwardOosOverfitVerdict,
  ForwardOosPeriodMetrics,
  ForwardOosValidationAuditReport,
  ForwardOosYearRow,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { fetchForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { portfolioMaxDrawdownPct } from './forwardValidationOperationalAllocationAudit';
import { collectOperationalExecutedTrades } from './forwardValidationOperationalRebacktestAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';

export const OOS_TRAIN_FROM = '2018-01-01';
export const OOS_TRAIN_TO = '2022-12-31';
export const OOS_TEST_FROM = '2023-01-01';

const FIXED_CONDITIONS_JA =
  'ADX+MACD+52w+SPY63 · VIX≥24 · 同時3枠 · 1日1ETF(DGRO>VYM>SPLG>SCHD) — 学習期間で確定・検証期間は再計算のみ';

const OOS_YEARS = ['2023', '2024', '2025', '2026'];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function computeTradeMae(bars: OhlcvBar[], t: ForwardPassedTradeRecord): number | null {
  const entryIdx = barIndexByDate(bars, t.entryDate);
  const exitIdx = barIndexByDate(bars, t.exitDate);
  if (entryIdx < 0 || exitIdx < entryIdx || t.entryPrice <= 0) return null;
  let mae = 0;
  for (let i = entryIdx; i <= exitIdx; i++) {
    const lowRet = (bars[i]!.low / t.entryPrice - 1) * 100;
    if (lowRet < mae) mae = lowRet;
  }
  return round3(mae);
}

export function tradesInSignalRange(
  trades: ForwardPassedTradeRecord[],
  fromDate: string,
  toDate: string,
): ForwardPassedTradeRecord[] {
  return trades.filter((t) => t.signalDate >= fromDate && t.signalDate <= toDate);
}

function exitOrderedReturns(trades: ForwardPassedTradeRecord[]): number[] {
  return [...trades]
    .sort(
      (a, b) =>
        a.exitDate.localeCompare(b.exitDate) ||
        a.entryDate.localeCompare(b.entryDate) ||
        a.symbol.localeCompare(b.symbol),
    )
    .map((t) => t.returnPct);
}

export function buildOosPeriodMetrics(
  periodId: 'in_sample' | 'out_of_sample',
  labelJa: string,
  fromDate: string,
  toDate: string,
  trades: ForwardPassedTradeRecord[],
  bundle: ForwardOhlcvBundle,
): ForwardOosPeriodMetrics {
  const wins = trades.filter((t) => t.returnPct > 0);
  const returns = trades.map((t) => t.returnPct);
  const maes: number[] = [];
  for (const t of trades) {
    const mae = computeTradeMae(bundle.etfBars[t.symbol], t);
    if (mae != null) maes.push(mae);
  }
  const portfolioDd = portfolioMaxDrawdownPct(exitOrderedReturns(trades));

  return {
    periodId,
    labelJa,
    fromDate,
    toDate,
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(returns),
    maxDrawdownPct: portfolioDd ?? (maes.length > 0 ? round3(Math.min(...maes)) : null),
    cumulativeReturnPct: round3(returns.reduce((s, r) => s + r, 0)),
  };
}

function buildOosYearRow(
  year: string,
  trades: ForwardPassedTradeRecord[],
  bundle: ForwardOhlcvBundle,
  toDate: string,
): ForwardOosYearRow {
  const yearFrom = `${year}-01-01`;
  const yearEnd = year === '2026' ? toDate : `${year}-12-31`;
  const rangeEnd = yearEnd <= toDate ? yearEnd : toDate;
  const yearTrades = tradesInSignalRange(trades, yearFrom, rangeEnd);
  const m = buildOosPeriodMetrics('out_of_sample', year, yearFrom, rangeEnd, yearTrades, bundle);
  return {
    year,
    tradeCount: m.tradeCount,
    winRatePct: m.winRatePct,
    avgReturnPct: m.avgReturnPct,
    maxDrawdownPct: m.maxDrawdownPct,
    cumulativeReturnPct: m.cumulativeReturnPct,
  };
}

export function evaluateOverfit(
  inSample: ForwardOosPeriodMetrics,
  outOfSample: ForwardOosPeriodMetrics,
): { verdict: ForwardOosOverfitVerdict; verdictJa: string } {
  if (outOfSample.tradeCount === 0) {
    return {
      verdict: 'mild',
      verdictJa:
        'OOS期間に実行トレード0件 — 過剰適合評価は保留（サンプル不足）。IS成績のみ参照。',
    };
  }
  if (outOfSample.tradeCount < 5) {
    return {
      verdict: 'mild',
      verdictJa: `OOS${outOfSample.tradeCount}件 — 件数少のため統計的判定は限定的。勝率${outOfSample.winRatePct}%（IS ${inSample.winRatePct}%）。`,
    };
  }

  const wrDelta = round3(outOfSample.winRatePct - inSample.winRatePct);
  const avgIs = inSample.avgReturnPct ?? 0;
  const avgOos = outOfSample.avgReturnPct ?? 0;
  const avgRatio = avgIs > 0 ? avgOos / avgIs : avgOos >= avgIs ? 1 : 0;

  if (wrDelta >= -3 && avgRatio >= 0.85 && outOfSample.winRatePct >= 85) {
    return {
      verdict: 'none',
      verdictJa:
        `過剰適合なし: OOS勝率${outOfSample.winRatePct}%（IS比${wrDelta >= 0 ? '+' : ''}${wrDelta}pt）· ` +
        `均R${avgOos}% · 累積${outOfSample.cumulativeReturnPct}%。`,
    };
  }
  if (wrDelta >= -8 && avgRatio >= 0.65 && outOfSample.winRatePct >= 80) {
    return {
      verdict: 'mild',
      verdictJa:
        `軽度の乖離: OOS勝率${outOfSample.winRatePct}%（IS ${inSample.winRatePct}%）· 均R低下${round3(avgIs - avgOos)}% — 許容範囲内。`,
    };
  }
  if (wrDelta < -15 || outOfSample.winRatePct < 75 || avgRatio < 0.5) {
    return {
      verdict: 'clear',
      verdictJa:
        `過剰適合の疑い（強）: OOS勝率${outOfSample.winRatePct}% vs IS ${inSample.winRatePct}% · ` +
        `均R ${avgOos}% vs ${avgIs}%。`,
    };
  }
  return {
    verdict: 'suspected',
    verdictJa:
      `過剰適合の疑い: OOS勝率${outOfSample.winRatePct}%（Δ${wrDelta}pt）· 均R${avgOos}%（IS ${avgIs}%）。`,
  };
}

function buildComparison(
  inSample: ForwardOosPeriodMetrics,
  outOfSample: ForwardOosPeriodMetrics,
): ForwardOosCompareRow[] {
  const fmt = (v: number | null, suffix = '') => (v != null ? `${v}${suffix}` : '—');
  const delta = (a: number | null, b: number | null, suffix = '') => {
    if (a == null || b == null) return '—';
    return `${round3(a - b)}${suffix}`;
  };
  return [
    {
      metricJa: '件数',
      inSampleValue: String(inSample.tradeCount),
      outOfSampleValue: String(outOfSample.tradeCount),
      deltaValue: String(outOfSample.tradeCount - inSample.tradeCount),
    },
    {
      metricJa: '勝率',
      inSampleValue: fmt(inSample.winRatePct, '%'),
      outOfSampleValue: fmt(outOfSample.winRatePct, '%'),
      deltaValue: delta(outOfSample.winRatePct, inSample.winRatePct, 'pt'),
    },
    {
      metricJa: '平均利益率',
      inSampleValue: fmt(inSample.avgReturnPct, '%'),
      outOfSampleValue: fmt(outOfSample.avgReturnPct, '%'),
      deltaValue: delta(outOfSample.avgReturnPct, inSample.avgReturnPct, '%'),
    },
    {
      metricJa: '最大DD',
      inSampleValue: fmt(inSample.maxDrawdownPct, '%'),
      outOfSampleValue: fmt(outOfSample.maxDrawdownPct, '%'),
      deltaValue: delta(outOfSample.maxDrawdownPct, inSample.maxDrawdownPct, '%'),
    },
    {
      metricJa: '累積利益率',
      inSampleValue: fmt(inSample.cumulativeReturnPct, '%'),
      outOfSampleValue: fmt(outOfSample.cumulativeReturnPct, '%'),
      deltaValue: delta(outOfSample.cumulativeReturnPct, inSample.cumulativeReturnPct, '%'),
    },
  ];
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}

function formatPeriodLine(m: ForwardOosPeriodMetrics): string {
  return (
    `${m.labelJa}（${m.fromDate}〜${m.toDate}）: ${m.tradeCount}件 · 勝率${m.winRatePct}% · ` +
    `均R${m.avgReturnPct ?? '—'}% · DD${m.maxDrawdownPct ?? '—'}% · 累積${m.cumulativeReturnPct}%`
  );
}

function formatYearTable(rows: ForwardOosYearRow[]): string[] {
  const cols = [
    { w: 6, h: '年' },
    { w: 5, h: '件数' },
    { w: 7, h: '勝率%' },
    { w: 7, h: '均R%' },
    { w: 8, h: '最大DD%' },
    { w: 8, h: '累積%' },
  ];
  const line = (cells: string[]) => cols.map((c, i) => pad(cells[i] ?? '', c.w)).join(' ');
  return [
    line(cols.map((c) => c.h)),
    cols.map((c) => '-'.repeat(c.w)).join(' '),
    ...rows.map((r) =>
      line([
        r.year,
        String(r.tradeCount),
        String(r.winRatePct),
        r.avgReturnPct != null ? String(r.avgReturnPct) : '—',
        r.maxDrawdownPct != null ? String(r.maxDrawdownPct) : '—',
        String(r.cumulativeReturnPct),
      ]),
    ),
  ];
}

export function auditOosValidation(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardOosValidationAuditReport {
  const testTo = input.bundle.latestDate;
  const executed = collectOperationalExecutedTrades({
    bundle: input.bundle,
    fromDate: EXTENDED_AUDIT_START,
  });

  const isTrades = tradesInSignalRange(executed, OOS_TRAIN_FROM, OOS_TRAIN_TO);
  const oosTrades = tradesInSignalRange(executed, OOS_TEST_FROM, testTo);

  const inSample = buildOosPeriodMetrics(
    'in_sample',
    'インサンプル（学習）',
    OOS_TRAIN_FROM,
    OOS_TRAIN_TO,
    isTrades,
    input.bundle,
  );
  const outOfSample = buildOosPeriodMetrics(
    'out_of_sample',
    'アウトオブサンプル（検証）',
    OOS_TEST_FROM,
    testTo,
    oosTrades,
    input.bundle,
  );

  const oosYearly = OOS_YEARS.map((year) => buildOosYearRow(year, oosTrades, input.bundle, testTo));
  const comparison = buildComparison(inSample, outOfSample);
  const { verdict, verdictJa } = evaluateOverfit(inSample, outOfSample);

  const verdictLabel: Record<ForwardOosOverfitVerdict, string> = {
    none: '過剰適合なし',
    mild: '軽度の乖離',
    suspected: '過剰適合の疑い',
    clear: '過剰適合（強）',
  };

  const humanLines = [
    `【最重要監査その9】アウトオブサンプル検証`,
    `学習 ${OOS_TRAIN_FROM}〜${OOS_TRAIN_TO} · 検証 ${OOS_TEST_FROM}〜${testTo}`,
    `固定条件: ${FIXED_CONDITIONS_JA}`,
    '監査のみ · ルール変更なし · 最適化なし',
    '',
    '■ 期間別成績（実運用47件ベース · シグナル日で分割 · 全期間連続シミュレーション）',
    formatPeriodLine(inSample),
    formatPeriodLine(outOfSample),
    '',
    '■ IS vs OOS 比較',
    ...comparison.map(
      (r) =>
        `${r.metricJa}: IS ${r.inSampleValue} / OOS ${r.outOfSampleValue} / 差 ${r.deltaValue}`,
    ),
    '',
    '■ 検証期間 年別（2023〜2026）',
    ...formatYearTable(oosYearly),
    '',
    `■ 過剰適合評価: 【${verdictLabel[verdict]}】`,
    verdictJa,
  ];

  return {
    auditedAt: new Date().toISOString(),
    trainFrom: OOS_TRAIN_FROM,
    trainTo: OOS_TRAIN_TO,
    testFrom: OOS_TEST_FROM,
    testTo,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    inSample,
    outOfSample,
    oosYearly,
    comparison,
    overfitVerdict: verdict,
    overfitVerdictJa: verdictJa,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export async function runOosValidationAudit(): Promise<ForwardOosValidationAuditReport | null> {
  const bundle = await fetchForwardOhlcvBundle(EXTENDED_AUDIT_START);
  if (!bundle) return null;
  return auditOosValidation({ bundle });
}

export function formatOosValidationCsv(report: ForwardOosValidationAuditReport): string {
  const periodRow = (p: ForwardOosPeriodMetrics) =>
    [
      p.periodId,
      p.tradeCount,
      p.winRatePct,
      p.avgReturnPct ?? '',
      p.maxDrawdownPct ?? '',
      p.cumulativeReturnPct,
    ].join(',');

  const lines = [
    'period,tradeCount,winRatePct,avgReturnPct,maxDrawdownPct,cumulativeReturnPct',
    periodRow(report.inSample),
    periodRow(report.outOfSample),
    '',
    'year,tradeCount,winRatePct,avgReturnPct,maxDrawdownPct,cumulativeReturnPct',
    ...report.oosYearly.map((y) =>
      [y.year, y.tradeCount, y.winRatePct, y.avgReturnPct ?? '', y.maxDrawdownPct ?? '', y.cumulativeReturnPct].join(
        ',',
      ),
    ),
    '',
    'metric,inSample,outOfSample,delta',
    ...report.comparison.map((r) =>
      [r.metricJa, r.inSampleValue, r.outOfSampleValue, r.deltaValue].join(','),
    ),
    '',
    `overfitVerdict,${report.overfitVerdict}`,
  ];
  return lines.join('\n');
}
