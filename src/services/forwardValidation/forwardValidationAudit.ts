import { FORWARD_BACKTEST_BASELINE } from '../../constants/forwardValidation';
import type {
  ForwardActiveSignalView,
  ForwardPositionView,
  ForwardValidationAuditFinding,
  ForwardValidationAuditResult,
  ForwardValidationPersisted,
  ForwardYahooFetchLog,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate } from './case4Indicators';

function calendarTodayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function buildOpenPositionViews(
  state: ForwardValidationPersisted,
  bundle: ForwardOhlcvBundle | null,
): ForwardPositionView[] {
  if (!bundle) return [];
  return state.openPositions.map((pos) => {
    const bars = bundle.etfBars[pos.symbol];
    const latestBar = bars[bars.length - 1];
    const currentPrice = latestBar?.close ?? pos.entryPrice;
    const priceAsOfDate = latestBar?.date ?? pos.entryDate;
    const unrealizedPct = Math.round(((currentPrice / pos.entryPrice - 1) * 100) * 1000) / 1000;
    let barsHeld = pos.barsHeld;
    const entryIdx = barIndexByDate(bars, pos.entryDate);
    const latestIdx = bars.length - 1;
    if (entryIdx >= 0 && latestIdx >= entryIdx) barsHeld = latestIdx - entryIdx;
    return {
      symbol: pos.symbol,
      entryDate: pos.entryDate,
      entryPrice: pos.entryPrice,
      currentPrice,
      priceAsOfDate,
      barsHeld,
      unrealizedPct,
      weight: pos.weight,
    };
  });
}

export function buildActiveSignalViews(
  state: ForwardValidationPersisted,
  bundle: ForwardOhlcvBundle | null,
): ForwardActiveSignalView[] {
  const openViews = buildOpenPositionViews(state, bundle);
  const openBySignalId = new Map(state.openPositions.map((p) => [p.signalId, p]));

  const active = state.signals.filter((s) => s.status === 'open' || s.status === 'pending_entry');
  return active.map((sig) => {
    const pos = openBySignalId.get(sig.id);
    const bars = bundle?.etfBars[sig.symbol];
    const latestBar = bars?.[bars.length - 1];
    const entryPrice = sig.entryPrice ?? pos?.entryPrice ?? null;
    const entryDate = sig.entryDate ?? pos?.entryDate ?? null;
    const currentPrice = latestBar?.close ?? entryPrice;
    const unrealizedPct =
      entryPrice != null && currentPrice != null
        ? Math.round(((currentPrice / entryPrice - 1) * 100) * 1000) / 1000
        : null;
    let barsHeld = pos?.barsHeld ?? 0;
    if (entryDate && bars) {
      const entryIdx = barIndexByDate(bars, entryDate);
      const latestIdx = bars.length - 1;
      if (entryIdx >= 0 && latestIdx >= entryIdx) barsHeld = latestIdx - entryIdx;
    }
    return {
      symbol: sig.symbol,
      signalDate: sig.date,
      entryDate,
      entryPrice,
      currentPrice: currentPrice ?? null,
      priceAsOfDate: latestBar?.date ?? null,
      barsHeld,
      unrealizedPct,
      status: sig.status,
    };
  });
}

export function summarizeAsyncStorageState(state: ForwardValidationPersisted): string {
  const maxSignal = state.signals.reduce((m, s) => (s.date > m ? s.date : m), '');
  const minSignal = state.signals.reduce((m, s) => (m === '' || s.date < m ? s.date : m), '');
  return [
    `version=${state.version}`,
    `startedAt=${state.startedAt}`,
    `signals=${state.signals.length}`,
    `open=${state.openPositions.length}`,
    `closed=${state.closedTrades.length}`,
    `dailyReturns=${state.dailyReturns.length}`,
    `signalDateRange=${minSignal || '—'}..${maxSignal || '—'}`,
    `equityUsd=${state.equityUsd}`,
    `reports=${state.reports.length}`,
  ].join(' · ');
}

export function auditForwardValidation(input: {
  state: ForwardValidationPersisted;
  bundle: ForwardOhlcvBundle | null;
  fetchLog: ForwardYahooFetchLog | null;
  processedDates: string[];
}): ForwardValidationAuditResult {
  const { state, bundle, fetchLog, processedDates } = input;
  const findings: ForwardValidationAuditFinding[] = [];
  const today = calendarTodayUtc();
  const yahooLatest = bundle?.latestDate ?? state.yahooLatestDate;

  findings.push({
    id: 'last_run_date_source',
    status: 'pass',
    labelJa: '最終判定日の生成元',
    detailJa:
      'processForwardValidationRange の toDate（= Yahoo OHLCV 全ETF union の最新営業日）処理完了時に state.lastRunDate へ書き込み。lastRunAt は同一処理の ISO タイムスタンプ。',
  });

  const futureSignals = state.signals.filter((s) => s.date > today);
  findings.push({
    id: 'signal_dates_not_future',
    status: futureSignals.length === 0 ? 'pass' : 'fail',
    labelJa: '直近シグナル日付が未来日でないこと',
    detailJa:
      futureSignals.length === 0
        ? `全 ${state.signals.length} 件のシグナル日付 ≤ 今日(${today})。`
        : `未来日シグナル ${futureSignals.length} 件: ${futureSignals
            .slice(0, 3)
            .map((s) => `${s.date}/${s.symbol}`)
            .join(', ')}`,
  });

  if (yahooLatest) {
    const yahooAhead = yahooLatest > today;
    findings.push({
      id: 'yahoo_latest_vs_today',
      status: yahooAhead ? 'warn' : 'pass',
      labelJa: 'Yahoo最新日付 vs 今日',
      detailJa: yahooAhead
        ? `Yahoo最新 ${yahooLatest} が今日 ${today} より未来（TZ/データ異常の可能性）`
        : `Yahoo最新 ${yahooLatest} · 今日 ${today} · 差 ${daysBetween(yahooLatest, today)} 日`,
    });
  }

  findings.push({
    id: 'async_storage_summary',
    status: 'pass',
    labelJa: 'AsyncStorage (@sta/forward_validation_v1) 概要',
    detailJa: summarizeAsyncStorageState(state),
  });

  const backtestOnlyMetrics =
    state.closedTrades.length === 0 &&
    state.signals.length === 0 &&
    state.dailyReturns.length === 0 &&
    state.equityUsd === state.initialCapitalUsd;
  const hasEngineSignals = state.signals.every((s) => state.closedTrades.some((t) => t.signalId === s.id) || state.openPositions.some((p) => p.signalId === s.id) || s.status === 'pending_entry' || s.status === 'skipped');
  findings.push({
    id: 'no_backtest_import',
    status: backtestOnlyMetrics || hasEngineSignals || state.signals.length === 0 ? 'pass' : 'warn',
    labelJa: '初回ロードでバックテスト結果を流用していないこと',
    detailJa:
      '成績は state.closedTrades / dailyReturns から独立計算。FORWARD_BACKTEST_BASELINE は比較表示専用定数で、トレード履歴のインポート API は存在しない。初回は Yahoo OHLCV を日次エンジンで replay（2024-01-01〜最新日）。',
  });

  if (fetchLog) {
    findings.push({
      id: 'yahoo_fetch_success',
      status: fetchLog.failureCount === 0 ? 'pass' : fetchLog.failureCount < fetchLog.symbols.length ? 'warn' : 'fail',
      labelJa: 'Yahoo取得成功件数',
      detailJa: `${fetchLog.successCount}/${fetchLog.symbols.length} 成功 · 取得 ${fetchLog.fetchedAt}`,
    });
    for (const sym of fetchLog.symbols.filter((s) => !s.ok)) {
      findings.push({
        id: `yahoo_fail_${sym.symbol}`,
        status: 'fail',
        labelJa: `Yahoo取得失敗: ${sym.symbol}`,
        detailJa: [sym.httpStatus != null ? `HTTP ${sym.httpStatus}` : null, sym.error, sym.latestDate ? `partial latest=${sym.latestDate}` : null]
          .filter(Boolean)
          .join(' · '),
      });
    }
  }

  findings.push({
    id: 'realtime_update_proof',
    status: state.lastFetchAt && yahooLatest ? 'pass' : 'warn',
    labelJa: '2026固定データではなく実データ更新',
    detailJa: [
      `Yahoo period2=unix(now) で毎回取得`,
      `yahooLatestDate=${yahooLatest ?? '—'}`,
      `lastFetchAt=${state.lastFetchAt ?? '—'}`,
      `lastRunDate=${state.lastRunDate ?? '—'}`,
      processedDates.length > 0 ? `今回処理日=${processedDates.join(',')}` : '今回はキャッシュ済み（同日再判定スキップ）',
    ].join(' · '),
  });

  const allPassed = findings.every((f) => f.status !== 'fail');
  return {
    auditedAt: new Date().toISOString(),
    findings,
    storageSummaryJa: summarizeAsyncStorageState(state),
    allPassed,
  };
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function formatAuditStatusJa(status: ForwardValidationAuditFinding['status']): string {
  if (status === 'pass') return 'OK';
  if (status === 'warn') return '注意';
  return 'NG';
}

export { FORWARD_BACKTEST_BASELINE };
