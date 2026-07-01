/**
 * 売買シグナルが無いときも必ず表示する AI 日次コメント
 * 優先: ①売買シグナル ②リスク警告 ③ニュース異常 ④AI日次コメント
 *
 * 保有あり: 保有評価・含み損益・配当・リスク（候補ランキングは出さない）
 * 保有なし: 候補銘柄ランキングのみ
 */
import { getSamplePriceHistory } from '../data/sampleStocks';
import type { DividendRecord, PortfolioPosition } from '../types/index';
import type {
  PortfolioAiEvaluationBundle,
  PortfolioAiSymbolEvaluation,
} from '../types/portfolioAiEvaluation';
import type { StrategyExecutionBundle } from '../types/strategyExecution';
import type { UrgencySignal } from '../types/urgencySignal';
import { logDailyCommentTarget } from './conciergeEvidenceTrace';
import { analyzeTechnicals } from './technicalAnalysis';
import { buildTradeSuggestion } from './tradeSuggestions';

export type AiDailyCommentSection = {
  priority: 1 | 2 | 3 | 4;
  kind: 'trade_signal' | 'risk_warning' | 'news_anomaly' | 'daily_comment';
  titleJa: string;
  bodyJa: string;
};

export type AiDailyCommentBundle = {
  headlineJa: string;
  portfolioScore?: number;
  holdingCount?: number;
  todaySummaryJa: string;
  topProfitLines: string[];
  cautionLines: string[];
  recommendedActions: string[];
  sections: AiDailyCommentSection[];
};

const ACTION_LABEL_JA: Record<string, string> = {
  buy: '買い',
  hold: '保有継続',
  reduce: '減らす',
  watch: '様子見',
  avoid: '回避',
};

function activeHoldings(holdings: PortfolioPosition[]): PortfolioPosition[] {
  return holdings.filter((h) => (h.shares ?? 0) > 0);
}

function pnlPct(h: PortfolioPosition): number | null {
  if (h.averageBuyPrice <= 0 || h.currentPrice <= 0) return null;
  return ((h.currentPrice - h.averageBuyPrice) / h.averageBuyPrice) * 100;
}

function displayName(h: PortfolioPosition): string {
  return h.companyName?.trim() || h.symbol;
}

function formatPnlLine(h: PortfolioPosition): string {
  const pct = pnlPct(h);
  const label = displayName(h);
  if (pct == null) return `${label}（${h.symbol}）— 損益率 未取得`;
  const sign = pct >= 0 ? '+' : '';
  return `${label}（${h.symbol}） ${sign}${pct.toFixed(1)}%`;
}

function takeProfitRemainingPct(h: PortfolioPosition): number | null {
  if (h.currentPrice <= 0) return null;
  const technicals = analyzeTechnicals(getSamplePriceHistory(h.symbol));
  const { takeProfit } = buildTradeSuggestion(h.currentPrice, technicals);
  if (takeProfit <= 0) return null;
  if (h.currentPrice >= takeProfit) return 0;
  return ((takeProfit - h.currentPrice) / h.currentPrice) * 100;
}

function buildHoldingLeadLine(h: PortfolioPosition): string {
  const pct = pnlPct(h);
  const name = displayName(h);
  const sign = pct != null && pct >= 0 ? '+' : '';
  const base =
    pct != null ? `${name}は現在${sign}${pct.toFixed(1)}%` : `${name}は損益率未取得`;
  const tpRem = takeProfitRemainingPct(h);
  if (tpRem != null && tpRem > 0.05) {
    return `${base}。利確目安まで残り${tpRem.toFixed(1)}%です。`;
  }
  if (tpRem != null && tpRem <= 0.05) {
    return `${base}。利確目安付近です。`;
  }
  return `${base}。`;
}

function evalForHolding(
  h: PortfolioPosition,
  portfolio: PortfolioAiEvaluationBundle | null,
): PortfolioAiSymbolEvaluation | undefined {
  const sym = h.symbol.toUpperCase();
  return portfolio?.rankedHoldings.find((e) => e.symbol.toUpperCase() === sym);
}

function formatHoldingEvalLine(
  h: PortfolioPosition,
  evalRow: PortfolioAiSymbolEvaluation | undefined,
): string {
  const name = displayName(h);
  if (!evalRow) return `保有評価: ${name} — AI評価未取得。`;
  const actionLabel = ACTION_LABEL_JA[evalRow.action] ?? evalRow.action;
  return `保有評価: ${name} — スコア ${evalRow.finalScore} · ${actionLabel}。`;
}

function formatDividendEval(
  dividends: DividendRecord[],
  holdings: PortfolioPosition[],
): string {
  if (dividends.length === 0) {
    return '配当評価: 記録なし — 受取後に登録すると反映されます。';
  }
  const holdingSyms = new Set(holdings.map((h) => h.symbol.toUpperCase()));
  const related = dividends.filter((d) => holdingSyms.has(d.symbol.toUpperCase()));
  if (related.length === 0) {
    return `配当評価: 登録 ${dividends.length}件（保有銘柄外）。`;
  }
  const total = related.reduce((sum, d) => sum + (Number.isFinite(d.amount) ? d.amount : 0), 0);
  return `配当評価: 保有銘柄 ${related.length}件 · 合計 ${total.toFixed(2)}。`;
}

function formatRiskEval(
  holdings: PortfolioPosition[],
  portfolio: PortfolioAiEvaluationBundle | null,
  bundle: StrategyExecutionBundle | null,
): string {
  const holdingSyms = new Set(holdings.map((h) => h.symbol.toUpperCase()));
  const holdingWarnings =
    portfolio?.riskWarnings.filter((w) =>
      [...holdingSyms].some((sym) => w.toUpperCase().includes(sym)),
    ) ?? [];
  if (holdingWarnings[0]) {
    return `リスク評価: ${holdingWarnings[0]}`;
  }
  const concentration = bundle?.allocation.concentrationJa?.trim();
  if (concentration && /集中|偏|過多/i.test(concentration)) {
    return `リスク評価: ${concentration}`;
  }
  if (holdings.length === 1) {
    return 'リスク評価: 1銘柄集中 — 分散を検討してください。';
  }
  const reduceEval = portfolio?.rankedHoldings.find(
    (e) => holdingSyms.has(e.symbol.toUpperCase()) && e.action === 'reduce',
  );
  if (reduceEval) {
    return `リスク評価: ${displayName(holdings.find((h) => h.symbol.toUpperCase() === reduceEval.symbol.toUpperCase()) ?? holdings[0])} — 減らしを検討（スコア ${reduceEval.finalScore}）。`;
  }
  return 'リスク評価: 大きな異常なし — 損切・利確ラインを確認。';
}

function buildHoldingFocusedSummary(input: {
  score: number;
  holdings: PortfolioPosition[];
  portfolio: PortfolioAiEvaluationBundle | null;
  bundle: StrategyExecutionBundle | null;
  dividends: DividendRecord[];
}): string {
  const { score, holdings, portfolio, bundle, dividends } = input;
  const sorted = [...holdings]
    .map((h) => ({ h, pct: pnlPct(h) }))
    .sort((a, b) => (b.pct ?? -999) - (a.pct ?? -999));
  const lead = sorted[0]?.h;
  const parts = [`ポートフォリオスコア ${score}/100 · 保有 ${holdings.length} 銘柄。`];
  if (lead) {
    parts.push(buildHoldingLeadLine(lead));
    parts.push(formatHoldingEvalLine(lead, evalForHolding(lead, portfolio)));
  }
  parts.push(formatDividendEval(dividends, holdings));
  parts.push(formatRiskEval(holdings, portfolio, bundle));
  if (bundle?.regimeStrategyJa) {
    parts.push(`戦術: ${bundle.regimeStrategyJa}。`);
  }
  return parts.join(' ');
}

function buildCandidateRankingSummary(input: {
  score: number;
  portfolio: PortfolioAiEvaluationBundle | null;
  bundle: StrategyExecutionBundle | null;
}): string {
  const { score, portfolio, bundle } = input;
  const best = portfolio?.bestToday?.[0];
  const worst = portfolio?.worstToday?.[0];
  let summary = `ポートフォリオスコア ${score}/100 · 保有 0 銘柄。`;
  if (best) {
    summary += ` 本日の強い候補は ${best.displayLabelJa}（${best.symbol}、スコア ${best.finalScore}）。`;
  }
  if (worst && worst.symbol !== best?.symbol) {
    summary += ` 注意候補は ${worst.displayLabelJa}（${worst.symbol}、スコア ${worst.finalScore}）。`;
  }
  if (bundle?.regimeStrategyJa) {
    summary += ` 戦術: ${bundle.regimeStrategyJa}。`;
  }
  return summary;
}

export function buildAiDailyComment(input: {
  bundle: StrategyExecutionBundle | null;
  portfolio: PortfolioAiEvaluationBundle | null;
  holdings: PortfolioPosition[];
  dividends?: DividendRecord[];
  activeSignals?: UrgencySignal[];
  rankingConflictBySymbol?: Record<string, boolean>;
}): AiDailyCommentBundle {
  const portfolio = input.portfolio;
  const bundle = input.bundle;
  const sections: AiDailyCommentSection[] = [];
  const holdings = activeHoldings(input.holdings);
  const hasHoldings = holdings.length > 0;
  const holdingSymbols = new Set(holdings.map((h) => h.symbol.toUpperCase()));

  for (const sig of input.activeSignals ?? []) {
    sections.push({
      priority: 1,
      kind: 'trade_signal',
      titleJa: `売買シグナル · ${sig.actionLabel}`,
      bodyJa: sig.ticker
        ? `${sig.displayName ?? sig.ticker} — ${sig.reason}`
        : sig.reason,
    });
  }

  const riskWarnings = hasHoldings
    ? (portfolio?.riskWarnings.filter((w) =>
        [...holdingSymbols].some((sym) => w.toUpperCase().includes(sym)),
      ) ?? [])
    : (portfolio?.riskWarnings ?? []);

  for (const w of riskWarnings) {
    sections.push({
      priority: 2,
      kind: 'risk_warning',
      titleJa: 'リスク警告',
      bodyJa: w,
    });
  }

  if (!hasHoldings) {
    const concentration = bundle?.allocation.concentrationJa?.trim();
    if (concentration && /集中|偏|過多|リスク/i.test(concentration)) {
      sections.push({
        priority: 2,
        kind: 'risk_warning',
        titleJa: 'セクター / 集中度',
        bodyJa: concentration,
      });
    }
  }

  const newsCandidates = hasHoldings
    ? (portfolio?.worstToday ?? []).filter((item) =>
        holdingSymbols.has(item.symbol.toUpperCase()),
      )
    : (portfolio?.worstToday ?? []);

  for (const item of newsCandidates.slice(0, 2)) {
    if (/ニュース|news|見出し|headline|決算|規制/i.test(item.rationaleJa)) {
      sections.push({
        priority: 3,
        kind: 'news_anomaly',
        titleJa: `ニュース注目 · ${item.symbol}`,
        bodyJa: item.rationaleJa,
      });
    }
  }

  const holdingsWithPnl = [...holdings]
    .map((h) => ({ h, pct: pnlPct(h) }))
    .filter((x) => x.pct != null)
    .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));

  const topProfitLines = holdingsWithPnl.slice(0, 3).map((x) => formatPnlLine(x.h));
  const cautionFromPnl = [...holdingsWithPnl]
    .sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0))
    .slice(0, 2)
    .map((x) => formatPnlLine(x.h));

  const cautionFromCandidates =
    !hasHoldings
      ? (portfolio?.worstToday?.slice(0, 3).map(
          (w) =>
            `${w.displayLabelJa}（${w.symbol}）スコア ${w.finalScore} — ${w.rationaleJa.slice(0, 80)}`,
        ) ?? [])
      : [];

  const score = portfolio?.portfolioScore ?? 50;

  if (hasHoldings) {
    const lead = holdingsWithPnl[0]?.h ?? holdings[0];
    logDailyCommentTarget({
      symbol: lead?.symbol ?? null,
      score: evalForHolding(lead, portfolio)?.finalScore ?? null,
      action: evalForHolding(lead, portfolio)?.action ?? null,
      conflict: evalForHolding(lead, portfolio)?.rankingConflict ?? false,
      source: 'holding_focus',
    });
  } else {
    const best = portfolio?.bestToday?.[0];
    logDailyCommentTarget({
      symbol: best?.symbol ?? null,
      score: best?.finalScore ?? null,
      action: best?.action ?? null,
      conflict:
        best?.rankingConflict ??
        input.rankingConflictBySymbol?.[best?.symbol.toUpperCase() ?? ''] ??
        false,
      source: portfolio?.batchSource ?? (bundle ? 'strategy_bundle_no_eval' : 'no_portfolio'),
    });
  }

  const todaySummaryJa = hasHoldings
    ? buildHoldingFocusedSummary({
        score,
        holdings,
        portfolio,
        bundle,
        dividends: input.dividends ?? [],
      })
    : buildCandidateRankingSummary({ score, portfolio, bundle });

  const recommendedActions: string[] = [];
  if (hasHoldings) {
    const lead = holdingsWithPnl[0]?.h ?? holdings[0];
    const tpRem = lead ? takeProfitRemainingPct(lead) : null;
    if (tpRem != null && tpRem <= 1) {
      recommendedActions.push(`${displayName(lead)} — 利確目安付近、Rakuten Tradeで部分利確を検討`);
    }
    const laggard = [...holdingsWithPnl].sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0))[0]?.h;
    if (laggard && (pnlPct(laggard) ?? 0) < -5) {
      recommendedActions.push(`${displayName(laggard)} — 含み損拡大、損切ラインを確認`);
    }
    if (recommendedActions.length === 0) {
      recommendedActions.push('大きな売買は不要 — 損切・利確ラインを維持');
    }
  } else {
    const best = portfolio?.bestToday?.[0];
    const worst = portfolio?.worstToday?.[0];
    if (worst && worst.finalScore < 45) {
      recommendedActions.push(`${worst.symbol} の候補スコアが低め — 慎重に`);
    }
    if (score < 42) {
      recommendedActions.push('守りモード — 現金比率の見直しを検討');
    } else if (score >= 62 && best) {
      recommendedActions.push(`${best.symbol} を候補リストでウォッチ`);
    } else {
      recommendedActions.push('銘柄検索から候補を追加');
    }
  }

  if (bundle?.allocation.recommendedCashRatioPct != null) {
    recommendedActions.push(
      `現金 ${bundle.allocation.recommendedCashRatioPct}% 目安（${bundle.allocation.cashRatioRationaleJa.slice(0, 60)}）`,
    );
  }

  sections.push({
    priority: 4,
    kind: 'daily_comment',
    titleJa: '本日のAIコメント',
    bodyJa: todaySummaryJa,
  });

  sections.sort((a, b) => a.priority - b.priority);

  const headlineJa =
    sections.find((s) => s.priority === 1)?.bodyJa.slice(0, 72) ??
    sections.find((s) => s.priority === 4)?.bodyJa.slice(0, 72) ??
    todaySummaryJa.slice(0, 72);

  return {
    headlineJa,
    portfolioScore: score,
    holdingCount: holdings.length,
    todaySummaryJa,
    topProfitLines,
    cautionLines: [...cautionFromCandidates, ...cautionFromPnl].slice(0, 4),
    recommendedActions,
    sections,
  };
}
