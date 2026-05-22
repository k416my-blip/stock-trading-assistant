import {
  AUTONOMOUS_EMERGENCY_FEAR,
  AUTONOMOUS_EMERGENCY_MARKET_RISK,
  AUTONOMOUS_MAX_ATTENTION,
} from '../constants/autonomousMonitoring';
import { PERFORMANCE_COST_LABELS_JA } from '../constants/performanceCost';
import type { ProactiveSuggestionCandidate } from '../types/proactiveSuggestion';
import type {
  AutonomousAttentionItem,
  AutonomousMonitoringBundle,
  BuildAutonomousMonitoringInput,
  HeatmapCell,
} from '../types/autonomousMonitoring';
import { evaluateAutonomousAlertForSymbol } from './autonomousAlertTrigger';
import {
  buildDailyBriefing,
  buildMarketSessionBrief,
  buildNightReview,
} from './autonomousMarketSessionIntel';
import { buildAutonomousNarrative } from './autonomousNarrativeEngine';
import { buildAutonomousWatchlist } from './autonomousWatchlistEngine';
import { buildPortfolioStressMeter } from './portfolioStressMeter';
import { detectPortfolioThreats } from './portfolioThreatDetector';
import { buildProactiveDedupeKey } from './proactiveSuggestionQueue';

function buildHeatmap(
  evaluations: ReturnType<typeof evaluateAutonomousAlertForSymbol>[],
  evidenceSymbols: BuildAutonomousMonitoringInput['evidenceSymbols'],
): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  for (const ev of evaluations) {
    const sym = evidenceSymbols.find((s) => s.symbol === ev.symbol);
    if (!sym) continue;
    const ch = sym.intradayChangePct ?? 0;
    if (ch <= -3 || ev.compositeScore >= 70) {
      cells.push({
        symbol: ev.symbol,
        displayLabelJa: ev.displayLabelJa,
        kind: 'danger',
        intensity: Math.min(100, ev.compositeScore),
        labelJa: sym.unusualActivityFlags[0]?.labelJa ?? `日中 ${ch.toFixed(1)}%`,
      });
    } else if (ch >= 2.5) {
      cells.push({
        symbol: ev.symbol,
        displayLabelJa: ev.displayLabelJa,
        kind: 'momentum',
        intensity: Math.min(100, 40 + ch * 8),
        labelJa: `上昇モメンタム ${ch.toFixed(1)}%`,
      });
    } else if (sym.xSentiment && sym.xSentiment.bullishPct >= 55 && ch > 0) {
      cells.push({
        symbol: ev.symbol,
        displayLabelJa: ev.displayLabelJa,
        kind: 'opportunity',
        intensity: 50,
        labelJa: 'センチメント改善の可能性',
      });
    }
  }
  return cells.slice(0, 12);
}

function buildAttention(
  evaluations: ReturnType<typeof evaluateAutonomousAlertForSymbol>[],
): AutonomousAttentionItem[] {
  return evaluations
    .filter((e) => e.compositeScore >= 50)
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, AUTONOMOUS_MAX_ATTENTION)
    .map((e, i) => ({
      id: `att-${e.symbol}-${i}`,
      headlineJa: `${e.displayLabelJa} — スコア ${e.compositeScore}`,
      whyJa: e.notificationWhyJa,
      symbol: e.symbol,
      score: e.compositeScore,
    }));
}

function evaluationsToCandidates(
  evaluations: ReturnType<typeof evaluateAutonomousAlertForSymbol>[],
  emergency: boolean,
): ProactiveSuggestionCandidate[] {
  const out: ProactiveSuggestionCandidate[] = [];
  for (const e of evaluations.filter((x) => x.shouldNotify)) {
    const priority =
      emergency || e.compositeScore >= 85
        ? 'critical'
        : e.compositeScore >= 72
          ? 'high'
          : 'medium';
    out.push({
      priority,
      category: 'urgency_signal',
      dedupeKey: buildProactiveDedupeKey('urgency_signal', priority, e.symbol),
      titleJa: `自律監視: ${e.displayLabelJa} に重要変化`,
      bodyJa: `${e.notificationWhyJa}（参考・自動売買なし）`,
      actionHintJa: 'AIコンシェルジュで根拠を確認してください',
      notificationWhyJa: e.notificationWhyJa,
      reasonsJa: e.activeSignals,
      symbol: e.symbol,
      source: 'autonomous_agent',
    });
  }
  return out;
}

export function buildAutonomousMonitoringBundle(
  input: BuildAutonomousMonitoringInput,
): AutonomousMonitoringBundle {
  const excluded = new Set(input.excludedSymbols.map((s) => s.toUpperCase()));

  const watchlist = buildAutonomousWatchlist({
    holdings: input.holdings,
    evidenceSymbols: input.evidenceSymbols,
    recentViewedSymbols: input.recentViewedSymbols,
    marketLeaderSymbols: input.marketLeaderSymbols,
  });

  const symSet = new Set(watchlist.map((w) => w.symbol.toUpperCase()));
  const monitoredEvidence = input.evidenceSymbols.filter((s) =>
    symSet.has(s.symbol.toUpperCase()),
  );

  const evaluations = monitoredEvidence.map((sym) =>
    evaluateAutonomousAlertForSymbol(
      sym,
      input.globalMarket,
      input.aggressiveness,
      excluded.has(sym.symbol.toUpperCase()),
    ),
  );

  const adjustedEvaluations = evaluations.map((e) => ({
    ...e,
    compositeScore: Math.min(
      100,
      Math.round(e.compositeScore * input.adaptiveMultiplier),
    ),
    shouldNotify:
      e.shouldNotify &&
      !input.notificationsPaused &&
      e.compositeScore * input.adaptiveMultiplier >=
        (input.aggressiveness === 'conservative' ? 75 : 65),
  }));

  const emergencyMode =
    !input.notificationsPaused &&
    (input.globalMarket?.regimeId === 'panic' ||
      (input.globalMarket?.marketScores.marketRiskScore ?? 0) >= AUTONOMOUS_EMERGENCY_MARKET_RISK ||
      (input.globalMarket?.marketScores.fearScore ?? 0) >= AUTONOMOUS_EMERGENCY_FEAR);

  const threats = detectPortfolioThreats(input.portfolioIntel);
  const stressMeter = buildPortfolioStressMeter(
    input.portfolioIntel,
    input.globalMarket,
    threats,
  );
  const attention = buildAttention(adjustedEvaluations);
  const heatmap = buildHeatmap(adjustedEvaluations, input.evidenceSymbols);
  const narrative = buildAutonomousNarrative(input.globalMarket, attention, stressMeter);
  const sessionBrief = buildMarketSessionBrief(input.globalMarket);
  const threatLabels = threats.map((t) => t.titleJa);
  const dailyBriefing = buildDailyBriefing(
    input.globalMarket,
    watchlist.slice(0, 5).map((w) => w.displayLabelJa),
    threatLabels,
  );
  const nightReview = buildNightReview(
    input.globalMarket,
    adjustedEvaluations.filter((e) => e.silentOnly).map((e) => e.displayLabelJa),
    input.portfolioIntel?.accuracy.shortTermAccuracyPct != null
      ? `短期予測精度 ${input.portfolioIntel.accuracy.shortTermAccuracyPct}%`
      : null,
  );

  let notifyCandidates = evaluationsToCandidates(adjustedEvaluations, emergencyMode);
  if (emergencyMode && input.globalMarket) {
    notifyCandidates = [
      {
        priority: 'critical',
        category: 'market_regime',
        dedupeKey: buildProactiveDedupeKey('market_regime', 'critical'),
        titleJa: '緊急モード: 市場全体が危険水域',
        bodyJa: `${input.globalMarket.regimeLabelJa} — 暴落級の警戒（参考のみ）`,
        actionHintJa: '損切りルールと現金比率を先に確認',
        notificationWhyJa: `市場リスク ${input.globalMarket.marketScores.marketRiskScore} · 恐怖 ${input.globalMarket.marketScores.fearScore} · レジーム ${input.globalMarket.regimeId}`,
        reasonsJa: input.globalMarket.marketWideFactorsJa.slice(0, 3),
        source: 'autonomous_emergency',
      },
      ...notifyCandidates,
    ];
  }

  const resourceParts: string[] = [];
  if (!input.appForeground) resourceParts.push(PERFORMANCE_COST_LABELS_JA.backgroundPaused);
  if (input.batterySaver) resourceParts.push(PERFORMANCE_COST_LABELS_JA.batterySaver);
  if (input.degradedMode) resourceParts.push('劣化モード — 監視はキャッシュ中心');

  const silentModeActive =
    adjustedEvaluations.some((e) => e.silentOnly) && notifyCandidates.length === 0;

  return {
    generatedAt: new Date().toISOString(),
    watchlist,
    heatmap,
    attention,
    narrative,
    stressMeter,
    threats,
    sessionBrief,
    dailyBriefing,
    nightReview,
    emergencyMode,
    emergencyMessageJa: emergencyMode
      ? '市場全体が危険水域 — 新規買いは極めて慎重に（参考）'
      : null,
    silentModeActive,
    adaptiveFrequencyLabelJa: `通知頻度 ×${input.adaptiveMultiplier.toFixed(2)}`,
    notifyCandidates: input.appForeground && !input.batterySaver ? notifyCandidates : [],
    resourceNoteJa: resourceParts.join(' · ') || '通常監視',
  };
}
