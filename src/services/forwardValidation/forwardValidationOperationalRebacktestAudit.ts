/**
 * 最重要監査その7 — 実運用ルール再バックテスト · VIX≥24 · 2018〜 · 監査のみ
 */
import { FORWARD_MAX_CONCURRENT } from '../../constants/forwardValidation';
import type {
  ForwardBacktestFeasibilityGrade,
  ForwardOperationalRebacktestAuditReport,
  ForwardOperationalRebacktestCompareRow,
  ForwardOperationalRebacktestMetrics,
  ForwardOperationalRebacktestYearRow,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { fetchForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { dedupOneEtfPerDay } from './forwardValidationBacktestQualityAudit';
import { collectPassedTradesFrom } from './forwardValidationPassedTradesAudit';
import {
  EXTENDED_AUDIT_START,
  filterVix24Trades,
} from './forwardValidationVix24ExtendedHistoryAudit';

const VIX_THRESHOLD = 24;
const YEARS = ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026'];

const OPERATIONAL_RULES_JA =
  '同時保有最大3件 · シグナル日1ETF（DGRO>VYM>SPLG>SCHD） · 枠満杯時エントリー禁止';

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function computeTradeMaxDrawdown(
  bars: OhlcvBar[],
  t: ForwardPassedTradeRecord,
): number | null {
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

export function simulateOperationalTrades(trades: ForwardPassedTradeRecord[]): {
  executed: ForwardPassedTradeRecord[];
  skippedCount: number;
} {
  const candidates = dedupOneEtfPerDay(trades);
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

/** 監査その7/8共通 — 実運用ルール適用後の実行トレード一覧 */
export function collectOperationalExecutedTrades(input: {
  bundle: ForwardOhlcvBundle;
  fromDate?: string;
}): ForwardPassedTradeRecord[] {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;
  const vixBars = input.bundle.vixBars ?? [];
  const allPassed = collectPassedTradesFrom(input.bundle, fromDate, toDate);
  const cohort = filterVix24Trades(allPassed, vixBars);
  return simulateOperationalTrades(cohort).executed;
}

function tradesInYear(trades: ForwardPassedTradeRecord[], year: string, toDate: string): ForwardPassedTradeRecord[] {
  const yearFrom = `${year}-01-01`;
  const yearEnd = year === '2026' ? toDate : `${year}-12-31`;
  const rangeEnd = yearEnd <= toDate ? yearEnd : toDate;
  return trades.filter((t) => t.signalDate >= yearFrom && t.signalDate <= rangeEnd);
}

function buildMetrics(
  labelJa: string,
  trades: ForwardPassedTradeRecord[],
  bundle: ForwardOhlcvBundle,
  skippedSignalCount: number,
): ForwardOperationalRebacktestMetrics {
  const wins = trades.filter((t) => t.returnPct > 0);
  const returns = trades.map((t) => t.returnPct);
  const dds: number[] = [];
  for (const t of trades) {
    const dd = computeTradeMaxDrawdown(bundle.etfBars[t.symbol], t);
    if (dd != null) dds.push(dd);
  }
  return {
    labelJa,
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(returns),
    avgMaxDrawdownPct: mean(dds),
    worstTradeMaxDrawdownPct: dds.length > 0 ? round3(Math.min(...dds)) : null,
    cumulativeReturnPct: round3(returns.reduce((s, r) => s + r, 0)),
    skippedSignalCount,
  };
}

function buildYearly(
  trades: ForwardPassedTradeRecord[],
  bundle: ForwardOhlcvBundle,
  toDate: string,
  labelPrefix: string,
): ForwardOperationalRebacktestYearRow[] {
  return YEARS.map((year) => {
    const yearTrades = tradesInYear(trades, year, toDate);
    const m = buildMetrics(`${labelPrefix} ${year}`, yearTrades, bundle, 0);
    const { skippedSignalCount: _s, ...rest } = m;
    return { year, ...rest };
  });
}

function buildComparison(
  operational: ForwardOperationalRebacktestMetrics,
  theoretical: ForwardOperationalRebacktestMetrics,
): ForwardOperationalRebacktestCompareRow[] {
  const fmt = (v: number | null, suffix = '') =>
    v != null ? `${v}${suffix}` : '—';
  const delta = (a: number | null, b: number | null, suffix = '') => {
    if (a == null || b == null) return '—';
    return `${round3(a - b)}${suffix}`;
  };
  return [
    {
      metricJa: '件数',
      operationalValue: String(operational.tradeCount),
      theoreticalValue: String(theoretical.tradeCount),
      deltaValue: String(operational.tradeCount - theoretical.tradeCount),
    },
    {
      metricJa: '勝率',
      operationalValue: fmt(operational.winRatePct, '%'),
      theoreticalValue: fmt(theoretical.winRatePct, '%'),
      deltaValue: delta(operational.winRatePct, theoretical.winRatePct, 'pt'),
    },
    {
      metricJa: '平均利益率',
      operationalValue: fmt(operational.avgReturnPct, '%'),
      theoreticalValue: fmt(theoretical.avgReturnPct, '%'),
      deltaValue: delta(operational.avgReturnPct, theoretical.avgReturnPct, '%'),
    },
    {
      metricJa: '最大DD（均）',
      operationalValue: fmt(operational.avgMaxDrawdownPct, '%'),
      theoreticalValue: fmt(theoretical.avgMaxDrawdownPct, '%'),
      deltaValue: delta(operational.avgMaxDrawdownPct, theoretical.avgMaxDrawdownPct, '%'),
    },
    {
      metricJa: '最大DD（最悪）',
      operationalValue: fmt(operational.worstTradeMaxDrawdownPct, '%'),
      theoreticalValue: fmt(theoretical.worstTradeMaxDrawdownPct, '%'),
      deltaValue: delta(operational.worstTradeMaxDrawdownPct, theoretical.worstTradeMaxDrawdownPct, '%'),
    },
    {
      metricJa: '累積利益率',
      operationalValue: fmt(operational.cumulativeReturnPct, '%'),
      theoreticalValue: fmt(theoretical.cumulativeReturnPct, '%'),
      deltaValue: delta(operational.cumulativeReturnPct, theoretical.cumulativeReturnPct, '%'),
    },
    {
      metricJa: 'スキップ',
      operationalValue: String(operational.skippedSignalCount),
      theoreticalValue: '0',
      deltaValue: String(operational.skippedSignalCount),
    },
  ];
}

export function gradeOperationalFeasibility(
  operational: ForwardOperationalRebacktestMetrics,
): { grade: ForwardBacktestFeasibilityGrade; verdictJa: string } {
  const { tradeCount, winRatePct, avgReturnPct, cumulativeReturnPct, skippedSignalCount } =
    operational;
  if (
    tradeCount >= 40 &&
    winRatePct >= 95 &&
    (avgReturnPct ?? 0) >= 2.5 &&
    cumulativeReturnPct >= 100
  ) {
    return {
      grade: 'A',
      verdictJa:
        `A: 実運用ルール下でも高勝率（${winRatePct}%）・累積${cumulativeReturnPct}%。` +
        `${tradeCount}件実行・スキップ${skippedSignalCount}件。`,
    };
  }
  if (winRatePct >= 90 && cumulativeReturnPct >= 50 && tradeCount >= 25) {
    return {
      grade: 'B',
      verdictJa:
        `B: 実運用版は勝率${winRatePct}%・累積${cumulativeReturnPct}%（${tradeCount}件）。` +
        `理論版比で件数減だが運用可能水準。`,
    };
  }
  if (winRatePct >= 80 && cumulativeReturnPct > 0 && tradeCount >= 10) {
    return {
      grade: 'C',
      verdictJa:
        `C: 実運用版 ${tradeCount}件・勝率${winRatePct}%・累積${cumulativeReturnPct}%。` +
        `スキップ${skippedSignalCount}件。理論版との乖離あり。`,
    };
  }
  return {
    grade: 'D',
    verdictJa: `D: 実運用ルール下の成績または件数（${tradeCount}件）に重大な懸念。`,
  };
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}

function formatYearTable(rows: ForwardOperationalRebacktestYearRow[]): string[] {
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
    ...rows
      .filter((r) => r.tradeCount > 0)
      .map((r) =>
        line([
          r.year,
          String(r.tradeCount),
          String(r.winRatePct),
          r.avgReturnPct != null ? String(r.avgReturnPct) : '—',
          r.avgMaxDrawdownPct != null ? String(r.avgMaxDrawdownPct) : '—',
          String(r.cumulativeReturnPct),
        ]),
      ),
  ];
}

function formatMetricsLine(m: ForwardOperationalRebacktestMetrics): string {
  return (
    `${m.labelJa}: ${m.tradeCount}件 · 勝率${m.winRatePct}% · 均R${m.avgReturnPct ?? '—'}% · ` +
    `DD${m.avgMaxDrawdownPct ?? '—'}%（最悪${m.worstTradeMaxDrawdownPct ?? '—'}%） · ` +
    `累積${m.cumulativeReturnPct}% · スキップ${m.skippedSignalCount}件`
  );
}

export function auditOperationalRebacktest(input: {
  bundle: ForwardOhlcvBundle;
  fromDate?: string;
}): ForwardOperationalRebacktestAuditReport {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;
  const vixBars = input.bundle.vixBars ?? [];
  const allPassed = collectPassedTradesFrom(input.bundle, fromDate, toDate);
  const theoreticalTrades = filterVix24Trades(allPassed, vixBars);
  const { executed: operationalTrades, skippedCount } = simulateOperationalTrades(theoreticalTrades);

  const operational = buildMetrics('実運用版', operationalTrades, input.bundle, skippedCount);
  const theoretical = buildMetrics('理論版', theoreticalTrades, input.bundle, 0);
  const operationalYearly = buildYearly(operationalTrades, input.bundle, toDate, '実運用');
  const theoreticalYearly = buildYearly(theoreticalTrades, input.bundle, toDate, '理論');
  const comparison = buildComparison(operational, theoretical);
  const { grade, verdictJa } = gradeOperationalFeasibility(operational);

  const humanLines = [
    `【最重要監査その7】実運用ルール再バックテスト ${fromDate} ～ ${toDate}`,
    `条件 VIX≥${VIX_THRESHOLD} · ${OPERATIONAL_RULES_JA}`,
    '監査のみ · ルール変更なし',
    '',
    '■ 全体成績',
    formatMetricsLine(operational),
    formatMetricsLine(theoretical),
    '',
    '■ 比較表',
    ...comparison.map(
      (r) =>
        `${r.metricJa}: 実運用${r.operationalValue} / 理論${r.theoreticalValue} / 差${r.deltaValue}`,
    ),
    '',
    '■ 年別 — 実運用版',
    ...formatYearTable(operationalYearly),
    '',
    '■ 年別 — 理論版',
    ...formatYearTable(theoreticalYearly),
    '',
    `■ 実運用可能性: 【${grade}】`,
    verdictJa,
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate,
    toDate,
    operationalRulesJa: OPERATIONAL_RULES_JA,
    operational,
    theoretical,
    operationalYearly,
    theoreticalYearly,
    comparison,
    feasibilityGrade: grade,
    feasibilityVerdictJa: verdictJa,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export async function runOperationalRebacktestAudit(): Promise<ForwardOperationalRebacktestAuditReport | null> {
  const bundle = await fetchForwardOhlcvBundle(EXTENDED_AUDIT_START);
  if (!bundle) return null;
  return auditOperationalRebacktest({ bundle });
}

export function formatOperationalRebacktestCsv(
  report: ForwardOperationalRebacktestAuditReport,
): string {
  const lines = [
    'section,metric,operational,theoretical,delta',
    ...report.comparison.map((r) =>
      [r.metricJa, r.metricJa, r.operationalValue, r.theoreticalValue, r.deltaValue].join(','),
    ),
    '',
    'version,year,tradeCount,winRatePct,avgReturnPct,avgMaxDrawdownPct,cumulativeReturnPct',
    ...report.operationalYearly
      .filter((y) => y.tradeCount > 0)
      .map((y) =>
        [
          'operational',
          y.year,
          y.tradeCount,
          y.winRatePct,
          y.avgReturnPct ?? '',
          y.avgMaxDrawdownPct ?? '',
          y.cumulativeReturnPct,
        ].join(','),
      ),
    ...report.theoreticalYearly
      .filter((y) => y.tradeCount > 0)
      .map((y) =>
        [
          'theoretical',
          y.year,
          y.tradeCount,
          y.winRatePct,
          y.avgReturnPct ?? '',
          y.avgMaxDrawdownPct ?? '',
          y.cumulativeReturnPct,
        ].join(','),
      ),
    '',
    `feasibility,grade,${report.feasibilityGrade}`,
  ];
  return lines.join('\n');
}
