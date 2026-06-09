/**
 * AI Strategy Execution Layer — 具体的アクション・タイミング・配分
 */
import {
  POSITION_SIZE_BY_TACTICAL,
  STRATEGY_ACTION_LABELS_JA,
  regimeStrategyJa,
} from '../constants/strategyExecution';
import type { ConciergeSymbolEvidence } from '../types/conciergeEvidence';
import type { GlobalMarketAnalysisBundle } from '../types/globalMarketAnalysis';
import type { PortfolioIntelligenceBundle } from '../types/portfolioIntelligence';
import type {
  BuildStrategyExecutionInput,
  EntryTimingKind,
  ExitTimingKind,
  MacroStrategyNote,
  PortfolioAllocationAdvice,
  StrategyAction,
  StrategyBacktestNote,
  StrategyExecutionBundle,
  StrategyIntent,
  StrategyRiskReward,
  StrategySymbolRecommendation,
  TacticalMode,
} from '../types/strategyExecution';
import type { StrategyExecutionPersisted } from './strategyExecutionStorage';
import { isStrategyCooldownActive } from './strategyExecutionStorage';

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

export type ResolveStrategyActionOptions = {
  /** true のとき RSI 売られすぎガードをスキップ（矛盾検出用の生ルール） */
  skipRsiOversoldGuard?: boolean;
};

/** 戦略ルール action（RSI&lt;30 時は急落 reduce を watch に抑止） */
export function resolveStrategyAction(
  sym: ConciergeSymbolEvidence,
  regimeId: string,
  weight: number,
  rsi14?: number | null,
  options?: ResolveStrategyActionOptions,
): StrategyAction {
  const ch = sym.intradayChangePct ?? 0;
  const bear = sym.xSentiment?.bearishPct ?? 0;
  const flags = sym.unusualActivityFlags.length;

  if (regimeId === 'panic' && (ch < -4 || bear >= 60)) return 'avoid';
  if (ch <= -5 || (bear >= 65 && flags > 0)) {
    if (!options?.skipRsiOversoldGuard && rsi14 != null && rsi14 < 30) return 'watch';
    return 'reduce';
  }
  if (sym.portfolioHolding && ch > -2 && ch < 4 && bear < 50) return 'hold';
  if (ch >= 3 && bear < 45 && flags === 0 && regimeId !== 'panic') return 'buy';
  if (weight >= 20 && ch < -3) return 'reduce';
  if (flags > 0 || Math.abs(ch) >= 2.5) return 'watch';
  return 'hold';
}

function resolveAction(sym: ConciergeSymbolEvidence, regimeId: string, weight: number): StrategyAction {
  return resolveStrategyAction(sym, regimeId, weight);
}

function resolveIntent(action: StrategyAction, confidence: number): StrategyIntent {
  if (action === 'watch') return 'watch';
  if (action === 'hold' && confidence < 55) return 'watch';
  if (action === 'buy' || action === 'reduce' || action === 'avoid') return 'action';
  return confidence >= 62 ? 'action' : 'watch';
}

function entryTiming(sym: ConciergeSymbolEvidence): EntryTimingKind {
  const ch = sym.intradayChangePct ?? 0;
  const vol = sym.volumeSurgeRatio ?? 1;
  const bear = sym.xSentiment?.bearishPct ?? 0;
  if (ch >= 4 && vol >= 2) return 'breakout';
  if (ch <= -4 && bear >= 55) return 'oversold_rebound';
  if (ch < 0 && ch > -3 && vol < 1.5) return 'pullback';
  if (ch > 1 && ch < 4) return 'trend_continuation';
  return 'none';
}

function exitTiming(sym: ConciergeSymbolEvidence): ExitTimingKind {
  const ch = sym.intradayChangePct ?? 0;
  const pnl = sym.portfolioHolding?.unrealizedPnlPct ?? 0;
  if (pnl >= 15 || ch >= 6) return 'take_profit_zone';
  if (ch <= -5 || pnl <= -12) return 'stop_loss_risk';
  if (ch > 4 && (sym.xSentiment?.hypePct ?? 0) >= 35) return 'trend_exhaustion';
  return 'none';
}

function riskReward(sym: ConciergeSymbolEvidence, action: StrategyAction): StrategyRiskReward {
  const ch = sym.intradayChangePct ?? 0;
  const vol = sym.volumeSurgeRatio ?? 1;
  let upside = clamp(8 + Math.max(0, ch) * 1.2 + (vol > 2 ? 4 : 0));
  let downside = clamp(8 + Math.abs(Math.min(0, ch)) * 1.5 + (sym.xSentiment?.bearishPct ?? 0) * 0.08);
  if (action === 'avoid' || action === 'reduce') {
    upside = clamp(upside * 0.5);
    downside = clamp(downside * 1.3);
  }
  const ratio = downside > 0 ? Math.round((upside / downside) * 10) / 10 : null;
  return {
    expectedUpsidePct: upside,
    downsideRiskPct: downside,
    rewardRiskRatio: ratio,
    summaryJa: ratio != null ? `上振れ目安 +${upside}% / 下振れ -${downside}% · R/R ${ratio}` : `上振れ +${upside}% / 下振れ -${downside}%`,
  };
}

function confidencePct(sym: ConciergeSymbolEvidence, action: StrategyAction, weight: number): number {
  let c = 50;
  if (sym.unusualActivityFlags.length) c += 10;
  if (sym.xSentiment && sym.xSentiment.postCount >= 5) c += 8;
  if (sym.latestFinancialNews.length) c += 6;
  if (sym.quoteIsStale) c -= 15;
  if (action === 'buy' || action === 'reduce') c += 5;
  c += Math.min(12, weight * 0.4);
  return clamp(c);
}

function analystExplanation(
  sym: ConciergeSymbolEvidence,
  action: StrategyAction,
  entry: EntryTimingKind,
  exit: ExitTimingKind,
  rr: StrategyRiskReward,
): string {
  const parts = [
    `${sym.displayLabelJa}は${STRATEGY_ACTION_LABELS_JA[action]}が妥当な局面です。`,
    entry !== 'none' ? `エントリーは${entry}パターンを意識。` : null,
    exit !== 'none' ? `出口は${exit}のリスクを監視。` : null,
    rr.summaryJa,
    '最終判断は証券会社アプリで手動実行してください（参考）。',
  ].filter(Boolean);
  return parts.join(' ');
}

function opportunityScore(sym: ConciergeSymbolEvidence, action: StrategyAction): number {
  const ch = sym.intradayChangePct ?? 0;
  let s = 40;
  if (action === 'buy') s += 25;
  if (ch > 0) s += ch * 3;
  if ((sym.xSentiment?.bullishPct ?? 0) >= 50) s += 10;
  return clamp(s);
}

function threatScore(sym: ConciergeSymbolEvidence, action: StrategyAction): number {
  const ch = sym.intradayChangePct ?? 0;
  let s = 30;
  if (action === 'avoid' || action === 'reduce') s += 30;
  if (ch < 0) s += Math.abs(ch) * 4;
  if ((sym.xSentiment?.bearishPct ?? 0) >= 55) s += 15;
  return clamp(s);
}

function buildSymbolRec(
  sym: ConciergeSymbolEvidence,
  input: BuildStrategyExecutionInput,
  tactical: TacticalMode,
  cooldownActive: boolean,
): StrategySymbolRecommendation {
  const regimeId = input.regimeId ?? 'unknown';
  const weight = input.symbolWeightPct[sym.symbol.toUpperCase()] ?? 0;
  let action = resolveAction(sym, regimeId, weight);
  if (cooldownActive && (action === 'buy' || action === 'reduce')) {
    action = 'watch';
  }
  const conf = confidencePct(sym, action, weight);
  const intent = resolveIntent(action, conf);
  const sizes = POSITION_SIZE_BY_TACTICAL[tactical];
  const entry = entryTiming(sym);
  const exit = exitTiming(sym);
  const rr = riskReward(sym, action);

  return {
    symbol: sym.symbol,
    market: sym.market,
    displayLabelJa: sym.displayLabelJa,
    action,
    intent,
    confidencePct: conf,
    entryTiming: entry,
    exitTiming: exit,
    riskReward: rr,
    analystExplanationJa: analystExplanation(sym, action, entry, exit, rr),
    whyProposedJa: `レジーム${regimeId} · 保有${weight.toFixed(0)}% · ${sym.unusualActivityFlags[0]?.labelJa ?? '通常変動'}`,
    positionSizePct: sizes,
    opportunityScore: opportunityScore(sym, action),
    threatScore: threatScore(sym, action),
  };
}

function buildMacroNotes(global: GlobalMarketAnalysisBundle | null): MacroStrategyNote[] {
  if (!global) return [{ labelJa: 'マクロ', impactJa: 'ライブマクロ未取得 — 戦略はテクニカル中心' }];
  const notes: MacroStrategyNote[] = [];
  for (const r of global.rates.slice(0, 2)) {
    notes.push({
      labelJa: r.labelJa,
      impactJa: `${r.value ?? '—'}${r.unitJa}（${r.changePct != null ? `${r.changePct >= 0 ? '+' : ''}${r.changePct.toFixed(1)}%` : '—'}）`,
    });
  }
  for (const f of global.forex.slice(0, 1)) {
    notes.push({ labelJa: f.labelJa, impactJa: '為替 — 輸出・金利敏感セクターへ影響' });
  }
  notes.push({
    labelJa: '雇用・CPI・FOMC',
    impactJa: global.macroContextBulletsJa[0] ?? '公式イベントはニュースとレジームで間接反映',
  });
  return notes.slice(0, 4);
}

function buildAllocation(
  intel: PortfolioIntelligenceBundle | null,
  tactical: TacticalMode,
  regimeId: string,
  cashEstimate: number,
): PortfolioAllocationAdvice {
  const concentration = intel?.portfolioRisk.concentrationScore ?? 40;
  let cash = cashEstimate;
  if (tactical === 'defensive' || regimeId === 'panic') cash = Math.max(cash, 25);
  if (tactical === 'aggressive' && regimeId === 'bullish') cash = Math.min(cash, 10);
  return {
    sectorBalanceJa: intel?.portfolioRisk.sectorBiasJa.join(' · ') ?? 'セクター情報なし',
    concentrationJa:
      concentration >= 55
        ? `集中度 ${concentration} — 1銘柄依存を下げる`
        : `集中度 ${concentration} — 概ね分散`,
    recommendedCashRatioPct: clamp(cash, 5, 40),
    cashRatioRationaleJa:
      regimeId === 'panic'
        ? '市場パニック — 現金比率を一時的に高めに'
        : '戦術モードとレジームに応じた目安（参考）',
  };
}

function buildBacktest(intel: PortfolioIntelligenceBundle | null): StrategyBacktestNote | null {
  const acc = intel?.accuracy;
  if (!acc || acc.evaluatedCount < 3) {
    return {
      labelJa: '簡易バックテスト',
      detailJa: '評価件数不足 — ルール提案の過去検証は限定的',
      sampleSize: acc?.evaluatedCount ?? 0,
    };
  }
  const pct = acc.shortTermAccuracyPct ?? acc.mediumTermAccuracyPct;
  return {
    labelJa: '予測追跡ベース検証',
    detailJa: `直近AI予測精度 ${pct ?? '—'}%（${acc.evaluatedCount}件評価）— 提案ロジックの参考`,
    sampleSize: acc.evaluatedCount,
  };
}

export function buildStrategyExecutionBundle(
  input: BuildStrategyExecutionInput,
  persisted: StrategyExecutionPersisted,
): StrategyExecutionBundle {
  const regimeId = input.regimeId ?? 'unknown';
  const cooldown = isStrategyCooldownActive(persisted.cooldownLog);
  const recs = input.evidenceSymbols.map((s) =>
    buildSymbolRec(s, input, input.tacticalMode, cooldown.active),
  );

  const actions = recs.filter((r) => r.intent === 'action');
  const watches = recs.filter((r) => r.intent === 'watch');

  const opportunities = [...recs]
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 6)
    .map((r, i) => ({
      rank: i + 1,
      symbol: r.symbol,
      labelJa: r.displayLabelJa,
      score: r.opportunityScore,
    }));

  const threats = [...recs]
    .sort((a, b) => b.threatScore - a.threatScore)
    .slice(0, 6)
    .map((r, i) => ({
      rank: i + 1,
      symbol: r.symbol,
      labelJa: r.displayLabelJa,
      score: r.threatScore,
    }));

  const todayRecommendations = actions
    .filter((r) => r.action === 'buy' || r.action === 'reduce' || r.action === 'hold')
    .sort((a, b) => b.confidencePct - a.confidencePct)
    .slice(0, 5);

  const dangerAvoid = recs
    .filter((r) => r.action === 'avoid' || r.action === 'reduce')
    .sort((a, b) => b.threatScore - a.threatScore)
    .slice(0, 4);

  const highExpectancy = [...recs]
    .filter((r) => r.riskReward.rewardRiskRatio != null && r.riskReward.rewardRiskRatio >= 1.2)
    .sort((a, b) => (b.riskReward.rewardRiskRatio ?? 0) - (a.riskReward.rewardRiskRatio ?? 0))
    .slice(0, 4);

  const overallConfidence =
    recs.length > 0
      ? Math.round(recs.reduce((s, r) => s + r.confidencePct, 0) / recs.length)
      : 50;

  const learning = [
    ...(input.portfolioIntel?.successPatterns.map((p) => `成功: ${p.labelJa}`) ?? []),
    ...(input.portfolioIntel?.lossPatterns.map((p) => `注意: ${p.labelJa}`) ?? []),
  ].slice(0, 4);

  const predictionAccuracyJa = input.portfolioIntel?.accuracy.evaluatedCount
    ? `短期 ${input.portfolioIntel.accuracy.shortTermAccuracyPct ?? '—'}% / 中期 ${input.portfolioIntel.accuracy.mediumTermAccuracyPct ?? '—'}%（${input.portfolioIntel.accuracy.evaluatedCount}件）`
    : null;

  return {
    generatedAt: new Date().toISOString(),
    tacticalMode: input.tacticalMode,
    regimeId,
    regimeStrategyJa: regimeStrategyJa(regimeId),
    todayRecommendations,
    dangerAvoid,
    watchList: watches.slice(0, 6),
    highExpectancy,
    opportunities,
    threats,
    allocation: buildAllocation(
      input.portfolioIntel,
      input.tacticalMode,
      regimeId,
      input.cashRatioPctEstimate ?? 15,
    ),
    overallConfidencePct: overallConfidence,
    macroNotes: buildMacroNotes(input.globalMarket),
    learningFeedbackJa: learning.length ? learning : ['学習パターンは蓄積中'],
    predictionAccuracyJa,
    backtest: buildBacktest(input.portfolioIntel),
    journalRecent: persisted.journal.slice(0, 6),
    cooldownActive: cooldown.active,
    cooldownNoteJa: cooldown.noteJa,
  };
}
