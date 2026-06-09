import { AI_SAFE_ACTION_LABEL } from '../constants/aiStrategyBriefing';
import { STALE_QUOTE_MAX_AGE_MS } from '../constants/marketData';
import { MARKET_LABEL } from '../constants/rakutenTrade';
import { buildMockAiStrategyBriefing, getMockAiTradeQueue } from '../data/mockAiStrategyBriefing';
import type {
  AiSystemAwareness,
  BuildCentralIntelligenceInput,
  CentralIntelligenceOperations,
  CentralIntelligencePortfolioRisk,
  CentralIntelligenceRecommendationView,
  CentralIntelligenceWorldModel,
} from '../types/centralIntelligence';
import type { AiNormalizedHolding } from '../types/aiStrategy';
import { IN_FLIGHT_ORDER_STATUSES } from '../constants/executionSafety';
import type { HealthLevel } from './dailyHealthCheckService';
import { reconcileExecutionJournal } from './executionReconciliationService';
import { loadExecutionJournal } from './executionJournalStorage';
import { marketDataRequestQueue } from './marketDataRequestQueue';
import { loadHealthyPortfolioSnapshot, verifyPortfolioChecksum } from './portfolioSnapshot';
import { getWatchlistSymbols } from './userAnalysisSymbols';
function clampPercent(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function quoteAgeSeconds(iso?: string): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 1000));
}

function isStalePosition(p: {
  isStale?: boolean;
  lastSuccessfulFetchAt?: string;
  currentPriceUpdatedAt?: string;
}): boolean {
  if (p.isStale) return true;
  const anchor = p.lastSuccessfulFetchAt ?? p.currentPriceUpdatedAt;
  if (!anchor) return false;
  const age = quoteAgeSeconds(anchor);
  return age != null && age * 1000 > STALE_QUOTE_MAX_AGE_MS;
}

function healthLevelPenalty(level: HealthLevel | null): number {
  if (level === 'critical') return 35;
  if (level === 'warning') return 18;
  return 0;
}

function buildDegradedReasonsJa(input: BuildCentralIntelligenceInput): string[] {
  const reasons: string[] = [];
  if (input.bootMode === 'safe') reasons.push('セーフブートモードが有効です');
  if (input.securityWarnings.length > 0) {
    reasons.push(`セキュリティ警告 ${input.securityWarnings.length} 件`);
  }
  if (input.degradedMode && reasons.length === 0) {
    reasons.push('劣化モードが有効です');
  }
  if (input.killSwitches.readOnlyMode) reasons.push('読み取り専用モード');
  if (input.killSwitches.disableMarketRefresh) reasons.push('市場データ更新が停止されています');
  if (input.killSwitches.disableTradeSubmission) reasons.push('売買送信が緊急停止されています');
  const sev = input.diagnosticsSeverity;
  if (sev.critical > 0) reasons.push(`診断ログに重大イベント ${sev.critical} 件`);
  else if (sev.error > 0) reasons.push(`診断ログにエラー ${sev.error} 件`);
  if (input.apiHealthDegraded) {
    reasons.push('外部APIヘルスに注意（設定ウィザードで確認）');
  }
  return reasons;
}

function computeSystemAwareness(input: {
  degradedReasonsJa: string[];
  healthOverall: HealthLevel | null;
  staleFractionPercent: number;
  uncertainCount: number;
  inFlightCount: number;
  reconciliationMismatchCount: number;
  rateLimitActive: boolean;
  priceSyncError: boolean;
  bootMode: 'normal' | 'safe';
  backupChecksumOk: boolean | null;
}): AiSystemAwareness {
  const degradationReasonsJa = [...input.degradedReasonsJa];

  let dataFreshnessConfidence = 100;
  if (input.staleFractionPercent > 0) {
    dataFreshnessConfidence -= Math.min(50, input.staleFractionPercent * 0.8);
    degradationReasonsJa.push(`古い株価データが ${Math.round(input.staleFractionPercent)}% の保有に影響`);
  }
  if (input.priceSyncError) {
    dataFreshnessConfidence -= 15;
    degradationReasonsJa.push('直近の株価同期に失敗しました');
  }

  let executionConfidence = 100;
  if (input.uncertainCount > 0) {
    executionConfidence -= Math.min(40, input.uncertainCount * 12);
    degradationReasonsJa.push(`執行ジャーナルに不確実エントリ ${input.uncertainCount} 件`);
  }
  if (input.inFlightCount > 0) {
    executionConfidence -= Math.min(25, input.inFlightCount * 8);
  }
  if (input.reconciliationMismatchCount > 0) {
    executionConfidence -= Math.min(30, input.reconciliationMismatchCount * 10);
    degradationReasonsJa.push(`執行照合の不一致 ${input.reconciliationMismatchCount} 件`);
  }

  let recoveryConfidence = 100;
  if (input.bootMode === 'safe') {
    recoveryConfidence -= 40;
  }
  if (input.backupChecksumOk === false) {
    recoveryConfidence -= 20;
    degradationReasonsJa.push('健全スナップショットのチェックサムに注意');
  }

  let systemConfidence = 100 - healthLevelPenalty(input.healthOverall);
  if (input.rateLimitActive) {
    systemConfidence -= 18;
    degradationReasonsJa.push('API quota / レート制限が発生しています');
  }
  if (input.degradedReasonsJa.length > 0) {
    systemConfidence -= Math.min(25, input.degradedReasonsJa.length * 6);
  }

  const compositeConfidence = clampPercent(
    dataFreshnessConfidence * 0.35 +
      executionConfidence * 0.25 +
      recoveryConfidence * 0.2 +
      systemConfidence * 0.2,
  );

  return {
    systemConfidence: clampPercent(systemConfidence),
    dataFreshnessConfidence: clampPercent(dataFreshnessConfidence),
    executionConfidence: clampPercent(executionConfidence),
    recoveryConfidence: clampPercent(recoveryConfidence),
    compositeConfidence,
    degradationReasonsJa: [...new Set(degradationReasonsJa)].slice(0, 8),
  };
}

function adjustRecommendationConfidence(
  base: number,
  awareness: AiSystemAwareness,
  holdingStale: boolean,
): { adjusted: number; noteJa: string } {
  let adjusted = base;
  const notes: string[] = [];
  if (awareness.compositeConfidence < 80) {
    const drop = Math.floor((80 - awareness.compositeConfidence) / 4);
    adjusted -= drop;
    notes.push(`システム信頼度により -${drop}%`);
  }
  if (holdingStale) {
    adjusted -= 12;
    notes.push('当該銘柄の株価が古いため -12%');
  }
  if (awareness.degradationReasonsJa.some((r) => r.includes('レート制限'))) {
    adjusted -= 8;
    notes.push('API制限により -8%');
  }
  return {
    adjusted: clampPercent(adjusted),
    noteJa: notes.length > 0 ? notes.join(' · ') : 'システム状態は安定',
  };
}

export async function buildCentralIntelligenceWorldModel(
  input: BuildCentralIntelligenceInput,
): Promise<CentralIntelligenceWorldModel> {
  const portfolio =
    input.appMode === 'practice' ? input.state.practice.portfolio : input.state.portfolio;
  const briefing =
    input.briefing ?? buildMockAiStrategyBriefing(input.marketRegime);
  const tradeQueue = input.tradeQueue ?? getMockAiTradeQueue();

  const holdings: AiNormalizedHolding[] = portfolio
    .filter((p) => (p.shares ?? 0) > 0)
    .slice(0, 40)
    .map((p) => {
      const anchor = p.lastSuccessfulFetchAt ?? p.currentPriceUpdatedAt;
      const age = quoteAgeSeconds(anchor);
      return {
        symbol: p.symbol,
        market: MARKET_LABEL[p.market],
        shares: p.shares,
        priceSource: p.priceSource ?? 'unknown',
        isStale: isStalePosition(p),
        quoteAgeSeconds: age,
        hasPrice: Boolean(p.currentPrice && p.currentPrice > 0),
      };
    });

  const watchlist = getWatchlistSymbols(input.state).slice(0, 30).map((o) => ({
    symbol: o.symbol,
    market: MARKET_LABEL[o.market],
    side: 'ウォッチ',
  }));

  const journal = await loadExecutionJournal();
  const inFlight = new Set<string>(IN_FLIGHT_ORDER_STATUSES);
  const uncertainCount = journal.entries.filter(
    (e) => e.status === 'failed' || Boolean(e.errorReason),
  ).length;
  const inFlightCount = journal.entries.filter((e) => inFlight.has(e.status)).length;
  const recentSymbols = [...new Set(journal.entries.slice(0, 8).map((e) => e.symbol))].slice(0, 5);

  const reconciliation = await reconcileExecutionJournal(input.state);
  const reconciliationMismatchCount = reconciliation.mismatches.length;

  const staleHoldingsCount = holdings.filter((h) => h.isStale).length;
  const holdingCount = holdings.length;
  const staleFractionPercent =
    holdingCount > 0 ? clampPercent((staleHoldingsCount / holdingCount) * 100) : 0;

  let maxQuoteAgeMinutes: number | null = null;
  for (const h of holdings) {
    if (h.quoteAgeSeconds == null) continue;
    const mins = Math.floor(h.quoteAgeSeconds / 60);
    maxQuoteAgeMinutes = maxQuoteAgeMinutes == null ? mins : Math.max(maxQuoteAgeMinutes, mins);
  }

  const queueSnap = marketDataRequestQueue.getSnapshot();
  const rateLimitActive = queueSnap.rateLimitUntil > Date.now();
  const queueStateJa = rateLimitActive
    ? `レート制限バックオフ中 · 待機 ${queueSnap.pending} · 実行中 ${queueSnap.inFlight}`
    : `待機 ${queueSnap.pending} · 実行中 ${queueSnap.inFlight}`;

  const snap = await loadHealthyPortfolioSnapshot();
  let backupIntegrityJa = '健全スナップショット未保存';
  let backupChecksumOk: boolean | null = null;
  if (snap && snap.portfolio.length > 0) {
    backupChecksumOk = verifyPortfolioChecksum(snap.portfolio, snap.manualChecksum);
    backupIntegrityJa = backupChecksumOk
      ? `${snap.savedAt.slice(0, 10)} 保存 · チェックサム正常`
      : 'スナップショットのチェックサムに注意';
  }

  const degradedReasonsJa = buildDegradedReasonsJa(input);
  const healthOverall = input.healthReport?.overall ?? null;
  const healthSummaryJa = input.healthReport
    ? input.healthReport.items
        .filter((i) => i.status !== 'ok')
        .map((i) => i.messageJa)
        .slice(0, 3)
        .join(' · ') || 'ヘルスチェック: 問題なし'
    : null;

  const executionSafetyJa =
    inFlightCount > 0
      ? `処理中注文 ${inFlightCount} 件 · 不確実 ${uncertainCount} 件`
      : uncertainCount > 0
        ? `不確実エントリ ${uncertainCount} 件 — 照合推奨`
        : '執行安全ゲート: 通常';

  const reconciliationJa =
    reconciliationMismatchCount > 0
      ? `照合不一致 ${reconciliationMismatchCount} 件 — ${reconciliation.mismatches[0]?.messageJa ?? ''}`
      : '執行照合: 重大な不一致なし';

  const recoveryParts: string[] = [];
  if (input.bootMode === 'safe') recoveryParts.push('セーフブート');
  if (input.recoveryRecommendations.length > 0) {
    recoveryParts.push(input.recoveryRecommendations[0]);
  }
  const recoveryStateJa =
    recoveryParts.length > 0 ? recoveryParts.join(' · ') : 'リカバリ: 通常運用';

  const killParts: string[] = [];
  if (input.killSwitches.readOnlyMode) killParts.push('読取専用');
  if (input.killSwitches.disableMarketRefresh) killParts.push('更新停止');
  if (input.killSwitches.disableTradeSubmission) killParts.push('売買停止');
  const killSwitchSummaryJa =
    killParts.length > 0 ? `キルスイッチ: ${killParts.join(' · ')}` : 'キルスイッチ: すべて解除';

  const operations: CentralIntelligenceOperations = {
    degradedMode: input.degradedMode,
    degradedReasonsJa,
    bootMode: input.bootMode,
    diagnosticsSummary: input.diagnosticsSummary,
    diagnosticsSeverity: input.diagnosticsSeverity,
    healthOverall,
    healthSummaryJa,
    queueStateJa,
    rateLimitActive,
    executionSafetyJa,
    reconciliationJa,
    recoveryStateJa,
    backupIntegrityJa,
    killSwitchSummaryJa,
    apiHealthSummaryJa: input.apiHealthSummaryJa ?? 'APIヘルス: 未集計',
  };

  const portfolioRisk: CentralIntelligencePortfolioRisk = {
    holdingCount,
    staleHoldingsCount,
    staleFractionPercent,
    watchlistCount: watchlist.length,
    exposureLabelJa:
      holdingCount === 0
        ? '保有なし'
        : staleFractionPercent > 40
          ? '高 — 古い価格データが多い'
          : staleFractionPercent > 15
            ? '中 — 一部データ鮮度に注意'
            : '低 — データ鮮度は概ね良好',
    maxQuoteAgeMinutes,
  };

  const awareness = computeSystemAwareness({
    degradedReasonsJa,
    healthOverall,
    staleFractionPercent,
    uncertainCount,
    inFlightCount,
    reconciliationMismatchCount,
    rateLimitActive,
    priceSyncError: Boolean(input.priceSync.lastError),
    bootMode: input.bootMode,
    backupChecksumOk,
  });

  const recommendations: CentralIntelligenceRecommendationView[] = tradeQueue.slice(0, 5).map((q) => {
    const holdingStale = holdings.some((h) => h.symbol === q.ticker && h.isStale);
    const { adjusted, noteJa } = adjustRecommendationConfidence(
      q.confidence,
      awareness,
      holdingStale,
    );
    return {
      ticker: q.ticker,
      action: AI_SAFE_ACTION_LABEL[q.suggestedAction],
      urgency: q.urgency,
      baseConfidence: q.confidence,
      adjustedConfidence: adjusted,
      rationale: q.rationaleSummary.slice(0, 120),
      confidenceNoteJa: noteJa,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    appMode: input.appMode === 'practice' ? '練習' : '実運用分析',
    marketRegimeLabel: briefing.marketRegimeLabel,
    riskMode: briefing.riskMode,
    systemAwareness: awareness,
    operations,
    portfolioRisk,
    holdings,
    watchlist,
    recommendations,
    journalSummary: {
      totalEntries: journal.entries.length,
      uncertainCount,
      inFlightCount,
      reconciliationMismatchCount,
      recentSymbols,
    },
  };
}

/** Reset diagnostics/queue state for unit tests. */
export function resetCentralIntelligenceForTest(): void {
  marketDataRequestQueue.resetCooldownsForTest();
}
