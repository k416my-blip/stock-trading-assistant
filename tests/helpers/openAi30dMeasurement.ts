/**
 * 30営業日 × OpenAI 第二評価 実測用ヘルパー
 */
import type { ConciergeSymbolEvidence } from '../../src/types/conciergeEvidence';
import type {
  AiSecondEvaluatorAction,
  AiSecondEvaluatorSymbolInput,
  AiSecondEvaluatorSymbolResult,
} from '../../src/types/aiSecondEvaluator';
import type { StrategyAction } from '../../src/types/strategyExecution';
import { resolvePerSymbolRanking } from '../../src/services/hybridRankingConflict';
import {
  actionConfidenceToDirectionScore,
  computeFinalHybridScore,
} from '../../src/services/hybridStrategyScoreFusion';
import { resolveStrategyAction } from '../../src/services/strategyExecutionEngine';
import {
  buildSyntheticEvidence,
  AUDIT_BUSINESS_DAYS,
  computeRsi14At,
  fetchYahooDailyBars,
  toYahooSymbol,
  type DailyBar,
  type ProbeSymbol,
} from './buyAction30dAudit';

export type OpenAiObsRow = {
  date: string;
  symbol: string;
  dayChangePct: number;
  rsi14: number | null;
  ai: AiSecondEvaluatorSymbolResult;
  newsCount: number;
  xPostCount: number;
  newsApiCount: number;
};

export function patchEnrichedInputsForDay(
  base: AiSecondEvaluatorSymbolInput[],
  points: Array<{ symbol: string; dayChangePct: number; rsi14: number | null; close: number }>,
): AiSecondEvaluatorSymbolInput[] {
  const bySym = new Map(points.map((p) => [p.symbol.toUpperCase(), p] as const));
  return base.map((inp) => {
    const p = bySym.get(inp.symbol.toUpperCase());
    if (!p) return inp;
    return {
      ...inp,
      currentPrice: p.close,
      rsi14: p.rsi14,
      rsiValue: p.rsi14,
      rsiSource: 'yahoo_finance',
    };
  });
}

export function cloneEvidenceForDay(
  template: ConciergeSymbolEvidence,
  dayChangePct: number,
  close: number,
): ConciergeSymbolEvidence {
  const prev = close / (1 + dayChangePct / 100);
  return {
    ...template,
    currentPrice: close,
    previousClose: prev,
    intradayChangePct: dayChangePct,
  };
}

export async function loadHistoricalDayInputs(symbols: ProbeSymbol[]): Promise<{
  barsBySymbol: Map<string, DailyBar[]>;
  daySlices: Array<{
    date: string;
    points: Array<{
      symbol: string;
      market: ProbeSymbol['market'];
      dayChangePct: number;
      rsi14: number | null;
      close: number;
    }>;
  }>;
}> {
  const barsBySymbol = new Map<string, DailyBar[]>();
  for (const s of symbols) {
    barsBySymbol.set(s.symbol, await fetchYahooDailyBars(s.yahooSymbol));
  }

  const dateSet = new Set<string>();
  for (const bars of barsBySymbol.values()) {
    const window = bars.slice(-AUDIT_BUSINESS_DAYS - 1);
    for (let i = 1; i < window.length; i++) {
      dateSet.add(window[i]!.date);
    }
  }
  const dates = [...dateSet].sort();

  const daySlices = dates.map((date) => {
    const points: Array<{
      symbol: string;
      market: ProbeSymbol['market'];
      dayChangePct: number;
      rsi14: number | null;
      close: number;
    }> = [];
    for (const s of symbols) {
      const bars = barsBySymbol.get(s.symbol)!;
      const closes = bars.map((b) => b.close);
      const idx = bars.findIndex((b) => b.date === date);
      if (idx < 1) continue;
      const prev = bars[idx - 1]!;
      const cur = bars[idx]!;
      points.push({
        symbol: s.symbol,
        market: s.market,
        dayChangePct: ((cur.close - prev.close) / prev.close) * 100,
        rsi14: computeRsi14At(closes, idx),
        close: cur.close,
      });
    }
    return { date, points };
  });

  return { barsBySymbol, daySlices };
}

export function confidenceBucket(conf: number): string {
  const b = Math.min(90, Math.max(0, Math.floor(conf / 10) * 10));
  return `${b}-${b + 10}`;
}

export function countAiActions(rows: OpenAiObsRow[]): Record<AiSecondEvaluatorAction, number> {
  const c: Record<AiSecondEvaluatorAction, number> = { buy: 0, hold: 0, watch: 0, reduce: 0 };
  for (const r of rows) {
    c[r.ai.action] += 1;
  }
  return c;
}

export function confidenceHistogram(rows: OpenAiObsRow[]): Record<string, number> {
  const h: Record<string, number> = {};
  for (const r of rows) {
    const k = confidenceBucket(r.ai.confidence);
    h[k] = (h[k] ?? 0) + 1;
  }
  return h;
}

export function featureMeans(rows: OpenAiObsRow[]) {
  const n = rows.length || 1;
  const sum = (fn: (r: OpenAiObsRow) => number) => rows.reduce((a, r) => a + fn(r), 0) / n;
  return {
    n: rows.length,
    rsi14Mean: sum((r) => r.rsi14 ?? 50),
    dayChangePctMean: sum((r) => r.dayChangePct),
    newsCountMean: sum((r) => r.newsCount),
    xPostCountMean: sum((r) => r.xPostCount),
    newsApiCountMean: sum((r) => r.newsApiCount),
    aiConfidenceMean: sum((r) => r.ai.confidence),
  };
}

/** 現状の buy を維持し、非 buy を aiScore 降順で buy に昇格させて目標率を近似 */
export type OpenAiHybridRow = {
  date: string;
  symbol: string;
  openAiAction: AiSecondEvaluatorAction;
  confidence: number;
  ruleRaw: StrategyAction;
  ruleEffective: StrategyAction;
  finalAction: AiSecondEvaluatorAction;
  finalScore: number;
  conflict: boolean;
  ruleMatched?: string;
  demotionReason?: string;
};

/** 30d監査と同じルール×OpenAI融合（ruleConfidence 72） */
export function evaluateOpenAiHybridRow(
  input: {
    date: string;
    symbol: string;
    market: ProbeSymbol['market'];
    dayChangePct: number;
    rsi14: number | null;
    close: number;
    weightPct: number;
  },
  ai: Pick<AiSecondEvaluatorSymbolResult, 'action' | 'confidence'>,
): OpenAiHybridRow {
  const regimeId = 'sideways';
  const ruleConfidencePct = 72;
  const sym = buildSyntheticEvidence(input.symbol, input.market, input.dayChangePct, input.close);
  const ruleRaw = resolveStrategyAction(sym, regimeId, input.weightPct, input.rsi14, {
    skipRsiOversoldGuard: true,
  });
  const ruleEffective = resolveStrategyAction(sym, regimeId, input.weightPct, input.rsi14);
  const ranking = resolvePerSymbolRanking(
    ruleRaw,
    ruleConfidencePct,
    ai.action,
    ai.confidence,
    ruleEffective,
  );
  const aiScore = actionConfidenceToDirectionScore(ai.action, ai.confidence);
  const finalScore = computeFinalHybridScore(ranking.ruleScore, aiScore);

  let demotionReason: string | undefined;
  if (ai.action === 'buy' && ranking.finalAction !== 'buy') {
    if (ranking.conflict) {
      demotionReason = 'conflict: ruleRaw=reduce × OpenAI buy (conf≥65) → finalAction=watch';
    } else if (ruleEffective === 'watch' && ruleRaw === 'reduce') {
      demotionReason = 'RSI oversold guard: ruleEffective=watch (ruleRaw=reduce) → finalAction=watch';
    } else {
      demotionReason = `unexpected: finalAction=${ranking.finalAction}`;
    }
  }

  return {
    date: input.date,
    symbol: input.symbol,
    openAiAction: ai.action,
    confidence: ai.confidence,
    ruleRaw,
    ruleEffective,
    finalAction: ranking.finalAction,
    finalScore,
    conflict: ranking.conflict,
    demotionReason,
  };
}

export function simulateTargetBuyRate(
  rows: OpenAiObsRow[],
  targetPct: number,
): { targetCount: number; selectedBuy: number; marginalFromHold: number } {
  const total = rows.length;
  const targetCount = Math.round((total * targetPct) / 100);
  const currentBuy = rows.filter((r) => r.ai.action === 'buy').length;
  const need = Math.max(0, targetCount - currentBuy);
  const candidates = rows
    .filter((r) => r.ai.action !== 'buy')
    .map((r) => ({
      ...r,
      aiScore: actionConfidenceToDirectionScore(r.ai.action, r.ai.confidence),
    }))
    .sort((a, b) => b.aiScore - a.aiScore);
  return {
    targetCount,
    selectedBuy: currentBuy + Math.min(need, candidates.length),
    marginalFromHold: candidates.slice(0, need).filter((c) => c.ai.action === 'hold').length,
  };
}
