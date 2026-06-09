/**
 * 最重要監査その12 — 生存者バイアス除去 · 拡張ETFユニバース · 監査のみ
 */
import {
  FORWARD_ETF_UNIVERSE,
  FORWARD_HOLD_DAYS,
  FORWARD_MAX_CONCURRENT,
  FORWARD_PRIORITY,
  FORWARD_TAKE_PROFIT_PCT,
} from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardSurvivorshipAuditReport,
  ForwardSurvivorshipBiasVerdict,
  ForwardSurvivorshipCohortMetrics,
  ForwardSurvivorshipCompareRow,
} from '../../types/forwardValidation';
import {
  barIndexByDate,
  buildSpyRegimeMap,
  scanSignalAtBar,
  simulateExitFromEntry,
  type OhlcvBar,
} from './case4Indicators';
import { portfolioMaxDrawdownPct } from './forwardValidationOperationalAllocationAudit';
import { filterVixGteTrades } from './forwardValidationVixSensitivityAudit';
import { fetchForwardOhlcvDetailed } from './yahooOhlcvFetch';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';

const VIX_THRESHOLD = 24;
const BASELINE_4 = [...FORWARD_ETF_UNIVERSE] as string[];

/** 2018〜存在が想定される主要ETF（監査用・現行4ETF除く） */
export const SURVIVORSHIP_EXTENDED_ADDITIONS = [
  'SPY',
  'IVV',
  'VOO',
  'VIG',
  'HDV',
  'SDY',
  'DVY',
  'NOBL',
  'DIA',
  'IWB',
  'VTI',
  'ITOT',
  'IYY',
] as const;

const FIXED_CONDITIONS_JA =
  'VIX≥24 · ADX+MACD+52w+SPY63 · 同時3枠 · 1日1ETF · 利確+3% · 最大25日';

export type SurvivorshipOhlcvBundle = {
  etfBars: Record<string, OhlcvBar[]>;
  spyBars: OhlcvBar[];
  vixBars: OhlcvBar[];
  tradingDates: string[];
  latestDate: string;
  fetchedSymbols: string[];
  failedSymbols: string[];
  firstBarDates: Record<string, string>;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function uniqueSymbols(symbols: string[]): string[] {
  return [...new Set(symbols)];
}

export function buildExtendedUniverse(fetched: string[]): string[] {
  return uniqueSymbols([...BASELINE_4, ...SURVIVORSHIP_EXTENDED_ADDITIONS]).filter((s) =>
    fetched.includes(s),
  );
}

export function buildExtendedPriority(symbols: string[]): Record<string, number> {
  const priority: Record<string, number> = {};
  for (const s of symbols) {
    priority[s] = FORWARD_PRIORITY[s as keyof typeof FORWARD_PRIORITY] ?? 0;
  }
  return priority;
}

export async function fetchSurvivorshipAuditBundle(
  startDate = EXTENDED_AUDIT_START,
): Promise<SurvivorshipOhlcvBundle | null> {
  const allSymbols = uniqueSymbols([...BASELINE_4, ...SURVIVORSHIP_EXTENDED_ADDITIONS]);
  const etfBars: Record<string, OhlcvBar[]> = {};
  const fetchedSymbols: string[] = [];
  const failedSymbols: string[] = [];
  const firstBarDates: Record<string, string> = {};

  for (const sym of allSymbols) {
    const { bars, result } = await fetchForwardOhlcvDetailed(sym, 15_000, startDate);
    if (!result.ok || bars.length < 80) {
      failedSymbols.push(sym);
      continue;
    }
    etfBars[sym] = bars;
    fetchedSymbols.push(sym);
    firstBarDates[sym] = bars[0]!.date;
  }

  if (!fetchedSymbols.some((s) => BASELINE_4.includes(s))) return null;

  const spyFetch = await fetchForwardOhlcvDetailed('SPY', 15_000, startDate);
  if (!spyFetch.result.ok) return null;

  const vixFetch = await fetchForwardOhlcvDetailed('^VIX', 15_000, startDate);
  const spyBars = spyFetch.bars;
  const vixBars = vixFetch.result.ok ? vixFetch.bars : [];

  const dateSet = new Set<string>();
  for (const sym of fetchedSymbols) {
    for (const b of etfBars[sym] ?? []) dateSet.add(b.date);
  }
  const tradingDates = [...dateSet].sort();
  const latestDate = tradingDates[tradingDates.length - 1] ?? '';

  return {
    etfBars,
    spyBars,
    vixBars,
    tradingDates,
    latestDate,
    fetchedSymbols,
    failedSymbols,
    firstBarDates,
  };
}

export function collectPassedTradesForSymbols(
  bundle: SurvivorshipOhlcvBundle,
  symbols: string[],
  fromDate: string,
  toDate: string,
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

      const scan = scanSignalAtBar(bars, signalIdx, regimeMap);
      if (!scan?.passes) continue;

      const entryIdx = signalIdx + 1;
      if (entryIdx >= bars.length) continue;

      const entryBar = bars[entryIdx]!;
      const exit = simulateExitFromEntry(
        bars,
        entryIdx,
        FORWARD_HOLD_DAYS,
        FORWARD_TAKE_PROFIT_PCT,
      );
      if (!exit) continue;

      const exitIdx = barIndexByDate(bars, exit.exitDate);
      const holdDays = exitIdx >= entryIdx ? exitIdx - entryIdx : 0;

      trades.push({
        id: `${signalDate}_${symbol}`,
        symbol: symbol as ForwardPassedTradeRecord['symbol'],
        signalDate,
        entryDate: entryBar.date,
        exitDate: exit.exitDate,
        entryPrice: round3(entryBar.close),
        exitPrice: round3(exit.exitPrice),
        returnPct: exit.returnPct,
        holdDays,
        exitReason: exit.reason,
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

export function dedupOneEtfPerDayWithPriority(
  trades: ForwardPassedTradeRecord[],
  priority: Record<string, number>,
): ForwardPassedTradeRecord[] {
  const byDate = new Map<string, ForwardPassedTradeRecord[]>();
  for (const t of trades) {
    const list = byDate.get(t.signalDate) ?? [];
    list.push(t);
    byDate.set(t.signalDate, list);
  }
  const out: ForwardPassedTradeRecord[] = [];
  for (const rows of byDate.values()) {
    const best = [...rows].sort(
      (a, b) => (priority[b.symbol] ?? 0) - (priority[a.symbol] ?? 0),
    )[0]!;
    out.push(best);
  }
  return out.sort((a, b) => a.signalDate.localeCompare(b.signalDate));
}

export function simulateOperationalTradesWithPriority(
  trades: ForwardPassedTradeRecord[],
  priority: Record<string, number>,
): { executed: ForwardPassedTradeRecord[]; skippedCount: number } {
  const candidates = dedupOneEtfPerDayWithPriority(trades, priority);
  const sorted = [...candidates].sort(
    (a, b) =>
      a.entryDate.localeCompare(b.entryDate) ||
      a.signalDate.localeCompare(b.signalDate) ||
      a.symbol.localeCompare(b.symbol),
  );
  const open: ForwardPassedTradeRecord[] = [];
  const executed: ForwardPassedTradeRecord[] = [];
  let skippedCount = 0;

  for (const t of sorted) {
    const stillOpen = open.filter((o) => o.exitDate >= t.entryDate);
    open.length = 0;
    open.push(...stillOpen);
    if (open.length >= FORWARD_MAX_CONCURRENT) {
      skippedCount++;
      continue;
    }
    open.push(t);
    executed.push(t);
  }

  return { executed, skippedCount };
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

export function buildSurvivorshipCohortMetrics(
  labelJa: string,
  symbols: string[],
  executed: ForwardPassedTradeRecord[],
  baselineSet?: Set<string>,
): ForwardSurvivorshipCohortMetrics {
  const wins = executed.filter((t) => t.returnPct > 0);
  const returns = executed.map((t) => t.returnPct);
  const extendedOnlyTradeCount = baselineSet
    ? executed.filter((t) => !baselineSet.has(t.symbol)).length
    : undefined;

  return {
    labelJa,
    universeSize: symbols.length,
    symbols,
    tradeCount: executed.length,
    winRatePct: executed.length > 0 ? round3((wins.length / executed.length) * 100) : 0,
    avgReturnPct: mean(returns),
    maxDrawdownPct: portfolioMaxDrawdownPct(exitOrderedReturns(executed)),
    cumulativeReturnPct: round3(returns.reduce((s, r) => s + r, 0)),
    extendedOnlyTradeCount,
  };
}

export function evaluateSelectionBias(
  baseline: ForwardSurvivorshipCohortMetrics,
  extended: ForwardSurvivorshipCohortMetrics,
): { verdict: ForwardSurvivorshipBiasVerdict; verdictJa: string } {
  if (baseline.tradeCount === 0 || extended.tradeCount === 0) {
    return {
      verdict: 'mixed',
      verdictJa: '比較可能な実行トレードが不足。',
    };
  }

  const wrDelta = round3(baseline.winRatePct - extended.winRatePct);
  const cumRatio =
    baseline.cumulativeReturnPct !== 0
      ? round3(extended.cumulativeReturnPct / baseline.cumulativeReturnPct)
      : null;
  const extOnly = extended.extendedOnlyTradeCount ?? 0;
  const extOnlyPct = round3((extOnly / extended.tradeCount) * 100);

  if (Math.abs(wrDelta) <= 5 && cumRatio != null && cumRatio >= 0.7 && cumRatio <= 1.3) {
    return {
      verdict: 'not_biased',
      verdictJa:
        `ETF選択バイアス顕著ではない: 4ETF WR${baseline.winRatePct}% vs 拡張${extended.winRatePct}% · ` +
        `累積比${cumRatio} · 拡張のみ${extOnly}件（${extOnlyPct}%）。`,
    };
  }

  if (wrDelta > 8 && extended.cumulativeReturnPct < baseline.cumulativeReturnPct * 0.75) {
    return {
      verdict: 'selection_bias_suspected',
      verdictJa:
        `4ETF選択バイアスの疑い: 4ETFの方がWR+${wrDelta}pt・累積${baseline.cumulativeReturnPct}% vs ${extended.cumulativeReturnPct}%。` +
        `現行4銘柄が相対的に好成績ETFに偏っている可能性。`,
    };
  }

  if (extended.cumulativeReturnPct > baseline.cumulativeReturnPct * 1.15) {
    return {
      verdict: 'baseline_conservative',
      verdictJa:
        `4ETFは保守的選択（上方バイアスではない）: 拡張累積${extended.cumulativeReturnPct}% > 4ETF${baseline.cumulativeReturnPct}%。` +
        `ユニバース拡大で機会増だが勝率${extended.winRatePct}%。`,
    };
  }

  return {
    verdict: 'mixed',
    verdictJa:
      `混合結果: WR差${wrDelta}pt · 累積4ETF${baseline.cumulativeReturnPct}% / 拡張${extended.cumulativeReturnPct}% · ` +
      `拡張のみ${extOnly}件。`,
  };
}

function buildComparison(
  baseline: ForwardSurvivorshipCohortMetrics,
  extended: ForwardSurvivorshipCohortMetrics,
): ForwardSurvivorshipCompareRow[] {
  const fmt = (v: number | null, suffix = '') => (v != null ? `${v}${suffix}` : '—');
  const deltaExtMinusBase = (baseVal: number | null, extVal: number | null, suffix = '') => {
    if (baseVal == null || extVal == null) return '—';
    return `${round3(extVal - baseVal)}${suffix}`;
  };
  return [
    {
      metricJa: 'ユニバース',
      baseline4: String(baseline.universeSize),
      extendedAll: String(extended.universeSize),
      delta: String(extended.universeSize - baseline.universeSize),
    },
    {
      metricJa: '件数',
      baseline4: String(baseline.tradeCount),
      extendedAll: String(extended.tradeCount),
      delta: deltaExtMinusBase(baseline.tradeCount, extended.tradeCount),
    },
    {
      metricJa: '勝率',
      baseline4: fmt(baseline.winRatePct, '%'),
      extendedAll: fmt(extended.winRatePct, '%'),
      delta: deltaExtMinusBase(baseline.winRatePct, extended.winRatePct, 'pt'),
    },
    {
      metricJa: '平均利益率',
      baseline4: fmt(baseline.avgReturnPct, '%'),
      extendedAll: fmt(extended.avgReturnPct, '%'),
      delta: deltaExtMinusBase(baseline.avgReturnPct, extended.avgReturnPct, '%'),
    },
    {
      metricJa: '最大DD',
      baseline4: fmt(baseline.maxDrawdownPct, '%'),
      extendedAll: fmt(extended.maxDrawdownPct, '%'),
      delta: deltaExtMinusBase(baseline.maxDrawdownPct, extended.maxDrawdownPct, '%'),
    },
    {
      metricJa: '累積利益率',
      baseline4: fmt(baseline.cumulativeReturnPct, '%'),
      extendedAll: fmt(extended.cumulativeReturnPct, '%'),
      delta: deltaExtMinusBase(baseline.cumulativeReturnPct, extended.cumulativeReturnPct, '%'),
    },
  ];
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}

export function auditSurvivorship(input: {
  bundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
}): ForwardSurvivorshipAuditReport {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;
  const baselineSymbols = BASELINE_4.filter((s) => input.bundle.fetchedSymbols.includes(s));
  const extendedSymbols = buildExtendedUniverse(input.bundle.fetchedSymbols);
  const priority = buildExtendedPriority(extendedSymbols);
  const baselineSet = new Set(BASELINE_4);

  const allPassedBaseline = collectPassedTradesForSymbols(
    input.bundle,
    baselineSymbols,
    fromDate,
    toDate,
  );
  const allPassedExtended = collectPassedTradesForSymbols(
    input.bundle,
    extendedSymbols,
    fromDate,
    toDate,
  );

  const vixBaseline = filterVixGteTrades(allPassedBaseline, input.bundle.vixBars, VIX_THRESHOLD);
  const vixExtended = filterVixGteTrades(allPassedExtended, input.bundle.vixBars, VIX_THRESHOLD);

  const baselinePriority = buildExtendedPriority(baselineSymbols);
  const executedBaseline = simulateOperationalTradesWithPriority(vixBaseline, baselinePriority)
    .executed;
  const executedExtended = simulateOperationalTradesWithPriority(vixExtended, priority).executed;

  const baseline4 = buildSurvivorshipCohortMetrics('現行4ETF', baselineSymbols, executedBaseline);
  const extendedAll = buildSurvivorshipCohortMetrics(
    '拡張ユニバース',
    extendedSymbols,
    executedExtended,
    baselineSet,
  );

  const comparison = buildComparison(baseline4, extendedAll);
  const { verdict, verdictJa } = evaluateSelectionBias(baseline4, extendedAll);

  const verdictLabel: Record<ForwardSurvivorshipBiasVerdict, string> = {
    not_biased: '選択バイアス顕著でない',
    selection_bias_suspected: '選択バイアスの疑い',
    baseline_conservative: '4ETFは保守的',
    mixed: '混合',
  };

  const humanLines = [
    `【最重要監査その12】生存者バイアス除去 ${fromDate} ～ ${toDate}`,
    `固定条件: ${FIXED_CONDITIONS_JA}`,
    '監査のみ · ルール変更なし',
    '',
    `取得ETF ${input.bundle.fetchedSymbols.length}銘柄 · 失敗 ${input.bundle.failedSymbols.join(', ') || 'なし'}`,
    `拡張ユニバース: ${extendedSymbols.join(', ')}`,
    '',
    '■ 4ETF vs 拡張',
    `現行4: ${baseline4.tradeCount}件 · WR${baseline4.winRatePct}% · 均R${baseline4.avgReturnPct ?? '—'}% · DD${baseline4.maxDrawdownPct ?? '—'}% · 累積${baseline4.cumulativeReturnPct}%`,
    `拡張: ${extendedAll.tradeCount}件 · WR${extendedAll.winRatePct}% · 均R${extendedAll.avgReturnPct ?? '—'}% · DD${extendedAll.maxDrawdownPct ?? '—'}% · 累積${extendedAll.cumulativeReturnPct}% · 拡張のみ${extendedAll.extendedOnlyTradeCount ?? 0}件`,
    '',
    '■ 比較表',
    pad('指標', 12) + pad('4ETF', 14) + pad('拡張', 14) + pad('差', 12),
    ...comparison.map(
      (r) => pad(r.metricJa, 12) + pad(r.baseline4, 14) + pad(r.extendedAll, 14) + pad(r.delta, 12),
    ),
    '',
    '■ 上場開始日（一部）',
    ...extendedSymbols.slice(0, 8).map((s) => `${s}: ${input.bundle.firstBarDates[s] ?? '—'}`),
    '',
    `■ ETF選択バイアス: 【${verdictLabel[verdict]}】`,
    verdictJa,
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    baseline4,
    extendedAll,
    comparison,
    fetchedSymbols: input.bundle.fetchedSymbols,
    failedSymbols: input.bundle.failedSymbols,
    firstBarDates: input.bundle.firstBarDates,
    biasVerdict: verdict,
    biasVerdictJa: verdictJa,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export async function runSurvivorshipAudit(): Promise<ForwardSurvivorshipAuditReport | null> {
  const bundle = await fetchSurvivorshipAuditBundle();
  if (!bundle) return null;
  return auditSurvivorship({ bundle });
}

export function formatSurvivorshipCsv(report: ForwardSurvivorshipAuditReport): string {
  const row = (label: string, m: ForwardSurvivorshipCohortMetrics) =>
    [
      label,
      m.universeSize,
      m.tradeCount,
      m.winRatePct,
      m.avgReturnPct ?? '',
      m.maxDrawdownPct ?? '',
      m.cumulativeReturnPct,
      m.extendedOnlyTradeCount ?? '',
    ].join(',');

  return [
    'cohort,universeSize,tradeCount,winRatePct,avgReturnPct,maxDrawdownPct,cumulativeReturnPct,extendedOnlyTrades',
    row('baseline4', report.baseline4),
    row('extendedAll', report.extendedAll),
    '',
    'metric,baseline4,extendedAll,delta',
    ...report.comparison.map((r) => [r.metricJa, r.baseline4, r.extendedAll, r.delta].join(',')),
    '',
    `biasVerdict,${report.biasVerdict}`,
    `failedSymbols,"${report.failedSymbols.join(';')}"`,
  ].join('\n');
}
