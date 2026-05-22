/**
 * Portfolio Simulation & Reality Validation — 紙上PF・提案追跡・精度検証
 */
import {
  HORIZON_MS,
  REALITY_HUMAN_REVIEW_CONFIDENCE_MAX,
  REALITY_OVERTRADE_MAX_ACTIONS,
  REALITY_OVERTRADE_WINDOW_MS,
  REALITY_THIN_REASON_MIN_LEN,
  REALITY_TRUST_PRESERVATION_THRESHOLD,
} from '../constants/portfolioRealityValidation';
import type { ConciergeMarketRegimeId } from '../types/globalMarketAnalysis';
import type { GlobalMarketAnalysisBundle } from '../types/globalMarketAnalysis';
import type { Market } from '../types';
import type {
  FailurePattern,
  PaperPortfolio,
  PerformanceJournalDay,
  RealityValidationBundle,
  RegimeAccuracy,
  TrackedAiRecommendation,
  ValidationHorizon,
} from '../types/portfolioRealityValidation';
import type { StrategyExecutionBundle, StrategySymbolRecommendation } from '../types/strategyExecution';
import type { PortfolioRealityPersisted } from './portfolioRealityStorage';
import { loadPortfolioRealityState, savePortfolioRealityState } from './portfolioRealityStorage';

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(n * 10) / 10));
}

function pickBenchmarkId(market: Market): string {
  if (market === 'bursa') return 'klci';
  return 'sp500';
}

function benchmarkChangePct(
  global: GlobalMarketAnalysisBundle | null,
  benchmarkId: string,
): number | null {
  if (!global) return null;
  const idx = global.indices.find((i) => i.id === benchmarkId);
  if (idx?.changePct != null) return idx.changePct;
  const sec = global.sectors.find((s) => s.id === 'semiconductor');
  if (benchmarkId === 'semiconductor' && sec?.changePct != null) return sec.changePct;
  return null;
}

function isThinReason(why: string): boolean {
  const t = why.trim();
  if (t.length < REALITY_THIN_REASON_MIN_LEN) return true;
  if (/^最終判断は証券会社/.test(t) && t.length < 40) return true;
  return false;
}

function defaultHorizon(action: string): ValidationHorizon {
  if (action === 'buy' || action === 'reduce') return '1w';
  return '1d';
}

function actionSucceeded(action: string, returnPct: number): boolean {
  if (action === 'buy') return returnPct > 0.5;
  if (action === 'reduce' || action === 'avoid') return returnPct < -0.5;
  if (action === 'hold') return Math.abs(returnPct) < 4;
  return Math.abs(returnPct) < 6;
}

function applyPaperTrade(
  paper: PaperPortfolio,
  rec: { symbol: string; market: Market; action: string; price: number | null },
): PaperPortfolio {
  const price = rec.price ?? 0;
  if (price <= 0) return paper;
  const next = { ...paper, positions: [...paper.positions] };
  const idx = next.positions.findIndex((p) => p.symbol === rec.symbol);
  if (rec.action === 'buy') {
    const alloc = Math.min(next.cashMYR * 0.08, next.cashMYR);
    if (alloc < 50) return next;
    const shares = Math.floor(alloc / price);
    if (shares <= 0) return next;
    next.cashMYR -= shares * price;
    if (idx >= 0) {
      const p = next.positions[idx];
      const totalShares = p.shares + shares;
      const avg = (p.avgPrice * p.shares + price * shares) / totalShares;
      next.positions[idx] = { ...p, shares: totalShares, avgPrice: avg };
    } else {
      next.positions.push({
        symbol: rec.symbol,
        market: rec.market,
        shares,
        avgPrice: price,
        openedAt: new Date().toISOString(),
      });
    }
  } else if (rec.action === 'reduce' && idx >= 0) {
    const p = next.positions[idx];
    const sellShares = Math.max(1, Math.floor(p.shares * 0.35));
    next.cashMYR += sellShares * price;
    if (p.shares <= sellShares) next.positions.splice(idx, 1);
    else next.positions[idx] = { ...p, shares: p.shares - sellShares };
  }
  return next;
}

function portfolioMarkToMarket(
  paper: PaperPortfolio,
  prices: Record<string, number>,
): number {
  let equity = paper.cashMYR;
  for (const p of paper.positions) {
    const px = prices[p.symbol] ?? p.avgPrice;
    equity += p.shares * px;
  }
  return equity;
}

function maxDrawdownPct(history: Array<{ valueMYR: number }>): number | null {
  if (history.length < 2) return null;
  let peak = history[0].valueMYR;
  let maxDd = 0;
  for (const h of history) {
    if (h.valueMYR > peak) peak = h.valueMYR;
    const dd = peak > 0 ? ((peak - h.valueMYR) / peak) * 100 : 0;
    if (dd > maxDd) maxDd = dd;
  }
  return Math.round(maxDd * 10) / 10;
}

function detectConsistencyWarnings(recs: TrackedAiRecommendation[]): string[] {
  const warnings: string[] = [];
  const bySym = new Map<string, TrackedAiRecommendation[]>();
  for (const r of recs.slice(-40)) {
    const list = bySym.get(r.symbol) ?? [];
    list.push(r);
    bySym.set(r.symbol, list);
  }
  const windowMs = 6 * 60 * 60 * 1000;
  for (const [sym, list] of bySym) {
    const sorted = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const cur = sorted[i];
      const dt = new Date(cur.createdAt).getTime() - new Date(prev.createdAt).getTime();
      if (dt > windowMs) continue;
      const flip =
        (prev.action === 'buy' && (cur.action === 'reduce' || cur.action === 'avoid')) ||
        (prev.action === 'reduce' && cur.action === 'buy');
      if (flip) {
        warnings.push(
          `${sym}: 短時間で ${prev.action}→${cur.action} — 戦略の一貫性に注意`,
        );
      }
    }
  }
  return warnings.slice(0, 4);
}

function buildFailurePatterns(recs: TrackedAiRecommendation[]): FailurePattern[] {
  const failed = recs.filter((r) => r.status === 'failed');
  const byAction = new Map<string, number>();
  const byThin = { count: 0 };
  const byHighConf = { count: 0 };
  for (const r of failed) {
    byAction.set(r.action, (byAction.get(r.action) ?? 0) + 1);
    if (r.thinReasonFlag) byThin.count += 1;
    if (r.confidencePct >= 75) byHighConf.count += 1;
  }
  const patterns: FailurePattern[] = [];
  for (const [action, count] of byAction) {
    patterns.push({
      id: `fail-${action}`,
      labelJa: `${action} 提案の外れ`,
      count,
      detailJa: `過去の失敗のうち ${action} 系が ${count} 件`,
    });
  }
  if (byThin.count > 0) {
    patterns.push({
      id: 'thin-reason',
      labelJa: '根拠薄い提案',
      count: byThin.count,
      detailJa: '説明文が短い・定型のみの提案が外れやすい',
    });
  }
  if (byHighConf.count > 0) {
    patterns.push({
      id: 'overconfident',
      labelJa: '過信（高confidence）',
      count: byHighConf.count,
      detailJa: 'confidence 75%超でも失敗したケース',
    });
  }
  return patterns.sort((a, b) => b.count - a.count).slice(0, 5);
}

function buildRegimeAccuracy(recs: TrackedAiRecommendation[]): RegimeAccuracy[] {
  const regimes = new Map<string, { wins: number; total: number }>();
  for (const r of recs) {
    if (r.status !== 'succeeded' && r.status !== 'failed') continue;
    const key = r.regimeId;
    const row = regimes.get(key) ?? { wins: 0, total: 0 };
    row.total += 1;
    if (r.status === 'succeeded') row.wins += 1;
    regimes.set(key, row);
  }
  return [...regimes.entries()].map(([regimeId, v]) => ({
    regimeId,
    count: v.total,
    winRatePct: v.total > 0 ? Math.round((v.wins / v.total) * 100) : null,
  }));
}

function buildJournal(recs: TrackedAiRecommendation[]): PerformanceJournalDay[] {
  const byDay = new Map<string, PerformanceJournalDay>();
  for (const r of recs) {
    const key = r.createdAt.slice(0, 10);
    const row = byDay.get(key) ?? {
      dateKey: key,
      proposedCount: 0,
      resolvedCount: 0,
      summaryJa: '',
      missReasonJa: null,
    };
    row.proposedCount += 1;
    if (r.status === 'succeeded' || r.status === 'failed') {
      row.resolvedCount += 1;
      if (r.status === 'failed' && !row.missReasonJa) {
        row.missReasonJa =
          r.failureNoteJa ??
          (r.thinReasonFlag ? '根拠が薄かった可能性' : 'ベンチマーク・地合いに逆らった');
      }
    }
    byDay.set(key, row);
  }
  return [...byDay.values()]
    .map((d) => ({
      ...d,
      summaryJa: `提案 ${d.proposedCount} · 確定 ${d.resolvedCount}`,
    }))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    .slice(0, 7);
}

function runMonteCarlo(portfolioValue: number, volPct: number) {
  const sims = 80;
  const returns: number[] = [];
  const dailyVol = Math.max(0.5, volPct / 5);
  for (let i = 0; i < sims; i++) {
    let cum = 0;
    for (let d = 0; d < 20; d++) {
      cum += (Math.random() - 0.48) * dailyVol * 2;
    }
    returns.push(cum);
  }
  returns.sort((a, b) => a - b);
  const median = returns[Math.floor(returns.length / 2)] ?? 0;
  const worst5 = returns[Math.floor(returns.length * 0.05)] ?? returns[0];
  return {
    simulations: sims,
    medianReturnPct: Math.round(median * 10) / 10,
    worst5PctReturnPct: Math.round(worst5 * 10) / 10,
    summaryJa: `20営業日・${sims}パス: 中央値 ${median >= 0 ? '+' : ''}${median.toFixed(1)}% / 下位5% ${worst5.toFixed(1)}%（参考シミュレーション）`,
  };
}

function resolveRecommendations(
  recs: TrackedAiRecommendation[],
  prices: Record<string, number>,
  global: GlobalMarketAnalysisBundle | null,
  calibration: PortfolioRealityPersisted['calibration'],
): { recs: TrackedAiRecommendation[]; calibration: PortfolioRealityPersisted['calibration'] } {
  const now = Date.now();
  let cal = { ...calibration };
  const next = recs.map((r) => ({ ...r }));

  for (const r of next) {
    if (r.status !== 'active') continue;
    const elapsed = now - new Date(r.createdAt).getTime();
    const horizonMs = HORIZON_MS[r.horizon];
    const px = prices[r.symbol];
    const base = r.baselinePrice;
    if (px == null || base == null || base <= 0) {
      if (elapsed > horizonMs * 1.5) {
        r.status = 'expired';
        r.resolvedAt = new Date().toISOString();
        r.failureNoteJa = '価格データ不足で評価不能';
      }
      continue;
    }
    if (elapsed < horizonMs) continue;

    const returnPct = ((px - base) / base) * 100;
    const benchPct = benchmarkChangePct(global, r.benchmarkId);
    r.returnPct = Math.round(returnPct * 100) / 100;
    r.benchmarkReturnPct = benchPct;
    r.benchmarkDeltaPct =
      benchPct != null ? Math.round((returnPct - benchPct) * 100) / 100 : null;
    r.resolvedAt = new Date().toISOString();
    r.status = actionSucceeded(r.action, returnPct) ? 'succeeded' : 'failed';
    if (r.status === 'failed') {
      r.failureNoteJa =
        r.benchmarkDeltaPct != null && r.benchmarkDeltaPct < -2
          ? 'ベンチマークに大きく負けた'
          : r.thinReasonFlag
            ? '根拠が薄い提案だった可能性'
            : '想定方向と逆行';
      if (r.confidencePct >= 78) {
        cal.highConfidenceMissStreak += 1;
        if (cal.highConfidenceMissStreak >= 2) {
          cal.confidenceOffsetPct = Math.min(25, cal.confidenceOffsetPct + 3);
          cal.highConfidenceMissStreak = 0;
        }
      }
    } else {
      cal.highConfidenceMissStreak = Math.max(0, cal.highConfidenceMissStreak - 1);
      if (cal.confidenceOffsetPct > 0) cal.confidenceOffsetPct -= 1;
    }
  }
  return { recs: next, calibration: cal };
}

function recordFromStrategy(
  state: PortfolioRealityPersisted,
  strategy: StrategyExecutionBundle,
  regimeId: ConciergeMarketRegimeId | 'unknown',
  global: GlobalMarketAnalysisBundle | null,
  prices: Record<string, number>,
): PortfolioRealityPersisted {
  const candidates: StrategySymbolRecommendation[] = [
    ...strategy.todayRecommendations,
    ...strategy.dangerAvoid,
    ...strategy.watchList.filter((w) => w.action === 'hold'),
  ].filter((r) => r.action !== 'watch');

  const recentCutoff = Date.now() - 4 * 60 * 60 * 1000;
  const existingKeys = new Set(
    state.recommendations
      .filter((r) => new Date(r.createdAt).getTime() > recentCutoff)
      .map((r) => `${r.symbol}:${r.action}`),
  );

  let paper = state.paper;
  const newRecs: TrackedAiRecommendation[] = [];

  for (const r of candidates) {
    if (r.intent !== 'action' && r.action !== 'hold') continue;
    const key = `${r.symbol}:${r.action}`;
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);

    const thin = isThinReason(r.whyProposedJa + r.analystExplanationJa);
    const rawConf = r.confidencePct;
    const calibrated = clamp(rawConf - state.calibration.confidenceOffsetPct);
    const humanReview =
      calibrated <= REALITY_HUMAN_REVIEW_CONFIDENCE_MAX || thin;
    const benchId = pickBenchmarkId(r.market);

    const rec: TrackedAiRecommendation = {
      id: newId('rec'),
      createdAt: new Date().toISOString(),
      symbol: r.symbol,
      market: r.market,
      action: r.action,
      confidencePct: rawConf,
      calibratedConfidencePct: calibrated,
      baselinePrice: prices[r.symbol] ?? null,
      whyJa: r.whyProposedJa || r.analystExplanationJa,
      regimeId: regimeId as ConciergeMarketRegimeId,
      status: 'active',
      horizon: defaultHorizon(r.action),
      resolvedAt: null,
      returnPct: null,
      benchmarkId: benchId,
      benchmarkReturnPct: benchmarkChangePct(global, benchId),
      benchmarkDeltaPct: null,
      thinReasonFlag: thin,
      humanReviewOnly: humanReview,
      failureNoteJa: null,
    };
    newRecs.push(rec);
    if (!humanReview && (r.action === 'buy' || r.action === 'reduce')) {
      paper = applyPaperTrade(paper, {
        symbol: r.symbol,
        market: r.market,
        action: r.action,
        price: prices[r.symbol] ?? null,
      });
    }
  }

  return {
    ...state,
    paper,
    recommendations: [...state.recommendations, ...newRecs].slice(-200),
  };
}

export type BuildPortfolioRealityInput = {
  strategyBundle: StrategyExecutionBundle | null;
  regimeId: ConciergeMarketRegimeId | 'unknown';
  globalMarket: GlobalMarketAnalysisBundle | null;
  priceBySymbol: Record<string, number>;
};

export function buildPortfolioRealityBundle(
  state: PortfolioRealityPersisted,
  input: BuildPortfolioRealityInput,
): { bundle: RealityValidationBundle; state: PortfolioRealityPersisted } {
  let working = { ...state };

  if (input.strategyBundle) {
    working = recordFromStrategy(
      working,
      input.strategyBundle,
      input.regimeId,
      input.globalMarket,
      input.priceBySymbol,
    );
  }

  const resolved = resolveRecommendations(
    working.recommendations,
    input.priceBySymbol,
    input.globalMarket,
    working.calibration,
  );
  working.recommendations = resolved.recs;
  working.calibration = resolved.calibration;

  const equity = portfolioMarkToMarket(working.paper, input.priceBySymbol);
  const init = working.paper.initialCapitalMYR;
  const virtualReturnPct = init > 0 ? ((equity - init) / init) * 100 : 0;
  working.equityHistory = [
    ...working.equityHistory,
    { at: new Date().toISOString(), valueMYR: equity },
  ].slice(-120);

  const evaluated = working.recommendations.filter(
    (r) => r.status === 'succeeded' || r.status === 'failed',
  );
  const wins = evaluated.filter((r) => r.status === 'succeeded').length;
  const winRatePct = evaluated.length > 0 ? Math.round((wins / evaluated.length) * 100) : null;
  const returns = evaluated.map((r) => r.returnPct).filter((x): x is number => x != null);
  const avgReturnPct =
    returns.length > 0
      ? Math.round((returns.reduce((a, b) => a + b, 0) / returns.length) * 10) / 10
      : null;

  const horizonWin = (h: ValidationHorizon) => {
    const subset = evaluated.filter((r) => r.horizon === h);
    if (subset.length === 0) return null;
    const w = subset.filter((r) => r.status === 'succeeded').length;
    return Math.round((w / subset.length) * 100);
  };

  const recent = evaluated
    .filter((r) => r.resolvedAt)
    .sort((a, b) => (b.resolvedAt ?? '').localeCompare(a.resolvedAt ?? ''))
    .slice(0, 12);
  const recentWins = recent.filter((r) => r.status === 'succeeded').length;
  const recentWinRatePct =
    recent.length > 0 ? Math.round((recentWins / recent.length) * 100) : null;

  const failedSorted = evaluated
    .filter((r) => r.status === 'failed' && r.returnPct != null)
    .sort((a, b) => (a.returnPct ?? 0) - (b.returnPct ?? 0));
  const maxFailure = failedSorted[0];

  const byActionWin = new Map<string, { wins: number; total: number }>();
  for (const r of evaluated) {
    const row = byActionWin.get(r.action) ?? { wins: 0, total: 0 };
    row.total += 1;
    if (r.status === 'succeeded') row.wins += 1;
    byActionWin.set(r.action, row);
  }
  let strongestStrategyJa: string | null = null;
  let dangerousStrategyJa: string | null = null;
  let bestRate = -1;
  let worstRate = 101;
  for (const [action, v] of byActionWin) {
    if (v.total < 2) continue;
    const rate = (v.wins / v.total) * 100;
    if (rate > bestRate) {
      bestRate = rate;
      strongestStrategyJa = `${action}（勝率 ${Math.round(rate)}% · n=${v.total}）`;
    }
    if (rate < worstRate) {
      worstRate = rate;
      dangerousStrategyJa = `${action}（勝率 ${Math.round(rate)}% · n=${v.total}）`;
    }
  }

  const actionCount24h = working.recommendations.filter(
    (r) =>
      Date.now() - new Date(r.createdAt).getTime() < REALITY_OVERTRADE_WINDOW_MS &&
      (r.action === 'buy' || r.action === 'reduce'),
  ).length;
  const overtradingNoteJa =
    actionCount24h > REALITY_OVERTRADE_MAX_ACTIONS
      ? `24hで売買系提案 ${actionCount24h} 回 — 過剰トレード注意（上限 ${REALITY_OVERTRADE_MAX_ACTIONS}）`
      : null;

  let trustScore = 50;
  if (winRatePct != null) trustScore += (winRatePct - 50) * 0.35;
  if (avgReturnPct != null) trustScore += Math.max(-15, Math.min(15, avgReturnPct * 2));
  const dd = maxDrawdownPct(working.equityHistory);
  if (dd != null) trustScore -= dd * 0.4;
  trustScore -= working.calibration.confidenceOffsetPct * 0.5;
  trustScore -= working.recommendations.filter((r) => r.thinReasonFlag && r.status === 'failed').length * 2;
  trustScore = clamp(trustScore, 0, 100);

  const capitalPreservationMode = trustScore < REALITY_TRUST_PRESERVATION_THRESHOLD;

  const concentrationPct =
    working.paper.positions.length > 0
      ? Math.min(
          100,
          working.paper.positions.reduce((s, p) => s + p.shares * (input.priceBySymbol[p.symbol] ?? p.avgPrice), 0) /
            Math.max(1, equity) *
            100,
        )
      : 0;
  const crashPct = input.globalMarket?.regimeId === 'panic' ? 22 : 15;
  const stress = {
    crashScenarioPct: crashPct,
    estimatedLossMYR: Math.round(equity * (crashPct / 100) * (concentrationPct / 100 + 0.3)),
    estimatedLossPct: Math.round(crashPct * (concentrationPct / 100 + 0.25) * 10) / 10,
    sectorCollapseNoteJa:
      concentrationPct > 55
        ? '集中度高 — セクター連動で同時下落リスク大'
        : '分散はおおむね許容 — 暴落時も現金バッファを維持',
  };

  const volEstimate = Math.abs(virtualReturnPct) + (dd ?? 8);
  const monteCarlo = runMonteCarlo(equity, volEstimate);

  const humanReviewQueue = working.recommendations
    .filter((r) => r.humanReviewOnly && r.status === 'active')
    .slice(-6);

  const benchmarkLabelsJa = [
    'KLCI',
    'S&P500',
    'Nasdaq',
    'セクターETF（半導体など）',
  ];

  const bundle: RealityValidationBundle = {
    generatedAt: new Date().toISOString(),
    paperPortfolio: working.paper,
    virtualPnLMYR: Math.round((equity - init) * 100) / 100,
    virtualReturnPct: Math.round(virtualReturnPct * 10) / 10,
    trustScore,
    capitalPreservationMode,
    calibrationOffsetPct: working.calibration.confidenceOffsetPct,
    dashboard: {
      winRatePct,
      avgReturnPct,
      maxDrawdownPct: dd,
      evaluatedCount: evaluated.length,
      pendingCount: working.recommendations.filter((r) => r.status === 'active').length,
      accuracy1d: horizonWin('1d'),
      accuracy1w: horizonWin('1w'),
      accuracy1m: horizonWin('1m'),
    },
    recentWinRatePct,
    maxFailureJa: maxFailure
      ? `${maxFailure.symbol} ${maxFailure.action}: ${maxFailure.returnPct?.toFixed(1)}%`
      : null,
    strongestStrategyJa,
    dangerousStrategyJa,
    regimeAccuracy: buildRegimeAccuracy(working.recommendations),
    failurePatterns: buildFailurePatterns(working.recommendations),
    stress,
    monteCarlo,
    humanReviewQueue,
    consistencyWarningsJa: detectConsistencyWarnings(working.recommendations),
    overtradingNoteJa,
    journalRecent: buildJournal(working.recommendations),
    benchmarkLabelsJa,
  };

  return { bundle, state: working };
}

export async function refreshPortfolioRealityValidation(
  input: BuildPortfolioRealityInput,
): Promise<RealityValidationBundle> {
  const loaded = await loadPortfolioRealityState();
  const { bundle, state } = buildPortfolioRealityBundle(loaded, input);
  await savePortfolioRealityState(state);
  return bundle;
}
