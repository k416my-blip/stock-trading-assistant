/**
 * 戦略ルール ruleScore の監査（resolveAction + confidencePct + directionScore）
 */
import type { ConciergeSymbolEvidence } from '../types/conciergeEvidence';
import type { StrategyAction } from '../types/strategyExecution';
import { actionConfidenceToDirectionScore, ruleActionToDirectionScore } from './hybridStrategyScoreFusion';
import { resolveStrategyAction } from './strategyExecutionEngine';
import { scoreNewsImportance } from './eventImportanceScorer';

export type RuleDecisionStep = {
  ruleName: string;
  matched: boolean;
  wouldReturn: StrategyAction | null;
  reason: string;
};

export type ConfidenceLineItem = {
  ruleName: string;
  scoreImpact: number;
  runningConfidencePct: number;
  reason: string;
};

export type RuleScoreAudit = {
  symbol: string;
  regimeId: string;
  portfolioWeightPct: number;
  resolvedAction: StrategyAction;
  decisionChain: RuleDecisionStep[];
  confidenceLineItems: ConfidenceLineItem[];
  rawConfidencePct: number;
  ruleScore: number;
  directionScoreFormulaJa: string;
  ruleRows: Array<{ ruleName: string; scoreImpact: number; reason: string }>;
};

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

/** resolveAction と同じ分岐（最初にマッチした条件を記録） */
export function auditResolveActionChain(
  sym: ConciergeSymbolEvidence,
  regimeId: string,
  weight: number,
  rsi14?: number | null,
): { action: StrategyAction; chain: RuleDecisionStep[] } {
  const ch = sym.intradayChangePct ?? 0;
  const bear = sym.xSentiment?.bearishPct ?? 0;
  const flags = sym.unusualActivityFlags.length;

  const checks: RuleDecisionStep[] = [
    {
      ruleName: 'panic_regime_avoid',
      matched: regimeId === 'panic' && (ch < -4 || bear >= 60),
      wouldReturn: 'avoid',
      reason: `regime=${regimeId}, 日中${ch.toFixed(1)}%, bear=${bear}%`,
    },
    {
      ruleName: 'sharp_drop_or_bearish_reduce',
      matched: ch <= -5 || (bear >= 65 && flags > 0),
      wouldReturn:
        rsi14 != null && rsi14 < 30 && (ch <= -5 || (bear >= 65 && flags > 0)) ? 'watch' : 'reduce',
      reason:
        rsi14 != null && rsi14 < 30
          ? `日中急落だが RSI ${rsi14}<30 のため watch に抑止`
          : `日中≤-5% または bear≥65%かつ異常フラグ`,
    },
    {
      ruleName: 'held_stock_neutral_hold',
      matched: Boolean(sym.portfolioHolding && ch > -2 && ch < 4 && bear < 50),
      wouldReturn: 'hold',
      reason: `保有あり・日中(-2,4)・bear<50%`,
    },
    {
      ruleName: 'momentum_buy',
      matched: ch >= 3 && bear < 45 && flags === 0 && regimeId !== 'panic',
      wouldReturn: 'buy',
      reason: `日中≥+3%・bear<45%・フラグなし`,
    },
    {
      ruleName: 'heavy_weight_drawdown_reduce',
      matched: weight >= 20 && ch < -3,
      wouldReturn: 'reduce',
      reason: `保有ウェイト${weight.toFixed(0)}%≥20 かつ 日中${ch.toFixed(1)}%<-3%`,
    },
    {
      ruleName: 'volatility_watch',
      matched: flags > 0 || Math.abs(ch) >= 2.5,
      wouldReturn: 'watch',
      reason: `異常フラグ${flags}件 または |日中|≥2.5%`,
    },
    {
      ruleName: 'default_hold',
      matched: true,
      wouldReturn: 'hold',
      reason: '上記いずれにも非該当',
    },
  ];

  const winner = checks.find((s) => s.matched)!;
  const steps = checks.map((s) => ({
    ...s,
    matched: s.ruleName === winner.ruleName,
  }));
  const action = resolveStrategyAction(sym, regimeId, weight, rsi14);
  return { action, chain: steps };
}

export function auditConfidencePct(
  sym: ConciergeSymbolEvidence,
  action: StrategyAction,
  weight: number,
): { items: ConfidenceLineItem[]; total: number } {
  const items: ConfidenceLineItem[] = [];
  let c = 50;
  items.push({ ruleName: 'base', scoreImpact: 50, runningConfidencePct: c, reason: '起点' });

  if (sym.unusualActivityFlags.length > 0) {
    c += 10;
    items.push({
      ruleName: 'unusual_activity_flags',
      scoreImpact: 10,
      runningConfidencePct: c,
      reason: `異常フラグ ${sym.unusualActivityFlags.length}件`,
    });
  }
  if (sym.xSentiment && sym.xSentiment.postCount >= 5) {
    c += 8;
    items.push({
      ruleName: 'x_posts_5plus',
      scoreImpact: 8,
      runningConfidencePct: c,
      reason: `X投稿 ${sym.xSentiment.postCount}件`,
    });
  }
  if (sym.latestFinancialNews.length > 0) {
    c += 6;
    items.push({
      ruleName: 'has_financial_news',
      scoreImpact: 6,
      runningConfidencePct: c,
      reason: `ニュース見出し ${sym.latestFinancialNews.length}件`,
    });
  }
  if (sym.quoteIsStale) {
    c -= 15;
    items.push({
      ruleName: 'stale_quote_penalty',
      scoreImpact: -15,
      runningConfidencePct: c,
      reason: '株価が stale',
    });
  }
  if (action === 'buy' || action === 'reduce') {
    c += 5;
    items.push({
      ruleName: 'actionable_buy_or_reduce',
      scoreImpact: 5,
      runningConfidencePct: c,
      reason: `action=${action} ボーナス`,
    });
  }
  const weightBonus = Math.min(12, weight * 0.4);
  if (weightBonus > 0) {
    c += weightBonus;
    items.push({
      ruleName: 'portfolio_weight_bonus',
      scoreImpact: Math.round(weightBonus * 10) / 10,
      runningConfidencePct: clamp(c),
      reason: `保有ウェイト ${weight.toFixed(1)}% → +min(12, weight×0.4)`,
    });
  }

  return { items, total: clamp(c) };
}

export function auditStrategyRuleScore(
  sym: ConciergeSymbolEvidence,
  regimeId: string,
  portfolioWeightPct: number,
): RuleScoreAudit {
  const { action, chain } = auditResolveActionChain(sym, regimeId, portfolioWeightPct);
  const { items, total } = auditConfidencePct(sym, action, portfolioWeightPct);
  const ruleScore = ruleActionToDirectionScore(action, total);

  const ruleRows: Array<{ ruleName: string; scoreImpact: number; reason: string }> = [];

  for (const step of chain.filter((s) => s.matched)) {
    ruleRows.push({
      ruleName: `resolveAction:${step.ruleName}`,
      scoreImpact: 0,
      reason: `→ action=${step.wouldReturn} (${step.reason})`,
    });
  }

  for (const line of items) {
    if (line.ruleName === 'base') continue;
    let impactOnRuleScore = 0;
    if (action === 'reduce' || action === 'avoid') {
      impactOnRuleScore = -line.scoreImpact;
    } else if (action === 'buy') {
      impactOnRuleScore = line.scoreImpact;
    }
    ruleRows.push({
      ruleName: `confidence:${line.ruleName}`,
      scoreImpact: impactOnRuleScore,
      reason: `${line.reason} → confidence ${line.runningConfidencePct}%`,
    });
  }

  const directionFormula =
    action === 'reduce' || action === 'avoid'
      ? `ruleScore = 100 - confidencePct = 100 - ${total} = ${ruleScore}`
      : action === 'buy'
        ? `ruleScore = confidencePct = ${total}`
        : action === 'hold'
          ? `ruleScore = 50 (hold固定)`
          : `ruleScore = 45 (watch固定)`;

  return {
    symbol: sym.symbol,
    regimeId,
    portfolioWeightPct,
    resolvedAction: action,
    decisionChain: chain,
    confidenceLineItems: items,
    rawConfidencePct: total,
    ruleScore,
    directionScoreFormulaJa: directionFormula,
    ruleRows,
  };
}

export type AiRuleConflictReport = {
  symbol: string;
  ruleAction: StrategyAction;
  aiAction: string;
  aiConfidence: number;
  ruleScore: number;
  aiScore: number;
  conflict: boolean;
  conflictReasonJa: string;
  ruleTriggeredJa: string;
  aiLikelyReasonJa: string;
};

export function explainAiRuleConflict(
  sym: ConciergeSymbolEvidence,
  regimeId: string,
  weightPct: number,
  aiAction: 'buy' | 'reduce' | 'hold' | 'watch',
  aiConfidence: number,
  rsi14: number | null,
): AiRuleConflictReport {
  const audit = auditStrategyRuleScore(sym, regimeId, weightPct);
  const aiScore = actionConfidenceToDirectionScore(aiAction, aiConfidence);
  const conflict =
    (aiAction === 'buy' && (audit.resolvedAction === 'reduce' || audit.resolvedAction === 'avoid')) ||
    (aiAction === 'reduce' && audit.resolvedAction === 'buy');

  const matchedRule = audit.decisionChain.find((s) => s.matched && s.wouldReturn === audit.resolvedAction);

  let aiLikelyReasonJa = 'OpenAI第二評価 — RSI・ニュース・保有損益を総合';
  if (rsi14 != null && rsi14 <= 30 && aiAction === 'buy') {
    aiLikelyReasonJa = `RSI ${rsi14} 売られすぎ — AIは逆張り買い寄り（ルールは日中/Xの売りシグナル優先）`;
  } else if (rsi14 != null && rsi14 >= 70 && aiAction === 'reduce') {
    aiLikelyReasonJa = `RSI ${rsi14} 買われすぎ — AIは利確/reduce寄り`;
  }

  return {
    symbol: sym.symbol,
    ruleAction: audit.resolvedAction,
    aiAction,
    aiConfidence,
    ruleScore: audit.ruleScore,
    aiScore,
    conflict,
    conflictReasonJa: conflict
      ? `ルールは「${audit.resolvedAction}」(ruleScore ${audit.ruleScore}) だが AI は「${aiAction}」${aiConfidence}% (aiScore ${aiScore})。inputs が別系統のため。`
      : '矛盾なし',
    ruleTriggeredJa: matchedRule
      ? `${matchedRule.ruleName}: ${matchedRule.reason}`
      : '—',
    aiLikelyReasonJa,
  };
}

/** シミュレーション用 — 1155 operational 想定 evidence */
export function buildMaybank1155OperationalEvidence(): ConciergeSymbolEvidence {
  return {
    symbol: '1155',
    companyName: 'Malayan Banking Berhad',
    market: 'bursa',
    displayLabelJa: 'マレー銀行 (1155)',
    currentPrice: 10.2,
    previousClose: 10.8,
    intradayChangePct: -5.6,
    volume: 2_000_000,
    volumeSurgeRatio: 1.2,
    quoteAgeSeconds: 120,
    quoteIsStale: false,
    portfolioHolding: {
      shares: 500,
      averageBuyPrice: 9.8,
      unrealizedPnlPct: 4.1,
    },
    latestFinancialNews: [{ title: 'Maybank earnings', sentiment: '中立' }],
    newsSummaryJa: '決算関連',
    newsSource: 'News',
    xSentiment: {
      postCount: 8,
      bullishPct: 40,
      bearishPct: 35,
      panicPct: 5,
      hypePct: 10,
      trendWords: [],
      postSurgeRatePct: null,
      summaryJa: '中立',
      fromCache: true,
      analysisBasis: 'cache',
    },
    trendingKeywords: [],
    unusualActivityFlags: [],
    dataGapsJa: [],
  };
}

export function computeNewsScoreForSymbol(sym: ConciergeSymbolEvidence): number {
  return scoreNewsImportance(sym.latestFinancialNews);
}

export function computeRsiDirectionScore(rsi14: number | null): number {
  if (rsi14 == null) return 50;
  if (rsi14 <= 30) return clamp(50 + (30 - rsi14) * 1.2);
  if (rsi14 >= 70) return clamp(50 - (rsi14 - 70) * 1.2);
  return 50;
}

export function computePriceActionScore(intradayChangePct: number | null): number {
  const ch = intradayChangePct ?? 0;
  return clamp(50 + ch * 4);
}

export function computeRiskPenalty(sym: ConciergeSymbolEvidence): number {
  let p = 0;
  p += sym.unusualActivityFlags.length * 8;
  if (sym.quoteIsStale) p += 15;
  if ((sym.xSentiment?.bearishPct ?? 0) >= 65) p += 10;
  return p;
}
