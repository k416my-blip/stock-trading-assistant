/**
 * 最重要監査その17 — ADX閾値感度分析 · 実運用ルール固定 · 2018〜 · 監査のみ
 */
import { FORWARD_ADX_MIN } from '../../constants/forwardValidation';
import type {
  ForwardAdxDiffTradeRow,
  ForwardAdxSensitivityAuditReport,
  ForwardAdxSensitivityRow,
  ForwardAdxSensitivityVerdict,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { fetchForwardOhlcvBundle } from './forwardValidationEngine';
import { portfolioMaxDrawdownPct } from './forwardValidationOperationalAllocationAudit';
import { simulateOperationalTrades } from './forwardValidationOperationalRebacktestAudit';
import {
  collectPassedTradesWithAblation,
} from './forwardValidationRuleContributionAudit';
import { filterVixGteTrades } from './forwardValidationVixSensitivityAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SignalAblationOptions } from './case4Indicators';

const VIX_THRESHOLD = 24;
const BASELINE_ADX = FORWARD_ADX_MIN;

const FIXED_CONDITIONS_JA =
  'VIX≥24 · MACD · 52週高値 · SPY63 · 同時3枠 · 1日1ETF · 利確+3% · 最大25営業日 · ADX閾値のみ変更';

export type AdxThresholdLevel = number | null;

export const ADX_SENSITIVITY_LEVELS: { threshold: AdxThresholdLevel; labelJa: string }[] = [
  { threshold: null, labelJa: 'ADXなし' },
  { threshold: 15, labelJa: 'ADX>15' },
  { threshold: 20, labelJa: 'ADX>20' },
  { threshold: 25, labelJa: 'ADX>25（現行）' },
  { threshold: 30, labelJa: 'ADX>30' },
  { threshold: 35, labelJa: 'ADX>35' },
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
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

export function ablationForAdxThreshold(threshold: AdxThresholdLevel): SignalAblationOptions {
  if (threshold === null) return { adxMinOverride: null };
  return { adxMinOverride: threshold };
}

export function runAdxThresholdOperational(
  bundle: ForwardOhlcvBundle,
  fromDate: string,
  toDate: string,
  threshold: AdxThresholdLevel,
): ForwardPassedTradeRecord[] {
  const ablation = ablationForAdxThreshold(threshold);
  const passed = collectPassedTradesWithAblation(bundle, fromDate, toDate, ablation);
  const vixBars = bundle.vixBars ?? [];
  const filtered = filterVixGteTrades(passed, vixBars, VIX_THRESHOLD);
  return simulateOperationalTrades(filtered).executed;
}

export function buildAdxSensitivityRow(
  threshold: AdxThresholdLevel,
  labelJa: string,
  executed: ForwardPassedTradeRecord[],
): ForwardAdxSensitivityRow {
  const wins = executed.filter((t) => t.returnPct > 0);
  const returns = executed.map((t) => t.returnPct);
  const cumulativeReturnPct = round3(returns.reduce((s, r) => s + r, 0));
  const maxDrawdownPct = portfolioMaxDrawdownPct(exitOrderedReturns(executed));
  const profitEfficiency =
    maxDrawdownPct != null && maxDrawdownPct !== 0
      ? round3(cumulativeReturnPct / Math.abs(maxDrawdownPct))
      : null;

  return {
    adxThreshold: threshold,
    labelJa,
    tradeCount: executed.length,
    winRatePct: executed.length > 0 ? round3((wins.length / executed.length) * 100) : 0,
    avgReturnPct: mean(returns),
    maxDrawdownPct,
    cumulativeReturnPct,
    profitEfficiency,
  };
}

export function buildAdxDiffTrades(
  noneExecuted: ForwardPassedTradeRecord[],
  baselineExecuted: ForwardPassedTradeRecord[],
): {
  adxNoneOnly: ForwardAdxDiffTradeRow[];
  adx25Only: ForwardAdxDiffTradeRow[];
  symbolSummaryNoneOnly: { symbol: string; count: number; cumulativeReturnPct: number }[];
} {
  const toKey = (t: ForwardPassedTradeRecord) => t.id;
  const baselineKeys = new Set(baselineExecuted.map(toKey));
  const noneKeys = new Set(noneExecuted.map(toKey));

  const toRow = (t: ForwardPassedTradeRecord): ForwardAdxDiffTradeRow => ({
    signalDate: t.signalDate,
    symbol: t.symbol,
    entryDate: t.entryDate,
    returnPct: t.returnPct,
    adx14: t.adx14,
    win: t.returnPct > 0,
  });

  const adxNoneOnly = noneExecuted.filter((t) => !baselineKeys.has(toKey(t))).map(toRow);
  const adx25Only = baselineExecuted.filter((t) => !noneKeys.has(toKey(t))).map(toRow);

  const bySymbol = new Map<string, { count: number; cumulativeReturnPct: number }>();
  for (const t of adxNoneOnly) {
    const cur = bySymbol.get(t.symbol) ?? { count: 0, cumulativeReturnPct: 0 };
    cur.count++;
    cur.cumulativeReturnPct = round3(cur.cumulativeReturnPct + t.returnPct);
    bySymbol.set(t.symbol, cur);
  }
  const symbolSummaryNoneOnly = [...bySymbol.entries()]
    .map(([symbol, v]) => ({ symbol, ...v }))
    .sort((a, b) => b.count - a.count);

  return { adxNoneOnly, adx25Only, symbolSummaryNoneOnly };
}

export function evaluateAdx25Robustness(
  rows: ForwardAdxSensitivityRow[],
  diff: ReturnType<typeof buildAdxDiffTrades>,
): { verdict: ForwardAdxSensitivityVerdict; verdictJa: string } {
  const row25 = rows.find((r) => r.adxThreshold === BASELINE_ADX);
  const rowNone = rows.find((r) => r.adxThreshold === null);
  if (!row25 || rows.length === 0) {
    return { verdict: 'adx25_suboptimal', verdictJa: 'ADX>25行が算出不可。' };
  }

  const withTrades = rows.filter((r) => r.tradeCount > 0);
  const bestCumulative = [...withTrades].sort(
    (a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct,
  )[0]!;
  const bestEfficiency = [...withTrades]
    .filter((r) => r.profitEfficiency != null)
    .sort((a, b) => (b.profitEfficiency ?? 0) - (a.profitEfficiency ?? 0))[0];
  const bestWinRate = [...withTrades].sort((a, b) => b.winRatePct - a.winRatePct)[0]!;

  const maxEff = Math.max(...withTrades.map((r) => r.profitEfficiency ?? 0));
  const cumFloor = bestCumulative.cumulativeReturnPct * 0.85;
  const robustLevels = withTrades
    .filter(
      (r) =>
        r.winRatePct >= 85 &&
        r.cumulativeReturnPct >= cumFloor &&
        (r.profitEfficiency ?? 0) >= maxEff * 0.85,
    )
    .map((r) => r.adxThreshold)
    .sort((a, b) => {
      if (a === null) return -1;
      if (b === null) return 1;
      return a - b;
    });

  const noneOnlyWins = diff.adxNoneOnly.filter((t) => t.win).length;
  const noneOnlyTotal = diff.adxNoneOnly.length;
  const noneOnlyCum = round3(diff.adxNoneOnly.reduce((s, t) => s + t.returnPct, 0));
  const oppLossNote =
    noneOnlyTotal > 0
      ? `ADXなしのみ${noneOnlyTotal}件（勝${noneOnlyWins}・累積${noneOnlyCum}%）が25で除外。`
      : 'ADX25で追加除外トレードなし。';

  if (bestCumulative.adxThreshold === BASELINE_ADX && row25.winRatePct >= 88) {
    return {
      verdict: 'optimal_adx25',
      verdictJa:
        `ADX>25は累積${row25.cumulativeReturnPct}%・勝率${row25.winRatePct}%でバランス最良帯。${oppLossNote}`,
    };
  }

  if (robustLevels.some((t) => t === BASELINE_ADX) && robustLevels.length >= 2) {
    const labels = robustLevels.map((t) => (t === null ? 'なし' : `>${t}`)).join('、');
    return {
      verdict: 'robust_adx25',
      verdictJa:
        `ADX>25は頑健範囲（${labels}）: 累積${row25.cumulativeReturnPct}% · 勝率${row25.winRatePct}% · 効率${row25.profitEfficiency ?? '—'}。` +
        `${oppLossNote} 過度な機会損失${noneOnlyTotal > 25 ? 'の疑い' : 'ではない'}。`,
    };
  }

  if (
    rowNone &&
    rowNone.cumulativeReturnPct > row25.cumulativeReturnPct * 1.2 &&
    row25.winRatePct >= rowNone.winRatePct
  ) {
    return {
      verdict: 'adx_quality_filter',
      verdictJa:
        `ADXは必須の品質フィルタ: なし累積${rowNone.cumulativeReturnPct}% vs 25累積${row25.cumulativeReturnPct}%だが、` +
        `勝率${row25.winRatePct}% vs ${rowNone.winRatePct}%。${oppLossNote} 機会損失よりDD・勝率管理に寄与。`,
    };
  }

  if (bestCumulative.adxThreshold === null || (bestCumulative.adxThreshold ?? 99) < BASELINE_ADX) {
    return {
      verdict: 'adx25_strict',
      verdictJa:
        `ADX>25は厳しめ: 最高累積=${bestCumulative.labelJa}（${bestCumulative.cumulativeReturnPct}%）。` +
        `25は累積${row25.cumulativeReturnPct}% · ${oppLossNote}`,
    };
  }

  return {
    verdict: 'mixed',
    verdictJa:
      `混合: 最高累積=${bestCumulative.labelJa} · 25は累積${row25.cumulativeReturnPct}% · 勝率${row25.winRatePct}%。${oppLossNote}`,
  };
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}

function formatTable(rows: ForwardAdxSensitivityRow[]): string[] {
  const cols = [
    { w: 14, h: 'ADX' },
    { w: 5, h: '件数' },
    { w: 7, h: '勝率%' },
    { w: 7, h: '均R%' },
    { w: 8, h: '最大DD%' },
    { w: 8, h: '累積%' },
    { w: 8, h: '効率' },
  ];
  const line = (cells: string[]) => cols.map((c, i) => pad(cells[i] ?? '', c.w)).join(' ');
  return [
    line(cols.map((c) => c.h)),
    cols.map((c) => '-'.repeat(c.w)).join(' '),
    ...rows.map((r) =>
      line([
        r.labelJa,
        String(r.tradeCount),
        String(r.winRatePct),
        r.avgReturnPct != null ? String(r.avgReturnPct) : '—',
        r.maxDrawdownPct != null ? String(r.maxDrawdownPct) : '—',
        String(r.cumulativeReturnPct),
        r.profitEfficiency != null ? String(r.profitEfficiency) : '—',
      ]),
    ),
  ];
}

export function auditAdxSensitivity(input: {
  bundle: ForwardOhlcvBundle;
  fromDate?: string;
}): ForwardAdxSensitivityAuditReport {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;

  const executedByLevel = ADX_SENSITIVITY_LEVELS.map((level) => ({
    level,
    executed: runAdxThresholdOperational(
      input.bundle,
      fromDate,
      toDate,
      level.threshold,
    ),
  }));

  const rows = executedByLevel.map(({ level, executed }) =>
    buildAdxSensitivityRow(level.threshold, level.labelJa, executed),
  );

  const noneExecuted =
    executedByLevel.find((e) => e.level.threshold === null)?.executed ?? [];
  const baselineExecuted =
    executedByLevel.find((e) => e.level.threshold === BASELINE_ADX)?.executed ?? [];
  const diff = buildAdxDiffTrades(noneExecuted, baselineExecuted);
  const { verdict, verdictJa } = evaluateAdx25Robustness(rows, diff);

  const verdictLabel: Record<ForwardAdxSensitivityVerdict, string> = {
    optimal_adx25: 'ADX25最適帯',
    robust_adx25: 'ADX25頑健',
    adx_quality_filter: 'ADX品質フィルタ',
    adx25_strict: 'ADX25厳しめ',
    mixed: '混合',
  };

  const humanLines = [
    `【最重要監査その17】ADX閾値感度分析 ${fromDate} ～ ${toDate}`,
    `固定条件: ${FIXED_CONDITIONS_JA}`,
    '監査のみ · ADX閾値比較のみ · ルール変更・最適化禁止',
    '',
    '■ ADX閾値別成績（実運用シミュレーション）',
    ...formatTable(rows),
    '',
    '■ 利益効率 = 累積利益率 ÷ |最大DD|',
    ...rows.map(
      (r) =>
        `${r.labelJa}: 効率${r.profitEfficiency ?? '—'}（累積${r.cumulativeReturnPct}% / DD${r.maxDrawdownPct ?? '—'}%）`,
    ),
    '',
    `■ ADXなし vs ADX>25 差分（ADXなしのみ ${diff.adxNoneOnly.length}件 · ADX25のみ ${diff.adx25Only.length}件）`,
    '--- ADXなしのみ（25で機会損失）銘柄別 ---',
    ...diff.symbolSummaryNoneOnly.map(
      (s) => `${s.symbol}: ${s.count}件 · 累積${s.cumulativeReturnPct}%`,
    ),
    '--- ADXなしのみ 全件 ---',
    ...diff.adxNoneOnly.map(
      (t) =>
        `${t.signalDate} ${t.symbol} ADX${t.adx14} R${t.returnPct}% ${t.win ? '勝' : '負'}`,
    ),
    '',
    `■ 評価: 【${verdictLabel[verdict]}】`,
    verdictJa,
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    levels: ADX_SENSITIVITY_LEVELS.map((l) => l.threshold),
    baselineAdxThreshold: BASELINE_ADX,
    rows,
    adxNoneOnlyTrades: diff.adxNoneOnly,
    adx25OnlyTrades: diff.adx25Only,
    symbolSummaryNoneOnly: diff.symbolSummaryNoneOnly,
    verdict,
    verdictJa,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export async function runAdxSensitivityAudit(): Promise<ForwardAdxSensitivityAuditReport | null> {
  const bundle = await fetchForwardOhlcvBundle(EXTENDED_AUDIT_START);
  if (!bundle) return null;
  return auditAdxSensitivity({ bundle });
}

export function formatAdxSensitivityCsv(report: ForwardAdxSensitivityAuditReport): string {
  const metricRows = report.rows.map((r) =>
    [
      r.adxThreshold ?? 'none',
      r.labelJa,
      r.tradeCount,
      r.winRatePct,
      r.avgReturnPct ?? '',
      r.maxDrawdownPct ?? '',
      r.cumulativeReturnPct,
      r.profitEfficiency ?? '',
    ].join(','),
  );

  const diffRows = report.adxNoneOnlyTrades.map((t) =>
    [t.signalDate, t.symbol, t.entryDate, t.adx14, t.returnPct, t.win ? 1 : 0].join(','),
  );

  return [
    'adxThreshold,labelJa,tradeCount,winRatePct,avgReturnPct,maxDrawdownPct,cumulativeReturnPct,profitEfficiency',
    ...metricRows,
    '',
    'signalDate,symbol,entryDate,adx14,returnPct,win',
    ...diffRows,
    '',
    `verdict,${report.verdict}`,
    `baselineAdxThreshold,${report.baselineAdxThreshold}`,
  ].join('\n');
}
