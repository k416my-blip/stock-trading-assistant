/**
 * MACD≥0.25 累積損益曲線監査 — 条件適合96件 · ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardMacdCumulativeAuditReport,
  ForwardMacdCumulativePeriodSummary,
  ForwardMacdCumulativePoint,
  ForwardPassedTradeRecord,
  ForwardStandalonePeriodId,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const MACD_THRESHOLD = 0.25;
const FILTER_LABEL = `MACD>=${MACD_THRESHOLD}（単独）`;

const PERIOD_DEFS: {
  id: ForwardStandalonePeriodId;
  labelJa: string;
  fromDate: string;
  toDate: string;
}[] = [
  { id: 'y2024', labelJa: '2024年', fromDate: '2024-01-01', toDate: '2024-12-31' },
  { id: 'y2025_h1', labelJa: '2025年前半', fromDate: '2025-01-01', toDate: '2025-06-30' },
  { id: 'y2025_h2', labelJa: '2025年後半', fromDate: '2025-07-01', toDate: '2099-12-31' },
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function periodIdForSignal(signalDate: string, latestDate: string): ForwardStandalonePeriodId | null {
  for (const def of PERIOD_DEFS) {
    const toDate = def.toDate === '2099-12-31' ? latestDate : def.toDate;
    if (signalDate >= def.fromDate && signalDate <= toDate) return def.id;
  }
  return null;
}

function sortTrades(trades: ForwardPassedTradeRecord[]): ForwardPassedTradeRecord[] {
  return [...trades].sort(
    (a, b) => a.signalDate.localeCompare(b.signalDate) || a.symbol.localeCompare(b.symbol),
  );
}

function buildCurve(
  trades: ForwardPassedTradeRecord[],
  latestDate: string,
): ForwardMacdCumulativePoint[] {
  let globalCum = 0;
  const periodRunning = new Map<ForwardStandalonePeriodId, number>();

  return trades.map((t) => {
    globalCum = round3(globalCum + t.returnPct);
    const pid = periodIdForSignal(t.signalDate, latestDate);
    let periodCum = 0;
    if (pid) {
      periodCum = round3((periodRunning.get(pid) ?? 0) + t.returnPct);
      periodRunning.set(pid, periodCum);
    }
    return {
      signalDate: t.signalDate,
      symbol: t.symbol,
      returnPct: round3(t.returnPct),
      cumulativeReturnPct: globalCum,
      periodId: pid,
      periodCumulativeReturnPct: pid ? periodCum : 0,
    };
  });
}

function buildPeriodSummaries(
  points: ForwardMacdCumulativePoint[],
): ForwardMacdCumulativePeriodSummary[] {
  return PERIOD_DEFS.map((def) => {
    const periodPoints = points.filter((p) => p.periodId === def.id);
    const last = periodPoints[periodPoints.length - 1];
    return {
      periodId: def.id,
      periodLabelJa: def.labelJa,
      fromDate: def.fromDate,
      toDate: def.toDate,
      tradeCount: periodPoints.length,
      cumulativeReturnPct: last?.periodCumulativeReturnPct ?? 0,
    };
  });
}

function formatPoint(p: ForwardMacdCumulativePoint, index: number): string {
  const periodNote = p.periodId ? ` · 期間内累積${p.periodCumulativeReturnPct}%` : '';
  return (
    `${index}. ${p.signalDate} · ${p.symbol} · R${p.returnPct}% · 累積${p.cumulativeReturnPct}%${periodNote}`
  );
}

export function auditMacdCumulative(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardMacdCumulativeAuditReport {
  const passed = auditPassedTrades(input);
  const cohort = sortTrades(
    passed.trades.filter((t) => t.macdHistPct >= MACD_THRESHOLD),
  );
  const curve = buildCurve(cohort, input.bundle.latestDate);
  const periodSummaries = buildPeriodSummaries(curve);
  const finalCumulative = curve.length > 0 ? curve[curve.length - 1]!.cumulativeReturnPct : 0;

  const humanLines = [
    `【MACD累積損益曲線監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `対象 条件適合 ${passed.tradeCount}件 · ${FILTER_LABEL} · 該当 ${cohort.length}件`,
    `全期間累積利益率: ${finalCumulative}%（各トレード利益率の算術和 · 監査のみ）`,
    '',
    '■ 期間別累積利益率',
    ...periodSummaries.map(
      (s) => `${s.periodLabelJa}: ${s.cumulativeReturnPct}%（${s.tradeCount}件）`,
    ),
    '',
    '■ 時系列（シグナル日 · ETF · 利益率 · 累積利益率）',
    ...(curve.length > 0 ? curve.map((p, i) => formatPoint(p, i + 1)) : ['（該当なし）']),
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    filterLabelJa: FILTER_LABEL,
    cohortTradeCount: cohort.length,
    macdThreshold: MACD_THRESHOLD,
    finalCumulativeReturnPct: finalCumulative,
    curve,
    periodSummaries,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatMacdCumulativeCsv(report: ForwardMacdCumulativeAuditReport): string {
  const header =
    'signalDate,symbol,returnPct,cumulativeReturnPct,periodId,periodCumulativeReturnPct';
  const tradeRows = report.curve.map((p) =>
    [
      p.signalDate,
      p.symbol,
      p.returnPct,
      p.cumulativeReturnPct,
      p.periodId ?? '',
      p.periodCumulativeReturnPct,
    ].join(','),
  );
  const summaryHeader = 'period,tradeCount,periodCumulativeReturnPct';
  const summaryRows = report.periodSummaries.map((s) =>
    [s.periodLabelJa, s.tradeCount, s.cumulativeReturnPct].join(','),
  );
  return [header, ...tradeRows, '', summaryHeader, ...summaryRows].join('\n');
}
