/**
 * VIX≥24 期間分割・利益集中監査 — 2025年4〜5月偶然性検証 · 監査のみ
 */
import { FORWARD_SIGNAL_START, FORWARD_TAKE_PROFIT_PCT } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardVix24PeriodConcentrationAuditReport,
  ForwardVix24PeriodSplitId,
  ForwardVix24PeriodSplitRow,
  ForwardVix24VixOccurrenceCounts,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const VIX_THRESHOLD = 24;
const APR_MAY_2025_FROM = '2025-04-01';
const APR_MAY_2025_TO = '2025-05-31';

const PERIOD_DEFS: {
  id: ForwardVix24PeriodSplitId;
  labelJa: string;
  fromDate: string;
  toDate: string;
}[] = [
  { id: 'y2024', labelJa: '① 2024年のみ', fromDate: '2024-01-01', toDate: '2024-12-31' },
  { id: 'y2025_q1', labelJa: '② 2025年1〜3月', fromDate: '2025-01-01', toDate: '2025-03-31' },
  { id: 'y2025_apr_may', labelJa: '③ 2025年4〜5月', fromDate: APR_MAY_2025_FROM, toDate: APR_MAY_2025_TO },
  { id: 'y2025_jun_plus', labelJa: '④ 2025年6月以降', fromDate: '2025-06-01', toDate: '2099-12-31' },
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function vixAtDate(vixBars: OhlcvBar[], date: string): number | null {
  const idx = barIndexByDate(vixBars, date);
  if (idx < 0) return null;
  return round3(vixBars[idx]!.close);
}

function computeTradeMaxDrawdown(
  bars: OhlcvBar[],
  entryDate: string,
  exitDate: string,
  entryPrice: number,
): number | null {
  const entryIdx = barIndexByDate(bars, entryDate);
  const exitIdx = barIndexByDate(bars, exitDate);
  if (entryIdx < 0 || exitIdx < entryIdx || entryPrice <= 0) return null;

  let mae = 0;
  for (let i = entryIdx; i <= exitIdx; i++) {
    const lowRet = (bars[i]!.low / entryPrice - 1) * 100;
    if (lowRet < mae) mae = lowRet;
  }
  return round3(mae);
}

export function classifySignalPeriod(
  signalDate: string,
  latestDate: string,
): ForwardVix24PeriodSplitId | null {
  for (const def of PERIOD_DEFS) {
    const to = def.toDate === '2099-12-31' ? latestDate : def.toDate;
    if (signalDate >= def.fromDate && signalDate <= to) return def.id;
  }
  return null;
}

export function countVixOccurrences(
  vixBars: OhlcvBar[],
  tradingDates: string[],
  fromDate: string,
  toDate: string,
): ForwardVix24VixOccurrenceCounts {
  const dates = tradingDates.filter((d) => d >= fromDate && d <= toDate);
  let gte24 = 0;
  let gte30 = 0;
  let gte35 = 0;
  for (const d of dates) {
    const vix = vixAtDate(vixBars, d);
    if (vix == null) continue;
    if (vix >= 24) gte24++;
    if (vix >= 30) gte30++;
    if (vix >= 35) gte35++;
  }
  return {
    vixGte24Days: gte24,
    vixGte30Days: gte30,
    vixGte35Days: gte35,
    totalTradingDays: dates.length,
  };
}

function buildPeriodRow(
  def: (typeof PERIOD_DEFS)[number],
  trades: ForwardPassedTradeRecord[],
  bundle: ForwardOhlcvBundle,
  latestDate: string,
): ForwardVix24PeriodSplitRow {
  const to = def.toDate === '2099-12-31' ? latestDate : def.toDate;
  const periodTrades = trades.filter(
    (t) => t.signalDate >= def.fromDate && t.signalDate <= to,
  );
  const wins = periodTrades.filter((t) => t.returnPct > 0);
  const returns = periodTrades.map((t) => t.returnPct);
  const drawdowns: number[] = [];
  for (const t of periodTrades) {
    const dd = computeTradeMaxDrawdown(
      bundle.etfBars[t.symbol],
      t.entryDate,
      t.exitDate,
      t.entryPrice,
    );
    if (dd != null) drawdowns.push(dd);
  }
  return {
    periodId: def.id,
    labelJa: def.labelJa,
    fromDate: def.fromDate,
    toDate: to,
    tradeCount: periodTrades.length,
    winCount: wins.length,
    winRatePct:
      periodTrades.length > 0 ? round3((wins.length / periodTrades.length) * 100) : 0,
    avgReturnPct: mean(returns),
    avgMaxDrawdownPct: mean(drawdowns),
    cumulativeReturnPct: round3(returns.reduce((s, r) => s + r, 0)),
  };
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}

function formatPeriodTable(rows: ForwardVix24PeriodSplitRow[]): string[] {
  const cols = [
    { w: 16, h: '期間' },
    { w: 5, h: '件数' },
    { w: 7, h: '勝率%' },
    { w: 7, h: '均R%' },
    { w: 8, h: '最大DD%' },
    { w: 9, h: '累積%' },
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
        r.avgMaxDrawdownPct != null ? String(r.avgMaxDrawdownPct) : '—',
        String(r.cumulativeReturnPct),
      ]),
    ),
  ];
}

export function auditVix24PeriodConcentration(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardVix24PeriodConcentrationAuditReport {
  const passed = auditPassedTrades(input);
  const vixBars = input.bundle.vixBars ?? [];
  const cohort = passed.trades.filter((t) => {
    const vix = vixAtDate(vixBars, t.signalDate);
    return vix != null && vix >= VIX_THRESHOLD;
  });

  const periods = PERIOD_DEFS.map((def) =>
    buildPeriodRow(def, cohort, input.bundle, input.bundle.latestDate),
  );
  const vixOccurrences = countVixOccurrences(
    vixBars,
    input.bundle.tradingDates,
    FORWARD_SIGNAL_START,
    input.bundle.latestDate,
  );

  const totalCumulative = round3(cohort.reduce((s, t) => s + t.returnPct, 0));
  const aprMayTrades = cohort.filter(
    (t) => t.signalDate >= APR_MAY_2025_FROM && t.signalDate <= APR_MAY_2025_TO,
  );
  const aprMayCumulative = round3(aprMayTrades.reduce((s, t) => s + t.returnPct, 0));
  const profitConcentrationAprMay2025Pct =
    totalCumulative !== 0 ? round3((aprMayCumulative / totalCumulative) * 100) : null;

  const otherPeriodsWithTrades = periods.filter(
    (p) => p.periodId !== 'y2025_apr_may' && p.tradeCount > 0,
  );
  const concentrationVerdictJa =
    profitConcentrationAprMay2025Pct != null && profitConcentrationAprMay2025Pct >= 80
      ? `【高度集中】利益の${profitConcentrationAprMay2025Pct}%が2025年4〜5月。他期間実績=${otherPeriodsWithTrades.length}期間・${otherPeriodsWithTrades.reduce((s, p) => s + p.tradeCount, 0)}件`
      : profitConcentrationAprMay2025Pct != null
        ? `【分散】利益の${profitConcentrationAprMay2025Pct}%が2025年4〜5月`
        : '【判定不可】累積利益ゼロ';

  const humanLines = [
    `【VIX≥24 期間分割・利益集中監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `対象 条件適合 ${passed.tradeCount}件 · VIX≥${VIX_THRESHOLD} 該当 ${cohort.length}件 · 利確+${FORWARD_TAKE_PROFIT_PCT}%`,
    '（監査のみ・ルール変更なし）',
    '',
    '■ 期間別パフォーマンス（シグナル日基準）',
    ...formatPeriodTable(periods),
    '',
    '■ VIX発生回数（営業日・シグナル期間内）',
    `VIX≥24: ${vixOccurrences.vixGte24Days}日 / ${vixOccurrences.totalTradingDays}営業日`,
    `VIX≥30: ${vixOccurrences.vixGte30Days}日`,
    `VIX≥35: ${vixOccurrences.vixGte35Days}日`,
    '',
    '■ 利益集中（2025年4〜5月）',
    `全期間累積 ${totalCumulative}% · 4〜5月累積 ${aprMayCumulative}%`,
    `集中率 ${profitConcentrationAprMay2025Pct ?? '—'}%（利益のうち4〜5月が占める割合）`,
    concentrationVerdictJa,
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    cohortTradeCount: cohort.length,
    vixThreshold: VIX_THRESHOLD,
    periods,
    vixOccurrences,
    totalCumulativeReturnPct: totalCumulative,
    aprMay2025CumulativeReturnPct: aprMayCumulative,
    profitConcentrationAprMay2025Pct,
    concentrationVerdictJa,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatVix24PeriodConcentrationCsv(
  report: ForwardVix24PeriodConcentrationAuditReport,
): string {
  const periodHeader =
    'period,tradeCount,winRatePct,avgReturnPct,avgMaxDrawdownPct,cumulativeReturnPct';
  const periodRows = report.periods.map((p) =>
    [
      p.labelJa,
      p.tradeCount,
      p.winRatePct,
      p.avgReturnPct ?? '',
      p.avgMaxDrawdownPct ?? '',
      p.cumulativeReturnPct,
    ].join(','),
  );
  const vixRows = [
    '',
    'vixThreshold,occurrenceDays',
    `VIX>=24,${report.vixOccurrences.vixGte24Days}`,
    `VIX>=30,${report.vixOccurrences.vixGte30Days}`,
    `VIX>=35,${report.vixOccurrences.vixGte35Days}`,
    '',
    'metric,value',
    `totalCumulativeReturnPct,${report.totalCumulativeReturnPct}`,
    `aprMay2025CumulativeReturnPct,${report.aprMay2025CumulativeReturnPct}`,
    `profitConcentrationAprMay2025Pct,${report.profitConcentrationAprMay2025Pct ?? ''}`,
  ];
  return [periodHeader, ...periodRows, ...vixRows].join('\n');
}
