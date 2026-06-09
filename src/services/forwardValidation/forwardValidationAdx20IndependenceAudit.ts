/**
 * 最重要監査その20 — ADX20追加18件の独立性検証 · 監査18の18件 · 2018〜 · 監査のみ
 */
import type {
  ForwardAdx20IndependenceAuditReport,
  ForwardAdx20IndependenceEventRow,
  ForwardAdx20IndependencePeriodRow,
  ForwardAdx20IndependenceStreakRow,
  ForwardAdx20IndependenceVerdict,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { fetchForwardOhlcvBundle } from './forwardValidationEngine';
import { collectAdx20OnlyFullTrades } from './forwardValidationAdx20ValidationAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';

const FIXED_CONDITIONS_JA =
  'VIX≥24 · MACD · 52週高値 · SPY63 · 同時3枠 · 1日1ETF · 利確+3% · 最大25営業日';

/** 同一ETF·同一相場局面で連続とみなす最大カレンダー日数 */
export const EVENT_MAX_GAP_CALENDAR_DAYS = 14;

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function calendarDaysBetween(a: string, b: string): number {
  const da = new Date(`${a}T12:00:00Z`);
  const db = new Date(`${b}T12:00:00Z`);
  return Math.round(Math.abs(db.getTime() - da.getTime()) / 86_400_000);
}

function sortTrades(trades: ForwardPassedTradeRecord[]): ForwardPassedTradeRecord[] {
  return [...trades].sort(
    (a, b) =>
      a.signalDate.localeCompare(b.signalDate) || a.symbol.localeCompare(b.symbol),
  );
}

export function canMergeIntoSameEvent(
  prev: ForwardPassedTradeRecord,
  next: ForwardPassedTradeRecord,
  maxGapDays: number,
): boolean {
  if (prev.symbol !== next.symbol || prev.spyRegime !== next.spyRegime) return false;
  return calendarDaysBetween(prev.signalDate, next.signalDate) <= maxGapDays;
}

function buildEventRow(
  eventId: number,
  trades: ForwardPassedTradeRecord[],
): ForwardAdx20IndependenceEventRow {
  const returns = trades.map((t) => t.returnPct);
  const cumulativeReturnPct = round3(returns.reduce((s, r) => s + r, 0));
  return {
    eventId,
    symbol: trades[0]!.symbol,
    spyRegime: trades[0]!.spyRegime,
    tradeCount: trades.length,
    startDate: trades[0]!.signalDate,
    endDate: trades[trades.length - 1]!.signalDate,
    cumulativeReturnPct,
    win: cumulativeReturnPct > 0,
    signalDates: trades.map((t) => t.signalDate),
  };
}

export function clusterIndependenceEvents(
  trades: ForwardPassedTradeRecord[],
  maxGapDays: number = EVENT_MAX_GAP_CALENDAR_DAYS,
): ForwardAdx20IndependenceEventRow[] {
  const sorted = sortTrades(trades);
  const events: ForwardAdx20IndependenceEventRow[] = [];
  let current: ForwardPassedTradeRecord[] = [];

  const flush = () => {
    if (current.length === 0) return;
    events.push(buildEventRow(events.length + 1, current));
    current = [];
  };

  for (const t of sorted) {
    if (current.length === 0) {
      current.push(t);
      continue;
    }
    const prev = current[current.length - 1]!;
    if (canMergeIntoSameEvent(prev, t, maxGapDays)) {
      current.push(t);
    } else {
      flush();
      current.push(t);
    }
  }
  flush();
  return events;
}

export function buildConsecutiveStreaks(
  events: ForwardAdx20IndependenceEventRow[],
): ForwardAdx20IndependenceStreakRow[] {
  return events
    .filter((e) => e.tradeCount >= 2)
    .map((e) => ({
      symbol: e.symbol,
      spyRegime: e.spyRegime,
      streakLength: e.tradeCount,
      startDate: e.startDate,
      endDate: e.endDate,
      cumulativeReturnPct: e.cumulativeReturnPct,
      signalDates: e.signalDates,
    }));
}

function periodKey(signalDate: string, granularity: 'year' | 'month'): string {
  return granularity === 'year' ? signalDate.slice(0, 4) : signalDate.slice(0, 7);
}

export function buildPeriodBreakdown(
  trades: ForwardPassedTradeRecord[],
  granularity: 'year' | 'month',
): ForwardAdx20IndependencePeriodRow[] {
  const byPeriod = new Map<string, ForwardPassedTradeRecord[]>();
  for (const t of trades) {
    const key = periodKey(t.signalDate, granularity);
    if (!byPeriod.has(key)) byPeriod.set(key, []);
    byPeriod.get(key)!.push(t);
  }
  return [...byPeriod.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, rows]) => ({
      period,
      tradeCount: rows.length,
      cumulativeReturnPct: round3(rows.reduce((s, r) => s + r.returnPct, 0)),
    }));
}

export function evaluateAdx20Independence(input: {
  tradeCount: number;
  events: ForwardAdx20IndependenceEventRow[];
  yearly: ForwardAdx20IndependencePeriodRow[];
  tradeCumulativeReturnPct: number;
}): { verdict: ForwardAdx20IndependenceVerdict; verdictJa: string } {
  const { tradeCount, events, yearly, tradeCumulativeReturnPct } = input;
  const eventCount = events.length;

  if (tradeCount === 0) {
    return { verdict: 'mixed', verdictJa: '分析対象トレードなし。' };
  }

  const compressionRatio = round3(tradeCount / eventCount);
  const topYearTrades = yearly.reduce((max, y) => Math.max(max, y.tradeCount), 0);
  const topYearTradeSharePct = round3((topYearTrades / tradeCount) * 100);
  const topYearCum = yearly.reduce(
    (best, y) => (y.cumulativeReturnPct > best.cumulativeReturnPct ? y : best),
    yearly[0] ?? { period: '', tradeCount: 0, cumulativeReturnPct: 0 },
  );
  const topYearCumulativeSharePct =
    tradeCumulativeReturnPct !== 0
      ? round3((topYearCum.cumulativeReturnPct / tradeCumulativeReturnPct) * 100)
      : 0;

  const multiTradeEvents = events.filter((e) => e.tradeCount >= 2);
  const clusteredTrades = multiTradeEvents.reduce((s, e) => s + e.tradeCount, 0);
  const clusteredTradeSharePct = round3((clusteredTrades / tradeCount) * 100);

  const activeYears = yearly.filter((y) => y.tradeCount > 0).length;
  const top2YearCum = [...yearly]
    .sort((a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct)
    .slice(0, 2)
    .reduce((s, y) => s + y.cumulativeReturnPct, 0);
  const top2YearCumSharePct =
    tradeCumulativeReturnPct !== 0
      ? round3((top2YearCum / tradeCumulativeReturnPct) * 100)
      : 0;

  const eventWinRatePct =
    eventCount > 0
      ? round3((events.filter((e) => e.win).length / eventCount) * 100)
      : 0;

  if (
    eventCount >= 12 &&
    topYearTradeSharePct <= 55 &&
    topYearCumulativeSharePct <= 55 &&
    clusteredTradeSharePct <= 40
  ) {
    return {
      verdict: 'genuine_independence',
      verdictJa:
        `18件は${eventCount}独立イベントに分散（圧縮比${compressionRatio}）。` +
        `年別最大${topYearTradeSharePct}% · 連続クラスター${clusteredTrades}件（${clusteredTradeSharePct}%）。` +
        `イベントWR${eventWinRatePct}% — 特定局面依存は限定的。`,
    };
  }

  if (
    eventCount <= 8 ||
    topYearCumulativeSharePct >= 70 ||
    (activeYears <= 2 && top2YearCumSharePct >= 85 && clusteredTradeSharePct >= 50)
  ) {
    const topYearLabel = topYearCum.period;
    const clusterSummary = multiTradeEvents
      .map((e) => `${e.symbol}/${e.spyRegime}×${e.tradeCount}(${e.startDate.slice(0, 7)})`)
      .join('、');
    return {
      verdict: 'cluster_concentrated',
      verdictJa:
        `${tradeCount}件は${eventCount}イベントに圧縮（比${compressionRatio}）— 見かけ上の件数過多。` +
        `${topYearLabel}年に累積${topYearCumulativeSharePct}% · 連続${clusteredTrades}件（${clusteredTradeSharePct}%）。` +
        `主クラスター: ${clusterSummary || '—'}。2020/2022型の特定相場局面依存。`,
    };
  }

  return {
    verdict: 'mixed',
    verdictJa:
      `混合: ${tradeCount}件→${eventCount}イベント（圧縮比${compressionRatio}）。` +
      `年別最大${topYearTradeSharePct}% · 累積寄与${topYearCumulativeSharePct}%（${topYearCum.period}年）。` +
      `連続クラスター${clusteredTrades}件 · イベントWR${eventWinRatePct}%。`,
  };
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}

function formatPeriodTable(rows: ForwardAdx20IndependencePeriodRow[], label: string): string[] {
  const cols = [
    { w: 8, h: label },
    { w: 5, h: '件数' },
    { w: 8, h: '累積%' },
  ];
  const line = (cells: string[]) => cols.map((c, i) => pad(cells[i] ?? '', c.w)).join(' ');
  return [
    line(cols.map((c) => c.h)),
    cols.map((c) => '-'.repeat(c.w)).join(' '),
    ...rows.map((r) => line([r.period, String(r.tradeCount), String(r.cumulativeReturnPct)])),
  ];
}

export function auditAdx20Independence(input: {
  bundle: ForwardOhlcvBundle;
  fromDate?: string;
  maxGapDays?: number;
}): ForwardAdx20IndependenceAuditReport {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;
  const maxGapDays = input.maxGapDays ?? EVENT_MAX_GAP_CALENDAR_DAYS;
  const trades = collectAdx20OnlyFullTrades(input.bundle, fromDate, toDate);

  const yearly = buildPeriodBreakdown(trades, 'year');
  const monthly = buildPeriodBreakdown(trades, 'month');
  const events = clusterIndependenceEvents(trades, maxGapDays);
  const consecutiveStreaks = buildConsecutiveStreaks(events);

  const tradeReturns = trades.map((t) => t.returnPct);
  const tradeCumulativeReturnPct = round3(tradeReturns.reduce((s, r) => s + r, 0));
  const tradeWinRatePct =
    trades.length > 0
      ? round3((trades.filter((t) => t.returnPct > 0).length / trades.length) * 100)
      : 0;

  const eventCumulativeReturnPct = round3(
    events.reduce((s, e) => s + e.cumulativeReturnPct, 0),
  );
  const eventWinRatePct =
    events.length > 0
      ? round3((events.filter((e) => e.win).length / events.length) * 100)
      : 0;

  const topYearTrades = yearly.reduce((max, y) => Math.max(max, y.tradeCount), 0);
  const topYearTradeSharePct =
    trades.length > 0 ? round3((topYearTrades / trades.length) * 100) : 0;
  const topYearCum = yearly.reduce(
    (best, y) => (y.cumulativeReturnPct > best.cumulativeReturnPct ? y : best),
    yearly[0] ?? { period: '', tradeCount: 0, cumulativeReturnPct: 0 },
  );
  const topYearCumulativeSharePct =
    tradeCumulativeReturnPct !== 0
      ? round3((topYearCum.cumulativeReturnPct / tradeCumulativeReturnPct) * 100)
      : 0;

  const { verdict, verdictJa } = evaluateAdx20Independence({
    tradeCount: trades.length,
    events,
    yearly,
    tradeCumulativeReturnPct,
  });

  const verdictLabel: Record<ForwardAdx20IndependenceVerdict, string> = {
    genuine_independence: '独立稼ぎ',
    cluster_concentrated: '局面集中',
    mixed: '混合',
  };

  const humanLines = [
    `【最重要監査その20】ADX20追加18件 独立性検証 ${fromDate} ～ ${toDate}`,
    `固定条件: ${FIXED_CONDITIONS_JA}`,
    `対象: 監査18 ADX20のみ実行 ${trades.length}件 · イベント集約ギャップ≤${maxGapDays}日（同一ETF·同一SPY局面）`,
    '監査のみ · ルール変更なし',
    '',
    `■ サマリー: ${trades.length}件 → ${events.length}イベント（圧縮比${round3(trades.length / Math.max(events.length, 1))}）`,
    `トレード WR${tradeWinRatePct}% 累積${tradeCumulativeReturnPct}% / イベント WR${eventWinRatePct}% 累積${eventCumulativeReturnPct}%`,
    '',
    '■ 年別集中度',
    ...formatPeriodTable(yearly, '年'),
    '',
    '■ 月別集中度',
    ...formatPeriodTable(monthly, '月'),
    '',
    '■ 連続シグナル（同一ETF·同一局面·2件以上）',
    ...(consecutiveStreaks.length > 0
      ? consecutiveStreaks.map(
          (s) =>
            `${s.symbol} · ${s.spyRegime} · ${s.streakLength}件 · ${s.startDate}～${s.endDate} · 累積${s.cumulativeReturnPct}% · [${s.signalDates.join(', ')}]`,
        )
      : ['（該当なし）']),
    '',
    '■ 独立イベント一覧',
    ...events.map(
      (e) =>
        `#${e.eventId} ${e.symbol}/${e.spyRegime} · ${e.tradeCount}件 · ${e.startDate}～${e.endDate} · 累積${e.cumulativeReturnPct}% · ${e.win ? '勝' : '敗'}`,
    ),
    '',
    `■ 判定: 【${verdictLabel[verdict]}】`,
    verdictJa,
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    eventMaxGapCalendarDays: maxGapDays,
    targetTradeCount: trades.length,
    independentEventCount: events.length,
    compressionRatio: round3(trades.length / Math.max(events.length, 1)),
    tradeWinRatePct,
    tradeCumulativeReturnPct,
    eventWinRatePct,
    eventCumulativeReturnPct,
    topYearTradeSharePct,
    topYearCumulativeSharePct,
    yearly,
    monthly,
    consecutiveStreaks,
    events,
    verdict,
    verdictJa,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export async function runAdx20IndependenceAudit(): Promise<ForwardAdx20IndependenceAuditReport | null> {
  const bundle = await fetchForwardOhlcvBundle(EXTENDED_AUDIT_START);
  if (!bundle) return null;
  return auditAdx20Independence({ bundle });
}

export function formatAdx20IndependenceCsv(
  report: ForwardAdx20IndependenceAuditReport,
): string {
  const yearRows = report.yearly.map((y) =>
    ['year', y.period, y.tradeCount, y.cumulativeReturnPct].join(','),
  );
  const monthRows = report.monthly.map((m) =>
    ['month', m.period, m.tradeCount, m.cumulativeReturnPct].join(','),
  );
  const streakRows = report.consecutiveStreaks.map((s) =>
    [
      s.symbol,
      s.spyRegime,
      s.streakLength,
      s.startDate,
      s.endDate,
      s.cumulativeReturnPct,
      s.signalDates.join('|'),
    ].join(','),
  );
  const eventRows = report.events.map((e) =>
    [
      e.eventId,
      e.symbol,
      e.spyRegime,
      e.tradeCount,
      e.startDate,
      e.endDate,
      e.cumulativeReturnPct,
      e.win ? 1 : 0,
      e.signalDates.join('|'),
    ].join(','),
  );

  return [
    'granularity,period,tradeCount,cumulativeReturnPct',
    ...yearRows,
    ...monthRows,
    '',
    'symbol,spyRegime,streakLength,startDate,endDate,cumulativeReturnPct,signalDates',
    ...streakRows,
    '',
    'eventId,symbol,spyRegime,tradeCount,startDate,endDate,cumulativeReturnPct,win,signalDates',
    ...eventRows,
    '',
    `tradeCount,${report.targetTradeCount}`,
    `eventCount,${report.independentEventCount}`,
    `compressionRatio,${report.compressionRatio}`,
    `tradeWinRatePct,${report.tradeWinRatePct}`,
    `eventWinRatePct,${report.eventWinRatePct}`,
    `tradeCumulativeReturnPct,${report.tradeCumulativeReturnPct}`,
    `eventCumulativeReturnPct,${report.eventCumulativeReturnPct}`,
    `verdict,${report.verdict}`,
  ].join('\n');
}
