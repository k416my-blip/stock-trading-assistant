/**
 * 過去30営業日 — buy/hold/watch/reduce 集計・ボトルネック・簡易バックテスト
 */
import {
  actionConfidenceToDirectionScore,
  computeFinalHybridScore,
  resolveFusedActionFromFinalScore,
} from '../../src/services/hybridStrategyScoreFusion';
import { resolvePerSymbolRanking } from '../../src/services/hybridRankingConflict';
import { auditResolveActionChain } from '../../src/services/strategyRuleScoreAudit';
import { resolveStrategyAction } from '../../src/services/strategyExecutionEngine';
import type { ConciergeSymbolEvidence } from '../../src/types/conciergeEvidence';
import type { AiSecondEvaluatorAction } from '../../src/types/aiSecondEvaluator';
import type { StrategyAction } from '../../src/types/strategyExecution';

export const AUDIT_BUSINESS_DAYS = 30;
export const BACKTEST_HOLD_DAYS = 5;

export type ProbeSymbol = { symbol: string; market: 'bursa' | 'us' | 'hk'; yahooSymbol: string };
export type DailyBar = { date: string; close: number };

export type EvalRow = {
  date: string;
  symbol: string;
  dayChangePct: number;
  rsi14: number | null;
  ruleRaw: StrategyAction;
  ruleEffective: StrategyAction;
  ruleMatched: string;
  aiAction: AiSecondEvaluatorAction;
  aiConfidence: number;
  ruleScore: number;
  aiScore: number;
  finalScore: number;
  fusedFromScore: AiSecondEvaluatorAction;
  finalAction: AiSecondEvaluatorAction;
  conflict: boolean;
};

export type ActionCounts = Record<AiSecondEvaluatorAction, number>;
export type BottleneckRow = { ruleName: string; matchCount: number; pct: number };
export type BacktestSummary = {
  label: string;
  signalCount: number;
  winRatePct: number;
  avgReturnPct: number;
  maxLossPct: number;
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function toYahooSymbol(symbol: string, market: ProbeSymbol['market']): string {
  if (market === 'bursa') return symbol.includes('.') ? symbol : `${symbol}.KL`;
  if (market === 'hk') return symbol.includes('.') ? symbol : `${symbol}.HK`;
  return symbol;
}

export async function fetchYahooDailyBars(yahooSymbol: string): Promise<DailyBar[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=6mo`;
  const res = await fetch(url, { headers: { 'User-Agent': 'stock-trading-assistant-audit/1.0' } });
  if (!res.ok) throw new Error(`Yahoo chart ${yahooSymbol} HTTP ${res.status}`);
  const json = (await res.json()) as {
    chart?: { result?: Array<{ timestamp?: number[]; indicators?: { quote?: Array<{ close?: (number | null)[] }> } }> };
  };
  const result = json.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const bars: DailyBar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const c = closes[i];
    if (c == null || !Number.isFinite(c)) continue;
    bars.push({ date: new Date(timestamps[i]! * 1000).toISOString().slice(0, 10), close: c });
  }
  return bars;
}

export function computeRsi14At(closes: number[], idx: number): number | null {
  if (idx < 14) return null;
  let gains = 0;
  let losses = 0;
  for (let i = idx - 13; i <= idx; i++) {
    const d = closes[i]! - closes[i - 1]!;
    if (d >= 0) gains += d;
    else losses -= d;
  }
  const avgLoss = losses / 14;
  if (avgLoss === 0) return 100;
  return clamp(100 - 100 / (1 + gains / 14 / avgLoss));
}

export function proxyAiFromRsi(rsi14: number | null): { action: AiSecondEvaluatorAction; confidence: number } {
  const rsi = rsi14 ?? 50;
  if (rsi >= 70) return { action: 'reduce', confidence: 58 };
  if (rsi <= 30) return { action: 'buy', confidence: 56 };
  return { action: 'hold', confidence: 52 };
}

export function buildSyntheticEvidence(
  symbol: string,
  market: ProbeSymbol['market'],
  dayChangePct: number,
  close: number,
): ConciergeSymbolEvidence {
  const prev = close / (1 + dayChangePct / 100);
  return {
    symbol,
    companyName: symbol,
    market,
    displayLabelJa: symbol,
    currentPrice: close,
    previousClose: prev,
    intradayChangePct: dayChangePct,
    volume: 1_000_000,
    volumeSurgeRatio: 1,
    quoteAgeSeconds: 60,
    quoteIsStale: false,
    portfolioHolding: { shares: 100, averageBuyPrice: prev * 0.95, unrealizedPnlPct: 5 },
    latestFinancialNews: [{ title: 'audit', sentiment: '中立' }],
    newsSummaryJa: 'audit',
    newsSource: 'audit',
    xSentiment: {
      postCount: 0,
      bullishPct: 15,
      bearishPct: 20,
      panicPct: 0,
      hypePct: 0,
      trendWords: [],
      postSurgeRatePct: null,
      summaryJa: 'neutral',
      fromCache: true,
      analysisBasis: 'audit_proxy',
    },
    trendingKeywords: [],
    unusualActivityFlags: [],
    dataGapsJa: [],
  };
}

export function evaluateSymbolDay(input: {
  date: string;
  symbol: string;
  market: ProbeSymbol['market'];
  dayChangePct: number;
  rsi14: number | null;
  close: number;
  weightPct: number;
}): EvalRow {
  const regimeId = 'sideways';
  const ruleConfidencePct = 72;
  const sym = buildSyntheticEvidence(input.symbol, input.market, input.dayChangePct, input.close);
  const chain = auditResolveActionChain(sym, regimeId, input.weightPct, input.rsi14);
  const ruleMatched = chain.chain.find((s) => s.matched)?.ruleName ?? 'unknown';
  const ruleRaw = resolveStrategyAction(sym, regimeId, input.weightPct, input.rsi14, {
    skipRsiOversoldGuard: true,
  });
  const ruleEffective = resolveStrategyAction(sym, regimeId, input.weightPct, input.rsi14);
  const ai = proxyAiFromRsi(input.rsi14);
  const ranking = resolvePerSymbolRanking(
    ruleRaw,
    ruleConfidencePct,
    ai.action,
    ai.confidence,
    ruleEffective,
  );
  const aiScore = actionConfidenceToDirectionScore(ai.action, ai.confidence);
  const finalScore = computeFinalHybridScore(ranking.ruleScore, aiScore);
  return {
    date: input.date,
    symbol: input.symbol,
    dayChangePct: input.dayChangePct,
    rsi14: input.rsi14,
    ruleRaw,
    ruleEffective,
    ruleMatched,
    aiAction: ai.action,
    aiConfidence: ai.confidence,
    ruleScore: ranking.ruleScore,
    aiScore,
    finalScore,
    fusedFromScore: resolveFusedActionFromFinalScore(finalScore),
    finalAction: ranking.finalAction,
    conflict: ranking.conflict,
  };
}

export function countActions(rows: EvalRow[], field: 'finalAction' | 'aiAction' | 'ruleEffective'): ActionCounts {
  const c: ActionCounts = { buy: 0, hold: 0, watch: 0, reduce: 0 };
  for (const r of rows) {
    c[r[field] as AiSecondEvaluatorAction] += 1;
  }
  return c;
}

export function aggregateBottlenecks(rows: EvalRow[]): BottleneckRow[] {
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.ruleMatched, (map.get(r.ruleMatched) ?? 0) + 1);
  const total = rows.length || 1;
  return [...map.entries()]
    .map(([ruleName, matchCount]) => ({ ruleName, matchCount, pct: Math.round((matchCount / total) * 1000) / 10 }))
    .sort((a, b) => b.matchCount - a.matchCount);
}

export function runSimpleBuyBacktest(
  rows: EvalRow[],
  barsBySymbol: Map<string, DailyBar[]>,
  signal: (r: EvalRow) => boolean,
  label: string,
): BacktestSummary {
  const returns: number[] = [];
  for (const r of rows) {
    if (!signal(r)) continue;
    const bars = barsBySymbol.get(r.symbol);
    if (!bars) continue;
    const idx = bars.findIndex((b) => b.date === r.date);
    if (idx < 0 || idx + BACKTEST_HOLD_DAYS >= bars.length) continue;
    const entry = bars[idx + 1]!.close;
    const exit = bars[idx + BACKTEST_HOLD_DAYS]!.close;
    if (entry <= 0) continue;
    returns.push(((exit - entry) / entry) * 100);
  }
  if (returns.length === 0) {
    return { label, signalCount: 0, winRatePct: 0, avgReturnPct: 0, maxLossPct: 0 };
  }
  const wins = returns.filter((x) => x > 0).length;
  return {
    label,
    signalCount: returns.length,
    winRatePct: Math.round((wins / returns.length) * 1000) / 10,
    avgReturnPct: Math.round((returns.reduce((a, b) => a + b, 0) / returns.length) * 100) / 100,
    maxLossPct: Math.round(Math.min(...returns) * 100) / 100,
  };
}

export function rowsToCsv(rows: EvalRow[]): string {
  const header =
    'date,symbol,dayChangePct,rsi14,ruleMatched,ruleRaw,ruleEffective,aiAction,aiConfidence,ruleScore,aiScore,finalScore,fusedFromScore,finalAction,conflict';
  const lines = rows.map((r) =>
    [
      r.date,
      r.symbol,
      r.dayChangePct.toFixed(2),
      r.rsi14 ?? '',
      r.ruleMatched,
      r.ruleRaw,
      r.ruleEffective,
      r.aiAction,
      r.aiConfidence,
      r.ruleScore,
      r.aiScore,
      r.finalScore,
      r.fusedFromScore,
      r.finalAction,
      r.conflict,
    ].join(','),
  );
  return [header, ...lines].join('\n');
}

export const BUY_CONDITIONS_DOC = `
### A. ルール（resolveStrategyAction）
- momentum_buy: 日中≥+3%, bear<45%, フラグ0, regime≠panic → buy
- held_stock_neutral_hold: 保有・日中(-2,+4)・bear<50 → hold（buyをブロック）
- sharp_drop → reduce（RSI<30でwatch）
- |日中|≥2.5% → watch

### B. AI
- OpenAI 第二評価、または RSI≤30→buy / ≥70→reduce

### C. finalAction
- rule reduce × AI buy（≥65）→ conflict → watch（buyにならない）
`.trim();

/** シミュレーション専用 — 本番 resolveStrategyAction のパラメータ化 */
export type RuleSimParams = {
  /** held_stock: ch > holdMinExclusive && ch < holdMaxExclusive */
  holdMinExclusive: number;
  holdMaxExclusive: number;
  /** momentum_buy: ch >= momentumMinPct */
  momentumMinPct: number;
};

export const RULE_PARAMS_BASELINE: RuleSimParams = {
  holdMinExclusive: -2,
  holdMaxExclusive: 4,
  momentumMinPct: 3,
};

export const RULE_PARAMS_NARROW_HOLD: RuleSimParams = {
  holdMinExclusive: -1,
  holdMaxExclusive: 2,
  momentumMinPct: 3,
};

export const RULE_PARAMS_MOMENTUM_2: RuleSimParams = {
  holdMinExclusive: -2,
  holdMaxExclusive: 4,
  momentumMinPct: 2,
};

export const RULE_PARAMS_RELAXED_BOTH: RuleSimParams = {
  holdMinExclusive: -1,
  holdMaxExclusive: 2,
  momentumMinPct: 2,
};

export function resolveStrategyActionSim(
  sym: ConciergeSymbolEvidence,
  regimeId: string,
  weight: number,
  rsi14: number | null | undefined,
  params: RuleSimParams,
  options?: { skipRsiOversoldGuard?: boolean },
): StrategyAction {
  const ch = sym.intradayChangePct ?? 0;
  const bear = sym.xSentiment?.bearishPct ?? 0;
  const flags = sym.unusualActivityFlags.length;

  if (regimeId === 'panic' && (ch < -4 || bear >= 60)) return 'avoid';
  if (ch <= -5 || (bear >= 65 && flags > 0)) {
    if (!options?.skipRsiOversoldGuard && rsi14 != null && rsi14 < 30) return 'watch';
    return 'reduce';
  }
  if (
    sym.portfolioHolding &&
    ch > params.holdMinExclusive &&
    ch < params.holdMaxExclusive &&
    bear < 50
  ) {
    return 'hold';
  }
  if (ch >= params.momentumMinPct && bear < 45 && flags === 0 && regimeId !== 'panic') return 'buy';
  if (weight >= 20 && ch < -3) return 'reduce';
  if (flags > 0 || Math.abs(ch) >= 2.5) return 'watch';
  return 'hold';
}

export function classifyRuleMatchedSim(
  sym: ConciergeSymbolEvidence,
  regimeId: string,
  weight: number,
  rsi14: number | null | undefined,
  params: RuleSimParams,
): string {
  const ch = sym.intradayChangePct ?? 0;
  const bear = sym.xSentiment?.bearishPct ?? 0;
  const flags = sym.unusualActivityFlags.length;

  if (regimeId === 'panic' && (ch < -4 || bear >= 60)) return 'panic_regime_avoid';
  if (ch <= -5 || (bear >= 65 && flags > 0)) {
    if (rsi14 != null && rsi14 < 30 && (ch <= -5 || (bear >= 65 && flags > 0))) {
      return 'sharp_drop_or_bearish_reduce';
    }
    return 'sharp_drop_or_bearish_reduce';
  }
  if (
    sym.portfolioHolding &&
    ch > params.holdMinExclusive &&
    ch < params.holdMaxExclusive &&
    bear < 50
  ) {
    return 'held_stock_neutral_hold';
  }
  if (ch >= params.momentumMinPct && bear < 45 && flags === 0 && regimeId !== 'panic') {
    return 'momentum_buy';
  }
  if (weight >= 20 && ch < -3) return 'heavy_weight_drawdown_reduce';
  if (flags > 0 || Math.abs(ch) >= 2.5) return 'volatility_watch';
  return 'default_hold';
}

export type SimEvalRow = Pick<
  EvalRow,
  'date' | 'symbol' | 'dayChangePct' | 'rsi14' | 'ruleEffective' | 'ruleMatched' | 'finalAction'
>;

export type DetailedEvalRow = SimEvalRow & {
  ruleRaw: StrategyAction;
  aiAction: AiSecondEvaluatorAction;
  aiConfidence: number;
  conflict: boolean;
  /** rule reduce × AI buy × conf≥65 */
  conflictPair: boolean;
  /** AI buy だが conflict で final=watch */
  demotedBuyToWatch: boolean;
};

export function evaluateSymbolDayDetailed(input: {
  date: string;
  symbol: string;
  market: ProbeSymbol['market'];
  dayChangePct: number;
  rsi14: number | null;
  close: number;
  weightPct: number;
  ruleParams: RuleSimParams;
  productionLikeAiConflict?: boolean;
}): DetailedEvalRow {
  const regimeId = 'sideways';
  const ruleConfidencePct = 72;
  const sym = buildSyntheticEvidence(input.symbol, input.market, input.dayChangePct, input.close);
  const ruleMatched = classifyRuleMatchedSim(sym, regimeId, input.weightPct, input.rsi14, input.ruleParams);
  const ruleRaw = resolveStrategyActionSim(sym, regimeId, input.weightPct, input.rsi14, input.ruleParams, {
    skipRsiOversoldGuard: true,
  });
  const ruleEffective = resolveStrategyActionSim(
    sym,
    regimeId,
    input.weightPct,
    input.rsi14,
    input.ruleParams,
  );
  const aiBase = proxyAiFromRsi(input.rsi14);
  const ai = input.productionLikeAiConflict && aiBase.action === 'buy'
    ? { action: 'buy' as const, confidence: 75 }
    : aiBase;
  const ranking = resolvePerSymbolRanking(
    ruleRaw,
    ruleConfidencePct,
    ai.action,
    ai.confidence,
    ruleEffective,
  );
  const conflictPair =
    ruleRaw === 'reduce' && ai.action === 'buy' && ai.confidence >= 65;
  const demotedBuyToWatch = ai.action === 'buy' && ranking.conflict && ranking.finalAction === 'watch';
  return {
    date: input.date,
    symbol: input.symbol,
    dayChangePct: input.dayChangePct,
    rsi14: input.rsi14,
    ruleRaw,
    ruleEffective,
    ruleMatched,
    aiAction: ai.action,
    aiConfidence: ai.confidence,
    conflict: ranking.conflict,
    conflictPair,
    demotedBuyToWatch,
    finalAction: ranking.finalAction,
  };
}

export function evaluateSymbolDayWithRuleParams(input: {
  date: string;
  symbol: string;
  market: ProbeSymbol['market'];
  dayChangePct: number;
  rsi14: number | null;
  close: number;
  weightPct: number;
  ruleParams: RuleSimParams;
  /** live 相当: AI buy confidence を 75 に上げて conflict を再現 */
  productionLikeAiConflict?: boolean;
}): SimEvalRow {
  const regimeId = 'sideways';
  const ruleConfidencePct = 72;
  const sym = buildSyntheticEvidence(input.symbol, input.market, input.dayChangePct, input.close);
  const ruleMatched = classifyRuleMatchedSim(sym, regimeId, input.weightPct, input.rsi14, input.ruleParams);
  const ruleRaw = resolveStrategyActionSim(sym, regimeId, input.weightPct, input.rsi14, input.ruleParams, {
    skipRsiOversoldGuard: true,
  });
  const ruleEffective = resolveStrategyActionSim(
    sym,
    regimeId,
    input.weightPct,
    input.rsi14,
    input.ruleParams,
  );
  const aiBase = proxyAiFromRsi(input.rsi14);
  const ai = input.productionLikeAiConflict && aiBase.action === 'buy'
    ? { action: 'buy' as const, confidence: 75 }
    : aiBase;
  const ranking = resolvePerSymbolRanking(
    ruleRaw,
    ruleConfidencePct,
    ai.action,
    ai.confidence,
    ruleEffective,
  );
  return {
    date: input.date,
    symbol: input.symbol,
    dayChangePct: input.dayChangePct,
    rsi14: input.rsi14,
    ruleEffective,
    ruleMatched,
    finalAction: ranking.finalAction,
  };
}

export function countRuleActions(rows: SimEvalRow[]): ActionCounts {
  const c: ActionCounts = { buy: 0, hold: 0, watch: 0, reduce: 0 };
  for (const r of rows) {
    const a = r.ruleEffective;
    if (a === 'avoid') c.reduce += 1;
    else c[a] += 1;
  }
  return c;
}

export function countFinalActions(rows: SimEvalRow[]): ActionCounts {
  const c: ActionCounts = { buy: 0, hold: 0, watch: 0, reduce: 0 };
  for (const r of rows) {
    c[r.finalAction] += 1;
  }
  return c;
}

export type BacktestWithDrawdown = BacktestSummary & { maxDrawdownPct: number };

export function runRuleBuyBacktest(
  rows: SimEvalRow[],
  barsBySymbol: Map<string, DailyBar[]>,
  label: string,
  useFinalAction: boolean,
): BacktestWithDrawdown {
  const returns: number[] = [];
  for (const r of rows) {
    const isBuy = useFinalAction ? r.finalAction === 'buy' : r.ruleEffective === 'buy';
    if (!isBuy) continue;
    const bars = barsBySymbol.get(r.symbol);
    if (!bars) continue;
    const idx = bars.findIndex((b) => b.date === r.date);
    if (idx < 0 || idx + BACKTEST_HOLD_DAYS >= bars.length) continue;
    const entry = bars[idx + 1]!.close;
    const exit = bars[idx + BACKTEST_HOLD_DAYS]!.close;
    if (entry <= 0) continue;
    returns.push(((exit - entry) / entry) * 100);
  }
  if (returns.length === 0) {
    return { label, signalCount: 0, winRatePct: 0, avgReturnPct: 0, maxLossPct: 0, maxDrawdownPct: 0 };
  }
  const wins = returns.filter((x) => x > 0).length;
  let equity = 100;
  let peak = 100;
  let maxDd = 0;
  for (const r of returns) {
    equity *= 1 + r / 100;
    peak = Math.max(peak, equity);
    maxDd = Math.max(maxDd, ((peak - equity) / peak) * 100);
  }
  return {
    label,
    signalCount: returns.length,
    winRatePct: Math.round((wins / returns.length) * 1000) / 10,
    avgReturnPct: Math.round((returns.reduce((a, b) => a + b, 0) / returns.length) * 100) / 100,
    maxLossPct: Math.round(Math.min(...returns) * 100) / 100,
    maxDrawdownPct: Math.round(maxDd * 100) / 100,
  };
}

export type ParamSweepRow = {
  holdBand: string;
  momentumMinPct: number;
  ruleBuy: number;
  ruleBuyPct: number;
  finalBuy: number;
  finalBuyPct: number;
};

export function sweepRuleParams(
  baseRows: Array<{
    date: string;
    symbol: string;
    market: ProbeSymbol['market'];
    dayChangePct: number;
    rsi14: number | null;
    close: number;
    weightPct: number;
  }>,
  holdBands: Array<{ min: number; max: number; label: string }>,
  momentumMins: number[],
): ParamSweepRow[] {
  const total = baseRows.length || 1;
  const out: ParamSweepRow[] = [];
  for (const band of holdBands) {
    for (const mom of momentumMins) {
      const params: RuleSimParams = {
        holdMinExclusive: band.min,
        holdMaxExclusive: band.max,
        momentumMinPct: mom,
      };
      const simRows = baseRows.map((b) =>
        evaluateSymbolDayWithRuleParams({ ...b, ruleParams: params, productionLikeAiConflict: true }),
      );
      const ruleC = countRuleActions(simRows);
      const finalC = countFinalActions(simRows);
      out.push({
        holdBand: band.label,
        momentumMinPct: mom,
        ruleBuy: ruleC.buy,
        ruleBuyPct: Math.round((ruleC.buy / total) * 1000) / 10,
        finalBuy: finalC.buy,
        finalBuyPct: Math.round((finalC.buy / total) * 1000) / 10,
      });
    }
  }
  return out.filter((r) => r.ruleBuyPct >= 4 && r.ruleBuyPct <= 20).sort((a, b) => a.ruleBuyPct - b.ruleBuyPct);
}

export function buildConflictBlockers(rows: EvalRow[]) {
  let aiBuyCount = 0;
  let demotedToWatch = 0;
  for (const r of rows) {
    if (r.aiAction === 'buy') {
      aiBuyCount += 1;
      if (r.finalAction === 'watch' && r.conflict) demotedToWatch += 1;
    }
  }
  return {
    aiBuyCount,
    demotedToWatch,
    ruleBuyCount: rows.filter((r) => r.ruleEffective === 'buy').length,
    finalBuyCount: rows.filter((r) => r.finalAction === 'buy').length,
  };
}
