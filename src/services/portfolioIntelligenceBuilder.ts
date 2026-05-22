/**
 * Portfolio Intelligence & Learning Layer — ローカル集計のみ（意思決定補助）
 */
import type { AiAnalysisMode } from '../constants/aiDataDriven';
import {
  PREDICTION_SHORT_HORIZON_DAYS,
  PORTFOLIO_INTEL_PRIVACY_JA,
  PORTFOLIO_INTEL_PURPOSE_JA,
  USER_STYLE_LABELS_JA,
} from '../constants/portfolioIntelligence';
import type { PortfolioIntelligenceState } from '../types/portfolioIntelligence';
import type { AppState, Market, TradeRecord } from '../types';
import type { ConciergeActionGuideBundle } from '../types/conciergeActionGuide';
import type {
  AiAccuracyScores,
  AiJournalEntry,
  ClosedPositionMemory,
  PatternInsight,
  PortfolioBiasAnalysis,
  PortfolioIntelligenceBundle,
  PortfolioMemorySnapshot,
  PredictionKind,
  TrackedPrediction,
  UserBehaviorProfile,
  UserTradingStyleId,
  WeeklyReviewSummary,
} from '../types/portfolioIntelligence';
import { SECTOR_THEME_LABEL } from '../constants/marketRegime';
import { getActivePortfolio } from './portfolioPriceUpdate';
import { analyzePortfolioConstruction } from './portfolioConstructionEngine';
import { toMYR } from './fx';
import { loadPortfolioIntelligenceState } from './portfolioIntelligenceStorage';
import { resolvePendingPredictions } from './portfolioIntelligenceRecorder';

const MS_DAY = 24 * 60 * 60 * 1000;

function allTrades(state: AppState): TradeRecord[] {
  const manual = state.trades ?? [];
  const practice = state.practice.trades ?? [];
  const byId = new Map<string, TradeRecord>();
  for (const t of [...manual, ...practice]) byId.set(t.id, t);
  return [...byId.values()].sort((a, b) => b.executedAt.localeCompare(a.executedAt));
}

function buildPortfolioMemory(trades: TradeRecord[]): PortfolioMemorySnapshot {
  const pastSymbols = [...new Set(trades.map((t) => t.symbol.toUpperCase()))];
  const buyCount = trades.filter((t) => t.side === 'buy').length;
  const sellCount = trades.filter((t) => t.side === 'sell').length;

  const bySymbol = new Map<string, TradeRecord[]>();
  for (const t of trades) {
    const key = `${t.market}:${t.symbol.toUpperCase()}`;
    const list = bySymbol.get(key) ?? [];
    list.push(t);
    bySymbol.set(key, list);
  }

  const closedPositions: ClosedPositionMemory[] = [];
  const holdDaysList: number[] = [];

  for (const [, symTrades] of bySymbol) {
    const sorted = [...symTrades].sort((a, b) => a.executedAt.localeCompare(b.executedAt));
    const first = sorted[0];
    const sells = sorted.filter((t) => t.side === 'sell');
    const lastSell = sells[sells.length - 1];
    if (!lastSell) continue;

    let sharesHeld = 0;
    let costBasis = 0;
    for (const t of sorted) {
      if (t.executedAt > lastSell.executedAt) break;
      if (t.side === 'buy') {
        costBasis += t.shares * t.price;
        sharesHeld += t.shares;
      } else {
        const avg = sharesHeld > 0 ? costBasis / sharesHeld : t.price;
        const sold = Math.min(t.shares, sharesHeld);
        costBasis -= avg * sold;
        sharesHeld -= sold;
      }
    }
    const buys = sorted.filter((t) => t.side === 'buy');
    const firstBuy = buys[0];
    const avgBuy =
      buys.length > 0
        ? buys.reduce((s, b) => s + b.price * b.shares, 0) /
          Math.max(1, buys.reduce((s, b) => s + b.shares, 0))
        : 0;

    const holdMs =
      firstBuy && lastSell
        ? Date.parse(lastSell.executedAt) - Date.parse(firstBuy.executedAt)
        : null;
    const holdDays = holdMs != null && holdMs > 0 ? holdMs / MS_DAY : null;
    if (holdDays != null) holdDaysList.push(holdDays);

    closedPositions.push({
      symbol: first.symbol,
      market: first.market,
      avgBuyPrice: avgBuy,
      lastSellPrice: lastSell.price,
      totalSharesTraded: sorted.reduce((s, t) => s + t.shares, 0),
      holdDaysEstimate: holdDays != null ? Math.round(holdDays) : null,
      realizedPnLMYR: lastSell.realizedPnLMYR ?? null,
      tookProfit: (lastSell.realizedPnLMYR ?? 0) > 0,
      stopLossLike: (lastSell.realizedPnLMYR ?? 0) < 0,
    });
  }

  const avgHoldDays =
    holdDaysList.length > 0
      ? holdDaysList.reduce((a, b) => a + b, 0) / holdDaysList.length
      : null;

  return {
    pastSymbols,
    tradeCount: trades.length,
    buyCount,
    sellCount,
    closedPositions: closedPositions.slice(0, 24),
    avgHoldDays: avgHoldDays != null ? Math.round(avgHoldDays) : null,
  };
}

function scoreBehavior(trades: TradeRecord[]): {
  averagingDownScore: number;
  panicSellScore: number;
  shortTermScore: number;
  longTermScore: number;
} {
  const bySymbol = new Map<string, TradeRecord[]>();
  for (const t of trades) {
    const k = t.symbol.toUpperCase();
    bySymbol.set(k, [...(bySymbol.get(k) ?? []), t]);
  }

  let averagingDown = 0;
  let panic = 0;
  let shortHolds = 0;
  let longHolds = 0;
  let closed = 0;

  for (const [, list] of bySymbol) {
    const buys = list.filter((t) => t.side === 'buy');
    if (buys.length >= 3) {
      const gaps = buys.slice(1).filter((b, i) => {
        const prev = buys[i];
        return !list.some(
          (t) =>
            t.side === 'sell' &&
            Date.parse(t.executedAt) > Date.parse(prev.executedAt) &&
            Date.parse(t.executedAt) < Date.parse(b.executedAt),
        );
      });
      if (gaps.length >= 2) averagingDown += 1;
    }

    const sells = list.filter((t) => t.side === 'sell');
    for (const sell of sells) {
      const buy = list
        .filter((t) => t.side === 'buy' && t.executedAt <= sell.executedAt)
        .sort((a, b) => b.executedAt.localeCompare(a.executedAt))[0];
      if (!buy) continue;
      closed += 1;
      const days = (Date.parse(sell.executedAt) - Date.parse(buy.executedAt)) / MS_DAY;
      if (days <= 3 && (sell.realizedPnLMYR ?? 0) < 0) panic += 1;
      if (days <= 14) shortHolds += 1;
      if (days >= 60) longHolds += 1;
    }
  }

  const symCount = Math.max(1, bySymbol.size);
  return {
    averagingDownScore: Math.min(100, Math.round((averagingDown / symCount) * 100)),
    panicSellScore: closed > 0 ? Math.min(100, Math.round((panic / closed) * 100)) : 0,
    shortTermScore: closed > 0 ? Math.min(100, Math.round((shortHolds / closed) * 100)) : 0,
    longTermScore: closed > 0 ? Math.min(100, Math.round((longHolds / closed) * 100)) : 0,
  };
}

function buildBehaviorProfile(trades: TradeRecord[]): UserBehaviorProfile {
  const scores = scoreBehavior(trades);
  let primary: UserTradingStyleId = 'balanced_trader';
  if (scores.panicSellScore >= 35) primary = 'panic_seller';
  else if (scores.averagingDownScore >= 40) primary = 'averaging_down';
  else if (scores.longTermScore >= 50) primary = 'long_term';
  else if (scores.shortTermScore >= 50) primary = 'short_term';

  const hints: string[] = [];
  if (scores.averagingDownScore >= 30) {
    hints.push('同一銘柄への追加買いが多い傾向 — ナンピン上限を意識');
  }
  if (scores.panicSellScore >= 25) {
    hints.push('短期の損切り売りが目立つ — ルールベースの待機を検討');
  }
  if (scores.shortTermScore >= 40) {
    hints.push('保有期間が短め — スプレッド・手数料の影響が大きい');
  }
  if (scores.longTermScore >= 40) {
    hints.push('長期保有の割合が高い — イベント前の流動性に注意');
  }
  if (hints.length === 0) {
    hints.push('取引パターンは分散 — バランス型の意思決定補助を継続');
  }

  return {
    primaryStyle: primary,
    styleLabelJa: USER_STYLE_LABELS_JA[primary],
    styleHintsJa: hints,
    panicSellScore: scores.panicSellScore,
    averagingDownScore: scores.averagingDownScore,
  };
}

function suggestAnalysisMode(
  behavior: UserBehaviorProfile,
  lossPatterns: PatternInsight[],
  current?: AiAnalysisMode,
): AiAnalysisMode {
  if (behavior.panicSellScore >= 40 || lossPatterns.length >= 2) return 'conservative';
  if (behavior.primaryStyle === 'short_term' && behavior.panicSellScore < 20) {
    return current === 'conservative' ? 'balanced' : 'aggressive';
  }
  if (behavior.primaryStyle === 'long_term') return 'conservative';
  return current ?? 'balanced';
}

function accuracyFromPredictions(predictions: TrackedPrediction[]): AiAccuracyScores {
  const resolved = predictions.filter((p) => p.outcome === 'hit' || p.outcome === 'miss');
  const pending = predictions.filter((p) => p.outcome === 'pending').length;
  const short = resolved.filter((p) => p.horizonDays <= PREDICTION_SHORT_HORIZON_DAYS);
  const medium = resolved.filter((p) => p.horizonDays > PREDICTION_SHORT_HORIZON_DAYS);
  const anomaly = resolved.filter((p) => p.kind === 'panic_warning');

  const pct = (list: TrackedPrediction[]) => {
    if (list.length === 0) return null;
    const hits = list.filter((p) => p.outcome === 'hit').length;
    return Math.round((hits / list.length) * 100);
  };

  return {
    shortTermAccuracyPct: pct(short),
    mediumTermAccuracyPct: pct(medium),
    anomalyDetectionAccuracyPct: pct(anomaly),
    evaluatedCount: resolved.length,
    pendingCount: pending,
  };
}

function buildLossPatterns(
  behavior: UserBehaviorProfile,
  memory: PortfolioMemorySnapshot,
  trades: TradeRecord[],
): PatternInsight[] {
  const out: PatternInsight[] = [];
  if (behavior.averagingDownScore >= 35) {
    out.push({
      id: 'loss-averaging',
      labelJa: 'ナンピンしすぎ',
      detailJa: '損失ポジションへの追加買いが繰り返されています。1銘柄あたりの上限ルールを検討してください。',
      confidencePct: behavior.averagingDownScore,
    });
  }
  const lossStops = memory.closedPositions.filter((p) => p.stopLossLike).length;
  if (lossStops >= 3) {
    out.push({
      id: 'loss-stop-cluster',
      labelJa: '損切り連鎖',
      detailJa: `直近の決済で損失確定が${lossStops}件。エントリー条件の見直しを推奨します。`,
      confidencePct: Math.min(90, 40 + lossStops * 8),
    });
  }
  const recentBuys = trades.filter((t) => t.side === 'buy').slice(0, 12);
  const symbolBurst = new Map<string, number>();
  for (const t of recentBuys) {
    const k = t.symbol.toUpperCase();
    symbolBurst.set(k, (symbolBurst.get(k) ?? 0) + 1);
  }
  const hypeChase = [...symbolBurst.values()].filter((c) => c >= 2).length;
  if (hypeChase >= 2) {
    out.push({
      id: 'loss-hype-chase',
      labelJa: '話題銘柄への集中買い',
      detailJa: '短期間に同じ銘柄へ複数回買いが集中しています（出来高急増への飛び乗りリスク）。',
      confidencePct: 55,
    });
  }
  return out.slice(0, 5);
}

function buildSuccessPatterns(memory: PortfolioMemorySnapshot): PatternInsight[] {
  const wins = memory.closedPositions.filter((p) => p.tookProfit);
  const out: PatternInsight[] = [];
  const longWin = wins.filter((p) => (p.holdDaysEstimate ?? 0) >= 30);
  if (longWin.length >= 1) {
    out.push({
      id: 'success-hold',
      labelJa: '長期保有の利確',
      detailJa: `${longWin.length}件が30日超の保有後に利益確定。イベント跨ぎの忍耐が機能したケースです。`,
      confidencePct: 60,
    });
  }
  const quickWin = wins.filter((p) => (p.holdDaysEstimate ?? 999) <= 14);
  if (quickWin.length >= 2) {
    out.push({
      id: 'success-short',
      labelJa: '短期の逆張り・利確',
      detailJa: '2週間以内の利確が複数 — 短期の値動き捉えが成功している可能性。',
      confidencePct: 50,
    });
  }
  if (wins.length >= 3) {
    out.push({
      id: 'success-win-rate',
      labelJa: '決済の勝ちパターン',
      detailJa: `利益確定${wins.length}件 — エントリー根拠のメモを残すと再現性が上がります。`,
      confidencePct: 45,
    });
  }
  return out.slice(0, 4);
}

function buildPortfolioBias(state: AppState): PortfolioBiasAnalysis {
  const portfolio = getActivePortfolio(state);
  let totalMYR = 0;
  for (const p of portfolio) {
    totalMYR += toMYR(p.shares * (p.currentPrice || p.averageBuyPrice), p.currency);
  }
  if (portfolio.length === 0 || totalMYR <= 0) {
    return {
      sectorBiasJa: ['保有なし'],
      currencyBiasJa: [],
      volatilityBiasJa: [],
      regionBiasJa: [],
      concentrationScore: 0,
    };
  }
  const report = analyzePortfolioConstruction({
    portfolio,
    totalPortfolioValueMYR: totalMYR,
  });
  const sectorBiasJa = report.sectorExposures
    .filter((s) => s.weightPct >= 8)
    .map((s) => `${SECTOR_THEME_LABEL[s.sector]} ${s.weightPct.toFixed(0)}%`);
  const currencyCount = { MYR: 0, USD: 0, HKD: 0 };
  for (const p of portfolio) {
    currencyCount[p.currency] = (currencyCount[p.currency] ?? 0) + 1;
  }
  const currencyBiasJa = Object.entries(currencyCount)
    .filter(([, c]) => c > 0)
    .map(([c, n]) => `${c}: ${n}銘柄`);
  const regionBiasJa = [
    ...new Set(portfolio.map((p) => (p.market === 'us' ? '米国' : p.market === 'hk' ? '香港' : 'マレーシア'))),
  ].map((r) => `${r} ${portfolio.filter((p) => (p.market === 'us' ? '米国' : p.market === 'hk' ? '香港' : 'マレーシア') === r).length}銘柄`);
  const highVol = report.positions.filter((p) => p.betaProxy >= 1.3);
  const volatilityBiasJa =
    highVol.length > 0
      ? highVol.map((p) => `${p.symbol} β≈${p.betaProxy.toFixed(1)}`)
      : ['高ベータ銘柄は限定的'];

  return {
    sectorBiasJa: sectorBiasJa.length ? sectorBiasJa : ['セクター分散は概ね均等'],
    currencyBiasJa,
    volatilityBiasJa,
    regionBiasJa,
    concentrationScore: Math.min(100, Math.round(report.herfindahlIndex * 100)),
  };
}

function buildWeeklyReview(
  trades: TradeRecord[],
  predictions: TrackedPrediction[],
  performanceHistory: AppState['performanceHistory'],
): WeeklyReviewSummary | null {
  const now = Date.now();
  const weekStart = now - 7 * MS_DAY;
  const weekTrades = trades.filter((t) => Date.parse(t.executedAt) >= weekStart);
  if (weekTrades.length === 0 && predictions.length === 0) return null;

  const sells = weekTrades.filter((t) => t.side === 'sell');
  const wins = sells.filter((t) => (t.realizedPnLMYR ?? 0) > 0).length;
  const winRatePct = sells.length > 0 ? Math.round((wins / sells.length) * 100) : null;

  const weekPerf = performanceHistory.filter((p) => Date.parse(p.date) >= weekStart);
  let maxDrawdownPct: number | null = null;
  if (weekPerf.length >= 2) {
    let peak = weekPerf[0].portfolioValueMYR;
    let maxDd = 0;
    for (const pt of weekPerf) {
      peak = Math.max(peak, pt.portfolioValueMYR);
      if (peak > 0) {
        const dd = ((peak - pt.portfolioValueMYR) / peak) * 100;
        maxDd = Math.max(maxDd, dd);
      }
    }
    maxDrawdownPct = Math.round(maxDd * 10) / 10;
  }

  let bestTradeJa: string | null = null;
  let worstTradeJa: string | null = null;
  let bestPnL = -Infinity;
  let worstPnL = Infinity;
  for (const s of sells) {
    const pnl = s.realizedPnLMYR ?? 0;
    if (pnl > bestPnL) {
      bestPnL = pnl;
      bestTradeJa = `${s.symbol} +${pnl.toFixed(0)} MYR`;
    }
    if (pnl < worstPnL) {
      worstPnL = pnl;
      worstTradeJa = `${s.symbol} ${pnl.toFixed(0)} MYR`;
    }
  }

  const weekResolved = predictions.filter(
    (p) =>
      p.resolvedAt &&
      Date.parse(p.resolvedAt) >= weekStart &&
      (p.outcome === 'hit' || p.outcome === 'miss'),
  );
  const aiPredictionAccuracyPct =
    weekResolved.length > 0
      ? Math.round(
          (weekResolved.filter((p) => p.outcome === 'hit').length / weekResolved.length) * 100,
        )
      : null;

  const bullets: string[] = [];
  if (winRatePct != null) bullets.push(`週間勝率（売却ベース）: ${winRatePct}%`);
  if (maxDrawdownPct != null) bullets.push(`最大ドローダウン: ${maxDrawdownPct}%`);
  if (aiPredictionAccuracyPct != null) {
    bullets.push(`AI予測検証: ${aiPredictionAccuracyPct}%（${weekResolved.length}件）`);
  }
  bullets.push(`週間取引: ${weekTrades.length}件`);

  return {
    weekLabelJa: '直近7日',
    winRatePct,
    maxDrawdownPct,
    bestTradeJa,
    worstTradeJa,
    aiPredictionAccuracyPct,
    tradeCount: weekTrades.length,
    summaryBulletsJa: bullets,
  };
}

function findSimilarCasesJa(
  journal: AiJournalEntry[],
  symbols: string[],
  limit = 3,
): string[] {
  const symSet = new Set(symbols.map((s) => s.toUpperCase()));
  const matches = journal
    .filter((e) => e.symbol && symSet.has(e.symbol.toUpperCase()))
    .slice(-20)
    .reverse()
    .slice(0, limit);
  return matches.map((e) => {
    const date = e.at.slice(0, 10);
    return `${date} ${e.symbol}: ${e.titleJa} — ${e.whyJa ?? e.bodyJa.slice(0, 80)}`;
  });
}

function buildNotificationIntelSummaryJa(state: PortfolioIntelligenceState): string {
  const repeated = state.notificationIntel.filter((n) => n.showCount >= 4);
  if (repeated.length === 0) {
    return '通知の繰り返し抑制: 特になし（重要度は学習中）';
  }
  return `同型通知を${repeated.length}種抑制中 — 重要度スコアで優先度を調整`;
}

export function buildStubPortfolioIntelligenceBundle(): PortfolioIntelligenceBundle {
  return {
    generatedAt: new Date().toISOString(),
    memory: {
      pastSymbols: [],
      tradeCount: 0,
      buyCount: 0,
      sellCount: 0,
      closedPositions: [],
      avgHoldDays: null,
    },
    journalRecent: [],
    predictionsPending: [],
    accuracy: {
      shortTermAccuracyPct: null,
      mediumTermAccuracyPct: null,
      anomalyDetectionAccuracyPct: null,
      evaluatedCount: 0,
      pendingCount: 0,
    },
    behavior: {
      primaryStyle: 'balanced_trader',
      styleLabelJa: USER_STYLE_LABELS_JA.balanced_trader,
      styleHintsJa: ['取引データ不足 — バランス型の補助を継続'],
      panicSellScore: 0,
      averagingDownScore: 0,
    },
    suggestedAnalysisMode: 'balanced',
    lossPatterns: [],
    successPatterns: [],
    portfolioRisk: {
      sectorBiasJa: ['保有なし'],
      currencyBiasJa: [],
      volatilityBiasJa: [],
      regionBiasJa: [],
      concentrationScore: 0,
    },
    weeklyReview: null,
    similarCasesJa: [],
    notificationIntelSummaryJa: '通知の繰り返し抑制: データ不足',
    privacyNoteJa: PORTFOLIO_INTEL_PRIVACY_JA,
    purposeNoteJa: PORTFOLIO_INTEL_PURPOSE_JA,
  };
}

export type BuildPortfolioIntelligenceInput = {
  state: AppState;
  userMessage?: string;
  symbols?: Array<{ symbol: string; market: Market }>;
  actionGuide?: ConciergeActionGuideBundle | null;
  currentAnalysisMode?: AiAnalysisMode;
};

export async function buildPortfolioIntelligenceBundle(
  input: BuildPortfolioIntelligenceInput,
): Promise<PortfolioIntelligenceBundle> {
  const stored = await loadPortfolioIntelligenceState();
  const portfolio = getActivePortfolio(input.state);
  const priceBySymbol: Record<string, number | null> = {};
  for (const p of portfolio) {
    priceBySymbol[p.symbol.toUpperCase()] = p.currentPrice ?? p.averageBuyPrice ?? null;
  }
  await resolvePendingPredictions(priceBySymbol);
  const refreshed = await loadPortfolioIntelligenceState();

  const trades = allTrades(input.state);
  const memory = buildPortfolioMemory(trades);
  const behavior = buildBehaviorProfile(trades);
  const lossPatterns = buildLossPatterns(behavior, memory, trades);
  const successPatterns = buildSuccessPatterns(memory);
  const portfolioRisk = buildPortfolioBias(input.state);
  const accuracy = accuracyFromPredictions(refreshed.predictions);
  const weeklyReview = buildWeeklyReview(
    trades,
    refreshed.predictions,
    input.state.appMode === 'practice'
      ? input.state.practice.performanceHistory
      : input.state.performanceHistory,
  );

  const querySymbols =
    input.symbols?.map((s) => s.symbol) ??
    (input.userMessage?.match(/\b[A-Z]{1,5}\d{0,4}\b/g) ?? []);
  const similarCasesJa = findSimilarCasesJa(refreshed.journal, querySymbols);

  const suggestedAnalysisMode = suggestAnalysisMode(
    behavior,
    lossPatterns,
    input.currentAnalysisMode,
  );

  return {
    generatedAt: new Date().toISOString(),
    memory,
    journalRecent: refreshed.journal.slice(-8).reverse(),
    predictionsPending: refreshed.predictions.filter((p) => p.outcome === 'pending').slice(0, 12),
    accuracy,
    behavior,
    suggestedAnalysisMode,
    lossPatterns,
    successPatterns,
    portfolioRisk,
    weeklyReview,
    similarCasesJa,
    notificationIntelSummaryJa: buildNotificationIntelSummaryJa(refreshed),
    privacyNoteJa: PORTFOLIO_INTEL_PRIVACY_JA,
    purposeNoteJa: PORTFOLIO_INTEL_PURPOSE_JA,
  };
}

export function mapActionGuideToPredictionKind(
  category: string,
  stance: string,
): PredictionKind | null {
  if (category === 'panic' || category === 'high-risk') return 'panic_warning';
  if (stance === 'bearish' || category === 'caution') return 'bearish_watch';
  if (stance === 'bullish' || category === 'opportunity') return 'bullish';
  return null;
}

export async function recordIntelligenceFromAiTurn(input: {
  userMessage: string;
  assistantSnippet: string;
  actionGuide?: ConciergeActionGuideBundle | null;
  evidenceSummaryJa?: string | null;
}): Promise<void> {
  const { appendAiJournalEntry, recordTrackedPrediction } = await import(
    './portfolioIntelligenceRecorder'
  );
  await appendAiJournalEntry({
    kind: 'ai_reply',
    titleJa: 'AI回答を記録',
    bodyJa: input.assistantSnippet.slice(0, 400),
    whyJa: input.evidenceSummaryJa ?? '実データ根拠に基づく補助回答',
  });

  const guide = input.actionGuide;
  if (!guide) return;
  for (const sym of guide.symbols.slice(0, 2)) {
    const kind = mapActionGuideToPredictionKind(sym.primaryCategory, sym.marketStance);
    if (!kind) continue;
    await recordTrackedPrediction({
      kind,
      symbol: sym.symbol,
      market: sym.market,
      baselinePrice: null,
      noteJa: sym.notificationWhyJa.slice(0, 200),
    });
  }
}

export async function recordIntelligenceFromProactive(input: {
  titleJa: string;
  bodyJa: string;
  notificationWhyJa?: string;
  symbol?: string | null;
  market?: Market | null;
  dedupeKey: string;
}): Promise<void> {
  const { appendAiJournalEntry, recordNotificationShown } = await import(
    './portfolioIntelligenceRecorder'
  );
  await appendAiJournalEntry({
    kind: 'notification',
    titleJa: input.titleJa,
    bodyJa: input.bodyJa.slice(0, 300),
    whyJa: input.notificationWhyJa ?? null,
    symbol: input.symbol ?? null,
    market: input.market ?? null,
  });
  await recordNotificationShown(input.dedupeKey);
}
