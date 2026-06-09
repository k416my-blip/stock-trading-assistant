/**
 * 最重要監査その15 — 保有期間感度分析 · 実運用ルール固定 · 2018〜 · 監査のみ
 */
import {
  FORWARD_HOLD_DAYS,
  FORWARD_TAKE_PROFIT_PCT,
} from '../../constants/forwardValidation';
import type {
  ForwardHoldPeriodDistributionBucket,
  ForwardHoldPeriodProfitCapturePoint,
  ForwardHoldPeriodSensitivityAuditReport,
  ForwardHoldPeriodSensitivityRow,
  ForwardHoldPeriodSensitivityVerdict,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { fetchForwardOhlcvBundle } from './forwardValidationEngine';
import { portfolioMaxDrawdownPct } from './forwardValidationOperationalAllocationAudit';
import { simulateOperationalTrades } from './forwardValidationOperationalRebacktestAudit';
import { collectPassedTradesFrom } from './forwardValidationPassedTradesAudit';
import { filterVixGteTrades } from './forwardValidationVixSensitivityAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';

export const HOLD_PERIOD_SENSITIVITY_LEVELS = [10, 15, 20, 25, 30, 40] as const;
const BASELINE_HOLD = FORWARD_HOLD_DAYS;
const VIX_THRESHOLD = 24;

const HOLD_BUCKETS: { labelJa: string; min: number; max: number }[] = [
  { labelJa: '1-5日', min: 1, max: 5 },
  { labelJa: '6-10日', min: 6, max: 10 },
  { labelJa: '11-15日', min: 11, max: 15 },
  { labelJa: '16-20日', min: 16, max: 20 },
  { labelJa: '21-25日', min: 21, max: 25 },
  { labelJa: '26-30日', min: 26, max: 30 },
  { labelJa: '31-40日', min: 31, max: 40 },
];

const PROFIT_CAPTURE_DAYS = [5, 10, 15, 20, 25] as const;

const FIXED_CONDITIONS_JA =
  `VIX≥24 · ADX+MACD+52w+SPY63 · 同時3枠 · 1日1ETF · 利確+${FORWARD_TAKE_PROFIT_PCT}% · 最大保有日のみ変更`;

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function median(vals: number[]): number | null {
  if (vals.length === 0) return null;
  const sorted = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return round3((sorted[mid - 1]! + sorted[mid]!) / 2);
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

export function buildHoldDistribution(
  trades: ForwardPassedTradeRecord[],
): ForwardHoldPeriodDistributionBucket[] {
  const total = trades.length;
  return HOLD_BUCKETS.map((b) => {
    const count = trades.filter((t) => t.holdDays >= b.min && t.holdDays <= b.max).length;
    return {
      bucketLabelJa: b.labelJa,
      tradeCount: count,
      sharePct: total > 0 ? round3((count / total) * 100) : 0,
    };
  });
}

export function buildHoldPeriodSensitivityRow(
  maxHoldDays: number,
  executed: ForwardPassedTradeRecord[],
): ForwardHoldPeriodSensitivityRow {
  const wins = executed.filter((t) => t.returnPct > 0);
  const returns = executed.map((t) => t.returnPct);
  const holdDaysList = executed.map((t) => t.holdDays);
  const cumulativeReturnPct = round3(returns.reduce((s, r) => s + r, 0));
  const maxDrawdownPct = portfolioMaxDrawdownPct(exitOrderedReturns(executed));
  const profitEfficiency =
    maxDrawdownPct != null && maxDrawdownPct !== 0
      ? round3(cumulativeReturnPct / Math.abs(maxDrawdownPct))
      : null;

  const allBuckets = HOLD_BUCKETS.map((b) => {
    const count = executed.filter((t) => t.holdDays >= b.min && t.holdDays <= b.max).length;
    return {
      bucketLabelJa: b.labelJa,
      tradeCount: count,
      sharePct: executed.length > 0 ? round3((count / executed.length) * 100) : 0,
    };
  });

  return {
    maxHoldDays,
    labelJa: `最大${maxHoldDays}日`,
    tradeCount: executed.length,
    winRatePct: executed.length > 0 ? round3((wins.length / executed.length) * 100) : 0,
    avgReturnPct: mean(returns),
    maxDrawdownPct,
    cumulativeReturnPct,
    profitEfficiency,
    avgHoldDays: mean(holdDaysList),
    medianHoldDays: median(holdDaysList),
    holdDistribution: allBuckets,
  };
}

export function buildProfitCapturePoints(
  maxHoldDays: number,
  executed: ForwardPassedTradeRecord[],
): ForwardHoldPeriodProfitCapturePoint[] {
  const totalReturn = executed.reduce((s, t) => s + t.returnPct, 0);
  const totalTrades = executed.length;
  return PROFIT_CAPTURE_DAYS.filter((d) => d <= maxHoldDays).map((days) => {
    const within = executed.filter((t) => t.holdDays <= days);
    const withinReturn = within.reduce((s, t) => s + t.returnPct, 0);
    return {
      withinDays: days,
      tradeCount: within.length,
      tradeSharePct: totalTrades > 0 ? round3((within.length / totalTrades) * 100) : 0,
      returnSharePct:
        totalReturn !== 0 ? round3((withinReturn / totalReturn) * 100) : within.length > 0 ? 100 : 0,
    };
  });
}

export function evaluateHold25Robustness(
  rows: ForwardHoldPeriodSensitivityRow[],
  baselineCapture: ForwardHoldPeriodProfitCapturePoint[],
): { verdict: ForwardHoldPeriodSensitivityVerdict; verdictJa: string } {
  const row25 = rows.find((r) => r.maxHoldDays === BASELINE_HOLD);
  if (!row25 || rows.length === 0) {
    return { verdict: 'hold25_suboptimal', verdictJa: '最大25日行が算出不可。' };
  }

  const withTrades = rows.filter((r) => r.tradeCount > 0);
  const bestCumulative = [...withTrades].sort(
    (a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct,
  )[0]!;
  const efficiencyEligible = withTrades.filter(
    (r) => r.maxDrawdownPct != null && Math.abs(r.maxDrawdownPct) >= 10,
  );
  const bestEfficiency = [...efficiencyEligible]
    .filter((r) => r.profitEfficiency != null)
    .sort((a, b) => (b.profitEfficiency ?? 0) - (a.profitEfficiency ?? 0))[0];

  const maxEff = Math.max(...efficiencyEligible.map((r) => r.profitEfficiency ?? 0), 0);
  const cumFloor = bestCumulative.cumulativeReturnPct * 0.85;
  const robustLevels = withTrades
    .filter(
      (r) =>
        r.winRatePct >= 80 &&
        r.cumulativeReturnPct >= cumFloor &&
        (r.profitEfficiency ?? 0) >= maxEff * 0.85,
    )
    .map((r) => r.maxHoldDays)
    .sort((a, b) => a - b);

  const capture20 = baselineCapture.find((p) => p.withinDays === 20);
  const capture15 = baselineCapture.find((p) => p.withinDays === 15);
  const profitInsight =
    capture20 != null
      ? `20日以内で利益の${capture20.returnSharePct}%（トレード${capture20.tradeSharePct}%）`
      : capture15 != null
        ? `15日以内で利益の${capture15.returnSharePct}%`
        : '';

  if (bestCumulative.maxHoldDays === BASELINE_HOLD) {
    return {
      verdict: 'optimal_hold25',
      verdictJa:
        `最大25日が累積${row25.cumulativeReturnPct}%で最高。${profitInsight}。` +
        `保有延長の余地は限定的。`,
    };
  }

  if (robustLevels.includes(BASELINE_HOLD) && robustLevels.length >= 2) {
    const span = `${robustLevels[0]}〜${robustLevels[robustLevels.length - 1]}日`;
    return {
      verdict: 'robust_hold25',
      verdictJa:
        `最大25日は頑健範囲内（${span}）: 累積${row25.cumulativeReturnPct}% · 勝率${row25.winRatePct}% · ` +
        `中央値${row25.medianHoldDays ?? '—'}日。${profitInsight}。`,
    };
  }

  const cumRatio =
    bestCumulative.cumulativeReturnPct > 0
      ? row25.cumulativeReturnPct / bestCumulative.cumulativeReturnPct
      : 0;
  const longerThan25 = withTrades.filter((r) => r.maxHoldDays > BASELINE_HOLD);
  const marginalGain =
    longerThan25.length > 0
      ? round3(
          Math.max(...longerThan25.map((r) => r.cumulativeReturnPct)) - row25.cumulativeReturnPct,
        )
      : 0;

  if (cumRatio >= 0.92 && marginalGain <= 15) {
    return {
      verdict: 'robust_hold25',
      verdictJa:
        `最大25日は合理的: 累積${row25.cumulativeReturnPct}%（最高${bestCumulative.maxHoldDays}日の${round3(cumRatio * 100)}%）· ` +
        `30-40日延長でも+${marginalGain}%程度。${profitInsight}。` +
        `利益の大半は20日以前に発生しており25日で十分。`,
    };
  }

  if (capture20 != null && capture20.returnSharePct >= 85 && row25.medianHoldDays != null && row25.medianHoldDays <= 15) {
    return {
      verdict: 'robust_hold25',
      verdictJa:
        `最大25日は合理的（早期利確型）: 中央値${row25.medianHoldDays}日 · ${profitInsight}。` +
        `満了待ちの必要性は低い。`,
    };
  }

  return {
    verdict: 'hold25_suboptimal',
    verdictJa:
      `最大25日は単独最適ではない: 最高累積=最大${bestCumulative.maxHoldDays}日（${bestCumulative.cumulativeReturnPct}%）· ` +
      `25日は累積${row25.cumulativeReturnPct}% · 効率${row25.profitEfficiency ?? '—'}。` +
      `${profitInsight || '利益発生タイミング要確認'}。`,
  };
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}

function formatMetricsTable(rows: ForwardHoldPeriodSensitivityRow[]): string[] {
  const cols = [
    { w: 8, h: '最大日' },
    { w: 5, h: '件数' },
    { w: 7, h: '勝率%' },
    { w: 7, h: '均R%' },
    { w: 8, h: '最大DD%' },
    { w: 8, h: '累積%' },
    { w: 8, h: '効率' },
    { w: 6, h: '中央' },
    { w: 6, h: '平均' },
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
        r.medianHoldDays != null ? String(r.medianHoldDays) : '—',
        r.avgHoldDays != null ? String(r.avgHoldDays) : '—',
      ]),
    ),
  ];
}

function formatDistributionBlock(row: ForwardHoldPeriodSensitivityRow): string[] {
  const lines = [
    `  ${row.labelJa}: 中央値${row.medianHoldDays ?? '—'}日 · 平均${row.avgHoldDays ?? '—'}日`,
  ];
  for (const b of row.holdDistribution) {
    if (b.tradeCount === 0) continue;
    lines.push(`    ${b.bucketLabelJa}: ${b.tradeCount}件 (${b.sharePct}%)`);
  }
  return lines;
}

export function auditHoldPeriodSensitivity(input: {
  bundle: ForwardOhlcvBundle;
  fromDate?: string;
}): ForwardHoldPeriodSensitivityAuditReport {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;
  const vixBars = input.bundle.vixBars ?? [];

  const rows = HOLD_PERIOD_SENSITIVITY_LEVELS.map((maxHold) => {
    const allPassed = collectPassedTradesFrom(
      input.bundle,
      fromDate,
      toDate,
      FORWARD_TAKE_PROFIT_PCT,
      maxHold,
    );
    const filtered = filterVixGteTrades(allPassed, vixBars, VIX_THRESHOLD);
    const executed = simulateOperationalTrades(filtered).executed;
    return buildHoldPeriodSensitivityRow(maxHold, executed);
  });

  const baselineExecuted = (() => {
    const allPassed = collectPassedTradesFrom(
      input.bundle,
      fromDate,
      toDate,
      FORWARD_TAKE_PROFIT_PCT,
      BASELINE_HOLD,
    );
    const filtered = filterVixGteTrades(allPassed, vixBars, VIX_THRESHOLD);
    return simulateOperationalTrades(filtered).executed;
  })();

  const baselineProfitCapture = buildProfitCapturePoints(BASELINE_HOLD, baselineExecuted);
  const { verdict, verdictJa } = evaluateHold25Robustness(rows, baselineProfitCapture);

  const verdictLabel: Record<ForwardHoldPeriodSensitivityVerdict, string> = {
    optimal_hold25: '25日が最適',
    robust_hold25: '25日は合理的',
    hold25_suboptimal: '25日は要検討',
  };

  const humanLines = [
    `【最重要監査その15】保有期間感度分析 ${fromDate} ～ ${toDate}`,
    `固定条件: ${FIXED_CONDITIONS_JA}`,
    '監査のみ · 最大保有日比較のみ · ルール変更・最適化禁止',
    '',
    '■ 最大保有日別成績（実運用シミュレーション · 退出日変動により件数も変動）',
    ...formatMetricsTable(rows),
    '',
    '■ 利益効率 = 累積利益率 ÷ |最大DD|',
    ...rows.map(
      (r) =>
        `${r.labelJa}: 効率${r.profitEfficiency ?? '—'}（累積${r.cumulativeReturnPct}% / DD${r.maxDrawdownPct ?? '—'}%）`,
    ),
    '',
    '■ 保有日数分布（各最大保有日シナリオ · 実行トレード）',
    ...rows.flatMap(formatDistributionBlock),
    '',
    `■ 現行25日 · 利益発生タイミング（保有日以内の累積利益シェア）`,
    ...baselineProfitCapture.map(
      (p) =>
        `${p.withinDays}日以内: トレード${p.tradeSharePct}% · 利益${p.returnSharePct}%（${p.tradeCount}件）`,
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
    levels: [...HOLD_PERIOD_SENSITIVITY_LEVELS],
    baselineMaxHoldDays: BASELINE_HOLD,
    rows,
    baselineProfitCapture,
    verdict,
    verdictJa,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export async function runHoldPeriodSensitivityAudit(): Promise<ForwardHoldPeriodSensitivityAuditReport | null> {
  const bundle = await fetchForwardOhlcvBundle(EXTENDED_AUDIT_START);
  if (!bundle) return null;
  return auditHoldPeriodSensitivity({ bundle });
}

export function formatHoldPeriodSensitivityCsv(
  report: ForwardHoldPeriodSensitivityAuditReport,
): string {
  const metricRows = report.rows.map((r) =>
    [
      r.maxHoldDays,
      r.tradeCount,
      r.winRatePct,
      r.avgReturnPct ?? '',
      r.maxDrawdownPct ?? '',
      r.cumulativeReturnPct,
      r.profitEfficiency ?? '',
      r.medianHoldDays ?? '',
      r.avgHoldDays ?? '',
    ].join(','),
  );

  const distRows = report.rows.flatMap((r) =>
    r.holdDistribution.map((b) =>
      [r.maxHoldDays, b.bucketLabelJa, b.tradeCount, b.sharePct].join(','),
    ),
  );

  const captureRows = report.baselineProfitCapture.map((p) =>
    [p.withinDays, p.tradeCount, p.tradeSharePct, p.returnSharePct].join(','),
  );

  return [
    'maxHoldDays,tradeCount,winRatePct,avgReturnPct,maxDrawdownPct,cumulativeReturnPct,profitEfficiency,medianHoldDays,avgHoldDays',
    ...metricRows,
    '',
    'maxHoldDays,bucket,tradeCount,sharePct',
    ...distRows,
    '',
    'withinDays,tradeCount,tradeSharePct,returnSharePct',
    ...captureRows,
    '',
    `verdict,${report.verdict}`,
    `baselineMaxHoldDays,${report.baselineMaxHoldDays}`,
  ].join('\n');
}
