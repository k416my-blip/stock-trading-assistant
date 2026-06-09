import { FORWARD_INITIAL_CAPITAL_USD } from '../../constants/forwardValidation';
import type {
  ForwardActiveSignalView,
  ForwardOperationalSnapshot,
  ForwardValidationPersisted,
  ForwardYahooFetchLog,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { buildActiveSignalViews } from './forwardValidationAudit';
import { computeForwardMetrics } from './forwardValidationMetrics';

/** US 終値確定後の日次バー反映目安（UTC 22:00） */
const JUDGMENT_UTC_HOUR = 22;

function nextTradingDate(dates: string[], current: string): string | null {
  const idx = dates.indexOf(current);
  if (idx < 0 || idx >= dates.length - 1) return null;
  return dates[idx + 1] ?? null;
}

export function buildEquityCurve(
  state: Pick<ForwardValidationPersisted, 'dailyReturns' | 'initialCapitalUsd'>,
): Array<{ date: string; equityUsd: number }> {
  const initial = state.initialCapitalUsd;
  const sorted = [...state.dailyReturns].sort((a, b) => a.date.localeCompare(b.date));
  const out: Array<{ date: string; equityUsd: number }> = [];
  let equity = initial;
  if (sorted.length === 0) {
    return [{ date: new Date().toISOString().slice(0, 10), equityUsd: initial }];
  }
  out.push({ date: sorted[0]!.date, equityUsd: initial });
  for (const d of sorted) {
    equity += (initial * d.returnPct) / 100;
    out.push({ date: d.date, equityUsd: Math.round(equity * 100) / 100 });
  }
  return out;
}

export function estimateNextJudgmentAt(
  lastRunDate: string | null,
  tradingDates: string[],
  yahooLatestDate: string | null,
): { at: string | null; noteJa: string } {
  if (!lastRunDate || tradingDates.length === 0) {
    return { at: null, noteJa: '初回判定は画面表示時に自動実行されます' };
  }

  if (yahooLatestDate && lastRunDate < yahooLatestDate) {
    return {
      at: new Date().toISOString(),
      noteJa: '未処理の営業日あり — 画面表示時に即時判定されます',
    };
  }

  const nextDay = nextTradingDate(tradingDates, lastRunDate);
  if (!nextDay) {
    return { at: null, noteJa: '次営業日データ待ち（Yahoo更新後に自動判定）' };
  }

  const at = `${nextDay}T${String(JUDGMENT_UTC_HOUR).padStart(2, '0')}:00:00.000Z`;
  return {
    at,
    noteJa: `次営業日 ${nextDay} の日次バー反映後（目安 UTC ${JUDGMENT_UTC_HOUR}:00）`,
  };
}

export function buildJudgmentDayStats(
  state: ForwardValidationPersisted,
  judgmentDate: string | null,
): { newSignalCount: number; closeCount: number; holdingCount: number } {
  if (!judgmentDate) {
    return { newSignalCount: 0, closeCount: 0, holdingCount: state.openPositions.length };
  }
  return {
    newSignalCount: state.signals.filter((s) => s.date === judgmentDate).length,
    closeCount: state.closedTrades.filter((t) => t.exitDate === judgmentDate).length,
    holdingCount: state.openPositions.length,
  };
}

export function buildOperationalSnapshot(input: {
  state: ForwardValidationPersisted;
  bundle: ForwardOhlcvBundle | null;
  fetchLog: ForwardYahooFetchLog | null;
}): ForwardOperationalSnapshot {
  const { state, bundle, fetchLog } = input;
  const metrics = computeForwardMetrics(state);
  const judgmentDate = state.lastRunDate;
  const tradingDates = bundle?.tradingDates ?? [];
  const yahooLatest = state.yahooLatestDate ?? bundle?.latestDate ?? null;
  const next = estimateNextJudgmentAt(judgmentDate, tradingDates, yahooLatest);
  const dayStats = buildJudgmentDayStats(state, judgmentDate);
  const activeSignals = buildActiveSignalViews(state, bundle);
  const equityCurve = buildEquityCurve(state);

  const log = fetchLog ?? state.yahooFetchLog;
  const yahooTotalCount = log?.symbols.length ?? 0;
  const yahooSuccessCount = log?.successCount ?? 0;
  const yahooFailureCount = log?.failureCount ?? 0;

  return {
    activeSignals,
    nextJudgmentAt: next.at,
    nextJudgmentNoteJa: next.noteJa,
    yahooSuccessCount,
    yahooFailureCount,
    yahooTotalCount,
    judgmentDate,
    newSignalCount: dayStats.newSignalCount,
    closeCount: dayStats.closeCount,
    holdingCount: dayStats.holdingCount,
    equityStartUsd: state.initialCapitalUsd ?? FORWARD_INITIAL_CAPITAL_USD,
    equityCurrentUsd: metrics.equityUsd,
    cumulativeReturnPct: metrics.totalReturnPct,
    equityCurve,
    isUpToDate: Boolean(judgmentDate && yahooLatest && judgmentDate >= yahooLatest),
  };
}

export function activeSignalsForDisplay(
  signals: ForwardActiveSignalView[],
): ForwardActiveSignalView[] {
  return [...signals].sort((a, b) => {
    const da = a.entryDate ?? a.signalDate;
    const db = b.entryDate ?? b.signalDate;
    return db.localeCompare(da);
  });
}
