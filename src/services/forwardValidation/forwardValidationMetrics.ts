import {
  FORWARD_BACKTEST_BASELINE,
  FORWARD_INITIAL_CAPITAL_USD,
  FORWARD_REPORT_MILESTONES,
  FORWARD_REPORT_MIN_TRADES,
  FORWARD_SYMBOL_WEIGHTS,
  type ForwardEtfSymbol,
} from '../../constants/forwardValidation';
import type {
  ForwardBaselineComparison,
  ForwardClosedTrade,
  ForwardDailyReturn,
  ForwardOpenPosition,
  ForwardPerformanceMetrics,
  ForwardValidationPersisted,
  ForwardValidationReport,
} from '../../types/forwardValidation';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number {
  return vals.length === 0 ? 0 : vals.reduce((a, b) => a + b, 0) / vals.length;
}

function std(vals: number[]): number {
  const m = mean(vals);
  return Math.sqrt(vals.reduce((a, x) => a + (x - m) ** 2, 0) / vals.length);
}

export function computeWeightedDailyReturn(
  trades: Array<{ returnPct: number; weight: number }>,
): number {
  if (trades.length === 0) return 0;
  const sumW = trades.reduce((a, t) => a + t.weight, 0);
  if (sumW <= 0) return round3(mean(trades.map((t) => t.returnPct)));
  return round3(trades.reduce((acc, t) => acc + (t.weight / sumW) * t.returnPct, 0));
}

export function recomputeEquityFromDailyReturns(
  dailyReturns: ForwardDailyReturn[],
  initialCapitalUsd = FORWARD_INITIAL_CAPITAL_USD,
): { equityUsd: number; peakEquityUsd: number } {
  let equity = initialCapitalUsd;
  let peak = initialCapitalUsd;
  for (const d of [...dailyReturns].sort((a, b) => a.date.localeCompare(b.date))) {
    equity += (initialCapitalUsd * d.returnPct) / 100;
    if (equity > peak) peak = equity;
  }
  return { equityUsd: round2(equity), peakEquityUsd: round2(peak) };
}

export function computeForwardMetrics(
  state: Pick<
    ForwardValidationPersisted,
    'closedTrades' | 'openPositions' | 'dailyReturns' | 'equityUsd' | 'initialCapitalUsd'
  >,
): ForwardPerformanceMetrics {
  const { closedTrades, openPositions, dailyReturns, initialCapitalUsd } = state;
  const returns = dailyReturns.map((d) => d.returnPct);

  if (returns.length === 0) {
    return {
      tradeCount: closedTrades.length + openPositions.length,
      closedTradeCount: closedTrades.length,
      openPositionCount: openPositions.length,
      sharpe: null,
      maxDrawdownPct: null,
      profitFactor: null,
      winRate: null,
      totalReturnPct: null,
      equityUsd: initialCapitalUsd,
    };
  }

  const drWins = returns.filter((r) => r > 0);
  const drLosses = returns.filter((r) => r < 0);
  const tradeWins = closedTrades.filter((t) => t.returnPct > 0);
  const mu = mean(returns);
  const sigma = std(returns);

  let equity = initialCapitalUsd;
  let peak = initialCapitalUsd;
  let maxDd = 0;
  for (const r of returns) {
    equity += (initialCapitalUsd * r) / 100;
    if (equity > peak) peak = equity;
    maxDd = Math.min(maxDd, equity / peak - 1);
  }

  return {
    tradeCount: closedTrades.length + openPositions.length,
    closedTradeCount: closedTrades.length,
    openPositionCount: openPositions.length,
    sharpe: sigma > 1e-9 ? round3(mu / sigma) : null,
    maxDrawdownPct: round2(maxDd * 100),
    profitFactor:
      drLosses.length > 0
        ? round3(drWins.reduce((a, b) => a + b, 0) / Math.abs(drLosses.reduce((a, b) => a + b, 0)))
        : null,
    winRate: closedTrades.length > 0 ? round3(tradeWins.length / closedTrades.length) : null,
    totalReturnPct: round2(((equity / initialCapitalUsd - 1) * 100)),
    equityUsd: round2(equity),
  };
}

export function compareWithBacktestBaseline(
  forward: ForwardPerformanceMetrics,
): ForwardBaselineComparison {
  const bt = FORWARD_BACKTEST_BASELINE;
  const delta = {
    sharpe: forward.sharpe != null ? round3(forward.sharpe - bt.sharpe) : null,
    maxDrawdownPct:
      forward.maxDrawdownPct != null ? round2(forward.maxDrawdownPct - bt.maxDrawdownPct) : null,
    profitFactor:
      forward.profitFactor != null ? round3(forward.profitFactor - bt.profitFactor) : null,
    winRate: forward.winRate != null ? round3(forward.winRate - bt.winRate) : null,
    totalReturnPct:
      forward.totalReturnPct != null ? round2(forward.totalReturnPct - bt.totalReturnPct) : null,
  };
  return {
    backtest: {
      sharpe: bt.sharpe,
      maxDrawdownPct: bt.maxDrawdownPct,
      profitFactor: bt.profitFactor,
      winRate: bt.winRate,
      totalReturnPct: bt.totalReturnPct,
    },
    forward,
    delta,
  };
}

export function buildForwardValidationReport(
  state: ForwardValidationPersisted,
  triggerTradeCount: number = FORWARD_REPORT_MIN_TRADES,
): ForwardValidationReport {
  const metrics = computeForwardMetrics(state);
  const baselineComparison = compareWithBacktestBaseline(metrics);
  const d = baselineComparison.delta;
  const sharpeTxt =
    d.sharpe != null ? `${d.sharpe >= 0 ? '+' : ''}${d.sharpe}` : '—';
  const ddTxt =
    d.maxDrawdownPct != null ? `${d.maxDrawdownPct >= 0 ? '+' : ''}${d.maxDrawdownPct}%` : '—';
  const summaryJa = [
    `${triggerTradeCount}トレード到達 — 4ETF前向き検証レポート`,
    `確定トレード ${metrics.closedTradeCount}件 · オープン ${metrics.openPositionCount}件`,
    `Sharpe ${metrics.sharpe ?? '—'} (BT ${FORWARD_BACKTEST_BASELINE.sharpe}, Δ ${sharpeTxt})`,
    `MaxDD ${metrics.maxDrawdownPct ?? '—'}% (BT ${FORWARD_BACKTEST_BASELINE.maxDrawdownPct}%, Δ ${ddTxt})`,
    `PF ${metrics.profitFactor ?? '—'} · 勝率 ${metrics.winRate != null ? round2(metrics.winRate * 100) : '—'}%`,
    `累積リターン ${metrics.totalReturnPct ?? '—'}% · 仮想資産 $${metrics.equityUsd.toLocaleString('en-US')}`,
  ].join('\n');

  return {
    generatedAt: new Date().toISOString(),
    triggerTradeCount,
    metrics,
    baselineComparison,
    summaryJa,
  };
}

export function maybeGenerateReports(state: ForwardValidationPersisted): ForwardValidationPersisted {
  const existing = [...(state.reports ?? [])];
  let changed = false;

  for (const milestone of FORWARD_REPORT_MILESTONES) {
    if (state.closedTrades.length < milestone) continue;
    if (existing.some((r) => r.triggerTradeCount === milestone)) continue;
    existing.push(buildForwardValidationReport(state, milestone));
    changed = true;
  }

  if (!changed) return state;

  existing.sort((a, b) => a.triggerTradeCount - b.triggerTradeCount);
  const latest = existing[existing.length - 1] ?? null;
  return {
    ...state,
    reports: existing,
    report: latest,
    reportGeneratedAt: latest?.generatedAt ?? state.reportGeneratedAt,
  };
}

/** @deprecated use maybeGenerateReports */
export function maybeGenerateReport(state: ForwardValidationPersisted): ForwardValidationPersisted {
  return maybeGenerateReports(state);
}

export function upsertDailyReturn(
  dailyReturns: ForwardDailyReturn[],
  signalDate: string,
  returnPct: number,
  tradeIds: string[],
): ForwardDailyReturn[] {
  const next = dailyReturns.filter((d) => d.date !== signalDate);
  next.push({ date: signalDate, returnPct, tradeIds });
  next.sort((a, b) => a.date.localeCompare(b.date));
  return next;
}

export function tradesForSignalDate(
  signalDate: string,
  closedTrades: ForwardClosedTrade[],
  openPositions: ForwardOpenPosition[],
): Array<{ returnPct: number; weight: number; id: string }> {
  const closed = closedTrades
    .filter((t) => t.signalDate === signalDate)
    .map((t) => ({ returnPct: t.returnPct, weight: t.weight, id: t.id }));
  const open = openPositions
    .filter((p) => p.signalDate === signalDate)
    .map((p) => ({ returnPct: 0, weight: p.weight, id: p.id }));
  return [...closed, ...open];
}

export function refreshDailyReturnForSignalDate(
  state: ForwardValidationPersisted,
  signalDate: string,
): ForwardValidationPersisted {
  const openForDay = state.openPositions.filter((p) => p.signalDate === signalDate);
  if (openForDay.length > 0) return state;

  const closedForDay = state.closedTrades.filter((t) => t.signalDate === signalDate);
  if (closedForDay.length === 0) return state;

  const returnPct = computeWeightedDailyReturn(
    closedForDay.map((t) => ({ returnPct: t.returnPct, weight: t.weight })),
  );
  const dailyReturns = upsertDailyReturn(
    state.dailyReturns,
    signalDate,
    returnPct,
    closedForDay.map((t) => t.id),
  );
  const { equityUsd, peakEquityUsd } = recomputeEquityFromDailyReturns(
    dailyReturns,
    state.initialCapitalUsd,
  );
  return { ...state, dailyReturns, equityUsd, peakEquityUsd };
}

export function normalizeSymbolWeights(symbols: ForwardEtfSymbol[]): Map<ForwardEtfSymbol, number> {
  const raw = symbols.map((s) => FORWARD_SYMBOL_WEIGHTS[s]);
  const sum = raw.reduce((a, b) => a + b, 0);
  const out = new Map<ForwardEtfSymbol, number>();
  symbols.forEach((s, i) => {
    out.set(s, sum > 0 ? raw[i]! / sum : 1 / symbols.length);
  });
  return out;
}
